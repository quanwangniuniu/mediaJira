'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import Button from '@/components/button/Button';
import Avatar from '@/jiraProfile/ProfileAvatar';
import ProfileActions from '@/jiraProfile/ProfileActions';

type ProfileHeaderProps = Readonly<{
  avatarUrl?: string;
  displayName: string;
  backgroundUrl?: string;
  onAvatarClick?: () => void;
  onBackgroundChange?: (file: File) => void;
  actions?: React.ReactNode;
  className?: string;
}>;

const DEFAULT_COVER = '/bg-gradient.svg';
export default function ProfileHeader({
  avatarUrl,
  displayName,
  backgroundUrl = DEFAULT_COVER,
  onAvatarClick,
  onBackgroundChange,
  actions,
  className,
}: ProfileHeaderProps) {
  const [cover, setCover] = useState(backgroundUrl);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const coverObjectUrl = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (coverObjectUrl.current) URL.revokeObjectURL(coverObjectUrl.current);
    };
  }, []);

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (coverObjectUrl.current) URL.revokeObjectURL(coverObjectUrl.current);
    const nextUrl = URL.createObjectURL(file);
    coverObjectUrl.current = nextUrl;
    setCover(nextUrl);
    onBackgroundChange?.(file);
  };

  return (
    <section className={cn('rounded-lg border border-gray-200 bg-white', className)}>
      <div className="relative group">
        <div className="overflow-hidden rounded-t-lg">
          <div
            className="h-36 w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${cover})` }}
          />
          <div className="pointer-events-none absolute inset-0 rounded-t-lg bg-black/0 transition-colors duration-200 group-hover:bg-black/30" />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={() => coverInputRef.current?.click()}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-transparent text-white opacity-0 transition-opacity duration-200 hover:bg-white/10 group-hover:opacity-100"
        >
          Change cover
        </Button>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverChange}
          className="hidden"
        />

        <div className="absolute left-20 -bottom-12 flex items-end gap-4">
          <button
            type="button"
            onClick={onAvatarClick}
            className="relative rounded-full border-4 border-white bg-gray-100 shadow-md"
            aria-label="Change avatar"
          >
            <Avatar src={avatarUrl} name={displayName} size="lg" />
          </button>
        </div>
      </div>

      <div className="pb-6 pt-16">
        <div className="flex items-start justify-between gap-4 pl-20 pr-6">
          <div className="w-24 text-center">
            <p className="text-lg font-semibold text-gray-900">{displayName}</p>
          </div>
          {actions ? <ProfileActions>{actions}</ProfileActions> : null}
        </div>
      </div>
    </section>
  );
}
