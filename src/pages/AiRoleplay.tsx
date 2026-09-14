import { useState, useRef, useEffect, useCallback } from 'react';
import { db } from '../db';
import { playVoicevox } from '../audio';
import KotoHeader from '../components/KotoHeader';
import KotoFooter from '../components/KotoFooter';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'ai' | 'user';
  text: string;
  translation?: string;
  showTranslation?: boolean;
  timestamp: string;
  speechStyle?: string;
  purity?: number;
  critique?: { title: string; body: string; suggestion: string; phrase: string } | null;
}

interface VocabTerm {
  kanji: string;
  reading: string;
  meaning: string;
  tag: string;
  tagColor?: string;
  added: boolean;
}

interface Scenario {
  emoji: string;
  title: string;
  jlpt: string;
  subtitle: string;
  img?: string;
  missions: { text: string; done: boolean }[];
}

// ─── Scenario Data ────────────────────────────────────────────────────────────
const SCENARIOS: Scenario[] = [
  {
    emoji: '🏮',
    title: '新宿の居酒屋で注文',
    jlpt: 'N3',
    subtitle: 'Ordering seasonal sashimi, local craft drinks, and handling cultural customs in Shinjuku, Tokyo.',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCZ61PUor5UlcfylNzngdymJfb4fnjU3w33otUisWwCnyprarZwVTq_jrNyhCnfZ_UH_k_3TeK5teKZNSyW56rLlONdV5YBesTqipZ0fi0xoGnE9pVeq5FFtT4gW7AV1vUU0kpykxlWNmlghz4er1z6DwjdiIKFIu_6NWnItHFIfjb7wmUsG6eyy63Ozw-hsaluOr-dJJX0k-Ez9x26c8RyyyjxraQby9rlzR3sS1H723zBCRUUq9VfoKVcJKz_qZ8BlVGHmS-_MOF-A00L9rFUp5_ml5PaSe2S9A',
    missions: [
      { text: 'Ask Master for seasonal sashimi recommendation', done: true },
      { text: 'Order first drink using casual/polite phrasing (とりあえず生)', done: true },
      { text: 'Ask for the bill and request split payment (別々で)', done: false },
    ],
  },
  { emoji: '☕', title: 'Tokyo Cafe Barista', jlpt: 'N4', subtitle: 'Oat milk & customized roast', missions: [] },
  { emoji: '🏢', title: 'Tech Interview in Shibuya', jlpt: 'N2', subtitle: 'Keigo & technical experience', missions: [] },
  { emoji: '🚆', title: 'Lost at Shinjuku Station', jlpt: 'N4', subtitle: 'Yamanote line directions', missions: [] },
  { emoji: '🏥', title: 'Clinic Doctor Visit', jlpt: 'N3', subtitle: 'Symptoms & medical allergies', missions: [] },
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1', role: 'ai',
    text: 'いらっしゃいませ！お一人ですか？奥のカウンターへどうぞ。まずはお飲み物はどうされますか？',
    translation: 'Welcome! Just one person? Right this way to the counter in the back. What can I get you started with to drink?',
    showTranslation: false, timestamp: '19:42',
    critique: null,
  },
  {
    id: '2', role: 'user',
    text: 'すみません、生ビールをください。あと、本日のおすすめの刺身は何ですか？',
    translation: 'Excuse me, one beer please. Also, what is today\'s recommended sashimi?',
    showTranslation: false, timestamp: '19:43', speechStyle: '丁寧語', purity: 96,
    critique: {
      title: 'Natural Phrasing & Izakaya Etiquette',
      body: 'Grammar is 100% correct! To sound like a Tokyo local, instead of standard「生ビールをください」, try ordering with the quintessential phrase:',
      suggestion: 'とりあえず生中ひとつお願いします！',
      phrase: '「とりあえず生中ひとつお願いします！」',
    },
  },
  {
    id: '3', role: 'ai',
    text: 'はいよっ！生中ですね！本日の一番のおすすめは豊洲から直送されたばかりの「寒鰤」と「戻り鰹のタタキ」ですよ。脂がのってて最高に旨いですよ！',
    translation: 'Coming right up! One draft beer! Today\'s top recommendation is the winter yellowtail (Kanburi) and seared bonito shipped straight from Toyosu market. The fat on them is phenomenal!',
    showTranslation: false, timestamp: '19:44', critique: null,
  },
];

