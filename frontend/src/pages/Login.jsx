import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');
  
  const { login, seedDemo } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login({ username, password });
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleDemoLogin = async (demoUser, demoPassword) => {
    setError('');
    setLoading(true);

    const result = await login({ username: demoUser, password: demoPassword });
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleSeed = async () => {
    setSeedLoading(true);
    setSeedMessage('');
    
    const result = await seedDemo();
    
    if (result.success) {
      setSeedMessage(`✓ ${result.message}`);
    } else {
      setSeedMessage(`✗ ${result.error}`);
    }
    
    setSeedLoading(false);
    setTimeout(() => setSeedMessage(''), 5000);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>EduManager</h1>
          <p>Système de Gestion Scolaire</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Nom d'utilisateur</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Entrez votre nom d'utilisateur"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Entrez votre mot de passe"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <div className="demo-section">
          <h3>Comptes Démo</h3>
          <div className="demo-buttons">
            <button
              className="btn-demo btn-admin"
              onClick={() => handleDemoLogin('admin', 'admin123')}
              disabled={loading}
            >
              Admin
            </button>
            <button
              className="btn-demo btn-teacher"
              onClick={() => handleDemoLogin('teacher', 'teacher123')}
              disabled={loading}
            >
              Professeur
            </button>
            <button
              className="btn-demo btn-student"
              onClick={() => handleDemoLogin('student', 'student123')}
              disabled={loading}
            >
              Étudiant
            </button>
          </div>
        </div>

        <div className="seed-section">
          <button
            className="btn-seed"
            onClick={handleSeed}
            disabled={seedLoading}
          >
            {seedLoading ? 'Initialisation...' : '🌱 Initialiser la base de données'}
          </button>
          {seedMessage && <div className="seed-message">{seedMessage}</div>}
        </div>
      </div>
    </div>
  );
};

export default Login;
