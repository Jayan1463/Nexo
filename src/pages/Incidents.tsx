import React, { useEffect, useState } from 'react';
import { Flame, CheckCircle2, Clock, RadioTower, MessageSquarePlus } from 'lucide-react';
import { collection, db, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from '../firebase';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';
import { Incident } from '../types';

const statuses: Incident['status'][] = ['investigating', 'identified', 'monitoring', 'resolved'];

export const Incidents = () => {
  const { currentProjectId, user } = useAppStore();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [severity, setSeverity] = useState<Incident['severity']>('warning');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!currentProjectId) return;
    const incidentQuery = query(collection(db, `projects/${currentProjectId}/incidents`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(incidentQuery, (snapshot) => {
      setIncidents(snapshot.docs.map((incidentDoc) => ({ id: incidentDoc.id, ...incidentDoc.data() } as Incident)));
      setErrorMessage('');
    }, (error) => {
      console.error('Failed to load incidents', error);
      setIncidents([]);
      setErrorMessage('Could not load incidents. Check project access and Firestore rules.');
    });
    return () => unsubscribe();
  }, [currentProjectId]);

  const createIncident = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentProjectId || !newTitle.trim()) return;
    const incidentRef = doc(collection(db, `projects/${currentProjectId}/incidents`));
    const now = new Date().toISOString();
    try {
      await setDoc(incidentRef, {
        id: incidentRef.id,
        projectId: currentProjectId,
        title: newTitle.trim(),
        summary: newSummary.trim() || 'Manual incident opened by operations.',
        severity,
        status: 'investigating',
        publicVisible: severity !== 'info',
        timeline: [{
          status: 'investigating',
          message: 'Incident opened.',
          userId: user?.uid || '',
          timestamp: now,
        }],
        createdAt: now,
        updatedAt: now,
      });
      setNewTitle('');
      setNewSummary('');
      setSeverity('warning');
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to create incident', error);
      setErrorMessage('Could not create incident. Check your project role and Firestore rules.');
    }
  };

  const updateStatus = async (incident: Incident, status: Incident['status']) => {
    if (!currentProjectId || !incident.id) return;
    const timeline = Array.isArray(incident.timeline) ? incident.timeline : [];
    try {
      await updateDoc(doc(db, `projects/${currentProjectId}/incidents`, incident.id), {
        status,
        updatedAt: serverTimestamp(),
        ...(status === 'resolved' ? { resolvedAt: serverTimestamp() } : {}),
        timeline: [
          ...timeline,
          {
            status,
            message: `Status changed to ${status}.`,
            userId: user?.uid || '',
            timestamp: new Date().toISOString(),
          },
        ],
      });
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to update incident', error);
      setErrorMessage('Could not update incident. Check your project role and Firestore rules.');
    }
  };

  const openIncidents = incidents.filter((incident) => incident.status !== 'resolved').length;

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-[0.2em]">
            <Flame className="w-4 h-4" />
            Incident Response
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white mt-2">Incidents</h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-2">
            Track operational events from investigation to resolution with a persistent timeline.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 p-5 min-w-48">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Open Incidents</p>
          <p className="text-4xl font-black text-zinc-900 dark:text-white">{openIncidents}</p>
        </div>
      </div>

      <form onSubmit={createIncident} className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto_auto] gap-3 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-4">
        <input
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          placeholder="Incident title"
          className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white"
        />
        <input
          value={newSummary}
          onChange={(event) => setNewSummary(event.target.value)}
          placeholder="Summary"
          className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white"
        />
        <select
          value={severity}
          onChange={(event) => setSeverity(event.target.value as Incident['severity'])}
          className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white"
        >
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <button className="bg-emerald-500 text-zinc-950 rounded-xl px-5 py-3 text-sm font-black flex items-center justify-center gap-2">
          <MessageSquarePlus className="w-4 h-4" />
          Open
        </button>
      </form>
      {errorMessage && <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 px-4 py-3 text-sm">{errorMessage}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {incidents.map((incident) => (
          <article key={incident.id} className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 space-y-5 shadow-sm dark:shadow-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('text-[10px] uppercase tracking-widest font-black px-2 py-1 rounded-md', incident.severity === 'critical' ? 'bg-red-500/10 text-red-500' : incident.severity === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500')}>
                    {incident.severity}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest font-black text-zinc-500">{incident.status}</span>
                </div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-white">{incident.title}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{incident.summary}</p>
              </div>
              {incident.status === 'resolved' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <RadioTower className="w-6 h-6 text-amber-500" />}
            </div>

            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => updateStatus(incident, status)}
                  disabled={incident.status === status}
                  className={cn('px-3 py-2 rounded-lg text-xs font-bold capitalize border transition-colors', incident.status === status ? 'bg-emerald-500 text-zinc-950 border-emerald-500' : 'border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white')}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="space-y-3 border-t border-zinc-200 dark:border-white/10 pt-4">
              {(incident.timeline || []).slice(-4).map((item, index) => (
                <div key={`${incident.id}-${index}`} className="flex gap-3 text-sm">
                  <Clock className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-white capitalize">{item.status.replace('_', ' ')}</p>
                    <p className="text-zinc-500 dark:text-zinc-400">{item.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
