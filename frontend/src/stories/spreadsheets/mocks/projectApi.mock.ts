/**
 * Storybook mock for project API. Returns mock project data.
 */
import type { ProjectData } from '@/lib/api/projectApi';

export type { ProjectData };

const mockProjects: ProjectData[] = [
  {
    id: 1,
    name: 'Project Alpha',
    organization: { id: 1, name: 'Org A' },
  } as ProjectData,
  {
    id: 2,
    name: 'Project Beta',
    organization: { id: 1, name: 'Org A' },
  } as ProjectData,
];

export const ProjectAPI = {
  getProjects: async (): Promise<ProjectData[]> => Promise.resolve(mockProjects),
  getProject: async (id: number): Promise<ProjectData> =>
    Promise.resolve(mockProjects.find((p) => p.id === id) || mockProjects[0]),
};
