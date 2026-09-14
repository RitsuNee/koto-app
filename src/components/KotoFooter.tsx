import { Link } from 'react-router-dom';

export default function KotoFooter() {
  return (
    <footer className="w-full py-6" style={{ backgroundColor: 'var(--color-surface-container-low)', marginTop: '2.5rem' }}>
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
          <span className="font-medium" style={{ color: 'var(--color-primary)' }}>Koto</span>
          <span>·</span>
          <span>Spaced Repetition &amp; Immersion Laboratory</span>
        </div>
        <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-on-tertiary-container)' }} />
            Local Engine Connected
          </span>
          <span>© 2025 Koto Language.</span>
        </div>
      </div>
    </footer>
  );
}
