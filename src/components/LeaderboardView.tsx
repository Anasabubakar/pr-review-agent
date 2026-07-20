import { useState, useEffect } from 'react';
import { ContributorPoint } from '../types.js';
import { 
  Trophy, 
  Flame, 
  Sparkles, 
  GitMerge, 
  Search, 
  Award,
  ChevronRight,
  TrendingUp,
  Star
} from 'lucide-react';

export function LeaderboardView() {
  const [leaders, setLeaders] = useState<ContributorPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterText, setFilterText] = useState('');

  const fetchLeaders = async () => {
    try {
      const res = await fetch('/api/points/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaders(data);
      }
    } catch (err) {
      console.error("Error loading points leaderboard:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaders();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/20"></div>
      </div>
    );
  }

  const filteredLeaders = leaders.filter(l => 
    l.username.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#050506] border border-white/10 rounded-xl p-5 flex items-center gap-4 shadow-2xl">
          <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 shrink-0">
            <Trophy className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block font-mono">Global Leader</span>
            <span className="text-lg font-semibold text-white/90 font-serif italic">@{leaders[0]?.username || 'N/A'}</span>
          </div>
        </div>

        <div className="bg-[#050506] border border-white/10 rounded-xl p-5 flex items-center gap-4 shadow-2xl">
          <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20 shrink-0">
            <Flame className="w-6 h-6 text-red-500 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block font-mono">Highest Streak</span>
            <span className="text-lg font-semibold text-white/90 font-serif italic">{Math.max(...leaders.map(l => l.streak || 0), 0)} Merges</span>
          </div>
        </div>

        <div className="bg-[#050506] border border-white/10 rounded-xl p-5 flex items-center gap-4 shadow-2xl">
          <div className="bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20 shrink-0">
            <GitMerge className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block font-mono">Total Merges Awarded</span>
            <span className="text-lg font-semibold text-white/90 font-serif italic">{leaders.reduce((acc, l) => acc + (l.prsMerged || 0), 0)} PRs</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Global Leaderboard Panel */}
        <div className="lg:col-span-2 bg-[#050506] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          {/* Header & Filter Search */}
          <div className="p-5 border-b border-white/5 flex items-center justify-between flex-wrap gap-3 bg-white/[0.01]">
            <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2 font-serif italic">
              <Star className="w-4 h-4 text-white/50" /> Global Standings
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search usernames..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="bg-[#0a0a0b] border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30 w-48"
              />
            </div>
          </div>

          {/* List content */}
          <div className="divide-y divide-white/5">
            {filteredLeaders.map((user, idx) => {
              const rank = idx + 1;
              const isTopThree = rank <= 3;
              const badgeColors = rank === 1 
                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' 
                : rank === 2 
                ? 'bg-white/10 text-white border border-white/20' 
                : 'bg-amber-700/10 text-amber-600 border border-amber-700/20';

              return (
                <div key={user.id} className="p-4 flex items-center justify-between flex-wrap gap-3 hover:bg-white/[0.01] transition">
                  <div className="flex items-center gap-4">
                    {/* Rank Indicator */}
                    <div className="w-8 flex justify-center">
                      {isTopThree ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${badgeColors}`}>{rank}</span>
                      ) : (
                        <span className="text-white/30 text-xs font-mono font-medium">{rank}</span>
                      )}
                    </div>

                    <img src={user.avatar} alt={user.username} className="w-10 h-10 rounded-full border border-white/10" />
                    <div>
                      <span className="text-sm font-bold text-white/80">@{user.username}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-white/40 flex items-center gap-1 font-sans">
                          <Flame className="w-3.5 h-3.5 text-red-500" /> {user.streak} Merge streak
                        </span>
                        <span className="text-white/20 text-[10px] font-mono">•</span>
                        <span className="text-[10px] text-white/40 font-sans">{user.prsMerged} PRs merged</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    {/* Achievements tags lists */}
                    <div className="hidden sm:flex items-center gap-1.5">
                      {user.achievements.slice(0, 2).map((ach, index) => (
                        <span key={index} className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 border border-white/5 text-white/40" title={ach}>
                          {ach}
                        </span>
                      ))}
                    </div>

                    <div className="text-right min-w-16">
                      <span className="text-sm font-semibold font-mono text-indigo-400 block">{user.points}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-white/30 font-mono">Pts</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contributor Milestones & Achievements Panel */}
        <div className="space-y-6">
          <div className="bg-[#050506] border border-white/10 p-5 rounded-xl space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-white/95 flex items-center gap-2 border-b border-white/5 pb-3 font-serif italic">
              <Award className="w-4.5 h-4.5 text-amber-400" /> Available Milestones
            </h3>
            
            <div className="space-y-3">
              <div className="p-3.5 bg-white/[0.01] border border-white/5 rounded-lg flex items-start gap-3 hover:border-white/10 transition">
                <div className="p-1.5 bg-indigo-500/10 rounded border border-indigo-500/20 shrink-0">
                  <Star className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-xs">
                  <h4 className="font-bold text-white/80">First Contribution</h4>
                  <p className="text-white/40 mt-0.5 leading-relaxed font-sans">Assigned instantly upon connecting your very first tracked Pull Request.</p>
                </div>
              </div>

              <div className="p-3.5 bg-white/[0.01] border border-white/5 rounded-lg flex items-start gap-3 hover:border-white/10 transition">
                <div className="p-1.5 bg-red-500/10 rounded border border-red-500/20 shrink-0">
                  <Flame className="w-4 h-4 text-red-500" />
                </div>
                <div className="text-xs">
                  <h4 className="font-bold text-white/80">Streak Master</h4>
                  <p className="text-white/40 mt-0.5 leading-relaxed font-sans">Awarded upon maintaining an active merge streak for 5 consecutive pull requests.</p>
                </div>
              </div>

              <div className="p-3.5 bg-white/[0.01] border border-white/5 rounded-lg flex items-start gap-3 hover:border-white/10 transition">
                <div className="p-1.5 bg-amber-500/10 rounded border border-amber-500/20 shrink-0">
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-xs">
                  <h4 className="font-bold text-white/80">Elite Contributor</h4>
                  <p className="text-white/40 mt-0.5 leading-relaxed font-sans">Obtained when hitting 100+ points on code merges and bug squashing.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
