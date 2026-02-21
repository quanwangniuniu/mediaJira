'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import useAuth from '@/hooks/useAuth';
import { NotionDraftAPI } from '@/lib/api/notionDraftApi';
import NotionDraftList from '@/components/notion/NotionDraftList';
import NotionEditor, { createEmptyBlock } from '@/components/notion/NotionEditor';
import {
  DraftStatus,
  DraftSummary,
  EditorBlock,
  NotionContentBlockRecord,
} from '@/types/notion';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const HEADING_TYPES = new Set([ 'heading_1', 'heading_2', 'heading_3', 'heading', 'h1', 'h2', 'h3' ]);
const headingLevel = (type: string): number => {
  if (type === 'heading_1' || type === 'h1') return 1;
  if (type === 'heading_2' || type === 'h2') return 2;
  return 3;
};
  
const stripHtml = (html: string): string => {
  if (typeof document === 'undefined') return html;
  const div = document.createElement('div');
  div.innerHTML = html;
    return div.textContent || div.innerText || '';
};

interface OutlineItem {
    id: string; 
    label: string;
    level: number; 
}
interface OutlineSidebarProps {
  items: OutlineItem[];
  activeId: string | null;
  onItemClick: (id: string) => void;
}

function OutlineSidebar({ items, activeId, onItemClick }: OutlineSidebarProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed', right: 0, top: 0, bottom: 0,
        width: hovered ? 260 : 20,
        transition: 'width 0.2s cubic-bezier(0.4,0,0.2,1)',
        zIndex: 40, overflow: 'hidden',
      }}
    >
      {/* Collapsed state: thin gray indicator lines */}
      {!hovered && (
        <div style={{ 
          position:'absolute', right:5, top:'50%',
          transform:'translateY(-50%)',
          display:'flex', flexDirection:'column', gap:3 }}>
          {(items.length ? items : Array(8).fill(null)).slice(0,14).map((item,i) => (
            <div key={i} style={{
              width: item ? (item.level===1?14:item.level===2?11:8) : [14,11,8,14,11,8,14,11][i%8],
              height: 1.5, background: '#d1d5db', borderRadius: 1,
            }}/>
          ))}
        </div>
      )}

      {/* Expanded state: full panel */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 260, height: '100%',
        background: '#fff',
        borderLeft: '2px solid #e5e7eb',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.10)',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.15s ease',
        pointerEvents: hovered ? 'auto' : 'none',
        display: 'flex', 
        flexDirection: 'column',
      }}>
      <div style={{
        padding: '20px 20px 10px 20px',
        fontSize: 11, 
        fontWeight: 700,
        color: '#3b82f6',
        letterSpacing: '0.06em',
        textTransform: 'uppercase', 
        flexShrink: 0,
        borderBottom: '1px solid #f3f4f6',
      }}>
        Table of Contents
        </div>

        {/* Scrollable list */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: 'calc(80vh - 52px)',
          padding: '8px 0',
          // Webkit scrollbar — narrow and subtle
          // @ts-ignore
          scrollbarWidth: 'thin',
          scrollbarColor: '#d1d5db transparent',
        }}
        className="outline-scroll"
        >
          
          {items.length === 0 ? (
          <div style={{
            padding: '12px 20px', fontSize: 12,
            color: '#9ca3af', fontStyle: 'italic',
          }}>
            Add headings to see outline
          </div>
        ) : items.map((item) => {
          
          const isActive = activeId === item.id;
          const indent = item.level === 1 ? 16 : item.level === 2 ? 28 : 40;
          return (
              <button
                key={item.id}
                type="button"
                onClick={() => onItemClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  minHeight: 32,
                  padding: `0 12px 0 0`,
                  paddingLeft: 0,
                  margin: 0,
                  border: 'none',
                  background: isActive ? '#eff6ff' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderRadius: 0,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = '#f9fafb';
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                {/* ── Blue active indicator bar ── */}
                <div style={{
                  width: 3, alignSelf: 'stretch', flexShrink: 0,
                  background: isActive ? '#3b82f6' : 'transparent',
                  borderRadius: '0 2px 2px 0',
                  marginRight: 0,
                  transition: 'background 0.15s',
                }} />

                {/* ── Label with indent ── */}
                <span style={{
                  paddingLeft: indent,
                  paddingRight: 12,
                  fontSize: 13,
                  lineHeight: '20px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#1d4ed8' : '#6b7280',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1,
                  minWidth: 0,
                }}>
                  {item.label || 'Untitled heading'}
                </span>
              </button>
            );
       })}
        </div>
      </div>
    </div>
  );
}


