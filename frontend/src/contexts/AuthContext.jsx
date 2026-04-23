import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('authToken');
      if (storedToken) {
        try {
          const response = await api.get('auth/user/');
          setUser(response.data);
          setToken(storedToken);
        } catch (error) {
          console.error('Failed to authenticate token:', error);
          localStorage.removeItem('authToken');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await api.post('token/', credentials);
      const { access: authToken, profile: profileData } = response.data;
      
      localStorage.setItem('authToken', authToken);
      setToken(authToken);
      setUser(profileData);
      
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Échec de la connexion. Veuillez vérifier vos identifiants.'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
  };

  const seedDemo = async () => {
    try {
      const response = await api.post('seed-data/');
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Seed failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Échec de l\'initialisation des données.'
      };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    seedDemo,
    isAuthenticated: !!token,
    role: user?.role
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
