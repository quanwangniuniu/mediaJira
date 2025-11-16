'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorBlock, NotionBlockType } from '@/types/notion';

type Command = 'bold' | 'italic' | 'underline' | 'link';

interface NotionEditorProps {
  blocks: EditorBlock[];
  setBlocks: React.Dispatch<React.SetStateAction<EditorBlock[]>>;
}

const blockLabels: Record<NotionBlockType | string, string> = {
  rich_text: 'Text',
  text: 'Text',
  heading: 'Heading',
  quote: 'Quote',
  code: 'Code',
  divider: 'Divider',
  list: 'Bulleted list',
  numbered_list: 'Numbered list',
  todo_list: 'To-do list',
  table: 'Table',
};



const createBlockId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `block_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
};

const TABLE_TEMPLATE = `
<table data-table-block="true">
  <tbody>
    ${Array.from({ length: 3 })
      .map(
        () => `
      <tr>
        ${Array.from({ length: 3 })
          .map(() => '<td><br></td>')
          .join('')}
      </tr>
    `
      )
      .join('')}
  </tbody>
</table>
`;

const addRowToTableHtml = (html: string) => {
  if (typeof document === 'undefined') return html;
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html || TABLE_TEMPLATE;
  let table = tempDiv.querySelector('table');
  if (!table) {
    tempDiv.innerHTML = TABLE_TEMPLATE;
    table = tempDiv.querySelector('table');
    if (!table) return html;
  }
  table.setAttribute('data-table-block', 'true');
  const firstRow = table.querySelector('tr');
  const columnCount = firstRow ? firstRow.children.length : 3;
  const newRow = document.createElement('tr');
  for (let i = 0; i < columnCount; i += 1) {
    const cell = document.createElement('td');
    cell.innerHTML = '<br>';
    newRow.appendChild(cell);
  }
  const tbody = table.querySelector('tbody') || table;
  tbody.appendChild(newRow);
  return table.outerHTML;
};

const addColumnToTableHtml = (html: string) => {
  if (typeof document === 'undefined') return html;
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html || TABLE_TEMPLATE;
  let table = tempDiv.querySelector('table');
  if (!table) {
    tempDiv.innerHTML = TABLE_TEMPLATE;
    table = tempDiv.querySelector('table');
    if (!table) return html;
  }
  table.setAttribute('data-table-block', 'true');
  const rows = table.querySelectorAll('tr');
  rows.forEach((row) => {
    const cell = document.createElement('td');
    cell.innerHTML = '<br>';
    row.appendChild(cell);
  });
  return table.outerHTML;
};

export const createEmptyBlock = (
  type: NotionBlockType | string = 'rich_text'
): EditorBlock => ({
  id: createBlockId(),
  type,
  html:
    type === 'todo_list'
      ? '<span data-todo-state="unchecked"></span>'
      : type === 'divider'
      ? '<hr />'
      : type === 'table'
      ? TABLE_TEMPLATE
      : '',
});

const placeCaretAtEnd = (element: HTMLElement) => {
  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.addRange(range);
};

const sanitizeHtml = (value: string) => {
  if (!value) return '';
  return value.replace(/<script.*?>.*?<\/script>/gi, '');
};

const TODO_STATE_ATTR_REGEX = /data-todo-state="(checked|unchecked)"/i;
const TODO_MARKER_SPAN_REGEX = /<span[^>]*data-todo-state="(checked|unchecked)"[^>]*><\/span>/i;

const ensureTodoMarker = (html: string, checked = false) => {
  if (TODO_STATE_ATTR_REGEX.test(html)) {
    return html;
  }
  const marker = `<span data-todo-state="${checked ? 'checked' : 'unchecked'}"></span>`;
  return `${marker}${html || '<br>'}`;
};

const removeTodoMarker = (html: string) => html.replace(TODO_MARKER_SPAN_REGEX, '');

const setTodoStateInHtml = (html: string, checked: boolean) => {
  const state = checked ? 'checked' : 'unchecked';
  if (TODO_STATE_ATTR_REGEX.test(html)) {
    return html.replace(TODO_STATE_ATTR_REGEX, `data-todo-state="${state}"`);
  }
  const marker = `<span data-todo-state="${state}"></span>`;
  return `${marker}${html || '<br>'}`;
};

const isTodoCheckedInHtml = (html: string) => html.includes('data-todo-state="checked"');

const isEmptyHtml = (value: string) => {
  if (!value) return true;
  return sanitizeHtml(value)
    .replace(/<br\s*\/?>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<div><\/div>/gi, '')
    .replace(TODO_MARKER_SPAN_REGEX, '')
    .replace(/\s+/g, '')
    .trim() === '';
};

const sanitizeHtmlContent = (html: string): string => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const allowedTags = [
    'p', 'div', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'a', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'span', 'hr',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ];
  const allowedAttributes: Record<string, string[]> = {
    a: ['href', 'target', 'rel'],
    span: ['style', 'data-todo-state'],
    table: ['data-table-block'],
  };

  const cleanNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.cloneNode(true);
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      if (!allowedTags.includes(tagName)) {
        const fragment = document.createDocumentFragment();
        Array.from(element.childNodes).forEach((child) => {
          const cleaned = cleanNode(child);
          if (cleaned) {
            fragment.appendChild(cleaned);
          }
        });
        return fragment.childNodes.length > 0 ? fragment : null;
      }

      const newElement = document.createElement(tagName);
      const allowedAttrs = allowedAttributes[tagName] || [];
      Array.from(element.attributes).forEach((attr) => {
        if (allowedAttrs.includes(attr.name.toLowerCase())) {
          newElement.setAttribute(attr.name, attr.value);
        }
      });

      if (tagName === 'a') {
        const href = element.getAttribute('href');
        if (href) {
          newElement.setAttribute('href', href);
          newElement.setAttribute('target', '_blank');
          newElement.setAttribute('rel', 'noopener noreferrer');
        }
      }

      Array.from(element.childNodes).forEach((child) => {
        const cleaned = cleanNode(child);
        if (cleaned) {
          newElement.appendChild(cleaned);
        }
      });

      return newElement;
    }

    return null;
  };

  const cleanedFragment = document.createDocumentFragment();
  Array.from(tempDiv.childNodes).forEach((child) => {
    const cleaned = cleanNode(child);
    if (cleaned) {
      cleanedFragment.appendChild(cleaned);
    }
  });

  const wrapper = document.createElement('div');
  wrapper.appendChild(cleanedFragment);
  return wrapper.innerHTML;
};

const getBlockClassName = (type: NotionBlockType | string) => {
  switch (type) {
    case 'heading_1':
    case 'h1':
      return 'text-4xl font-bold leading-tight';
    case 'heading_2':
    case 'h2':
      return 'text-3xl font-semibold leading-tight';
    case 'heading_3':
    case 'h3':
      return 'text-2xl font-semibold leading-tight';
    case 'heading':
      // Fallback for old heading type
      return 'text-2xl font-semibold leading-tight';
    case 'quote':
      return 'border-l-4 border-gray-300 pl-4 italic text-gray-700';
    case 'code':
      return 'font-mono text-sm bg-gray-100 rounded-md px-3 py-2';
    case 'table':
      return 'text-base leading-7 [&_table]:w-full [&_table]:border-collapse [&_table]:rounded-md [&_table]:overflow-hidden [&_td]:border [&_td]:border-gray-200 [&_td]:p-2 [&_td]:align-top [&_td]:min-w-[80px] [&_th]:border [&_th]:border-gray-200 [&_th]:bg-gray-50 [&_th]:p-2';
    case 'list':
    case 'numbered_list':
    case 'todo_list':
      return 'text-base leading-7';
    default:
      return 'text-base leading-7';
  }
};

const isTextBlock = (type: NotionBlockType | string) => type !== 'divider';

interface CommandOption {
  id: string;
  label: string;
  icon?: string;
  type: NotionBlockType | string;
  description?: string;
}

const commandOptions: CommandOption[] = [
  { id: 'text', label: 'Text', icon: 'T', type: 'rich_text', description: 'Just start writing with plain text.' },
  { id: 'h1', label: 'Heading 1', icon: '#', type: 'heading_1', description: 'Big section heading.' },
  { id: 'h2', label: 'Heading 2', icon: '##', type: 'heading_2', description: 'Medium section heading.' },
  { id: 'h3', label: 'Heading 3', icon: '###', type: 'heading_3', description: 'Small section heading.' },
  { id: 'quote', label: 'Quote', icon: '"', type: 'quote', description: 'Capture a quote.' },
  { id: 'code', label: 'Code', icon: '</>', type: 'code', description: 'Capture a code snippet.' },
  { id: 'divider', label: 'Divider', icon: '---', type: 'divider', description: 'Visually divide blocks.' },
  { id: 'list', label: 'Bulleted list', icon: '•', type: 'list', description: 'Create a simple bulleted list.' },
  { id: 'numbered_list', label: 'Numbered list', icon: '1.', type: 'numbered_list', description: 'Create an ordered list.' },
  { id: 'todo_list', label: 'To-do list', icon: '☐', type: 'todo_list', description: 'Track tasks with checkboxes.' },
  { id: 'table', label: 'Table', icon: '▦', type: 'table', description: 'Insert a simple grid for structured data.' },
];

const getNumberedListIndex = (allBlocks: EditorBlock[], currentIndex: number) => {
  let count = 0;
  for (let i = 0; i <= currentIndex; i += 1) {
    if (allBlocks[i].type === 'numbered_list') {
      count += 1;
    }
  }
  return count || 1;
};

export default function NotionEditor({ blocks, setBlocks }: NotionEditorProps) {
  const blockRefs = useRef(new Map<string, HTMLDivElement | null>());
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandMenuPosition, setCommandMenuPosition] = useState({ top: 0, left: 0 });
  const [commandFilter, setCommandFilter] = useState('');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<'before' | 'after' | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const commandMenuRef = useRef<HTMLDivElement | null>(null);

  const activeBlock = useMemo(
    () => blocks.find((block) => block.id === activeBlockId) || null,
    [activeBlockId, blocks]
  );

  // Handle cross-block text selection
  useEffect(() => {
    let isSelecting = false;
    let startBlockId: string | null = null;
    
    // Capture blocks in closure
    const currentBlocks = blocks;
    
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const blockElement = target.closest('[data-block-id]') as HTMLElement;
      if (blockElement) {
        isSelecting = true;
        startBlockId = blockElement.getAttribute('data-block-id');
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isSelecting || e.buttons !== 1) return;
      
      // Use requestAnimationFrame to ensure selection is updated
      requestAnimationFrame(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
          return;
        }
        
        try {
          const range = selection.getRangeAt(0);
          if (range.collapsed) {
            return;
          }
          
          const container = document.querySelector('[data-notion-editor-container]') as HTMLElement;
          if (!container) {
            return;
          }

          const allBlocks = Array.from(container.querySelectorAll('[data-block-id]')) as HTMLElement[];
          
          // Create a map of block IDs to their indices in the React state array for faster lookup
          const blockIdToIndex = new Map<string, number>();
          currentBlocks.forEach((block, index) => {
            blockIdToIndex.set(block.id, index);
          });
          
          const findBlock = (node: Node): HTMLElement | null => {
            let current: Node | null = node;
            let depth = 0;
            while (current && depth < 20) { // Limit depth to avoid infinite loops
              if (current.nodeType === Node.ELEMENT_NODE) {
                const element = current as HTMLElement;
                if (element.hasAttribute('data-block-id')) {
                  return element;
                }
              }
              current = current.parentNode;
              depth++;
            }
            return null;
          };
          
          const startBlock = findBlock(range.startContainer);
          const endBlock = findBlock(range.endContainer);
          
          // Check if selection spans multiple blocks by examining all blocks between start and end
          if (startBlock && endBlock) {
            const startBlockId = startBlock.getAttribute('data-block-id');
            const endBlockId = endBlock.getAttribute('data-block-id');
            
            if (startBlockId && endBlockId) {
              // Find indices in the React state blocks array using the map
              const startIndexInBlocks = blockIdToIndex.get(startBlockId);
              const endIndexInBlocks = blockIdToIndex.get(endBlockId);
              
              // Always check the element under the mouse cursor to extend selection dynamically
              const point = new DOMPoint(e.clientX, e.clientY);
              const elementUnderMouse = document.elementFromPoint(point.x, point.y);
              const blockUnderMouse = elementUnderMouse ? findBlock(elementUnderMouse) : null;
              
              // Determine the effective end block (use mouse position if it's different and valid)
              let effectiveEndBlock = endBlock;
              let effectiveEndBlockId = endBlockId;
              
              if (blockUnderMouse && blockUnderMouse !== startBlock) {
                const mouseBlockId = blockUnderMouse.getAttribute('data-block-id');
                if (mouseBlockId) {
                  // Use mouse position as the end if it's different from the range's end
                  // This helps extend selection when dragging across blocks
                  effectiveEndBlock = blockUnderMouse;
                  effectiveEndBlockId = mouseBlockId;
                }
              }
              
              // Find indices for start and effective end
              const effectiveStartIndex = blockIdToIndex.get(startBlockId);
              const effectiveEndIndex = blockIdToIndex.get(effectiveEndBlockId);
              
              // Handle cross-block selection if we have valid indices
              if (effectiveStartIndex !== undefined && effectiveEndIndex !== undefined) {
                const firstIndex = Math.min(effectiveStartIndex, effectiveEndIndex);
                const lastIndex = Math.max(effectiveStartIndex, effectiveEndIndex);
                
                // Update selectedBlockIds with all blocks in the range
                const selectedIds = currentBlocks.slice(firstIndex, lastIndex + 1).map((b: EditorBlock) => b.id);
                setSelectedBlockIds(selectedIds);
                setLastSelectedIndex(lastIndex);
                
                // Find DOM elements for first and last blocks
                const firstBlockEl = allBlocks.find(el => el.getAttribute('data-block-id') === currentBlocks[firstIndex].id);
                const lastBlockEl = allBlocks.find(el => el.getAttribute('data-block-id') === currentBlocks[lastIndex].id);
                
                if (firstBlockEl && lastBlockEl) {
                  const getFirstTextNode = (element: HTMLElement): Node | null => {
                    const walker = document.createTreeWalker(
                      element,
                      NodeFilter.SHOW_TEXT,
                      null
                    );
                    return walker.nextNode();
                  };
                  
                  const getLastTextNode = (element: HTMLElement): Node | null => {
                    let lastText: Node | null = null;
                    const walker = document.createTreeWalker(
                      element,
                      NodeFilter.SHOW_TEXT,
                      null
                    );
                    let node;
                    while ((node = walker.nextNode())) {
                      lastText = node;
                    }
                    return lastText;
                  };
                  
                  const newRange = document.createRange();
                  
                  // Set start to beginning of first block
                  const firstTextNode = getFirstTextNode(firstBlockEl);
                  if (firstTextNode) {
                    newRange.setStart(firstTextNode, 0);
                  } else {
                    newRange.setStart(firstBlockEl, 0);
                  }
                  
                  // Set end to end of last block
                  const lastTextNode = getLastTextNode(lastBlockEl);
                  if (lastTextNode) {
                    newRange.setEnd(lastTextNode, lastTextNode.textContent?.length || 0);
                  } else {
                    newRange.setEnd(lastBlockEl, lastBlockEl.childNodes.length);
                  }
                  
                  selection.removeAllRanges();
                  selection.addRange(newRange);
                }
              }
            }
          }
        } catch (err: unknown) {
          console.error('Error in cross-block selection:', err);
        }
      });
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (!isSelecting) return;
      
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        isSelecting = false;
        startBlockId = null;
        return;
      }
      
      try {
        const range = selection.getRangeAt(0);
        if (range.collapsed) {
          isSelecting = false;
          startBlockId = null;
          return;
        }
        
        const container = document.querySelector('[data-notion-editor-container]') as HTMLElement;
        if (!container) {
          isSelecting = false;
          startBlockId = null;
          return;
        }

        const allBlocks = Array.from(container.querySelectorAll('[data-block-id]')) as HTMLElement[];
        
        const findBlock = (node: Node): HTMLElement | null => {
          let current: Node | null = node;
          while (current) {
            if (current.nodeType === Node.ELEMENT_NODE) {
              const element = current as HTMLElement;
              if (element.hasAttribute('data-block-id')) {
                return element;
              }
            }
            current = current.parentNode;
          }
          return null;
        };
        
        const startBlock = findBlock(range.startContainer);
        const endBlock = findBlock(range.endContainer);
        
        if (startBlock && endBlock && startBlock !== endBlock) {
          const startBlockId = startBlock.getAttribute('data-block-id');
          const endBlockId = endBlock.getAttribute('data-block-id');
          
          if (startBlockId && endBlockId) {
            // Create a map of block IDs to their indices in the React state array for faster lookup
            const blockIdToIndex = new Map<string, number>();
            currentBlocks.forEach((block, index) => {
              blockIdToIndex.set(block.id, index);
            });
            
            // Find indices in the React state blocks array using the map
            const startIndexInBlocks = blockIdToIndex.get(startBlockId);
            const endIndexInBlocks = blockIdToIndex.get(endBlockId);
            
            if (startIndexInBlocks !== undefined && endIndexInBlocks !== undefined) {
              const firstIndex = Math.min(startIndexInBlocks, endIndexInBlocks);
              const lastIndex = Math.max(startIndexInBlocks, endIndexInBlocks);
              
              // Update selectedBlockIds with all blocks in the range
              const selectedIds = currentBlocks.slice(firstIndex, lastIndex + 1).map((b: EditorBlock) => b.id);
              setSelectedBlockIds(selectedIds);
              setLastSelectedIndex(lastIndex);
              
              // Find DOM elements for first and last blocks
              const firstBlockEl = allBlocks.find(el => el.getAttribute('data-block-id') === currentBlocks[firstIndex].id);
              const lastBlockEl = allBlocks.find(el => el.getAttribute('data-block-id') === currentBlocks[lastIndex].id);
              
              if (firstBlockEl && lastBlockEl) {
                const getFirstTextNode = (element: HTMLElement): Node | null => {
                  const walker = document.createTreeWalker(
                    element,
                    NodeFilter.SHOW_TEXT,
                    null
                  );
                  return walker.nextNode();
                };
                
                const getLastTextNode = (element: HTMLElement): Node | null => {
                  let lastText: Node | null = null;
                  const walker = document.createTreeWalker(
                    element,
                    NodeFilter.SHOW_TEXT,
                    null
                  );
                  let node;
                  while ((node = walker.nextNode())) {
                    lastText = node;
                  }
                  return lastText;
                };
                
                const newRange = document.createRange();
                
                // Set start to beginning of first block
                const firstTextNode = getFirstTextNode(firstBlockEl);
                if (firstTextNode) {
                  newRange.setStart(firstTextNode, 0);
                } else {
                  newRange.setStart(firstBlockEl, 0);
                }
                
                // Set end to end of last block
                const lastTextNode = getLastTextNode(lastBlockEl);
                if (lastTextNode) {
                  newRange.setEnd(lastTextNode, lastTextNode.textContent?.length || 0);
                } else {
                  newRange.setEnd(lastBlockEl, lastBlockEl.childNodes.length);
                }
                
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
            }
          }
        }
      } catch (err: unknown) {
        console.error('Error finalizing cross-block selection:', err);
      }
      
      isSelecting = false;
      startBlockId = null;
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [blocks]);

  useEffect(() => {
    blocks.forEach((block) => {
      if (!isTextBlock(block.type)) return;
      const element = blockRefs.current.get(block.id);
      if (!element) return;
      const sanitized = sanitizeHtmlContent(block.html);
      const normalized =
        block.type === 'todo_list'
          ? ensureTodoMarker(sanitized, isTodoCheckedInHtml(sanitized))
          : sanitized;
      if (element.innerHTML !== normalized) {
        element.innerHTML = normalized;
      }
    });
  }, [blocks, sanitizeHtmlContent]);

  const registerBlockRef = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) {
      blockRefs.current.set(id, node);
    } else {
      blockRefs.current.delete(id);
    }
  }, []);

  const focusBlock = useCallback((id: string, moveCaretToEnd = true) => {
    requestAnimationFrame(() => {
      const element = blockRefs.current.get(id);
      if (element) {
        element.focus();
        if (moveCaretToEnd) {
          placeCaretAtEnd(element);
        }
        setActiveBlockId(id);
      }
    });
  }, []);

  const updateBlockHtml = useCallback((id: string, html: string) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== id) return block;
        const sanitizedHtml = sanitizeHtmlContent(html);
        const nextHtml =
          block.type === 'todo_list'
            ? ensureTodoMarker(sanitizedHtml)
            : removeTodoMarker(sanitizedHtml);
        return { ...block, html: nextHtml };
      })
    );
  }, [sanitizeHtmlContent, setBlocks]);

  const updateBlockType = useCallback((id: string, type: NotionBlockType | string) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== id) return block;
        let nextHtml = block.html;
        if (type === 'todo_list') {
          nextHtml = ensureTodoMarker(block.html);
        } else if (block.type === 'todo_list') {
          nextHtml = removeTodoMarker(block.html);
        }
        if (type === 'table') {
          nextHtml = TABLE_TEMPLATE;
        }
        if (type === 'divider') {
          nextHtml = '<hr />';
        }
        return { ...block, type, html: nextHtml };
      })
    );
  }, [setBlocks]);

  const insertBlockAfter = useCallback((afterId: string, type: NotionBlockType | string = 'rich_text') => {
    const newBlock = createEmptyBlock(type);
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === afterId);
      if (index === -1) {
        return [...prev, newBlock];
      }
      const nextBlocks = [...prev.slice(0, index + 1), newBlock, ...prev.slice(index + 1)];
      return nextBlocks;
    });
    focusBlock(newBlock.id);
  }, [focusBlock, setBlocks]);

  const insertBlockBefore = useCallback((beforeId: string, type: NotionBlockType | string = 'rich_text') => {
    const newBlock = createEmptyBlock(type);
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === beforeId);
      if (index === -1) {
        return [newBlock, ...prev];
      }
      const nextBlocks = [...prev.slice(0, index), newBlock, ...prev.slice(index)];
      return nextBlocks;
    });
    focusBlock(newBlock.id);
  }, [focusBlock, setBlocks]);

  const addTableRow = useCallback((id: string) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== id) return block;
        return {
          ...block,
          html: addRowToTableHtml(block.html),
        };
      })
    );
  }, [setBlocks]);

  const addTableColumn = useCallback((id: string) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== id) return block;
        return {
          ...block,
          html: addColumnToTableHtml(block.html),
        };
      })
    );
  }, [setBlocks]);

  const toggleTodoState = useCallback((id: string) => {
    let updatedHtml: string | null = null;
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== id) return block;
        const nextChecked = !isTodoCheckedInHtml(block.html);
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.log('[NotionEditor] toggle todo', { id, nextChecked });
        }
        updatedHtml = setTodoStateInHtml(block.html, nextChecked);
        return {
          ...block,
          html: updatedHtml,
        };
      })
    );
    if (updatedHtml !== null) {
      const element = blockRefs.current.get(id);
      if (element) {
        element.innerHTML = updatedHtml;
      }
    }
  }, [blockRefs, setBlocks]);

  const getBlockTypeById = useCallback(
    (blockId: string): NotionBlockType | string => {
      const block = blocks.find((b) => b.id === blockId);
      return block?.type || 'rich_text';
    },
    [blocks]
  );

  const insertBlockAfterSameType = useCallback(
    (blockId: string) => {
      insertBlockAfter(blockId, getBlockTypeById(blockId));
    },
    [getBlockTypeById, insertBlockAfter]
  );

  const moveBlock = useCallback((draggedId: string, targetId: string, position: 'before' | 'after') => {
    setBlocks((prev) => {
      const draggedIndex = prev.findIndex((b) => b.id === draggedId);
      const targetIndex = prev.findIndex((b) => b.id === targetId);
      
      if (draggedIndex === -1 || targetIndex === -1) {
        return prev;
      }
      
      // If dragging to the same position, do nothing
      if (draggedIndex === targetIndex) {
        return prev;
      }
      
      const draggedBlock = prev[draggedIndex];
      const blocksWithoutDragged = prev.filter((b) => b.id !== draggedId);
      
      // Calculate the new index in the array without the dragged block
      let newTargetIndex = targetIndex;
      if (targetIndex > draggedIndex) {
        // If dragging down, adjust target index
        newTargetIndex = targetIndex - 1;
      }
      
      let insertIndex: number;
      if (position === 'before') {
        insertIndex = newTargetIndex;
      } else {
        insertIndex = newTargetIndex + 1;
      }
      
      // Clamp insertIndex to valid range
      insertIndex = Math.max(0, Math.min(insertIndex, blocksWithoutDragged.length));
      
      const nextBlocks = [
        ...blocksWithoutDragged.slice(0, insertIndex),
        draggedBlock,
        ...blocksWithoutDragged.slice(insertIndex),
      ];
      
      return nextBlocks;
    });
  }, [setBlocks]);

  const splitBlockAtCursor = useCallback((id: string) => {
    const element = blockRefs.current.get(id);
    const currentBlock = blocks.find((b) => b.id === id);
    const currentType = currentBlock?.type || 'rich_text';
    if (!element) {
      insertBlockAfter(id, currentType);
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      insertBlockAfter(id, currentType);
      return;
    }

    const range = selection.getRangeAt(0);
    const textContent = element.textContent || '';
    
    // Check if cursor is at the end
    const isAtEnd = 
      (range.startContainer === element && range.startOffset === element.childNodes.length) ||
      (range.startContainer.nodeType === Node.TEXT_NODE && 
       range.startOffset >= (range.startContainer.textContent?.length || 0) &&
       !range.startContainer.nextSibling);
    
    if (isAtEnd || isEmptyHtml(element.innerHTML)) {
      insertBlockAfter(id, currentType);
      return;
    }

    if (!currentBlock) {
      insertBlockAfter(id, currentType);
      return;
    }

    // Use document.execCommand to split the content
    try {
      // Save current HTML
      const currentHtml = element.innerHTML;
      
      // Create a temporary container to split HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = currentHtml;
      
      // Get text content and cursor position
      const textBefore = textContent.slice(0, range.startOffset);
      const textAfter = textContent.slice(range.startOffset);
      
      // If there's no text after cursor, just insert new block
      if (!textAfter.trim()) {
        insertBlockAfter(id, currentType);
        return;
      }

      // Update current block with text before cursor
      const updatedCurrentBlock = {
        ...currentBlock,
        html: textBefore ? `<div>${textBefore}</div>` : '',
      };

      // Create new block with text after cursor
      const newBlock = createEmptyBlock(currentBlock.type);
      newBlock.html = textAfter ? `<div>${textAfter}</div>` : '';

      // Insert new block after current one
      setBlocks((prev) => {
        const index = prev.findIndex((b) => b.id === id);
        if (index === -1) {
          return [...prev, newBlock];
        }
        const nextBlocks = [
          ...prev.slice(0, index),
          updatedCurrentBlock,
          newBlock,
          ...prev.slice(index + 1),
        ];
        return nextBlocks;
      });

      // Focus the new block
      setTimeout(() => {
        focusBlock(newBlock.id, false);
        // Place cursor at start of new block
        const newElement = blockRefs.current.get(newBlock.id);
        if (newElement) {
          const newSelection = window.getSelection();
          if (newSelection) {
            const newRange = document.createRange();
            newRange.setStart(newElement, 0);
            newRange.collapse(true);
            newSelection.removeAllRanges();
            newSelection.addRange(newRange);
          }
        }
      }, 0);
    } catch (error) {
      // Fallback to simple insert if splitting fails
      console.error('Error splitting block:', error);
      insertBlockAfter(id, currentType);
    }
  }, [blocks, focusBlock, insertBlockAfter, setBlocks]);

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      const index = prev.findIndex((block) => block.id === id);
      if (index === -1) {
        return prev;
      }
      const nextBlocks = prev.filter((block) => block.id !== id);
      const fallbackBlock = nextBlocks[Math.max(0, index - 1)] ?? nextBlocks[0];
      if (fallbackBlock && isTextBlock(fallbackBlock.type)) {
        focusBlock(fallbackBlock.id);
      }
      return nextBlocks;
    });
  }, [focusBlock, setBlocks]);

  const syncActiveBlock = useCallback(() => {
    if (!activeBlockId) return;
    const element = blockRefs.current.get(activeBlockId);
    if (!element) return;
    updateBlockHtml(activeBlockId, element.innerHTML);
  }, [activeBlockId, updateBlockHtml]);

  const runCommand = useCallback((command: Command) => {
    if (!activeBlockId) return;
    const element = blockRefs.current.get(activeBlockId);
    if (!element) return;
    
    // Ensure element is focused
    element.focus();
    
    // Get current selection
    const selection = window.getSelection();
    const hasSelection = selection && selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed;
    
    try {
      switch (command) {
        case 'bold':
        case 'italic':
        case 'underline':
          // Apply formatting to selected text or prepare for next input
          document.execCommand(command, false);
          break;
        case 'link': {
          const url = window.prompt('Enter URL:');
          if (url && url.trim()) {
            // Validate URL format
            let validUrl = url.trim();
            if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://') && !validUrl.startsWith('mailto:')) {
              validUrl = `https://${validUrl}`;
            }
            
            if (hasSelection) {
              // Create link with selected text
              try {
                document.execCommand('createLink', false, validUrl);
              } catch (e) {
                // Fallback: wrap selection in link
                const range = selection!.getRangeAt(0);
                const selectedText = range.toString();
                const linkElement = document.createElement('a');
                linkElement.href = validUrl;
                linkElement.target = '_blank';
                linkElement.rel = 'noopener noreferrer';
                linkElement.textContent = selectedText;
                range.deleteContents();
                range.insertNode(linkElement);
              }
            } else {
              // If no selection, create link with URL as text
              const linkText = window.prompt('Enter link text (or press OK to use URL):', validUrl) || validUrl;
              const linkElement = document.createElement('a');
              linkElement.href = validUrl;
              linkElement.target = '_blank';
              linkElement.rel = 'noopener noreferrer';
              linkElement.textContent = linkText;
              
              // Insert at cursor position
              const range = selection!.getRangeAt(0);
              range.deleteContents();
              range.insertNode(linkElement);
              range.setStartAfter(linkElement);
              range.collapse(true);
              selection!.removeAllRanges();
              selection!.addRange(range);
            }
          }
          break;
        }
        default:
          break;
      }
      
      // Update block HTML after command
      setTimeout(() => {
        syncActiveBlock();
      }, 0);
    } catch (error) {
      console.error('Error executing command:', command, error);
    }
  }, [activeBlockId, syncActiveBlock]);

  const insertDivider = useCallback(() => {
    if (activeBlockId) {
      insertBlockAfter(activeBlockId, 'divider');
    } else if (blocks.length > 0) {
      insertBlockAfter(blocks[blocks.length - 1].id, 'divider');
    } else {
      setBlocks([createEmptyBlock('divider')]);
    }
  }, [activeBlockId, blocks, insertBlockAfter, setBlocks]);

  const toggleHeading = useCallback(() => {
    if (!activeBlockId) return;
    if (!activeBlock) return;
    const nextType = activeBlock.type === 'heading' ? 'rich_text' : 'heading';
    updateBlockType(activeBlockId, nextType);
    if (nextType === 'heading') {
      focusBlock(activeBlockId);
    }
  }, [activeBlock, activeBlockId, focusBlock, updateBlockType]);

  const handleInput = useCallback(
    (id: string, event: React.FormEvent<HTMLDivElement>) => {
      const element = event.currentTarget;
      const text = element.textContent || '';
      
      // Check if we're in command mode
      if (showCommandMenu) {
        const slashIndex = text.lastIndexOf('/');
        if (slashIndex !== -1) {
          const filter = text.slice(slashIndex + 1).toLowerCase();
          setCommandFilter(filter);
          setSelectedCommandIndex(0);
        } else {
          setShowCommandMenu(false);
          setCommandFilter('');
        }
      } else {
        // Check if "/" was just typed (fallback if handleKeyDown didn't catch it)
        const currentBlock = blocks.find((b) => b.id === id);
        if (currentBlock && text.endsWith('/') && !showCommandMenu) {
          const textBefore = text.slice(0, -1);
          // Show menu if "/" is at start, after space, or block was empty
          const shouldShowMenu = 
            textBefore.trim() === '' || 
            textBefore.endsWith(' ') || 
            textBefore.endsWith('\n') ||
            isEmptyHtml(currentBlock.html);
          
          if (shouldShowMenu) {
            // Get element position for menu placement
            const elementRect = element.getBoundingClientRect();
            let top = elementRect.top;
            let left = elementRect.left;
            
            // Try to get cursor position
            try {
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                if (rect.width > 0 || rect.height > 0) {
                  top = rect.bottom;
                  left = rect.left;
                }
              }
            } catch (e) {
              // Use element position as fallback
            }
            
            // Calculate menu position with smart positioning
            const menuHeight = 400;
            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - top;
            const spaceAbove = top;
            
            // If not enough space below but enough space above, show menu above cursor
            if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
              top = Math.max(0, top - menuHeight - 8);
            } else if (spaceBelow < menuHeight) {
              // If not enough space either way, position at bottom with some margin
              top = Math.max(0, viewportHeight - menuHeight - 16);
            } else {
              // Normal case: show below cursor
              top = Math.max(0, top + 8);
            }
            
            // Ensure left position is valid
            left = Math.max(0, left);
            
            // Show command menu
            setCommandMenuPosition({
              top: top,
              left: left,
            });
            setShowCommandMenu(true);
            setCommandFilter('');
            setSelectedCommandIndex(0);
          }
        }
      }
      
      updateBlockHtml(id, element.innerHTML);
    },
    [updateBlockHtml, showCommandMenu, blocks]
  );

  const filteredCommands = useMemo(() => {
    if (!commandFilter) return commandOptions;
    const filter = commandFilter.toLowerCase();
    return commandOptions.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(filter) ||
        cmd.description?.toLowerCase().includes(filter)
    );
  }, [commandFilter]);

  const handleCommandSelect = useCallback(
    (option: CommandOption) => {
      if (!activeBlockId) return;
      const element = blockRefs.current.get(activeBlockId);
      if (!element) return;

      // Remove the "/" and filter text from the element
      const text = element.textContent || '';
      const slashIndex = text.lastIndexOf('/');
      if (slashIndex !== -1) {
        const beforeSlash = text.slice(0, slashIndex);
        element.textContent = beforeSlash;
        
        // Update the HTML state
        updateBlockHtml(activeBlockId, element.innerHTML);
      }

      // Update block type based on option
      // Use option.type directly to support heading_1, heading_2, heading_3
      updateBlockType(activeBlockId, option.type);

      setShowCommandMenu(false);
      setCommandFilter('');
      setSelectedCommandIndex(0);
      
      // Focus and place cursor at end
      setTimeout(() => {
        focusBlock(activeBlockId);
      }, 0);
    },
    [activeBlockId, focusBlock, updateBlockType, updateBlockHtml]
  );

  const handleKeyDown = useCallback(
    (id: string, event: React.KeyboardEvent<HTMLDivElement>) => {
      const currentBlock = blocks.find((b) => b.id === id);

      // Handle command menu navigation
      if (showCommandMenu) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedCommandIndex((prev) =>
            Math.min(prev + 1, filteredCommands.length - 1)
          );
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedCommandIndex((prev) => Math.max(prev - 1, 0));
          return;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          if (filteredCommands[selectedCommandIndex]) {
            handleCommandSelect(filteredCommands[selectedCommandIndex]);
          }
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          setShowCommandMenu(false);
          setCommandFilter('');
          setSelectedCommandIndex(0);
          return;
        }
      }

      // Handle keyboard shortcuts for formatting
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'b' || event.key === 'B') {
          event.preventDefault();
          runCommand('bold');
          return;
        }
        if (event.key === 'i' || event.key === 'I') {
          event.preventDefault();
          runCommand('italic');
          return;
        }
        if (event.key === 'k' || event.key === 'K') {
          event.preventDefault();
          runCommand('link');
          return;
        }
      }

      // Detect "/" for command menu
      if (event.key === '/' && !showCommandMenu) {
        event.preventDefault(); // Prevent "/" from being inserted immediately
        const element = blockRefs.current.get(id);
        if (element) {
          // Get current block
          const currentBlock = blocks.find((b) => b.id === id);
          if (!currentBlock) return;
          
          // Get cursor position
          const selection = window.getSelection();
          if (!selection || selection.rangeCount === 0) return;
          
          const range = selection.getRangeAt(0);
          const textBefore = range.startContainer.textContent?.slice(0, range.startOffset) || '';
          
          // Show menu if "/" is at start, after space, or block is empty
          const shouldShowMenu = 
            textBefore.trim() === '' || 
            textBefore.endsWith(' ') || 
            textBefore.endsWith('\n') ||
            isEmptyHtml(currentBlock.html);
          
          if (!shouldShowMenu) return;
          
          // Get element position for menu placement
          const elementRect = element.getBoundingClientRect();
          let top = elementRect.top;
          let left = elementRect.left;
          
          // Try to get cursor position, but fallback to element position if invalid
          try {
            const rect = range.getBoundingClientRect();
            if (rect.width > 0 || rect.height > 0) {
              // Valid cursor position
              top = rect.bottom;
              left = rect.left;
            } else {
              // Invalid cursor position, use element position
              top = elementRect.top;
              left = elementRect.left;
            }
          } catch (e) {
            // Fallback to element position
            top = elementRect.top;
            left = elementRect.left;
          }
          
          // Insert "/" into the element
          try {
            if (range.startContainer.nodeType === Node.TEXT_NODE) {
              const textNode = range.startContainer as Text;
              textNode.insertData(range.startOffset, '/');
              range.setStart(textNode, range.startOffset + 1);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            } else {
              // For empty elements, set text content
              if (!element.textContent || element.textContent.trim() === '') {
                element.textContent = '/';
                placeCaretAtEnd(element);
              } else {
                element.textContent = (element.textContent || '') + '/';
                placeCaretAtEnd(element);
              }
            }
          } catch (e) {
            // Fallback: just set text content
            element.textContent = (element.textContent || '') + '/';
            placeCaretAtEnd(element);
          }
          
          // Update block HTML
          updateBlockHtml(id, element.innerHTML);
          
          // Calculate menu position with smart positioning
          const menuHeight = 400;
          const viewportHeight = window.innerHeight;
          const spaceBelow = viewportHeight - top;
          const spaceAbove = top;
          
          // If not enough space below but enough space above, show menu above cursor
          if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
            top = Math.max(0, top - menuHeight - 8);
          } else if (spaceBelow < menuHeight) {
            // If not enough space either way, position at bottom with some margin
            top = Math.max(0, viewportHeight - menuHeight - 16);
          } else {
            // Normal case: show below cursor
            top = Math.max(0, top + 8);
          }
          
          // Ensure left position is valid
          left = Math.max(0, left);
          
          // Show command menu
          setCommandMenuPosition({
            top: top,
            left: left,
          });
          setShowCommandMenu(true);
          setCommandFilter('');
          setSelectedCommandIndex(0);
        }
        return;
      }

      if (event.key === 'Enter' && !event.shiftKey) {
        if (currentBlock?.type === 'table') {
          event.preventDefault();
          document.execCommand('insertLineBreak');
          return;
        }
        if (showCommandMenu) {
          event.preventDefault();
          if (filteredCommands[selectedCommandIndex]) {
            handleCommandSelect(filteredCommands[selectedCommandIndex]);
          }
          return;
        }
        event.preventDefault();
        // Split block at cursor position or insert new block after
        splitBlockAtCursor(id);
        return;
      }
      if (event.key === 'Backspace') {
        const element = blockRefs.current.get(id);
        if (element && isEmptyHtml(element.innerHTML)) {
          event.preventDefault();
          removeBlock(id);
          return;
        }
      }
      if (event.key === 'ArrowUp') {
        if (showCommandMenu) return;
        const index = blocks.findIndex((block) => block.id === id);
        const previous = blocks[index - 1];
        if (previous && isTextBlock(previous.type)) {
          event.preventDefault();
          focusBlock(previous.id);
        }
        return;
      }
      if (event.key === 'ArrowDown') {
        if (showCommandMenu) return;
        const index = blocks.findIndex((block) => block.id === id);
        const next = blocks[index + 1];
        if (next && isTextBlock(next.type)) {
          event.preventDefault();
          focusBlock(next.id);
        } else if (!next) {
          event.preventDefault();
          insertBlockAfterSameType(id);
        }
      }
    },
    [
      blocks,
      focusBlock,
      insertBlockAfterSameType,
      removeBlock,
      showCommandMenu,
      filteredCommands,
      selectedCommandIndex,
      handleCommandSelect,
      splitBlockAtCursor,
    ]
  );

  const handlePaste = useCallback(
    (id: string, event: React.ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();
      
      const clipboardData = event.clipboardData;
      const element = blockRefs.current.get(id);
      if (!element) return;
      
      // Try to get HTML first (preserves formatting)
      let html = clipboardData.getData('text/html');
      const plainText = clipboardData.getData('text/plain');
      
      // If no HTML, use plain text
      if (!html || html.trim() === '') {
        html = plainText.replace(/\n/g, '<br>');
      } else {
        // Clean and sanitize the HTML
        html = sanitizeHtmlContent(html);
      }
      
      // Get current selection
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        // No selection, insert at cursor or append
        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false); // Collapse to end
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
      
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      
      // Check if we should split into multiple blocks
      // If HTML contains multiple block-level elements (p, div, h1-h6, etc.), split them
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // Process all elements in order, maintaining the original sequence
      const blockElements: { element: Element; listType?: 'ul' | 'ol' }[] = [];
      
      // Walk through all child nodes in order
      const walkNodes = (node: Node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          const tagName = element.tagName.toLowerCase();
          
          // Handle list items - extract them but mark as list items
          if (tagName === 'li') {
            const parentTag = element.parentElement?.tagName.toLowerCase();
            const listType = parentTag === 'ol' ? 'ol' : 'ul';
            blockElements.push({ element, listType });
            return; // Don't process children of li separately
          }
          
          // Handle block-level elements
          if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'ul', 'ol'].includes(tagName)) {
            // For lists, extract list items in order
            if (tagName === 'ul' || tagName === 'ol') {
              const listItems = element.querySelectorAll(':scope > li');
              listItems.forEach((li) => {
                blockElements.push({ element: li, listType: tagName as 'ul' | 'ol' });
              });
            } else {
              blockElements.push({ element, listType: undefined });
            }
            return; // Don't process children separately
          }
        }
        
        // Process children recursively
        if (node.childNodes) {
          Array.from(node.childNodes).forEach(child => walkNodes(child));
        }
      };
      
      // Start walking from tempDiv's children
      Array.from(tempDiv.childNodes).forEach(child => walkNodes(child));
      
      // If no block elements found, check for text content
      if (blockElements.length === 0) {
        const textContent = tempDiv.textContent || '';
        if (textContent.trim()) {
          blockElements.push({ element: tempDiv });
        }
      }
      
      // If there are multiple block elements or line breaks, handle splitting
      const hasMultipleBlocks = blockElements.length > 1 || plainText.includes('\n\n') || plainText.split('\n').length > 1;
      
      if (hasMultipleBlocks && blockElements.length > 0) {
        // Split into multiple blocks, maintaining order
        const blocks: { html: string; type: string }[] = [];
        
        blockElements.forEach(({ element: blockEl, listType }) => {
          const tagName = blockEl.tagName.toLowerCase();
          let blockType = 'rich_text';
          
          // Determine block type based on tag
          if (listType || tagName === 'li') {
            if (listType === 'ol') {
              blockType = 'numbered_list';
            } else {
              blockType = 'list';
            }
            // Extract content from list item, preserving formatting
            const liContent = blockEl.innerHTML;
            blocks.push({
              html: liContent,
              type: blockType,
            });
          } else if (tagName.startsWith('h')) {
            blockType = `heading_${tagName.slice(1)}` as NotionBlockType;
            blocks.push({
              html: blockEl.innerHTML,
              type: blockType,
            });
          } else if (tagName === 'blockquote') {
            blockType = 'quote';
            blocks.push({
              html: blockEl.innerHTML,
              type: blockType,
            });
          } else if (tagName === 'pre' || (tagName === 'code' && blockEl.parentElement?.tagName.toLowerCase() === 'pre')) {
            blockType = 'code';
            blocks.push({
              html: blockEl.textContent || blockEl.innerHTML,
              type: blockType,
            });
          } else if (tagName === 'p' || tagName === 'div' || tagName === '') {
            // Regular text block
            const content = blockEl.innerHTML || blockEl.textContent || '';
            if (content.trim() || blocks.length === 0) {
              blocks.push({
                html: content || '<br>',
                type: 'rich_text',
              });
            }
          }
        });
        
        // If no block elements found but has line breaks, split by lines
        if (blocks.length === 0 && plainText.includes('\n')) {
          const lines = plainText.split('\n');
          lines.forEach((line, index) => {
            if (line.trim() || index === 0) { // Include first line even if empty
              blocks.push({
                html: line || '<br>',
                type: 'rich_text',
              });
            }
          });
        }
        
        if (blocks.length > 0) {
          // Get current block content before and after cursor
          const beforeRange = range.cloneRange();
          beforeRange.setStart(element, 0);
          beforeRange.setEnd(range.startContainer, range.startOffset);
          const beforeContent = beforeRange.cloneContents();
          const beforeDiv = document.createElement('div');
          beforeDiv.appendChild(beforeContent);
          const beforeHtml = beforeDiv.innerHTML;
          
          const afterRange = range.cloneRange();
          afterRange.setStart(range.endContainer, range.endOffset);
          afterRange.setEnd(element, element.childNodes.length);
          const afterContent = afterRange.cloneContents();
          const afterDiv = document.createElement('div');
          afterDiv.appendChild(afterContent);
          const afterHtml = afterDiv.innerHTML;
          
          // Update current block with before content + first pasted block
          const firstBlock = blocks[0];
          const updatedHtml = (beforeHtml ? beforeHtml : '') + firstBlock.html + (afterHtml ? afterHtml : '');
          updateBlockHtml(id, updatedHtml || firstBlock.html);
          
          // If block type changed, update it
          if (firstBlock.type !== 'rich_text') {
            updateBlockType(id, firstBlock.type);
          }
          
          // Insert remaining blocks after current block
          if (blocks.length > 1) {
            // Insert blocks sequentially using setBlocks to ensure proper state updates
            setBlocks((prevBlocks) => {
              const currentBlockIndex = prevBlocks.findIndex(b => b.id === id);
              if (currentBlockIndex === -1) return prevBlocks;
              
              const newBlocks = [...prevBlocks];
              const blocksToInsert = blocks.slice(1).map((block) => ({
                id: createBlockId(),
                type: block.type as NotionBlockType,
                html: block.type === 'todo_list' ? ensureTodoMarker(block.html) : block.html,
              }));
              
              // Insert new blocks after current block
              newBlocks.splice(currentBlockIndex + 1, 0, ...blocksToInsert);
              
              // Update the blocks in the DOM after state update
              setTimeout(() => {
                blocksToInsert.forEach((newBlock) => {
                  const newElement = blockRefs.current.get(newBlock.id);
                  if (newElement) {
                    newElement.innerHTML = newBlock.html;
                    updateBlockHtml(newBlock.id, newBlock.html);
                  }
                });
                
                // Focus the last inserted block
                const lastBlock = blocksToInsert[blocksToInsert.length - 1];
                if (lastBlock) {
                  const lastElement = blockRefs.current.get(lastBlock.id);
                  if (lastElement) {
                    lastElement.focus();
                    placeCaretAtEnd(lastElement);
                  }
                }
              }, 0);
              
              return newBlocks;
            });
          } else {
            // Single block, just focus it
            setTimeout(() => {
              element.focus();
              const newRange = document.createRange();
              newRange.selectNodeContents(element);
              newRange.collapse(false);
              const sel = window.getSelection();
              if (sel) {
                sel.removeAllRanges();
                sel.addRange(newRange);
              }
            }, 0);
          }
        }
      } else {
        // Single block paste - insert HTML directly
        // Delete selected content if any
        if (!range.collapsed) {
          range.deleteContents();
        }
        
        // Create a temporary container to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Insert the nodes
        const fragment = document.createDocumentFragment();
        Array.from(tempDiv.childNodes).forEach(node => {
          fragment.appendChild(node.cloneNode(true));
        });
        
        range.insertNode(fragment);
        
        // Move cursor to end of inserted content
        range.setStartAfter(fragment.lastChild || fragment);
        range.collapse(true);
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
        
        // Update block HTML
        updateBlockHtml(id, element.innerHTML);
      }
      
      // Sync block after paste
      setTimeout(() => {
        syncActiveBlock();
      }, 0);
    },
    [updateBlockHtml, updateBlockType, insertBlockAfter, sanitizeHtml, syncActiveBlock, setBlocks]
  );


  // Ensure command menu is fully visible when shown
  useEffect(() => {
    if (showCommandMenu && commandMenuRef.current) {
      // Use setTimeout to ensure menu is fully rendered
      const timeoutId = setTimeout(() => {
        if (commandMenuRef.current) {
          const menu = commandMenuRef.current;
          const menuRect = menu.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const menuBottom = menuRect.bottom;
          
          // If menu bottom exceeds viewport, scroll to show it
          if (menuBottom > viewportHeight - 16) {
            const scrollAmount = menuBottom - viewportHeight + 16;
            window.scrollBy({
              top: scrollAmount,
              behavior: 'smooth',
            });
          }
        }
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [showCommandMenu, commandMenuPosition]);

  // Close command menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        commandMenuRef.current &&
        !commandMenuRef.current.contains(event.target as Node)
      ) {
        const target = event.target as HTMLElement;
        if (!target.closest('[contenteditable="true"]')) {
          setShowCommandMenu(false);
          setCommandFilter('');
        }
      }
    };

    if (showCommandMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCommandMenu]);

  // Ensure at least one block exists
  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, blockId: string) => {
    setDraggedBlockId(blockId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', blockId);
    // Add a small delay to allow the drag image to be set
    setTimeout(() => {
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
    }, 0);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, blockId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedBlockId || draggedBlockId === blockId) {
      setDragOverBlockId(null);
      setDragPosition(null);
      return;
    }
    
    setDragOverBlockId(blockId);
    
    // Determine if we should drop before or after based on mouse position
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY;
    const blockMiddle = rect.top + rect.height / 2;
    
    if (mouseY < blockMiddle) {
      setDragPosition('before');
    } else {
      setDragPosition('after');
    }
  }, [draggedBlockId]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if we're actually leaving the block area
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    if (mouseX < rect.left || mouseX > rect.right || mouseY < rect.top || mouseY > rect.bottom) {
      setDragOverBlockId(null);
      setDragPosition(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedBlockId || draggedBlockId === targetBlockId) {
      setDraggedBlockId(null);
      setDragOverBlockId(null);
      setDragPosition(null);
      return;
    }
    
    if (dragPosition) {
      moveBlock(draggedBlockId, targetBlockId, dragPosition);
    }
    
    setDraggedBlockId(null);
    setDragOverBlockId(null);
    setDragPosition(null);
  }, [draggedBlockId, dragPosition, moveBlock]);

  const handleDragEnd = useCallback(() => {
    setDraggedBlockId(null);
    setDragOverBlockId(null);
    setDragPosition(null);
  }, []);

  const displayBlocks = blocks.length > 0 ? blocks : [createEmptyBlock()];

  // Handle block click for Ctrl/Cmd-click and Shift-click
  const handleBlockClick = useCallback((e: React.MouseEvent, blockId: string, blockIndex: number) => {
    // Don't interfere with text selection
    if (window.getSelection()?.toString()) {
      return;
    }

    if (e.metaKey || e.ctrlKey) {
      // Ctrl/Cmd-click: toggle selection
      e.preventDefault();
      setSelectedBlockIds((prev) => {
        if (prev.includes(blockId)) {
          return prev.filter((id) => id !== blockId);
        } else {
          setLastSelectedIndex(blockIndex);
          return [...prev, blockId];
        }
      });
    } else if (e.shiftKey && lastSelectedIndex !== null) {
      // Shift-click: extend selection range
      e.preventDefault();
      const startIndex = Math.min(lastSelectedIndex, blockIndex);
      const endIndex = Math.max(lastSelectedIndex, blockIndex);
      const selectedIds = blocks.slice(startIndex, endIndex + 1).map((b) => b.id);
      setSelectedBlockIds(selectedIds);
    } else {
      // Regular click: single selection
      setSelectedBlockIds([blockId]);
      setLastSelectedIndex(blockIndex);
    }
  }, [blocks, lastSelectedIndex]);

  // Clear selection when clicking outside blocks
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const container = document.querySelector('[data-notion-editor-container]');
      if (container && !container.contains(target)) {
        setSelectedBlockIds([]);
        setLastSelectedIndex(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div 
        className="flex-1 pb-24 relative overflow-y-auto"
        data-notion-editor-container
      >
        <div className="max-w-3xl mx-auto w-full py-10 space-y-0 relative">
          {displayBlocks.map((block, index) => {
            const isActive = block.id === activeBlockId;
            const isHovered = hoveredBlockId === block.id;
            const isDragged = draggedBlockId === block.id;
            const isDragOver = dragOverBlockId === block.id;
            const showDragIndicator = isDragOver && dragPosition && !isDragged;
            const isBulletedList = block.type === 'list';
            const isNumberedList = block.type === 'numbered_list';
            const isTodoList = block.type === 'todo_list';
            const isListBlock = isBulletedList || isNumberedList || isTodoList;
            const listMarker = isNumberedList
              ? `${getNumberedListIndex(blocks, index)}.`
              : '•';
            const todoChecked = isTodoList ? isTodoCheckedInHtml(block.html) : false;
            
            if (!isTextBlock(block.type)) {
              const isSelected = selectedBlockIds.includes(block.id);

              return (
                <div
                  key={block.id}
                  className={`group relative flex items-center ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                  onMouseEnter={() => setHoveredBlockId(block.id)}
                  onMouseLeave={() => setHoveredBlockId(null)}
                  onDragOver={(e) => handleDragOver(e, block.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, block.id)}
                  onClick={(e) => handleBlockClick(e, block.id, index)}
                >
                  {/* Drag indicator line above */}
                  {showDragIndicator && dragPosition === 'before' && (
                    <div className="absolute -top-2 left-0 right-0 h-0.5 bg-blue-500 z-10" />
                  )}

                  <div className="flex items-center gap-3 w-full">
                    {/* Left sidebar with add button and drag handle */}
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          insertBlockAfter(block.id, 'rich_text');
                        }}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Add block above"
                        aria-label="Add block above"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        draggable
                        onDragStart={(e) => handleDragStart(e, block.id)}
                        onDragEnd={handleDragEnd}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-grab active:cursor-grabbing"
                        title="Drag to reorder"
                        aria-label="Drag to reorder"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex-1 py-2">
                      {block.type === 'divider' ? (
                        <hr className="w-full border-t border-gray-300 my-4" aria-hidden="true" />
                      ) : (
                        <div className="w-full border-t border-gray-300 my-4" aria-hidden />
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition mr-2"
                      aria-label="Remove divider"
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 3a1 1 0 01.894.553L11 4h3a1 1 0 010 2h-1v8a3 3 0 01-3 3H9a3 3 0 01-3-3V6H5a1 1 0 010-2h3l.106-.447A1 1 0 019 3zM8 6v8a1 1 0 001 1h2a1 1 0 001-1V6H8z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Drag indicator line below */}
                  {showDragIndicator && dragPosition === 'after' && (
                    <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-blue-500 z-10" />
                  )}
                </div>
              );
            }
            const isSelected = selectedBlockIds.includes(block.id);
            
            return (
              <div
                key={block.id}
                className={`group relative ${isDragged ? 'opacity-50' : ''} ${
                  isSelected ? 'bg-blue-50' : ''
                } ${block.type === 'table' ? 'mb-10 pb-10' : ''}`}
                onMouseEnter={() => setHoveredBlockId(block.id)}
                onMouseLeave={() => setHoveredBlockId(null)}
                onDragOver={(e) => handleDragOver(e, block.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, block.id)}
                onClick={(e) => handleBlockClick(e, block.id, index)}
                style={{
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                }}
              >
                {/* Drag indicator line above */}
                {showDragIndicator && dragPosition === 'before' && (
                  <div className="absolute -top-2 left-0 right-0 h-0.5 bg-blue-500 z-10" />
                )}
                
                <div className="flex items-start gap-2">
                  {/* Left sidebar with add button and drag handle */}
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ paddingTop: '0.375rem' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        insertBlockAfter(block.id, 'rich_text');
                      }}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Add block above"
                      aria-label="Add block above"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => handleDragStart(e, block.id)}
                      onDragEnd={handleDragEnd}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-grab active:cursor-grabbing"
                      title="Drag to reorder"
                      aria-label="Drag to reorder"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                  </div>
                  
                    <div className={`flex-1 py-1.5 relative ${block.type === 'table' ? 'px-1' : ''}`}>
                    {isListBlock && (
                      <div className="absolute left-0 top-1.5 w-6 h-6 flex items-center justify-center text-gray-500 z-20 pointer-events-auto">
                        {isTodoList ? (
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleTodoState(block.id);
                            }}
                            className={`w-4 h-4 flex items-center justify-center border rounded ${
                              todoChecked ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
                            }`}
                            aria-label={todoChecked ? 'Mark to-do incomplete' : 'Mark to-do complete'}
                          >
                            {todoChecked ? (
                              <svg
                                viewBox="0 0 16 16"
                                className="w-3 h-3 text-white"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M3 8l3 3 7-7" />
                              </svg>
                            ) : null}
                          </button>
                        ) : (
                          <span className="text-base leading-none pointer-events-none select-none">
                            {listMarker}
                          </span>
                        )}
                      </div>
                    )}
                    {isEmptyHtml(block.html) && !isListBlock ? (
                      <div className="absolute top-1.5 left-0 pointer-events-none select-none text-sm text-gray-400 z-0">
                        Type &apos;/&apos; for commands, press Enter to add a new block
                      </div>
                    ) : null}
                    {isEmptyHtml(block.html) && isListBlock ? (
                      <div className="absolute top-1.5 left-6 pointer-events-none select-none text-sm text-gray-400 z-0">
                        {isNumberedList ? 'Numbered item' : isTodoList ? 'To-do item' : 'List item'}
                      </div>
                    ) : null}
                    <div className={`relative ${block.type === 'table' ? 'group/table' : ''}`}>
                      <div
                        ref={(node) => registerBlockRef(block.id, node)}
                        contentEditable
                        suppressContentEditableWarning
                        className={`w-full min-h-[1.5rem] focus:outline-none ${getBlockClassName(block.type)} relative z-10 [&_a]:text-blue-600 [&_a]:underline [&_a:hover]:text-blue-800 ${
                          block.type === 'table' ? 'border border-gray-200 rounded-md bg-white overflow-auto' : ''
                        }`}
                        data-block-id={block.id}
                        style={{
                          caretColor: '#000',
                          userSelect: 'text',
                          WebkitUserSelect: 'text',
                          MozUserSelect: 'text',
                          msUserSelect: 'text',
                          ...(isListBlock ? { paddingLeft: '1.5rem' } : {}),
                        }}
                        onFocus={() => {
                          setActiveBlockId(block.id);
                        }}
                        onBlur={(e) => {
                          // Don't blur if selection is being made across blocks
                          const selection = window.getSelection();
                          if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0);
                            const container = document.querySelector('[data-notion-editor-container]') as HTMLElement;
                            if (container) {
                              const allBlocks = Array.from(container.querySelectorAll('[data-block-id]')) as HTMLElement[];
                              const findBlock = (node: Node): HTMLElement | null => {
                                let current: Node | null = node;
                                while (current) {
                                  if (current.nodeType === Node.ELEMENT_NODE) {
                                    const element = current as HTMLElement;
                                    if (element.hasAttribute('data-block-id')) {
                                      return element;
                                    }
                                  }
                                  current = current.parentNode;
                                }
                                return null;
                              };
                              const startBlock = findBlock(range.startContainer);
                              const endBlock = findBlock(range.endContainer);
                              if (startBlock && endBlock && startBlock !== endBlock) {
                                // Selection spans multiple blocks - don't blur
                                e.preventDefault();
                                return;
                              }
                            }
                          }
                          syncActiveBlock();
                        }}
                        onInput={(event) => {
                          const element = event.currentTarget;
                          if (element.innerHTML === '<br>' || element.innerHTML === '<div><br></div>') {
                            element.innerHTML = '';
                          }
                          handleInput(block.id, event);
                        }}
                        onKeyDown={(event) => handleKeyDown(block.id, event)}
                        onPaste={(event) => handlePaste(block.id, event)}
                        role="textbox"
                        aria-multiline
                      />
                      {block.type === 'table' ? (
                        <>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              addTableColumn(block.id);
                            }}
                            className="absolute -right-7 top-1/2 -translate-y-1/2 w-6 h-12 rounded-md border border-gray-200 bg-gray-100 text-gray-500 shadow-sm opacity-0 group-hover/table:opacity-100 transition"
                            aria-label="Add column"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              addTableRow(block.id);
                            }}
                            className="absolute left-1/2 -bottom-7 -translate-x-1/2 w-16 h-7 rounded-md border border-gray-200 bg-gray-100 text-gray-500 shadow-sm opacity-0 group-hover/table:opacity-100 transition"
                            aria-label="Add row"
                          >
                            +
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
                
                {/* Drag indicator line below */}
                {showDragIndicator && dragPosition === 'after' && (
                  <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-blue-500 z-10" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Command Menu */}
      {showCommandMenu && activeBlockId && (
        <div
          ref={commandMenuRef}
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
          style={{
            top: `${commandMenuPosition.top}px`,
            left: `${commandMenuPosition.left}px`,
            minWidth: '280px',
            maxWidth: '320px',
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 9999,
          }}
        >
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Basic blocks
            </div>
            {filteredCommands.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">
                No commands found
              </div>
            ) : (
              filteredCommands.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleCommandSelect(option)}
                  className={`w-full flex items-start gap-3 px-3 py-2 text-left rounded hover:bg-gray-100 transition-colors ${
                    index === selectedCommandIndex ? 'bg-gray-100' : ''
                  }`}
                  onMouseEnter={() => setSelectedCommandIndex(index)}
                >
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-600 text-sm font-medium">
                    {option.icon || '•'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {option.label}
                    </div>
                    {option.description && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {option.description}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span>Type &apos;/&apos; on the page</span>
            <span>esc</span>
          </div>
        </div>
      )}
    </div>
  );
}

