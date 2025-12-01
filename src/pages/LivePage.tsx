export default function LivePage() {
  return (
    <div className="page">
      <div className="page-header">
        <h2>Modalità Live</h2>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">🎤</div>
        <p>Modalità Live in arrivo...</p>
        <p style={{ fontSize: '0.875rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>
          Qui potrai suonare le tue setlist con metronomo integrato
        </p>
      </div>
    </div>
  );
}