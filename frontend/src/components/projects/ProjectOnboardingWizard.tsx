'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { ProjectAPI } from '@/lib/api/projectApi';
import { useProjectContext } from '@/hooks/useProjectContext';
import { useAuthStore } from '@/lib/authStore';

interface ProjectOnboardingWizardProps {
  onCompleted: (projectId: number) => void;
}

interface ObjectivesKpisState {
  objectives: string[];
  kpis: Record<
    string,
    {
      target: string;
      suggested_by: string[];
    }
  >;
}

// Constants for dropdown options
const PROJECT_TYPE_OPTIONS = [
  { value: 'paid_social', label: 'Paid Social' },
  { value: 'paid_search', label: 'Paid Search' },
  { value: 'programmatic', label: 'Programmatic' },
  { value: 'influencer_ugc', label: 'Influencer/UGC' },
  { value: 'cross_channel', label: 'Cross Channel' },
  { value: 'performance', label: 'Performance' },
  { value: 'brand_campaigns', label: 'Brand Campaigns' },
  { value: 'app_acquisition', label: 'App Acquisition' },
  { value: 'other', label: 'Other' },
];

const WORK_MODEL_OPTIONS = [
  { value: 'solo_buyer', label: 'Solo Buyer' },
  { value: 'small_team', label: 'Small Team' },
  { value: 'multi_team', label: 'Multi Team' },
  { value: 'external_agency', label: 'External Agency' },
  { value: 'other', label: 'Other' },
];

const OBJECTIVE_OPTIONS = [
  { value: 'awareness', label: 'Awareness' },
  { value: 'consideration', label: 'Consideration' },
  { value: 'conversion', label: 'Conversion' },
  { value: 'retention_loyalty', label: 'Retention & Loyalty' },
];

// Mapping from display names to backend values for advertising platforms
const PLATFORM_DISPLAY_TO_BACKEND: Record<string, string> = {
  'Facebook': 'meta',
  'Instagram': 'meta',
  'Google Ads': 'google_ads',
  'TikTok': 'tiktok',
};

