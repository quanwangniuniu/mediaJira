'use client';

import React from 'react';
import TiktokPreview from '@/components/tiktok/TiktokPreview';
import { fetchPublicPreview, TiktokMaterialItem } from '@/lib/api/tiktokApi';
import { useParams } from 'next/navigation';

export default function PublicPreviewPage() {
  const params = useParams();
  const slug = String(params?.slug || '');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const d = await fetchPublicPreview(slug);
        setData(d);
      } catch (e: any) {
        setError(e?.message || 'Failed to load preview');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (error || !data) return <div className="min-h-screen flex items-center justify-center text-red-600">{error || 'Not found'}</div>;

  // map snapshot_json -> props
  const snap = data.snapshot_json || {};
  const cta = snap.call_to_action === null || typeof snap.call_to_action === 'undefined'
    ? { mode: 'hidden' as const }
    : (snap.call_to_action === ''
        ? { mode: 'dynamic' as const }
        : { mode: 'standard' as const, label: String(snap.call_to_action) });

  // derive creative from assets
  let creative: TiktokMaterialItem | null = null;
  const assets = snap.assets || {};
  if (assets.primaryCreative) {
    const it = assets.primaryCreative;
    creative = {
      id: Number(it.id || 0),
      type: String(it.type || '').toLowerCase() === 'image' ? 'image' : 'video',
      url: it.url || it.previewUrl || it.fileUrl || it.source_url || '',
      previewUrl: it.previewUrl || it.thumbnail_url,
      fileUrl: it.fileUrl || it.url,
      title: it.name || it.title,
    };
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <TiktokPreview
        creative={creative}
        text={snap.ad_text || ''}
        cta={cta as any}
        placement={'In feed'}
      />
    </div>
  );
}


