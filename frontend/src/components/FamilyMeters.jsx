export default function FamilyMeters({ fc }) {
  if (!fc) return null;

  const meters = [
    { key: 'horror',       label: 'Horror',       value: fc.horror,       color: 'var(--meter-horror)' },
    { key: 'violence',     label: 'Violence',      value: fc.violence,     color: 'var(--meter-violence)' },
    { key: 'homosexuality',label: 'Homosexuality', value: fc.homosexuality,color: 'var(--meter-homosexuality)' },
    { key: 'adult_content',label: 'Adult',         value: fc.adult_content,color: 'var(--meter-adult)' },
  ];

  const getLabel = (v) => v <= 2 ? 'Safe' : v <= 5 ? 'Moderate' : v <= 8 ? 'High' : 'Extreme';

  return (
    <div className="family-meters">
      <h4 className="meters-title">
        <span className="shield-icon">🛡</span> Family Safety
      </h4>
      <div className="meters-grid">
        {meters.map(m => (
          <div key={m.key} className="meter-item">
            <div className="meter-header">
              <span className="meter-label">{m.label}</span>
              <span className="meter-value" style={{ color: m.color }}>{getLabel(m.value)}</span>
            </div>
            <div className="meter-track">
              <div
                className="meter-fill"
                style={{
                  width: `${(m.value / 10) * 100}%`,
                  background: `linear-gradient(90deg, ${m.color}88, ${m.color})`,
                  boxShadow: `0 0 8px ${m.color}66`,
                }}
              />
            </div>
            <div className="meter-dots">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className={`meter-dot ${i < m.value ? 'active' : ''}`}
                  style={i < m.value ? { background: m.color, boxShadow: `0 0 4px ${m.color}` } : {}} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
