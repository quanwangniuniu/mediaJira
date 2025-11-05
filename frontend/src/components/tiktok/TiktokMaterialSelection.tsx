'use client';

import React from 'react';
import { TiktokMaterialItem } from '@/lib/api/tiktokApi';

interface TiktokMaterialSelectionProps {
  selectedVideo: TiktokMaterialItem | null;
  selectedImages: TiktokMaterialItem[];
  onOpenLibraryVideo: () => void;
  onOpenLibraryImages: () => void;
  onOpenLibrary: () => void; // generic add
  onRemoveImage?: (id: number) => void;
  onClearImages?: () => void;
  onPreviewImage?: (img: TiktokMaterialItem) => void;
}

const TiktokMaterialSelection: React.FC<TiktokMaterialSelectionProps> = ({
  selectedVideo,
  selectedImages,
  onOpenLibraryVideo,
  onOpenLibraryImages,
  onOpenLibrary,
  onRemoveImage,
  onClearImages,
  onPreviewImage,
}) => {
  // When nothing selected
  if (!selectedVideo && selectedImages.length === 0) {
    return (
      <div>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={onOpenLibrary}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
          >
            <span className="text-lg leading-none">+</span>
            <span>Add videos or images</span>
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50">
            <span className="text-lg leading-none">+</span>
            <span>Create new</span>
          </button>
        </div>
        <div className="mt-2 text-red-600 text-sm font-medium">Upload creative for your ad</div>
      </div>
    );
  }

  // Video selected → render From your library card
  if (selectedVideo) {
    return (
      <div>
        <div className="text-sm text-gray-700 mb-2">From your library</div>
        <div className="bg-gray-50 rounded-lg border flex items-center px-4 py-3 gap-4">
          <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-200 flex items-center justify-center">
            <video src={selectedVideo.fileUrl || selectedVideo.url} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 truncate">{selectedVideo.title || `#${selectedVideo.id}`}</div>
            <div className="text-xs text-gray-500 mt-1">
              {selectedVideo.width && selectedVideo.height ? `${selectedVideo.width}x${selectedVideo.height}` : ''}
            </div>
            <div className="flex gap-6 mt-2">
              <button
                onClick={onOpenLibraryVideo}
                className="inline-flex items-center gap-1 text-teal-700 font-medium hover:underline"
                type="button"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/><path d="M12 3v12m0 0l-4-4m4 4l4-4"/></svg>
                Update
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Images card (up to 35)
  const count = selectedImages.length;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-gray-900 font-medium">Images ({count}/35)</div>
        <div className="flex items-center gap-6 text-teal-700">
          <button onClick={onOpenLibraryImages} className="inline-flex items-center gap-2">
            <span className="text-lg leading-none">+</span>
            <span>Add</span>
          </button>
          {/* No Image editor per requirement */}
          <button onClick={onClearImages} className="inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 6h18M9 6v12m6-12v12M8 6l1-2h6l1 2M5 6h14l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6z"/></svg>
            <span>Delete all</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {selectedImages.map((img) => (
          <div
            key={img.id}
            className="rounded-lg border flex items-center px-4 py-3 gap-4 cursor-pointer hover:border-teal-600"
            onClick={() => onPreviewImage?.(img)}
          >
            <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-200 flex items-center justify-center">
              <img src={img.previewUrl || img.url} alt={img.title || ''} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{img.title || `#${img.id}`}</div>
            </div>
            <div className="flex items-center gap-4 text-gray-700">
              <button className="p-2" aria-label="Edit name" disabled>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
              </button>
              <button className="p-2" aria-label="Delete" onClick={() => onRemoveImage?.(img.id)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 6h18M9 6v12m6-12v12M8 6l1-2h6l1 2M5 6h14l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6z"/></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TiktokMaterialSelection;


