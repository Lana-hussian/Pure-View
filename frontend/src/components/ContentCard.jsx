import { useState } from 'react';
import FamilyMeters from './FamilyMeters';

const PLACEHOLDER = 'https://via.placeholder.com/300x450/0F172A/94A3B8?text=No+Poster';

export default function ContentCard({ content, onClick, onRate, currentUserRating }) {
  const [hovered, setHovered]         = useState(false);
  const [ratingHover, setRatingHover] = useState(0);
  const [localRating, setLocalRating] = useState(currentUserRating?.score || 0);
  const [editMode, setEditMode]       = useState(false);
  const [saving, setSaving]           = useState(false);

  const hasRated  = currentUserRating && currentUserRating.score > 0;
  const ratingId  = currentUserRating?.rating_id;

  const handleRate = async (score) => {
    if (!onRate) return;
    setSaving(true);
    setLocalRating(score);
    await onRate(content.content_id, score, ratingId);
    setSaving(false);
    setEditMode(false);
  };

  const aiColor = content.ai_rating >= 80
    ? 'var(--neon-green)'
    : content.ai_rating >= 60
    ? 'var(--ai-gold)'
    : 'var(--neon-red)';

  return (
    <article
      className={`content-card animate-float-slow ${hovered ? 'hovered' : ''}`}
      style={{ animationDelay: `${(content.content_id % 5) * 0.4}s` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Poster */}
      <div className="card-poster-wrap" onClick={() => onClick?.(content)}>
        <img
          src={content.poster || PLACEHOLDER}
          alt={content.title}
          className="card-poster"
          onError={e => { e.target.src = PLACEHOLDER; }}
        />
        <div className="poster-overlay">
          <span className="view-details-btn">View Details ↗</span>
        </div>
        <span className={`card-type-badge badge ${content.type === 'Movie' ? 'badge-movie' : 'badge-tv'}`}>
          {content.type === 'Movie' ? '🎬' : '📺'} {content.type}
        </span>
      </div>

      <div className="card-body">
        {/* Title & year */}
        <div className="card-title-row">
          <h3 className="card-title">{content.title}</h3>
          <span className="card-year">{content.year}</span>
        </div>
        {content.genre && <span className="badge badge-genre">{content.genre}</span>}

        {/* Dual ratings */}
        <div className="dual-ratings">
          {/* AI Rating ring */}
          <div className="rating-block ai-block">
            <div className="rating-ring">
              <svg viewBox="0 0 60 60" className="ring-svg">
                <circle cx="30" cy="30" r="24" className="ring-bg" />
                <circle
                  cx="30" cy="30" r="24"
                  className="ring-fg"
                  style={{
                    stroke: aiColor,
                    filter: `drop-shadow(0 0 4px ${aiColor})`,
                    strokeDasharray: `${(content.ai_rating / 100) * 150.8} 150.8`,
                  }}
                />
              </svg>
              <span className="ring-value" style={{ color: aiColor }}>{Math.round(content.ai_rating)}</span>
            </div>
            <span className="rating-label">AI Score</span>
            <span className="rating-sub">/ 100</span>
          </div>

          {/* User Rating */}
          <div className="rating-block user-block">
            <div className="user-rating-display">
              <span className="user-score" style={{ color: 'var(--user-star)' }}>
                ★ {content.user_rating != null ? content.user_rating.toFixed(1) : '—'}
              </span>
              <span className="user-count">
                {content.rating_count ? `${content.rating_count} vote${content.rating_count > 1 ? 's' : ''}` : 'No votes'}
              </span>
            </div>
            <span className="rating-label">User Score</span>
            <span className="rating-sub">/ 10</span>
          </div>
        </div>

        {/* Family meters */}
        {content.familyClassification && (
          <FamilyMeters fc={content.familyClassification} />
        )}

        {/* ─── Rating Section ─── */}
        {onRate && (
          <div className="rate-section">
            {hasRated && !editMode ? (
              /* ── Already-rated state ── */
              <div className="rated-state">
                <div className="rated-display">
                  <span className="rated-label">Your Rating</span>
                  <span className="rated-stars">
                    {Array.from({ length: 10 }, (_, i) => (
                      <span key={i} className={`star-static ${i < localRating ? 'lit' : ''}`}>★</span>
                    ))}
                  </span>
                  <span className="rated-score" style={{ color: 'var(--user-star)' }}>
                    {localRating}<span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>/10</span>
                  </span>
                </div>
                <button
                  className="btn btn-ghost btn-sm edit-rating-btn"
                  onClick={() => setEditMode(true)}
                >
                  ✏ Edit Rating
                </button>
              </div>
            ) : onRate && (
              /* ── Rate / Edit mode ── */
              <div className={`star-rate-mode ${editMode ? 'edit-active' : ''}`}>
                <div className="rate-header">
                  <span className="rate-label">
                    {editMode ? '✏ Update your rating:' : 'Rate it:'}
                  </span>
                  {editMode && (
                    <button className="sb-clear" style={{ marginLeft: 'auto' }} onClick={() => setEditMode(false)}>
                      ✕
                    </button>
                  )}
                </div>
                <div className="star-row">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => (
                    <button
                      key={s}
                      className={`star-btn ${s <= (ratingHover || localRating) ? 'lit' : ''}`}
                      onMouseEnter={() => setRatingHover(s)}
                      onMouseLeave={() => setRatingHover(0)}
                      onClick={() => handleRate(s)}
                      disabled={saving}
                      title={`Rate ${s}/10`}
                    >★</button>
                  ))}
                </div>
                {saving && <span className="saving-hint">Saving…</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
