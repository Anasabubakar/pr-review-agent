import React, { useState, useEffect } from 'react';
import { SystemSettings } from '../types.js';
import { 
  Settings, 
  Sparkles, 
  Sliders, 
  Coins, 
  Save, 
  CheckCircle2,
  Lock,
  ExternalLink,
  Github
} from 'lucide-react';

interface SettingsViewProps {
  user?: any;
  onUserUpdate?: (user: any) => void;
}

export function SettingsView({ user, onUserUpdate }: SettingsViewProps) {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // GitHub token state
  const [githubToken, setGithubToken] = useState('');
  const [updatingToken, setUpdatingToken] = useState(false);
  const [tokenSuccess, setTokenSuccess] = useState(false);
  const [tokenError, setTokenError] = useState('');

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        fetchSettings();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubToken.trim()) return;

    setUpdatingToken(true);
    setTokenError('');
    setTokenSuccess(false);

    try {
      const res = await fetch('/api/auth/pat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: githubToken })
      });

      const data = await res.json();

      if (res.ok && data.user) {
        setTokenSuccess(true);
        setGithubToken('');
        if (onUserUpdate) {
          onUserUpdate(data.user);
        }
        setTimeout(() => setTokenSuccess(false), 3000);
      } else {
        setTokenError(data.error || 'Failed to authenticate token with GitHub.');
      }
    } catch (err) {
      console.error(err);
      setTokenError('Network error connecting to GitHub. Verify backend connection.');
    } finally {
      setUpdatingToken(false);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/20"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-[#050506] border border-white/10 rounded-xl p-6 flex items-start gap-4 flex-wrap shadow-2xl">
        <Settings className="w-10 h-10 text-white/50 shrink-0" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white tracking-tight font-serif italic">System Configuration Settings</h2>
          <p className="text-xs text-white/40 leading-relaxed max-w-2xl font-sans">
            Fine-tune global variables, developer prompt instructions, and point gamification distributions across all indexed code repositories.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-indigo-500/5 border border-indigo-500/20 text-indigo-300 rounded-lg p-3 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          <span>System configuration saved successfully. Re-running workflows immediately utilizes updated parameters.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core settings */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          <div className="bg-[#050506] border border-white/10 rounded-xl p-6 space-y-5 shadow-2xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5 border-b border-white/5 pb-3 font-mono">
              <Sparkles className="w-4 h-4 text-white/60" /> Prompt Customizer (Gemini System Instruction)
            </h3>
            
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-white/40 uppercase font-mono">Model System Instructions</label>
              <textarea
                value={settings.aiPromptTemplate}
                onChange={(e) => setSettings({ ...settings, aiPromptTemplate: e.target.value })}
                className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg p-4 font-mono text-xs text-white focus:outline-none focus:border-white/25 leading-relaxed"
                rows={8}
                required
              />
              <p className="text-[10px] text-white/30 leading-normal font-sans">
                Enforcing clear categorical constraints guarantees optimal structured analysis outputs from the Gemini model. Try to retain definitions for score, inlineComments, and decidedAction.
              </p>
            </div>
          </div>

          <div className="bg-[#050506] border border-white/10 rounded-xl p-6 space-y-5 shadow-2xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5 border-b border-white/5 pb-3 font-mono">
              <Sliders className="w-4 h-4 text-white/60" /> General Controls & Webhooks
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-white/40 uppercase font-mono">Model Selector</label>
                <select
                  value={settings.aiModel}
                  onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
                  className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg p-2.5 text-white/80 focus:outline-none"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Highest speed/low cost)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro (Advanced complex analysis)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-white/40 uppercase font-mono">Review Strictness Gate</label>
                <select
                  value={settings.reviewStrictness}
                  onChange={(e) => setSettings({ ...settings, reviewStrictness: e.target.value as any })}
                  className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg p-2.5 text-white/80 focus:outline-none"
                >
                  <option value="lenient">Lenient (Merge minor logic warnings)</option>
                  <option value="standard">Standard (Standard security safeguards)</option>
                  <option value="strict">Strict (Flag all logic issues/warnings)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-white/40 uppercase font-mono">Webhook Handshake Secret</label>
                <input
                  type="text"
                  value={settings.webhookSecret}
                  onChange={(e) => setSettings({ ...settings, webhookSecret: e.target.value })}
                  className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg p-2.5 text-white font-mono focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-white/40 uppercase font-mono">Default Merge Policy</label>
                <select
                  value={settings.autoMergeDefault ? 'true' : 'false'}
                  onChange={(e) => setSettings({ ...settings, autoMergeDefault: e.target.value === 'true' })}
                  className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg p-2.5 text-white/80 focus:outline-none"
                >
                  <option value="true">Enable Auto-Merge On Approved PRs</option>
                  <option value="false">Hold Auto-Merge (Manual Maintainer Dispatch)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-[#050506] border border-white/10 rounded-xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5 border-b border-white/5 pb-3 font-mono">
              <Coins className="w-4.5 h-4.5 text-amber-400" /> Point Settings
            </h3>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-white/40 uppercase font-mono">Awarded Points per Clean Merge</label>
                <input
                  type="number"
                  value={settings.pointsOnMerge}
                  onChange={(e) => setSettings({ ...settings, pointsOnMerge: parseInt(e.target.value, 10) || 15 })}
                  className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg p-2.5 text-white font-mono focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-lg shadow-indigo-500/10 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving Configurations...' : 'Commit Settings'}
          </button>
        </form>

        {/* GitHub Credential sidebar */}
        <div className="space-y-6">
          <div className="bg-[#050506] border border-white/10 rounded-xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5 border-b border-white/5 pb-3 font-mono">
              <Github className="w-4.5 h-4.5 text-indigo-400" /> GitHub Credentials
            </h3>

            {user && user.githubToken ? (
              <div className="space-y-3">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    GitHub Access Active
                  </div>
                  <div className="text-[11px] text-white/60 font-mono">
                    Username: <span className="text-white font-semibold">@{user.githubUsername}</span>
                  </div>
                  <div className="text-[10px] text-white/40 leading-relaxed font-sans">
                    A secure Personal Access Token is securely stored and configured to listen for PR commits and synchronize review threads.
                  </div>
                </div>

                <div className="border-t border-white/5 pt-3">
                  <span className="text-[10px] font-bold text-white/40 uppercase font-mono block mb-2">Change Token</span>
                </div>
              </div>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-xs space-y-1 text-amber-400">
                <p className="font-semibold">Credentials Missing</p>
                <p className="text-[10px] text-white/60 leading-relaxed font-sans">
                  Onboard a GitHub Personal Access Token to synchronize real pull request data and reviews.
                </p>
              </div>
            )}

            <form onSubmit={handleUpdateToken} className="space-y-3 text-xs pt-1">
              {tokenSuccess && (
                <div className="bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 rounded p-2 text-[11px] leading-relaxed">
                  Token validated and successfully connected!
                </div>
              )}
              {tokenError && (
                <div className="bg-red-500/15 border border-red-500/20 text-red-400 rounded p-2 text-[11px] leading-relaxed">
                  {tokenError}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-white/40 uppercase font-mono">Personal Access Token (PAT)</label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg p-2.5 text-white font-mono focus:outline-none"
                  required
                />
              </div>

              <div className="text-[10px] text-white/30 leading-normal flex items-start gap-1">
                <Lock className="w-3.5 h-3.5 text-white/40 shrink-0 mt-0.5" />
                <span>
                  Requires `repo` scope permissions. Build a PAT inside <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-0.5">GitHub Developer Settings <ExternalLink className="w-2.5 h-2.5" /></a>
                </span>
              </div>

              <button
                type="submit"
                disabled={updatingToken || !githubToken.trim()}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-lg shadow-indigo-500/10 transition cursor-pointer"
              >
                {updatingToken ? 'Verifying...' : 'Link GitHub Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
