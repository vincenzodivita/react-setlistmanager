export default function FriendsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h2>Gestione Amici</h2>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">👥</div>
        <p>Gestione Amici in arrivo...</p>
        <p style={{ fontSize: '0.875rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>
          Qui potrai aggiungere amici e condividere i tuoi brani
        </p>
      </div>
    </div>
  );
}