const TODO_STATE_REGEX = /data-todo-state="(checked|unchecked)"/i;
const addTodoMarkerIfMissing = (html: string) => {
  if (TODO_STATE_REGEX.test(html)) {
    return html;
  }
  const safeHtml = html && html.trim() ? html : '<br>';
  return `<span data-todo-state="unchecked"></span>${safeHtml}`;
};

const blockFromRecord = (
  record: NotionContentBlockRecord,
  fallbackId: string
): EditorBlock => {
  const content = record?.content ?? {};
  const fromHtml = typeof content.html === 'string' ? content.html : undefined;
  const fromText = typeof content.text === 'string' ? content.text : undefined;

  // Handle media blocks
  if (record.type === 'image' || record.type === 'video' || record.type === 'audio' || record.type === 'file') {
    const fileUrl = content.file_url || content.url;
    const filename = content.filename || '';
    if (fileUrl) {
      return createEmptyBlock(record.type, {
        file_url: fileUrl,
        filename,
        file_size: content.file_size,
        content_type: content.content_type,
      });
    }
  }
  
  if (record.type === 'web_bookmark') {
    const url = content.url;
    if (url) {
      return createEmptyBlock(record.type, {
        url,
        title: content.title || '',
        description: content.description || '',
        favicon: content.favicon || '',
      });
    }
  }

  let fromRichText: string | undefined;
  if (!fromHtml && !fromText) {
    const richText = Array.isArray(content.content)
      ? content.content
      : Array.isArray(content.rich_text)
      ? content.rich_text
      : null;
    if (richText) {
      fromRichText = richText
        .map((item: any) => {
          if (!item) return '';
          if (typeof item === 'string') return item;
          if (item?.text?.content) return item.text.content;
          if (item?.plain_text) return item.plain_text;
          return '';
        })
        .join('');
    }
  }

  const resolvedHtml = fromHtml ?? fromText ?? fromRichText ?? '';

  let normalizedHtml = resolvedHtml;
  if (record.type === 'todo_list') {
    normalizedHtml = addTodoMarkerIfMissing(resolvedHtml);
  }
  if (record.type === 'divider') {
    normalizedHtml = normalizedHtml || '<hr />';
  }

  const result: EditorBlock = {
    id: typeof record.id === 'string' ? record.id : fallbackId,
    type: record.type || 'rich_text',
    html: normalizedHtml,
  };

  // Handle code block language
  if (record.type === 'code' && content.language) {
    result.language = content.language;
  }

  return result;
};

const convertContentBlocksFromApi = (
  records: NotionContentBlockRecord[] | undefined
): EditorBlock[] => {
  if (!records || records.length === 0) {
    return [createEmptyBlock()];
  }
  return records.map((record, index) =>
    blockFromRecord(record, `block_${index}_${Date.now()}`)
  );
};

