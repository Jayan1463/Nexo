import React, { useEffect, useState } from 'react';
import { ClipboardList, Download } from 'lucide-react';
import { collection, db, limit, onSnapshot, orderBy, query } from '../firebase';
import { useAppStore } from '../store';

type AuditRow = {
  id: string;
  timestamp?: any;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
};

const toDate = (value: any) => value?.toDate ? value.toDate() : value ? new Date(value) : null;

export const AuditLogs = () => {
  const { currentOrgId } = useAppStore();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!currentOrgId) return;
    const auditQuery = query(collection(db, `organizations/${currentOrgId}/auditLogs`), orderBy('timestamp', 'desc'), limit(250));
    return onSnapshot(auditQuery, (snapshot) => {
      setRows(snapshot.docs.map((auditDoc) => ({ id: auditDoc.id, ...auditDoc.data() } as AuditRow)));
      setErrorMessage('');
    }, (error) => {
      console.error('Audit log listener failed', error);
      setRows([]);
      setErrorMessage('Could not load audit logs for this account.');
    });
  }, [currentOrgId]);

  const exportCsv = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Resource', 'Resource ID', 'Metadata'],
      ...rows.map((row) => [
        toDate(row.timestamp)?.toISOString() || '',
        row.userId || '',
        row.action,
        row.resource,
        row.resourceId || '',
        JSON.stringify(row.metadata || {}),
      ]),
    ].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexo-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-[0.2em]"><ClipboardList className="w-4 h-4" />Security Audit</div>
          <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white mt-2">Audit Logs</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">Administrative and security-sensitive actions are recorded here.</p>
        </div>
        <button onClick={exportCsv} className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 px-5 py-3 rounded-xl font-black flex items-center gap-2"><Download className="w-4 h-4" />Export CSV</button>
      </div>
      {errorMessage && <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 px-4 py-3 text-sm">{errorMessage}</div>}

      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-16 text-center text-zinc-500">No audit events recorded yet.</div>
        ) : rows.map((row) => {
          const date = toDate(row.timestamp);
          return (
            <div key={row.id} className="p-5 border-b border-zinc-200 dark:border-white/10 last:border-b-0 grid grid-cols-1 md:grid-cols-[180px_1fr_1fr] gap-3">
              <span className="text-xs text-zinc-500">{date ? date.toLocaleString() : 'Pending timestamp'}</span>
              <div>
                <p className="font-black text-zinc-900 dark:text-white">{row.action.replace(/_/g, ' ')}</p>
                <p className="text-xs text-zinc-500">{row.resource} {row.resourceId ? `· ${row.resourceId}` : ''}</p>
              </div>
              <code className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-950 rounded-xl p-3 overflow-x-auto">{JSON.stringify(row.metadata || {})}</code>
            </div>
          );
        })}
      </div>
    </div>
  );
};
