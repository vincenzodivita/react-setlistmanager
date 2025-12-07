import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/api';
import { useAppStore } from '@/store/appStore';
import './AuthPages.css';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser, setIsAuthenticated } = useAppStore();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Token di verifica non valido o mancante');
      setStatus('error');
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      const result = await apiClient.verifyEmail(token!);
      
      // Imposta l'utente e autenticalo automaticamente
      setUser(result.user);
      setIsAuthenticated(true);
      
      setStatus('success');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore nella verifica dell\'email');
      setStatus('error');
    }
  };

  const handleGoToApp = () => {
    navigate('/songs');
  };

  if (status === 'verifying') {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-icon loading">
            <div className="spinner"></div>
          </div>
          <h1 className="auth-title">Verifica in corso...</h1>
          <p className="auth-description">
            Stiamo verificando il tuo indirizzo email.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-icon success">✅</div>
          <h1 className="auth-title">Email Verificata!</h1>
          <p className="auth-description">
            Il tuo indirizzo email è stato verificato con successo. 
            Ora puoi utilizzare tutte le funzionalità dell'app.
          </p>
          <button
            onClick={handleGoToApp}
            className="btn btn-primary btn-block"
          >
            Inizia ad usare l'app →
          </button>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-icon error">❌</div>
        <h1 className="auth-title">Verifica Fallita</h1>
        <p className="auth-description">
          {error || 'Non è stato possibile verificare il tuo indirizzo email.'}
        </p>
        <p className="auth-note">
          Il link potrebbe essere scaduto o già utilizzato.
        </p>
        
        <div className="auth-actions">
          <ResendVerification />
        </div>

        <div className="auth-footer">
          <Link to="/login" className="link-btn">
            ← Torna al Login
          </Link>
        </div>
      </div>
    </div>
  );
}

// Componente per reinviare l'email di verifica
function ResendVerification() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    if (!email) return;

    setIsLoading(true);
    setError('');

    try {
      await apiClient.resendVerificationEmail(email);
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore nell\'invio dell\'email');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="resend-success">
        <p>✅ Email inviata! Controlla la tua casella di posta.</p>
      </div>
    );
  }

  return (
    <div className="resend-section">
      <p className="resend-title">Richiedi un nuovo link di verifica:</p>
      <div className="resend-form">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="La tua email"
          className="resend-input"
        />
        <button
          onClick={handleResend}
          disabled={isLoading || !email}
          className="btn btn-secondary"
        >
          {isLoading ? 'Invio...' : 'Reinvia'}
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}