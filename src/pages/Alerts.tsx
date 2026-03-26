import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter,
  MoreVertical,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { collection, query, onSnapshot, db, handleFirestoreError, OperationType, orderBy, limit, doc, getDoc, setDoc, serverTimestamp } from '../firebase';
import { useAppStore } from '../store';
import { Alert } from '../types';

type IntegrationChannel = {
  id: 'slack' | 'email' | 'pagerduty' | 'webhooks';
  name: string;
  status: 'connected' | 'disconnected';
  source: 'firestore' | 'derived';
  updatedAt?: any;
};

export const Alerts = () => {
  const { currentProjectId } = useAppStore();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [actionMessage, setActionMessage] = useState('');
  const [showRulesPanel, setShowRulesPanel] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [channels, setChannels] = useState<IntegrationChannel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [alertRules, setAlertRules] = useState({
    cpuWarning: 90,
    cpuCritical: 95,
    memoryWarning: 90,
    memoryCritical: 95,
    cooldownMinutes: 15,
    emailEnabled: true,
    pushEnabled: true,
  });

  useEffect(() => {
    if (!currentProjectId) return;

    const alertsQuery = query(
      collection(db, `projects/${currentProjectId}/alerts`),
      orderBy('timestamp', 'desc'),
      limit(200)
    );

    const unsubscribe = onSnapshot(alertsQuery, (snapshot) => {
      const alertList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
      // Sort by timestamp descending
      const sorted = alertList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAlerts(sorted);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${currentProjectId}/alerts`);
    });

    return () => unsubscribe();
  }, [currentProjectId]);

  useEffect(() => {
    if (!currentProjectId) return;
    setChannelsLoading(true);
    const integrationsRef = collection(db, `projects/${currentProjectId}/integrations`);
    const unsubscribe = onSnapshot(integrationsRef, async (snapshot) => {
      if (snapshot.empty) {
        const bootstrap: IntegrationChannel[] = [
          { id: 'slack', name: 'Slack (#ops-alerts)', status: 'disconnected', source: 'derived' },
          { id: 'email', name: 'Email (Team)', status: alertRules.emailEnabled ? 'connected' : 'disconnected', source: 'derived' },
          { id: 'pagerduty', name: 'PagerDuty', status: 'disconnected', source: 'derived' },
          { id: 'webhooks', name: 'Webhooks', status: alertRules.pushEnabled ? 'connected' : 'disconnected', source: 'derived' },
        ];
        setChannels(bootstrap);
        try {
          await Promise.all(
            bootstrap.map((channel) =>
              setDoc(doc(db, `projects/${currentProjectId}/integrations`, channel.id), {
                id: channel.id,
                name: channel.name,
                status: channel.status,
                source: 'bootstrap',
                updatedAt: serverTimestamp(),
              }, { merge: true })
            )
          );
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `projects/${currentProjectId}/integrations`);
        } finally {
          setChannelsLoading(false);
        }
        return;
      }

      const docs = snapshot.docs.map((d) => d.data() as any);
      const byId = new Map(docs.map((d) => [String(d.id || d.name || '').toLowerCase(), d]));
      const liveChannels: IntegrationChannel[] = [
        { id: 'slack', name: 'Slack (#ops-alerts)', status: byId.get('slack')?.status === 'connected' ? 'connected' : 'disconnected', source: 'firestore', updatedAt: byId.get('slack')?.updatedAt },
        { id: 'email', name: 'Email (Team)', status: byId.get('email')?.status === 'connected' ? 'connected' : 'disconnected', source: 'firestore', updatedAt: byId.get('email')?.updatedAt },
        { id: 'pagerduty', name: 'PagerDuty', status: byId.get('pagerduty')?.status === 'connected' ? 'connected' : 'disconnected', source: 'firestore', updatedAt: byId.get('pagerduty')?.updatedAt },
        { id: 'webhooks', name: 'Webhooks', status: byId.get('webhooks')?.status === 'connected' ? 'connected' : 'disconnected', source: 'firestore', updatedAt: byId.get('webhooks')?.updatedAt },
      ];
      setChannels(liveChannels);
      setChannelsLoading(false);
    }, (error) => {
      setChannelsLoading(false);
      handleFirestoreError(error, OperationType.LIST, `projects/${currentProjectId}/integrations`);
    });
    return () => unsubscribe();
  }, [currentProjectId, alertRules.emailEnabled, alertRules.pushEnabled]);

  useEffect(() => {
    if (!currentProjectId) return;
    const loadRules = async () => {
      setRulesLoading(true);
      try {
        const rulesRef = doc(db, `projects/${currentProjectId}/alert_rules`, 'default');
        const snap = await getDoc(rulesRef);
        if (!snap.exists()) return;
        const data = snap.data() as any;
        setAlertRules((prev) => ({
          cpuWarning: Number(data?.cpuWarning ?? prev.cpuWarning),
          cpuCritical: Number(data?.cpuCritical ?? prev.cpuCritical),
          memoryWarning: Number(data?.memoryWarning ?? prev.memoryWarning),
          memoryCritical: Number(data?.memoryCritical ?? prev.memoryCritical),
          cooldownMinutes: Number(data?.cooldownMinutes ?? prev.cooldownMinutes),
          emailEnabled: Boolean(data?.emailEnabled ?? prev.emailEnabled),
          pushEnabled: Boolean(data?.pushEnabled ?? prev.pushEnabled),
        }));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `projects/${currentProjectId}/alert_rules/default`);
      } finally {
        setRulesLoading(false);
      }
    };
    loadRules();
  }, [currentProjectId]);

  const filteredAlerts = alerts.filter(alert => {
    if (activeFilter === 'all') return true;
    return alert.status === activeFilter;
  });

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const infoCount = alerts.filter(a => a.severity === 'info').length;

  const handleConfigureRules = () => {
    setShowRulesPanel((prev) => !prev);
    setActionMessage('');
  };

  const handleIntegrations = () => {
    const connectedCount = channels.filter((c) => c.status === 'connected').length;
    if (connectedCount === 0) {
      setActionMessage('No live notification channels connected. Configure integration documents under this project.');
      return;
    }
    const connectedNames = channels.filter((c) => c.status === 'connected').map((c) => c.name).join(', ');
    setActionMessage(`Live channels connected (${connectedCount}): ${connectedNames}`);
  };

  const handleSaveRules = async () => {
    if (!currentProjectId) return;
    setRulesSaving(true);
    try {
      const payload = {
        ...alertRules,
        cpuWarning: Math.min(Math.max(alertRules.cpuWarning, 1), 100),
        cpuCritical: Math.min(Math.max(alertRules.cpuCritical, 1), 100),
        memoryWarning: Math.min(Math.max(alertRules.memoryWarning, 1), 100),
        memoryCritical: Math.min(Math.max(alertRules.memoryCritical, 1), 100),
        cooldownMinutes: Math.min(Math.max(alertRules.cooldownMinutes, 1), 120),
        updatedAt: serverTimestamp(),
      };
      if (payload.cpuWarning > payload.cpuCritical || payload.memoryWarning > payload.memoryCritical) {
        setActionMessage('Warning threshold must be less than or equal to critical threshold.');
        return;
      }
      await setDoc(doc(db, `projects/${currentProjectId}/alert_rules`, 'default'), payload, { merge: true });
      setActionMessage('Alert rules saved. New alerts will use these thresholds.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `projects/${currentProjectId}/alert_rules/default`);
    } finally {
      setRulesSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Alert Management</h1>
          <p className="text-zinc-500 mt-1">Monitor and respond to system incidents</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleConfigureRules}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 px-4 py-2 rounded-lg text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            Configure Rules
          </button>
          <button
            onClick={handleIntegrations}
            className="bg-emerald-500 text-zinc-950 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-400 transition-colors"
          >
            Integrations
          </button>
        </div>
      </div>
      {actionMessage && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 px-4 py-2 text-sm">
          {actionMessage}
        </div>
      )}
      {showRulesPanel && (
        <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Alert Rules</h3>
            {rulesLoading ? <span className="text-xs text-zinc-500">Loading...</span> : null}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <NumberField label="CPU Warning %" value={alertRules.cpuWarning} onChange={(value) => setAlertRules((prev) => ({ ...prev, cpuWarning: value }))} />
            <NumberField label="CPU Critical %" value={alertRules.cpuCritical} onChange={(value) => setAlertRules((prev) => ({ ...prev, cpuCritical: value }))} />
            <NumberField label="Cooldown (min)" value={alertRules.cooldownMinutes} onChange={(value) => setAlertRules((prev) => ({ ...prev, cooldownMinutes: value }))} />
            <NumberField label="Memory Warning %" value={alertRules.memoryWarning} onChange={(value) => setAlertRules((prev) => ({ ...prev, memoryWarning: value }))} />
            <NumberField label="Memory Critical %" value={alertRules.memoryCritical} onChange={(value) => setAlertRules((prev) => ({ ...prev, memoryCritical: value }))} />
          </div>
          <div className="flex items-center gap-6 pt-1">
            <ToggleField label="Email notifications" checked={alertRules.emailEnabled} onClick={() => setAlertRules((prev) => ({ ...prev, emailEnabled: !prev.emailEnabled }))} />
            <ToggleField label="Push notifications" checked={alertRules.pushEnabled} onClick={() => setAlertRules((prev) => ({ ...prev, pushEnabled: !prev.pushEnabled }))} />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveRules}
              disabled={rulesSaving}
              className="bg-emerald-500 text-zinc-950 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-400 transition-colors disabled:opacity-50"
            >
              {rulesSaving ? 'Saving...' : 'Save Rules'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-4 border-b border-zinc-200 dark:border-white/5 pb-4">
            <FilterTab label="All Alerts" count={alerts.length} active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
            <FilterTab label="Active" count={alerts.filter(a => a.status === 'active').length} active={activeFilter === 'active'} onClick={() => setActiveFilter('active')} />
            <FilterTab label="Resolved" count={alerts.filter(a => a.status === 'resolved').length} active={activeFilter === 'resolved'} onClick={() => setActiveFilter('resolved')} />
          </div>

          <div className="space-y-3">
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert) => (
                <AlertCard key={alert.id} {...alert} />
              ))
            ) : (
              <div className="py-20 text-center border border-dashed border-zinc-200 dark:border-white/5 rounded-2xl">
                <Bell className="w-12 h-12 text-zinc-300 dark:text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-500 text-sm">No alerts found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-xl p-6 shadow-sm dark:shadow-none">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Alert Distribution</h3>
            <div className="space-y-4">
              <SeverityStat label="Critical" count={criticalCount} color="bg-red-500" />
              <SeverityStat label="Warning" count={warningCount} color="bg-amber-500" />
              <SeverityStat label="Info" count={infoCount} color="bg-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-xl p-6 shadow-sm dark:shadow-none">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Notification Channels</h3>
            <div className="space-y-4">
              {channelsLoading ? (
                <p className="text-xs text-zinc-500">Loading channels...</p>
              ) : channels.length === 0 ? (
                <p className="text-xs text-zinc-500">No channel documents found.</p>
              ) : (
                channels.map((channel) => (
                  <ChannelItem key={channel.id} name={channel.name} status={channel.status} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FilterTab = ({ label, count, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
      active ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
    )}
  >
    {label}
    <span className={cn(
      "text-[10px] px-1.5 py-0.5 rounded-md font-bold",
      active ? "bg-emerald-500 text-zinc-950" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
    )}>
      {count}
    </span>
  </button>
);

const AlertCard = ({ severity, message, timestamp, status }: Alert) => (
  <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-xl p-5 hover:border-zinc-300 dark:hover:border-white/10 transition-all group cursor-pointer shadow-sm dark:shadow-none">
    <div className="flex items-start gap-4">
      <div className={cn(
        "p-2 rounded-lg",
        severity === 'critical' ? 'bg-red-500/10 text-red-500' : 
        severity === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
      )}>
        {severity === 'critical' ? <AlertTriangle className="w-5 h-5" /> : 
         severity === 'warning' ? <Bell className="w-5 h-5" /> : <Info className="w-5 h-5" />}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded",
              status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
            )}>
              {status}
            </span>
          </div>
          <span className="text-xs text-zinc-500">{new Date(timestamp).toLocaleString()}</span>
        </div>
        <p className="text-sm text-zinc-700 dark:text-zinc-200 font-medium">{message}</p>
      </div>
      <div className="p-2 text-zinc-500 opacity-0 group-hover:opacity-100">
        <ArrowRight className="w-4 h-4" />
      </div>
    </div>
  </div>
);

const SeverityStat = ({ label, count, color }: any) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className={cn("w-2 h-2 rounded-full", color)} />
      <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
    </div>
    <span className="text-xs font-mono text-zinc-500">{count}</span>
  </div>
);

const ChannelItem = ({ name, status }: any) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-zinc-500 dark:text-zinc-400">{name}</span>
    <div className={cn(
      "w-1.5 h-1.5 rounded-full",
      status === 'connected' ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
    )} />
  </div>
);

const NumberField = ({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) => (
  <label className="space-y-1">
    <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{label}</span>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white"
    />
  </label>
);

const ToggleField = ({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) => (
  <button type="button" onClick={onClick} className="flex items-center gap-2">
    <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
    <div className={cn("w-10 h-5 rounded-full relative transition-colors", checked ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700")}>
      <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all", checked ? "left-5" : "left-0.5")} />
    </div>
  </button>
);
