import { useState, useEffect } from 'react';
import { OverrideRule } from '../types.js';
import { 
  ShieldAlert, 
  ToggleLeft, 
  ToggleRight, 
  Info, 
  Database, 
  Binary, 
  Key, 
  Gauge, 
  Trash2,
  CheckCircle2,
  Save
} from 'lucide-react';

export function RulesEditor() {
  const [rules, setRules] = useState<OverrideRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (err) {
      console.error("Error loading rules:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = async (id: string, isEnabled: boolean, value: string | number | boolean) => {
    try {
      const res = await fetch(`/api/rules/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled, value })
      });
      if (res.ok) {
        setSaveNotification(`Rule status updated successfully!`);
        setTimeout(() => setSaveNotification(null), 3000);
        fetchRules();
      }
    } catch (err) {
      console.error("Error updating rule toggle:", err);
    }
  };

  const handleValueChange = (id: string, value: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, value } : r));
  };

  const handleSaveValue = async (id: string, isEnabled: boolean, value: any) => {
    try {
      const numericVal = typeof value === 'string' && !isNaN(Number(value)) ? Number(value) : value;
      const res = await fetch(`/api/rules/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled, value: numericVal })
      });
      if (res.ok) {
        setSaveNotification("Rule threshold saved!");
        setTimeout(() => setSaveNotification(null), 3000);
        fetchRules();
      }
    } catch (err) {
      console.error("Error saving rule value:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/20"></div>
      </div>
    );
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security':
        return <Key className="w-5 h-5 text-amber-400" />;
      case 'size':
        return <Binary className="w-5 h-5 text-indigo-400" />;
      case 'contributor':
        return <Database className="w-5 h-5 text-emerald-400" />;
      case 'ci':
        return <Trash2 className="w-5 h-5 text-red-400" />;
      default:
        return <Info className="w-5 h-5 text-white/40" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Info Banner */}
      <div className="bg-[#050506] border border-white/10 rounded-xl p-6 flex items-start gap-4 flex-wrap shadow-2xl">
        <ShieldAlert className="w-10 h-10 text-white/50 shrink-0" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white tracking-tight font-serif italic">SaaS Override Rules Engine</h2>
          <p className="text-xs text-white/40 leading-relaxed max-w-2xl font-sans">
            Autonomous maintenance demands rigorous, ironclad bounds. Configured rules act as high-priority gates: if an incoming Pull Request triggers any enabled safety rule, the AI review auto-merge is locked, and the PR is flagged for manual maintainer screening.
          </p>
        </div>
      </div>

      {saveNotification && (
        <div className="bg-indigo-500/5 border border-indigo-500/20 text-indigo-300 rounded-lg p-3 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          <span>{saveNotification}</span>
        </div>
      )}

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rules.map((rule) => (
          <div 
            key={rule.id} 
            className={`bg-[#050506] border rounded-xl p-5 flex flex-col justify-between transition-all ${
              rule.isEnabled 
                ? 'border-white/10 shadow-2xl shadow-indigo-950/5' 
                : 'border-white/5 opacity-50'
            }`}
          >
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="bg-[#0a0a0b] p-2 rounded-lg border border-white/10 shrink-0">
                    {getCategoryIcon(rule.category)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white/90 leading-none">{rule.label}</h3>
                    <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider block mt-1.5 font-mono">{rule.category}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggle(rule.id, !rule.isEnabled, rule.value)}
                  className="text-white/40 hover:text-white transition cursor-pointer"
                >
                  {rule.isEnabled ? (
                    <ToggleRight className="w-9 h-9 text-indigo-400" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-white/20" />
                  )}
                </button>
              </div>

              <p className="text-xs text-white/40 leading-relaxed font-sans">{rule.description}</p>
            </div>

            {/* Threshold Values customization */}
            {rule.isEnabled && rule.type === 'number' && (
              <div className="mt-5 pt-4 border-t border-white/5 flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-white/40 uppercase mb-1 font-mono">Set Threshold Limit</label>
                  <input
                    type="number"
                    value={rule.value as number}
                    onChange={(e) => handleValueChange(rule.id, e.target.value)}
                    className="w-full bg-[#0a0a0b] border border-white/10 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-white/20"
                  />
                </div>
                <button
                  onClick={() => handleSaveValue(rule.id, rule.isEnabled, rule.value)}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 rounded-lg p-2.5 mt-4 transition self-end cursor-pointer"
                  title="Save threshold parameter"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
