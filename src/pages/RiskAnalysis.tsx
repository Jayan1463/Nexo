import React, { useEffect, useMemo, useState } from 'react';
import { ShieldAlert, TrendingUp, EyeOff, ClipboardCheck } from 'lucide-react';
import { collection, db, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where, limit } from '../firebase';
import { RiskInsight, Server, ServerMetric } from '../types';
import { cn, isActiveServer } from '../lib/utils';
import { useAppStore } from '../store';

export const RiskAnalysis = () => {
  const { currentProjectId } = useAppStore();
  const [servers, setServers] = useState<Server[]>([]);
  const [insights, setInsights] = useState<RiskInsight[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!currentProjectId) return;
    const serverQuery = query(collection(db, 'servers'), where('projectId', '==', currentProjectId));
    return onSnapshot(serverQuery, (snapshot) => {
      setServers(snapshot.docs.map((serverDoc) => ({ id: serverDoc.id, ...serverDoc.data() } as Server)).filter(isActiveServer));
      setErrorMessage('');
    }, (error) => {
      console.error('Failed to load risk servers', error);
      setServers([]);
      setErrorMessage('Could not load servers for risk analysis. Check project access and Firestore rules.');
    });
  }, [currentProjectId]);

  useEffect(() => {
    if (!currentProjectId) return;
    const insightQuery = query(collection(db, `projects/${currentProjectId}/risk_insights`), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(insightQuery, (snapshot) => {
      setInsights(snapshot.docs.map((insightDoc) => ({ id: insightDoc.id, ...insightDoc.data() } as RiskInsight)));
    }, (error) => {
      console.error('Failed to load risk insights', error);
      setInsights([]);
      setErrorMessage('Could not load risk insights. Check project access and Firestore rules.');
    });
  }, [currentProjectId]);

  useEffect(() => {
    if (!currentProjectId || servers.length === 0) return;
    const unsubscribers = servers.map((server) => {
      const metricsQuery = query(collection(db, `servers/${server.id}/metrics`), orderBy('timestamp', 'desc'), limit(12));
      return onSnapshot(metricsQuery, async (snapshot) => {
        try {
          const metrics = snapshot.docs.map((metricDoc) => metricDoc.data() as ServerMetric);
          if (metrics.length < 2) return;
          const latest = metrics[0];
          const previous = metrics.slice(1);
          const previousMemory = previous.reduce((sum, metric) => sum + Number(metric.memory || 0), 0) / previous.length;
          const previousDisk = previous.reduce((sum, metric) => sum + Number(metric.disk || 0), 0) / previous.length;
          const candidates: Array<Omit<RiskInsight, 'id' | 'createdAt'>> = [];
          if (Number(latest.memory || 0) >= previousMemory + 10 && Number(latest.memory || 0) > 75) {
            candidates.push({ serverId: server.id, projectId: currentProjectId, type: 'memory_trend', severity: Number(latest.memory) > 90 ? 'critical' : 'warning', message: `${server.name} memory is trending upward toward capacity.`, status: 'open', score: Number(latest.memory) });
          }
          if (Number(latest.disk || 0) >= previousDisk + 8 && Number(latest.disk || 0) > 80) {
            candidates.push({ serverId: server.id, projectId: currentProjectId, type: 'disk_pressure', severity: Number(latest.disk) > 92 ? 'critical' : 'warning', message: `${server.name} disk usage is increasing and may require cleanup or expansion.`, status: 'open', score: Number(latest.disk) });
          }
          if (Array.isArray(latest.ports) && latest.ports.length > 20) {
            candidates.push({ serverId: server.id, projectId: currentProjectId, type: 'open_ports', severity: 'warning', message: `${server.name} reported an unusually large open-port surface.`, status: 'open', score: latest.ports.length });
          }
          await Promise.all(candidates.map((candidate) => {
            const stableId = `${candidate.serverId}_${candidate.type}`;
            return setDoc(doc(db, `projects/${currentProjectId}/risk_insights`, stableId), {
              id: stableId,
              ...candidate,
              updatedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
            }, { merge: true });
          }));
          setErrorMessage('');
        } catch (error) {
          console.error('Failed to update risk insights', error);
          setErrorMessage('Risk analysis could not update derived insights. Check write permissions.');
        }
      }, (error) => {
        console.error('Failed to load risk metrics', error);
        setErrorMessage('Could not load telemetry for risk analysis. Check project access and Firestore rules.');
      });
    });
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [currentProjectId, servers]);

  const rankedInsights = useMemo(() => [...insights].sort((a, b) => {
    const rank = { critical: 3, warning: 2, info: 1 };
    return rank[b.severity] - rank[a.severity];
  }), [insights]);

  const updateInsight = async (insight: RiskInsight, status: RiskInsight['status']) => {
    if (!currentProjectId || !insight.id) return;
    try {
      await updateDoc(doc(db, `projects/${currentProjectId}/risk_insights`, insight.id), { status, updatedAt: serverTimestamp() });
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to update risk insight', error);
      setErrorMessage('Could not update risk insight. Check your project role and Firestore rules.');
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div>
        <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-[0.2em]">
          <ShieldAlert className="w-4 h-4" />
          Deep Infrastructure Risk
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white mt-2">Risk Analysis</h1>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-2">
          Derived insights are estimates based on telemetry trends and security-relevant signals.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RiskStat label="Critical" value={rankedInsights.filter((item) => item.severity === 'critical' && item.status !== 'dismissed').length} tone="critical" />
        <RiskStat label="Under Review" value={rankedInsights.filter((item) => item.status === 'under_review').length} tone="review" />
        <RiskStat label="Servers Analyzed" value={servers.length} tone="normal" />
      </div>
      {errorMessage && <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 px-4 py-3 text-sm">{errorMessage}</div>}

      <div className="space-y-4">
        {rankedInsights.length === 0 ? (
          <div className="border border-dashed border-zinc-200 dark:border-white/10 rounded-2xl p-16 text-center text-zinc-500">No risk insights yet. Stream telemetry to build trend history.</div>
        ) : rankedInsights.map((insight) => (
          <div key={insight.id} className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', insight.severity === 'critical' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500')}>
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest font-black text-zinc-500">{insight.type.replace('_', ' ')}</span>
                  <span className={cn('text-[10px] uppercase tracking-widest font-black', insight.status === 'dismissed' ? 'text-zinc-400' : 'text-emerald-500')}>{insight.status.replace('_', ' ')}</span>
                </div>
                <p className="text-zinc-900 dark:text-white font-bold mt-1">{insight.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => updateInsight(insight, 'under_review')} className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/10 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Review
              </button>
              <button onClick={() => updateInsight(insight, 'dismissed')} className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/10 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-2">
                <EyeOff className="w-4 h-4" />
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RiskStat = ({ label, value, tone }: { label: string; value: number; tone: 'critical' | 'review' | 'normal' }) => (
  <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-6">
    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{label}</p>
    <p className={cn('text-4xl font-black mt-2', tone === 'critical' ? 'text-red-500' : tone === 'review' ? 'text-amber-500' : 'text-zinc-900 dark:text-white')}>{value}</p>
  </div>
);
