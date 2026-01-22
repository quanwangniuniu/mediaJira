'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import ProfileHeader from '@/jiraProfile/ProfileHeader';
import ProfileAbout from '@/jiraProfile/ProfileAbout';
import AccountButton from '@/jiraProfile/AccountButton';
import Stack from '@/components/layout/primitives/Stack';
import Inline from '@/components/layout/primitives/Inline';

type ProfilePageProps = Readonly<{
  user?: {
    username?: string;
    email?: string;
    avatar?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
  className?: string;
}>;

export default function ProfilePage({ user, className }: ProfilePageProps) {
  const [job, setJob] = useState('');
  const [department, setDepartment] = useState('');
  const [organization, setOrganization] = useState('');
  const [location, setLocation] = useState('');
  const email = user?.email ?? '';
  const displayName =
    user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username || 'User';

  return (
    <section className={cn('w-full', className)}>
      <Stack spacing="lg" className="px-6 pt-4">
        <Inline justify="end">
          <button
            type="button"
            aria-label="Settings"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <Settings className="h-4 w-4" />
          </button>
        </Inline>

        <div className="mx-auto w-full max-w-5xl">
          <ProfileHeader avatarUrl={user?.avatar} displayName={displayName} />
        </div>

        <div className="w-[30vw] min-w-[280px] max-w-[420px]">
          <AccountButton />
        </div>

        <Inline align="start" className="w-full">
          <div className="w-[30vw] min-w-[280px] max-w-[420px]">
            <ProfileAbout
              job={job}
              department={department}
              organization={organization}
              location={location}
              email={email}
              onSaveJob={async (next) => setJob(next)}
              onSaveDepartment={async (next) => setDepartment(next)}
              onSaveOrganization={async (next) => setOrganization(next)}
              onSaveLocation={async (next) => setLocation(next)}
              onSaveEmail={async () => {}}
            />
          </div>
          <div className="flex-1" />
        </Inline>
      </Stack>
    </section>
  );
}
