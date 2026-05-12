import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';

export default function AuthPage({ mode = 'login', onSwitch, onSuccess }) {
  const { login, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Client' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isLogin = mode === 'login';

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password, form.role);
      }
      toast(isLogin ? 'Welcome back! 🎬' : 'Account created! Welcome to PureView 🚀');
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Background orbs */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div className="auth-container glass-card animate-fade-up">
        <div className="auth-header">
          <div className="auth-logo">⬡ PureView</div>
          <h1 className="auth-title">
            {isLogin ? 'Welcome Back' : 'Join PureView'}
          </h1>
          <p className="auth-subtitle">
            {isLogin
              ? 'Sign in to rate movies and explore content'
              : 'Create your account and start rating today'}
          </p>
        </div>

        <form onSubmit={submit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input id="auth-name" name="name" type="text" className="form-input"
                placeholder="Your name" value={form.name} onChange={handle} required />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input id="auth-email" name="email" type="email" className="form-input"
              placeholder="you@example.com" value={form.email} onChange={handle} required />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input id="auth-password" name="password" type="password" className="form-input"
              placeholder="••••••••" value={form.password} onChange={handle} required />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Account Type</label>
              <select id="auth-role" name="role" className="form-input" value={form.role} onChange={handle}>
                <option value="Client">Client (Viewer)</option>
                <option value="Admin">Admin (Content Manager)</option>
              </select>
            </div>
          )}

          {error && <div className="auth-error">⚠ {error}</div>}

          <button id="auth-submit" type="submit" className="btn btn-primary btn-lg animate-pulse-glow" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? <span className="loader" style={{ width: 20, height: 20, borderWidth: 2 }} /> : (isLogin ? '🚀 Sign In' : '✨ Create Account')}
          </button>
        </form>

        <div className="auth-switch">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button className="auth-switch-btn" onClick={onSwitch}>
            {isLogin ? 'Register' : 'Login'}
          </button>
        </div>

        {isLogin && (
          <div className="auth-demo-creds">
            <p className="demo-title">Demo Credentials</p>
            <div className="demo-row"><span className="demo-role">Admin</span><code>admin@pureview.com / admin123</code></div>
            <div className="demo-row"><span className="demo-role">User</span><code>alice@example.com / user123</code></div>
          </div>
        )}
      </div>
    </div>
  );
}
