from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
import mimetypes
import os
import hashlib
from django.conf import settings
from django.http import HttpResponse, StreamingHttpResponse
from django.db import transaction

from .models import MetricFile, get_storage_key
from .serializers import MetricFileSerializer


class FileUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    MAX_FILE_BYTES = 100 * 1024 * 1024  # 100 MB

    def post(self, request):
        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({'detail': 'Missing file field "file".'}, status=status.HTTP_400_BAD_REQUEST)

        # Enforce max size 100MB
        if uploaded.size > self.MAX_FILE_BYTES:
            return Response(
                {'detail': 'File too large. Max 100MB.'},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        original_filename = uploaded.name
        mime_type = uploaded.content_type or (mimetypes.guess_type(original_filename)[0] or 'application/octet-stream')

        # Generate storage key
        storage_key = get_storage_key(None, original_filename)

        # Stream to storage while computing checksum and size (use FILE_STORAGE_DIR)
        sha256 = hashlib.sha256()
        bytes_written = 0
        full_path = os.path.join(settings.FILE_STORAGE_DIR, storage_key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, 'wb') as dest:
            for chunk in uploaded.chunks():
                sha256.update(chunk)
                dest.write(chunk)
                bytes_written += len(chunk)
        checksum_hex = sha256.hexdigest()

        with transaction.atomic():
            metric_file = MetricFile.objects.create(
                mime_type=mime_type,
                size=bytes_written,
                storage_key=storage_key,
                original_filename=original_filename,
                uploaded_by=request.user,
                checksum=checksum_hex,
            )

        data = MetricFileSerializer(metric_file).data
        return Response(data, status=status.HTTP_201_CREATED)


class FileDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk: int):
        try:
            metric_file = MetricFile.objects.get(pk=pk)
        except MetricFile.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Soft-deleted files are not visible
        if metric_file.is_deleted:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Access control: if not public, only owner can see
        if not metric_file.is_public and metric_file.uploaded_by_id != request.user.id:
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        data = MetricFileSerializer(metric_file).data
        return Response(data, status=status.HTTP_200_OK)


class FileContentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get_file_or_404(self, pk: int, user):
        try:
            mf = MetricFile.objects.get(pk=pk)
        except MetricFile.DoesNotExist:
            return None, Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if mf.is_deleted or mf.status == MetricFile.MISSING:
            return None, Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not mf.is_public and mf.uploaded_by_id != user.id:
            return None, Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        if mf.status in (MetricFile.INCOMING, MetricFile.SCANNING):
            return None, Response({'detail': 'File is being scanned, please try later.'}, status=423)

        if mf.status == MetricFile.INFECTED:
            return None, Response({'detail': 'File blocked due to malware', 'code': 'INFECTED'}, status=status.HTTP_403_FORBIDDEN)

        if mf.status == MetricFile.ERROR_SCANNING:
            return None, Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        # READY falls through
        return mf, None

    def head(self, request, pk: int):
        return self._serve(request, pk, head_only=True)

    def get(self, request, pk: int):
        return self._serve(request, pk, head_only=False)

    def _serve(self, request, pk: int, head_only: bool):
        mf, error_resp = self._get_file_or_404(pk, request.user)
        if error_resp is not None:
            return error_resp

        storage_key = mf.storage_key
        full_path = os.path.join(settings.FILE_STORAGE_DIR, storage_key)
        if not os.path.exists(full_path):
            # File is missing, return 404 without modifying FSM state
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Determine Content-Type
        content_type = mf.mime_type or 'application/octet-stream'

        # Handle Range requests
        range_header = request.headers.get('Range') or request.META.get('HTTP_RANGE')
        file_size = os.path.getsize(full_path)
        start, end = 0, file_size - 1
        status_code = status.HTTP_200_OK
        content_range_header = None

        if range_header:
            # Expected format: bytes=start-end
            try:
                units, rng = range_header.split('=', 1)
                if units.strip() == 'bytes':
                    start_s, end_s = rng.split('-', 1)
                    if start_s.strip():
                        start = int(start_s)
                    if end_s.strip():
                        end = int(end_s)
                    if end >= file_size:
                        end = file_size - 1
                    if start > end or start < 0:
                        return Response(status=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE)
                    status_code = status.HTTP_206_PARTIAL_CONTENT
                    content_range_header = f'bytes {start}-{end}/{file_size}'
            except Exception:
                # Malformed range
                return Response(status=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE)

        length = end - start + 1

        # Prepare response
        if head_only:
            resp = HttpResponse(status=status_code, content_type=content_type)
            resp['Content-Length'] = str(length)
            if content_range_header:
                resp['Content-Range'] = content_range_header
            return resp

        # Stream content in chunks to avoid loading large files into memory
        def file_generator():
            with open(full_path, 'rb') as fh:
                fh.seek(start)
                remaining = length
                chunk_size = 8192  # 8KB chunks
                
                while remaining > 0:
                    read_size = min(chunk_size, remaining)
                    chunk = fh.read(read_size)
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk
        
        resp = StreamingHttpResponse(
            file_generator(), 
            status=status_code, 
            content_type=content_type
        )
        resp['Content-Length'] = str(length)
        if content_range_header:
            resp['Content-Range'] = content_range_header
        return resp
