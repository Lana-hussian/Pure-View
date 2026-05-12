import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function Navbar({ page, setPage }) {
  const { user, logout, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); setPage('browse'); };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <button className="navbar-logo" onClick={() => setPage('browse')}>
          <span className="logo-icon">⬡</span>
          <span className="logo-text">Pure<span className="text-gradient">View</span></span>
        </button>

        {/* Desktop nav */}
        <div className="navbar-links">
          <button
            className={`nav-link ${page === 'browse' ? 'active' : ''}`}
            onClick={() => setPage('browse')}
          >Browse</button>
          {user && !isAdmin && (
            <button
              className={`nav-link ${page === 'profile' ? 'active' : ''}`}
              onClick={() => setPage('profile')}
            >Profile</button>
          )}
          {isAdmin && (
            <button
              className={`nav-link nav-link-admin ${page === 'admin' ? 'active' : ''}`}
              onClick={() => setPage('admin')}
            >
              ⚡ Dashboard
            </button>
          )}
        </div>

        {/* Auth actions */}
        <div className="navbar-actions">
          {user ? (
            <div className="user-pill">
              <div className="user-avatar">{user.name[0].toUpperCase()}</div>
              <span className="user-name">{user.name}</span>
              {isAdmin && <span className="badge badge-admin">Admin</span>}
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <div className="auth-buttons">
              <button className="btn btn-ghost btn-sm" onClick={() => setPage('login')}>Login</button>
              <button className="btn btn-primary btn-sm animate-pulse-glow" onClick={() => setPage('register')}>Join Free</button>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="hamburger" onClick={() => setMenuOpen(m => !m)}>
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mobile-menu">
          <button onClick={() => { setPage('browse'); setMenuOpen(false); }}>Browse</button>
          {isAdmin && <button onClick={() => { setPage('admin'); setMenuOpen(false); }}>⚡ Dashboard</button>}
          {user ? (
            <button onClick={() => { handleLogout(); setMenuOpen(false); }}>Logout</button>
          ) : (
            <>
              <button onClick={() => { setPage('login'); setMenuOpen(false); }}>Login</button>
              <button onClick={() => { setPage('register'); setMenuOpen(false); }}>Register</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
