import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Learn from './pages/Learn';
import Review from './pages/Review';
import DeckManager from './pages/DeckManager';
import AiRoleplay from './pages/AiRoleplay';
import GradedReader from './pages/GradedReader';
import Roadmap from './pages/Roadmap';
import KotoLogo from './components/KotoLogo';
import { Home, Settings as SettingsIcon, BookOpen, Repeat, Layers, BookMarked, Drama, Map } from 'lucide-react';

// Pages that render their own full-page layout (no shared sidebar)
const FULL_PAGE_ROUTES = ['/review', '/graded-reader', '/ai-roleplay', '/roadmap'];

function AppShell() {
  const location = useLocation();
  const isFullPage = FULL_PAGE_ROUTES.some(r => location.pathname.startsWith(r));

  if (isFullPage) {
    return (
      <Routes>
        <Route path="/review" element={<Review />} />
        <Route path="/graded-reader" element={<GradedReader />} />
        <Route path="/ai-roleplay" element={<AiRoleplay />} />
        <Route path="/roadmap" element={<Roadmap />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      {/* Sidebar */}
      <aside className="w-64 border-r flex flex-col" style={{ backgroundColor: 'white', borderColor: 'var(--color-surface-container-high)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-surface-container-high)' }}>
          <Link to="/">
            <KotoLogo height={24} />
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[
            { to: '/', icon: <Home size={20} />, label: 'Dashboard' },
            { to: '/learn', icon: <BookOpen size={20} />, label: 'Learn' },
            { to: '/review', icon: <Repeat size={20} />, label: 'SRS Flashcards' },
            { to: '/graded-reader', icon: <BookMarked size={20} />, label: 'Graded Reader' },
            { to: '/ai-roleplay', icon: <Drama size={20} />, label: 'AI Roleplay' },
            { to: '/decks', icon: <Layers size={20} />, label: 'Decks' },
            { to: '/roadmap', icon: <Map size={20} />, label: 'JLPT Roadmap' },
          ].map(({ to, icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 p-3 rounded-lg transition-colors text-sm"
                style={isActive
                  ? { backgroundColor: 'var(--color-primary-container)', color: 'var(--color-on-primary)' }
                  : { color: 'var(--color-on-surface-variant)' }
                }
              >
                {icon} {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t" style={{ borderColor: 'var(--color-surface-container-high)' }}>
          <Link to="/settings" className="flex items-center gap-3 p-3 rounded-lg transition-colors text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
            <SettingsIcon size={20} /> Settings
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/decks" element={<DeckManager />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
