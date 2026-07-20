import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GitPullRequest, 
  GitMerge, 
  Sparkles, 
  Flame, 
  Trophy, 
  Search, 
  Bell, 
  ChevronRight, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  FileCode, 
  Star, 
  FolderGit2, 
  ExternalLink, 
  Eye, 
  Filter, 
  SlidersHorizontal,
  Info,
  Layers,
  Inbox
} from 'lucide-react';
import { PullRequest, Review, Repository, Notification, ContributorPoint } from '../types.js';
import { LeaderboardView } from './LeaderboardView.js';

interface ContributorDashboardProps {
  onSelectPR: (id: string) => void;
  user: any;
}

export function ContributorDashboard({ onSelectPR, user }: ContributorDashboardProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'inbox' | 'leaderboard' | 'repos'>('home');
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [leaderboard, setLeaderboard] = useState<ContributorPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_action' | 'approved' | 'flagged' | 'merged'>('all');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'lineCount' | 'points'>('updatedAt');

  // AI Review Inbox specific filters
  const [inboxFilter, setInboxFilter] = useState<'all' | 'needs_action' | 'approved' | 'waiting_maintainer' | 'merged'>('all');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Fetch pull requests
      const prRes = await fetch('/api/prs');
      let prsData: PullRequest[] = [];
      if (prRes.ok) {
        prsData = await prRes.json();
        setPrs(prsData);
      }

      // Fetch repos
      const repoRes = await fetch('/api/repos');
      if (repoRes.ok) {
        const reposData = await repoRes.json();
        setRepos(reposData);
      }

      // Fetch notifications
      const notifRes = await fetch('/api/notifications');
      if (notifRes.ok) {
        const notifs = await notifRes.json();
        setNotifications(notifs);
      }

      // Fetch leaderboard
      const lbRes = await fetch('/api/points/leaderboard');
      if (lbRes.ok) {
        const lbData = await lbRes.json();
        setLeaderboard(lbData);
      }
    } catch (err) {
      console.error("Error loading contributor dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll notifications every 30 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (err) {
        console.error("Error polling notifications:", err);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  // Get current user's stats
  const username = user.githubUsername || user.username || '';
  const myStats = leaderboard.find(l => l.username.toLowerCase() === username.toLowerCase()) || {
    points: 0,
    streak: 1,
    prsMerged: 0,
    reviewsCompleted: 0,
    achievements: ['First Contribution']
  };

  const myRank = leaderboard.findIndex(l => l.username.toLowerCase() === username.toLowerCase()) + 1 || '-';

  // Process PR list
  const filteredPrs = prs
    .filter(pr => {
      // Contributors should only see their own PRs for "home", or all PRs across active repos
      const isMyPr = pr.author.toLowerCase() === username.toLowerCase();
      if (!isMyPr) return false;

      const matchesSearch = pr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            `#${pr.number}`.includes(searchQuery) ||
                            pr.headRef.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'needs_action' ? (pr.reviewStatus === 'changes_requested' || pr.isFlagged) :
        statusFilter === 'approved' ? (pr.reviewStatus === 'approved' && pr.state !== 'merged') :
        statusFilter === 'flagged' ? pr.isFlagged :
        statusFilter === 'merged' ? pr.state === 'merged' : true;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'updatedAt') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      } else if (sortBy === 'lineCount') {
        return (b.lineCount || 0) - (a.lineCount || 0);
      } else if (sortBy === 'points') {
        return (b.pointsAwarded || 0) - (a.pointsAwarded || 0);
      }
      return 0;
    });

  // Process AI Inbox Reviews
  const aiInboxPrs = prs
    .filter(pr => {
      // Show all PRs that have received AI review comments or score
      const matchesSearch = pr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            `#${pr.number}`.includes(searchQuery);

      const matchesInboxFilter = 
        inboxFilter === 'all' ? true :
        inboxFilter === 'needs_action' ? (pr.reviewStatus === 'changes_requested' || pr.isFlagged) :
        inboxFilter === 'approved' ? pr.reviewStatus === 'approved' :
        inboxFilter === 'waiting_maintainer' ? (pr.reviewStatus === 'pending' || (pr.reviewStatus === 'approved' && pr.state !== 'merged')) :
        inboxFilter === 'merged' ? pr.state === 'merged' : true;

      return matchesSearch && matchesInboxFilter;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-8 flex-1">
      {/* Contributor Welcome & Real Stats Metrics */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#050506]/60 border border-white/5 p-6 rounded-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10"></div>
        <div className="flex items-center gap-4">
          <img 
            src={myStats.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80`}
            alt="Profile Avatar"
            className="w-14 h-14 rounded-full border border-indigo-500/20 shadow-lg shadow-indigo-500/10"
          />
          <div>
            <span className="text-xs font-mono font-bold text-indigo-400 block tracking-widest uppercase">Contributor Workspace</span>
            <h2 className="text-xl font-bold text-white mt-1">Welcome, @{username}!</h2>
            <p className="text-xs text-white/40 mt-1">Keep shipping code to increase your streaks, unlock achievements, and climb the ranks.</p>
          </div>
        </div>

        {/* Real Quick Stats metrics - linked to system state */}
        <div className="flex items-center gap-3 self-stretch md:self-auto justify-between border-t border-white/5 pt-4 md:pt-0 md:border-0">
          <div className="px-4 py-2 bg-white/[0.02] border border-white/5 rounded-xl text-center min-w-[70px]">
            <span className="text-[10px] font-bold text-white/40 uppercase block font-mono">Streak</span>
            <span className="text-md font-bold text-red-400 font-mono flex items-center justify-center gap-1 mt-0.5">
              <Flame className="w-4 h-4 fill-red-500/10 text-red-500 animate-pulse" />
              {myStats.streak || 1}x
            </span>
          </div>

          <div className="px-4 py-2 bg-white/[0.02] border border-white/5 rounded-xl text-center min-w-[70px]">
            <span className="text-[10px] font-bold text-white/40 uppercase block font-mono">Points</span>
            <span className="text-md font-bold text-amber-400 font-mono flex items-center justify-center gap-1 mt-0.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              {myStats.points || 0}
            </span>
          </div>

          <div className="px-4 py-2 bg-white/[0.02] border border-white/5 rounded-xl text-center min-w-[70px]">
            <span className="text-[10px] font-bold text-white/40 uppercase block font-mono">Rank</span>
            <span className="text-md font-bold text-indigo-400 font-mono block mt-0.5">
              #{myRank}
            </span>
          </div>

          {/* Trigger Alert Notification Button */}
          <button 
            onClick={() => setIsNotifOpen(true)}
            className="relative p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-xl transition shrink-0 cursor-pointer text-white/80 hover:text-white"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center border border-[#0a0a0b] animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-white/5 gap-6">
        <button 
          onClick={() => setActiveTab('home')}
          className={`pb-3 text-sm font-semibold relative transition cursor-pointer ${activeTab === 'home' ? 'text-indigo-400' : 'text-white/40 hover:text-white/70'}`}
        >
          My Backlog
          {activeTab === 'home' && (
            <motion.div layoutId="contributorActiveTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
          )}
        </button>

        <button 
          onClick={() => setActiveTab('inbox')}
          className={`pb-3 text-sm font-semibold relative transition cursor-pointer flex items-center gap-2 ${activeTab === 'inbox' ? 'text-indigo-400' : 'text-white/40 hover:text-white/70'}`}
        >
          <Inbox className="w-4 h-4" />
          AI Reviews Inbox
          {prs.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-mono">
              {prs.length}
            </span>
          )}
          {activeTab === 'inbox' && (
            <motion.div layoutId="contributorActiveTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
          )}
        </button>

        <button 
          onClick={() => setActiveTab('leaderboard')}
          className={`pb-3 text-sm font-semibold relative transition cursor-pointer ${activeTab === 'leaderboard' ? 'text-indigo-400' : 'text-white/40 hover:text-white/70'}`}
        >
          Leaderboard & Achievements
          {activeTab === 'leaderboard' && (
            <motion.div layoutId="contributorActiveTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
          )}
        </button>

        <button 
          onClick={() => setActiveTab('repos')}
          className={`pb-3 text-sm font-semibold relative transition cursor-pointer ${activeTab === 'repos' ? 'text-indigo-400' : 'text-white/40 hover:text-white/70'}`}
        >
          Active Repositories
          {activeTab === 'repos' && (
            <motion.div layoutId="contributorActiveTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
          )}
        </button>
      </div>

      {/* Main Panel Content views */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'home' && (
              <div className="space-y-6">
                {/* Search, Filter & Sort Bar */}
                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-[#050506]/40 p-4 rounded-xl border border-white/5">
                  <div className="relative w-full lg:max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30" />
                    <input
                      type="text"
                      placeholder="Search my PRs (#number, branch name, title)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                    {/* Status filter tabs */}
                    <div className="flex items-center gap-1.5 bg-[#0a0a0b] p-1 border border-white/10 rounded-lg">
                      <button 
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition ${statusFilter === 'all' ? 'bg-white/5 text-white' : 'text-white/40 hover:text-white/60'}`}
                      >
                        All
                      </button>
                      <button 
                        onClick={() => setStatusFilter('needs_action')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition flex items-center gap-1 ${statusFilter === 'needs_action' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-white/40 hover:text-white/60'}`}
                      >
                        Needs Action
                      </button>
                      <button 
                        onClick={() => setStatusFilter('approved')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition ${statusFilter === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-white/40 hover:text-white/60'}`}
                      >
                        Approved
                      </button>
                      <button 
                        onClick={() => setStatusFilter('merged')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition ${statusFilter === 'merged' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-white/40 hover:text-white/60'}`}
                      >
                        Merged
                      </button>
                    </div>

                    {/* Sorting selector */}
                    <div className="flex items-center gap-2 bg-[#0a0a0b] px-3 py-2 border border-white/10 rounded-lg">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-white/40" />
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-transparent text-[10px] font-bold uppercase text-white/70 focus:outline-none cursor-pointer"
                      >
                        <option value="updatedAt">Last Updated</option>
                        <option value="lineCount">Line Count</option>
                        <option value="points">Points Awarded</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Pull Request Card Grid */}
                {filteredPrs.length === 0 ? (
                  <div className="text-center py-20 bg-[#050506]/30 rounded-2xl border border-dashed border-white/5">
                    <GitPullRequest className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <h3 className="text-sm font-semibold text-white/70">No Pull Requests Found</h3>
                    <p className="text-xs text-white/30 max-w-sm mx-auto mt-1">
                      You do not have any open or merged pull requests in this filter criteria. Check active repositories or submit a branch on GitHub!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPrs.map((pr) => {
                      const repo = repos.find(r => r.id === pr.repoId);
                      const isNeedsAction = pr.reviewStatus === 'changes_requested' || pr.isFlagged;
                      return (
                        <div 
                          key={pr.id}
                          onClick={() => onSelectPR(pr.id)}
                          className="bg-[#050506]/60 hover:bg-[#050506] border border-white/5 hover:border-white/10 p-5 rounded-xl transition cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden group shadow-lg"
                        >
                          <div className="flex items-start gap-4">
                            {/* Visual Status indicators */}
                            <div className="mt-1">
                              {pr.state === 'merged' ? (
                                <div className="bg-indigo-500/10 p-2.5 rounded-lg border border-indigo-500/20 text-indigo-400">
                                  <GitMerge className="w-5 h-5" />
                                </div>
                              ) : pr.isFlagged ? (
                                <div className="bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 text-red-500">
                                  <AlertTriangle className="w-5 h-5" />
                                </div>
                              ) : pr.reviewStatus === 'approved' ? (
                                <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 text-emerald-400">
                                  <CheckCircle className="w-5 h-5" />
                                </div>
                              ) : pr.reviewStatus === 'changes_requested' ? (
                                <div className="bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 text-amber-500">
                                  <XCircle className="w-5 h-5" />
                                </div>
                              ) : (
                                <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 text-white/40">
                                  <Clock className="w-5 h-5" />
                                </div>
                              )}
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold font-mono text-white/30">{repo ? `${repo.owner}/${repo.name}` : 'Unknown Repository'}</span>
                                <span className="text-[10px] font-bold font-mono text-indigo-400">#{pr.number}</span>
                                {pr.state === 'merged' ? (
                                  <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-bold uppercase">Merged</span>
                                ) : isNeedsAction ? (
                                  <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Revisions Needed
                                  </span>
                                ) : pr.reviewStatus === 'approved' ? (
                                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase">Ready to Merge</span>
                                ) : (
                                  <span className="text-[9px] bg-white/5 text-white/50 border border-white/10 px-1.5 py-0.5 rounded font-bold uppercase">Awaiting Assessment</span>
                                )}
                              </div>
                              <h3 className="text-sm font-semibold text-white group-hover:text-indigo-400 transition pr-8">{pr.title}</h3>
                              
                              <div className="flex items-center gap-3.5 text-xs text-white/40 pt-1">
                                <span className="flex items-center gap-1 font-mono text-[10px]">
                                  <FileCode className="w-3.5 h-3.5 text-white/30" /> {pr.lineCount || 0} lines changed
                                </span>
                                <span className="text-white/10">•</span>
                                <span className="text-[10px]">Updated {new Date(pr.updatedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 self-stretch md:self-auto justify-between md:justify-end">
                            {/* Score Meter / Quality Score badge */}
                            <div className="text-left md:text-right">
                              <span className="text-[9px] uppercase font-bold text-white/30 tracking-wider block font-mono">Quality Assessment</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="w-16 bg-white/5 h-1.5 rounded-full overflow-hidden hidden sm:block border border-white/5">
                                  <div 
                                    className={`h-full ${pr.confidenceScore >= 80 ? 'bg-emerald-500' : pr.confidenceScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${pr.confidenceScore}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-bold font-mono text-white/80">{pr.confidenceScore}%</span>
                              </div>
                            </div>

                            {/* Points badge indicator */}
                            <div className="flex items-center gap-3.5">
                              {pr.pointsAwarded > 0 && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1 text-center">
                                  <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block font-mono">Awarded</span>
                                  <span className="text-xs font-bold font-mono text-amber-400">+{pr.pointsAwarded} XP</span>
                                </div>
                              )}
                              <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/60 group-hover:translate-x-1 transition" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* AI Review Inbox tab */}
            {activeTab === 'inbox' && (
              <div className="space-y-6">
                {/* Intro banner */}
                <div className="p-5 bg-indigo-950/20 border border-indigo-500/15 rounded-xl flex gap-4 items-start relative overflow-hidden">
                  <div className="p-2.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                    <Inbox className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Centralized AI Review Inbox</h3>
                    <p className="text-xs text-white/40 mt-1 leading-relaxed">
                      Every automated feedback, grading verdict, inline diagnostics warning, and confidence index compiled across all active client modules. Select items to address agent revisions immediately.
                    </p>
                  </div>
                </div>

                {/* Inbox filter toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#050506]/40 p-4 rounded-xl border border-white/5">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      placeholder="Filter by title, repo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-[#0a0a0b] p-1 border border-white/10 rounded-lg overflow-x-auto self-stretch sm:self-auto">
                    <button 
                      onClick={() => setInboxFilter('all')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition shrink-0 ${inboxFilter === 'all' ? 'bg-white/5 text-white' : 'text-white/30 hover:text-white/50'}`}
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setInboxFilter('needs_action')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition shrink-0 ${inboxFilter === 'needs_action' ? 'bg-red-500/10 text-red-400' : 'text-white/30 hover:text-white/50'}`}
                    >
                      Needs Action
                    </button>
                    <button 
                      onClick={() => setInboxFilter('approved')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition shrink-0 ${inboxFilter === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'text-white/30 hover:text-white/50'}`}
                    >
                      Resolved
                    </button>
                    <button 
                      onClick={() => setInboxFilter('waiting_maintainer')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition shrink-0 ${inboxFilter === 'waiting_maintainer' ? 'bg-amber-500/10 text-amber-400' : 'text-white/30 hover:text-white/50'}`}
                    >
                      Wait Maintainer
                    </button>
                  </div>
                </div>

                {/* Inbox items list */}
                {aiInboxPrs.length === 0 ? (
                  <div className="text-center py-20 bg-[#050506]/30 rounded-2xl border border-dashed border-white/5">
                    <SlidersHorizontal className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <h3 className="text-sm font-semibold text-white/70">No reviews match filter</h3>
                    <p className="text-xs text-white/30 mt-1">Try relaxing your search query or selected status filter.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5 border border-white/5 bg-[#050506]/30 rounded-xl overflow-hidden shadow-2xl">
                    {aiInboxPrs.map((pr) => {
                      const repo = repos.find(r => r.id === pr.repoId);
                      const isNeedsAction = pr.reviewStatus === 'changes_requested' || pr.isFlagged;
                      return (
                        <div 
                          key={pr.id}
                          onClick={() => onSelectPR(pr.id)}
                          className="p-5 hover:bg-white/[0.01] transition flex flex-col md:flex-row justify-between gap-4 items-start md:items-center cursor-pointer group"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">{repo ? `${repo.owner}/${repo.name}` : 'Repository'}</span>
                              <span className="text-white/10 text-xs">•</span>
                              <span className="text-[10px] font-mono text-indigo-400 font-bold">PR #{pr.number}</span>
                              <span className="text-white/10 text-xs">•</span>
                              <span className="text-[10px] text-white/40">Author: @{pr.author}</span>
                            </div>

                            <h4 className="text-sm font-semibold text-white group-hover:text-indigo-400 transition">{pr.title}</h4>
                            
                            {/* Short excerpt snippet */}
                            <p className="text-xs text-white/30 line-clamp-1 max-w-2xl font-sans mt-1">
                              {pr.body || "No pull request description provided."}
                            </p>
                          </div>

                          <div className="flex items-center gap-6 shrink-0 w-full md:w-auto justify-between md:justify-end border-t border-white/5 pt-3 md:pt-0 md:border-0">
                            {/* Score progress slider */}
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="text-[9px] font-bold text-white/30 font-mono block uppercase">Verdict Rating</span>
                                <span className={`text-xs font-bold font-mono ${pr.confidenceScore >= 80 ? 'text-emerald-400' : pr.confidenceScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                                  {pr.confidenceScore}% Quality
                                </span>
                              </div>

                              <div className="w-12 h-12 rounded-full border-2 border-white/5 flex items-center justify-center relative p-1 shrink-0">
                                <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30"></div>
                                <span className="text-[10px] font-mono font-bold text-white/80">{pr.confidenceScore}</span>
                              </div>
                            </div>

                            {/* Status label tag */}
                            <div className="flex items-center gap-3">
                              {pr.state === 'merged' ? (
                                <span className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase">Merged</span>
                              ) : pr.isFlagged ? (
                                <span className="px-2.5 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold uppercase flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Flagged
                                </span>
                              ) : pr.reviewStatus === 'changes_requested' ? (
                                <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold uppercase">Revisions</span>
                              ) : pr.reviewStatus === 'approved' ? (
                                <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">Approved</span>
                              ) : (
                                <span className="px-2.5 py-1 rounded bg-white/5 text-white/40 border border-white/10 text-[10px] font-bold uppercase">Assessing</span>
                              )}
                              <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-indigo-400 group-hover:translate-x-1 transition" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Leaderboard tab */}
            {activeTab === 'leaderboard' && (
              <div className="space-y-6">
                <LeaderboardView />
              </div>
            )}

            {/* Repositories Tab */}
            {activeTab === 'repos' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {repos.length === 0 ? (
                    <div className="col-span-full text-center py-20 bg-[#050506]/30 rounded-2xl border border-dashed border-white/5">
                      <FolderGit2 className="w-12 h-12 text-white/10 mx-auto mb-4" />
                      <h3 className="text-sm font-semibold text-white/70">No Repositories Connected</h3>
                      <p className="text-xs text-white/30 max-w-sm mx-auto mt-1">
                        There are no active repositories on the platform. Please notify your Maintainer to connect repositories from the Admin Console!
                      </p>
                    </div>
                  ) : (
                    repos.map(repo => {
                      const repoPrs = prs.filter(p => p.repoId === repo.id);
                      const openCount = repoPrs.filter(p => p.state === 'open').length;
                      const mergedCount = repoPrs.filter(p => p.state === 'merged').length;

                      return (
                        <div key={repo.id} className="bg-[#050506]/60 border border-white/5 p-5 rounded-xl space-y-4 hover:border-white/15 transition relative overflow-hidden group shadow-md">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-mono text-white/30 uppercase block tracking-wider">{repo.owner}</span>
                              <h3 className="text-md font-bold text-white mt-0.5 group-hover:text-indigo-400 transition font-serif italic">{repo.name}</h3>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/5 text-white/60">
                              {repo.language || 'Codebase'}
                            </span>
                          </div>

                          <p className="text-xs text-white/40 line-clamp-2 leading-relaxed min-h-8 font-sans">
                            {repo.description || 'No summary description loaded for this source directory repository.'}
                          </p>

                          <div className="flex items-center justify-between border-t border-white/5 pt-4 text-xs font-mono text-white/30">
                            <div>
                              <span className="text-white/70 font-semibold">{openCount}</span> open PRs
                            </div>
                            <span className="text-white/10">•</span>
                            <div>
                              <span className="text-white/70 font-semibold">{mergedCount}</span> merged
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Notifications Drawer slideover */}
      <AnimatePresence>
        {isNotifOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNotifOpen(false)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />

            {/* Slideover panel */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0a0a0b] border-l border-white/10 z-50 flex flex-col shadow-2xl p-6"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">Notification Feed</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-mono">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllNotificationsAsRead}
                      className="text-[10px] uppercase font-bold text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                  <button 
                    onClick={() => setIsNotifOpen(false)}
                    className="text-xs text-white/40 hover:text-white transition cursor-pointer px-2 py-1 bg-white/5 rounded-md hover:bg-white/10"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Feed items */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-2">
                {notifications.length === 0 ? (
                  <div className="text-center py-20 text-white/30 text-xs">
                    <Bell className="w-8 h-8 text-white/10 mx-auto mb-3" />
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const iconColor = 
                      notif.type === 'approved' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                      notif.type === 'changes_requested' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                      notif.type === 'merge_completed' ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' :
                      'text-white/40 bg-white/5 border-white/10';

                    return (
                      <div 
                        key={notif.id}
                        onClick={() => {
                          handleMarkSingleRead(notif.id);
                          setIsNotifOpen(false);
                          if (notif.prId) {
                            onSelectPR(notif.prId);
                          }
                        }}
                        className={`p-3.5 rounded-lg border text-left transition cursor-pointer relative overflow-hidden flex gap-3 ${
                          notif.isRead 
                            ? 'bg-white/[0.01] border-white/5 hover:bg-white/[0.02] text-white/60' 
                            : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05] text-white'
                        }`}
                      >
                        {!notif.isRead && (
                          <span className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        )}

                        <div className={`p-1.5 rounded shrink-0 h-fit ${iconColor}`}>
                          <GitPullRequest className="w-4 h-4" />
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-xs font-bold font-sans">{notif.title}</h4>
                          <p className="text-[11px] text-white/40 leading-relaxed font-sans">{notif.message}</p>
                          <span className="text-[9px] font-mono text-white/30 block pt-1">
                            {new Date(notif.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