export const ProjectOnboardingWizard: React.FC<ProjectOnboardingWizardProps> = ({
  onCompleted,
}) => {
  const { refreshProjects, setActiveProject, setNeedsOnboarding } =
    useProjectContext();
  const { setHasProject } = useAuthStore();

  const [submitting, setSubmitting] = useState(false);

  const [basics, setBasics] = useState({
    name: '',
    description: '',
  });

  const [typeWorkModel, setTypeWorkModel] = useState({
    project_type: '',
    work_model: '',
    project_type_other: '',
    work_model_other: '',
  });

  const [platforms, setPlatforms] = useState({
    advertising_platforms: [] as string[],
    other_platform: '',
  });

  const [objectivesKpis, setObjectivesKpis] = useState<ObjectivesKpisState>({
    objectives: [],
    kpis: {},
  });

  const [budgetConfig, setBudgetConfig] = useState<any>({
    total_budget: '',
    currency: '',
    pacing: '',
  });

  const [audienceTargeting, setAudienceTargeting] = useState<any>({
    description: '',
  });

  const [team, setTeam] = useState<any>({
    invites: [] as { email: string; role?: string }[],
  });

  const canSubmit = () => {
    const projectTypeValid = typeWorkModel.project_type === 'other'
      ? typeWorkModel.project_type_other.trim().length > 0
      : !!typeWorkModel.project_type;
    const workModelValid = typeWorkModel.work_model === 'other'
      ? typeWorkModel.work_model_other.trim().length > 0
      : !!typeWorkModel.work_model;
    
    // Check that at least one KPI has a non-empty target
    const hasAtLeastOneKpiWithTarget = Object.values(objectivesKpis.kpis).some(
      (kpi) => kpi.target && kpi.target.trim().length > 0
    );
    
    return (
      basics.name.trim().length > 0 &&
      projectTypeValid &&
      workModelValid &&
      objectivesKpis.objectives.length > 0 &&
      Object.keys(objectivesKpis.kpis).length > 0 &&
      hasAtLeastOneKpiWithTarget
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Map display platform names to backend values
      const mappedPlatforms = platforms.advertising_platforms.map(
        (platform) => PLATFORM_DISPLAY_TO_BACKEND[platform] || platform
      );
      
      // Convert KPIs: handle empty targets (convert to null) and suggested_by format
      // Also convert numeric string targets to numbers
      const formattedKpis: Record<string, { target: number | null; suggested_by: string[] }> = {};
      Object.entries(objectivesKpis.kpis).forEach(([key, value]) => {
        // Convert empty string targets to null, numeric strings to numbers
        let targetValue: number | null = null;
        if (value.target && value.target.trim().length > 0) {
          const trimmed = value.target.trim();
          const numValue = parseFloat(trimmed);
          if (!isNaN(numValue)) {
            targetValue = numValue;
          }
        }
        
        formattedKpis[key] = {
          target: targetValue,
          suggested_by: typeof value.suggested_by === 'string' 
            ? [value.suggested_by] 
            : value.suggested_by || [],
        };
      });

      const payload = {
        name: basics.name,
        description: basics.description,
        project_type: typeWorkModel.project_type === 'other' 
          ? [typeWorkModel.project_type_other] 
          : typeWorkModel.project_type ? [typeWorkModel.project_type] : [],
        work_model: typeWorkModel.work_model === 'other'
          ? [typeWorkModel.work_model_other]
          : typeWorkModel.work_model ? [typeWorkModel.work_model] : [],
        advertising_platforms: mappedPlatforms,
        ...(platforms.other_platform && { advertising_platforms_other: platforms.other_platform }),
        objectives: objectivesKpis.objectives,
        kpis: formattedKpis,
        budget_config: budgetConfig,
        audience_targeting: audienceTargeting,
        // Convert team.invites to invite_members format expected by backend
        invite_members: team.invites
          .filter((invite: { email: string }) => invite.email && invite.email.trim().length > 0)
          .map((invite: { email: string; role?: string }) => ({
            email: invite.email.trim(),
            role: invite.role || 'member',
          })),
      };

      const project = await ProjectAPI.onboardProject(payload);

      toast.success('Project created successfully');
      setNeedsOnboarding(false);
      setActiveProject(project); // This also sets activeProjectId
      setHasProject(true);
      // Refresh projects to get updated count
      await refreshProjects();
      onCompleted(project.id);
    } catch (error: any) {
      console.error('Failed to submit onboarding', error);
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        'Failed to complete onboarding';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKpiSuggestions = async () => {
    try {
      if (!objectivesKpis.objectives.length) {
        toast.error('Please select at least one objective');
        return;
      }
      
      console.log('Fetching KPI suggestions for objectives:', objectivesKpis.objectives);
      
      // Only send project_type and work_model if they're not empty and not 'other'
      const params: {
        objectives: string[];
        project_type?: string;
        work_model?: string;
      } = {
        objectives: objectivesKpis.objectives,
      };
      
      if (typeWorkModel.project_type && typeWorkModel.project_type !== 'other') {
        params.project_type = typeWorkModel.project_type;
      }
      
      if (typeWorkModel.work_model && typeWorkModel.work_model !== 'other') {
        params.work_model = typeWorkModel.work_model;
      }
      
      const response = await ProjectAPI.getKpiSuggestions(params);
      
      console.log('KPI suggestions response:', response);
      
      // API returns { suggested_kpis: [...], objectives: [...], count: number }
      const suggestedKpis = response?.suggested_kpis || [];
      
      if (suggestedKpis.length === 0) {
        toast('No KPI suggestions available for the selected objectives', {
          icon: 'ℹ️',
        });
        return;
      }
      
      const newKpis: ObjectivesKpisState['kpis'] = { ...objectivesKpis.kpis };
      suggestedKpis.forEach((kpi: any) => {
        if (!newKpis[kpi.key]) {
          newKpis[kpi.key] = {
            target: '',
            suggested_by: ['system'],
          };
        }
      });
      
      setObjectivesKpis((prev) => ({
        ...prev,
        kpis: newKpis,
      }));
      
      toast.success(`Added ${suggestedKpis.length} KPI suggestion(s)`);
    } catch (error: any) {
      console.error('Failed to load KPI suggestions', error);
      console.error('Error details:', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message,
        url: error?.config?.url,
        params: error?.config?.params,
        fullError: error,
      });
      
      let message = 'Failed to load KPI suggestions';
      if (error?.response?.status === 404) {
        // Check if response is HTML (Django 404 page) or JSON
        const isHtml404 = typeof error?.response?.data === 'string' && error.response.data.includes('<title>');
        if (isHtml404) {
          message = 'Backend endpoint not found. Please ensure:\n1. Backend server is running on port 8000\n2. The endpoint /api/core/kpi-suggestions/ exists\n3. Check browser console for details';
        } else {
          message = error?.response?.data?.error || 'KPI suggestions endpoint not found';
        }
      } else if (error?.response?.status === 401) {
        message = 'Authentication required. Please log in again.';
      } else if (error?.response?.status === 400) {
        message = error?.response?.data?.error || error?.response?.data?.detail || 'Invalid request parameters';
      } else if (error?.response?.data?.error) {
        message = error.response.data.error;
      } else if (error?.response?.data?.detail) {
        message = error.response.data.detail;
      } else if (error?.message) {
        message = error.message;
      } else if (!error?.response) {
        message = 'Network error. Please check:\n1. Backend server is running (http://localhost:8000)\n2. Your internet connection\n3. Check browser console for details';
      }
      
      toast.error(message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-h-[calc(100vh-200px)] overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Project Onboarding
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Fill in your project details so tasks and workflows are correctly scoped.
        </p>
      </div>

      <div className="space-y-8">
        {/* Section 1: Project Basics */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            1. Project Basics
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project name *
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={basics.name}
              onChange={(e) =>
                setBasics((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={basics.description}
              onChange={(e) =>
                setBasics((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
          </div>
        </div>

        {/* Section 2: Project Type & Work Model */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            2. Project Type &amp; Work Model
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project type *
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={typeWorkModel.project_type}
              onChange={(e) =>
                setTypeWorkModel((prev) => ({
                  ...prev,
                  project_type: e.target.value,
                  project_type_other: e.target.value === 'other' ? prev.project_type_other : '',
                }))
              }
            >
              <option value="">Select project type</option>
              {PROJECT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {typeWorkModel.project_type === 'other' && (
              <input
                type="text"
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Please specify"
                value={typeWorkModel.project_type_other}
                onChange={(e) =>
                  setTypeWorkModel((prev) => ({
                    ...prev,
                    project_type_other: e.target.value,
                  }))
                }
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Work model *
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={typeWorkModel.work_model}
              onChange={(e) =>
                setTypeWorkModel((prev) => ({
                  ...prev,
                  work_model: e.target.value,
                  work_model_other: e.target.value === 'other' ? prev.work_model_other : '',
                }))
              }
            >
              <option value="">Select work model</option>
              {WORK_MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {typeWorkModel.work_model === 'other' && (
              <input
                type="text"
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Please specify"
                value={typeWorkModel.work_model_other}
                onChange={(e) =>
                  setTypeWorkModel((prev) => ({
                    ...prev,
                    work_model_other: e.target.value,
                  }))
                }
              />
            )}
          </div>
        </div>

        {/* Section 3: Advertising Platforms */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            3. Advertising Platforms
          </h2>
          <p className="text-sm text-gray-500">
            Select the platforms this project will run on.
          </p>
          <div className="flex flex-wrap gap-2">
            {['Facebook', 'Instagram', 'Google Ads', 'TikTok'].map(
              (platform) => {
                const selected =
                  platforms.advertising_platforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => {
                      setPlatforms((prev) => {
                        const exists =
                          prev.advertising_platforms.includes(platform);
                        return {
                          ...prev,
                          advertising_platforms: exists
                            ? prev.advertising_platforms.filter(
                                (p) => p !== platform
                              )
                            : [...prev.advertising_platforms, platform],
                        };
                      });
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm border ${
                      selected
                        ? 'bg-blue-50 text-blue-700 border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    {platform}
                  </button>
                );
              }
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Other platform
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={platforms.other_platform}
              onChange={(e) =>
                setPlatforms((prev) => ({
                  ...prev,
                  other_platform: e.target.value,
                }))
              }
            />
          </div>
        </div>

        {/* Section 4: Objectives & KPIs */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            4. Objectives &amp; KPIs
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objectives *
            </label>
            <div className="flex flex-wrap gap-2">
              {OBJECTIVE_OPTIONS.map((option) => {
                const selected = objectivesKpis.objectives.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setObjectivesKpis((prev) => {
                        const exists = prev.objectives.includes(option.value);
                        return {
                          ...prev,
                          objectives: exists
                            ? prev.objectives.filter((o) => o !== option.value)
                            : [...prev.objectives, option.value],
                        };
                      });
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm border ${
                      selected
                        ? 'bg-blue-50 text-blue-700 border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={handleKpiSuggestions}
            disabled={objectivesKpis.objectives.length === 0}
            className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Suggest KPIs
          </button>

          <div className="mt-4 space-y-3">
            {Object.entries(objectivesKpis.kpis).map(
              ([key, value]) => (
                <div
                  key={key}
                  className="flex items-center gap-3"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800">
                      {key}
                    </div>
                    <div className="text-xs text-gray-500">
                      Suggested by {Array.isArray(value.suggested_by) 
                        ? value.suggested_by.join(', ') 
                        : value.suggested_by}
                    </div>
                  </div>
                  <input
                    type="text"
                    className="w-32 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Target"
                    value={value.target}
                    onChange={(e) =>
                      setObjectivesKpis((prev) => ({
                        ...prev,
                        kpis: {
                          ...prev.kpis,
                          [key]: {
                            ...value,
                            target: e.target.value,
                          },
                        },
                      }))
                    }
                  />
                </div>
              )
            )}
          </div>
        </div>

        {/* Section 5: Budget & Pacing */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            5. Budget &amp; Pacing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total budget
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={budgetConfig.total_budget}
                onChange={(e) =>
                  setBudgetConfig((prev: any) => ({
                    ...prev,
                    total_budget: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={budgetConfig.currency}
                onChange={(e) =>
                  setBudgetConfig((prev: any) => ({
                    ...prev,
                    currency: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pacing
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={budgetConfig.pacing}
                onChange={(e) =>
                  setBudgetConfig((prev: any) => ({
                    ...prev,
                    pacing: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </div>

        {/* Section 6: Audience & Targeting */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            6. Audience &amp; Targeting
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Audience description (optional)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={audienceTargeting.description}
              onChange={(e) =>
                setAudienceTargeting((prev: any) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
          </div>
        </div>

        {/* Section 7: Team & Collaboration */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            7. Team &amp; Collaboration
          </h2>
          <p className="text-sm text-gray-500">
            Invite collaborators to this project (optional).
          </p>
          <div className="space-y-3">
            {team.invites.map(
              (invite: { email: string; role?: string }, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-3"
                >
                  <input
                    type="email"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@example.com"
                    value={invite.email}
                    onChange={(e) => {
                      const next = [...team.invites];
                      next[index] = {
                        ...invite,
                        email: e.target.value,
                      };
                      setTeam((prev: any) => ({
                        ...prev,
                        invites: next,
                      }));
                    }}
                  />
                  <input
                    type="text"
                    className="w-32 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Role"
                    value={invite.role || ''}
                    onChange={(e) => {
                      const next = [...team.invites];
                      next[index] = {
                        ...invite,
                        role: e.target.value,
                      };
                      setTeam((prev: any) => ({
                        ...prev,
                        invites: next,
                      }));
                    }}
                  />
                </div>
              )
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              setTeam((prev: any) => ({
                ...prev,
                invites: [...prev.invites, { email: '', role: '' }],
              }))
            }
            className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
          >
            Add invite
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <div className="mt-8 flex justify-end">
        <button
          type="button"
          className="px-6 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
          onClick={handleSubmit}
          disabled={!canSubmit() || submitting}
        >
          {submitting ? 'Submitting...' : 'Complete onboarding'}
        </button>
      </div>
    </div>
  );
};

export default ProjectOnboardingWizard;


