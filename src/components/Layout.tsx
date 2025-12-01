import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import './Layout.css';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, pendingRequests } = useAppStore();

  const handleLogout = () => {
    if (confirm('Sei sicuro di voler uscire?')) {
      logout();
      navigate('/login');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <h1 className="header-title">🎵 Setlist Manager</h1>
        <div className="header-actions">
          <span className="user-name">{user?.name}</span>
          <button onClick={handleLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="nav-tabs">
        <Link
          to="/songs"
          className={`nav-tab ${isActive('/songs') ? 'active' : ''}`}
        >
          Brani
        </Link>
        <Link
          to="/setlists"
          className={`nav-tab ${isActive('/setlists') ? 'active' : ''}`}
        >
          Setlist
        </Link>
        <Link
          to="/metronome"
          className={`nav-tab ${isActive('/metronome') ? 'active' : ''}`}
        >
          Metronomo
        </Link>
        <Link
          to="/live"
          className={`nav-tab ${isActive('/live') ? 'active' : ''}`}
        >
          Live
        </Link>
        <Link
          to="/friends"
          className={`nav-tab ${isActive('/friends') ? 'active' : ''}`}
        >
          Amici
          {pendingRequests.length > 0 && (
            <span className="badge">{pendingRequests.length}</span>
          )}
        </Link>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
