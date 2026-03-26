export type AppRole = 'owner' | 'admin' | 'developer' | 'viewer';

const roleRank: Record<AppRole, number> = {
  viewer: 1,
  developer: 2,
  admin: 3,
  owner: 4,
};

export function hasRole(userRole: AppRole | null | undefined, minRole: AppRole) {
  const role = (userRole || 'viewer') as AppRole;
  return roleRank[role] >= roleRank[minRole];
}

export function canAccessTab(userRole: AppRole | null | undefined, tab: string) {
  const role = (userRole || 'viewer') as AppRole;
  if (tab === 'settings') return hasRole(role, 'admin');
  if (tab === 'servers') return hasRole(role, 'admin');
  if (tab === 'approvals') return hasRole(role, 'admin');
  return true;
}
