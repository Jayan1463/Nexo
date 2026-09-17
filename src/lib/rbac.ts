export type AppRole = 'owner' | 'admin' | 'developer' | 'viewer';

const roleRank: Record<AppRole, number> = {
  viewer: 1,
  developer: 2,
  admin: 3,
  owner: 4,
};

const tabMinimumRole: Record<string, AppRole> = {
  dashboard: 'viewer',
  servers: 'viewer',
  analytics: 'viewer',
  logs: 'viewer',
  alerts: 'developer',
  incidents: 'developer',
  cost: 'viewer',
  risk: 'viewer',
  status: 'viewer',
  reports: 'viewer',
  help: 'viewer',
  team: 'admin',
  apiKeys: 'admin',
  audit: 'admin',
  settings: 'admin',
};

export function hasRole(userRole: AppRole | null | undefined, minRole: AppRole) {
  const role = (userRole || 'viewer') as AppRole;
  return roleRank[role] >= roleRank[minRole];
}

export function canAccessTab(userRole: AppRole | null | undefined, tab: string) {
  const minimumRole = tabMinimumRole[tab] || 'viewer';
  return hasRole(userRole, minimumRole);
}
