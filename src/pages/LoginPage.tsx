import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
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
            onClick={() => setIsLogin(true)}
            className={`tab-btn ${isLogin ? 'active' : ''}`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
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
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
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

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={isLoading}
          >
            {isLoading ? 'Caricamento...' : isLogin ? 'Accedi' : 'Registrati'}
          </button>
        </form>

        <p className="login-footer">
          {isLogin ? 'Non hai un account? ' : 'Hai già un account? '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
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
