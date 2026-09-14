import { useState, useRef } from 'react';
import { db } from '../db';
import { playVoicevox } from '../audio';
import KotoHeader from '../components/KotoHeader';
import KotoFooter from '../components/KotoFooter';

// ─── Types ────────────────────────────────────────────────────────────────────
type FuriganaMode = 'on' | 'hover' | 'off';
type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

// ─── Article Data ─────────────────────────────────────────────────────────────
const KEY_LEXICON = [
  { kanji: '伝統的', reading: 'でんとうてき', meaning: 'Traditional, conventional', level: 'N3' },
  { kanji: '一期一会', reading: 'いちごいちえ', meaning: 'Once in a lifetime encounter', level: 'N2' },
  { kanji: '歓迎', reading: 'かんげい', meaning: 'Welcome, reception', level: 'N3' },
  { kanji: '継承', reading: 'けいしょう', meaning: 'Inheritance, succession', level: 'N1' },
];

const QUIZ = [
  {
    question: '1. 「おもてなし」の起源として本文で挙げられている日本の伝統文化は何ですか？',
    options: ['A. 歌舞伎 (Kabuki theater)', 'B. 茶道 (Tea ceremony / Sen no Rikyū)', 'C. 華道 (Flower arrangement)'],
    correctIndex: 1,
  },
  {
    question: '2. 新幹線の清掃チームが車内を整える時間は何分間ですか？',
    options: ['A. 5分間', 'B. 10分間', 'C. 7分間'],
    correctIndex: 2,
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Ruby text with controlled furigana visibility */
function R({ kanji, rt, mode }: { kanji: string; rt: string; mode: FuriganaMode }) {
  const [hovered, setHovered] = useState(false);
  const rtVisible = mode === 'on' || (mode === 'hover' && hovered);
  return (
    <ruby
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cursor-default"
    >
      {kanji}
      <rt style={{
        visibility: rtVisible ? 'visible' : 'hidden',
        fontSize: '11px', lineHeight: '14px', letterSpacing: '0.02em',
        color: 'var(--color-on-surface-variant)', fontWeight: 400,
      }}>
        {rt}
      </rt>
    </ruby>
  );
}

/** Highlighted word with popover */
function WordPopover({ kanji, rt, mode, onAddToSRS }: {
  kanji: string; rt: string; mode: FuriganaMode; onAddToSRS?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    setAdded(true);
    onAddToSRS?.();
  };

  return (
    <span className="relative inline-block mx-1">
      <span
        className="px-2 py-0.5 rounded shadow-sm cursor-pointer select-none"
        style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-on-secondary)' }}
        onClick={() => setOpen(v => !v)}
      >
        <ruby>
          {kanji}
          <rt style={{
            fontSize: '11px', lineHeight: '14px',
            color: 'rgba(255,255,255,0.75)',
            visibility: mode !== 'off' ? 'visible' : 'hidden',
          }}>{rt}</rt>
        </ruby>
      </span>

      {open && (
        <div
          className="absolute left-1/2 bottom-full mb-3 w-80 rounded-xl p-5 shadow-xl z-50 text-left"
          style={{ transform: 'translateX(-50%)', backgroundColor: 'var(--color-surface-container-lowest)' }}
        >
          {/* Arrow */}
          <div className="absolute top-full left-1/2 w-3 h-3 rotate-45 -mt-1.5"
            style={{ transform: 'translateX(-50%)', backgroundColor: 'var(--color-surface-container-lowest)' }} />

          <div className="flex items-start justify-between gap-2 pb-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-xl" style={{ color: 'var(--color-primary)' }}>{kanji}</span>
                <span className="text-base" style={{ color: 'var(--color-on-surface-variant)' }}>{rt}</span>
              </div>
              <span className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>dentōteki</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="px-2 py-0.5 rounded text-xs font-semibold"
                style={{ backgroundColor: 'var(--color-surface-container)', color: 'var(--color-on-surface)' }}>
                N3 Adj-na
              </span>
              <span className="text-xs font-bold flex items-center gap-0.5"
                style={{ color: 'var(--color-on-tertiary-container)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>hearing</span>
                Pitch: [0] 平板
              </span>
            </div>
          </div>

          {/* Pitch curve */}
          <div className="my-2 p-2 rounded flex items-center justify-between"
            style={{ backgroundColor: 'var(--color-surface-container-low)' }}>
            <span className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>Pitch Curve (Heiban)</span>
            <svg className="w-28 h-6" fill="none" viewBox="0 0 110 24">
              <path d="M 8 18 L 30 6 L 55 6 L 80 6 L 105 6" stroke="var(--color-secondary)" strokeLinecap="round" strokeWidth="2.5" />
              <circle cx="8" cy="18" r="3.5" fill="var(--color-surface-container-lowest)" stroke="var(--color-secondary)" strokeWidth="2" />
              {[30, 55, 80, 105].map(x => (
                <circle key={x} cx={x} cy="6" r="3.5" fill="var(--color-secondary)" />
              ))}
            </svg>
          </div>

          <div className="py-2">
            <p className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>1. Traditional; conventional</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-on-surface-variant)' }}>
              Relating to customs or traits inherited continuously over generations.
            </p>
          </div>

          <button
            onClick={handleAdd}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all w-full"
            style={added
              ? { backgroundColor: 'var(--color-tertiary-fixed)', color: 'var(--color-on-tertiary-fixed)' }
              : { backgroundColor: 'var(--color-secondary)', color: 'var(--color-on-secondary)' }
            }
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
              {added ? 'check' : 'bookmark_add'}
            </span>
            {added ? '✓ Added to Custom Deck' : '+ Add to SRS Flashcard Deck'}
          </button>
          <button
            className="absolute top-3 right-3 p-1 rounded"
            style={{ color: 'var(--color-on-surface-variant)' }}
            onClick={() => setOpen(false)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
          </button>
        </div>
      )}
    </span>
  );
}

// ─── Audio Waveform Bar ───────────────────────────────────────────────────────
function AudioWaveform({ playing }: { playing: boolean }) {
  const heights = [8, 16, 28, 24, 32, 20, 28, 12, 8, 20, 24, 12, 20, 32, 16, 8, 12, 4, 16, 24, 8];
  const colors = ['var(--color-on-tertiary-container)', 'var(--color-on-tertiary-container)', 'var(--color-on-tertiary-container)',
    'var(--color-secondary)', 'var(--color-secondary)', 'var(--color-secondary)',
    'var(--color-on-primary)', 'var(--color-on-primary)', 'var(--color-on-primary-container)',
    'var(--color-on-tertiary-container)', 'var(--color-on-tertiary-container)', 'var(--color-on-tertiary-container)',
    'var(--color-on-tertiary-container)', 'var(--color-on-primary)', 'var(--color-on-primary)',
    'var(--color-on-primary)', 'var(--color-on-primary-container)', 'var(--color-on-primary-container)',
    'var(--color-on-tertiary-container)', 'var(--color-on-tertiary-container)', 'var(--color-on-tertiary-container)',
  ];
  return (
    <div className="flex items-center gap-1 w-full h-8 px-3 rounded" style={{ backgroundColor: 'rgba(9,20,38,0.4)' }}>
      {heights.map((h, i) => (
        <div key={i} className="w-1 rounded-full flex-shrink-0 transition-all"
          style={{
            height: `${h}px`,
            backgroundColor: colors[i],
            animation: playing ? `waveform-pulse 0.8s ease-in-out infinite` : 'none',
            animationDelay: `${i * 40}ms`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GradedReader() {
  const [jlpt, setJlpt] = useState<JLPTLevel>('N3');
  const [furiganaMode, setFuriganaMode] = useState<FuriganaMode>('on');
  const [romajiOn, setRomajiOn] = useState(false);
  const [glossOn, setGlossOn] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [addedWords, setAddedWords] = useState<Set<string>>(new Set());

  const handlePlay = async () => {
    setIsPlaying(v => !v);
    if (!isPlaying) {
      await playVoicevox('この文化はおもてなしと呼ばれ、伝統的な哲学に基づいています。');
      setIsPlaying(false);
    }
  };

  const handleAddToSRS = async (kanji: string, reading: string, meaning: string) => {
    setAddedWords(prev => new Set(prev).add(kanji));
    const decks = await db.decks.toArray();
    const deckId = decks[0]?.id ?? 1;
    const exists = await db.flashcards.where({ deckId }).filter(c => c.front === kanji).count();
    if (exists === 0) {
      await db.flashcards.add({
        deckId, front: kanji,
        back: `${reading} · ${meaning}`,
        interval: 0, repetition: 0, efactor: 2.5,
        dueDate: new Date().toISOString(),
      });
    }
  };

  const handleAnswer = (qIdx: number, optIdx: number) => {
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const R_ = (props: { kanji: string; rt: string }) => (
    <R {...props} mode={furiganaMode} />
  );

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--color-surface)', fontFamily: "'Noto Sans', sans-serif" }}>
      <KotoHeader />

      <main className="w-full pt-16" style={{ backgroundColor: 'var(--color-surface)', minHeight: '100vh' }}>

        {/* ── Sticky Reading Control Bar ──────────────────────────────────── */}
        <div
          className="sticky top-16 z-40 backdrop-blur-md shadow-sm px-6 py-3 w-full"
          style={{ backgroundColor: 'rgba(250,249,246,0.95)' }}
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* JLPT Selector */}
              <div className="flex items-center p-1 rounded-lg" style={{ backgroundColor: 'var(--color-surface-container-high)' }}>
                <span className="px-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>JLPT</span>
                {(['N5','N4','N3','N2','N1'] as JLPTLevel[]).map(level => (
                  <button
                    key={level}
                    onClick={() => setJlpt(level)}
                    className="px-2.5 py-1 rounded text-xs font-medium transition-all"
                    style={jlpt === level
                      ? { backgroundColor: 'var(--color-secondary)', color: 'var(--color-on-secondary)', fontWeight: 700 }
                      : { color: 'var(--color-on-surface-variant)' }
                    }
                  >
                    {level}
                  </button>
                ))}
              </div>

              {/* Furigana Switcher */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--color-surface-container-low)' }}>
                <span className="text-xs font-semibold uppercase tracking-wider mr-1" style={{ color: 'var(--color-on-surface-variant)', fontSize: '11px' }}>Furigana</span>
                {(['on','hover','off'] as FuriganaMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setFuriganaMode(m)}
                    className="px-2.5 py-1 rounded text-xs transition-all capitalize"
                    style={furiganaMode === m
                      ? { backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', fontWeight: 700 }
                      : { color: 'var(--color-on-surface-variant)' }
                    }
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>

              {/* Romaji & Gloss toggles */}
              <div className="hidden xl:flex items-center gap-2">
                <button
                  onClick={() => setRomajiOn(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs shadow-sm transition-colors"
                  style={{ backgroundColor: 'var(--color-surface-container-lowest)', color: 'var(--color-on-surface-variant)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>translate</span>
                  Romaji: <strong style={{ color: 'var(--color-on-surface)' }}>{romajiOn ? 'On' : 'Off'}</strong>
                </button>
                <button
                  onClick={() => setGlossOn(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs shadow-sm transition-colors"
                  style={{ backgroundColor: 'var(--color-surface-container-lowest)', color: 'var(--color-on-surface-variant)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-on-tertiary-container)' }}>info</span>
                  English Gloss: <strong style={{ color: 'var(--color-on-surface)' }}>{glossOn ? 'On' : 'Off'}</strong>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Speed Control */}
              <div className="flex items-center p-1 rounded-lg" style={{ backgroundColor: 'var(--color-surface-container-high)' }}>
                {[0.8, 1.0, 1.2].map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className="px-2 py-1 rounded text-xs transition-all"
                    style={speed === s
                      ? { backgroundColor: 'var(--color-surface-container-lowest)', color: 'var(--color-primary)', fontWeight: 700 }
                      : { color: 'var(--color-on-surface-variant)' }
                    }
                  >
                    {s.toFixed(1)}x
                  </button>
                ))}
              </div>
              {/* Shadowing Lab pill */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: 'var(--color-tertiary-fixed)', color: 'var(--color-on-tertiary-fixed)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-on-tertiary-container)' }}>record_voice_over</span>
                Shadowing Lab
              </div>
            </div>
          </div>
        </div>

        {/* ── Audio Waveform Banner ───────────────────────────────────────── */}
        <div className="w-full px-6 py-3 shadow-md" style={{ backgroundColor: 'var(--color-primary-container)' }}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <button
                onClick={handlePlay}
                className="w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95 flex-shrink-0"
                style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-on-secondary)' }}
              >
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold" style={{ color: 'var(--color-on-primary)' }}>Voicevox 4.8</span>
                  <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgba(216,227,251,0.2)', color: 'var(--color-primary-fixed)' }}>
                    春日部つむぎ (Kasukabe Tsumugi)
                  </span>
                  <span className="hidden sm:flex items-center gap-1 text-xs" style={{ color: 'var(--color-on-primary-container)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-on-tertiary-container)' }} />
                    Synced Sentence 2/8
                  </span>
                </div>
                <p className="text-xs truncate max-w-sm sm:max-w-md mt-0.5" style={{ color: 'var(--color-on-primary-container)' }}>
                  「おもてなし」とは、相手を思いやる伝統的な心遣いです。
                </p>
              </div>
            </div>

            <AudioWaveform playing={isPlaying} />

            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                style={{ backgroundColor: 'rgba(216,227,251,0.2)', color: 'var(--color-on-primary)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>repeat_one</span>
                <span className="hidden sm:inline">Loop</span>
              </button>
              <button
                onClick={() => setIsRecording(v => !v)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                style={isRecording
                  ? { backgroundColor: 'var(--color-secondary)', color: 'var(--color-on-secondary)', animation: 'pulse 1s infinite' }
                  : { backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }
                }
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: isRecording ? 'var(--color-on-secondary)' : 'var(--color-secondary)' }}>mic</span>
                {isRecording ? 'Recording...' : 'Shadow Rec'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Main Content Grid ─────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-6 py-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* ── Left: Graded Reader (8 cols) ──────────────────────────── */}
            <section className="lg:col-span-8 flex flex-col gap-6">

              {/* Article Metadata Card */}
              <div
                className="rounded-xl p-8 shadow-sm flex flex-col gap-6 relative overflow-hidden"
                style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}
              >
                {/* Watermark */}
                <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 opacity-[0.05] pointer-events-none select-none"
                  style={{ fontSize: '180px', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>迎</div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: 'var(--color-secondary-fixed)', color: 'var(--color-on-secondary-fixed-variant)' }}>
                    {jlpt} Intermed
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs"
                    style={{ backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}>
                    Culture &amp; Society
                  </span>
                  <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-on-surface-variant)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span> 4 mins read
                  </span>
                  <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-on-surface-variant)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>format_size</span> 420 words
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-primary)' }}>
                    日本の「おもてなし」文化と現代の進化
                  </h1>
                  <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
                    Omotenashi Culture and Modern Evolution in Japan: The philosophy of selfless hospitality and how digital innovation adapts to centuries-old courtesy.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 p-3 rounded-lg"
                  style={{ backgroundColor: 'rgba(244,243,241,0.5)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: 'var(--color-secondary-fixed)', color: 'var(--color-on-secondary-fixed-variant)' }}>
                      つむ
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>Native Narration: 春日部つむぎ</p>
                      <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>Standard Kanto Dialect · Pitch Neutral</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-on-surface-variant)' }}>
                      <span className="material-symbols-outlined text-lg" style={{ fontSize: '20px' }}>bookmark</span>
                    </button>
                    <button className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-on-surface-variant)' }}>
                      <span className="material-symbols-outlined text-lg" style={{ fontSize: '20px' }}>download</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Article Body */}
              <article
                className="rounded-xl p-8 shadow-sm flex flex-col gap-8 leading-relaxed"
                style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}
              >
                {/* Section 1: Introduction */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: 'var(--color-surface-container)' }}>1</span>
                    <span>Introduction</span>
                  </div>

                  {/* Sentence 1 */}
                  <p className="text-lg leading-loose" style={{ color: 'var(--color-on-surface)' }}>
                    <R_ kanji="日本" rt="にほん" />を
                    <R_ kanji="訪" rt="おとず" />れる
                    <R_ kanji="多" rt="おお" />くの
                    <R_ kanji="外国人" rt="がいこくじん" />が、
                    <R_ kanji="丁寧" rt="ていねい" />なサービスと
                    <R_ kanji="暖" rt="あたた" />かい
                    <R_ kanji="歓迎" rt="かんげい" />に
                    <R_ kanji="深" rt="ふか" />く
                    <R_ kanji="感動" rt="かんどう" />します。
                  </p>

                  {/* Sentence 2 — Active/highlighted */}
                  <div className="relative p-4 rounded-xl shadow-sm transition-all"
                    style={{ backgroundColor: 'rgba(255,218,214,0.4)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold flex items-center gap-1" style={{ color: 'var(--color-secondary)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>volume_up</span>
                        Playing Sentence 2
                      </span>
                      <span className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>· 00:08 / 00:16</span>
                    </div>
                    <p className="text-lg font-medium leading-loose" style={{ color: 'var(--color-primary)' }}>
                      この<R_ kanji="文化" rt="ぶんか" />は「おもてなし」と
                      <R_ kanji="呼" rt="よ" />ばれ、
                      <R_ kanji="単" rt="たん" />なる接客ではなく、
                      <WordPopover
                        kanji="伝統的"
                        rt="でんとうてき"
                        mode={furiganaMode}
                        onAddToSRS={() => handleAddToSRS('伝統的', 'でんとうてき', 'Traditional; conventional')}
                      />な
                      <R_ kanji="哲学" rt="てつがく" />に
                      <R_ kanji="基" rt="もとづ" />いています。
                    </p>
                    {glossOn && (
                      <p className="text-xs mt-2 italic p-2 rounded"
                        style={{ color: 'var(--color-on-surface-variant)', backgroundColor: 'rgba(255,255,255,0.7)' }}>
                        "This culture is known as 'omotenashi,' and rather than simple customer service, it is founded upon traditional philosophy."
                      </p>
                    )}
                  </div>

                  {/* Sentence 3 */}
                  <p className="text-lg leading-loose" style={{ color: 'var(--color-on-surface)' }}>
                    <R_ kanji="相手" rt="あいて" />が
                    <R_ kanji="言葉" rt="ことば" />にしなくても、
                    <R_ kanji="何" rt="なに" />を
                    <R_ kanji="求" rt="もと" />めているかを
                    <R_ kanji="察" rt="さっ" />して
                    <R_ kanji="行動" rt="こうどう" />することが
                    <R_ kanji="最" rt="もっと" />も
                    <R_ kanji="大切" rt="たいせつ" />にされます。
                  </p>
                </div>

                {/* Section 2: Tea Ceremony */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: 'var(--color-surface-container)' }}>2</span>
                    <span>Origin in the Tea Ceremony</span>
                  </div>
                  <p className="text-lg leading-loose" style={{ color: 'var(--color-on-surface)' }}>
                    この<R_ kanji="考" rt="かんが" /><R_ kanji="方" rt="かた" />の
                    <R_ kanji="起源" rt="きげん" />は、
                    <R_ kanji="千利休" rt="せんのりきゅう" />が
                    <R_ kanji="大成" rt="たいせい" />させた
                    <R_ kanji="茶道" rt="さどう" />の
                    「<R_ kanji="一期一会" rt="いちごいちえ" />」にあります。
                    <R_ kanji="客" rt="きゃく" />と
                    <R_ kanji="亭主" rt="ていしゅ" />が
                    <R_ kanji="心" rt="こころ" />を
                    <R_ kanji="通" rt="かよ" />わせ、その<R_ kanji="瞬間" rt="しゅんかん" />を
                    <R_ kanji="最高" rt="さいこう" />のものにするために、
                    <R_ kanji="庭" rt="にわ" />の<R_ kanji="掃除" rt="そうじ" />や
                    <R_ kanji="花" rt="はな" />の<R_ kanji="生" rt="い" />け<R_ kanji="方" rt="かた" />まで
                    <R_ kanji="細部" rt="さいぶ" />に<R_ kanji="気" rt="き" />を
                    <R_ kanji="配" rt="くば" />ります。
                  </p>
                  <p className="text-lg leading-loose" style={{ color: 'var(--color-on-surface)' }}>
                    <R_ kanji="見返" rt="みかえ" />りを<R_ kanji="求" rt="もと" />めない
                    <R_ kanji="純粋" rt="じゅんすい" />な<R_ kanji="敬意" rt="けいい" />こそが、
                    「表（おもて）」がなく「裏（うら）」のない、つまり「おもてなし」の
                    <R_ kanji="語源" rt="ごげん" />のひとつとも<R_ kanji="言" rt="い" />われています。
                  </p>
                </div>

                {/* Section 3: Modern Evolution */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: 'var(--color-surface-container)' }}>3</span>
                    <span>Digital &amp; Modern Evolution</span>
                  </div>
                  <p className="text-lg leading-loose" style={{ color: 'var(--color-on-surface)' }}>
                    <R_ kanji="現代" rt="げんだい" />の日本では、この<R_ kanji="伝統" rt="でんとう" />がテクノロジーと
                    <R_ kanji="融合" rt="ゆうごう" /><R_ kanji="始" rt="はじ" />めています。
                    <R_ kanji="新幹線" rt="しんかんせん" />の<R_ kanji="清掃" rt="せいそう" />チームがわずか7<R_ kanji="分" rt="ふん" />で
                    <R_ kanji="車内" rt="しゃない" />を<R_ kanji="完璧" rt="かんぺき" />に
                    <R_ kanji="整" rt="ととの" />える「7分間の奇跡」や、ホテルの配膳ロボットに
                    <R_ kanji="礼儀" rt="れいぎ" /><R_ kanji="正" rt="ただ" />しいお辞儀を
                    <R_ kanji="組" rt="く" /><R_ kanji="込" rt="こ" />むなど、形を変えて
                    <R_ kanji="継承" rt="けいしょう" />されています。
                  </p>
                </div>

                {/* Reader Action Footer */}
                <div className="flex items-center justify-between pt-6 p-4 rounded-xl"
                  style={{ backgroundColor: 'var(--color-surface-container-low)' }}>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl" style={{ color: 'var(--color-on-tertiary-container)', fontSize: '28px' }}>check_circle</span>
                    <div>
                      <p className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>Story Read: 100% Completed</p>
                      <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>Earned +25 Mastery XP</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                    Next {jlpt} Article →
                  </button>
                </div>
              </article>

              {/* Cultural Footnote Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    label: 'Cultural Footnote', title: '一期一会 (Ichigo Ichie)',
                    desc: '"Treasure every meeting, for it will never recur."',
                    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpbcr-ZsMmaQh_uj8dWwkXC__3TeK5teKZNSyW56rLlONdV5YBesTqipZ0fi0xoGnE9pVeq5FFtT4gW7AV1vUU0kpykxlWNmlghz4er1z6DwjdiIKFIu_6NWnItHFIfjb7wmUsG6eyy63Ozw-hsaluOr-dJJX0k-Ez9x26c8RyyyjxraQby9rlzR3sS1H723zBCRUUq9VfoKVcJKz_qZ8BlVGHmS-_MOF-A00L9rFUp5_ml5PaSe2S9A'
                  },
                  {
                    label: 'Modern Practice', title: '7分間の奇跡 (7-Min Miracle)',
                    desc: 'The rapid cleaning ritual of the Shinkansen crews.',
                    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDxfHLWTCGn0tmLJkdZZ0SOwDSxtaMFZASlN-Ci1E_AYV7leeZqsCba8CR58VyeV-QmTHZz-qW55Wf0lqC1f62KwVnjoQXocIT8_ENzpT8Bc_l7WgHqcO4xHXgvXtGRnxtMIqrtvB5cFjFAh3WnqQIOrq4rQYSQ7pw0R-ACaO6u3N-diWx89pNU5R78rpe9aQ8xMCnody9omuwAZYruZPs8YM7RMzqlODLHjnB50-OX7TvfBLedrJLIw'
                  }
                ].map(({ label, title, desc, img }) => (
                  <div key={title} className="rounded-xl p-4 shadow-sm flex items-center gap-4"
                    style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}>
                    <img src={img} alt={title} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-xs uppercase" style={{ color: 'var(--color-on-surface-variant)' }}>{label}</span>
                      <span className="font-bold text-base" style={{ color: 'var(--color-primary)' }}>{title}</span>
                      <span className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>{desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Right: Shadowing Lab + Comprehension + Lexicon (4 cols) ── */}
            <aside className="lg:col-span-4 flex flex-col gap-6">

              {/* Shadowing Lab */}
              <div className="rounded-xl p-6 shadow-md flex flex-col gap-5"
                style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}>
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-2xl" style={{ color: 'var(--color-secondary)', fontSize: '24px' }}>record_voice_over</span>
                    <h2 className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>Shadowing Lab</h2>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold"
                    style={{ backgroundColor: 'var(--color-surface-container)', color: 'var(--color-on-surface)' }}>
                    Active Sentence 2
                  </span>
                </div>

                {/* Target sentence */}
                <div className="p-4 rounded-xl flex flex-col gap-1.5" style={{ backgroundColor: 'var(--color-surface-container-low)' }}>
                  <span className="text-xs font-semibold uppercase" style={{ color: 'var(--color-on-surface-variant)' }}>Target Pitch Cadence</span>
                  <p className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>
                    「伝統的な哲学に基づいています」
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
                    でんとうてき な てつがく に もとづいて います
                  </p>
                </div>

                {/* Dual waveform comparison */}
                <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ backgroundColor: 'var(--color-surface)' }}>
                  {/* Native guide */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-on-tertiary-container)' }} />
                        Native Guide (Voicevox)
                      </span>
                      <span className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>100% Target</span>
                    </div>
                    <svg className="w-full h-8" fill="none" viewBox="0 0 260 32">
                      <path d="M 0 16 Q 20 2, 40 16 T 80 16 T 120 4 T 160 22 T 200 10 T 240 16 T 260 16"
                        stroke="var(--color-on-tertiary-container)" strokeLinecap="round" strokeWidth="2.5" />
                      {[40, 120, 200].map(x => (
                        <line key={x} x1={x} x2={x} y1="10" y2="22"
                          stroke="var(--color-on-tertiary-container)" strokeWidth="1.5" />
                      ))}
                    </svg>
                  </div>
                  {/* User waveform */}
                  <div className="flex flex-col gap-1 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold flex items-center gap-1" style={{ color: 'var(--color-secondary)' }}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-secondary)' }} />
                        Your Voice Capture
                      </span>
                      <span className="font-bold text-xs" style={{ color: 'var(--color-on-secondary-fixed-variant)' }}>92% Match</span>
                    </div>
                    <svg className="w-full h-8" fill="none" viewBox="0 0 260 32">
                      <path d="M 0 16 Q 20 4, 40 15 T 80 17 T 120 5 T 160 20 T 200 11 T 240 15 T 260 16"
                        stroke="var(--color-secondary)" strokeLinecap="round" strokeWidth="2.5" />
                      {[40, 120, 200].map(x => (
                        <line key={x} x1={x} x2={x} y1="12" y2="20"
                          stroke="var(--color-secondary)" strokeWidth="1.5" />
                      ))}
                    </svg>
                  </div>
                </div>

                {/* Score cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg flex flex-col" style={{ backgroundColor: 'var(--color-surface-container-low)' }}>
                    <span className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>Cadence Match</span>
                    <span className="font-bold text-xl" style={{ color: 'var(--color-on-tertiary-container)' }}>92%</span>
                    <span className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>Syllable rhythm synced</span>
                  </div>
                  <div className="p-3 rounded-lg flex flex-col" style={{ backgroundColor: 'var(--color-surface-container-low)' }}>
                    <span className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>Pitch Accuracy</span>
                    <span className="font-bold text-xl" style={{ color: 'var(--color-primary)' }}>Excellent</span>
                    <span className="text-xs" style={{ color: 'var(--color-on-tertiary-container)' }}>Flat [0] maintained</span>
                  </div>
                </div>

                {/* Protocol steps */}
                <div className="flex flex-col gap-2 pt-1">
                  <span className="text-xs font-semibold uppercase" style={{ color: 'var(--color-on-surface-variant)' }}>
                    Listen &amp; Repeat Protocol
                  </span>
                  {[
                    { step: 1, text: "Listen to Kasukabe's pitch rise", done: true },
                    { step: 2, text: 'Shadow simultaneously with 0.2s delay', done: true },
                    { step: 3, text: 'Inspect your waveform peak alignment', done: false },
                  ].map(({ step, text, done }) => (
                    <div key={step} className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-on-surface)' }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs"
                        style={done
                          ? { backgroundColor: 'var(--color-secondary)', color: 'var(--color-on-secondary)' }
                          : { backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }
                        }>
                        {step}
                      </div>
                      <span>{text}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setIsRecording(v => !v)}
                  className="w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95"
                  style={{
                    backgroundColor: isRecording ? 'var(--color-on-secondary-fixed-variant)' : 'var(--color-secondary)',
                    color: 'var(--color-on-secondary)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>mic</span>
                  {isRecording ? '● Recording... Click to Stop' : 'Record Voicevox Shadow Trial'}
                </button>
              </div>

              {/* Comprehension Quiz */}
              <div className="rounded-xl p-6 shadow-sm flex flex-col gap-5"
                style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}>
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl" style={{ color: 'var(--color-primary)', fontSize: '22px' }}>quiz</span>
                    <h3 className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>Comprehension</h3>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-on-surface-variant)' }}>
                    {Object.keys(answers).length} of {QUIZ.length} Solved
                  </span>
                </div>

                {QUIZ.map((q, qIdx) => (
                  <div key={qIdx} className="flex flex-col gap-3">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{q.question}</p>
                    <div className="flex flex-col gap-2">
                      {q.options.map((opt, optIdx) => {
                        const selected = answers[qIdx] === optIdx;
                        const correct = optIdx === q.correctIndex;
                        const answered = qIdx in answers;
                        return (
                          <button
                            key={optIdx}
                            onClick={() => handleAnswer(qIdx, optIdx)}
                            disabled={answered}
                            className="w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-center justify-between"
                            style={
                              answered && correct
                                ? { backgroundColor: 'var(--color-tertiary-fixed)', color: 'var(--color-on-tertiary-fixed)' }
                                : answered && selected && !correct
                                ? { backgroundColor: 'var(--color-error-container)', color: 'var(--color-error)' }
                                : { backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)' }
                            }
                          >
                            <span>{opt}</span>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: answered && correct ? 'var(--color-on-tertiary-container)' : 'var(--color-on-surface-variant)' }}>
                              {answered && correct ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Key Lexicon */}
              <div className="rounded-xl p-6 shadow-sm flex flex-col gap-4"
                style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}>
                <div className="flex items-center justify-between pb-1">
                  <h3 className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>Key Lexicon</h3>
                  <span className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>4 Essential Words</span>
                </div>
                <div className="flex flex-col gap-3">
                  {KEY_LEXICON.map(({ kanji, reading, meaning, level }) => (
                    <div
                      key={kanji}
                      className="p-2.5 rounded-lg transition-colors flex items-center justify-between"
                      style={{ backgroundColor: 'var(--color-surface-container-low)' }}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>{kanji}</span>
                          <span className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>{reading}</span>
                        </div>
                        <span className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>{meaning}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold"
                          style={{ backgroundColor: 'var(--color-surface-container)', color: 'var(--color-on-surface)' }}>
                          {level}
                        </span>
                        <button
                          onClick={() => handleAddToSRS(kanji, reading, meaning)}
                          className="p-1 rounded transition-colors"
                          style={{ color: addedWords.has(kanji) ? 'var(--color-on-tertiary-container)' : 'var(--color-on-surface-variant)' }}
                          title="Add to SRS"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                            {addedWords.has(kanji) ? 'check' : 'bookmark_add'}
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  className="w-full py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                  style={{ backgroundColor: 'var(--color-surface-container)', color: 'var(--color-on-surface)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>view_list</span>
                  View All 18 Article Terms
                </button>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <KotoFooter />
    </div>
  );
}
