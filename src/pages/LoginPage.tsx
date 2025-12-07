import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '@/services/api';
import { useAppStore } from '@/store/appStore';
import './AuthPages.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser, setIsAuthenticated } = useAppStore();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  
  // Nuovo stato per gestire la registrazione completata (in attesa verifica email)
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Verifica se l'email esiste (per la registrazione)
  const checkEmail = async (emailToCheck: string) => {
    if (!emailToCheck || isLogin) return;
    
    setCheckingEmail(true);
    try {
      const result = await apiClient.checkEmailExists(emailToCheck);
      setEmailExists(result.exists);
      if (result.exists) {
        setError('Questa email è già registrata. Prova ad accedere.');
      } else {
        setError('');
      }
    } catch (err) {
      // Ignora errori di rete durante il check
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // LOGIN
        const response = await apiClient.login(email, password);
        setUser(response.user);
        setIsAuthenticated(true);
        navigate('/songs');
      } else {
        // REGISTRAZIONE
        if (!name.trim()) {
          setError('Il nome è obbligatorio');
          setIsLoading(false);
          return;
        }
        
        const response = await apiClient.register(email, password, name);
        
        // Controlla se l'utente deve verificare l'email
        if (!response.access_token) {
          // Email non verificata - mostra schermata di conferma
          setRegistrationComplete(true);
          setRegisteredEmail(email);
        } else {
          // Email già verificata (non dovrebbe succedere nel nuovo flusso, ma gestiamolo)
          setUser(response.user);
          setIsAuthenticated(true);
          navigate('/songs');
        }
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        'Errore durante l\'autenticazione. Riprova.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Se la registrazione è completata, mostra la schermata di verifica email
  if (registrationComplete) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-icon success">📧</div>
          <h1 className="auth-title">Controlla la tua email!</h1>
          <p className="auth-description">
            Abbiamo inviato un link di verifica a<br />
            <strong>{registeredEmail}</strong>
          </p>
          <p className="auth-note">
            Clicca sul link nell'email per attivare il tuo account e poter accedere.
          </p>
          
          <div className="auth-actions">
            <ResendVerificationInline email={registeredEmail} />
          </div>

          <div className="auth-footer">
            <button
              onClick={() => {
                setRegistrationComplete(false);
                setIsLogin(true);
                setEmail(registeredEmail);
                setPassword('');
              }}
              className="link-btn"
            >
              ← Torna al Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">🎵 Setlist Manager</h1>
        
        <div className="login-tabs">
          <button
            onClick={() => {
              setIsLogin(true);
              setError('');
              setSuccess('');
              setEmailExists(null);
            }}
            className={`tab-btn ${isLogin ? 'active' : ''}`}
          >
            Login
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setError('');
              setSuccess('');
            }}
            className={`tab-btn ${!isLogin ? 'active' : ''}`}
          >
            Registrati
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Nome</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Il tuo nome"
                required={!isLogin}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-with-status">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailExists(null);
                }}
                onBlur={() => checkEmail(email)}
                placeholder="email@example.com"
                required
                className={emailExists === true ? 'input-error' : emailExists === false ? 'input-success' : ''}
              />
              {checkingEmail && <span className="input-status checking">⏳</span>}
              {!checkingEmail && emailExists === false && !isLogin && (
                <span className="input-status success">✓</span>
              )}
              {!checkingEmail && emailExists === true && !isLogin && (
                <span className="input-status error">✗</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={isLoading || (!isLogin && emailExists === true)}
          >
            {isLoading ? 'Caricamento...' : isLogin ? 'Accedi' : 'Registrati'}
          </button>

          {isLogin && (
            <Link to="/forgot-password" className="forgot-password-link">
              Password dimenticata?
            </Link>
          )}
        </form>

        <p className="login-footer">
          {isLogin ? 'Non hai un account? ' : 'Hai già un account? '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setSuccess('');
              setEmailExists(null);
            }}
            className="link-btn"
          >
            {isLogin ? 'Registrati' : 'Accedi'}
          </button>
        </p>
      </div>
    </div>
  );
}

// Componente inline per reinviare l'email di verifica
function ResendVerificationInline({ email }: { email: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const handleResend = async () => {
    if (countdown > 0) return;
    
    setIsLoading(true);
    setError('');

    try {
      await apiClient.resendVerificationEmail(email);
      setSent(true);
      // Avvia countdown di 60 secondi prima di poter reinviare
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setSent(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
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
        {countdown > 0 && (
          <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.7 }}>
            Puoi reinviare tra {countdown} secondi
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="resend-section">
      <p className="resend-title">Non hai ricevuto l'email?</p>
      <button
        onClick={handleResend}
        disabled={isLoading || countdown > 0}
        className="btn btn-secondary btn-block"
        style={{ marginTop: '0.5rem' }}
      >
        {isLoading ? 'Invio in corso...' : countdown > 0 ? `Attendi ${countdown}s` : '📤 Reinvia email di verifica'}
      </button>
      {error && <p className="error-text" style={{ marginTop: '0.5rem' }}>{error}</p>}
    </div>
  );
}