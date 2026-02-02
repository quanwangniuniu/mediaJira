import React, { useState, useRef, useEffect } from 'react';
import { Briefcase, Building2, Check, Mail, MapPin, Network, X } from 'lucide-react';
import Button from '@/components/button/Button';
import ProfileHeader from '@/components/stripe_meta/ProfileHeader';
import { TextInput } from '@/components/input/InputPrimitives';

type ProfileFields = {
  job: string;
  department: string;
  organization: string;
  location: string;
};

const mockUser = {
  username: 'johndoe',
  email: 'john.doe@example.com',
  first_name: 'John',
  last_name: 'Doe',
  avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff',
  organization: { id: 1, name: 'Example Organization' },
};

function ProfilePageStory({
  user = mockUser,
  initialFields = {
    job: 'Product Manager',
    department: 'Growth',
    organization: user?.organization?.name ?? 'Example Organization',
    location: 'San Francisco, CA',
  },
}: {
  user?: typeof mockUser;
  initialFields?: ProfileFields;
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeField, setActiveField] = useState<keyof ProfileFields | null>(null);
  const [fields, setFields] = useState<ProfileFields>(initialFields);
  const aboutSectionRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef<ProfileFields>(initialFields);

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
    if (activeField && activeField !== field) saveField(activeField);
    setActiveField(field);
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!activeField) return;
      const target = event.target as Node;
      if (aboutSectionRef.current?.contains(target)) return;
      cancelField(activeField);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [activeField]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="py-8 text-center text-gray-500 text-sm">
            Dashboard content (use real app for full data)
          </div>
        );
      case 'organization':
        return (
          <div className="py-8 text-center text-gray-500 text-sm">
            My Organization content (use real app for full data)
          </div>
        );
      case 'subscription':
        return (
          <div className="py-8 text-center text-gray-500 text-sm">
            Subscription / Plans (use real app for full data)
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="profile-content bg-[url('/bg-gradient.svg')] bg-cover bg-center bg-no-repeat rounded-lg">
        <div className="profile-content-wrapper pt-12">
          <div className="profile-content-inner p-6 bg-white rounded-lg shadow-xl border border-gray-200 max-w-6xl mx-auto">
            <ProfileHeader
              user={{
                username: user?.username,
                email: user?.email,
                avatar: user?.avatar,
                first_name: user?.first_name,
                last_name: user?.last_name,
              }}
              onEditClick={() => {}}
            />

            <div className="mt-6 flex items-start gap-6 w-full">
              <div className="w-[30%] min-w-[280px] max-w-[420px] flex flex-col gap-4 shrink-0">
                <Button variant="secondary" size="md" className="w-full">
                  Manage your account
                </Button>
                <section className="w-full space-y-4 rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="text-lg font-semibold text-gray-900">About</h3>
                  <div ref={aboutSectionRef} className="space-y-3 text-sm text-gray-700">
                    <div className="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-gray-100 transition-colors duration-150">
                      <Briefcase className="h-4 w-4 text-gray-500 shrink-0" />
                      {activeField === 'job' ? (
                        <div className="flex flex-1 items-center gap-2 min-w-0">
                          <TextInput
                            label=""
                            value={fields.job}
                            placeholder="Your job title"
                            onChange={(e) => setFields((prev) => ({ ...prev, job: e.target.value }))}
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
                          className="rounded-md px-2 py-1 text-left flex-1"
                          aria-label="Edit job title"
                        >
                          {fields.job || 'Your job title'}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-gray-100 transition-colors duration-150">
                      <Network className="h-4 w-4 text-gray-500 shrink-0" />
                      {activeField === 'department' ? (
                        <div className="flex flex-1 items-center gap-2 min-w-0">
                          <TextInput
                            label=""
                            value={fields.department}
                            placeholder="Your department"
                            onChange={(e) => setFields((prev) => ({ ...prev, department: e.target.value }))}
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
                          className="rounded-md px-2 py-1 text-left flex-1"
                          aria-label="Edit department"
                        >
                          {fields.department || 'Your department'}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-gray-100 transition-colors duration-150">
                      <Building2 className="h-4 w-4 text-gray-500 shrink-0" />
                      {activeField === 'organization' ? (
                        <div className="flex flex-1 items-center gap-2 min-w-0">
                          <TextInput
                            label=""
                            value={fields.organization}
                            placeholder="Your organization"
                            onChange={(e) => setFields((prev) => ({ ...prev, organization: e.target.value }))}
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
                          className="rounded-md px-2 py-1 text-left flex-1"
                          aria-label="Edit organization"
                        >
                          {fields.organization || 'Your organization'}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-gray-100 transition-colors duration-150">
                      <MapPin className="h-4 w-4 text-gray-500 shrink-0" />
                      {activeField === 'location' ? (
                        <div className="flex flex-1 items-center gap-2 min-w-0">
                          <TextInput
                            label=""
                            value={fields.location}
                            placeholder="Your location"
                            onChange={(e) => setFields((prev) => ({ ...prev, location: e.target.value }))}
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
                          className="rounded-md px-2 py-1 text-left flex-1"
                          aria-label="Edit location"
                        >
                          {fields.location || 'Your location'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Contact</h4>
                    <div className="mt-2 flex items-center gap-3 text-sm text-gray-700 p-2 -mx-2 rounded-md hover:bg-gray-100 transition-colors duration-150">
                      <Mail className="h-4 w-4 text-gray-500 shrink-0" />
                      <span>{user?.email ?? 'Your email'}</span>
                    </div>
                  </div>
                </section>
              </div>

              <div className="flex flex-col gap-6 flex-1 min-w-0">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="border-b border-gray-200 mb-4">
                    <nav className="-mb-px flex gap-6">
                      {[
                        { id: 'dashboard', label: 'Dashboard' },
                        { id: 'organization', label: 'My Organization' },
                        { id: 'subscription', label: 'Subscription' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={`pb-3 text-sm font-medium border-b-2 ${
                            activeTab === tab.id
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </nav>
                  </div>
                  {renderTabContent()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default {
  title: 'Profile/ProfilePage',
  component: ProfilePageStory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Profile page layout: header, About/Contact sidebar, and Dashboard / Organization / Subscription tabs. Uses local state and mock data only (no auth or router hooks).',
      },
    },
  },
  tags: ['autodocs'],
};

export const Default = {
  args: {},
};

export const EmptyFields = {
  args: {
    user: {
      ...mockUser,
      first_name: '',
      last_name: '',
      email: 'user@example.com',
    },
    initialFields: {
      job: 'Your job title',
      department: 'Your department',
      organization: 'Your organization',
      location: 'Your location',
    },
  },
};

export const CustomUser = {
  args: {
    user: {
      username: 'alice',
      email: 'alice@company.com',
      first_name: 'Alice',
      last_name: 'Smith',
      avatar: 'https://ui-avatars.com/api/?name=Alice+Smith&background=6366f1&color=fff',
      organization: { id: 2, name: 'Acme Inc' },
    },
    initialFields: {
      job: 'Engineer',
      department: 'Platform',
      organization: 'Acme Inc',
      location: 'Remote',
    },
  },
};
