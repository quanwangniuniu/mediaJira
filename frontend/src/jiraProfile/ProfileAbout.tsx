'use client';

import { Briefcase, Building2, Mail, MapPin, Network } from 'lucide-react';
import ProfileAboutField from '@/jiraProfile/ProfileAboutField';

type ProfileAboutProps = Readonly<{
  job: string;
  department: string;
  organization: string;
  location: string;
  email: string;
  onSaveJob: (value: string) => Promise<void> | void;
  onSaveDepartment: (value: string) => Promise<void> | void;
  onSaveOrganization: (value: string) => Promise<void> | void;
  onSaveLocation: (value: string) => Promise<void> | void;
  onSaveEmail: (value: string) => Promise<void> | void;
  title?: string;
  contact?: string;
  className?: string;
}>;

export default function ProfileAbout({
  job,
  department,
  organization,
  location,
  email,
  onSaveJob,
  onSaveDepartment,
  onSaveOrganization,
  onSaveLocation,
  onSaveEmail,
  title = 'About',
  contact = 'Contact',
  className,
}: ProfileAboutProps) {
  return (
    <section className={className}>
      {title ? <h3 className="mb-3 text-lg font-semibold text-gray-900">{title}</h3> : null}
      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <ProfileAboutField
          icon={<Briefcase className="h-4 w-4" />}
          value={job}
          onSave={onSaveJob}
          placeholder="Your job title"
        />
        <ProfileAboutField
          icon={<Network className="h-4 w-4" />}
          value={department}
          onSave={onSaveDepartment}
          placeholder="Your department"
        />
        <ProfileAboutField
          icon={<Building2 className="h-4 w-4" />}
          value={organization}
          onSave={onSaveOrganization}
          placeholder="Your organization"
        />
        <ProfileAboutField
          icon={<MapPin className="h-4 w-4" />}
          value={location}
          onSave={onSaveLocation}
          placeholder="Your location"
        />
        {contact ? <h3 className="mb-3 text-sm font-semibold text-gray-900">{contact}</h3> : null}
        <section className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center text-gray-500">
            <Mail className="h-4 w-4" />
          </div>
          <div className="flex-1 max-w-[280px]">
            <p className="py-1.5 text-sm text-gray-900 truncate">{email || 'Your email'}</p>
          </div>
        </section>
      </div>
    </section>
  );
}
