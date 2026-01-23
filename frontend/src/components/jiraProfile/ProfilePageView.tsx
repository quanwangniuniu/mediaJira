'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, Building2, Check, Mail, MapPin, Network, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from '@/components/button/Button';
import UserAvatar from '@/people/UserAvatar';
import { TextInput } from '@/components/input/InputPrimitives';
import Stack from '@/components/layout/primitives/Stack';

type ProfileUser = {
  name: string;
  email?: string;
  role?: string;
  avatar?: string;
};

type ProfileFields = {
  job: string;
  department: string;
  organization: string;
  location: string;
};

type ProfilePageViewProps = Readonly<{
  user: ProfileUser;
  initialFields?: Partial<ProfileFields>;
  backgroundUrl?: string;
  initialEditing?: boolean;
  className?: string;
}>;

const DEFAULT_COVER = '/bg-gradient.svg';

export default function ProfilePageView({
  user,
  initialFields,
  backgroundUrl = DEFAULT_COVER,
  initialEditing = false,
  className,
}: ProfilePageViewProps) {
  const [activeField, setActiveField] = useState<keyof ProfileFields | null>(
    initialEditing ? 'job' : null,
  );
  const [cover, setCover] = useState(backgroundUrl);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverObjectUrl = useRef<string | null>(null);
  const avatarObjectUrl = useRef<string | null>(null);
  const aboutSectionRef = useRef<HTMLDivElement>(null);
  const activeFieldRef = useRef<keyof ProfileFields | null>(null);
  const fieldsRef = useRef<ProfileFields | null>(null);

  const initialValues = useMemo<ProfileFields>(
    () => ({
      job: initialFields?.job ?? 'Your job title',
      department: initialFields?.department ?? 'Your department',
      organization: initialFields?.organization ?? 'Your organization',
      location: initialFields?.location ?? 'Your location',
    }),
    [initialFields],
  );

  const [fields, setFields] = useState<ProfileFields>(initialValues);
  const savedRef = useRef<ProfileFields>(initialValues);

  useEffect(() => {
    activeFieldRef.current = activeField;
  }, [activeField]);

  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  const saveField = (field: keyof ProfileFields) => {
    savedRef.current = { ...savedRef.current, [field]: fields[field] };
  };

  const handleSaveActive = () => {
    if (!activeField) return;
    saveField(activeField);
    setActiveField(null);
  };

  const cancelField = (field: keyof ProfileFields) => {
    setFields((prev) => ({ ...prev, [field]: savedRef.current[field] }));
    setActiveField(null);
  };

  const handleCancelActive = () => {
    if (!activeField) return;
    cancelField(activeField);
  };

  const handleSelectField = (field: keyof ProfileFields) => {
    if (activeField && activeField !== field) {
      saveField(activeField);
    }
    setActiveField(field);
  };

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (coverObjectUrl.current) URL.revokeObjectURL(coverObjectUrl.current);
    const nextUrl = URL.createObjectURL(file);
    coverObjectUrl.current = nextUrl;
    setCover(nextUrl);
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (avatarObjectUrl.current) URL.revokeObjectURL(avatarObjectUrl.current);
    const nextUrl = URL.createObjectURL(file);
    avatarObjectUrl.current = nextUrl;
    setAvatarUrl(nextUrl);
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const currentField = activeFieldRef.current;
      if (!currentField) return;
      const target = event.target as Node;
      if (aboutSectionRef.current?.contains(target)) return;
      cancelField(currentField);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      if (coverObjectUrl.current) URL.revokeObjectURL(coverObjectUrl.current);
      if (avatarObjectUrl.current) URL.revokeObjectURL(avatarObjectUrl.current);
    };
  }, []);

  return (
    <section className={cn('w-full pb-8', className)}>
      <Stack spacing="lg" className="px-6 pt-4">

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="relative group">
            <div className="overflow-hidden rounded-t-lg">
              <div className="h-36 w-full bg-cover bg-center" style={{ backgroundImage: `url(${cover})` }} />
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
                onClick={() => avatarInputRef.current?.click()}
                className="relative rounded-full border-4 border-white bg-gray-100 shadow-md"
                aria-label="Change avatar"
              >
                <UserAvatar
                  user={{ name: user.name, avatar: avatarUrl, email: user.email }}
                  size="xl"
                  className="h-24 w-24 text-4xl"
                />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="pb-6 pt-16">
            <div className="flex items-start justify-between gap-4 pl-20 pr-6">
              <div className="w-24 text-center">
                <p className="text-lg font-semibold text-gray-900 truncate">{user.name}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="w-[30vw] min-w-[280px] max-w-[420px]">
          <Button variant="secondary" size="md" className="w-full">
            Manage your account
          </Button>
        </div>

        <section className="w-[30vw] min-w-[280px] max-w-[420px] space-y-4 rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-lg font-semibold text-gray-900">About</h3>

          <div ref={aboutSectionRef} className="space-y-3 text-sm text-gray-700">
            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-gray-500" />
              {activeField === 'job' ? (
                <div className="flex flex-1 items-center gap-2">
                  <TextInput
                    label=""
                    value={fields.job}
                    placeholder="Your job title"
                    onChange={(event) => setFields((prev) => ({ ...prev, job: event.target.value }))}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="sm" onClick={handleSaveActive} aria-label="Save job title">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleCancelActive} aria-label="Cancel job title">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSelectField('job')}
                  className="rounded-md px-2 py-1 text-left hover:bg-gray-50"
                  aria-label="Edit job title"
                >
                  {fields.job || 'Your job title'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Network className="h-4 w-4 text-gray-500" />
              {activeField === 'department' ? (
                <div className="flex flex-1 items-center gap-2">
                  <TextInput
                    label=""
                    value={fields.department}
                    placeholder="Your department"
                    onChange={(event) => setFields((prev) => ({ ...prev, department: event.target.value }))}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="sm" onClick={handleSaveActive} aria-label="Save department">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleCancelActive} aria-label="Cancel department">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSelectField('department')}
                  className="rounded-md px-2 py-1 text-left hover:bg-gray-50"
                  aria-label="Edit department"
                >
                  {fields.department || 'Your department'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-gray-500" />
              {activeField === 'organization' ? (
                <div className="flex flex-1 items-center gap-2">
                  <TextInput
                    label=""
                    value={fields.organization}
                    placeholder="Your organization"
                    onChange={(event) => setFields((prev) => ({ ...prev, organization: event.target.value }))}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="sm" onClick={handleSaveActive} aria-label="Save organization">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleCancelActive} aria-label="Cancel organization">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSelectField('organization')}
                  className="rounded-md px-2 py-1 text-left hover:bg-gray-50"
                  aria-label="Edit organization"
                >
                  {fields.organization || 'Your organization'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-gray-500" />
              {activeField === 'location' ? (
                <div className="flex flex-1 items-center gap-2">
                  <TextInput
                    label=""
                    value={fields.location}
                    placeholder="Your location"
                    onChange={(event) => setFields((prev) => ({ ...prev, location: event.target.value }))}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="sm" onClick={handleSaveActive} aria-label="Save location">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleCancelActive} aria-label="Cancel location">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSelectField('location')}
                  className="rounded-md px-2 py-1 text-left hover:bg-gray-50"
                  aria-label="Edit location"
                >
                  {fields.location || 'Your location'}
                </button>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900">Contact</h4>
            <div className="mt-2 flex items-center gap-3 text-sm text-gray-700">
              <Mail className="h-4 w-4 text-gray-500" />
              <span>{user.email || 'Your email'}</span>
            </div>
          </div>

        </section>
      </Stack>
    </section>
  );
}
