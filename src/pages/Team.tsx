import React, { useEffect, useState } from 'react';
import { Users, Mail, Shield, UserMinus, Server } from 'lucide-react';
import { auth, collection, db, deleteDoc, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from '../firebase';
import { useAppStore } from '../store';
import { OrgMember, Server as ServerType, UserProfile } from '../types';
import { cn, isActiveServer } from '../lib/utils';
import { writeAuditLog } from '../lib/audit';

type MemberRow = UserProfile & { role: string; serverScope?: string[]; lastActivity?: any };

export const Team = () => {
  const { currentOrgId, currentProjectId, user } = useAppStore();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [servers, setServers] = useState<ServerType[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'developer' | 'viewer'>('viewer');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  useEffect(() => {
    if (!currentOrgId) return;
    const unsubscribe = onSnapshot(collection(db, `organizations/${currentOrgId}/members`), async (snapshot) => {
      const rows = await Promise.all(snapshot.docs.map(async (memberDoc) => {
        const member = memberDoc.data() as OrgMember & { serverScope?: string[]; lastActivity?: any };
        return {
          uid: member.uid,
          email: member.email || '',
          displayName: member.displayName || '',
          photoURL: member.photoURL || '',
          role: member.role,
          serverScope: member.serverScope || [],
          lastActivity: member.lastActivity,
          createdAt: member.joinedAt,
        } as MemberRow;
      }));
      setMembers(rows);
      setErrorMessage('');
    }, (error) => {
      console.error('Failed to load team members', error);
      setMembers([]);
      setErrorMessage('Could not load team members. Check your organization role and Firestore rules.');
    });
    return () => unsubscribe();
  }, [currentOrgId]);

  useEffect(() => {
    if (!currentProjectId) {
      setServers([]);
      return;
    }
    const serversQuery = query(collection(db, 'servers'), where('projectId', '==', currentProjectId));
    return onSnapshot(serversQuery, (snapshot) => {
      setServers(snapshot.docs.map((serverDoc) => ({ id: serverDoc.id, ...serverDoc.data() } as ServerType)).filter(isActiveServer));
    }, (error) => {
      console.error('Failed to load team server scope', error);
      setServers([]);
      setErrorMessage('Could not load server scope. Check your role and Firestore rules.');
    });
  }, [currentProjectId]);

  const sendInvite = async () => {
    if (!currentOrgId || !user?.uid || !email.trim()) return;
    setInviteLink('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Please sign in again.');
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId: currentOrgId, email: email.trim().toLowerCase(), role, invitedBy: user.uid }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload?.error || 'Invite failed. Check Resend/Firebase Admin env.');
        return;
      }
      await writeAuditLog({ orgId: currentOrgId, userId: user.uid, action: 'user_invited', resource: 'invite', metadata: { email, role } });
      if (typeof payload.inviteLink === 'string') {
        setInviteLink(payload.inviteLink);
        setMessage('Invitation created. Email was not delivered; share this link with the invitee.');
      } else {
        setMessage('Invitation email sent.');
      }
      setErrorMessage('');
      setEmail('');
    } catch (error) {
      console.error('Invite failed', error);
      setErrorMessage('Could not send invite. Check the API server and email configuration.');
    }
  };

  const changeRole = async (member: MemberRow, nextRole: string) => {
    if (!currentOrgId || !user?.uid) return;
    try {
      await updateDoc(doc(db, `organizations/${currentOrgId}/members`, member.uid), { role: nextRole, lastActivity: serverTimestamp() });
      await writeAuditLog({ orgId: currentOrgId, userId: user.uid, action: 'role_changed', resource: 'member', resourceId: member.uid, metadata: { role: nextRole } });
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to change role', error);
      setErrorMessage('Could not change role. You may need owner/admin permissions.');
    }
  };

  const toggleServerScope = async (member: MemberRow, serverId: string) => {
    if (!currentOrgId || !user?.uid) return;
    const current = new Set(member.serverScope || []);
    if (current.has(serverId)) current.delete(serverId);
    else current.add(serverId);
    const serverScope = Array.from(current);
    try {
      await updateDoc(doc(db, `organizations/${currentOrgId}/members`, member.uid), { serverScope, lastActivity: serverTimestamp() });
      await writeAuditLog({ orgId: currentOrgId, userId: user.uid, action: 'server_scope_changed', resource: 'member', resourceId: member.uid, metadata: { serverScope } });
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to update server scope', error);
      setErrorMessage('Could not update server scope. You may need owner/admin permissions.');
    }
  };

  const removeMember = async (member: MemberRow) => {
    if (!currentOrgId || !user?.uid || member.uid === user.uid) return;
    if (!window.confirm(`Remove ${member.email || member.uid} from this workspace?`)) return;
    try {
      await deleteDoc(doc(db, `organizations/${currentOrgId}/members`, member.uid));
      await writeAuditLog({ orgId: currentOrgId, userId: user.uid, action: 'user_removed', resource: 'member', resourceId: member.uid });
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to remove member', error);
      setErrorMessage('Could not remove member. You may need owner/admin permissions.');
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div>
        <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-[0.2em]">
          <Users className="w-4 h-4" />
          Team Management
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white mt-2">Team</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2">Invite members, change roles, and assign server scope.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@example.com" className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white" />
        <select value={role} onChange={(event) => setRole(event.target.value as any)} className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white">
          <option value="admin">Admin</option>
          <option value="developer">Team Member</option>
          <option value="viewer">Viewer</option>
        </select>
        <button onClick={sendInvite} className="bg-emerald-500 text-zinc-950 px-5 py-3 rounded-xl font-black flex items-center justify-center gap-2"><Mail className="w-4 h-4" />Invite</button>
      </div>
      {message && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 px-4 py-3 text-sm">{message}</div>}
      {inviteLink && <input aria-label="Invitation link" readOnly value={inviteLink} onFocus={(event) => event.currentTarget.select()} className="w-full rounded-xl border border-emerald-500/30 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-white" />}
      {errorMessage && <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 px-4 py-3 text-sm">{errorMessage}</div>}

      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl overflow-hidden">
        {members.map((member) => (
          <div key={member.uid} className="p-5 border-b border-zinc-200 dark:border-white/10 last:border-b-0 grid grid-cols-1 xl:grid-cols-[1.2fr_auto_1.4fr_auto] gap-4 items-center">
            <div>
              <p className="font-black text-zinc-900 dark:text-white">{member.displayName || member.email || member.uid}</p>
              <p className="text-sm text-zinc-500">{member.email || member.uid}</p>
            </div>
            <select disabled={member.role === 'owner'} value={member.role} onChange={(event) => changeRole(member, event.target.value)} className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white">
              {member.role === 'owner' && <option value="owner">Owner</option>}
              <option value="admin">Admin</option>
              <option value="developer">Team Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <div className="flex flex-wrap gap-2">
              {servers.length === 0 ? <span className="text-xs text-zinc-500">No servers in active project.</span> : servers.map((server) => (
                <button key={server.id} onClick={() => toggleServerScope(member, server.id)} className={cn('px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1', member.serverScope?.includes(server.id) ? 'bg-emerald-500 text-zinc-950 border-emerald-500' : 'border-zinc-200 dark:border-white/10 text-zinc-500')}>
                  <Server className="w-3 h-3" />{server.name}
                </button>
              ))}
            </div>
            <button disabled={member.role === 'owner'} aria-label={`Remove ${member.email}`} onClick={() => removeMember(member)} className="text-red-500 hover:bg-red-500/10 rounded-xl p-3 justify-self-start xl:justify-self-end"><UserMinus className="w-5 h-5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
};
