'use client';

import { cn } from '@/lib/utils';

type ProfileUserInfoProps = Readonly<{
  name: string;
  email?: string;
  role?: string;
  className?: string;
}>;

export default function ProfileUserInfo({ name, email, role, className }: ProfileUserInfoProps) {
  return (
    <div className={cn('text-center', className)}>
      <p className="text-lg font-semibold text-gray-900 truncate">{name}</p>
      {email ? <p className="text-xs text-gray-500 truncate">{email}</p> : null}
      {role ? <p className="text-xs text-gray-500 truncate">{role}</p> : null}
    </div>
  );
}
