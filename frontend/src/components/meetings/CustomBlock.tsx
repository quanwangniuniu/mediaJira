import { useEffect, useRef, useState } from 'react';

interface CustomBlockProps {
  title: string;
  content: string;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
}

export function CustomBlock({
  title,
  content,
  onTitleChange,
  onContentChange,
}: CustomBlockProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [content]);

  return (
    <section className="py-1">
      {editingTitle ? (
        <input
          autoFocus
          defaultValue={title}
          onBlur={(e) => {
            onTitleChange(e.currentTarget.value.trim() || 'Custom Block');
            setEditingTitle(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
          }}
          className="mb-3 w-full border-none bg-transparent px-0 text-xl font-bold text-slate-900 outline-none"
        />
      ) : (
        <h3
          className="mb-3 cursor-text text-xl font-bold text-slate-900"
          onClick={() => setEditingTitle(true)}
        >
          {title}
        </h3>
      )}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onContentChange(e.currentTarget.value)}
        placeholder="Write your custom notes..."
        className="w-full resize-none border-none bg-transparent px-0 py-1 text-sm leading-7 text-slate-700 outline-none"
      />
    </section>
  );
}
