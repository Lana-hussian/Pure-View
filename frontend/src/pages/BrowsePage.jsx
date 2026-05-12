import { useState, useEffect, useCallback } from 'react';
import { useAuth, API_BASE } from '../context/AuthContext';
import ContentCard from '../components/ContentCard';
import FamilyMeters from '../components/FamilyMeters';
import SearchBar from '../components/SearchBar';
import { toast } from '../components/Toast';

const PLACEHOLDER = 'https://via.placeholder.com/300x450/0F172A/94A3B8?text=No+Poster';

export default function BrowsePage() {
  const { user, token } = useAuth();
  const [content, setContent]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [typeFilter, setTypeFilter]     = useState('');
  const [filters, setFilters]           = useState({ horror: 10, violence: 10, homosexuality: 10, adult_content: 10 });
  const [filtersActive, setFiltersActive] = useState(false);
  const [selected, setSelected]         = useState(null);
  // Map: { content_id: { rating_id, score } }
  const [userRatings, setUserRatings]   = useState({});

  // ── Load user's existing ratings on login ──────────────────────────────────
  useEffect(() => {
    if (!user || !token) { setUserRatings({}); return; }
    fetch(`${API_BASE}/ratings/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { if (data && typeof data === 'object') setUserRatings(data); })
      .catch(() => {});
  }, [user, token]);

  // ── Fetch content with optional query / filters ────────────────────────────
  const fetchContent = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (typeFilter) params.set('type', typeFilter);
    if (filtersActive) {
      if (filters.horror        < 10) params.set('horror',        filters.horror);
      if (filters.violence      < 10) params.set('violence',      filters.violence);
      if (filters.homosexuality < 10) params.set('homosexuality', filters.homosexuality);
      if (filters.adult_content < 10) params.set('adult_content', filters.adult_content);
    }
    try {
      const res  = await fetch(`${API_BASE}/content?${params}`);
      const data = await res.json();
      setContent(Array.isArray(data) ? data : []);
    } catch {
      toast('Failed to load content', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, filters, filtersActive]);

  useEffect(() => {
    const t = setTimeout(fetchContent, 300);
    return () => clearTimeout(t);
  }, [fetchContent]);

  // ── Rate / Edit rating ─────────────────────────────────────────────────────
  const handleRate = async (contentId, score, existingRatingId) => {
    if (!user) { toast('Please login to rate content', 'error'); return; }
    try {
      let res;
      if (existingRatingId) {
        // PUT — edit an existing rating
        res = await fetch(`${API_BASE}/ratings/${existingRatingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ score }),
        });
      } else {
        // POST — first-time rating
        res = await fetch(`${API_BASE}/content/${contentId}/rate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ score }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Update local ratings map and refresh
      setUserRatings(prev => ({
        ...prev,
        [contentId]: {
          rating_id: data.rating_id || existingRatingId || prev[contentId]?.rating_id,
          score,
        },
      }));
      toast(`${existingRatingId ? '✏ Rating updated' : '✨ Rated'} ${score}/10`);
      fetchContent();

      // Re-fetch my ratings to get the rating_id if it was new
      if (!existingRatingId) {
        fetch(`${API_BASE}/ratings/my`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(d => { if (d && typeof d === 'object') setUserRatings(d); })
          .catch(() => {});
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const filterRange = (key, val) => setFilters(f => ({ ...f, [key]: Number(val) }));

  // ── SearchBar selects a result → open its detail modal ────────────────────
  const handleSearchSelect = (item) => {
    // find in current content list or set directly
    const found = content.find(c => c.content_id === item.content_id);
    setSelected(found || item);
  };

  return (
    <div className="browse-page">
      {/* ── Hero ── */}
      <section className="browse-hero">
        <div className="hero-content">
          <div className="hero-badge animate-pulse-glow">⬡ DUAL RATING SYSTEM</div>
          <h1 className="hero-title">
            Discover Cinema<br />
            <span className="text-gradient">Without Boundaries</span>
          </h1>
          <p className="hero-subtitle">AI-powered ratings meets community reviews. Family-safe filtering built in.</p>
          {/* Floating SearchBar inside hero */}
          <div className="hero-search">
            <SearchBar onSelect={handleSearchSelect} />
          </div>
        </div>
        <div className="hero-orbs">
          <div className="orb orb-1 animate-float" />
          <div className="orb orb-2 animate-float-slow" />
          <div className="orb orb-3 animate-float" />
        </div>
      </section>

      {/* ── Filter Controls ── */}
      <div className="browse-controls glass-card">
        <div className="controls-top">
          {/* Type filter */}
          <select id="type-filter" className="form-input type-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="Movie">Movies</option>
            <option value="TV Show">TV Shows</option>
          </select>
          {/* Plain search fallback (syncs with searchbar) */}
          <div className="search-wrap" style={{ flex: 1, minWidth: 180 }}>
            <span className="search-icon">🔎</span>
            <input
              className="form-input search-input"
              placeholder="Filter by title…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Family filter toggle */}
          <button
            id="family-filter-toggle"
            className={`btn ${filtersActive ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFiltersActive(a => !a)}
          >
            🛡 Family Filter {filtersActive ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Family sliders */}
        {filtersActive && (
          <div className="family-sliders animate-fade-up">
            <h3 className="sliders-title">Family Safety Filters <span className="sliders-hint">(drag to set max level)</span></h3>
            <div className="slider-grid">
              {[
                { key: 'horror',        label: 'Horror',        color: 'var(--meter-horror)' },
                { key: 'violence',      label: 'Violence',      color: 'var(--meter-violence)' },
                { key: 'homosexuality', label: 'Homosexuality', color: 'var(--meter-homosexuality)' },
                { key: 'adult_content', label: 'Adult Content', color: 'var(--meter-adult)' },
              ].map(f => (
                <div key={f.key} className="slider-item">
                  <div className="slider-header">
                    <label className="slider-label" style={{ color: f.color }}>{f.label}</label>
                    <span className="slider-value" style={{ color: f.color }}>
                      {filters[f.key] === 10 ? 'Any' : `≤ ${filters[f.key]}`}
                    </span>
                  </div>
                  <input
                    id={`slider-${f.key}`}
                    type="range" min="0" max="10" step="1"
                    value={filters[f.key]}
                    onChange={e => filterRange(f.key, e.target.value)}
                    className="family-slider"
                    style={{ '--slider-color': f.color }}
                  />
                  <div className="slider-marks">
                    <span>Safe</span><span>Moderate</span><span>Extreme</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="child-friendly-row">
              <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ horror: 2, violence: 2, homosexuality: 2, adult_content: 2 })}>
                👶 Child-Friendly Preset
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ horror: 10, violence: 10, homosexuality: 10, adult_content: 10 })}>
                🔄 Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Results header ── */}
      <div className="results-header">
        <span className="results-count">
          {loading ? '…' : `${content.length} title${content.length !== 1 ? 's' : ''} found`}
        </span>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="loader-wrapper"><div className="loader" /></div>
      ) : content.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="empty-icon">🎬</div>
          <h3>No content found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="content-grid">
          {content.map((c, i) => (
            <div key={c.content_id} style={{ animationDelay: `${i * 0.07}s` }} className="animate-fade-up">
              <ContentCard
                content={c}
                onClick={setSelected}
                onRate={user ? handleRate : null}
                currentUserRating={userRatings[c.content_id]}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selected.title}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="detail-layout">
              <img src={selected.poster || PLACEHOLDER} alt={selected.title} className="detail-poster"
                onError={e => { e.target.src = PLACEHOLDER; }} />
              <div className="detail-info">
                <div className="detail-tags">
                  <span className={`badge ${selected.type === 'Movie' ? 'badge-movie' : 'badge-tv'}`}>{selected.type}</span>
                  {selected.genre && <span className="badge badge-genre">{selected.genre}</span>}
                  <span className="badge badge-genre">{selected.year}</span>
                </div>
                {selected.description && <p className="detail-desc">{selected.description}</p>}
                <div className="detail-ratings">
                  <div className="detail-rating-block">
                    <span className="detail-rating-val" style={{ color: 'var(--ai-gold)' }}>{Math.round(selected.ai_rating)}</span>
                    <span className="detail-rating-label">AI Score / 100</span>
                  </div>
                  <div className="detail-rating-divider" />
                  <div className="detail-rating-block">
                    <span className="detail-rating-val" style={{ color: 'var(--user-star)' }}>
                      ★ {selected.user_rating != null ? selected.user_rating.toFixed(1) : '—'}
                    </span>
                    <span className="detail-rating-label">User Score / 10</span>
                  </div>
                </div>
                {selected.familyClassification && <FamilyMeters fc={selected.familyClassification} />}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
