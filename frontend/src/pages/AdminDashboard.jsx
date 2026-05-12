import { useState, useEffect } from 'react';
import { useAuth, API_BASE } from '../context/AuthContext';
import { toast } from '../components/Toast';

const EMPTY_FORM = {
  title: '', year: new Date().getFullYear(), poster: '', type: 'Movie',
  genre: '', description: '', ai_rating: 75,
  horror: 0, violence: 0, homosexuality: 0, adult_content: 0,
};

export default function AdminDashboard() {
  const { token } = useAuth();
  const [content, setContent] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cRes, sRes, rRes] = await Promise.all([
        fetch(`${API_BASE}/content`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/stats`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/ratings`, { headers: authHeaders }),
      ]);
      const [c, s, r] = await Promise.all([cRes.json(), sRes.json(), rRes.json()]);
      setContent(Array.isArray(c) ? c : []);
      setStats(s);
      setRatings(Array.isArray(r) ? r : []);
    } catch { toast('Failed to load data', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      title: item.title, year: item.year, poster: item.poster || '', type: item.type,
      genre: item.genre || '', description: item.description || '', ai_rating: item.ai_rating,
      horror: item.familyClassification?.horror || 0,
      violence: item.familyClassification?.violence || 0,
      homosexuality: item.familyClassification?.homosexuality || 0,
      adult_content: item.familyClassification?.adult_content || 0,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editItem ? `${API_BASE}/content/${editItem.content_id}` : `${API_BASE}/content`;
      const method = editItem ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(editItem ? '✅ Content updated!' : '✅ Content added!');
      setShowForm(false);
      fetchAll();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/content/${id}`, { method: 'DELETE', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast('🗑 Content deleted');
      setDeleteConfirm(null);
      fetchAll();
    } catch (err) { toast(err.message, 'error'); }
  };

  const fld = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.type === 'number' ? +e.target.value : e.target.value }));

  if (loading) return <div className="loader-wrapper" style={{ minHeight: '80vh' }}><div className="loader" /></div>;

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header glass-card">
        <div className="admin-header-left">
          <h1 className="admin-title">⚡ Admin Dashboard</h1>
          <p className="admin-subtitle">Manage PureView content & monitor ratings</p>
        </div>
        <button id="add-content-btn" className="btn btn-primary animate-pulse-glow" onClick={openAdd}>
          ＋ Add New Content
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card glass-card animate-float">
            <div className="stat-icon">🎬</div>
            <div className="stat-val">{stats.total_content}</div>
            <div className="stat-label">Total Titles</div>
          </div>
          <div className="stat-card glass-card animate-float" style={{ animationDelay: '0.5s' }}>
            <div className="stat-icon">⭐</div>
            <div className="stat-val">{stats.total_ratings}</div>
            <div className="stat-label">Total Ratings</div>
          </div>
          <div className="stat-card glass-card animate-float" style={{ animationDelay: '1s' }}>
            <div className="stat-icon">🤖</div>
            <div className="stat-val" style={{ color: 'var(--ai-gold)' }}>{stats.avg_ai_rating}</div>
            <div className="stat-label">Avg AI Score</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="admin-tabs">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          📋 Content Library
        </button>
        <button className={`tab-btn ${activeTab === 'ratings' ? 'active' : ''}`} onClick={() => setActiveTab('ratings')}>
          ⭐ All Ratings
        </button>
      </div>

      {/* Content Library */}
      {activeTab === 'overview' && (
        <div className="admin-table-wrap glass-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th><th>Type</th><th>Year</th><th>AI Score</th><th>User Score</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {content.map(c => (
                <tr key={c.content_id} className="table-row">
                  <td><strong>{c.title}</strong></td>
                  <td><span className={`badge ${c.type === 'Movie' ? 'badge-movie' : 'badge-tv'}`}>{c.type}</span></td>
                  <td>{c.year}</td>
                  <td><span style={{ color: 'var(--ai-gold)', fontWeight: 700 }}>{Math.round(c.ai_rating)}</span></td>
                  <td><span style={{ color: 'var(--user-star)' }}>★ {c.user_rating?.toFixed(1) ?? '—'}</span></td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>✏ Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(c.content_id)}>🗑 Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {content.length === 0 && <div className="empty-state"><p>No content yet. Add your first title!</p></div>}
        </div>
      )}

      {/* All Ratings */}
      {activeTab === 'ratings' && (
        <div className="admin-table-wrap glass-card">
          <table className="admin-table">
            <thead>
              <tr><th>Rating ID</th><th>User ID</th><th>Content ID</th><th>Score</th><th>Date</th></tr>
            </thead>
            <tbody>
              {ratings.map(r => (
                <tr key={r.rating_id} className="table-row">
                  <td>#{r.rating_id}</td>
                  <td>#{r.user_id}</td>
                  <td>#{r.content_id}</td>
                  <td><span style={{ color: 'var(--user-star)', fontWeight: 700 }}>★ {r.score}</span></td>
                  <td>{new Date(r.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {ratings.length === 0 && <div className="empty-state"><p>No ratings yet.</p></div>}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editItem ? '✏ Edit Content' : '＋ Add New Content'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input name="title" className="form-input" value={form.title} onChange={fld} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Year *</label>
                  <input name="year" type="number" className="form-input" value={form.year} onChange={fld} min="1900" max="2030" required />
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select name="type" className="form-input" value={form.type} onChange={fld}>
                    <option>Movie</option><option>TV Show</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Genre</label>
                  <input name="genre" className="form-input" value={form.genre} onChange={fld} placeholder="Thriller, Sci-Fi…" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Poster URL</label>
                <input name="poster" className="form-input" value={form.poster} onChange={fld} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea name="description" className="form-input" rows="3" value={form.description} onChange={fld} style={{ resize: 'vertical' }} />
              </div>
              <div className="form-group">
                <label className="form-label">AI Rating (0-100): <span style={{ color: 'var(--ai-gold)', fontWeight: 700 }}>{form.ai_rating}</span></label>
                <input name="ai_rating" type="range" min="0" max="100" step="0.5" value={form.ai_rating} onChange={fld} className="family-slider" style={{ '--slider-color': 'var(--ai-gold)' }} />
              </div>

              {/* Family classification */}
              <div className="form-section-title">🛡 Family Classification</div>
              <div className="form-row-2">
                {[
                  { name: 'horror',        label: 'Horror',       color: 'var(--meter-horror)' },
                  { name: 'violence',      label: 'Violence',     color: 'var(--meter-violence)' },
                  { name: 'homosexuality', label: 'Homosexuality',color: 'var(--meter-homosexuality)' },
                  { name: 'adult_content', label: 'Adult Content',color: 'var(--meter-adult)' },
                ].map(f => (
                  <div className="form-group" key={f.name}>
                    <label className="form-label" style={{ color: f.color }}>{f.label}: <strong>{form[f.name]}</strong>/10</label>
                    <input name={f.name} type="range" min="0" max="10" step="1"
                      value={form[f.name]} onChange={fld}
                      className="family-slider" style={{ '--slider-color': f.color }} />
                  </div>
                ))}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary animate-pulse-glow" disabled={submitting}>
                  {submitting ? '...' : editItem ? '💾 Save Changes' : '✨ Add & Get AI Rating'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🗑</div>
            <h2 className="modal-title">Delete Content?</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>This action cannot be undone. All associated ratings will also be deleted.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
