'use client';

import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import TikTokActionBar from '@/components/tiktok/TikTokActionBar';
import CreativeLibraryDrawer from '@/components/tiktok/CreativeLibraryDrawer';
import { TiktokMaterialItem, saveAdDraft, getCreationDetail, shareAdDraft } from '@/lib/api/tiktokApi';
import { toast } from 'react-hot-toast';
import TiktokPreview from '@/components/tiktok/TiktokPreview';
import TiktokAdDetail from '@/components/tiktok/TiktokAdDetail';
import TikTokSidebar from '@/components/tiktok/TikTokSidebar';

const SELECTED_AD_STORAGE_KEY = 'tiktok-selected-ad-selection';

const getStoredSelection = () => {
  if (typeof window === 'undefined') {
    return { adDraftId: null as string | null, groupId: null as string | null };
  }

  try {
    const saved = window.localStorage.getItem(SELECTED_AD_STORAGE_KEY);
    if (!saved) {
      return { adDraftId: null, groupId: null };
    }

    const parsed = JSON.parse(saved);
    const adDraftId = typeof parsed?.adDraftId === 'string' ? parsed.adDraftId : null;
    const groupId = typeof parsed?.groupId === 'string' ? parsed.groupId : null;
    return { adDraftId, groupId };
  } catch (error) {
    console.warn('Failed to parse stored TikTok selection, clearing it:', error);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SELECTED_AD_STORAGE_KEY);
    }
    return { adDraftId: null, groupId: null };
  }
};

function TikTokPageContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showLibrary, setShowLibrary] = React.useState(false);
  const [libraryForceType, setLibraryForceType] = React.useState<'video' | 'image' | undefined>(undefined);
  const [selectedCreative, setSelectedCreative] = React.useState<TiktokMaterialItem | null>(null);
  const [selectedImages, setSelectedImages] = React.useState<TiktokMaterialItem[]>([]);

  // Current ad draft data
  const [adName, setAdName] = React.useState('');
  const [previewText, setPreviewText] = React.useState('');
  const [ctaMode, setCtaMode] = React.useState<'dynamic' | 'standard'>('standard');
  const [ctaLabel, setCtaLabel] = React.useState('Sign up');
  const [ctaEnabled, setCtaEnabled] = React.useState(true);
  const [placement, setPlacement] = React.useState<'In feed' | 'Search feed'>('In feed');
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareLink, setShareLink] = React.useState('');
  const [isSharing, setIsSharing] = React.useState(false);
  const [copyPressed, setCopyPressed] = React.useState(false);

  // Selected ad from sidebar
  const initialSelection = useMemo(() => getStoredSelection(), []);
  const [selectedAdDraftId, setSelectedAdDraftId] = React.useState<string | null>(initialSelection.adDraftId);
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(initialSelection.groupId);

  // Auto-save state
  const [isSaving, setIsSaving] = React.useState(false);
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Prevent autosave while switching/loading a different draft
  const [suspendAutoSave, setSuspendAutoSave] = React.useState(false);

  // Trigger sidebar refetch after successful saves or structural changes
  const [sidebarRefreshKey, setSidebarRefreshKey] = React.useState(0);

  // Clear out invalid persisted selection on first render (if one of ids missing)
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!selectedAdDraftId || !selectedGroupId) {
      window.localStorage.removeItem(SELECTED_AD_STORAGE_KEY);
    }
  }, [selectedAdDraftId, selectedGroupId]);

  const persistSelection = useCallback((adDraftId: string | null, groupId: string | null) => {
    if (typeof window === 'undefined') {
      return;
    }

    if (adDraftId && groupId) {
      window.localStorage.setItem(SELECTED_AD_STORAGE_KEY, JSON.stringify({ adDraftId, groupId }));
    } else {
      window.localStorage.removeItem(SELECTED_AD_STORAGE_KEY);
    }
  }, []);

  const layoutUser = user
    ? {
        name: user.username || 'User',
        email: user.email || '',
        role: user.roles?.length > 0 ? user.roles[0] : 'user',
      }
    : undefined;

  const handleUserAction = async (action: string) => {
    if (action === 'settings') {
      router.push('/profile/settings');
    } else if (action === 'logout') {
      await logout();
    }
  };

  // Load ad draft data from backend
  const loadAdDraft = useCallback(async (adDraftId: string) => {
    try {
      const response = await getCreationDetail({
        ad_draft_ids: [adDraftId]
      });

      if (response.ad_drafts && response.ad_drafts.length > 0) {
        const draft = response.ad_drafts[0];

        // Populate form with draft data
        setAdName(draft.name || '');
        setPreviewText(draft.ad_text || '');

        // Unified CTA as single field: null(off) | ''(dynamic) | string(standard)
        {
          const val = (draft as any).call_to_action as string | null | undefined;
          if (val === null || typeof val === 'undefined') {
            setCtaEnabled(false);
          setCtaMode('standard');
          setCtaLabel('Sign up');
          } else if (val === '') {
            setCtaEnabled(true);
            setCtaMode('dynamic');
            setCtaLabel('Sign up');
          } else {
            setCtaEnabled(true);
            setCtaMode('standard');
            setCtaLabel(val);
          }
        }

        // Load creative assets: backend may return
        if (draft.assets) {
          let rawAssets: any = draft.assets;
          // Unwrap Case 1 if assets is array with a single wrapper object
          if (Array.isArray(rawAssets) && rawAssets.length === 1 && typeof rawAssets[0] === 'object' && (rawAssets[0].primaryCreative || rawAssets[0].images)) {
            rawAssets = rawAssets[0];
          }

          const toItem = (it: any): TiktokMaterialItem | null => {
            const t = String(it.type || it.asset_type || '').toLowerCase();
            const type: 'video' | 'image' | null = t.includes('video') ? 'video' : t.includes('image') ? 'image' : null;
            if (!type) return null;
            const idNum = typeof it.id === 'number' ? it.id : (it.id ? Number(it.id) : NaN);
            return {
              id: Number.isNaN(idNum) ? Date.now() : idNum,
              type,
              url: it.url || it.previewUrl || it.preview_url || it.file_url || it.source_url || '',
              previewUrl: it.previewUrl || it.preview_url || it.thumbnail_url || undefined,
              fileUrl: it.fileUrl || it.file_url || it.url || undefined,
              title: it.name || it.title,
              created_at: it.created_at,
              width: it.width,
              height: it.height,
            } as TiktokMaterialItem;
          };

          // Wrapper-object case
          if (typeof rawAssets === 'object' && !Array.isArray(rawAssets)) {
            const primary = rawAssets.primaryCreative ? toItem(rawAssets.primaryCreative) : null;
            const images = Array.isArray(rawAssets.images) ? (rawAssets.images.map(toItem).filter(Boolean) as TiktokMaterialItem[]) : [];

            if (primary && primary.type === 'video') {
              setSelectedCreative(primary);
              setSelectedImages([]);
            } else {
              setSelectedImages(images);
              setSelectedCreative(images[0] || null);
            }
          } else {
            // Flat list case
            const items = (Array.isArray(rawAssets) ? rawAssets : []).map(toItem).filter(Boolean) as TiktokMaterialItem[];
            const hasVideo = items.some(a => a.type === 'video');
            if (hasVideo) {
              const video = items.find(a => a.type === 'video')!;
              setSelectedCreative(video);
              setSelectedImages([]);
            } else {
              const images = items.filter(a => a.type === 'image');
              setSelectedImages(images);
              setSelectedCreative(images[0] || null);
            }
          }
        }

        setHasUnsavedChanges(false);
        if (draft.updated_at) {
          setLastSavedAt(new Date(draft.updated_at));
        }
      }
    } catch (error) {
      console.error('Failed to load ad draft:', error);
    } finally {
      // Re-enable autosave after load completes
      setSuspendAutoSave(false);
    }
  }, []);

  // Auto-save function with debounce
  const saveAdDraftData = useCallback(async () => {
    if (!selectedAdDraftId || !selectedGroupId) return;

    try {
      setIsSaving(true);

      // Build assets object
      const assets: any = {};

      // If video is selected
      if (selectedCreative?.type === 'video') {
        assets.primaryCreative = {
          id: selectedCreative.id,
          type: selectedCreative.type,
          url: selectedCreative.url,
          previewUrl: selectedCreative.previewUrl,
          fileUrl: selectedCreative.fileUrl,
        };
      }

      // If images are selected
      if (selectedImages.length > 0) {
        assets.images = selectedImages.map(img => ({
          id: img.id,
          type: img.type,
          url: img.url,
          previewUrl: img.previewUrl,
          fileUrl: img.fileUrl,
        }));
        // If there's a selected image for preview, set it as primary
        if (selectedCreative?.type === 'image') {
          assets.primaryCreative = {
            id: selectedCreative.id,
            type: selectedCreative.type,
            url: selectedCreative.url,
            previewUrl: selectedCreative.previewUrl,
            fileUrl: selectedCreative.fileUrl,
          };
        }
      }

      // Build unified CTA field
      const ctaPayload: any = {};
      if (!ctaEnabled) {
        // omit to mean OFF per requirement
      } else if (ctaMode === 'dynamic') {
        ctaPayload.call_to_action = '';
      } else {
        ctaPayload.call_to_action = ctaLabel || '';
      }

      await saveAdDraft({
        adgroup_id: selectedGroupId,
        form_data_list: [{
          id: selectedAdDraftId, // UUID of the ad draft
          name: adName,
          ad_text: previewText,
          ...ctaPayload,
          assets: Object.keys(assets).length > 0 ? assets : undefined,
        }]
      });

      setLastSavedAt(new Date());
      setHasUnsavedChanges(false);
      // Notify sidebar to refresh its list so names reflect latest saved value
      setSidebarRefreshKey((v) => v + 1);
    } catch (error) {
      console.error('Failed to save ad draft:', error);
    } finally {
      setIsSaving(false);
    }
  }, [selectedAdDraftId, selectedGroupId, adName, previewText, ctaMode, ctaLabel, selectedCreative, selectedImages]);

  // Trigger auto-save when data changes
  useEffect(() => {
    if (!selectedAdDraftId) return;
    if (suspendAutoSave) return; // skip autosave while switching/loading

    setHasUnsavedChanges(true);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save (2 seconds after last change)
    saveTimeoutRef.current = setTimeout(() => {
      saveAdDraftData();
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [adName, previewText, ctaMode, ctaLabel, selectedAdDraftId, saveAdDraftData, suspendAutoSave]);

  // Load ad data when selectedAdDraftId changes
  useEffect(() => {
    if (selectedAdDraftId) {
      loadAdDraft(selectedAdDraftId);
    }
  }, [selectedAdDraftId, loadAdDraft]);

  // Handle ad selection from sidebar
  const handleSelectAd = useCallback(async (adDraftId: string, groupId: string) => {
    // Cancel any pending save before switching
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Suspend autosave and reset form state immediately to avoid leaking previous draft data
    setSuspendAutoSave(true);
    setAdName('');
    setPreviewText('');
    setCtaMode('standard');
    setCtaLabel('Sign up');
    setSelectedCreative(null);
    setSelectedImages([]);
    setHasUnsavedChanges(false);
    setLastSavedAt(null);

    setSelectedAdDraftId(adDraftId);
    setSelectedGroupId(groupId);
    persistSelection(adDraftId, groupId); // Persist selection
    // loadAdDraft will be called by the useEffect above
  }, [persistSelection]);

  // Reset form for new ad
  const handleNewAd = useCallback(() => {
    setSelectedAdDraftId(null);
    setSelectedGroupId(null);
    setAdName('');
    setPreviewText('');
    setCtaMode('standard');
    setCtaLabel('Sign up');
    setSelectedCreative(null);
    setSelectedImages([]);
    setHasUnsavedChanges(false);
    setLastSavedAt(null);
    persistSelection(null, null); // Clear selection on new ad
  }, [persistSelection]);

  return (
    <Layout user={layoutUser} onUserAction={handleUserAction}>
      <div className="h-full flex flex-row">
        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="h-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col">
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto py-8 scrollbar-hide">
              {/* Ad Name Section */}
              <div className="mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-semibold text-gray-900">Ad Name</h1>
                  </div>
                  <div className="w-full">
                    <input
                      type="text"
                      value={adName}
                      onChange={(e) => setAdName(e.target.value)}
                      placeholder="Enter ad name..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

            {/* Ad Detail and Preview Section */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
              {/* Ad Detail - Left side (3/5) */}
              <div className="lg:col-span-3 bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Ad Details</h2>
                </div>
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                  <TiktokAdDetail
                    selectedCreative={selectedCreative}
                    selectedImages={selectedImages}
                    text={previewText}
                    ctaMode={ctaMode}
                    ctaLabel={ctaLabel}
                    ctaEnabled={ctaEnabled}
                    onOpenLibrary={() => { setLibraryForceType(undefined); setShowLibrary(true); }}
                    onOpenLibraryVideo={() => { setLibraryForceType('video'); setShowLibrary(true); }}
                    onOpenLibraryImages={() => { setLibraryForceType('image'); setShowLibrary(true); }}
                    onRemoveImage={(id) => setSelectedImages((arr) => arr.filter(i => i.id !== id))}
                    onClearImages={() => setSelectedImages([])}
                    onPreviewImage={(img) => setSelectedCreative(img)}
                    onChange={({ text, cta }) => { setPreviewText(text); setCtaMode(cta.mode); setCtaLabel(cta.label); }}
                    onToggleCta={(enabled) => setCtaEnabled(enabled)}
                  />
                </div>
              </div>

              {/* Preview - Right side (2/5) */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden min-w-[20rem]">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Preview</h2>
                </div>
                <TiktokPreview
                  key={selectedCreative?.id || 'none'}
                  creative={selectedCreative}
                  text={previewText}
                  cta={ctaEnabled ? ({ mode: ctaMode as any, label: ctaLabel }) : ({ mode: 'hidden' as any })}
                  placement={placement}
                  onPlacementChange={(p) => setPlacement(p)}
                  images={selectedImages}
                  currentImageIndex={selectedCreative?.type === 'image' ? selectedImages.findIndex(i => i.id === selectedCreative.id) : undefined}
                  onImageIndexChange={(nextIndex) => {
                    if (!selectedImages || selectedImages.length === 0) return;
                    const clamped = Math.max(0, Math.min(selectedImages.length - 1, nextIndex));
                    const next = selectedImages[clamped];
                    if (next) setSelectedCreative(next);
                  }}
                />
              </div>
            </div>
            </div>
            
            {/* Fixed Bottom Action Bar */}
            <TikTokActionBar
              onSave={() => saveAdDraftData()}
              isSaving={isSaving}
              hasUnsaved={hasUnsavedChanges}
              lastSavedAt={lastSavedAt}
              onSharePreview={async () => {
                if (!selectedAdDraftId) return;
                try {
                  setIsSharing(true);
                  const { slug } = await shareAdDraft(selectedAdDraftId);
                  const origin = typeof window !== 'undefined' ? window.location.origin : '';
                  setShareLink(`${origin}/tiktok/preview/${slug}`);
                  setShareOpen(true);
                } finally {
                  setIsSharing(false);
                }
              }}
            />
          <CreativeLibraryDrawer
            isOpen={showLibrary}
            onClose={() => setShowLibrary(false)}
            onConfirm={(mat) => {
              if (!mat) return;
              if (mat.type === 'video') {
                setSelectedCreative(mat);
                setSelectedImages([]); // switch to video mode
              } else {
                // image mode (max 35)
                setSelectedCreative(mat); // preview clicked image
                setSelectedImages((prev) => {
                  const exists = prev.some(i => i.id === mat.id);
                  if (exists) return prev;
                  if (prev.length >= 35) return prev;
                  return [...prev, mat];
                });
              }
            }}
            forceType={libraryForceType}
          />
        </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 h-full flex-shrink-0">
          <TikTokSidebar onSelectAd={handleSelectAd} selectedAdId={selectedAdDraftId} refreshKey={sidebarRefreshKey} />
        </div>
      </div>
      {/* Share link modal */}
      {shareOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-5 relative">
            <button className="absolute top-2 right-2 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center" onClick={() => { setShareOpen(false); setCopyPressed(false); }} aria-label="Close">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.3 5.71L12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3l6.3 6.29 6.29-6.29z"/></svg>
            </button>
            <h3 className="text-lg font-semibold mb-4">Share preview</h3>
            <div className="space-y-3">
              <input type="text" readOnly value={isSharing ? 'Generating link…' : shareLink}
                className="w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-700" />
              <div className="flex items-center gap-3">
                <button
                  className={`w-9 h-9 rounded-md text-white flex items-center justify-center transition-colors disabled:opacity-60 ${copyPressed ? 'bg-blue-800 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                  title="Copy link"
                  disabled={!shareLink || copyPressed}
                  onClick={async () => {
                    if (!shareLink || copyPressed) return;
                    try {
                      await navigator.clipboard.writeText(shareLink);
                    } finally {
                      setCopyPressed(true);
                    }
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                </button>
              </div>
              <p className="text-xs text-gray-500">Link expires 7 days after generation.</p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default function TikTokPage() {
  return (
    <ProtectedRoute>
      <TikTokPageContent />
    </ProtectedRoute>
  );
}
