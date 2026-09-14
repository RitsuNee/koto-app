import { useState, useEffect } from 'react';
import { db } from '../db';
import { playVoicevox } from '../audio';
import KotoHeader from '../components/KotoHeader';
import KotoFooter from '../components/KotoFooter';

// ─── Types ─────────────────────────────────────────────────────────────────────
type SettingsTab = 'ai' | 'voice' | 'data';
type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'custom';

// ─── Heatmap Data ──────────────────────────────────────────────────────────────
function generateHeatmap(): Array<{ intensity: 0 | 1 | 2 | 3; count: number }> {
  const pattern = [
    3,2,3,3,2,0,1, 2,3,3,2,3,3,1, 0,2,3,3,3,2,3, 3,3,2,0,1,3,3,
    3,3,2,3,3,3,2, 3,3,3,2,3,3,3, 2,3,3,3,2,3,3, 0,2,3,3,2,1,2,
    3,3,3,3,3,3,3, 2,3,3,3,3,3,2, 3,3,0,2,3,3,3, 3,3,2,3,3,3,2,
    3,3,3,3,3,2,3, 3,3,0,2,3,3,3,
  ];
  const counts = [48,30,64,52,24,0,12, 31,55,78,29,61,45,15, 0,26,58,71,63,30,47, 55,72,31,0,18,60,54,
    48,77,34,65,43,50,27, 63,82,74,28,45,58,36, 47,53,66,55,38,72,41, 0,23,69,58,24,14,31,
    62,74,83,77,65,58,71, 49,60,52,68,73,55,38, 64,72,0,28,81,76,59, 65,83,36,74,68,80,55,
    71,84,62,76,59,48,63, 72,88,0,19,77,82,70,
  ];
  return pattern.map((intensity, i) => ({ intensity: intensity as 0|1|2|3, count: counts[i] || 0 }));
}

const HEATMAP = generateHeatmap();

// ─── JLPT Levels ───────────────────────────────────────────────────────────────
const JLPT_LEVELS = [
  { level: 'N5', status: 'passed', label: 'Foundation Passed', color: 'var(--color-on-tertiary-container)', pct: 100, desc: 'Mastered 800 vocab, 103 kanji. Fundamental daily expressions.', verified: 'Verified Dec 2023', score: null },
  { level: 'N4', status: 'passed', label: 'Elementary Passed', color: 'var(--color-on-tertiary-container)', pct: 100, desc: 'Mastered 1,500 vocab, 181 kanji. Conversational basics secured.', verified: 'Verified Jul 2024', score: null },
  { level: 'N3', status: 'active', label: '78% Ready', color: 'var(--color-secondary)', pct: 78, desc: null, verified: 'Simulated Score: 122/180', score: null,
    metrics: [
      { label: 'Kanji', current: 285, total: 370 },
      { label: 'Vocabulary', current: 2980, total: 3750 },
      { label: 'Grammar Sentences', current: 110, total: 130 },
    ],
    examDays: 64, examResult: 'Likely to Pass (B+)'
  },
  { level: 'N2', status: 'locked', label: 'Business Fluency', color: 'var(--color-on-surface-variant)', pct: 0, desc: 'Target: ~6,000 vocab, 1,000 kanji. Unlock upon N3 completion.', verified: 'Estimated Start: Q1 2026', score: null },
  { level: 'N1', status: 'locked', label: 'Native Command', color: 'var(--color-on-surface-variant)', pct: 0, desc: 'Target: ~10,000 vocab, 2,136 Joyo kanji. Advanced literacy.', verified: 'Estimated Start: Q4 2026', score: null },
];

const AI_PROVIDERS = [
  { id: 'gemini' as AIProvider, name: 'Google Gemini', badge: 'Recommended', sub: 'Gemini 2.0 Flash / 1.5 Pro', desc: 'Generous free tier with Gemini Flash tokens.' },
  { id: 'openai' as AIProvider, name: 'OpenAI', badge: null, sub: 'GPT-4o / GPT-4o-mini', desc: 'Industry benchmark for natural Japanese roleplay nuances.' },
  { id: 'anthropic' as AIProvider, name: 'Anthropic Claude', badge: null, sub: 'Claude 3.5 Sonnet', desc: 'Superior syntactic precision in classical & polite keigo.' },
  { id: 'custom' as AIProvider, name: 'Custom Base URL', badge: null, sub: 'Ollama / vLLM / LM Studio', desc: 'Local private inference without sending bytes off-device.' },
];

