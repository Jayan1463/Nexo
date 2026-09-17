import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronDown, 
  CheckCircle2, 
  Globe, 
  Sun, 
  Moon,
  Search,
  Command,
  Bell
} from 'lucide-react';
import { 
  db, 
  doc, 
  getDoc, 
  collection, 
  onSnapshot, 
  updateDoc,
  query,
  where,
  orderBy,
  limit
} from '../firebase';
import { useAppStore } from '../store';
import { Organization, Project } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const TopBar = ({
  onSettingsClick,
  showContextSelectors = false,
  showQuickContext = true,
}: {
  onSettingsClick: () => void;
  showContextSelectors?: boolean;
  showQuickContext?: boolean;
}) => {
  const { user, currentOrgId, currentProjectId, setOrg, setProject, theme, setTheme } = useAppStore();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchRows, setSearchRows] = useState<Array<{ type: string; title: string; subtitle: string }>>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, async (snap) => {
      if (snap.exists()) {
        const userData = snap.data();
        const orgIds = Array.from(
          new Set(
            [userData.currentOrgId, ...(userData.orgIds || [])].filter(
              (id): id is string => typeof id === 'string' && id.length > 0,
            ),
          ),
        );
        
        const orgPromises = orgIds.map(async (id: string) => {
          try {
            const oSnap = await getDoc(doc(db, 'organizations', id));
            if (!oSnap.exists()) return null;
            const data = oSnap.data() as Partial<Organization>;
            return {
              id: data.id || oSnap.id,
              name: data.name || 'Untitled Organization',
              ownerId: data.ownerId || user.uid,
              plan: data.plan || 'free',
              createdAt: data.createdAt,
            } as Organization;
          } catch (error) {
            console.error(`Failed to load organization ${id}`, error);
            return null;
          }
        });
        
        const orgList = (await Promise.all(orgPromises)).filter(o => o !== null) as Organization[];
        setOrgs(orgList);
      }
    }, (error) => {
      console.error('Failed to load current user profile in top bar', error);
      setOrgs([]);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!currentOrgId) return;
    
    const projectsRef = collection(db, `organizations/${currentOrgId}/projects`);
    const unsubscribe = onSnapshot(projectsRef, (snap) => {
      const projectList = snap.docs.map((projectDoc) => {
        const data = projectDoc.data() as Partial<Project>;
        return {
          id: data.id || projectDoc.id,
          orgId: data.orgId || currentOrgId,
          name: data.name || 'Untitled Project',
          environment: data.environment || 'prod',
          createdAt: data.createdAt,
        } as Project;
      });
      setProjects(projectList);

      const hasCurrentProject = projectList.some((project) => project.id === currentProjectId);
      if (projectList.length > 0 && (!currentProjectId || !hasCurrentProject)) {
        setProject(projectList[0].id);
      }
    }, (error) => {
      console.error('Failed to load projects in top bar', error);
      setProjects([]);
    });

    return () => unsubscribe();
  }, [currentOrgId, currentProjectId, setProject]);

  useEffect(() => {
    if (!currentProjectId) return;
    const rows: Array<{ type: string; title: string; subtitle: string }> = [];
    const pushAndFilter = () => {
      const term = searchTerm.trim().toLowerCase();
      setSearchRows(term ? rows.filter((row) => `${row.type} ${row.title} ${row.subtitle}`.toLowerCase().includes(term)).slice(0, 8) : []);
    };
    const handleSearchError = (label: string) => (error: unknown) => {
      console.error(`Global search ${label} listener failed`, error);
      setSearchRows([]);
    };
    const unsubServers = onSnapshot(query(collection(db, 'servers'), where('projectId', '==', currentProjectId)), (snapshot) => {
      rows.splice(0, rows.length, ...rows.filter((row) => row.type !== 'Server'));
      snapshot.docs.forEach((serverDoc) => {
        const data = serverDoc.data() as any;
        rows.push({ type: 'Server', title: data.name || serverDoc.id, subtitle: data.status || 'unknown' });
      });
      pushAndFilter();
    }, handleSearchError('servers'));
    const unsubAlerts = onSnapshot(query(collection(db, `projects/${currentProjectId}/alerts`), orderBy('timestamp', 'desc'), limit(50)), (snapshot) => {
      rows.splice(0, rows.length, ...rows.filter((row) => row.type !== 'Alert'));
      snapshot.docs.forEach((alertDoc) => {
        const data = alertDoc.data() as any;
        rows.push({ type: 'Alert', title: data.message || alertDoc.id, subtitle: `${data.severity || 'info'} · ${data.status || 'active'}` });
      });
      pushAndFilter();
    }, handleSearchError('alerts'));
    const unsubLogs = onSnapshot(query(collection(db, `projects/${currentProjectId}/logs`), orderBy('timestamp', 'desc'), limit(50)), (snapshot) => {
      rows.splice(0, rows.length, ...rows.filter((row) => row.type !== 'Log'));
      snapshot.docs.forEach((logDoc) => {
        const data = logDoc.data() as any;
        rows.push({ type: 'Log', title: data.message || logDoc.id, subtitle: `${data.level || 'info'} · ${data.service || 'system'}` });
      });
      pushAndFilter();
    }, handleSearchError('logs'));
    const unsubIncidents = onSnapshot(query(collection(db, `projects/${currentProjectId}/incidents`), orderBy('createdAt', 'desc'), limit(50)), (snapshot) => {
      rows.splice(0, rows.length, ...rows.filter((row) => row.type !== 'Incident'));
      snapshot.docs.forEach((incidentDoc) => {
        const data = incidentDoc.data() as any;
        rows.push({ type: 'Incident', title: data.title || incidentDoc.id, subtitle: data.status || 'investigating' });
      });
      pushAndFilter();
    }, handleSearchError('incidents'));
    return () => {
      unsubServers();
      unsubAlerts();
      unsubLogs();
      unsubIncidents();
    };
  }, [currentProjectId, searchTerm]);

  useEffect(() => {
    if (!user?.uid) return;
    const notificationQuery = query(collection(db, 'notifications'), where('recipientUserId', '==', user.uid), orderBy('createdAt', 'desc'), limit(10));
    return onSnapshot(notificationQuery, (snapshot) => {
      setNotifications(snapshot.docs.map((notificationDoc) => ({ id: notificationDoc.id, ...notificationDoc.data() })));
    }, (error) => {
      console.error('Notifications listener failed', error);
      setNotifications([]);
    });
  }, [user?.uid]);

  const currentOrg = orgs.find(o => o.id === currentOrgId);
  const currentProject = projects.find(p => p.id === currentProjectId);
  const normalizedOrgName = (currentOrg?.name || 'Select Org').replace(/'s Organization$/i, '').replace(/ Organization$/i, '').trim();

  const handleSwitchOrg = async (orgId: string) => {
    if (!user) return;
    setOrg(orgId);
    setProject(null);
    await updateDoc(doc(db, 'users', user.uid), { currentOrgId: orgId });
    setShowOrgSwitcher(false);
  };

  const handleSwitchProject = (projectId: string) => {
    setProject(projectId);
    setShowProjectSwitcher(false);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="h-24 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between px-8 backdrop-blur-2xl sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 transition-all duration-500">
      <div className="flex items-center gap-6 h-16">
        {showContextSelectors && (
          <>
        {/* Org Switcher */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowOrgSwitcher(!showOrgSwitcher);
              setShowProjectSwitcher(false);
            }}
            className="h-16 flex items-center gap-4 bg-zinc-50 dark:bg-white/5 px-4 rounded-2xl border border-zinc-200 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition-all active:scale-95 group shadow-sm dark:shadow-none"
          >
            <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)] group-hover:scale-110 transition-transform" />
            <div className="flex flex-col items-center justify-center text-center leading-tight">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Organization</span>
              <span className="text-sm font-black text-zinc-900 dark:text-white tracking-tight leading-none">{currentOrg?.name || 'Select Org'}</span>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform duration-500", showOrgSwitcher && "rotate-180")} />
          </button>

          <AnimatePresence>
            {showOrgSwitcher && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full left-0 mt-4 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[2rem] shadow-2xl p-4 z-50 backdrop-blur-2xl"
              >
                <div className="px-4 py-3 border-b border-zinc-100 dark:border-white/5 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Switch Workspace</span>
                </div>
                <div className="space-y-1.5 max-h-80 overflow-y-auto no-scrollbar">
                  {orgs.length === 0 && (
                    <div className="px-4 py-5 text-sm text-zinc-500 dark:text-zinc-400 text-center">
                      No organizations found yet. Reload after signing in.
                    </div>
                  )}
                  {orgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleSwitchOrg(org.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-5 py-4 rounded-2xl text-sm transition-all group",
                        org.id === currentOrgId 
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-xl shadow-zinc-900/10 dark:shadow-white/5" 
                          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-2 h-2 rounded-full", org.id === currentOrgId ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700")} />
                        <span className="font-black truncate tracking-tight">{org.name}</span>
                      </div>
                      {org.id === currentOrgId && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Project Switcher */}
        <div className="relative mr-3">
          <button 
            onClick={() => {
              setShowProjectSwitcher(!showProjectSwitcher);
              setShowOrgSwitcher(false);
            }}
            className="h-16 flex items-center gap-4 bg-zinc-50 dark:bg-white/5 px-5 rounded-2xl border border-zinc-200 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition-all active:scale-95 group shadow-sm dark:shadow-none"
          >
            <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.5)] group-hover:scale-110 transition-transform" />
            <div className="flex flex-col items-center justify-center text-center leading-tight">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Active Project</span>
              <span className="text-sm font-black text-zinc-900 dark:text-white tracking-tight leading-none">{currentProject?.name || 'Select Project'}</span>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform duration-500", showProjectSwitcher && "rotate-180")} />
          </button>

          <AnimatePresence>
            {showProjectSwitcher && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full left-0 mt-4 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[2rem] shadow-2xl p-4 z-50 backdrop-blur-2xl"
              >
                <div className="px-4 py-3 border-b border-zinc-100 dark:border-white/5 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Switch Project</span>
                </div>
                <div className="space-y-1.5 max-h-80 overflow-y-auto no-scrollbar">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleSwitchProject(project.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-5 py-4 rounded-2xl text-sm transition-all group",
                        project.id === currentProjectId 
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-xl shadow-zinc-900/10 dark:shadow-white/5" 
                          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-2 h-2 rounded-full", project.id === currentProjectId ? "bg-blue-500" : "bg-zinc-300 dark:bg-zinc-700")} />
                        <span className="font-black truncate tracking-tight">{project.name}</span>
                      </div>
                      {project.id === currentProjectId && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
          </>
        )}
      </div>
      
      <div className="flex items-center gap-6 h-16 ml-2">
        {showQuickContext && (
          <>
        <div className="relative">
          <button
            onClick={() => {
              setShowOrgSwitcher(!showOrgSwitcher);
              setShowProjectSwitcher(false);
            }}
            className="h-16 flex items-center gap-3 bg-zinc-50 dark:bg-white/5 px-4 rounded-2xl border border-zinc-200 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition-all active:scale-95 shadow-sm dark:shadow-none"
            title="Choose organization"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm font-bold text-zinc-900 dark:text-white max-w-36 truncate">{normalizedOrgName}</span>
            <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", showOrgSwitcher && "rotate-180")} />
          </button>

          <AnimatePresence>
            {showOrgSwitcher && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-3 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[1.5rem] shadow-2xl p-3 z-50 backdrop-blur-2xl"
              >
                <div className="space-y-1.5 max-h-80 overflow-y-auto no-scrollbar">
                  {orgs.length === 0 && (
                    <div className="px-4 py-5 text-sm text-zinc-500 dark:text-zinc-400 text-center">
                      No organizations found yet. Reload after signing in.
                    </div>
                  )}
                  {orgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleSwitchOrg(org.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all",
                        org.id === currentOrgId
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950"
                          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                      )}
                    >
                      <span className="font-bold truncate">{org.name}</span>
                      {org.id === currentOrgId && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowProjectSwitcher(!showProjectSwitcher);
              setShowOrgSwitcher(false);
            }}
            className="h-16 flex items-center gap-3 bg-zinc-50 dark:bg-white/5 px-4 rounded-2xl border border-zinc-200 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition-all active:scale-95 shadow-sm dark:shadow-none"
            title="Choose project"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-sm font-bold text-zinc-900 dark:text-white max-w-32 truncate">{currentProject?.name || 'Select Project'}</span>
            <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", showProjectSwitcher && "rotate-180")} />
          </button>

          <AnimatePresence>
            {showProjectSwitcher && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-3 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[1.5rem] shadow-2xl p-3 z-50 backdrop-blur-2xl"
              >
                <div className="space-y-1.5 max-h-80 overflow-y-auto no-scrollbar">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleSwitchProject(project.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all",
                        project.id === currentProjectId
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950"
                          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                      )}
                    >
                      <span className="font-bold truncate">{project.name}</span>
                      {project.id === currentProjectId && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
          </>
        )}

        {/* Global Search */}
        <div className={cn(
          "hidden md:flex h-16 items-center gap-3 bg-zinc-50 dark:bg-white/5 px-5 rounded-2xl border transition-all duration-500 shadow-sm dark:shadow-none",
          searchFocused 
            ? "w-96 border-emerald-500/50 ring-4 ring-emerald-500/5" 
            : "w-72 border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10"
        )}>
          <Search className={cn("w-4 h-4 transition-colors", searchFocused ? "text-emerald-500" : "text-zinc-400")} />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Search infrastructure..." 
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            className="bg-transparent border-none outline-none text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 w-full tracking-tight"
          />
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-200 dark:bg-white/10 text-[10px] font-black text-zinc-500">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
          <AnimatePresence>
            {searchFocused && searchRows.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute top-20 left-0 w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl p-2 z-50"
              >
                {searchRows.map((row, index) => (
                  <button key={`${row.type}-${index}`} className="w-full text-left px-4 py-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5">
                    <p className="text-[10px] uppercase tracking-widest font-black text-emerald-500">{row.type}</p>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{row.title}</p>
                    <p className="text-xs text-zinc-500 truncate">{row.subtitle}</p>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowNotifications((prev) => !prev)}
            className="h-16 w-16 flex items-center justify-center rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all hover:scale-105 active:scale-95 shadow-sm dark:shadow-none relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {notifications.some((notification) => !notification.read) && <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-emerald-500" />}
          </button>
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute top-full right-0 mt-3 w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl p-3 z-50"
              >
                <div className="flex items-center justify-between px-3 py-2">
                  <p className="text-xs uppercase tracking-widest font-black text-zinc-500">Notifications</p>
                  <button
                    onClick={() => notifications.forEach((notification) => updateDoc(doc(db, 'notifications', notification.id), { read: true }).catch(() => undefined))}
                    className="text-xs font-bold text-emerald-500"
                  >
                    Mark all read
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-zinc-500">No notifications yet.</p>
                ) : notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => updateDoc(doc(db, 'notifications', notification.id), { read: true }).catch(() => undefined)}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5"
                  >
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{notification.title || notification.type}</p>
                    <p className="text-xs text-zinc-500">{notification.message || 'Open related resource'}</p>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button 
          onClick={toggleTheme}
          className="h-16 w-16 flex items-center justify-center rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all hover:scale-105 active:scale-95 shadow-sm dark:shadow-none"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={theme}
              initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.div>
          </AnimatePresence>
        </button>

        <div className="h-16 flex items-center gap-3 pl-1 group cursor-pointer" onClick={onSettingsClick}>
          <div className="hidden xl:flex flex-col items-end justify-center leading-tight">
            <span className="text-sm font-black text-zinc-900 dark:text-white tracking-tight group-hover:text-emerald-500 transition-colors whitespace-nowrap">{user?.displayName}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-white flex items-center justify-center border border-zinc-800 dark:border-zinc-200 shadow-xl shadow-emerald-500/10 group-hover:scale-105 transition-all duration-300">
            <span className="text-sm font-black text-emerald-500">
              {user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'JD'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
