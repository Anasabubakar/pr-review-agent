import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  GitBranch, 
  Trash2, 
  Settings2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Plus, 
  Database, 
  Radio, 
  ShieldCheck, 
  Activity, 
  Cpu, 
  Heart, 
  Loader2,
  Lock
} from 'lucide-react';

interface Repository {
  id: string;
  owner: string;
  name: string;
  defaultBranch: string;
  language: string;
  description: string;
  createdAt: string;
  isEnabled?: boolean;
  installationStatus?: 'installed' | 'not_installed';
  webhookStatus?: 'active' | 'inactive';
  syncStatus?: 'synced' | 'syncing' | 'failed';
  lastSyncAt?: string;
  branchProtection?: string;
  aiReviewStatus?: 'enabled' | 'disabled';
  healthScore?: number;
  indexingStatus?: 'indexed' | 'indexing' | 'pending';
}

interface RepositoryManagementProps {
  user: any;
}

export function RepositoryManagement({ user }: RepositoryManagementProps) {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add Repository Modal/Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [owner, setOwner] = useState('');
  const [name, setName] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [submitting, setSubmitting] = useState(false);

  // Active configurations panel for a selected repository
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  // Load connected repositories
  const loadRepos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/repos');
      if (res.ok) {
        const data = await res.json();
        setRepos(data);
      } else {
        throw new Error('Failed to load connected repositories');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading repositories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepos();
  }, []);

  // Toggle Repository Enabled Status
  const toggleRepoEnabled = async (repo: Repository) => {
    const updatedStatus = repo.isEnabled === false ? true : false;
    try {
      const res = await fetch(`/api/repos/${repo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: updatedStatus })
      });
      if (res.ok) {
        setSuccess(`Repository ${updatedStatus ? 'enabled' : 'disabled'} successfully.`);
        loadRepos();
        if (selectedRepo?.id === repo.id) {
          setSelectedRepo({ ...selectedRepo, isEnabled: updatedStatus });
        }
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
      setError('Failed to update repository status.');
    }
  };

  // Toggle AI Review Status
  const toggleAIReview = async (repo: Repository) => {
    const updatedStatus = repo.aiReviewStatus === 'disabled' ? 'enabled' : 'disabled';
    try {
      const res = await fetch(`/api/repos/${repo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiReviewStatus: updatedStatus })
      });
      if (res.ok) {
        setSuccess(`AI Reviews ${updatedStatus === 'enabled' ? 'enabled' : 'disabled'} for this repository.`);
        loadRepos();
        if (selectedRepo?.id === repo.id) {
          setSelectedRepo({ ...selectedRepo, aiReviewStatus: updatedStatus });
        }
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
      setError('Failed to update AI review configuration.');
    }
  };

  // Sync Repository (fetches live issues & pull requests)
  const syncRepository = async (repo: Repository) => {
    setSuccess(`Starting live synchronization for ${repo.owner}/${repo.name}...`);
    // Optimistic state
    setRepos(prev => prev.map(r => r.id === repo.id ? { ...r, syncStatus: 'syncing', indexingStatus: 'indexing' } : r));
    try {
      const res = await fetch(`/api/repos/${repo.id}/sync`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSuccess(`Sync complete! Loaded ${data.syncedCount} PRs and ${data.syncedIssuesCount || 0} real Issues.`);
        loadRepos();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Sync failed');
      }
    } catch (err) {
      setError(`Synchronization failed for ${repo.owner}/${repo.name}. Ensure Personal Access Tokens are fully authorized.`);
      loadRepos();
      setTimeout(() => setError(''), 4000);
    }
  };

  // Add Repository Submission
  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    if (!owner.trim() || !name.trim()) {
      setError('Owner and Name are required parameters.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: owner.trim(),
          name: name.trim(),
          defaultBranch: defaultBranch.trim(),
          language: 'TypeScript',
          description: 'Custom Connected Repository'
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to connect repository.');
      }

      const newRepo = await res.json();
      setSuccess(`Connected ${owner}/${name} successfully! Running first synchronization...`);
      setShowAddForm(false);
      setOwner('');
      setName('');
      
      // Auto-trigger sync
      await syncRepository(newRepo);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  // Disconnect/Remove Repository
  const handleDeleteRepo = async (id: string) => {
    if (!window.confirm('Are you sure you want to disconnect this repository from PR Review tracking?')) return;
    try {
      const res = await fetch(`/api/repos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Repository disconnected successfully.');
        setSelectedRepo(null);
        loadRepos();
        setTimeout(() => setSuccess(''), 2500);
      } else {
        throw new Error('Deletion failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting repository.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top action header and alert feedback */}
      <div className="bg-[#050506] border border-white/10 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest font-mono">WORKSPACE SOURCE OF TRUTH</span>
          <h1 className="text-xl font-bold text-white mt-1">Repository Management</h1>
          <p className="text-xs text-white/50 mt-1">
            Connect repositories, configure AI Reviewers, and monitor webhook installations.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs flex items-center gap-2 cursor-pointer transition shadow-lg shadow-indigo-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Connect Repository</span>
        </button>
      </div>

      {/* Messages */}
      {(error || success) && (
        <div className="space-y-2">
          {error && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-xs text-red-400 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-xs text-emerald-400 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}
        </div>
      )}

      {/* Add Repository Popup Form Overlay */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#050506] border border-white/10 rounded-2xl p-6 shadow-2xl relative"
          >
            <div className="absolute top-0 right-0 p-4">
              <GitBranch className="w-4 h-4 text-white/10" />
            </div>

            <h3 className="text-sm font-semibold text-white/90 border-b border-white/5 pb-3 mb-5 font-mono">
              Connect Live GitHub Repository
            </h3>

            <form onSubmit={handleAddRepo} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-white/40 uppercase font-mono tracking-wider">Repository Owner</label>
                <input
                  type="text"
                  required
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="e.g. facebook"
                  className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-white/40 uppercase font-mono tracking-wider">Repository Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. react"
                  className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-white/40 uppercase font-mono tracking-wider">Default Branch</label>
                <input
                  type="text"
                  required
                  value={defaultBranch}
                  onChange={(e) => setDefaultBranch(e.target.value)}
                  placeholder="main"
                  className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none font-mono"
                />
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-white/10 hover:bg-white/[0.02] text-white font-medium rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect & Sync'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Main Repositories Grid stage */}
      {loading ? (
        <div className="flex justify-center items-center py-20 bg-[#050506] border border-white/10 rounded-2xl">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : repos.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-white/10 bg-[#050506]/50 rounded-2xl">
          <GitBranch className="w-10 h-10 text-white/10 mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-white/80">No connected repositories</h3>
          <p className="text-xs text-white/40 mt-1 max-w-sm mx-auto">
            You haven't connected any live repositories yet. Click "Connect Repository" to import your GitHub repositories into the PR Review pipeline.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Repository Items Cards List */}
          <div className="lg:col-span-2 space-y-4">
            {repos.map((repo) => (
              <div 
                key={repo.id}
                onClick={() => setSelectedRepo(repo)}
                className={`p-5 bg-[#050506] border rounded-2xl cursor-pointer transition flex items-start justify-between gap-4 ${
                  selectedRepo?.id === repo.id ? 'border-indigo-500/55 bg-indigo-500/[0.01]' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl border mt-0.5 ${
                    repo.isEnabled === false 
                      ? 'bg-white/[0.01] border-white/5 text-white/20' 
                      : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                  }`}>
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-sm font-bold text-white/90">{repo.owner}/{repo.name}</h3>
                      {repo.isEnabled === false && (
                        <span className="text-[8px] uppercase tracking-wider font-bold font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/10">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/40 mt-1 line-clamp-1">{repo.description || 'No description provided.'}</p>
                    
                    {/* Status badges */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 font-mono text-[9px] font-bold text-white/40">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${repo.installationStatus === 'installed' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                        INSTALLATION: <span className={repo.installationStatus === 'installed' ? 'text-emerald-400' : 'text-red-400'}>{repo.installationStatus?.toUpperCase() || 'NOT_INSTALLED'}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${repo.webhookStatus === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        WEBHOOK: <span className={repo.webhookStatus === 'active' ? 'text-emerald-400' : 'text-red-400'}>{repo.webhookStatus?.toUpperCase() || 'INACTIVE'}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          repo.syncStatus === 'synced' ? 'bg-emerald-400' : repo.syncStatus === 'syncing' ? 'bg-amber-400 animate-spin' : 'bg-red-400'
                        }`} />
                        SYNC: <span className={repo.syncStatus === 'synced' ? 'text-emerald-400' : 'text-amber-400'}>{repo.syncStatus?.toUpperCase() || 'FAILED'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => syncRepository(repo)}
                    disabled={repo.syncStatus === 'syncing'}
                    title="Force synchronization"
                    className="p-2 bg-white/[0.01] hover:bg-white/[0.03] text-white/40 hover:text-white/80 border border-white/5 rounded-lg transition cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${repo.syncStatus === 'syncing' ? 'animate-spin text-indigo-400' : ''}`} />
                  </button>
                  <button
                    onClick={() => toggleRepoEnabled(repo)}
                    title={repo.isEnabled === false ? 'Enable repository' : 'Disable repository'}
                    className={`p-2 border rounded-lg transition cursor-pointer ${
                      repo.isEnabled === false
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                    }`}
                  >
                    {repo.isEnabled === false ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDeleteRepo(repo.id)}
                    title="Disconnect repository"
                    className="p-2 bg-red-500/5 hover:bg-red-500/10 text-red-400/60 hover:text-red-400 border border-red-500/10 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Detailed Side Configuration Panel for Selected Repository */}
          <div className="lg:col-span-1">
            {selectedRepo ? (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-[#050506] border border-white/10 p-6 rounded-2xl space-y-6 md:sticky md:top-24 h-fit"
              >
                <div>
                  <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider font-mono">REPOSITORY INSPECTOR</span>
                  <h2 className="text-sm font-bold text-white/90 mt-0.5">{selectedRepo.owner}/{selectedRepo.name}</h2>
                  <p className="text-[10px] text-white/40 mt-1">Configure workspace rules and live health scores.</p>
                </div>

                {/* KPI stats widgets inside config panel */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-[#0a0a0b] border border-white/5 p-3 rounded-xl">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-white/30 font-mono block">Health Index</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono flex items-center gap-1.5 mt-1">
                      <Heart className="w-4 h-4 fill-emerald-500/10" />
                      {selectedRepo.healthScore || 95}%
                    </span>
                  </div>
                  <div className="bg-[#0a0a0b] border border-white/5 p-3 rounded-xl">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-white/30 font-mono block">Indexing Status</span>
                    <span className="text-xs font-bold text-white/80 font-mono flex items-center gap-1.5 mt-1">
                      <Cpu className="w-4 h-4 text-indigo-400" />
                      {selectedRepo.indexingStatus || 'indexed'}
                    </span>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 space-y-4 text-xs">
                  
                  {/* Detailed branch protection info */}
                  <div className="flex justify-between items-center bg-[#0a0a0b] border border-white/5 p-3.5 rounded-xl">
                    <div>
                      <h4 className="font-bold text-white/80 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-indigo-400" />
                        Branch Protection
                      </h4>
                      <p className="text-[9px] text-white/40 mt-0.5">Enforce PR agent sign-off before merge</p>
                    </div>
                    <span className="text-[9px] font-mono font-bold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-indigo-400">
                      {selectedRepo.branchProtection || 'Enabled (main)'}
                    </span>
                  </div>

                  {/* AI review status check */}
                  <div className="flex justify-between items-center bg-[#0a0a0b] border border-white/5 p-3.5 rounded-xl">
                    <div>
                      <h4 className="font-bold text-white/80 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-indigo-400" />
                        AI Agent Reviewing
                      </h4>
                      <p className="text-[9px] text-white/40 mt-0.5">Autonomous code quality analysis</p>
                    </div>
                    <button
                      onClick={() => toggleAIReview(selectedRepo)}
                      className={`px-3 py-1 rounded text-[9px] font-mono font-bold uppercase transition cursor-pointer ${
                        selectedRepo.aiReviewStatus === 'disabled'
                          ? 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'
                          : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20'
                      }`}
                    >
                      {selectedRepo.aiReviewStatus || 'enabled'}
                    </button>
                  </div>

                  {/* Webhook active signature info */}
                  <div className="flex justify-between items-center bg-[#0a0a0b] border border-white/5 p-3.5 rounded-xl">
                    <div>
                      <h4 className="font-bold text-white/80 flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                        Webhook Listeners
                      </h4>
                      <p className="text-[9px] text-white/40 mt-0.5">Listening to `pull_request` triggers</p>
                    </div>
                    <span className="text-[9px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-400">
                      Active
                    </span>
                  </div>

                  <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl space-y-2.5 text-white/40 text-[11px]">
                    <div className="flex justify-between">
                      <span>Default Branch:</span>
                      <span className="font-mono text-white/70">{selectedRepo.defaultBranch}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Synchronization:</span>
                      <span className="font-mono text-white/70">
                        {selectedRepo.lastSyncAt ? new Date(selectedRepo.lastSyncAt).toLocaleTimeString() : 'Never synced'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date Connected:</span>
                      <span className="font-mono text-white/70">
                        {new Date(selectedRepo.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                </div>
              </motion.div>
            ) : (
              <div className="p-8 border border-dashed border-white/10 bg-[#050506]/30 rounded-2xl text-center text-xs text-white/30 hidden lg:block md:sticky md:top-24">
                <Settings2 className="w-8 h-8 text-white/10 mx-auto mb-3" />
                <p>Select a repository to inspect real-time webhook logs and manage advanced configurations.</p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