const INITIAL_VOCAB: VocabTerm[] = [
  { kanji: '寒鰤', reading: 'かんぶり', meaning: 'Winter yellowtail (fatty seasonal sashimi)', tag: 'N2/Specialty', tagColor: 'secondary', added: false },
  { kanji: '生中', reading: 'なまちゅう', meaning: 'Medium draft beer mug (namabiiru)', tag: 'Essential', tagColor: 'tertiary', added: true },
  { kanji: 'お通し', reading: 'おとおし', meaning: 'Automatic table appetizer / cover charge', tag: 'Culture Item', tagColor: 'outline', added: false },
  { kanji: '直送', reading: 'ちょくそう', meaning: 'Direct shipment from port or market', tag: 'JLPT N3', tagColor: 'outline', added: false },
];

const QUICK_PROMPTS = [
  '寒鰤のお刺身を一人前お願いします！',
  'お会計お願いします。別々で払えますか？',
  '甲殻類のアレルギーがあります。',
];

// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an immersive Japanese language learning AI acting as an Izakaya master (居酒屋マスター) at a traditional bar in Shinjuku, Tokyo.

Rules:
- ALWAYS reply primarily in Japanese (using natural colloquial Izakaya speech)
- Use authentic Japanese vocabulary and cultural expressions
- When learner makes a grammar mistake, note it gently in parentheses in English after your Japanese reply
- Occasionally use casual speech patterns typical of Izakaya staff (はいよっ！, ありがとっ！, etc.)
- Stay in character as a warm, knowledgeable Izakaya master
- Keep replies conversational length (2-4 sentences in Japanese)
- If the learner is doing well, include a short cultural note about Izakaya customs`;

// ─── Waveform Component ───────────────────────────────────────────────────────
function MiniWaveform() {
  const bars = [8, 12, 16, 8, 12, 6, 8, 14, 4, 8, 12, 4];
  return (
    <div className="flex items-center gap-0.5 h-4 flex-1">
      {bars.map((h, i) => (
        <div key={i} className="w-1 rounded-full"
          style={{
            height: `${h}px`,
            backgroundColor: i < 5 ? 'var(--color-secondary)' : 'var(--color-outline-variant)',
          }}
        />
      ))}
    </div>
  );
}

// ─── Fluency Circular Chart ────────────────────────────────────────────────────
function FluencyCircle({ score }: { score: number }) {
  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="w-full h-full" style={{ transform: 'rotate(-90deg)' }} viewBox="0 0 36 36">
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none" stroke="var(--color-surface-container)" strokeWidth="3.5" />
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none" stroke="var(--color-secondary)"
          strokeDasharray={`${score}, 100`} strokeLinecap="round" strokeWidth="3.5" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-bold text-xl" style={{ color: 'var(--color-primary)' }}>{score}%</span>
        <span className="uppercase tracking-wider" style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)' }}>Natural</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AiRoleplay() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [vocabTerms, setVocabTerms] = useState<VocabTerm[]>(INITIAL_VOCAB);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [furiganaOn, setFuriganaOn] = useState(true);
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const [voiceChar, setVoiceChar] = useState('ずんだもん');
  const [fluency] = useState({ overall: 88, grammar: 94, nuance: 82, keigo: 90 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeScenario = SCENARIOS[activeScenarioIdx];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Toggle translation drawer for a message
  const toggleTranslation = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, showTranslation: !m.showTranslation } : m));
  };

  // Play audio for a message
  const playMessageAudio = async (text: string) => {
    await playVoicevox(text);
  };

  // Add vocab to SRS
  const addVocabToSRS = async (term: VocabTerm) => {
    const decks = await db.decks.toArray();
    const deckId = decks[0]?.id ?? 1;
    const exists = await db.flashcards.where({ deckId }).filter(c => c.front === term.kanji).count();
    if (exists === 0) {
      await db.flashcards.add({
        deckId, front: term.kanji,
        back: `${term.reading} · ${term.meaning}`,
        interval: 0, repetition: 0, efactor: 2.5,
        dueDate: new Date().toISOString(),
      });
    }
    setVocabTerms(prev => prev.map(v => v.kanji === term.kanji ? { ...v, added: true } : v));
  };

  // Insert quick prompt into input
  const insertQuickPrompt = (text: string) => {
    setInputText(text);
    inputRef.current?.focus();
  };

  // Send message to Gemini
  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(), role: 'user', text,
      timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      speechStyle: '丁寧語', purity: Math.floor(85 + Math.random() * 15), critique: null,
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const apiKey = localStorage.getItem('koto_gemini_key') || '';
      if (!apiKey) throw new Error('No API key. Set your Gemini API key in Settings.');

      const history = messages.map(m => ({
        role: m.role === 'ai' ? 'model' : 'user',
        parts: [{ text: m.text }],
      }));

      const body = {
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [...history, { role: 'user', parts: [{ text }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 300 },
      };

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      );
      const data = await res.json();
      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'すみません、もう一度おっしゃっていただけますか？';

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(), role: 'ai', text: aiText,
        timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        showTranslation: false, critique: null,
      };
      setMessages(prev => [...prev, aiMsg]);
      await playVoicevox(aiText);
    } catch (err: any) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(), role: 'ai',
        text: err.message?.includes('API key') ? err.message : 'エラーが発生しました。設定でAPIキーを確認してください。',
        timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        showTranslation: false, critique: null,
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--color-surface)', fontFamily: "'Noto Sans', sans-serif" }}>
      <KotoHeader />

      <main className="w-full pt-16" style={{ minHeight: '100vh' }}>
        <div className="w-full max-w-[1580px] mx-auto px-4 lg:px-6 py-6">

          {/* ── Context / Scenario Bar ─────────────────────────────────────── */}
          <div className="w-full rounded-xl shadow-sm p-4 mb-6 flex flex-wrap items-center justify-between gap-4"
            style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                style={{ backgroundColor: 'rgba(187,1,18,0.1)', color: 'var(--color-secondary)' }}>
                <span className="material-symbols-outlined text-2xl">storefront</span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>{activeScenario.title}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: 'var(--color-secondary-fixed)', color: 'var(--color-on-secondary-fixed-variant)' }}>
                    JLPT {activeScenario.jlpt}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs"
                    style={{ backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-surface-variant)' }}>
                    Role: Izakaya Master
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-on-surface-variant)' }}>{activeScenario.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Voicevox badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)' }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--color-on-tertiary-container)', animation: 'pulse 2s infinite' }} />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>ずんだもん (Zundamon)</span>
                  <span style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)' }}>Voicevox Core · 240ms</span>
                </div>
              </div>
              {/* Furigana toggle */}
              <button
                onClick={() => setFuriganaOn(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                style={{ backgroundColor: 'var(--color-surface-container)', color: 'var(--color-on-surface)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>spellcheck</span>
                Furigana: <strong style={{ color: furiganaOn ? 'var(--color-secondary)' : 'var(--color-on-surface-variant)' }}>
                  {furiganaOn ? 'ON' : 'OFF'}
                </strong>
              </button>
              {/* Wrap up */}
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ backgroundColor: 'var(--color-primary-container)', color: 'var(--color-on-primary)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>stop_circle</span>
                Wrap Up Session
              </button>
            </div>
          </div>

          {/* ── 3-Column Grid ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* ── LEFT: Scenario Sidebar (3 cols) ────────────────────────── */}
            <aside className="lg:col-span-3 flex flex-col gap-5">

              {/* Active Scenario Card */}
              <div className="rounded-xl shadow-sm p-5" style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Active Scenario</span>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold"
                    style={{ backgroundColor: 'var(--color-tertiary-container)', color: 'var(--color-on-tertiary-container)' }}>
                    Live
                  </span>
                </div>

                {/* Scenario Image */}
                <div className="relative rounded-lg overflow-hidden mb-4 h-36"
                  style={{ backgroundColor: 'var(--color-primary)' }}>
                  {activeScenario.img && (
                    <img src={activeScenario.img} alt={activeScenario.title}
                      className="w-full h-full object-cover" style={{ opacity: 0.8 }} />
                  )}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--color-primary) 0%, rgba(9,20,38,0.4) 50%, transparent 100%)' }} />
                  <div className="absolute bottom-3 left-3 right-3" style={{ color: 'var(--color-on-primary)' }}>
                    <span className="block text-xs" style={{ opacity: 0.8 }}>Intermediate · Shinjuku Golden Gai</span>
                    <span className="font-bold text-base leading-tight">{activeScenario.emoji} {activeScenario.title}</span>
                  </div>
                </div>

                {/* Mission Checklist */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold block" style={{ color: 'var(--color-on-surface-variant)' }}>
                    Scenario Missions ({activeScenario.missions.filter(m => m.done).length}/{activeScenario.missions.length})
                  </span>
                  {activeScenario.missions.map((mission, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg text-xs"
                      style={{ backgroundColor: mission.done ? 'var(--color-surface-container-low)' : 'rgba(255,218,214,0.4)' }}>
                      <span className="material-symbols-outlined text-base mt-0.5 flex-shrink-0"
                        style={{ fontSize: '18px', color: mission.done ? 'var(--color-on-tertiary-container)' : 'var(--color-secondary)', fontVariationSettings: mission.done ? "'FILL' 1" : undefined }}>
                        {mission.done ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span style={{ color: mission.done ? 'var(--color-on-surface-variant)' : 'var(--color-on-surface)', textDecoration: mission.done ? 'line-through' : 'none' }}>
                        {mission.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Other Scenarios */}
              <div className="rounded-xl shadow-sm p-5" style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Other Scenarios</span>
                  <span className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>{SCENARIOS.length - 1} Available</span>
                </div>
                <div className="space-y-1">
                  {SCENARIOS.slice(1).map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveScenarioIdx(i + 1)}
                      className="w-full text-left p-3 rounded-lg transition-all flex items-center justify-between group"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-container)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{s.emoji}</span>
                        <div>
                          <div className="font-semibold text-sm" style={{ color: 'var(--color-primary)' }}>{s.title}</div>
                          <div className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>{s.jlpt} · {s.subtitle}</div>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-sm" style={{ color: 'var(--color-on-surface-variant)', fontSize: '16px' }}>chevron_right</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Engine Configuration */}
              <div className="rounded-xl shadow-sm p-5" style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Engine Configuration</span>
                  <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--color-on-tertiary-container)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-on-tertiary-container)' }} />
                    BYOK Connected
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="p-2.5 rounded-lg flex items-center justify-between"
                    style={{ backgroundColor: 'var(--color-surface-container-low)' }}>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base" style={{ color: 'var(--color-primary)', fontSize: '18px' }}>neurology</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--color-on-surface)' }}>Gemini 2.0 Flash</span>
                    </div>
                    <span className="text-xs font-mono" style={{ color: 'var(--color-on-surface-variant)' }}>Client API</span>
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-on-surface-variant)' }}>
                      Voicevox TTS Character
                    </label>
                    <select
                      value={voiceChar}
                      onChange={e => setVoiceChar(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ backgroundColor: 'var(--color-surface-container)', color: 'var(--color-on-surface)' }}
                    >
                      <option value="ずんだもん">ずんだもん (Zundamon) - Natural pitch</option>
                      <option value="四国めたん">四国めたん (Shikoku Metan) - Calm</option>
                      <option value="春日部つむぎ">春日部つむぎ (Kasukabe Tsumugi) - Bright</option>
                      <option value="玄野武宏">玄野武宏 (Takehiro Kurono) - Baritone</option>
                    </select>
                  </div>
                  <div className="pt-2 flex items-center justify-between text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
                    <span>Roundtrip Stream:</span>
                    <span className="font-semibold font-mono" style={{ color: 'var(--color-on-surface)' }}>~240ms (Direct)</span>
                  </div>
                </div>
              </div>
            </aside>

            {/* ── CENTER: Chat Stream (6 cols) ─────────────────────────────── */}
            <div className="lg:col-span-6 flex flex-col gap-4">

              {/* Messages Container */}
              <div className="rounded-xl shadow-sm p-6 flex flex-col gap-6"
                style={{ backgroundColor: 'var(--color-surface-container-lowest)', minHeight: '560px' }}>

                {/* Scene Entry Banner */}
                <div className="flex items-center justify-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs"
                    style={{ backgroundColor: 'var(--color-surface-container)', color: 'var(--color-on-surface-variant)' }}>
                    <span className="material-symbols-outlined text-xs" style={{ fontSize: '12px', color: 'var(--color-secondary)' }}>meeting_room</span>
                    You entered "居酒屋 呑み処 歌舞伎町" · Counter Seat 04
                  </div>
                </div>

                {/* Messages */}
                {messages.map(msg => (
                  <div key={msg.id}>
                    {msg.role === 'ai' ? (
                      /* AI Message */
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
                          style={{ backgroundColor: 'var(--color-primary-container)', color: 'var(--color-on-primary)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>face</span>
                        </div>
                        <div className="flex flex-col" style={{ maxWidth: '85%' }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>マスター (Master)</span>
                            <span style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)' }}>{msg.timestamp}</span>
                          </div>
                          <div className="rounded-2xl rounded-tl-sm p-4 shadow-sm"
                            style={{ backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)' }}>
                            <p className="font-medium leading-relaxed mb-2" style={{ fontSize: '16px' }}>
                              {furiganaOn
                                ? msg.text
                                : msg.text
                              }
                            </p>
                            {/* Audio + Translation controls */}
                            <div className="flex items-center gap-3 pt-2 mt-2 border-t"
                              style={{ borderColor: 'rgba(117,119,125,0.3)' }}>
                              <button
                                onClick={() => playMessageAudio(msg.text)}
                                className="w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-transform active:scale-95 flex-shrink-0"
                                style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-on-secondary)' }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>volume_up</span>
                              </button>
                              <MiniWaveform />
                              <button
                                onClick={() => toggleTranslation(msg.id)}
                                className="flex items-center gap-1 text-xs transition-colors flex-shrink-0"
                                style={{ color: 'var(--color-on-surface-variant)' }}
                              >
                                <span>Translation</span>
                                <span className="material-symbols-outlined transition-transform"
                                  style={{ fontSize: '14px', transform: msg.showTranslation ? 'rotate(180deg)' : 'none' }}>
                                  expand_more
                                </span>
                              </button>
                            </div>
                            {msg.showTranslation && msg.translation && (
                              <div className="mt-2.5 p-2 rounded text-xs" style={{ backgroundColor: 'var(--color-surface-container)', color: 'var(--color-on-surface-variant)' }}>
                                "{msg.translation}"
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* User Message */
                      <div className="flex flex-col items-end gap-0">
                        <div className="flex items-start gap-3 justify-end w-full">
                          <div className="flex flex-col items-end" style={{ maxWidth: '85%' }}>
                            <div className="flex items-center gap-2 mb-1">
                              {msg.speechStyle && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                  style={{ backgroundColor: 'var(--color-tertiary-container)', color: 'var(--color-on-tertiary-container)' }}>
                                  Teineigo (丁寧語)
                                </span>
                              )}
                              <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>あなた (You)</span>
                              <span style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)' }}>{msg.timestamp}</span>
                            </div>
                            <div className="rounded-2xl rounded-tr-sm p-4 shadow-sm"
                              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                              <p className="font-medium leading-relaxed" style={{ fontSize: '16px' }}>{msg.text}</p>
                              {msg.purity && (
                                <div className="flex items-center justify-between pt-2 mt-2 border-t text-xs"
                                  style={{ borderColor: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}>
                                  <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'var(--color-on-tertiary-container)' }}>mic</span>
                                    Voice Input (Transcribed)
                                  </span>
                                  <span className="font-mono">Purity: {msg.purity}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm font-bold text-sm"
                            style={{ backgroundColor: 'var(--color-secondary-fixed)', color: 'var(--color-on-secondary-fixed)' }}>
                            YOU
                          </div>
                        </div>

                        {/* Critique Callout */}
                        {msg.critique && (
                          <div className="mt-3 w-full p-3.5 rounded-xl text-left shadow-sm"
                            style={{ backgroundColor: 'var(--color-surface-container)', maxWidth: '85%' }}>
                            <div className="flex items-center gap-1.5 text-xs font-semibold mb-1"
                              style={{ color: 'var(--color-secondary)' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>tips_and_updates</span>
                              {msg.critique.title}
                            </div>
                            <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>{msg.critique.body}</p>
                            <div className="mt-2 p-2 rounded flex items-center justify-between"
                              style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}>
                              <span className="font-bold text-sm" style={{ color: 'var(--color-secondary)' }}>{msg.critique.phrase}</span>
                              <button
                                onClick={() => insertQuickPrompt(msg.critique!.suggestion)}
                                className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                                style={{ backgroundColor: 'var(--color-secondary-fixed)', color: 'var(--color-on-secondary-fixed-variant)' }}
                              >
                                Use Phrasing
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'var(--color-primary-container)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--color-on-primary)' }}>face</span>
                    </div>
                    <div className="rounded-2xl rounded-tl-sm p-4" style={{ backgroundColor: 'var(--color-surface-container-low)' }}>
                      <div className="flex gap-1 items-center">
                        {[0, 150, 300].map(delay => (
                          <div key={delay} className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: 'var(--color-on-surface-variant)', animation: `waveform-pulse 1s ease-in-out infinite`, animationDelay: `${delay}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1">
                <span className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--color-on-surface-variant)' }}>Quick Prompts:</span>
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => insertQuickPrompt(prompt)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-all flex items-center gap-1.5 shadow-sm"
                    style={{ backgroundColor: 'var(--color-surface-container-lowest)', color: 'var(--color-primary)' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-container)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-container-lowest)'}
                  >
                    <span>{prompt}</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>add</span>
                  </button>
                ))}
              </div>

              {/* Chat Input Dock */}
              <div className="rounded-xl shadow-sm p-3.5 flex flex-col gap-2.5"
                style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}>
                {/* Controls Row */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input type="checkbox" defaultChecked className="rounded" style={{ accentColor: 'var(--color-secondary)' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--color-on-surface)' }}>Romaji → Kana Auto-IME</span>
                    </label>
                    <span className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>· Enter to Send</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>Confidence:</span>
                    <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-container-high)' }}>
                      <div className="h-full rounded-full" style={{ width: `${fluency.overall}%`, backgroundColor: 'var(--color-on-tertiary-container)' }} />
                    </div>
                    <span className="text-xs font-bold font-mono" style={{ color: 'var(--color-primary)' }}>{fluency.overall}%</span>
                  </div>
                </div>

                {/* Input Row */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMicActive(v => !v)}
                    className="w-11 h-11 rounded-lg flex items-center justify-center transition-all relative flex-shrink-0"
                    style={{
                      backgroundColor: isMicActive ? 'var(--color-secondary)' : 'var(--color-surface-container)',
                      color: isMicActive ? 'var(--color-on-secondary)' : 'var(--color-on-surface)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>mic</span>
                    {isMicActive && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                        style={{ backgroundColor: 'var(--color-secondary)', animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite' }} />
                    )}
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type in Romaji or Japanese (e.g., 'kanburi o onegaishimasu')..."
                    className="flex-1 h-11 px-4 rounded-lg text-sm focus:outline-none"
                    style={{
                      backgroundColor: 'var(--color-surface-container-low)',
                      color: 'var(--color-on-surface)',
                    }}
                  />

                  <button
                    onClick={sendMessage}
                    disabled={isLoading || !inputText.trim()}
                    className="h-11 px-5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50 flex-shrink-0"
                    style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-on-secondary)' }}
                  >
                    <span>Send</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>send</span>
                  </button>
                </div>

                {/* Mic Active Strip */}
                {isMicActive && (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: 'rgba(255,218,214,0.3)', color: 'var(--color-secondary)' }}>
                    <span className="text-xs font-medium flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-secondary)', animation: 'pulse 1s infinite' }} />
                      Listening for speech in Japanese...
                    </span>
                    <div className="flex items-center gap-1 h-3">
                      {[8, 16, 12, 20, 8].map((h, i) => (
                        <span key={i} className="w-1 rounded-full"
                          style={{ height: `${h}px`, backgroundColor: 'var(--color-secondary)', animation: 'waveform-pulse 0.8s ease-in-out infinite', animationDelay: `${i * 100}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Vocab Catch + Fluency Telemetry (3 cols) ──────────── */}
            <aside className="lg:col-span-3 flex flex-col gap-5">

              {/* Live Vocab Catch */}
              <div className="rounded-xl shadow-sm p-5" style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-lg" style={{ color: 'var(--color-secondary)', fontSize: '20px' }}>bookmark_add</span>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>Live Vocab Catch</span>
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--color-on-surface-variant)' }}>{vocabTerms.length} terms</span>
                </div>
                <p className="text-xs mb-4" style={{ color: 'var(--color-on-surface-variant)' }}>
                  Words auto-parsed from the dialogue. Tap <span className="font-semibold" style={{ color: 'var(--color-secondary)' }}>+</span> to sync with your SRS deck.
                </p>

                <div className="space-y-3">
                  {vocabTerms.map((term, i) => (
                    <div key={i} className="p-3 rounded-lg transition-all flex items-start justify-between"
                      style={{ backgroundColor: 'var(--color-surface-container-low)' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-container)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-container-low)'}
                    >
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-base" style={{ color: 'var(--color-primary)' }}>{term.kanji}</span>
                          <span className="text-xs" style={{ color: 'var(--color-on-surface-variant)', fontSize: '11px' }}>{term.reading}</span>
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-on-surface-variant)' }}>{term.meaning}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="px-1.5 rounded text-xs"
                            style={{ backgroundColor: 'var(--color-surface-variant)', color: 'var(--color-on-surface-variant)', fontSize: '10px' }}>
                            {term.tag.includes('N') ? 'JLPT' : term.tag.includes('Essential') ? 'Izakaya Jargon' : term.tagColor === 'tertiary' ? 'Essential' : 'Noun'}
                          </span>
                          <span className="text-xs font-semibold"
                            style={{ fontSize: '10px', color: term.tagColor === 'secondary' ? 'var(--color-secondary)' : term.tagColor === 'tertiary' ? 'var(--color-on-tertiary-container)' : 'var(--color-on-surface-variant)' }}>
                            {term.tag}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => !term.added && addVocabToSRS(term)}
                        className="px-2 py-1 rounded text-xs font-semibold shadow-sm transition-colors flex-shrink-0"
                        style={term.added
                          ? { backgroundColor: 'var(--color-secondary-fixed)', color: 'var(--color-on-secondary-fixed-variant)' }
                          : { backgroundColor: 'var(--color-surface-container-lowest)', color: 'var(--color-primary)' }
                        }
                      >
                        {term.added ? 'Added ✓' : '+ SRS'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Session Fluency Telemetry */}
              <div className="rounded-xl shadow-sm p-5" style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Session Fluency</span>
                  <span className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>{fluency.overall} / 100</span>
                </div>

                <div className="flex items-center justify-center my-2">
                  <FluencyCircle score={fluency.overall} />
                </div>

                <div className="space-y-2.5 pt-2">
                  {[
                    { label: 'Grammar Accuracy', val: fluency.grammar, color: 'var(--color-on-tertiary-container)' },
                    { label: 'Conversational Nuance', val: fluency.nuance, color: 'var(--color-secondary)' },
                    { label: 'Honorifics (Keigo/Teineigo)', val: fluency.keigo, color: 'var(--color-primary)' },
                  ].map(({ label, val, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: 'var(--color-on-surface-variant)' }}>{label}</span>
                        <span className="font-bold" style={{ color: 'var(--color-primary)' }}>{val}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-container)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cultural note */}
                <div className="mt-4 p-3 rounded-lg text-xs leading-relaxed"
                  style={{ backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface-variant)' }}>
                  <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>Izakaya Custom Note:</span>{' '}
                  The otoshi (small starter) arrives automatically without ordering. Don't be surprised when it appears on your bill!
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <KotoFooter />
    </div>
  );
}
