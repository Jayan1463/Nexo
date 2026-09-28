import type { AppRole } from './rbac';

export const ROLE_OPTIONS: Array<{ value: Exclude<AppRole, 'owner'>; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'developer', label: 'Developer' },
  { value: 'viewer', label: 'Auditor' },
];

export function roleLabel(role: string | null | undefined) {
  if (role === 'owner') return 'Owner';
  return ROLE_OPTIONS.find((option) => option.value === role)?.label || 'Auditor';
}

export function roleBadgeLabel(role: string | null | undefined) {
  return roleLabel(role).toUpperCase();
}
