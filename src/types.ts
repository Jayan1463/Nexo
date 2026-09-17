export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  currentOrgId?: string;
  role: 'owner' | 'admin' | 'developer' | 'viewer';
  createdAt: any;
}

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: any;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  environment: 'prod' | 'staging' | 'dev';
  createdAt: any;
}

export interface Metric {
  id?: string;
  projectId: string;
  resourceId: string;
  type: 'cpu' | 'memory' | 'network' | 'disk';
  value: number;
  timestamp: any;
  isAnomaly?: boolean;
  anomalyScore?: number;
}

export interface Alert {
  id?: string;
  projectId: string;
  serverId?: string;
  alertType?: 'cpu' | 'memory' | 'disk' | 'network' | 'availability' | 'security';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  status: 'active' | 'acknowledged' | 'resolved';
  timestamp: any;
  acknowledgedBy?: string;
  acknowledgedAt?: any;
  resolvedBy?: string;
  resolvedAt?: any;
}

export interface LogEntry {
  id?: string;
  projectId: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  service: string;
  timestamp: any;
}

export interface OrgMember {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'owner' | 'admin' | 'developer' | 'viewer';
  joinedAt: any;
}
export interface Invite {
  id?: string;
  orgId: string;
  email: string;
  role: 'admin' | 'developer' | 'viewer';
  status: 'pending' | 'accepted' | 'declined';
  invitedBy: string;
  createdAt: any;
}

export interface Server {
  id: string;
  projectId: string;
  name: string;
  apiKey?: string;
  apiKeyHash?: string;
  apiKeyStatus?: 'active' | 'revoked';
  lastSeen?: any;
  status: 'online' | 'degraded' | 'offline';
  createdAt: any;
  tags?: Record<string, string>;
  environment?: 'prod' | 'staging' | 'dev';
  publicStatusEnabled?: boolean;
  publicName?: string;
}

export interface ServerMetric {
  id: string;
  serverId: string;
  projectId: string;
  cpu: number;
  memory: number;
  network: number;
  disk?: number;
  uptime?: number;
  processes?: Array<{ pid?: number; name: string; cpu?: number; memory?: number }>;
  ports?: Array<number | string>;
  services?: Array<{ name: string; status: string }>;
  timestamp: any;
}

export interface Incident {
  id?: string;
  projectId: string;
  serverId?: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'info' | 'warning' | 'critical';
  summary: string;
  publicVisible?: boolean;
  timeline: Array<{
    status: string;
    message: string;
    userId?: string;
    timestamp: any;
  }>;
  createdAt: any;
  updatedAt?: any;
  resolvedAt?: any;
}

export interface RiskInsight {
  id?: string;
  serverId: string;
  projectId?: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  status: 'open' | 'under_review' | 'dismissed';
  score?: number;
  createdAt: any;
  updatedAt?: any;
}
