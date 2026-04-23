import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import './Dashboard.css';

const Dashboard = () => {
  const { user, role } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError('');
      
      try {
        let endpoint;
        switch (role) {
          case 'ADMIN':
            endpoint = 'admin/stats/';
            break;
          case 'TEACHER':
            endpoint = 'teacher/dashboard/';
            break;
          case 'STUDENT':
            endpoint = 'student/dashboard-stats/';
            break;
          default:
            endpoint = 'admin/stats/';
        }

        const response = await api.get(endpoint);
        setStats(response.data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        setError('Impossible de charger les statistiques. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [role]);

  const getTitle = () => {
    switch (role) {
      case 'admin':
        return 'Tableau de bord Administrateur';
      case 'teacher':
        return 'Tableau de bord Professeur';
      case 'student':
        return 'Tableau de bord Étudiant';
      default:
        return 'Tableau de bord';
    }
  };

  const renderAdminStats = () => (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon">👥</div>
        <div className="stat-info">
          <div className="stat-value">{stats?.total_users || 0}</div>
          <div className="stat-label">Utilisateurs</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">🎓</div>
        <div className="stat-info">
          <div className="stat-value">{stats?.total_students || 0}</div>
          <div className="stat-label">Étudiants</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">👨‍🏫</div>
        <div className="stat-info">
          <div className="stat-value">{stats?.total_teachers || 0}</div>
          <div className="stat-label">Professeurs</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">🏫</div>
        <div className="stat-info">
          <div className="stat-value">{stats?.total_promotions || 0}</div>
          <div className="stat-label">Promotions</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">💰</div>
        <div className="stat-info">
          <div className="stat-value">{stats?.total_frais ? `${(stats.total_frais / 1000).toFixed(0)}K` : '0'}</div>
          <div className="stat-label">Frais Totaux</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">✅</div>
        <div className="stat-info">
          <div className="stat-value">{stats?.total_paye ? `${Math.round((stats.total_paye / stats.total_frais) * 100) || 0}%` : '0%'}</div>
          <div className="stat-label">Taux de Paiement</div>
        </div>
      </div>
    </div>
  );

  const renderTeacherStats = () => (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon">📚</div>
        <div className="stat-info">
          <div className="stat-value">{stats?.nombre_matieres || 0}</div>
          <div className="stat-label">Matières</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">👨‍🏫</div>
        <div className="stat-info">
          <div className="stat-value">{stats?.nom || 'Professeur'}</div>
          <div className="stat-label">Enseignant</div>
        </div>
      </div>
      {stats?.matieres && stats.matieres.length > 0 && (
        <>
          <div className="stat-card">
            <div className="stat-icon">📖</div>
            <div className="stat-info">
              <div className="stat-value">{stats.matieres[0]?.nom?.substring(0, 15) || 'N/A'}</div>
              <div className="stat-label">Matière Principale</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔖</div>
            <div className="stat-info">
              <div className="stat-value">{stats.matieres[0]?.code || 'N/A'}</div>
              <div className="stat-label">Code</div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderStudentStats = () => (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon">�</div>
        <div className="stat-info">
          <div className="stat-value">{stats?.moyenne_generale || 0}/20</div>
          <div className="stat-label">Moyenne Générale</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">🏆</div>
        <div className="stat-info">
          <div className="stat-value">{stats?.rang || 0}</div>
          <div className="stat-label">Rang / {stats?.total_etudiants || 0}</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">📚</div>
        <div className="stat-info">
          <div className="stat-value">{stats?.matieres?.length || 0}</div>
          <div className="stat-label">Matières</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">💰</div>
        <div className="stat-info">
          <div className="stat-value">{stats?.solde_restant ? `${stats.solde_restant} FCFA` : '0 FCFA'}</div>
          <div className="stat-label">Solde à Payer</div>
        </div>
      </div>
    </div>
  );

  const renderStats = () => {
    switch (role) {
      case 'ADMIN':
        return renderAdminStats();
      case 'TEACHER':
        return renderTeacherStats();
      case 'STUDENT':
        return renderStudentStats();
      default:
        return renderAdminStats();
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} title={getTitle()} />
        
        <main className="dashboard-content">
          <div className="welcome-section">
            <h2>
              Bonjour, {user?.first_name || user?.username} 👋
            </h2>
            <p>Voici un aperçu de votre activité aujourd'hui.</p>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Chargement des statistiques...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
            </div>
          ) : (
            renderStats()
          )}

          <div className="content-section">
            <h3>Activités Récentes</h3>
            <div className="empty-state">
              <p>Aucune activité récente à afficher.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
