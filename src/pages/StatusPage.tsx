import React, { useEffect, useMemo, useState } from 'react';
import { Radio, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { collection, db, onSnapshot, orderBy, query, where, limit } from '../firebase';
import { Incident, Server } from '../types';
import { cn, isActiveServer } from '../lib/utils';
import { useAppStore } from '../store';

export const StatusPage = () => {
  const { currentProjectId } = useAppStore();
  const publicProjectId = new URLSearchParams(window.location.search).get('projectId');
  const pathProjectId = window.location.pathname.startsWith('/status/')
    ? decodeURIComponent(window.location.pathname.replace('/status/', '').split('/')[0] || '')
    : '';
  const projectId = publicProjectId || pathProjectId || currentProjectId;
  const [servers, setServers] = useState<Server[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [serviceErrorMessage, setServiceErrorMessage] = useState('');

  useEffect(() => {
    if (!projectId) return;
    const serverQuery = query(collection(db, 'servers'), where('projectId', '==', projectId), where('publicStatusEnabled', '==', true));
    const unsubServers = onSnapshot(serverQuery, (snapshot) => {
      setServers(snapshot.docs.map((serverDoc) => ({ id: serverDoc.id, ...serverDoc.data() } as Server)).filter(isActiveServer));
      setServiceErrorMessage('');
    }, (error) => {
      console.error('Failed to load public services', error);
      setServers([]);
      setServiceErrorMessage('Could not load public services. Check Firestore rules for status visibility.');
    });
    const incidentQuery = query(collection(db, `projects/${projectId}/incidents`), where('publicVisible', '==', true), orderBy('createdAt', 'desc'), limit(30));
    const unsubIncidents = onSnapshot(incidentQuery, (snapshot) => {
      setIncidents(snapshot.docs.map((incidentDoc) => ({ id: incidentDoc.id, ...incidentDoc.data() } as Incident)));
    }, (error) => {
      console.error('Failed to load public incidents', error);
      setIncidents([]);
    });
    return () => {
      unsubServers();
      unsubIncidents();
    };
  }, [projectId]);

  const publicServices = servers.filter((server) => server.publicStatusEnabled);
  const activePublicIncidents = incidents.filter((incident) => incident.publicVisible && incident.status !== 'resolved');
  const overall = useMemo(() => {
    if (activePublicIncidents.some((incident) => incident.severity === 'critical') || publicServices.some((server) => server.status === 'offline')) return 'Major Outage';
    if (activePublicIncidents.length || publicServices.some((server) => server.status === 'degraded')) return 'Degraded Performance';
    return 'All Systems Operational';
  }, [activePublicIncidents, publicServices]);

  const overallTone = overall === 'Major Outage' ? 'text-red-500' : overall === 'Degraded Performance' ? 'text-amber-500' : 'text-emerald-500';

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
