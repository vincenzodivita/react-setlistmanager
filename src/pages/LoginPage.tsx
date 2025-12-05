import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '@/services/api';
import { useAppStore } from '@/store/appStore';
import './LoginPage.css';

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
      let response;
      if (isLogin) {
        response = await apiClient.login(email, password);
      } else {
        if (!name.trim()) {
          setError('Il nome è obbligatorio');
          setIsLoading(false);
          return;
        }
        response = await apiClient.register(email, password, name);
        
        // Mostra messaggio per verificare l'email
        if (!response.user.isEmailVerified) {
          setSuccess('Registrazione completata! Controlla la tua email per verificare l\'account.');
        }
      }

      setUser(response.user);
      setIsAuthenticated(true);
      navigate('/songs');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        'Errore durante l\'autenticazione. Riprova.'
      );
    } finally {
      setIsLoading(false);
    }
  };

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