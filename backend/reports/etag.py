# etag.py —— ETag / If-Match optimistic concurrency (line-by-line comments, code and strings in English, only comments were translated)

from __future__ import annotations                      # Future annotations (optional, allows forward type hints)
import hashlib                                           # Used to compute SHA-256
from typing import Optional                              # Optional type hint
from django.utils.http import quote_etag                 # Normalize ETag (add quotes etc.)
from django.http import HttpRequest                      # Request type (for type hints only)
from rest_framework.response import Response             # DRF response object
from rest_framework.exceptions import APIException       # DRF base exception class
from rest_framework import status                        # DRF status code constants


# ---------------------------
# Custom exception: 412 Precondition Failed
# ---------------------------
class PreconditionFailed(APIException):                  # Custom exception: used when If-Match is not satisfied
    status_code = status.HTTP_412_PRECONDITION_FAILED    # HTTP 412
    default_detail = "Precondition Failed (ETag mismatch or missing If-Match header)."  # Default message
    default_code = "precondition_failed"                 # Error code


# ---------------------------
# Utility function: compute a stable ETag from an object
# ---------------------------
def compute_etag(obj) -> str:
    # Compute ETag based on “model class name + primary key + updated_at”; return with standard quotes
    klass = obj.__class__.__name__                       # Get model class name
    pk = getattr(obj, "pk", None)                        # Get primary key value
    updated = getattr(obj, "updated_at", None)           # Get updated_at field
    updated_iso = updated.isoformat() if updated else "" # Convert to ISO string (empty if missing)
    raw = f"{klass}:{pk}:{updated_iso}"                  # Assemble stable input
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()  # Compute hex digest
    return quote_etag(digest)                            # Return quoted ETag (spec-compliant)


# ---------------------------
# Utility functions: parse If-Match / If-None-Match
# ---------------------------
def _normalize_tag(tag: str) -> str:
    # Strip weak identifier prefix W/ and surrounding double quotes, return “raw” ETag value
    if not tag:
        return ""
    t = tag.strip()                                      # Trim whitespace
    if t.startswith("W/"):                               # Handle weak ETag prefix
        t = t[2:].strip()
    if t.startswith('"') and t.endswith('"'):            # Remove surrounding quotes
        t = t[1:-1]
    return t                                             # Return cleaned tag

def _split_etag_list(header_value: str) -> list[str]:
    # Split a comma-separated list of ETags into a list (may also be "*")
    if not header_value:
        return []
    return [part.strip() for part in header_value.split(",") if part.strip()]  # Trim and filter empty items


# ---------------------------
# Mixin: automatically set ETag + provide If-Match / If-None-Match validation
# ---------------------------
class ETagMixin:
    # On detail responses automatically attach ETag, and provide helpers for If-Match/If-None-Match validation

    def _is_detail_request(self, request: HttpRequest) -> bool:
        # Check whether this is a detail request (URL contains primary key)
        try:
            kw = request.resolver_match.kwargs              # Extract kwargs from route resolution
            lookup_kw = getattr(self, "lookup_url_kwarg", None) or "pk"  # Get primary key param name
            return lookup_kw in kw                          # If param exists → treat as detail
        except Exception:
            return False                                    # On failure, treat as non-detail

    def _get_detail_object(self):
        # Safely get object in a detail request; return None on failure (no exception raised)
        if not hasattr(self, "get_object"):                 # View does not implement get_object
            return None
        try:
            return self.get_object()                        # Call view’s get_object
        except Exception:
            return None                                     # Return None if retrieval fails

    def finalize_response(self, request, response, *args, **kwargs):
        # DRF lifecycle hook: before returning, add ETag automatically for detail responses
        response = super().finalize_response(request, response, *args, **kwargs)  # Run parent logic first
        if self._is_detail_request(request) and isinstance(response, Response) and 200 <= response.status_code < 400:
            obj = self._get_detail_object()                 # Get current object
            if obj is not None:                             # Only set ETag if object exists
                response["ETag"] = compute_etag(obj)        # Write ETag header
        return response                                     # Return response

    def check_precondition(self, request, obj=None, required: bool = False) -> bool:
        # If-Match validation: used for PATCH/PUT/DELETE optimistic concurrency control
        if obj is None:
            obj = self._get_detail_object()                 # Auto-get detail object
        if obj is None:
            return False                                    # No object → cannot validate → return False

        if_match_hdr = request.headers.get("If-Match")      # Read If-Match header
        if not if_match_hdr:                                # Header missing
            if required:                                    # If mandatory
                raise PreconditionFailed("Missing If-Match header.")  # Raise 412
            return False                                    # Otherwise not enforced → return False

        current = _normalize_tag(compute_etag(obj))         # Current object ETag (raw value)
        candidates = _split_etag_list(if_match_hdr)         # Candidate list from client
        ok = any((c == "*" or _normalize_tag(c) == current) for c in candidates)  # Match rule: * or exact match
        if not ok:                                          # Conflict if no match
            raise PreconditionFailed("ETag mismatch (If-Match does not match current ETag).")  # Raise 412
        return True                                         # Match success

    def check_not_modified(self, request, obj=None) -> Optional[Response]:
        # If-None-Match validation: used for conditional GET, return 304 if hit
        if request.method != "GET" or not self._is_detail_request(request):  # Only applies to detail GET
            return None
        if obj is None:
            obj = self._get_detail_object()                 # Auto-get detail object
        if obj is None:
            return None                                     # No object → nothing to compare
        inm_hdr = request.headers.get("If-None-Match")      # Read If-None-Match
        if not inm_hdr:                                     # If not provided, ignore
            return None
        current = _normalize_tag(compute_etag(obj))         # Current object ETag (raw value)
        candidates = _split_etag_list(inm_hdr)              # Candidate list from client
        hit = any((c == "*" or _normalize_tag(c) == current) for c in candidates)  # Matching rule
        if hit:                                             # If matched → return 304
            return Response(status=status.HTTP_304_NOT_MODIFIED)
        return None                                         # If not matched → continue normal flow
