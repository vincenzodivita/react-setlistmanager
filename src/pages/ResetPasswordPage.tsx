import { useState, FormEvent, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/api';
import './AuthPages.css';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token di reset non valido o mancante');
    }
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validazione
    if (password !== confirmPassword) {
      setError('Le password non corrispondono');
      return;
    }

    if (password.length < 6) {
      setError('La password deve avere almeno 6 caratteri');
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.resetPassword(token!, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore nel reset della password');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-icon error">❌</div>
          <h1 className="auth-title">Link Non Valido</h1>
          <p className="auth-description">
            Il link di reset password non è valido o è scaduto.
          </p>
          <Link to="/forgot-password" className="btn btn-primary btn-block">
            Richiedi un nuovo link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-icon success">✅</div>
          <h1 className="auth-title">Password Reimpostata!</h1>
          <p className="auth-description">
            La tua password è stata modificata con successo. 
            Ora puoi accedere con la nuova password.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn btn-primary btn-block"
          >
            Vai al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">🔑 Nuova Password</h1>
        <p className="auth-description">
          Inserisci la nuova password per il tuo account.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="password">Nuova Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Conferma Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          {/* Password strength indicator */}
          {password && (
            <div className="password-strength">
              <div className={`strength-bar ${
                password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
                  ? 'strong'
                  : password.length >= 6
                  ? 'medium'
                  : 'weak'
              }`} />
              <span className="strength-text">
                {password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
                  ? 'Password forte'
                  : password.length >= 6
                  ? 'Password media'
                  : 'Password debole'}
              </span>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={isLoading || !password || !confirmPassword}
          >
            {isLoading ? 'Salvataggio...' : 'Reimposta Password'}
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