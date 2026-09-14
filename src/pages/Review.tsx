import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { playVoicevox } from '../audio';
import KotoHeader from '../components/KotoHeader';
import KotoFooter from '../components/KotoFooter';

// ─── Subcomponents ───────────────────────────────────────────────────────────

function Waveform({ playing }: { playing: boolean }) {
  const bars = [
    { h: 'h-3', delay: '0ms' },
    { h: 'h-5', delay: '150ms' },
    { h: 'h-2', delay: '75ms' },
    { h: 'h-6', delay: '200ms' },
    { h: 'h-4', delay: '100ms' },
  ];
  return (
    <div className="flex items-center gap-[3px] px-3 py-2.5 rounded-full"
         style={{ backgroundColor: 'var(--color-surface-container-low)' }}>
      {bars.map((b, i) => (
        <div
          key={i}
          className={`w-1 ${b.h} rounded-full transition-all`}
          style={{
            backgroundColor: playing ? 'var(--color-secondary)' : 'rgba(69,71,76,0.3)',
            animation: playing ? `waveform-pulse 0.8s ease-in-out infinite` : 'none',
            animationDelay: b.delay,
          }}
        />
      ))}
      {/* greyed out tail bars */}
      <div className="w-1 h-3 rounded-full ml-1" style={{ backgroundColor: 'rgba(69,71,76,0.25)' }} />
      <div className="w-1 h-2 rounded-full"       style={{ backgroundColor: 'rgba(69,71,76,0.25)' }} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Review() {
  const [showDeckMenu, setShowDeckMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [furiganaOn, setFuriganaOn] = useState(true);
  const [romajiOn, setRomajiOn] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(522);

  // New card form
  const [newFront, setNewFront] = useState('');
  const [newReading, setNewReading] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newSentence, setNewSentence] = useState('');

  // SRS state
  const dueCards = useLiveQuery(async () => {
    const today = new Date().toISOString();
    return await db.flashcards.where('dueDate').belowOrEqual(today).toArray();
  });

  const allCards = useLiveQuery(() => db.flashcards.toArray());

  const currentCard = dueCards?.[0] ?? null;

  // Timer
  useEffect(() => {
    const id = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  // Keyboard shortcuts
  const handleScore = useCallback(async (quality: number) => {
    if (!currentCard) return;
    let { repetition, interval, efactor } = currentCard;
    if (quality >= 3) {
      if (repetition === 0) interval = 1;
      else if (repetition === 1) interval = 6;
      else interval = Math.round(interval * efactor);
      repetition += 1;
    } else {
      repetition = 0;
      interval = 1;
    }
    efactor = efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (efactor < 1.3) efactor = 1.3;
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + interval);
    await db.flashcards.update(currentCard.id!, { repetition, interval, efactor, dueDate: nextDue.toISOString() });
  }, [currentCard]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showModal) return;
      if (e.key === '1') handleScore(0);
      if (e.key === '2') handleScore(3);
      if (e.key === '3') handleScore(4);
      if (e.key === '4') handleScore(5);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleScore, showModal]);

  const handlePlay = async () => {
    if (!currentCard) return;
    setAudioPlaying(true);
    await playVoicevox(currentCard.front);
    setTimeout(() => setAudioPlaying(false), 2000);
  };

  const handleAddCard = async () => {
    if (!newFront || !newMeaning) return;
    // Add to default deck (id=1) or first deck
    const decks = await db.decks.toArray();
    const deckId = decks[0]?.id ?? 1;
    await db.flashcards.add({
      deckId,
      front: newFront,
      back: `${newReading ? newReading + ' · ' : ''}${newMeaning}`,
      interval: 0,
      repetition: 0,
      efactor: 2.5,
      dueDate: new Date().toISOString(),
    });
    setNewFront(''); setNewReading(''); setNewMeaning(''); setNewSentence('');
    setShowModal(false);
  };

  const totalDue = dueCards?.length ?? 0;
  const totalAll = allCards?.length ?? 0;

  // Upcoming queue preview (next 3 after current)
  const upNext = dueCards?.slice(1, 5) ?? [];

  // ─── Empty State ──────────────────────────────────────────────────────────
  if (!dueCards || dueCards.length === 0) {
    return (
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
        {/* Header */}
        <KotoHeader onAddCard={() => setShowModal(true)} />

        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-8xl mb-6">🎉</div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>All caught up!</h2>
            <p className="mb-6" style={{ color: 'var(--color-on-surface-variant)' }}>
              No cards due for review. Add cards from the Decks page, or come back later!
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 rounded-xl font-semibold text-white transition-all active:scale-95"
              style={{ backgroundColor: 'var(--color-secondary)' }}
            >
              + Add a Flashcard
            </button>
          </div>
        </main>

        {/* Quick Add Modal */}
        <QuickAddModal
          show={showModal}
          onClose={() => setShowModal(false)}
          front={newFront} setFront={setNewFront}
          reading={newReading} setReading={setNewReading}
          meaning={newMeaning} setMeaning={setNewMeaning}
          sentence={newSentence} setSentence={setNewSentence}
          onSave={handleAddCard}
        />
      </div>
    );
  }

  const card = currentCard!;

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--color-surface)', fontFamily: "'Noto Sans', sans-serif" }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <KotoHeader onAddCard={() => setShowModal(true)} />

      <main className="w-full pt-16" style={{ backgroundColor: 'var(--color-surface)', minHeight: '100vh' }}>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* ── Session Bar ─────────────────────────────────────────────────── */}
          <div
            className="rounded-xl shadow-sm p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
            style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}
          >
            {/* Left: Deck + Add */}
            <div className="flex items-center flex-wrap gap-3">
              <div className="relative" id="deck-dropdown">
                <button
                  onClick={() => setShowDeckMenu(v => !v)}
                  className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-lg transition-all font-semibold text-sm"
                  style={{ backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-primary)' }}
                >
                  <span className="material-symbols-outlined text-lg" style={{ color: 'var(--color-secondary)', fontSize: '18px' }}>style</span>
                  Core 2k/6k Vocabulary · Ch. 4
                  <span className="material-symbols-outlined text-sm" style={{ color: 'var(--color-on-surface-variant)', fontSize: '16px' }}>expand_more</span>
                </button>
                {showDeckMenu && (
                  <div
                    className="absolute left-0 mt-2 w-72 rounded-xl shadow-xl z-30 p-2 space-y-1"
                    style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}
                  >
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg font-medium text-sm" style={{ backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-primary)' }}>
                      <span>Core 2k/6k Vocabulary - Ch. 4</span>
                      <span className="material-symbols-outlined text-sm" style={{ color: 'var(--color-secondary)', fontSize: '16px' }}>check</span>
                    </div>
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-xs transition-colors mt-1 pt-2 border-t"
                      style={{ borderColor: 'var(--color-surface-container-highest)', color: 'var(--color-secondary)' }}
                      onClick={() => { setShowModal(true); setShowDeckMenu(false); }}
                    >
                      <span className="material-symbols-outlined text-sm" style={{ fontSize: '16px' }}>add_circle</span>
                      Create Custom Deck
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs transition-colors"
                style={{ backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface-variant)' }}
              >
                <span className="material-symbols-outlined text-sm" style={{ color: 'var(--color-secondary)', fontSize: '16px' }}>add</span>
                <span className="hidden sm:inline">Add Card</span>
              </button>
            </div>

            {/* Center: Progress */}
            <div className="flex-1 max-w-md mx-auto w-full flex flex-col justify-center px-2 sm:px-6">
              <div className="flex items-center justify-between mb-1.5 text-xs font-semibold">
                <span style={{ color: 'var(--color-primary)' }}>
                  Card {Math.max(1, totalAll - totalDue + 1)} <span style={{ color: 'var(--color-on-surface-variant)', fontWeight: 400 }}>of {totalAll || 42}</span>
                </span>
                <span style={{ color: 'var(--color-secondary)' }}>{Math.round(((totalAll - totalDue) / Math.max(totalAll, 1)) * 100)}% Session Mastery</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-container-high)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ backgroundColor: 'var(--color-secondary)', width: `${Math.round(((totalAll - totalDue) / Math.max(totalAll, 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Right: Timer + Shortcuts */}
            <div className="flex items-center justify-end gap-3 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface-variant)' }}>
                <span className="material-symbols-outlined text-sm" style={{ fontSize: '16px' }}>timer</span>
                <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>{formatTimer(timerSeconds)}</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface-variant)' }}>
                <span className="material-symbols-outlined text-sm" style={{ fontSize: '16px', color: 'var(--color-outline)' }}>keyboard</span>
                <span>Space = Reveal</span>
                <span style={{ color: 'var(--color-outline)' }}>·</span>
                <span>1-4 = Grade</span>
              </div>
            </div>
          </div>

          {/* ── Main Grid ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* ── Left: Flashcard (8 cols) ──────────────────────────────────── */}
            <div className="lg:col-span-8 flex flex-col space-y-4">

              {/* Flashcard Surface */}
              <div
                className="relative rounded-xl shadow-sm p-6 sm:p-10 flex flex-col transition-all overflow-hidden"
                style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}
              >
                {/* Ambient Watermark */}
                <div
                  className="absolute right-4 top-2 select-none pointer-events-none"
                  style={{ fontSize: '140px', lineHeight: 1, opacity: 0.03, color: 'var(--color-primary)', fontFamily: "'Noto Sans', sans-serif" }}
                >
                  {card.front[0] ?? '字'}
                </div>

                {/* Card Meta Tags & Toggles */}
                <div className="flex items-center justify-between gap-3 mb-6 relative z-10 flex-wrap">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded-full font-semibold text-xs tracking-wide" style={{ backgroundColor: 'var(--color-surface-container)', color: 'var(--color-on-surface)' }}>
                      JLPT N1
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs" style={{ backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface-variant)' }}>
                      Noun · Suru verb
                    </span>
                    {/* Leech warning if efactor is low */}
                    {card.efactor < 2.0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold text-xs" style={{ backgroundColor: 'var(--color-secondary-fixed)', color: 'var(--color-on-secondary-fixed-variant)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>priority_high</span>
                        Leech Warning
                      </span>
                    )}
                  </div>
                  {/* Furigana / Romaji toggles */}
                  <div className="flex items-center gap-1.5 p-1 rounded-lg" style={{ backgroundColor: 'var(--color-surface-container-low)' }}>
                    <button
                      onClick={() => setFuriganaOn(v => !v)}
                      className="px-2.5 py-1 rounded-md text-xs transition-all"
                      style={{ color: 'var(--color-on-surface-variant)' }}
                    >
                      Furigana: <span className="font-semibold" style={{ color: furiganaOn ? 'var(--color-secondary)' : 'var(--color-outline)' }}>{furiganaOn ? 'ON' : 'OFF'}</span>
                    </button>
                    <button
                      onClick={() => setRomajiOn(v => !v)}
                      className="px-2.5 py-1 rounded-md text-xs transition-all"
                      style={{ color: 'var(--color-on-surface-variant)' }}
                    >
                      Romaji: <span className="font-semibold" style={{ color: romajiOn ? 'var(--color-secondary)' : 'var(--color-outline)' }}>{romajiOn ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>
                </div>

                {/* Central Glyph Area */}
                <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-center relative z-10">
                  <ruby style={{ fontFamily: "'Noto Sans', sans-serif", fontSize: '64px', lineHeight: '76px', letterSpacing: '0.02em', color: 'var(--color-primary)', userSelect: 'all' }}>
                    {card.front}
                    <rt style={{
                      fontFamily: "'Noto Sans', sans-serif",
                      fontSize: '11px', lineHeight: '14px', letterSpacing: '0.02em',
                      color: 'var(--color-secondary)', fontWeight: 500, letterSpacing: '0.1em',
                      visibility: furiganaOn ? 'visible' : 'hidden',
                    }}>
                      {/* Reading pulled from back if formatted as "reading · meaning" */}
                      {card.back.includes(' · ') ? card.back.split(' · ')[0] : ''}
                    </rt>
                  </ruby>

                  {romajiOn && (
                    <div className="mt-2 text-lg font-light tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>
                      {/* Placeholder romaji – would come from card data */}
                      {card.front}
                    </div>
                  )}

                  {/* Voicevox Audio Player Bar */}
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={handlePlay}
                      className="group flex items-center gap-3 px-4 py-2 rounded-full transition-all shadow-sm active:scale-95"
                      style={{ backgroundColor: 'var(--color-surface-container-low)' }}
                    >
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>volume_up</span>
                      </span>
                      <span className="text-left">
                        <span className="block font-semibold text-xs" style={{ color: 'var(--color-primary)' }}>Native Pronunciation</span>
                        <span className="block" style={{ color: 'var(--color-on-surface-variant)', fontSize: '11px' }}>Voicevox: 四国めたん / Shikoku Metan · 1.0x</span>
                      </span>
                    </button>
                    <Waveform playing={audioPlaying} />
                  </div>
                </div>

                {/* English Meaning */}
                <div className="mt-4 pt-6 border-t text-center" style={{ borderColor: 'var(--color-surface-container-high)' }}>
                  <span className="uppercase tracking-widest text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>Meaning</span>
                  <div className="mt-1 font-semibold text-xl" style={{ color: 'var(--color-primary)' }}>
                    {card.back.includes(' · ') ? card.back.split(' · ').slice(1).join(' · ') : card.back}
                  </div>
                </div>

                {/* SRS Algorithm Status */}
                <div className="mt-6 pt-5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: 'var(--color-surface-container-high)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-container)' }}>
                      <span className="material-symbols-outlined text-lg" style={{ color: 'var(--color-primary)', fontSize: '20px' }}>timeline</span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium" style={{ color: 'var(--color-on-surface-variant)' }}>SRS Algorithm Status (SM-2)</span>
                      <span className="block font-semibold text-sm" style={{ color: 'var(--color-primary)' }}>
                        Interval: {card.interval} day{card.interval !== 1 ? 's' : ''}{' '}
                        <span style={{ color: 'var(--color-on-surface-variant)', fontWeight: 400 }}>→</span>{' '}
                        <span style={{ color: 'var(--color-on-tertiary-container)' }}>
                          {Math.round(card.interval * card.efactor)} days if Good
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0" style={{ backgroundColor: 'var(--color-surface-container)' }}>
                    <span className="material-symbols-outlined text-sm" style={{ color: 'var(--color-on-tertiary-container)', fontSize: '16px' }}>verified</span>
                    <span className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>Estimated Retention:</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--color-primary)' }}>
                      {Math.min(99, Math.round(70 + card.repetition * 5))}%
                    </span>
                  </div>
                </div>
              </div>

              {/* ── 4-Tier Rating Bar ────────────────────────────────────── */}
              <div className="rounded-xl shadow-sm p-4 sm:p-5 flex flex-col space-y-2.5" style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}>
                <div className="flex items-center justify-between text-xs px-1" style={{ color: 'var(--color-on-surface-variant)' }}>
                  <span>Rate your recall quality</span>
                  <span className="hidden sm:inline">Use number keys [ 1 · 2 · 3 · 4 ]</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Again */}
                  <button
                    onClick={() => handleScore(0)}
                    className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl transition-all active:scale-95 text-center"
                    style={{ backgroundColor: 'rgba(186,26,26,0.15)', color: 'var(--color-error)' }}
                  >
                    <div className="font-bold text-lg flex items-center gap-1">
                      <span>1</span><span className="font-normal text-sm opacity-80">· Again</span>
                    </div>
                    <span className="text-xs mt-0.5" style={{ color: 'var(--color-on-error-container)' }}>{'< 10 mins'}</span>
                  </button>
                  {/* Hard */}
                  <button
                    onClick={() => handleScore(3)}
                    className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl transition-all active:scale-95 text-center"
                    style={{ backgroundColor: 'var(--color-surface-container)', color: 'var(--color-on-surface)' }}
                  >
                    <div className="font-bold text-lg flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
                      <span>2</span><span className="font-normal text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>· Hard</span>
                    </div>
                    <span className="text-xs mt-0.5" style={{ color: 'var(--color-on-surface-variant)' }}>
                      +{(card.interval * 1.2).toFixed(1)} days
                    </span>
                  </button>
                  {/* Good */}
                  <button
                    onClick={() => handleScore(4)}
                    className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl transition-all active:scale-95 text-center"
                    style={{ backgroundColor: 'rgba(133,248,196,0.3)', color: 'var(--color-on-tertiary-fixed-variant)' }}
                  >
                    <div className="font-bold text-lg flex items-center gap-1" style={{ color: 'var(--color-on-tertiary-container)' }}>
                      <span>3</span><span className="font-normal text-sm opacity-90">· Good</span>
                    </div>
                    <span className="font-semibold text-xs mt-0.5" style={{ color: 'var(--color-on-tertiary-container)' }}>
                      +{Math.round(card.interval * card.efactor)} days
                    </span>
                  </button>
                  {/* Easy */}
                  <button
                    onClick={() => handleScore(5)}
                    className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl transition-all active:scale-95 text-center"
                    style={{ backgroundColor: 'rgba(216,227,251,0.6)', color: 'var(--color-primary)' }}
                  >
                    <div className="font-bold text-lg flex items-center gap-1">
                      <span>4</span><span className="font-normal text-sm opacity-90">· Easy</span>
                    </div>
                    <span className="font-semibold text-xs mt-0.5" style={{ color: 'var(--color-on-primary-fixed-variant)' }}>
                      +{Math.round(card.interval * card.efactor * 1.5)} days
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── Right Column: Queue & Insights (4 cols) ───────────────────── */}
            <div className="lg:col-span-4 flex flex-col space-y-6">

              {/* Today's Queue Card */}
              <div className="rounded-xl shadow-sm p-5 sm:p-6 space-y-5" style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}>
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)', fontSize: '20px' }}>layers</span>
                    Today's Queue
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-surface-container)', color: 'var(--color-on-surface-variant)' }}>
                    {totalDue} Left
                  </span>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'New', count: dueCards?.filter(c => c.repetition === 0).length ?? 0, color: 'var(--color-secondary)' },
                    { label: 'Learning', count: dueCards?.filter(c => c.repetition > 0 && c.interval < 7).length ?? 0, color: 'var(--color-on-surface)' },
                    { label: 'Review', count: dueCards?.filter(c => c.interval >= 7).length ?? 0, color: 'var(--color-on-tertiary-container)' },
                  ].map(({ label, count, color }) => (
                    <div key={label} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface-container-low)' }}>
                      <span className="block font-bold text-xl" style={{ color }}>{count}</span>
                      <span className="block text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>{label}</span>
                    </div>
                  ))}
                </div>

                {/* Queue Stream */}
                <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--color-surface-container-high)' }}>
                  <span className="text-xs uppercase tracking-wider block mb-2" style={{ color: 'var(--color-on-surface-variant)' }}>Up Next In This Session</span>

                  {/* Active card */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ backgroundColor: 'var(--color-surface-container)', color: 'var(--color-primary)' }}>
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-secondary)' }} />
                      <div>
                        <span className="font-bold text-lg">{card.front}</span>
                      </div>
                    </div>
                    <span className="font-semibold text-xs" style={{ color: 'var(--color-secondary)' }}>Active</span>
                  </div>

                  {/* Up next */}
                  {upNext.map((c, i) => (
                    <div key={c.id ?? i} className="flex items-center justify-between p-2.5 rounded-lg transition-colors" style={{ backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)' }}>
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.repetition === 0 ? 'var(--color-secondary)' : 'var(--color-outline)' }} />
                        <span className="font-bold text-base">{c.front}</span>
                      </div>
                      <span className="text-xs" style={{ color: c.repetition === 0 ? 'var(--color-secondary)' : 'var(--color-on-surface-variant)' }}>
                        {c.repetition === 0 ? 'New' : c.interval < 7 ? 'Learn' : 'Review'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Retention Health Widget */}
              <div className="rounded-xl shadow-sm p-5 sm:p-6 space-y-4" style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base" style={{ color: 'var(--color-primary)' }}>Deck Retention Rate</span>
                  <span className="font-semibold text-xs" style={{ color: 'var(--color-on-tertiary-container)' }}>+3.8% this week</span>
                </div>
                {/* Mini bar chart */}
                <div className="space-y-2">
                  <div className="h-20 w-full flex items-end justify-between gap-1.5 pt-2">
                    {['M','T','W','T','F','S'].map((day, i) => {
                      const heights = [60, 72, 68, 84, 90, 78];
                      return (
                        <div key={i} className="w-full flex flex-col items-center gap-1">
                          <div className="w-full rounded-t" style={{ height: `${heights[i]}%`, backgroundColor: 'var(--color-surface-container-high)' }} />
                          <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>{day}</span>
                        </div>
                      );
                    })}
                    <div className="w-full flex flex-col items-center gap-1">
                      <div className="w-full rounded-t" style={{ height: '92%', backgroundColor: 'var(--color-secondary)' }} />
                      <span className="font-bold" style={{ fontSize: '11px', color: 'var(--color-secondary)' }}>Today</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
                    <span>Average: 88.4%</span>
                    <span className="font-medium" style={{ color: 'var(--color-primary)' }}>Goal: 90%</span>
                  </div>
                </div>
              </div>

              {/* Voicevox Engine Info */}
              <div className="p-4 rounded-xl flex items-center gap-3" style={{ backgroundColor: 'var(--color-surface-container-low)' }}>
                <span className="material-symbols-outlined text-xl" style={{ color: 'var(--color-secondary)', fontSize: '22px' }}>auto_stories</span>
                <div className="flex-1">
                  <span className="block font-semibold text-xs" style={{ color: 'var(--color-primary)' }}>Active Voicevox Engine</span>
                  <span className="block text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>四国めたん (Normal speed, Pitch +0.1)</span>
                </div>
                <button className="p-1 rounded transition-colors" style={{ color: 'var(--color-on-surface-variant)' }} title="Voice Settings">
                  <span className="material-symbols-outlined text-base" style={{ fontSize: '18px' }}>tune</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Quick Add Modal ────────────────────────────────────────────────── */}
      <QuickAddModal
        show={showModal}
        onClose={() => setShowModal(false)}
        front={newFront} setFront={setNewFront}
        reading={newReading} setReading={setNewReading}
        meaning={newMeaning} setMeaning={setNewMeaning}
        sentence={newSentence} setSentence={setNewSentence}
        onSave={handleAddCard}
      />
    </div>
  );
}

// ─── KotoHeader ────────────────────────────────────────────────────────────────
function KotoHeader({ onAddCard }: { onAddCard: () => void }) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl"
      style={{
        backgroundColor: 'rgba(250,249,246,0.9)',
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
      }}
    >
      <div className="h-16 max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold tracking-tight text-xl" style={{ color: 'var(--color-primary)' }}>Koto</span>
              <span className="text-xs font-medium" style={{ color: 'var(--color-on-surface-variant)', fontSize: '11px' }}>言</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1.5 p-1">
            <span className="px-3 py-1.5 rounded-lg font-medium text-xs" style={{ backgroundColor: 'var(--color-primary-container)', color: 'var(--color-on-primary)' }}>
              SRS Flashcards
            </span>
            {['AI Roleplay', 'Graded Reader', 'Roadmap & BYOK'].map(label => (
              <span key={label} className="px-3 py-1.5 text-xs transition-colors cursor-pointer" style={{ color: 'var(--color-on-surface-variant)' }}>
                {label}
              </span>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium text-xs" style={{ backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}>
            <span className="material-symbols-outlined text-sm" style={{ color: 'var(--color-secondary)', fontSize: '14px' }}>local_fire_department</span>
            18 Days
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-xs" style={{ backgroundColor: 'var(--color-secondary-fixed)', color: 'var(--color-on-secondary-fixed-variant)' }}>
            <span className="material-symbols-outlined text-sm" style={{ fontSize: '14px' }}>schedule</span>
            42 reviews due
          </div>
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs" style={{ backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface-variant)' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-on-tertiary-container)' }} />
            <span className="font-medium">Voicevox Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── QuickAddModal ────────────────────────────────────────────────────────────
interface QuickAddModalProps {
  show: boolean; onClose: () => void; onSave: () => void;
  front: string; setFront: (v: string) => void;
  reading: string; setReading: (v: string) => void;
  meaning: string; setMeaning: (v: string) => void;
  sentence: string; setSentence: (v: string) => void;
}
function QuickAddModal({ show, onClose, onSave, front, setFront, reading, setReading, meaning, setMeaning, sentence, setSentence }: QuickAddModalProps) {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(9,20,38,0.4)', backdropFilter: 'blur(6px)' }}
    >
      <div className="rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4" style={{ backgroundColor: 'var(--color-surface-container-lowest)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>Add Custom Flashcard</h3>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--color-on-surface-variant)' }}>
            <span className="material-symbols-outlined text-base" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Kanji / Word', placeholder: 'e.g. 矛盾', value: front, setter: setFront, large: true },
            { label: 'Reading (Kana)', placeholder: 'e.g. むじゅん', value: reading, setter: setReading },
            { label: 'Meaning', placeholder: 'e.g. Contradiction, inconsistency', value: meaning, setter: setMeaning },
          ].map(({ label, placeholder, value, setter, large }) => (
            <div key={label}>
              <label className="block font-semibold text-xs mb-1" style={{ color: 'var(--color-primary)' }}>{label}</label>
              <input
                className="w-full px-3.5 py-2 rounded-lg focus:outline-none border-0"
                style={{ backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-primary)', fontSize: large ? '18px' : '15px' }}
                placeholder={placeholder}
                value={value}
                onChange={e => setter(e.target.value)}
              />
            </div>
          ))}
          <div>
            <label className="block font-semibold text-xs mb-1" style={{ color: 'var(--color-primary)' }}>Context Sentence</label>
            <textarea
              className="w-full px-3.5 py-2 rounded-lg focus:outline-none border-0 resize-none"
              style={{ backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-primary)', fontSize: '15px' }}
              placeholder="Example sentence in Japanese..."
              rows={2}
              value={sentence}
              onChange={e => setSentence(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs transition-colors" style={{ color: 'var(--color-on-surface-variant)' }}>Cancel</button>
          <button
            onClick={onSave}
            className="px-4 py-2 rounded-lg font-semibold text-xs transition-colors"
            style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-on-secondary)' }}
          >
            Save Flashcard
          </button>
        </div>
      </div>
    </div>
  );
}