const convertBlocksToPayload = (
  blocks: EditorBlock[]
): NotionContentBlockRecord[] =>
  blocks.map((block, order) => {
    // Handle media blocks - extract content from HTML
    if (block.type === 'image' || block.type === 'video' || block.type === 'audio' || block.type === 'file') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = block.html;
      const img = tempDiv.querySelector('img');
      const video = tempDiv.querySelector('video');
      const audio = tempDiv.querySelector('audio');
      const link = tempDiv.querySelector('a');
      
      const fileUrl = img?.getAttribute('src') || video?.getAttribute('src') || audio?.getAttribute('src') || link?.getAttribute('href') || '';
      const filename = img?.getAttribute('alt') || link?.textContent?.trim() || '';
      
      return {
        id: block.id,
        type: block.type,
        order,
        content: {
          file_url: fileUrl,
          filename,
        },
      };
    }
    
    if (block.type === 'web_bookmark') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = block.html;
      const link = tempDiv.querySelector('a');
      const url = link?.getAttribute('href') || '';
      const titleEl = tempDiv.querySelector('.font-medium');
      const descEl = tempDiv.querySelector('.text-sm');
      const faviconEl = tempDiv.querySelector('img');
      
      return {
        id: block.id,
        type: block.type,
        order,
        content: {
          url,
          title: titleEl?.textContent?.trim() || '',
          description: descEl?.textContent?.trim() || '',
          favicon: faviconEl?.getAttribute('src') || '',
        },
      };
    }
    
    // Handle code blocks with language
    if (block.type === 'code') {
      return {
        id: block.id,
        type: block.type,
        order,
        content: {
          html: block.html,
          language: block.language || 'plain',
        },
      };
    }
    
    return {
      id: block.id,
      type: block.type || 'rich_text',
      order,
      content: {
        html: block.type === 'divider' ? block.html || '<hr />' : block.html,
      },
    };
  });

const buildSnapshot = (title: string, status: string, blocks: EditorBlock[]) =>
  JSON.stringify({
    title,
    status,
    blocks: blocks.map((block) => ({
      id: block.id,
      type: block.type,
      html: block.html,
      ...(block.language !== undefined && { language: block.language }),
    })),
  });

