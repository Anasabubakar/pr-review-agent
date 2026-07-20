import React, { useState, useEffect, useRef } from 'react';
import { PullRequest, Review, ChatMessage, OverrideRule } from '../types.js';
import { 
  GitPullRequest, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  ShieldAlert, 
  CornerDownRight, 
  Send, 
  User, 
  Bot, 
  History, 
  FileText, 
  Code, 
  Sparkles,
  GitMerge,
  Eye,
  UserCheck,
  Play,
  Settings,
  ArrowRight
} from 'lucide-react';

interface PRDetailViewProps {
  prId: string;
  onBack: () => void;
  refreshPRList: () => void;
  user: any;
}

export function PRDetailView({ prId, onBack, refreshPRList, user }: PRDetailViewProps) {
  const [pr, setPr] = useState<PullRequest | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [chatUser, setChatUser] = useState<'admin' | 'contributor'>(user?.role === 'admin' ? 'admin' : 'contributor');
  const [isSubmittingChat, setIsSubmittingChat] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'diff' | 'analysis' | 'replay'>('chat');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);

  // Review Replay Simulator States
  const [replays, setReplays] = useState<any[]>([]);
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayModel, setReplayModel] = useState('gemini-3.5-flash');
  const [replayPrompt, setReplayPrompt] = useState('Verify the security posture, credentials leaks, and potential out-of-bounds errors in this patch. Detail exact lines containing violations and suggest code replacements.');
  const [selectedReplayId, setSelectedReplayId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch PR full details
  const fetchDetails = async () => {
    try {
      const res = await fetch(`/api/prs/${prId}`);
      if (res.ok) {
        const data = await res.json();
        setPr(data.pr);
        setReview(data.review);
        setChat(data.chat);
      }
    } catch (err) {
      console.error("Error loading PR details:", err);
    }
  };

  // Fetch Replays list
  const fetchReplays = async () => {
    try {
      const res = await fetch(`/api/prs/${prId}/replays`);
      if (res.ok) {
        const data = await res.json();
        setReplays(data);
        if (data.length > 0 && !selectedReplayId) {
          setSelectedReplayId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching replays:", err);
    }
  };

  useEffect(() => {
    fetchDetails();
    fetchReplays();
    // Poll for new messages every 3 seconds to feel truly live!
    const interval = setInterval(fetchDetails, 3000);
    return () => clearInterval(interval);
  }, [prId]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    setIsSubmittingChat(true);
    try {
      const body = {
        sender: chatUser,
        senderName: chatUser === 'admin' ? `Maintainer (${user?.username || 'You'})` : `@${user?.username || 'user'}`,
        senderAvatar: chatUser === 'admin' 
          ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80'
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
        message: messageText
      };

      const res = await fetch(`/api/prs/${prId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setMessageText('');
        fetchDetails();
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setIsSubmittingChat(false);
    }
  };

  const triggerAction = async (action: 'approve' | 'request_changes' | 'merge') => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/prs/${prId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: actionNote })
      });

      if (res.ok) {
        setActionNote('');
        setShowOverrideDialog(false);
        fetchDetails();
        refreshPRList();
      }
    } catch (err) {
      console.error("Error committing review action:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Replay triggering action
  const handleTriggerReplay = async () => {
    setReplayLoading(true);
    try {
      const res = await fetch(`/api/prs/${prId}/replay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: replayModel,
          promptTemplate: replayPrompt
        })
      });

      if (res.ok) {
        const result = await res.json();
        setReplays(result.allReplays);
        setSelectedReplayId(result.replay.id);
        // Refresh the detail findings as well
        fetchDetails();
        refreshPRList();
      }
    } catch (err) {
      console.error("Error during review replay:", err);
    } finally {
      setReplayLoading(false);
    }
  };

  if (!pr) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/20"></div>
      </div>
    );
  }

  // Get status details
  const getStatusBadge = () => {
    switch (pr.reviewStatus) {
      case 'approved':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle className="w-3.5 h-3.5 mr-1" /> Approved</span>;
      case 'changes_requested':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20"><XCircle className="w-3.5 h-3.5 mr-1" /> Changes Requested</span>;
      case 'flagged':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><ShieldAlert className="w-3.5 h-3.5 mr-1" /> Flagged (Requires Human)</span>;
      default:
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-white/60 border border-white/10"><History className="w-3.5 h-3.5 mr-1" /> Pending AI Review</span>;
    }
  };

  const selectedReplay = replays.find(r => r.id === selectedReplayId);

  return (
    <div className="bg-[#050506] border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-fade-in">
      {/* PR Header Banner */}
      <div className="border-b border-white/5 bg-white/[0.01] p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-white/30">PR #{pr.number}</span>
              {getStatusBadge()}
              {pr.state === 'merged' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <GitMerge className="w-3 h-3 mr-1" /> Merged
                </span>
              )}
            </div>
            <h1 className="text-xl font-medium tracking-tight text-white/95 flex items-center gap-2 font-serif italic">
              <GitPullRequest className="w-5.5 h-5.5 text-white/50 shrink-0" />
              {pr.title}
            </h1>
            <div className="text-xs text-white/40 flex items-center gap-2 flex-wrap">
              <img src={pr.authorAvatar} alt={pr.author} className="w-5 h-5 rounded-full border border-white/10" />
              <span className="font-semibold text-white/70">@{pr.author}</span> wants to merge into{' '}
              <span className="font-mono bg-white/5 border border-white/5 text-white/80 px-1.5 py-0.5 rounded text-xs">{pr.baseRef}</span> from{' '}
              <span className="font-mono bg-white/5 border border-white/5 text-white/80 px-1.5 py-0.5 rounded text-xs">{pr.headRef}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button 
              onClick={onBack}
              className="px-4 py-2 text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/80 rounded-lg border border-white/10 transition cursor-pointer"
            >
              Back to Dashboard
            </button>
            {pr.state !== 'merged' && user?.role === 'admin' && (
              <button 
                onClick={() => setShowOverrideDialog(true)}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" /> Maintainer Override
              </button>
            )}
          </div>
        </div>

        {pr.body && (
          <div className="mt-5 bg-white/[0.01] border border-white/5 p-4 rounded-lg">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-1 font-mono">Description</span>
            <p className="text-xs text-white/70 leading-relaxed font-sans">{pr.body}</p>
          </div>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-white/5 bg-white/[0.01] px-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-3.5 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'chat' 
              ? 'border-indigo-500 text-indigo-400' 
              : 'border-transparent text-white/40 hover:text-white/80'
          }`}
        >
          <Bot className="w-4 h-4" /> Discord discussion
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex items-center gap-2 px-4 py-3.5 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'analysis' 
              ? 'border-indigo-500 text-indigo-400' 
              : 'border-transparent text-white/40 hover:text-white/80'
          }`}
        >
          <Sparkles className="w-4 h-4" /> AI review findings
        </button>
        <button
          onClick={() => setActiveTab('diff')}
          className={`flex items-center gap-2 px-4 py-3.5 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'diff' 
              ? 'border-indigo-500 text-indigo-400' 
              : 'border-transparent text-white/40 hover:text-white/80'
          }`}
        >
          <Code className="w-4 h-4" /> Code diff & comments
        </button>
        {user?.role === 'admin' && (
          <button
            onClick={() => {
              setActiveTab('replay');
              fetchReplays();
            }}
            className={`flex items-center gap-2 px-4 py-3.5 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'replay' 
                ? 'border-indigo-500 text-indigo-400' 
                : 'border-transparent text-white/40 hover:text-white/80'
            }`}
          >
            <History className="w-4 h-4" /> Review Replay Simulator
          </button>
        )}
      </div>

      {/* Override Action Dialogue */}
      {showOverrideDialog && (
        <div className="p-6 bg-[#0a0a0b] border-b border-white/10 animate-slide-down">
          <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2 font-serif italic">
            <UserCheck className="w-5 h-5 text-indigo-400" />
            Maintainer Quality Gate Control
          </h3>
          <p className="text-xs text-white/40 mb-4 font-sans">
            Bypass or enforce custom pull request status gates manually. This action overrides AI automation and updates the repository backlog instantly.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-white/40 mb-1 font-mono">Add Note / Reason</label>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="Describe why you are overriding this PR gate (e.g. verified bypass, safe fallback secret fixed, etc.)"
                className="w-full bg-[#050506] border border-white/10 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-white/20"
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerAction('approve')}
                  disabled={isActionLoading}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition disabled:opacity-50 cursor-pointer"
                >
                  Approve PR
                </button>
                <button
                  onClick={() => triggerAction('request_changes')}
                  disabled={isActionLoading}
                  className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg transition disabled:opacity-50 cursor-pointer"
                >
                  Request Revisions
                </button>
                <button
                  onClick={() => triggerAction('merge')}
                  disabled={isActionLoading}
                  className="px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  <GitMerge className="w-3.5 h-3.5" /> Merge & Award Points
                </button>
              </div>
              <button
                onClick={() => setShowOverrideDialog(false)}
                className="px-4 py-2 text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 rounded-lg transition cursor-pointer"
              >
                Cancel Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab Content */}
      <div className="p-6">
        {/* TAB 1: DISCORD STYLE CHAT */}
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Chat Window */}
            <div className="lg:col-span-3 flex flex-col h-[520px] bg-[#0a0a0b] border border-white/10 rounded-xl overflow-hidden">
              {/* Channel Header */}
              <div className="bg-white/[0.02] border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/80">
                  <span className="text-lg font-bold text-white/30 font-mono">#</span>
                  <span className="text-xs font-semibold font-mono">pr-discussion-ch{pr.number}</span>
                </div>
                {user?.role === 'admin' && (
                  <div className="flex items-center gap-2 bg-[#050506] border border-white/10 p-1 rounded-lg">
                    <button 
                      onClick={() => setChatUser('admin')}
                      className={`px-2.5 py-1 text-[10px] rounded transition font-bold uppercase cursor-pointer ${chatUser === 'admin' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/80'}`}
                    >
                      As Maintainer
                    </button>
                    <button 
                      onClick={() => setChatUser('contributor')}
                      className={`px-2.5 py-1 text-[10px] rounded transition font-bold uppercase cursor-pointer ${chatUser === 'contributor' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/80'}`}
                    >
                      As @{pr.author}
                    </button>
                  </div>
                )}
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chat.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-white/20">
                    <Bot className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-xs font-medium">Channel active. Type a message below to start chatting.</p>
                  </div>
                ) : (
                  chat.map((msg) => {
                    const isSystem = msg.isSystem;
                    const isAgent = msg.sender === 'agent';
                    
                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex items-start gap-3 bg-purple-500/5 border border-purple-500/10 p-3.5 rounded-lg text-white/70">
                          <GitMerge className="w-4.5 h-4.5 text-purple-400 shrink-0 mt-0.5" />
                          <div className="text-xs space-y-1">
                            <span className="font-mono text-white/20 block">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                            <p className="text-white/80 font-sans leading-relaxed">{msg.message}</p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className={`flex items-start gap-3 hover:bg-white/[0.01] p-2 rounded transition ${isAgent ? 'bg-indigo-500/5' : ''}`}>
                        <img 
                          src={msg.senderAvatar} 
                          alt={msg.senderName} 
                          className={`w-9 h-9 rounded-full shrink-0 border ${isAgent ? 'border-indigo-500/30 ring-2 ring-indigo-500/5' : 'border-white/10'}`} 
                        />
                        <div className="text-xs space-y-1 flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className={`font-semibold ${isAgent ? 'text-indigo-300 flex items-center gap-1 font-mono' : 'text-white/80'}`}>
                              {isAgent && <Bot className="w-3.5 h-3.5 text-indigo-400" />}
                              {msg.senderName}
                            </span>
                            <span className="text-[9px] text-white/30 font-mono">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-white/60 font-sans whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Send Form */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-[#050506] flex gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`Send message as ${chatUser === 'admin' ? 'Maintainer' : `@${pr.author}`}...`}
                  className="flex-1 bg-[#0a0a0b] border border-white/10 text-white rounded-lg px-4 py-2 text-xs focus:outline-none focus:border-white/20 placeholder-white/20"
                  disabled={isSubmittingChat}
                />
                <button
                  type="submit"
                  disabled={isSubmittingChat || !messageText.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg p-2.5 transition shrink-0 shadow-lg shadow-indigo-500/10 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Right Override Sidebar / Pipeline Rules checklist */}
            <div className="space-y-4">
              <div className="bg-[#0a0a0b] border border-white/10 p-5 rounded-xl space-y-3.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5 border-b border-white/5 pb-2 font-mono">
                  <ShieldAlert className="w-4 h-4 text-amber-500" /> Quality Evaluator
                </h4>
                {pr.isFlagged ? (
                  <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-lg text-xs text-amber-300/80 leading-relaxed font-sans">
                    <p className="font-semibold mb-1 text-amber-400">Safety Lock Enforced:</p>
                    {pr.flagReason}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-lg text-xs text-emerald-300 flex items-center gap-1.5 font-sans">
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Passed all pipeline checks. Merge approved!</span>
                  </div>
                )}
                
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/5 rounded">
                    <span className="text-white/40">Lines Changed</span>
                    <span className="font-mono text-white/70">{pr.lineCount} lines</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/5 rounded">
                    <span className="text-white/40">Sensitive Paths</span>
                    <span className="font-mono text-white/70">{pr.isFlagged && pr.flagReason.includes('sensitive') ? '🚨 TRIGGERED' : '✅ Safe'}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/5 rounded">
                    <span className="text-white/40">Secrets Detected</span>
                    <span className="font-mono text-white/70">{pr.isFlagged && pr.flagReason.includes('credentials') ? '🚨 TRIGGERED' : '✅ Clear'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0a0a0b] border border-white/10 p-5 rounded-xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5 border-b border-white/5 pb-2 font-mono">
                  <Sparkles className="w-4 h-4 text-indigo-400" /> AI Confidence Gauge
                </h4>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-white/40">Score</span>
                    <span className="font-bold font-mono text-white/80">{pr.confidenceScore}%</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${pr.confidenceScore >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                      style={{ width: `${pr.confidenceScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AI REVIEWS FINDINGS */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            {review ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Categorical Scores */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-[#0a0a0b] border border-white/10 p-5 rounded-xl space-y-4">
                    <div className="text-center pb-4 border-b border-white/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 font-mono">General Score</span>
                      <div className="text-4xl font-semibold font-serif italic text-white/90 mt-1">{review.score}/100</div>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 p-2.5 rounded">
                        <span className="font-semibold text-white/60">Decision Verdict</span>
                        <span className="font-mono font-bold text-white/80 uppercase">{review.decidedAction}</span>
                      </div>
                      <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 p-2.5 rounded">
                        <span className="font-semibold text-white/60">AI Confidence</span>
                        <span className="font-mono font-bold text-white/80">{review.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Narrative Details */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-[#0a0a0b] border border-white/10 p-6 rounded-xl space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-white/95 font-serif italic">Summary Evaluation</h3>
                      <p className="text-xs text-white/60 leading-relaxed font-sans">{review.summary}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="bg-white/[0.01] border border-white/5 p-4 rounded-lg space-y-1">
                        <h4 className="text-[10px] font-bold text-white/40 uppercase font-mono">Correctness</h4>
                        <p className="text-xs text-white/60 leading-relaxed">{review.correctness}</p>
                      </div>
                      <div className="bg-white/[0.01] border border-white/5 p-4 rounded-lg space-y-1">
                        <h4 className="text-[10px] font-bold text-white/40 uppercase font-mono">Security</h4>
                        <p className="text-xs text-white/60 leading-relaxed">{review.security}</p>
                      </div>
                      <div className="bg-white/[0.01] border border-white/5 p-4 rounded-lg space-y-1">
                        <h4 className="text-[10px] font-bold text-white/40 uppercase font-mono">Performance</h4>
                        <p className="text-xs text-white/60 leading-relaxed">{review.performance}</p>
                      </div>
                      <div className="bg-white/[0.01] border border-white/5 p-4 rounded-lg space-y-1">
                        <h4 className="text-[10px] font-bold text-white/40 uppercase font-mono">Maintainability</h4>
                        <p className="text-xs text-white/60 leading-relaxed">{review.maintainability}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-white/30">
                <Bot className="w-12 h-12 mx-auto mb-2 opacity-25" />
                <p>No active AI review generated yet. Trigger review simulation.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CODE DIFF AND COMMENTS */}
        {activeTab === 'diff' && (
          <div className="space-y-6">
            <div className="bg-[#0a0a0b] border border-white/10 rounded-xl overflow-hidden shadow-lg">
              <div className="bg-white/[0.02] border-b border-white/5 px-4 py-3 flex items-gap-2">
                <FileText className="w-4 h-4 text-white/40 mr-2" />
                <span className="text-xs font-mono text-white/60">pull_request_patch.diff</span>
              </div>
              <div className="font-mono text-xs overflow-x-auto p-4 bg-[#0a0a0b] text-white/60 space-y-1">
                {pr.diffText.split('\n').map((line, idx) => {
                  let lineClass = 'text-white/40';
                  if (line.startsWith('+') && !line.startsWith('+++')) {
                    lineClass = 'bg-emerald-500/5 text-emerald-400 border-l-2 border-emerald-500/30 pl-1.5';
                  } else if (line.startsWith('-') && !line.startsWith('---')) {
                    lineClass = 'bg-red-500/5 text-red-400 border-l-2 border-red-500/30 pl-1.5';
                  } else if (line.startsWith('@@')) {
                    lineClass = 'text-cyan-400 bg-cyan-500/5 py-0.5';
                  } else if (line.startsWith('diff --git')) {
                    lineClass = 'text-indigo-300 font-bold border-b border-white/5 pb-1 block mt-2';
                  }

                  return (
                    <div key={idx} className={`${lineClass} whitespace-pre-wrap py-0.5`}>
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inline AI review comments block */}
            {review && review.inlineComments.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Bot className="w-4 h-4 text-indigo-400" /> Inline Code Findings ({review.inlineComments.length})
                </h3>
                <div className="space-y-4">
                  {review.inlineComments.map((comment, index) => (
                    <div key={index} className="bg-[#0a0a0b] border border-white/10 rounded-xl p-5 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-[#050506] text-indigo-300 px-2 py-0.5 rounded border border-white/10">
                            {comment.file}:{comment.line}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            comment.type === 'issue' 
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                              : comment.type === 'warning' 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                              : 'bg-white/5 text-white/60 border border-white/10'
                          }`}>
                            {comment.type.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-white/70 leading-relaxed font-sans">{comment.comment}</p>

                      {comment.suggestion && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold text-white/40 uppercase flex items-center gap-1 font-mono">
                            <CornerDownRight className="w-3.5 h-3.5 text-indigo-400" /> Drop-in Suggested Replacement Fix:
                          </span>
                          <pre className="bg-[#050506] border border-white/5 text-emerald-400/90 text-xs p-3.5 rounded-lg font-mono overflow-x-auto leading-normal">
                            {comment.suggestion}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: REVIEW REPLAY SIMULATOR */}
        {activeTab === 'replay' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Replay Configurator Panel (Left) */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-[#0a0a0b] border border-white/10 p-5 rounded-xl space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5 border-b border-white/5 pb-2.5 font-mono">
                  <Settings className="w-4 h-4 text-indigo-400" /> Simulation Parameters
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/40 mb-1.5 font-mono">Select Reasoning Model</label>
                    <select
                      value={replayModel}
                      onChange={(e) => setReplayModel(e.target.value)}
                      className="w-full bg-[#050506] border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-white/20"
                    >
                      <option value="gemini-3.5-flash">Gemini 3.5 Flash (Default)</option>
                      <option value="gemini-3.5-pro">Gemini 3.5 Pro (Highest Reasoning)</option>
                      <option value="deepseek-r1">DeepSeek R1 (Analytical CoT)</option>
                      <option value="claude-3.5-sonnet">Claude 3.5 Sonnet (Legacy Compliance)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/40 mb-1.5 font-mono">Custom Prompt / Rules Override</label>
                    <textarea
                      value={replayPrompt}
                      onChange={(e) => setReplayPrompt(e.target.value)}
                      placeholder="Input custom review constraints..."
                      rows={5}
                      className="w-full bg-[#050506] border border-white/10 rounded-lg p-2.5 text-white/80 focus:outline-none focus:border-white/20 leading-relaxed font-sans"
                    />
                  </div>

                  <button
                    onClick={handleTriggerReplay}
                    disabled={replayLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#15151a] text-white rounded-lg py-2.5 font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/10"
                  >
                    {replayLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                        <span>Evaluating Replay...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 text-emerald-400" />
                        <span>Dispatch Review Replay</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick note card */}
              <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl text-[10px] text-white/40 leading-relaxed font-sans">
                <p className="font-bold mb-1 text-white/50">Why run simulation replays?</p>
                Re-triggering review engines with varying prompt configurations allows security architects to benchmark false-positive rates, optimize compliance checking rules, and test alternative AI models on historical data logs safely.
              </div>
            </div>

            {/* Replays Comparison & Log Ledger (Right) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#0a0a0b] border border-white/10 rounded-xl p-5 shadow-lg space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5 border-b border-white/5 pb-2.5 font-mono">
                  <History className="w-4 h-4 text-white/60" /> Simulation Replay Runs ({replays.length})
                </h3>

                {replays.length === 0 ? (
                  <div className="text-center py-16 text-white/20">
                    <History className="w-10 h-10 mx-auto mb-2 opacity-25" />
                    <p className="text-xs">No simulation records found for this pull request.</p>
                    <p className="text-[10px] text-white/10 mt-1">Configure parameters and dispatch your first replay on the left!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Replays list column (1/3 width) */}
                    <div className="md:col-span-1 space-y-2 border-r border-white/5 pr-2 max-h-[400px] overflow-y-auto">
                      {replays.map((rep) => {
                        const isSel = rep.id === selectedReplayId;
                        return (
                          <div
                            key={rep.id}
                            onClick={() => setSelectedReplayId(rep.id)}
                            className={`p-3 border rounded-lg cursor-pointer text-left transition ${
                              isSel 
                                ? 'bg-indigo-600/[0.04] border-indigo-500/40 text-white' 
                                : 'bg-transparent border-white/5 text-white/50 hover:border-white/15'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-mono font-bold uppercase text-indigo-400">{rep.model.split('-').pop()}</span>
                              <span className="text-[10px] font-mono font-bold text-emerald-400">{rep.score}/100</span>
                            </div>
                            <p className="font-bold text-xs mt-1 truncate leading-none text-white/80">{rep.decidedAction.replace('_', ' ').toUpperCase()}</p>
                            <span className="text-[8px] text-white/30 block mt-1.5 font-mono">{new Date(rep.createdAt).toLocaleTimeString()}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Replay findings display column (2/3 width) */}
                    <div className="md:col-span-2 space-y-4 text-left">
                      {selectedReplay ? (
                        <div className="space-y-4">
                          <div className="flex justify-between items-start border-b border-white/5 pb-3">
                            <div>
                              <h4 className="font-bold text-sm text-white/90">Simulated Quality Assessment</h4>
                              <p className="text-[10px] text-white/40 mt-0.5">Model: <span className="font-mono font-semibold text-white/60">{selectedReplay.model}</span></p>
                            </div>
                            <div className="bg-[#050506] border border-white/10 px-3 py-1.5 rounded-lg text-right shrink-0">
                              <span className="text-[8px] block font-bold font-mono text-white/30">CONFIDENCE</span>
                              <span className="text-sm font-bold font-mono text-white">{selectedReplay.confidence}%</span>
                            </div>
                          </div>

                          <div className="space-y-3.5 text-xs">
                            <div className="space-y-1">
                              <h5 className="font-bold text-white/50 font-serif italic text-xs">Simulation Verdict</h5>
                              <div className="bg-[#050506] border border-white/5 p-3 rounded-lg space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  {selectedReplay.decidedAction === 'approve' ? (
                                    <span className="text-emerald-400 font-bold uppercase font-mono text-[10px] flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Approve Code</span>
                                  ) : selectedReplay.decidedAction === 'flag' ? (
                                    <span className="text-amber-400 font-bold uppercase font-mono text-[10px] flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> Flag / Escalate</span>
                                  ) : (
                                    <span className="text-red-400 font-bold uppercase font-mono text-[10px] flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Request Revisions</span>
                                  )}
                                </div>
                                <p className="text-white/60 leading-relaxed font-sans text-[11px]">{selectedReplay.reason}</p>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <h5 className="font-bold text-white/50 font-serif italic text-xs">Summary Evaluation</h5>
                              <p className="text-white/60 leading-relaxed font-sans">{selectedReplay.summary}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1">
                              <div className="bg-white/[0.01] border border-white/5 p-3 rounded-lg space-y-1">
                                <span className="text-[9px] uppercase font-bold text-white/30 font-mono">Correctness Check</span>
                                <p className="text-white/60 text-[11px] leading-relaxed">{selectedReplay.correctness}</p>
                              </div>
                              <div className="bg-white/[0.01] border border-white/5 p-3 rounded-lg space-y-1">
                                <span className="text-[9px] uppercase font-bold text-white/30 font-mono">Security Scan</span>
                                <p className="text-white/60 text-[11px] leading-relaxed">{selectedReplay.security}</p>
                              </div>
                            </div>

                            {selectedReplay.promptTemplate && (
                              <div className="space-y-1 pt-1">
                                <h5 className="font-bold text-white/50 font-serif italic text-xs">Active Constraint Prompt</h5>
                                <p className="font-mono text-[9px] bg-[#050506] border border-white/5 p-3 rounded-lg text-indigo-300 leading-relaxed">{selectedReplay.promptTemplate}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-20 text-white/20">
                          <p className="text-xs">Select a simulation run from the list to view detailed findings.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
