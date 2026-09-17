import React, { useEffect, useMemo, useState } from 'react';
import { FileBarChart, Download } from 'lucide-react';
import { collection, db, onSnapshot, query, where } from '../firebase';
import { Alert, Incident, RiskInsight, Server } from '../types';
import { useAppStore } from '../store';

export const Reports = () => {
  const { currentProjectId } = useAppStore();
  const [servers, setServers] = useState<Server[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [risks, setRisks] = useState<RiskInsight[]>([]);
  const [range, setRange] = useState('30');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!currentProjectId) return;
    const onError = (label: string) => (error: unknown) => {
      console.error(`Reports ${label} listener failed`, error);
      setErrorMessage('Some report data could not be loaded for this account.');
    };
    const unsubServers = onSnapshot(query(collection(db, 'servers'), where('projectId', '==', currentProjectId)), (snapshot) => {
      setServers(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Server)));
      setErrorMessage('');
    }, onError('servers'));
    const unsubAlerts = onSnapshot(collection(db, `projects/${currentProjectId}/alerts`), (snapshot) => setAlerts(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Alert))), onError('alerts'));
    const unsubIncidents = onSnapshot(collection(db, `projects/${currentProjectId}/incidents`), (snapshot) => setIncidents(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Incident))), onError('incidents'));
    const unsubRisks = onSnapshot(collection(db, `projects/${currentProjectId}/risk_insights`), (snapshot) => setRisks(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as RiskInsight))), onError('risks'));
    return () => { unsubServers(); unsubAlerts(); unsubIncidents(); unsubRisks(); };
  }, [currentProjectId]);

  const report = useMemo(() => {
    const online = servers.filter((server) => server.status === 'online').length;
    const degraded = servers.filter((server) => server.status === 'degraded').length;
    const offline = servers.filter((server) => server.status === 'offline').length;
    const criticalAlerts = alerts.filter((alert) => alert.severity === 'critical').length;
    const openIncidents = incidents.filter((incident) => incident.status !== 'resolved').length;
    const openRisks = risks.filter((risk) => risk.status !== 'dismissed').length;
    const estimatedMonthlyCost = servers.length * 45;
    return { online, degraded, offline, criticalAlerts, openIncidents, openRisks, estimatedMonthlyCost };
  }, [servers, alerts, incidents, risks]);

  const exportCsv = () => {
    const csv = [
      ['Metric', 'Value'],
      ['Range Days', range],
      ['Servers', servers.length],
      ['Online', report.online],
      ['Degraded', report.degraded],
      ['Offline', report.offline],
      ['Critical Alerts', report.criticalAlerts],
      ['Open Incidents', report.openIncidents],
      ['Open Risks', report.openRisks],
      ['Estimated Monthly Cost', report.estimatedMonthlyCost],
    ].map((row) => row.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexo-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 space-y-8 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-[0.2em]"><FileBarChart className="w-4 h-4" />Reports</div>
          <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white mt-2">Operational Reports</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">Generate summaries for infrastructure health, alerts, incidents, risks, and estimated costs.</p>
        </div>
        <div className="flex gap-3">
          <select value={range} onChange={(event) => setRange(event.target.value)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button onClick={exportCsv} className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 px-5 py-3 rounded-xl font-black flex items-center gap-2"><Download className="w-4 h-4" />CSV</button>
        </div>
      </div>
      {errorMessage && <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 px-4 py-3 text-sm">{errorMessage}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReportCard label="Servers" value={servers.length} />
        <ReportCard label="Critical Alerts" value={report.criticalAlerts} />
        <ReportCard label="Open Incidents" value={report.openIncidents} />
        <ReportCard label="Open Risks" value={report.openRisks} />
        <ReportCard label="Estimated Monthly Cost" value={`$${report.estimatedMonthlyCost.toLocaleString()}`} />
        <ReportCard label="Average Uptime" value={servers.length ? `${Math.round((report.online / servers.length) * 100)}%` : '0%'} />
      </div>
      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 space-y-3">
        <h2 className="font-black text-zinc-900 dark:text-white">Summary</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          During the selected {range}-day range, Nexo Cloud observed {servers.length} servers, {alerts.length} alerts,
          {incidents.length} incidents, and {risks.length} risk insights. Cost figures are estimated because no cloud billing API is connected.
        </p>
      </div>
    </div>
  );
};

const ReportCard = ({ label, value }: { label: string; value: string | number }) => (
  <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-6">
    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{label}</p>
    <p className="text-4xl font-black text-zinc-900 dark:text-white mt-2">{value}</p>
  </div>
);
