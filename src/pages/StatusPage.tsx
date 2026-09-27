import React, { useEffect, useMemo, useState } from 'react';
import { Radio, CheckCircle2, AlertTriangle, XCircle, Terminal } from 'lucide-react';
import { Incident, Server } from '../types';
import { cn, isActiveServer } from '../lib/utils';
import { useAppStore } from '../store';

interface PublicLogEntry {
  id: string;
  source: string;
  level: 'info' | 'warn' | 'error';
  summary: string;
  timestamp: string | null;
}

export const StatusPage = () => {
  const { currentProjectId } = useAppStore();
  const publicProjectId = new URLSearchParams(window.location.search).get('projectId');
  const pathProjectId = window.location.pathname.startsWith('/status/')
    ? decodeURIComponent(window.location.pathname.replace('/status/', '').split('/')[0] || '')
    : '';
  const projectId = publicProjectId || pathProjectId || currentProjectId;
  const [servers, setServers] = useState<Server[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [logs, setLogs] = useState<PublicLogEntry[]>([]);
  const [serviceErrorMessage, setServiceErrorMessage] = useState('');
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const endpoint = projectId
          ? `/api/public-status?projectId=${encodeURIComponent(projectId)}`
          : '/api/public-status';
        const response = await fetch(endpoint, { signal: controller.signal });
        if (!response.ok) throw new Error('Could not load public status.');
        const data = await response.json();
        if (controller.signal.aborted) return;
        setServers(data.servers.map((server: Server) => ({ ...server, publicStatusEnabled: true })));
        setIncidents(data.incidents.map((incident: Incident) => ({ ...incident, publicVisible: true })));
        setLogs(Array.isArray(data.logs) ? data.logs : []);
        setServiceErrorMessage('');
      } catch (error) {
        if (!controller.signal.aborted) setServiceErrorMessage('Could not refresh public status.');
      } finally {
        if (!controller.signal.aborted) {
          setStatusLoading(false);
          timer = setTimeout(refresh, 3000);
        }
      }
    };
    setStatusLoading(true);
    setServers([]);
    setIncidents([]);
    setLogs([]);
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [projectId]);

  const publicServices = servers.filter((server) => server.publicStatusEnabled);
  const activePublicIncidents = incidents.filter((incident) => incident.publicVisible && incident.status !== 'resolved');
  const overall = useMemo(() => {
    if (statusLoading) return 'Loading Public Status';
    if (serviceErrorMessage) return 'Status Unavailable';
    if (publicServices.length === 0) return 'No Public Services Configured';
    if (activePublicIncidents.some((incident) => incident.severity === 'critical') || publicServices.some((server) => server.status === 'offline')) return 'Major Outage';
    if (activePublicIncidents.length || publicServices.some((server) => server.status === 'degraded')) return 'Degraded Performance';
    return 'All Systems Operational';
  }, [activePublicIncidents, publicServices, serviceErrorMessage, statusLoading]);

  const overallTone = overall === 'Major Outage' ? 'text-red-500' : overall === 'Degraded Performance' ? 'text-amber-500' : overall === 'All Systems Operational' ? 'text-emerald-500' : 'text-zinc-500';

  return (
    <div className="min-h-full bg-white dark:bg-zinc-950 p-8 animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-white flex items-center justify-center">
              <Radio className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-xl font-black text-zinc-900 dark:text-white">Nexo Cloud Status</h1>
              <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Public service view</p>
            </div>
          </div>
          <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Login-free ready</span>
        </div>

        <section className="border border-zinc-200 dark:border-white/10 rounded-2xl p-8 bg-zinc-50 dark:bg-zinc-900/50">
          <p className={cn('text-4xl font-black tracking-tight', overallTone)}>{overall}</p>
          <p className="text-zinc-500 dark:text-zinc-400 mt-3">Only admin-selected public names and high-level status are shown here. Internal metrics and host details stay private.</p>
        </section>

        {serviceErrorMessage && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 px-4 py-3 text-sm">{serviceErrorMessage}</div>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-black text-zinc-900 dark:text-white">Services</h2>
          {publicServices.length === 0 ? (
            <div className="border border-dashed border-zinc-200 dark:border-white/10 rounded-2xl p-12 text-center text-zinc-500">No public services configured yet.</div>
          ) : publicServices.map((server) => (
            <div key={server.id} className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl p-4 flex items-center justify-between">
              <span className="font-bold text-zinc-900 dark:text-white">{server.publicName || server.name}</span>
              <ServiceStatus status={server.status} />
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-white">Recent Log Activity</h2>
              <p className="text-xs text-zinc-500 mt-1">Sanitized study excerpts from public services. Sensitive identifiers and values are removed.</p>
            </div>
            <Terminal className="w-5 h-5 text-zinc-400" />
          </div>
          {logs.length === 0 ? (
            <div className="border border-dashed border-zinc-200 dark:border-white/10 rounded-2xl p-10 text-center text-zinc-500">No recent public log activity.</div>
          ) : logs.map((log) => (
            <div key={log.id} className="grid gap-2 md:grid-cols-[8rem_5rem_1fr_auto] items-center bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl p-4 font-mono text-xs">
              <span className="font-bold text-zinc-900 dark:text-white">{log.source}</span>
              <span className={cn('uppercase font-black', log.level === 'error' ? 'text-red-500' : log.level === 'warn' ? 'text-amber-500' : 'text-emerald-500')}>{log.level}</span>
              <span className="text-zinc-600 dark:text-zinc-300 break-words">{log.summary}</span>
              <time className="text-zinc-400 whitespace-nowrap">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Time unavailable'}</time>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-zinc-900 dark:text-white">Incident History</h2>
          {incidents.filter((incident) => incident.publicVisible).length === 0 ? (
            <div className="border border-dashed border-zinc-200 dark:border-white/10 rounded-2xl p-12 text-center text-zinc-500">No public incidents reported.</div>
          ) : incidents.filter((incident) => incident.publicVisible).map((incident) => (
            <div key={incident.id} className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-zinc-900 dark:text-white">{incident.title}</p>
                <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">{incident.status}</span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{incident.summary}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

const ServiceStatus = ({ status }: { status: Server['status'] }) => {
  if (status === 'online') {
    return <span className="text-emerald-500 text-sm font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Operational</span>;
  }
  if (status === 'degraded') {
    return <span className="text-amber-500 text-sm font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Degraded</span>;
  }
  return <span className="text-red-500 text-sm font-bold flex items-center gap-2"><XCircle className="w-4 h-4" />Major Outage</span>;
};