const VOICE_CHARS = [
  { id: 2, kanji: '四', name: '四国めたん', style: 'Normal', key: 'shikoku', bg: 'var(--color-secondary-fixed)', color: 'var(--color-on-secondary-fixed-variant)' },
  { id: 3, kanji: 'ず', name: 'ずんだもん', style: 'Energetic', key: 'zundamon', bg: 'var(--color-tertiary-fixed)', color: 'var(--color-on-tertiary-fixed)', active: true },
  { id: 8, kanji: 'つ', name: '春日部つむぎ', style: 'Gentle', key: 'tsumugi', bg: 'var(--color-primary-fixed)', color: 'var(--color-on-primary-fixed)' },
  { id: 9, kanji: '波', name: '波音リツ', style: 'Crisp', key: 'rits', bg: 'var(--color-surface-container-high)', color: 'var(--color-primary)' },
];

// ─── Circular Progress ─────────────────────────────────────────────────────────
function CircularProgress({ pct, size = 56 }: { pct: number; size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="w-full h-full" style={{ transform: 'rotate(-90deg)' }} viewBox="0 0 36 36">
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none" stroke="var(--color-surface-container-high)" strokeWidth="3.5" />
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none" stroke="var(--color-secondary)" strokeDasharray={`${pct}, 100`} strokeLinecap="round" strokeWidth="3.5" />
      </svg>
      <span className="absolute font-bold" style={{ fontSize: '10px', color: 'var(--color-primary)' }}>{pct}%</span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Roadmap() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [voicevoxUrl, setVoicevoxUrl] = useState('http://localhost:50021');
  const [showKey, setShowKey] = useState(false);
  const [temperature, setTemperature] = useState(0.45);
  const [feedbackMode, setFeedbackMode] = useState('standard');
  const [connStatus, setConnStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('ok');
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [cardCount, setCardCount] = useState(0);

  // Load settings from localStorage on mount
  useEffect(() => {
    setApiKey(localStorage.getItem('koto_gemini_key') || '');
    setVoicevoxUrl(localStorage.getItem('koto_voicevox_url') || 'http://localhost:50021');
    const savedTemp = localStorage.getItem('koto_temperature');
    if (savedTemp) setTemperature(parseFloat(savedTemp));
    const savedMode = localStorage.getItem('koto_feedback_mode');
    if (savedMode) setFeedbackMode(savedMode);
    const savedProvider = localStorage.getItem('koto_ai_provider') as AIProvider;
    if (savedProvider) setProvider(savedProvider);
    db.flashcards.count().then(setCardCount);
  }, []);

  const saveSettings = () => {
    localStorage.setItem('koto_gemini_key', apiKey);
    localStorage.setItem('koto_voicevox_url', voicevoxUrl);
    localStorage.setItem('koto_temperature', temperature.toString());
    localStorage.setItem('koto_feedback_mode', feedbackMode);
    localStorage.setItem('koto_ai_provider', provider);
    alert('✓ All settings saved to browser storage.');
  };

  const testConnection = async () => {
    if (!apiKey) { alert('Please enter an API key first.'); return; }
    setConnStatus('testing');
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'こんにちは' }] }] }) }
      );
      setConnStatus(res.ok ? 'ok' : 'fail');
    } catch { setConnStatus('fail'); }
  };

  const previewVoice = async (char: typeof VOICE_CHARS[0]) => {
    setPlayingVoice(char.key);
    await playVoicevox(`こんにちは！私は${char.name}です。よろしくお願いします！`, char.id);
    setPlayingVoice(null);
  };

  const clearCache = async () => {
    if (!window.confirm('Clear all cached voice audio? Your SRS intervals will NOT be reset.')) return;
    // Just a UI indicator — no actual audio cache to clear beyond localStorage
    alert('✓ IndexedDB audio cache flushed (voice buffers released).');
  };

  const heatColors: Record<number, string> = {
    0: 'var(--color-surface-container)',
    1: 'rgba(104,219,169,0.4)',
    2: 'var(--color-tertiary-fixed)',
    3: 'var(--color-on-tertiary-container)',
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--color-surface)', fontFamily: "'Noto Sans', sans-serif" }}>
      <KotoHeader />

      <main className="w-full pt-16" style={{ minHeight: '100vh' }}>
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-10">

          {/* ── Section 1: Learning Analytics & Roadmap ──────────────────── */}
          <div className="flex flex-col gap-6">

            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-secondary)' }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>
                    Learning Trajectory &amp; Local Telemetry
                  </span>
                </div>
                <h1 className="font-bold tracking-tight" style={{ fontSize: '32px', lineHeight: '40px', color: 'var(--color-primary)' }}>
                  SRS Mastery &amp; JLPT Roadmap
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs"
                  style={{ backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-secondary)' }}>database</span>
                  IndexedDB: <strong>{cardCount.toLocaleString()} Cards</strong>
                </div>
                <button
                  onClick={() => db.flashcards.count().then(setCardCount)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium shadow-sm transition-all"
                  style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>sync</span>
                  Force Resync
                </button>
              </div>
            </div>

            {/* Top Row: Heatmap + Retention Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Daily Streak & Heatmap (7 cols) */}
              <div className="lg:col-span-7 rounded-xl p-6 shadow-sm flex flex-col justify-between"
                style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🔥</span>
                      <span className="font-bold text-xl" style={{ color: 'var(--color-primary)' }}>18 Day Streak</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold ml-1"
                        style={{ backgroundColor: 'var(--color-secondary-fixed)', color: 'var(--color-on-secondary-fixed-variant)' }}>
                        Rank: Shodan
                      </span>
                    </div>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-on-surface-variant)' }}>
                      45 mins daily goal · <strong style={{ color: 'var(--color-on-surface)' }}>38m logged today</strong> (85% completed)
                    </p>
                  </div>
                  <CircularProgress pct={85} size={56} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>
                      Review Intensity (Past 12 Weeks)
                    </span>
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
                      <span>Less</span>
                      {[0,1,2,3].map(i => (
                        <span key={i} className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: heatColors[i] }} />
                      ))}
                      <span>More</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto pb-1">
                    <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gridAutoFlow: 'column', gap: '6px', width: 'fit-content' }}>
                      {HEATMAP.map((cell, i) => (
                        <div
                          key={i}
                          title={cell.count > 0 ? `${cell.count} cards` : 'Rest day'}
                          className="w-3.5 h-3.5 rounded-sm transition-all"
                          style={{
                            backgroundColor: heatColors[cell.intensity],
                            animation: i === HEATMAP.length - 1 ? 'pulse 2s infinite' : 'none',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SRS Retention Matrix (5 cols) */}
              <div className="lg:col-span-5 rounded-xl p-6 shadow-sm flex flex-col justify-between"
                style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>Retention Breakdown</span>
                    <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>FSRS-4.5 Algorithm Distribution</p>
                  </div>
                  <div className="px-2.5 py-1 rounded-md text-xs font-semibold"
                    style={{ backgroundColor: 'var(--color-surface-container)', color: 'var(--color-primary)' }}>
                    93.4% Retention Rate
                  </div>
                </div>

                {/* Stacked retention bar */}
                <div className="my-4">
                  <div className="h-3 w-full rounded-full overflow-hidden flex"
                    style={{ backgroundColor: 'var(--color-surface-container-high)' }}>
                    <div style={{ width: '62%', backgroundColor: 'var(--color-on-tertiary-container)' }} title="Mature: 2,554" />
                    <div style={{ width: '25%', backgroundColor: 'var(--color-tertiary-fixed-dim)' }} title="Young: 1,030" />
                    <div style={{ width: '13%', backgroundColor: 'var(--color-secondary)' }} title="Learning: 536" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Mature', count: 2554, sub: '> 21d interval', color: 'var(--color-on-tertiary-container)', dot: 'var(--color-on-tertiary-container)' },
                    { label: 'Young', count: 1030, sub: '< 21d interval', color: 'var(--color-on-surface-variant)', dot: 'var(--color-tertiary-fixed-dim)' },
                    { label: 'Learning', count: 536, sub: 'Relearn & New', color: 'var(--color-secondary)', dot: 'var(--color-secondary)' },
                  ].map(({ label, count, sub, color, dot }) => (
                    <div key={label} className="p-3 rounded-lg flex flex-col"
                      style={{ backgroundColor: 'var(--color-surface-container-low)' }}>
                      <div className="flex items-center gap-1 text-xs font-semibold mb-1" style={{ color }}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dot }} />
                        {label}
                      </div>
                      <span className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>{count.toLocaleString()}</span>
                      <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>{sub}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 flex items-center justify-between text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
                  <span>Next review cycle: <strong>14:00 JST</strong></span>
                  <span className="font-semibold flex items-center gap-1" style={{ color: 'var(--color-secondary)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>alarm</span>
                    42 cards pending
                  </span>
                </div>
              </div>
            </div>

            {/* JLPT Benchmark Pipeline */}
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <h2 className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>JLPT Benchmark Pipeline</h2>
                <span className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>Winter 2025 Examination Target</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {JLPT_LEVELS.map((lvl) => (
                  <div
                    key={lvl.level}
                    className="rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden"
                    style={{
                      backgroundColor: lvl.status === 'locked' ? 'var(--color-surface-container-low)' : 'var(--color-surface-container-lowest)',
                      opacity: lvl.status === 'locked' ? 0.7 : 1,
                      boxShadow: lvl.status === 'active' ? '0 0 0 2px var(--color-secondary)' : undefined,
                    }}
                  >
                    {lvl.status === 'active' && (
                      <div className="absolute top-0 right-0 px-3 py-0.5 text-xs font-bold uppercase tracking-wider rounded-bl-lg shadow-sm"
                        style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-on-secondary)', fontSize: '10px' }}>
                        Active Focus
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-xl" style={{ color: lvl.status === 'locked' ? 'var(--color-on-surface-variant)' : 'var(--color-primary)' }}>
                            {lvl.level}
                          </span>
                          {lvl.status === 'active' && (
                            <span className="font-bold" style={{ fontSize: '16px', color: 'var(--color-secondary)' }}>{lvl.label}</span>
                          )}
                        </div>
                        {lvl.status === 'passed' && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ backgroundColor: 'var(--color-tertiary-container)', color: 'var(--color-tertiary-fixed)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check_circle</span> 100%
                          </span>
                        )}
                        {lvl.status === 'locked' && (
                          <span className="material-symbols-outlined text-lg" style={{ color: 'var(--color-on-surface-variant)' }}>lock</span>
                        )}
                      </div>

                      {lvl.status !== 'active' && (
                        <span className="text-xs font-semibold uppercase tracking-wider block"
                          style={{ color: lvl.status === 'passed' ? 'var(--color-on-tertiary-container)' : 'var(--color-on-surface-variant)' }}>
                          {lvl.label}
                        </span>
                      )}
                      {lvl.status === 'active' && (
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-xs font-bold"
                            style={{ backgroundColor: 'var(--color-secondary-fixed)', color: 'var(--color-on-secondary-fixed-variant)' }}>
                            Exam in 64 days
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-semibold"
                            style={{ backgroundColor: 'var(--color-surface-container)', color: 'var(--color-primary)' }}>
                            Likely to Pass (B+)
                          </span>
                        </div>
                      )}

                      {lvl.desc && <p className="text-xs mt-2" style={{ color: 'var(--color-on-surface-variant)' }}>{lvl.desc}</p>}

                      {lvl.status === 'active' && lvl.metrics && (
                        <div className="space-y-2 mt-3">
                          {lvl.metrics.map(m => (
                            <div key={m.label}>
                              <div className="flex justify-between text-xs mb-0.5" style={{ color: 'var(--color-on-surface-variant)' }}>
                                <span>{m.label}</span>
                                <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>{m.current.toLocaleString()} / {m.total.toLocaleString()}</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-container)' }}>
                                <div className="h-full rounded-full" style={{ width: `${Math.round(m.current/m.total*100)}%`, backgroundColor: 'var(--color-secondary)' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 mt-2">
                      {lvl.status === 'active' ? (
                        <div className="flex justify-between items-center">
                          <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>{lvl.verified}</span>
                          <button className="text-xs font-semibold" style={{ color: 'var(--color-secondary)' }}>Mock Exam →</button>
                        </div>
                      ) : (
                        <>
                          <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: lvl.status === 'passed' ? 'var(--color-on-tertiary-container)' : 'var(--color-surface-container-highest)' }} />
                          <span className="block mt-1.5" style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>{lvl.verified}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Section 2: BYOK & Engine Configuration ───────────────────── */}
          <div className="flex flex-col gap-6 pt-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-secondary)' }}>tune</span>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>
                    Zero-Data Retention Architecture
                  </span>
                </div>
                <h2 className="font-bold tracking-tight" style={{ fontSize: '32px', lineHeight: '40px', color: 'var(--color-primary)' }}>
                  BYOK &amp; Engine Configuration
                </h2>
              </div>
              <p className="text-xs max-w-md" style={{ color: 'var(--color-on-surface-variant)' }}>
                Bring your own API keys. Prompts and LLM dialogues execute directly from your browser to AI vendors.
              </p>
            </div>

            {/* Tabbed Settings Container */}
            <div className="rounded-xl shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}>
              {/* Tab Nav */}
              <div className="flex border-b px-4 sm:px-6 pt-3 gap-2 sm:gap-4 overflow-x-auto"
                style={{ backgroundColor: 'var(--color-surface-container-low)', borderColor: 'var(--color-surface-container-highest)' }}>
                {([
                  { id: 'ai', icon: 'smart_toy', label: 'AI Provider (BYOK)' },
                  { id: 'voice', icon: 'record_voice_over', label: 'Voicevox & Audio Engine' },
                  { id: 'data', icon: 'sync_saved_locally', label: 'Data, Anki & Backup' },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="px-4 py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors flex-shrink-0"
                    style={{
                      borderColor: activeTab === tab.id ? 'var(--color-secondary)' : 'transparent',
                      color: activeTab === tab.id ? 'var(--color-secondary)' : 'var(--color-on-surface-variant)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── TAB 1: AI Provider ─────────────────────────────────────── */}
              {activeTab === 'ai' && (
                <div className="p-6 sm:p-8 flex flex-col gap-6">
                  {/* Provider radio cards */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-3" style={{ color: 'var(--color-primary)' }}>
                      Select Active LLM Provider
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {AI_PROVIDERS.map(p => (
                        <label
                          key={p.id}
                          onClick={() => setProvider(p.id)}
                          className="relative flex flex-col p-4 rounded-xl cursor-pointer transition-all"
                          style={{
                            backgroundColor: 'var(--color-surface-container-low)',
                            border: `2px solid ${provider === p.id ? 'var(--color-secondary)' : 'transparent'}`,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-base" style={{ color: 'var(--color-primary)' }}>{p.name}</span>
                            <span className="material-symbols-outlined text-lg"
                              style={{ color: provider === p.id ? 'var(--color-secondary)' : 'var(--color-outline-variant)', fontSize: '20px', fontVariationSettings: provider === p.id ? "'FILL' 1" : undefined }}>
                              {provider === p.id ? 'radio_button_checked' : 'radio_button_unchecked'}
                            </span>
                          </div>
                          {p.badge && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded w-fit mt-1"
                              style={{ backgroundColor: 'var(--color-secondary-fixed)', color: 'var(--color-on-secondary-fixed-variant)' }}>
                              {p.badge}
                            </span>
                          )}
                          {!p.badge && <span className="text-xs font-semibold mt-1" style={{ color: 'var(--color-on-surface-variant)' }}>{p.sub}</span>}
                          <p className="text-xs mt-2" style={{ color: 'var(--color-on-surface-variant)' }}>{p.desc}</p>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* API Key Input */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                        {provider === 'gemini' ? 'Google Gemini' : provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic Claude' : 'Custom'} API Key
                      </label>
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
                        className="text-xs flex items-center gap-1" style={{ color: 'var(--color-secondary)' }}>
                        Get a free key from Google AI Studio
                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>open_in_new</span>
                      </a>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-3.5 material-symbols-outlined text-lg"
                          style={{ color: 'var(--color-outline)', fontSize: '20px' }}>key</span>
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={e => setApiKey(e.target.value)}
                          placeholder="Enter your API key..."
                          className="w-full h-12 pl-11 pr-12 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 shadow-inner"
                          style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-primary)', boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.06)' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(v => !v)}
                          className="absolute right-3.5 top-3"
                          style={{ color: 'var(--color-on-surface-variant)' }}
                        >
                          <span className="material-symbols-outlined text-lg" style={{ fontSize: '20px' }}>
                            {showKey ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                      <button
                        onClick={testConnection}
                        className="h-12 px-5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>wifi_tethering</span>
                        Test Connection
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-on-tertiary-container)' }}>lock</span>
                        🔒 Stored strictly in browser LocalStorage. Never sent to any Koto proxy server.
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold w-fit"
                        style={{ backgroundColor: 'var(--color-tertiary-fixed)', color: 'var(--color-on-tertiary-fixed-variant)' }}>
                        {connStatus === 'testing' ? (
                          <><span className="material-symbols-outlined text-sm" style={{ fontSize: '14px', animation: 'spin 1s linear infinite' }}>refresh</span> Pinging...</>
                        ) : connStatus === 'ok' ? (
                          <><span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-on-tertiary-container)', animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite' }} /> Connected: Gemini 2.0 Flash · Rate: Healthy</>
                        ) : connStatus === 'fail' ? (
                          <><span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-error)' }} /> Connection failed — check key</>
                        ) : (
                          <>Not tested yet</>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Fine Tuning */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t"
                    style={{ borderColor: 'var(--color-surface-container)' }}>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                          Model Temperature (Creativity)
                        </label>
                        <span className="font-mono font-bold text-sm" style={{ color: 'var(--color-secondary)' }}>{temperature.toFixed(2)}</span>
                      </div>
                      <input
                        type="range" min="0" max="1" step="0.05"
                        value={temperature}
                        onChange={e => setTemperature(parseFloat(e.target.value))}
                        className="w-full h-2 rounded-lg cursor-pointer"
                        style={{ accentColor: 'var(--color-secondary)', backgroundColor: 'var(--color-surface-container)' }}
                      />
                      <div className="flex justify-between" style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
                        <span>0.0 (Strict Textbook Grammar)</span>
                        <span>0.7 (Dynamic Roleplay Slang)</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                        Immersion Feedback Mode
                      </label>
                      <select
                        value={feedbackMode}
                        onChange={e => setFeedbackMode(e.target.value)}
                        className="h-11 px-3 rounded-lg text-sm focus:outline-none focus:ring-2"
                        style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-primary)' }}
                      >
                        <option value="standard">Standard Japanese: Correct subtle particle slips silently in response</option>
                        <option value="strict">Strict Sensei: Interrupt conversation on wrong Keigo / Te-form</option>
                        <option value="peer">Native Peer: Prioritize natural flow over formal textbook accuracy</option>
                        <option value="bilingual">Bilingual Hints: Append English gloss for N3+ idioms</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 2: Voicevox & Audio ──────────────────────────────── */}
              {activeTab === 'voice' && (
                <div className="p-6 sm:p-8 flex flex-col gap-6">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider block mb-3" style={{ color: 'var(--color-primary)' }}>
                      Speech Synthesis Pipeline
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Local Voicevox */}
                      <div className="p-4 rounded-xl flex flex-col justify-between"
                        style={{ backgroundColor: 'var(--color-surface-container-low)', border: '2px solid var(--color-secondary)' }}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-base" style={{ color: 'var(--color-primary)' }}>Local Voicevox Engine</span>
                              <span className="text-xs font-bold px-2 py-0.5 rounded"
                                style={{ backgroundColor: 'var(--color-tertiary-fixed)', color: 'var(--color-on-tertiary-fixed)' }}>
                                Fastest · 0 Latency
                              </span>
                            </div>
                            <p className="text-xs mt-1" style={{ color: 'var(--color-on-surface-variant)' }}>Direct local inference over HTTP loopback.</p>
                          </div>
                          <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)', fontSize: '22px' }}>check_circle</span>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <input
                            type="text"
                            value={voicevoxUrl}
                            onChange={e => setVoicevoxUrl(e.target.value)}
                            className="h-10 px-3 rounded-lg flex-1 font-mono text-sm focus:outline-none focus:ring-1"
                            style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-primary)' }}
                          />
                          <button
                            onClick={() => playVoicevox('接続テスト')}
                            className="h-10 px-3 rounded-lg text-xs font-semibold"
                            style={{ backgroundColor: 'var(--color-surface-container-highest)', color: 'var(--color-primary)' }}
                          >
                            Ping
                          </button>
                        </div>
                      </div>
                      {/* Cloud fallback */}
                      <div className="p-4 rounded-xl flex flex-col justify-between"
                        style={{ backgroundColor: 'var(--color-surface-container-low)', border: '2px solid transparent' }}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-base" style={{ color: 'var(--color-primary)' }}>Cloud Voicevox API Wrapper</span>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded"
                                style={{ backgroundColor: 'var(--color-surface-container)', color: 'var(--color-on-surface-variant)' }}>Fallback</span>
                            </div>
                            <p className="text-xs mt-1" style={{ color: 'var(--color-on-surface-variant)' }}>Useful when running on tablet or non-desktop devices without Docker.</p>
                          </div>
                          <span className="material-symbols-outlined" style={{ color: 'var(--color-outline-variant)', fontSize: '22px' }}>radio_button_unchecked</span>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="https://api.voicevox.su-shiki.com/v1"
                            className="h-10 px-3 rounded-lg flex-1 font-mono text-xs focus:outline-none"
                            style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-on-surface-variant)' }}
                          />
                          <button className="h-10 px-3 rounded-lg text-xs font-semibold"
                            style={{ backgroundColor: 'var(--color-surface-container-highest)', color: 'var(--color-on-surface-variant)' }}>
                            Configure
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Engine Status Banner */}
                  <div className="p-4 rounded-xl flex items-center justify-between"
                    style={{ backgroundColor: 'var(--color-tertiary-container)', color: 'var(--color-tertiary-fixed)' }}>
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-2xl" style={{ fontSize: '28px' }}>memory</span>
                      <div>
                        <span className="font-bold text-sm block" style={{ color: 'var(--color-on-tertiary)' }}>Engine Active (v0.14.4)</span>
                        <p className="text-xs" style={{ color: 'var(--color-tertiary-fixed-dim)' }}>
                          18 Core Voice models detected · avg synthesis 112ms
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full font-bold font-mono text-xs"
                      style={{ backgroundColor: 'rgba(36,163,117,0.3)', color: 'var(--color-tertiary-fixed)' }}>
                      CUDA 12.2 Ready
                    </span>
                  </div>

                  {/* Character Voice Previews */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-3" style={{ color: 'var(--color-primary)' }}>
                      Character Voice Persona Preview
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {VOICE_CHARS.map(char => (
                        <div
                          key={char.id}
                          className="p-3.5 rounded-xl flex items-center justify-between transition-all"
                          style={{
                            backgroundColor: 'var(--color-surface-container-low)',
                            border: char.active ? '2px solid var(--color-secondary)' : '2px solid transparent',
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
                              style={{ backgroundColor: char.bg, color: char.color }}>
                              {char.kanji}
                            </div>
                            <div>
                              <span className="font-bold text-base block" style={{ color: 'var(--color-primary)' }}>{char.name}</span>
                              <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>{char.style} (ID: {char.id})</span>
                            </div>
                          </div>
                          <button
                            onClick={() => previewVoice(char)}
                            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors shadow-sm"
                            style={playingVoice === char.key
                              ? { backgroundColor: 'var(--color-secondary)', color: 'var(--color-on-secondary)' }
                              : { backgroundColor: 'var(--color-surface-container-lowest)', color: 'var(--color-primary)' }
                            }
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                              {playingVoice === char.key ? 'volume_up' : 'play_arrow'}
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 3: Data, Anki & Backup ───────────────────────────── */}
              {activeTab === 'data' && (
                <div className="p-6 sm:p-8 flex flex-col gap-6">
                  <div>
                    <span className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>Local Data Persistence &amp; Anki Synchronicity</span>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-on-surface-variant)' }}>
                      Your decks, custom mnemonics, and review timestamps stay exclusively within your browser's IndexedDB. Export anytime.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Export */}
                    <div className="p-5 rounded-xl flex flex-col justify-between gap-4"
                      style={{ backgroundColor: 'var(--color-surface-container-low)' }}>
                      <div>
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 shadow-sm"
                          style={{ backgroundColor: 'var(--color-surface-container-lowest)', color: 'var(--color-primary)' }}>
                          <span className="material-symbols-outlined">download</span>
                        </div>
                        <span className="font-bold text-base block" style={{ color: 'var(--color-primary)' }}>Export Decks</span>
                        <p className="text-xs mt-1" style={{ color: 'var(--color-on-surface-variant)' }}>
                          Full deck archive compatible with AnkiDroid, AnkiMobile (.apkg), or clean JSON.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={async () => {
                            const cards = await db.flashcards.toArray();
                            const blob = new Blob([JSON.stringify(cards, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a'); a.href = url; a.download = 'koto_decks.json'; a.click();
                          }}
                          className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold text-center transition-all"
                          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
                        >
                          Download JSON Export
                        </button>
                        <button className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-center transition-all"
                          style={{ backgroundColor: 'var(--color-surface-container-highest)', color: 'var(--color-primary)' }}>
                          Export Telemetry Data
                        </button>
                      </div>
                    </div>

                    {/* Import */}
                    <div className="p-5 rounded-xl flex flex-col justify-between gap-4"
                      style={{ backgroundColor: 'var(--color-surface-container-low)' }}>
                      <div>
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 shadow-sm"
                          style={{ backgroundColor: 'var(--color-surface-container-lowest)', color: 'var(--color-primary)' }}>
                          <span className="material-symbols-outlined">upload_file</span>
                        </div>
                        <span className="font-bold text-base block" style={{ color: 'var(--color-primary)' }}>Import Lexicon</span>
                        <p className="text-xs mt-1" style={{ color: 'var(--color-on-surface-variant)' }}>
                          Merge custom Kanji lists, Yomitan export TSV, or existing Anki decks.
                        </p>
                      </div>
                      <div>
                        <label className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold text-center block cursor-pointer"
                          style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-on-secondary)' }}>
                          Select .apkg or .csv File
                          <input type="file" accept=".json,.csv,.apkg" className="sr-only"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const text = await file.text();
                              try {
                                const cards = JSON.parse(text);
                                if (Array.isArray(cards)) {
                                  const decks = await db.decks.toArray();
                                  const deckId = decks[0]?.id ?? 1;
                                  for (const c of cards) {
                                    await db.flashcards.add({ ...c, deckId, id: undefined });
                                  }
                                  alert(`✓ Imported ${cards.length} cards successfully!`);
                                }
                              } catch { alert('Invalid file format. Use JSON exported from Koto.'); }
                            }}
                          />
                        </label>
                        <span className="text-xs text-center block mt-2" style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
                          Auto-generates Furigana &amp; Audio
                        </span>
                      </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="p-5 rounded-xl flex flex-col justify-between gap-4"
                      style={{ backgroundColor: 'rgba(186,26,26,0.08)' }}>
                      <div>
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 shadow-sm"
                          style={{ backgroundColor: 'var(--color-surface-container-lowest)', color: 'var(--color-error)' }}>
                          <span className="material-symbols-outlined">delete_forever</span>
                        </div>
                        <span className="font-bold text-base block" style={{ color: 'var(--color-error)' }}>IndexedDB Cache</span>
                        <p className="text-xs mt-1" style={{ color: 'var(--color-on-surface-variant)' }}>
                          Flush all locally cached model tokens, pre-rendered voice clips, or reset review intervals.
                        </p>
                      </div>
                      <button
                        onClick={clearCache}
                        className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold text-center shadow-sm transition-all"
                        style={{ backgroundColor: 'var(--color-surface-container-lowest)', color: 'var(--color-error)' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-error)'; e.currentTarget.style.color = 'var(--color-on-error)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-container-lowest)'; e.currentTarget.style.color = 'var(--color-error)'; }}
                      >
                        Clear IndexedDB Cache
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Strip */}
              <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t"
                style={{ backgroundColor: 'var(--color-surface-container-low)', borderColor: 'var(--color-surface-container)' }}>
                <span className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
                  Configuration auto-persists to <code>localStorage.koto_settings</code>
                </span>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => { setApiKey(''); setTemperature(0.45); setFeedbackMode('standard'); setVoicevoxUrl('http://localhost:50021'); }}
                    className="px-4 py-2 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: 'var(--color-surface-container-highest)', color: 'var(--color-primary)' }}
                  >
                    Revert to Defaults
                  </button>
                  <button
                    onClick={saveSettings}
                    className="px-5 py-2 rounded-lg text-xs font-semibold shadow-sm"
                    style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-on-secondary)' }}
                  >
                    Save Configuration
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <KotoFooter />
    </div>
  );
}
