'use client';

import React from 'react';
import TiktokPreview from '@/components/tiktok/TiktokPreview';
import { fetchPublicPreview, TiktokMaterialItem } from '@/lib/api/tiktokApi';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';

interface PreviewState {
  snap: any;
  creative: TiktokMaterialItem | null;
  images: TiktokMaterialItem[];
  currentImageIndex: number;
}

const normalizeMaterial = (it: any): TiktokMaterialItem | null => {
  if (!it) return null;
  const typeStr = String(it.type || it.asset_type || '').toLowerCase();
  const type: 'video' | 'image' | null = typeStr.includes('video') ? 'video' : typeStr.includes('image') ? 'image' : null;
  if (!type) return null;

  const idNum = typeof it.id === 'number' ? it.id : (it.id ? Number(it.id) : NaN);

  return {
    id: Number.isNaN(idNum) ? Date.now() : idNum,
    type,
    url: it.url || it.previewUrl || it.preview_url || it.fileUrl || it.file_url || it.source_url || '',
    previewUrl: it.previewUrl || it.preview_url || it.thumbnail_url || undefined,
    fileUrl: it.fileUrl || it.file_url || it.url || undefined,
    title: it.name || it.title,
    created_at: it.created_at,
    width: it.width,
    height: it.height,
  };
};

export default function PublicPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const slug = String(params?.slug || '');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [previewState, setPreviewState] = React.useState<PreviewState | null>(null);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const d = await fetchPublicPreview(slug);
        const snap = d?.snapshot_json || {};
        const assets = snap.assets || {};

        const primary = normalizeMaterial(assets.primaryCreative);
        const imagesRaw = Array.isArray(assets.images) ? assets.images : [];
        const images = imagesRaw
          .map((img: any) => normalizeMaterial(img))
          .filter((img: TiktokMaterialItem | null): img is TiktokMaterialItem => Boolean(img && img.type === 'image'));

        let creative: TiktokMaterialItem | null = primary;
        let currentImageIndex = 0;

        if (creative?.type === 'image') {
          const idx = images.findIndex((img: TiktokMaterialItem) => img.id === creative?.id);
          if (idx >= 0) {
            currentImageIndex = idx;
          } else {
            images.unshift(creative);
            currentImageIndex = 0;
          }
        } else if (!creative && images.length > 0) {
          creative = images[0];
          currentImageIndex = 0;
        }

        setPreviewState({ snap, creative, images, currentImageIndex });
      } catch (e: any) {
        setError(e?.message || 'Failed to load preview');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">Loading...</div>
      </Layout>
    );
  }

  if (error || !previewState) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center text-red-600">{error || 'Not found'}</div>
      </Layout>
    );
  }

  const { snap, creative, images, currentImageIndex } = previewState;

  const cta = snap.call_to_action === null || typeof snap.call_to_action === 'undefined'
    ? { mode: 'hidden' as const }
    : (snap.call_to_action === ''
        ? { mode: 'dynamic' as const }
        : { mode: 'standard' as const, label: String(snap.call_to_action) });

  const handleImageIndexChange = (nextIndex: number) => {
    setPreviewState((prev) => {
      if (!prev || prev.images.length === 0) return prev;
      const clamped = Math.max(0, Math.min(prev.images.length - 1, nextIndex));
      const nextCreative = prev.images[clamped] ?? prev.creative;
      return {
        ...prev,
        creative: nextCreative,
        currentImageIndex: clamped,
      };
    });
  };

  const handleClose = () => {
    router.push('/');
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-64px)] bg-gray-100 flex items-center justify-center p-4">
        <div className="fixed inset-0 z-40 bg-black/50" aria-hidden onClick={handleClose} />
        <div className="relative z-50 max-w-5xl w-full mx-auto">
          <div className="relative bg-white rounded-2xl shadow-2xl p-6">
            <button
              onClick={handleClose}
              className="absolute -top-4 -right-4 w-9 h-9 rounded-full bg-white shadow flex items-center justify-center hover:bg-gray-100"
              aria-label="Close preview"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.3 5.71L12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3l6.3 6.29 6.29-6.29z"/></svg>
            </button>

            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-semibold text-gray-900">TikTok Preview</h1>
              <span className="text-sm text-gray-400">Shared view</span>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <TiktokPreview
                creative={creative}
                text={snap.ad_text || ''}
                cta={cta as any}
                placement={'In feed'}
                enablePlacementSwitch={false}
                allowFullscreen={false}
                images={images}
                currentImageIndex={creative?.type === 'image' ? currentImageIndex : undefined}
                onImageIndexChange={handleImageIndexChange}
              />
            </div>

            <p className="mt-4 text-xs text-gray-500 text-center">
              This preview link expires seven days after it was generated.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}