function NotionPageContent() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  // Initialize selectedDraftId from localStorage if available
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notion_selected_draft_id');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }
    return null;
  });
  const [isLoadingDrafts, setIsLoadingDrafts] = useState<boolean>(true);
  const [isLoadingEditor, setIsLoadingEditor] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('Untitled');
  const [status, setStatus] = useState<DraftStatus>('draft');
  const [blocks, setBlocks] = useState<EditorBlock[]>([createEmptyBlock()]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [lastEditedAt, setLastEditedAt] = useState<Date | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [deletingDraftId, setDeletingDraftId] = useState<number | null>(null);
  const [activeOutlineId, setActiveOutlineId] =useState<string | null>(null);

  const snapshotRef = useRef<string>(buildSnapshot(title, status, blocks));

   // ── Outline: derive items from heading blocks
  const outlineItems = useMemo<OutlineItem[]>(() => {
    return blocks
      .filter((b) => HEADING_TYPES.has(b.type))
      .map((b) => ({
        id: b.id,
        label: stripHtml(b.html),
        level: headingLevel(b.type),
      }));
  }, [blocks]);

  // ── Outline: scroll to heading on click and set activeOutlineId
  const handleOutlineClick = useCallback((blockId: string) => {
    setActiveOutlineId(blockId);
    const el = document.querySelector(
      `[data-block-id="${blockId}"]`
    ) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
  }, []);

  // ── Single observer ref (created once, reused) ─ to track visible headings and update activeOutlineId
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
  if (outlineItems.length === 0) {
    setActiveOutlineId(null);
    return;
  }

  // Disconnect previous before creating new
  if (observerRef.current) observerRef.current.disconnect();

  const visibleMap = new Map<string, number>();

  observerRef.current = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const id = entry.target.getAttribute('data-block-id');
        if (!id) return;
        if (entry.isIntersecting) {
          visibleMap.set(id, entry.intersectionRatio);
        } else {
          visibleMap.delete(id);
        }
      });

      if (visibleMap.size === 0) return;

      const topId = [...visibleMap.entries()]
        .sort((a, b) => b[1] - a[1])[0][0];

      setActiveOutlineId((prev) => prev !== topId ? topId : prev);
    },
    {
      root: null,
      // ── Key fix: narrows detection zone to top 10%–20% of viewport
      // so the active item tracks what you're actually reading, not
      // whatever heading last entered the bottom of the screen
      rootMargin: '-10% 0% -80% 0%',
      threshold: [0, 0.25, 0.5, 0.75, 1],
    }
  );

  // Small delay — ensures DOM has rendered after blocks state update
  const timer = setTimeout(() => {
    outlineItems.forEach(({ id }) => {
      const el = document.querySelector(`[data-block-id="${id}"]`);
      if (el) observerRef.current?.observe(el);
    });
  }, 50);

  return () => {
    clearTimeout(timer);
    observerRef.current?.disconnect();
  };
}, [outlineItems]);

  const layoutUser = useMemo(
    () =>
      user
        ? {
            name: user.username || 'User',
            email: user.email || '',
            role: user.roles?.length ? user.roles[0] : 'user',
          }
        : undefined,
    [user]
  );

  const handleUserAction = useCallback(
    async (action: string) => {
      if (action === 'logout') {
        await logout();
      }
      if (action === 'settings') {
        router.push('/profile/settings');
      }
    },
    [logout, router]
  );

  const syncSnapshot = useCallback(
    (nextTitle: string, nextStatus: string, nextBlocks: EditorBlock[]) => {
      snapshotRef.current = buildSnapshot(nextTitle, nextStatus, nextBlocks);
      setHasChanges(false);
    },
    []
  );

  const loadDraftDetail = useCallback(
    async (draftId: number | string | null | undefined) => {
      // Validate draftId
      if (!draftId || draftId === null || draftId === undefined) {
        toast.error('Invalid draft ID');
        return;
      }
      
      // Convert to number if it's a string
      const numericId = typeof draftId === 'string' ? parseInt(draftId, 10) : draftId;
      if (isNaN(numericId) || numericId <= 0) {
        toast.error('Invalid draft ID');
        return;
      }
      
      setIsLoadingEditor(true);
      try {
        const draft = await NotionDraftAPI.getDraft(numericId);
        const nextBlocks = convertContentBlocksFromApi(draft.content_blocks || []);
        
        setSelectedDraftId(numericId);
        // Save selected draft ID to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('notion_selected_draft_id', numericId.toString());
        }
        setBlocks(nextBlocks);
        const nextTitle = draft.title || 'Untitled';
        const nextStatus = (draft.status as DraftStatus) || 'draft';
        setTitle(nextTitle);
        setStatus(nextStatus);
        // Reset lastEditedAt when loading a draft (user hasn't edited yet)
        setLastEditedAt(null);
        setHasChanges(false);
        setActiveOutlineId(null);
        syncSnapshot(nextTitle, nextStatus, nextBlocks);
        
        // Focus the first block after loading
        setTimeout(() => {
          const firstBlock = document.querySelector('[data-block-id]') as HTMLElement;
          if (firstBlock) {
            firstBlock.focus();
          }
        }, 100);
      } catch (error: any) {
        console.error('Failed to load draft:', error);
        const errorMessage = error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'Failed to load draft';
        toast.error(errorMessage);
        // Reset state on error
        setSelectedDraftId(null);
        setBlocks([createEmptyBlock()]);
      } finally {
        setIsLoadingEditor(false);
      }
    },
    [syncSnapshot]
  );

  const refreshDrafts = useCallback(async () => {
    setIsLoadingDrafts(true);
    try {
      const data = await NotionDraftAPI.listDrafts();
      console.log('refreshDrafts: API response:', data);
      
      // Ensure data is always an array
      const safeData = Array.isArray(data) ? data : [];
      console.log('refreshDrafts: safeData:', safeData);
      console.log('refreshDrafts: safeData length:', safeData.length);
      
      // Validate and filter drafts with valid IDs
      const validDrafts = safeData.filter((draft) => {
        return draft && draft.id !== undefined && draft.id !== null;
      });
      console.log('refreshDrafts: validDrafts:', validDrafts);
      console.log('refreshDrafts: validDrafts length:', validDrafts.length);
      
      // Use functional update to preserve current state if needed
      setDrafts((prev) => {
        console.log('refreshDrafts: Previous drafts:', prev);
        console.log('refreshDrafts: Previous drafts length:', prev.length);
        console.log('refreshDrafts: Current selectedDraftId:', selectedDraftId);
        
        // If we have a selected draft, check if it's in the refreshed list
        const currentSelectedId = selectedDraftId;
        if (currentSelectedId) {
          const selectedDraftInList = validDrafts.find((d) => d.id === currentSelectedId);
          console.log('refreshDrafts: Selected draft in list:', selectedDraftInList);
          
          if (selectedDraftInList) {
            // If found, use the refreshed list (it will be sorted by updated_at)
            console.log('refreshDrafts: Using refreshed list with selected draft');
            return validDrafts;
          } else {
            // If not found in refreshed list, keep it from previous state
            const selectedDraft = prev.find((d) => d.id === currentSelectedId);
            console.log('refreshDrafts: Selected draft not in list, keeping from prev:', selectedDraft);
            
            if (selectedDraft) {
              // Merge: put selected draft at top, then refreshed drafts
              const otherDrafts = validDrafts.filter((d) => d.id !== currentSelectedId);
              const result = [selectedDraft, ...otherDrafts];
              console.log('refreshDrafts: Merged result:', result);
              return result;
            }
          }
        }
        // Default: use the refreshed list
        console.log('refreshDrafts: Using refreshed list (default)');
        return validDrafts;
      });
      
      // Only auto-load first draft if no draft is currently selected
      if (validDrafts.length > 0) {
        // Don't auto-load if a draft is already selected
      } else {
        // Only reset if we have no drafts and no current selection
        setSelectedDraftId((currentId) => {
          if (!currentId) {
            const defaultBlocks = [createEmptyBlock()];
            setBlocks(defaultBlocks);
            setTitle('Untitled');
            setStatus('draft');
            setLastEditedAt(null);
            syncSnapshot('Untitled', 'draft', defaultBlocks);
          }
          return currentId;
        });
      }
    } catch (error) {
      console.error('Failed to refresh drafts:', error);
      toast.error('Unable to load drafts');
      // Don't clear drafts on error - preserve current state
      setDrafts((prev) => prev);
    } finally {
      setIsLoadingDrafts(false);
    }
  }, [selectedDraftId, syncSnapshot]);

  // Only refresh drafts on initial mount, not on every refreshDrafts change
  useEffect(() => {
    const loadInitialDraft = async () => {
      try {
        const data = await NotionDraftAPI.listDrafts();
        const safeData = Array.isArray(data) ? data : [];
        const validDrafts = safeData.filter((draft) => {
          return draft && draft.id !== undefined && draft.id !== null;
        });
        
        setDrafts(validDrafts);
        
        // After refreshing drafts, try to load the saved draft ID from localStorage
        if (typeof window !== 'undefined') {
          const savedDraftId = localStorage.getItem('notion_selected_draft_id');
          if (savedDraftId) {
            const parsedId = parseInt(savedDraftId, 10);
            if (!isNaN(parsedId) && parsedId > 0) {
              // Check if the draft exists in the refreshed list
              const draftExists = validDrafts.some((d) => d.id === parsedId);
              if (draftExists) {
                // Load the draft after a short delay to ensure drafts list is ready
                setTimeout(() => {
                  loadDraftDetail(parsedId);
                }, 100);
              } else {
                // Draft doesn't exist, clear the saved ID
                localStorage.removeItem('notion_selected_draft_id');
                setSelectedDraftId(null);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to load initial drafts:', error);
        toast.error('Unable to load drafts');
      } finally {
        setIsLoadingDrafts(false);
      }
    };
    
    loadInitialDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  useEffect(() => {
    if (!selectedDraftId) {
      setHasChanges(false);
      return;
    }
    const snapshot = buildSnapshot(title, status, blocks);
    const hasChangesNow = snapshot !== snapshotRef.current;
    setHasChanges(hasChangesNow);
    
    // Update lastEditedAt when content changes
    if (hasChangesNow) {
      setLastEditedAt(new Date());
    }
  }, [blocks, selectedDraftId, status, title]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [hasChanges]);

  const handleCreateDraft = useCallback(async () => {
    try {
      setIsSaving(true);
      const initialBlocks = [createEmptyBlock()];
      const payload = {
        title: 'Untitled draft',
        status: 'draft' as DraftStatus,
        content_blocks: convertBlocksToPayload(initialBlocks),
      };
      const draft = await NotionDraftAPI.createDraft(payload);
      
      // Validate that draft.id exists
      if (!draft.id) {
        throw new Error('Draft created but id is missing');
      }
      
      // Convert content blocks from API response
      const nextBlocks = convertContentBlocksFromApi(draft.content_blocks || []);
      const nextTitle = draft.title || 'Untitled draft';
      const nextStatus = (draft.status as DraftStatus) || 'draft';
      
      // Update state immediately so editor shows
      setSelectedDraftId(draft.id);
      // Save selected draft ID to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('notion_selected_draft_id', draft.id.toString());
      }
      setBlocks(nextBlocks);
      setTitle(nextTitle);
      setStatus(nextStatus);
      // Reset lastEditedAt when creating a draft (user hasn't edited yet)
      setLastEditedAt(null);
      setHasChanges(false);
      setIsLoadingEditor(false);
      setActiveOutlineId(null);
      syncSnapshot(nextTitle, nextStatus, nextBlocks);
      
      // Refresh drafts list to update the UI (in background, don't wait)
      NotionDraftAPI.listDrafts()
        .then((data) => {
          const safeData = Array.isArray(data) ? data : [];
          setDrafts(safeData);
        })
        .catch(() => {
          // Continue even if list refresh fails
        });
      
      toast.success('Draft created');
      
      // Focus the editor after a short delay to ensure it's rendered
      setTimeout(() => {
        const firstBlock = document.querySelector('[data-block-id]') as HTMLElement;
        if (firstBlock) {
          firstBlock.focus();
        }
      }, 100);
    } catch (error: any) {
      console.error('Failed to create draft:', error);
      const errorMessage = error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'Failed to create draft';
      toast.error(errorMessage);
      // Reset state on error
      setSelectedDraftId(null);
      setBlocks([createEmptyBlock()]);
      setIsLoadingEditor(false);
    } finally {
      setIsSaving(false);
    }
  }, [syncSnapshot]);

  const handleDeleteDraft = useCallback(
    async (draftId: number) => {
      if (!window.confirm('Delete this draft?')) {
        return;
      }
      try {
        setDeletingDraftId(draftId);
        await NotionDraftAPI.deleteDraft(draftId);
        setDrafts((prev) => prev.filter((draft) => draft.id !== draftId));
        toast.success('Draft deleted');
        if (selectedDraftId === draftId) {
          const remaining = drafts.filter((draft) => draft.id !== draftId);
          if (remaining.length > 0) {
            await loadDraftDetail(remaining[0].id);
          } else {
            const defaultBlocks = [createEmptyBlock()];
            setSelectedDraftId(null);
            // Clear saved draft ID from localStorage
            if (typeof window !== 'undefined') {
              localStorage.removeItem('notion_selected_draft_id');
            }
            setBlocks(defaultBlocks);
            setTitle('Untitled');
            setStatus('draft');
            setLastEditedAt(null);
            setActiveOutlineId(null);
            syncSnapshot('Untitled', 'draft', defaultBlocks);
          }
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to delete draft');
      } finally {
        setDeletingDraftId(null);
      }
    },
    [drafts, loadDraftDetail, selectedDraftId, syncSnapshot]
  );

  const handleSave = useCallback(async () => {
    if (!selectedDraftId) {
      toast.error('Select a draft to save');
      return;
    }
    try {
      setIsSaving(true);
      const payload = {
        title: title.trim() || 'Untitled',
        status,
        content_blocks: convertBlocksToPayload(blocks),
      };
      const updated = await NotionDraftAPI.updateDraft(selectedDraftId, payload);
      console.log('Update API response:', updated);
      console.log('Update API response keys:', Object.keys(updated));
      
      // Use selectedDraftId if id is missing from response (backend serializer issue)
      const draftId = updated.id || selectedDraftId;
      if (!draftId) {
        console.error('No draft ID available!', { updated, selectedDraftId });
        throw new Error('Draft ID is missing from update response');
      }
      
      // Create updated summary from the response
      // UpdateDraftSerializer returns minimal fields, so we use existing draft data for other fields
      const existingDraft = drafts.find(d => d.id === draftId);
      const updatedSummary: DraftSummary = {
        id: draftId,
        title: updated.title || 'Untitled',
        status: updated.status || 'draft',
        user_email: existingDraft?.user_email || '',
        content_blocks_count: blocks.length,
        created_at: existingDraft?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      console.log('Created updatedSummary:', updatedSummary);
      
      // Update the draft in the list and move it to the top (most recently updated)
      // Use functional update to ensure we're working with the latest state
      setDrafts((prev) => {
        console.log('Previous drafts before update:', prev);
        console.log('Previous drafts length:', prev.length);
        console.log('Selected draft ID:', selectedDraftId);
        
        // Ensure we have a valid previous state
        if (!prev || prev.length === 0) {
          console.log('No previous drafts, returning new list with updatedSummary');
          return [updatedSummary];
        }
        
        // Check if the draft already exists in the list
        const existingIndex = prev.findIndex((draft) => draft.id === selectedDraftId);
        console.log('Existing index:', existingIndex);
        
        if (existingIndex >= 0) {
          // If draft exists, replace it and move to top
          const newDrafts = [...prev];
          newDrafts[existingIndex] = updatedSummary;
          // Move to top
          const result = [updatedSummary, ...newDrafts.filter((d) => d.id !== selectedDraftId)];
          console.log('Draft exists, new list:', result);
          console.log('New list length:', result.length);
          return result;
        } else {
          // If draft doesn't exist, add it to the top
          const result = [updatedSummary, ...prev];
          console.log('Draft does not exist, adding to top:', result);
          console.log('New list length:', result.length);
          return result;
        }
      });
      
      // Verify the update after a short delay
      setTimeout(() => {
        setDrafts((current) => {
          console.log('Drafts after update (delayed check):', current);
          console.log('Drafts length after update:', current.length);
          const draftExists = current.some((d) => d.id === selectedDraftId);
          console.log('Draft exists in list:', draftExists);
          if (!draftExists) {
            console.error('Draft disappeared! Attempting to restore...');
            // Try to restore
            const restored = [updatedSummary, ...current];
            console.log('Restored list:', restored);
            return restored;
          }
          return current;
        });
      }, 200);
      
      const nextBlocks = convertContentBlocksFromApi(updated.content_blocks);
      setBlocks(nextBlocks);
      const nextTitle = updated.title || 'Untitled';
      const nextStatus = (updated.status as DraftStatus) || 'draft';
      setTitle(nextTitle);
      setStatus(nextStatus);
      // Reset lastEditedAt after saving (content is synced, no unsaved edits)
      setLastEditedAt(null);
      
      // Update snapshot AFTER state updates to avoid triggering refreshDrafts
      syncSnapshot(nextTitle, nextStatus, nextBlocks);
      setHasChanges(false);
      toast.success('Draft saved');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  }, [blocks, selectedDraftId, status, syncSnapshot, title]);

  const lastEditedLabel = useMemo(() => {
    if (!lastEditedAt) return null;
    const delta = Date.now() - lastEditedAt.getTime();
    const seconds = Math.floor(delta / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) {
      return 'Last edited just now';
    } else if (minutes < 60) {
      return `Last edited ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (hours < 24) {
      return `Last edited ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (days < 7) {
      return `Last edited ${days} ${days === 1 ? 'day' : 'days'} ago`;
    } else if (weeks < 4) {
      return `Last edited ${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else if (months < 12) {
      return `Last edited ${months} ${months === 1 ? 'month' : 'months'} ago`;
    } else {
      return `Last edited ${years} ${years === 1 ? 'year' : 'years'} ago`;
    }
  }, [lastEditedAt]);

  return (
    <Layout user={layoutUser} onUserAction={handleUserAction}>
      <div className="h-full flex bg-gray-50 min-h-0">
        <NotionDraftList
          drafts={drafts}
          selectedId={selectedDraftId}
          onSelect={loadDraftDetail}
          onCreate={handleCreateDraft}
          onDelete={handleDeleteDraft}
          isLoading={isLoadingDrafts || deletingDraftId !== null}
        />
        <div className="flex-1 flex flex-col min-h-0">
          <div className="border-b border-gray-200 bg-white px-8 py-6 flex-shrink-0">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Untitled"
                className="flex-1 border-0 border-b border-transparent focus:border-blue-500 focus:ring-0 text-3xl font-semibold text-gray-900 placeholder:text-gray-300"
                disabled={!selectedDraftId}
              />
              {lastEditedLabel && (
                <span aria-live="polite" className="text-sm text-gray-500 whitespace-nowrap">
                  {lastEditedLabel}
                </span>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!selectedDraftId}
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
                  disabled={!selectedDraftId || isSaving || !hasChanges}
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-white min-h-0 overflow-y-auto">
            {isLoadingEditor ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                Loading draft…
              </div>
            ) : selectedDraftId ? (
              <NotionEditor blocks={blocks} setBlocks={setBlocks} draftId={selectedDraftId || undefined} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-3">
                <h2 className="text-xl font-semibold text-gray-500">
                  No draft selected
                </h2>
                <p className="max-w-md text-sm text-gray-500">
                  Create a new draft or select one from the sidebar to start
                  writing with the Notion-style editor.
                </p>
                <button
                  type="button"
                  onClick={handleCreateDraft}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  New draft
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

       {/* Outline sidebar — only shown when a draft is open */}
      {selectedDraftId && (
        <OutlineSidebar
          items={outlineItems}
          activeId={activeOutlineId}
          onItemClick={handleOutlineClick}
        />
      )}

      {isPreviewOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="relative flex flex-col max-h-[90vh] w-full max-w-3xl rounded-xl bg-white shadow-2xl">
            <div className="flex-shrink-0 h-16 border-b border-gray-200 bg-white px-6 flex items-center">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {title || 'Untitled'}
                </h3>
                <p className="text-sm text-gray-500">Preview mode</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="rounded-full bg-gray-100 p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Close preview"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 min-h-0">
              {blocks.map((block) => {
                if (block.type === 'divider') {
                  return (
                    <div key={block.id} className="w-full border-t border-gray-300 my-4" />
                  );
                }
                if (block.type === 'image' || block.type === 'video' || block.type === 'audio' || block.type === 'file' || block.type === 'web_bookmark') {
                  return (
                    <div
                      key={block.id}
                      className="prose prose-gray max-w-none"
                      dangerouslySetInnerHTML={{ __html: block.html || '' }}
                    />
                  );
                }
                if (!block.html) {
                  return (
                    <div key={block.id} className="text-gray-300 italic">
                      Empty block
                    </div>
                  );
                }
                return (
                  <div
                    key={block.id}
                    className="prose prose-gray max-w-none"
                    dangerouslySetInnerHTML={{ __html: block.html }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default function NotionPage() {
  return (
    <ProtectedRoute>
      <NotionPageContent />
    </ProtectedRoute>
  );
}

