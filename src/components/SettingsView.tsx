import React, { useState, useEffect } from 'react';
import { SystemSettings } from '../types.js';
import { 
  Settings, 
  Sparkles, 
  Sliders, 
  Coins, 
  Flame, 
  Lock, 
  HelpCircle,
  Save,
  CheckCircle2
} from 'lucide-react';

export function SettingsView() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core settings */}
        <div className="lg:col-span-2 space-y-6">
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
                  <option value="gemini-3.5-flash">gemini-3.5-flash (Highest speed/low cost)</option>
                  <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Advanced complex analysis)</option>
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
        </div>

        {/* Gamification point details */}
        <div className="space-y-6">
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

              <div className="p-3.5 bg-white/[0.01] border border-white/5 rounded-lg leading-relaxed text-white/40 text-[11px] space-y-2 font-sans">
                <p>
                  • **Streak Multipliers**: Consecutive clean daily merges boost contribution scores by a 1.5x multiplier.
                </p>
                <p>
                  • **Leaderboards Ranking**: Contributor standings automatically calculate total points, tracking badges, and achievement triggers.
                </p>
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
        </div>
      </form>
    </div>
  );
}
