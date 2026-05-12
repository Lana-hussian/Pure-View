import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import BrowsePage from './pages/BrowsePage';
import AdminDashboard from './pages/AdminDashboard';
import AuthPage from './pages/AuthPage';
import './index.css';
import './App.css';

function AppInner() {
  const { user, isAdmin, loading } = useAuth();
  const [page, setPage] = useState('browse');

  if (loading) return (
    <div className="loader-wrapper" style={{ minHeight: '100vh' }}>
      <div className="loader" />
    </div>
  );

  const navigate = (p) => {
    if (p === 'admin' && !isAdmin) return setPage('login');
    setPage(p);
  };

  const renderPage = () => {
    if (page === 'login') return <AuthPage mode="login" onSwitch={() => setPage('register')} onSuccess={() => setPage('browse')} />;
    if (page === 'register') return <AuthPage mode="register" onSwitch={() => setPage('login')} onSuccess={() => setPage('browse')} />;
    if (page === 'admin' && isAdmin) return <AdminDashboard />;
    return <BrowsePage />;
  };

  const showNav = page !== 'login' && page !== 'register';

  return (
    <div className="app-root">
      {showNav && <Navbar page={page} setPage={navigate} />}
      <main className={`main-content ${showNav ? 'with-nav' : ''}`}>
        {renderPage()}
      </main>
      <footer className="app-footer">
        <p>⬡ Pure<span style={{ color: 'var(--accent-primary)' }}>View</span> &nbsp;·&nbsp; AI-Powered Movie Ratings &nbsp;·&nbsp; Family Safe Filtering</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </AuthProvider>
  );
}
