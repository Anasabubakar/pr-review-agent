import { useState, useEffect } from 'react';
import { 
  Terminal, 
  Play, 
  FileCode, 
  Activity, 
  HelpCircle, 
  ShieldAlert, 
  CheckCircle,
  Copy,
  Check
} from 'lucide-react';

interface WebhookEventLog {
  id: string;
  eventName: string;
  status: 'success' | 'failed' | 'ignored';
  response: string;
  timestamp: string;
}

export function WebhookSimulator({ onPrAdded }: { onPrAdded: () => void }) {
  const [activePreset, setActivePreset] = useState<string>('clean_refactor');
  const [payloadText, setPayloadText] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResponse, setSimResponse] = useState<any | null>(null);
  const [eventsList, setEventsList] = useState<WebhookEventLog[]>([]);
  const [activeTab, setActiveTab] = useState<'presets' | 'logs'>('presets');
  const [copied, setCopied] = useState(false);

  const presets = {
    clean_refactor: {
      title: "refactor: optimize caching lookup performance",
      body: "Implements local optimization and updates redis connections limits to speed up caching queries.",
      diff: "diff --git a/src/cache/redis.ts b/src/cache/redis.ts\nindex f82b7cd..90df930 100644\n--- a/src/cache/redis.ts\n+++ b/src/cache/redis.ts\n@@ -10,4 +10,4 @@\n-await this.client.set(key, val);\n+await this.client.set(key, val, 'EX', 3600); // Added default 1 hr expiration\n",
      author: "hacker_clara",
      lines: 15
    },
    sensitive_path: {
      title: "feat: Add custom Stripe payment webhooks",
      body: "Connects production Stripe handlers to update memberships structures in database.",
      diff: "diff --git a/src/routes/payments.ts b/src/routes/payments.ts\nnew file mode 100644\nindex 0000000..ef2b7cb\n--- /dev/null\n+++ b/src/routes/payments.ts\n@@ -0,0 +1,15 @@\n+import express from 'express';\n+const router = express.Router();\n+router.post('/stripe-webhook', (req, res) => {\n+  const signature = req.headers['stripe-signature'];\n+  // CRITICAL: Bypassed signature validation for debugging?\n+  const event = req.body;\n+  res.json({ received: true });\n+});\n",
      author: "dev_alex_99",
      lines: 45
    },
    secret_exposure: {
      title: "fix: AWS s3 connection parameters configurations",
      body: "Sets AWS client buckets for image uploads.",
      diff: "diff --git a/src/config/s3.ts b/src/config/s3.ts\nindex 0000000..f9247cd\n--- a/src/config/s3.ts\n+++ b/src/config/s3.ts\n@@ -5,4 +5,4 @@\n-const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;\n+const AWS_SECRET_KEY = \"AKIA_fallback_secret_prod_key_18214\"; // Backup token\n",
      author: "buggy_bob",
      lines: 20
    },
    deleted_tests: {
      title: "chore: cleanup deprecations and dead code files",
      body: "Cleans old modules to speed up runtime container loads.",
      diff: "diff --git a/src/tests/math.test.ts b/src/tests/math.test.ts\ndeleted file mode 100644\nindex d92bc11..0000000\n--- a/src/tests/math.test.ts\n+++ /dev/null\n@@ -1,15 +0,0 @@\n-describe('Math validations', () => {\n-  test('bounds check', () => {\n-    expect(1+1).toBe(2);\n-  });\n-});\n",
      author: "careless_dan",
      lines: 180
    },
    large_changes: {
      title: "feat: Add core monolithic dashboard structures",
      body: "Massive dump of structural templates, helpers, models, and dashboard pages.",
      diff: "diff --git a/src/components/BigDashboard.tsx b/src/components/BigDashboard.tsx\nnew file mode 100644\nindex 0000000..df1bc9b\n--- /dev/null\n+++ b/src/components/BigDashboard.tsx\n@@ -0,0 +1,350 @@\n+export function BigDashboard() {\n+  return (\n+    <div>\n+      <h1>A massive code block loaded in one pull request...</h1>\n+      {/* 350+ lines of additional frontend clutter */}\n+    </div>\n+  );\n+}\n",
      author: "careless_dan",
      lines: 385
    }
  };

  const loadPresetPayload = (key: string) => {
    const selected = (presets as any)[key];
    if (!selected) return;
    
    const payload = {
      action: "opened",
      pull_request: {
        number: Math.floor(Math.random() * 200) + 120,
        title: selected.title,
        body: selected.body,
        html_url: `https://github.com/expressjs/node-microservices-core/pull/${Math.floor(Math.random() * 200) + 120}`,
        user: {
          login: selected.author,
          avatar_url: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80`
        },
        head: { ref: "simulate/patch-sandbox" },
        base: { ref: "main" }
      },
      repository: {
        owner: { login: "expressjs" },
        name: "node-microservices-core",
        default_branch: "main",
        language: "TypeScript",
        description: "High performance enterprise framework built with Express routing conventions."
      },
      diff: selected.diff
    };

    setPayloadText(JSON.stringify(payload, null, 2));
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/webhooks/events');
      if (res.ok) {
        const data = await res.json();
        setEventsList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadPresetPayload(activePreset);
  }, [activePreset]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const triggerSimulation = async () => {
    setIsSimulating(true);
    setSimResponse(null);
    try {
      const res = await fetch('/api/webhooks/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: activePreset })
      });

      if (res.ok) {
        const result = await res.json();
        setSimResponse(result);
        onPrAdded();
        fetchEvents();
      }
    } catch (err: any) {
      setSimResponse({ error: err.message });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(payloadText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Explanation banner */}
      <div className="bg-[#050506] border border-white/10 rounded-xl p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2 font-serif italic">
          <Activity className="w-5 h-5 text-white/50" /> Interactive Webhook Simulator
        </h2>
        <p className="text-xs text-white/40 mt-1.5 leading-relaxed max-w-3xl font-sans">
          Since setting up a real GitHub App webhook requires public routing, we built this state simulator.
          It feeds realistic PR payloads directly through our webhook engine, triggering the real-time Gemini AI review pipeline and safety rules evaluator.
        </p>
      </div>

      <div className="flex border-b border-white/5 bg-[#050506] px-4">
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex items-center gap-2 px-4 py-3.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'presets' 
              ? 'border-indigo-500 text-indigo-400' 
              : 'border-transparent text-white/40 hover:text-white/80'
          }`}
        >
          <FileCode className="w-4 h-4" /> Preset Scenarios
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-3.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'logs' 
              ? 'border-indigo-500 text-indigo-400' 
              : 'border-transparent text-white/40 hover:text-white/80'
          }`}
        >
          <Terminal className="w-4 h-4" /> Webhook logs history ({eventsList.length})
        </button>
      </div>

      {activeTab === 'presets' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Presets List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2 block font-mono">Choose PR Preset</h3>
            
            <button
              onClick={() => setActivePreset('clean_refactor')}
              className={`w-full text-left p-4 rounded-xl border transition cursor-pointer ${
                activePreset === 'clean_refactor' 
                  ? 'bg-white/10 border-white/20 text-white' 
                  : 'bg-[#0a0a0b] border-white/5 text-white/40 hover:bg-white/[0.01] hover:text-white/70'
              }`}
            >
              <h4 className="font-semibold text-sm text-white/90">1. Clean Optimizations</h4>
              <p className="text-xs text-white/40 mt-1 font-sans">Refactors local cache with explicit TTL. Passes all checks and triggers auto-merge!</p>
            </button>

            <button
              onClick={() => setActivePreset('sensitive_path')}
              className={`w-full text-left p-4 rounded-xl border transition cursor-pointer ${
                activePreset === 'sensitive_path' 
                  ? 'bg-white/10 border-white/20 text-white' 
                  : 'bg-[#0a0a0b] border-white/5 text-white/40 hover:bg-white/[0.01] hover:text-white/70'
              }`}
            >
              <h4 className="font-semibold text-sm text-white/90">2. Stripe payments bypass</h4>
              <p className="text-xs text-white/40 mt-1 font-sans">Touches payments router without verifying webhook signatures. Flags for human verification!</p>
            </button>

            <button
              onClick={() => setActivePreset('secret_exposure')}
              className={`w-full text-left p-4 rounded-xl border transition cursor-pointer ${
                activePreset === 'secret_exposure' 
                  ? 'bg-white/10 border-white/20 text-white' 
                  : 'bg-[#0a0a0b] border-white/5 text-white/40 hover:bg-white/[0.01] hover:text-white/70'
              }`}
            >
              <h4 className="font-semibold text-sm text-white/90">3. Plain AWS credentials</h4>
              <p className="text-xs text-white/40 mt-1 font-sans">Exposes hardcoded AWS fallback key. Triggers security overrides instantly!</p>
            </button>

            <button
              onClick={() => setActivePreset('deleted_tests')}
              className={`w-full text-left p-4 rounded-xl border transition cursor-pointer ${
                activePreset === 'deleted_tests' 
                  ? 'bg-white/10 border-white/20 text-white' 
                  : 'bg-[#0a0a0b] border-white/5 text-white/40 hover:bg-white/[0.01] hover:text-white/70'
              }`}
            >
              <h4 className="font-semibold text-sm text-white/90">4. Test Suite Deletion</h4>
              <p className="text-xs text-white/40 mt-1 font-sans">Removes high density math coverage tests. Blocked by pipeline safeguards.</p>
            </button>

            <button
              onClick={() => setActivePreset('large_changes')}
              className={`w-full text-left p-4 rounded-xl border transition cursor-pointer ${
                activePreset === 'large_changes' 
                  ? 'bg-white/10 border-white/20 text-white' 
                  : 'bg-[#0a0a0b] border-white/5 text-white/40 hover:bg-white/[0.01] hover:text-white/70'
              }`}
            >
              <h4 className="font-semibold text-sm text-white/90">5. Monolithic Code Change</h4>
              <p className="text-xs text-white/40 mt-1 font-sans">PR size changes more than 200 lines. Flags for human maintainer.</p>
            </button>
          </div>

          {/* Code JSON view & simulation triggers */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#050506] border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[350px]">
              <div className="bg-white/[0.02] px-4 py-2 flex items-center justify-between border-b border-white/5">
                <span className="text-xs font-mono text-white/60">mock_github_payload.json</span>
                <button
                  onClick={handleCopy}
                  className="text-white/40 hover:text-white/80 transition p-1 cursor-pointer"
                  title="Copy payload"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <textarea
                value={payloadText}
                readOnly
                className="flex-1 bg-[#0a0a0b] font-mono text-[10px] text-white/70 p-4 outline-none resize-none overflow-y-auto leading-relaxed select-all"
              />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
              <button
                onClick={triggerSimulation}
                disabled={isSimulating}
                className="px-6 py-3 font-semibold text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg shadow-lg shadow-indigo-500/10 transition flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                {isSimulating ? 'Processing review pipeline...' : 'Dispatch Webhook Payload'}
              </button>
            </div>

            {/* Simulation Response Output Console */}
            {simResponse && (
              <div className="bg-[#050506] border border-white/10 p-5 rounded-xl space-y-3 animate-slide-down shadow-2xl">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5 border-b border-white/5 pb-2 font-mono">
                  <Terminal className="w-4 h-4 text-emerald-400" /> Ingestion Pipeline Console Output
                </h4>
                {simResponse.success ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      <span>Webhook parsed successfully! Ingested PR #{simResponse.prId}</span>
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="text-white/50">
                        • Decision Action Verdict: <span className="font-mono text-white/80 uppercase font-bold">{simResponse.reviewStatus}</span>
                      </p>
                      {simResponse.reviewStatus === 'flagged' && (
                        <p className="text-red-400/90 font-semibold font-sans">
                          • Triggered Safety overrides block auto-merge!
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-red-400 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Error processing simulator payload: {simResponse.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-[#050506] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-white/5 bg-white/[0.01]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block font-mono">Deliveries Ledger</span>
          </div>
          {eventsList.length === 0 ? (
            <div className="text-center py-16 text-white/20 text-xs">
              No webhook events ingested yet. Use the presets simulator tab to trigger payloads!
            </div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
              {eventsList.map((evt) => (
                <div key={evt.id} className="p-4 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono bg-[#0a0a0b] border border-white/10 px-1.5 py-0.5 rounded text-indigo-300">
                        {evt.eventName}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                        evt.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : evt.status === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-white/5 text-white/40'
                      }`}>
                        {evt.status}
                      </span>
                    </div>
                    <p className="text-white/50 font-sans">{evt.response}</p>
                  </div>
                  <span className="text-[10px] text-white/30 font-mono">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
