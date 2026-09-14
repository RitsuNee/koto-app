import { Link, useLocation } from 'react-router-dom';
import KotoLogo from './KotoLogo';
const NAV_ITEMS = [
  { label: 'SRS Flashcards', path: '/review' },
  { label: 'AI Roleplay', path: '/ai-roleplay' },
  { label: 'Graded Reader', path: '/graded-reader' },
  { label: 'Roadmap & BYOK', path: '/roadmap' },
];

export default function KotoHeader() {
  const location = useLocation();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl"
      style={{ backgroundColor: 'rgba(250,249,246,0.9)', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}
    >
      <div className="h-16 max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center">
            <KotoLogo height={28} />
          </Link>
          <nav className="hidden md:flex items-center gap-1.5 p-1">
            {NAV_ITEMS.map(({ label, path }) => {
              const isActive = location.pathname === path || (path === '/review' && location.pathname === '/review');
              return (
                <Link
                  key={path}
                  to={path}
                  className="px-3 py-1.5 rounded-lg text-xs transition-colors font-medium"
                  style={isActive
                    ? { backgroundColor: 'var(--color-primary-container)', color: 'var(--color-on-primary)' }
                    : { color: 'var(--color-on-surface-variant)' }
                  }
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-secondary)' }}>local_fire_department</span>
            18 Days
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: 'var(--color-secondary-fixed)', color: 'var(--color-on-secondary-fixed-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span>
            42 reviews due
          </div>
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
            style={{ backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface-variant)' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-on-tertiary-container)' }} />
            <span className="font-medium">Voicevox Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
}
