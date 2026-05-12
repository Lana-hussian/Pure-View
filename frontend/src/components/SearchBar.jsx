import { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../context/AuthContext';

export default function SearchBar({ onSelect }) {
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState([]);
  const [focused, setFocused]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const debounceRef               = useRef(null);
  const wrapRef                   = useRef(null);

  // Fetch suggestions with debounce
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`${API_BASE}/content/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch { setResults([]); }
      finally  { setLoading(false); }
    }, 280);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setFocused(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (item) => {
    setQuery(item.title);
    setFocused(false);
    setResults([]);
    onSelect?.(item);
  };

  const handleClear = () => { setQuery(''); setResults([]); };

  const showDropdown = focused && query.trim().length > 0;

  return (
    <div className="searchbar-wrap" ref={wrapRef}>
      <div className={`searchbar-inner ${focused ? 'focused' : ''}`}>
        <span className="sb-icon">
          {loading ? <span className="sb-spinner" /> : '🔍'}
        </span>
        <input
          id="search-input"
          className="sb-input"
          type="text"
          placeholder="Search movies & shows..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          autoComplete="off"
        />
        {query && (
          <button className="sb-clear" onClick={handleClear} title="Clear">✕</button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showDropdown && (
        <div className="sb-dropdown glass-card">
          {results.length === 0 && !loading && (
            <div className="sb-empty">No results for "{query}"</div>
          )}
          {results.map(item => (
            <button
              key={item.content_id}
              className="sb-suggestion"
              onClick={() => handleSelect(item)}
            >
              <div className="sb-sug-left">
                <span className="sb-sug-title">{highlightMatch(item.title, query)}</span>
                <span className="sb-sug-meta">
                  {item.genre && <span className="badge badge-genre" style={{ fontSize: '0.68rem', padding: '1px 7px' }}>{item.genre}</span>}
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{item.year}</span>
                </span>
              </div>
              <div className="sb-sug-right">
                <span className={`badge ${item.type === 'Movie' ? 'badge-movie' : 'badge-tv'}`} style={{ fontSize: '0.68rem' }}>
                  {item.type === 'Movie' ? '🎬' : '📺'} {item.type}
                </span>
                <span className="sb-ai-score" style={{ color: 'var(--ai-gold)' }}>
                  {Math.round(item.ai_rating)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Bold matching text in title
function highlightMatch(title, query) {
  const idx = title.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return title;
  return (
    <>
      {title.slice(0, idx)}
      <strong style={{ color: 'var(--accent-hover)' }}>{title.slice(idx, idx + query.length)}</strong>
      {title.slice(idx + query.length)}
    </>
  );
}
