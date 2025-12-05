import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/services/api';
import './AuthPages.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await apiClient.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore nell\'invio dell\'email');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-icon success">📧</div>
          <h1 className="auth-title">Email Inviata!</h1>
          <p className="auth-description">
            Se l'indirizzo <strong>{email}</strong> è associato a un account, 
            riceverai un'email con le istruzioni per reimpostare la password.
          </p>
          <p className="auth-note">
            Controlla anche la cartella spam se non trovi l'email.
          </p>
          <Link to="/login" className="btn btn-primary btn-block">
            Torna al Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">🔐 Password Dimenticata?</h1>
        <p className="auth-description">
          Inserisci l'email associata al tuo account e ti invieremo 
          un link per reimpostare la password.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              autoFocus
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={isLoading || !email}
          >
            {isLoading ? 'Invio in corso...' : 'Invia Link di Reset'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="link-btn">
            ← Torna al Login
          </Link>
        </div>
      </div>
    </div>
  );
}