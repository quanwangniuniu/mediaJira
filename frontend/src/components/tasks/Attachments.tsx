'use client';

import { useState, useEffect } from 'react';
import { TaskAPI } from '@/lib/api/taskApi';
import { TaskAttachment } from '@/types/task';
import AttachmentModal from './AttachmentModal';
import { toast } from 'react-hot-toast';

interface AttachmentsProps {
  taskId: number;
}

export default function Attachments({ taskId }: AttachmentsProps) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await TaskAPI.getAttachments(taskId);
      setAttachments(data);
    } catch (e: any) {
      console.error('Failed to load attachments:', e);
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        'Failed to load attachments.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!taskId) return;
    loadAttachments();
  }, [taskId]);

  const handleAttachmentAdded = () => {
    loadAttachments();
    setIsModalOpen(false);
  };

  const handleDelete = async (attachmentId: number, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      setDeletingId(attachmentId);
      await TaskAPI.deleteAttachment(taskId, attachmentId);
      toast.success('Attachment deleted successfully.');
      loadAttachments();
    } catch (e: any) {
      console.error('Failed to delete attachment:', e);
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        'Failed to delete attachment.';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (attachment: TaskAttachment) => {
    try {
      const downloadData = await TaskAPI.downloadAttachment(taskId, attachment.id);
      if (downloadData.download_url) {
        window.open(downloadData.download_url, '_blank');
      } else {
        toast.error('Download URL not available.');
      }
    } catch (e: any) {
      console.error('Failed to download attachment:', e);
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        'Failed to download attachment.';
      toast.error(message);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isImageFile = (contentType: string, filename: string): boolean => {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    return (
      imageTypes.includes(contentType.toLowerCase()) ||
      imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext))
    );
  };

  const getFileIcon = (contentType: string, filename: string) => {
    if (isImageFile(contentType, filename)) {
      return (
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  return (
    <section className="border-t border-slate-200 pt-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">Attachments</h3>
          {attachments.length > 0 && (
            <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">
              {attachments.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
          aria-label="Add attachment"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add attachment</span>
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Loading attachments...</span>
        </div>
      )}

      {error && !loading && (
        <div className="text-sm text-red-600 py-4">{error}</div>
      )}

      {!loading && !error && attachments.length === 0 && (
        <div className="text-sm text-gray-500 py-4">No attachments yet.</div>
      )}

      {!loading && !error && attachments.length > 0 && (
        <div className="space-y-3">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              {/* Thumbnail/Icon */}
              <div className="flex-shrink-0">
                {isImageFile(attachment.content_type, attachment.original_filename) ? (
                  <div className="w-16 h-16 rounded border border-gray-300 overflow-hidden bg-white flex items-center justify-center">
                    <img
                      src={attachment.file}
                      alt={attachment.original_filename}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to icon if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = getFileIcon(attachment.content_type, attachment.original_filename).props.children;
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded border border-gray-300 bg-white flex items-center justify-center">
                    {getFileIcon(attachment.content_type, attachment.original_filename)}
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {attachment.original_filename}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatFileSize(attachment.file_size)} â€?{formatDate(attachment.created_at)}
                    </div>
                    {attachment.uploaded_by && (
                      <div className="text-xs text-gray-500 mt-1">
                        Uploaded by {attachment.uploaded_by.username || attachment.uploaded_by.email}
                      </div>
                    )}
                    {attachment.scan_status && attachment.scan_status !== 'clean' && (
                      <div className={`text-xs mt-1 ${
                        attachment.scan_status === 'infected' ? 'text-red-600' :
                        attachment.scan_status === 'scanning' ? 'text-yellow-600' :
                        attachment.scan_status === 'error_scanning' ? 'text-orange-600' :
                        'text-gray-500'
                      }`}>
                        Status: {attachment.scan_status.replace('_', ' ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownload(attachment)}
                  className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  aria-label="Download attachment"
                  title="Download"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(attachment.id, attachment.original_filename)}
                  disabled={deletingId === attachment.id}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Delete attachment"
                  title="Delete"
                >
                  {deletingId === attachment.id ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AttachmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAttachmentAdded={handleAttachmentAdded}
        taskId={taskId}
      />
    </section>
  );
}
