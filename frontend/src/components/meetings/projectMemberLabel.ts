import type { ProjectMemberData, ProjectMemberUser } from '@/lib/api/projectApi';

/** Lowercase string for client-side filtering. */
export function projectMemberSearchBlob(m: ProjectMemberData): string {
  const u = m.user;
  return [u.name, u.email, u.username, String(u.id), m.role]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function formatProjectMemberUserLabel(u: ProjectMemberUser): string {
  const primary = u.name?.trim() || u.username?.trim() || u.email?.trim() || `User ${u.id}`;
  if (u.email && u.email !== primary) {
    return `${primary} · ${u.email}`;
  }
  if (u.username && u.username !== primary && u.username !== u.email) {
    return `${primary} · @${u.username}`;
  }
  return `${primary} (id ${u.id})`;
}

export function formatProjectMemberLabel(m: ProjectMemberData): string {
  return formatProjectMemberUserLabel(m.user);
}
