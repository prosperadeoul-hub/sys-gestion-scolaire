import { useNavigate } from 'react-router-dom';
import { Users, Hand, BarChart3, GraduationCap, Presentation, School, DollarSign, CheckCircle2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
const AdminDashboard = ({ stats, user }) => {
  const navigate = useNavigate();
  const statCards = [
    {
      icon: <Users size={24} />,
      value: stats?.total_users || 0,
      label: 'Utilisateurs',
      color: '#3b82f6'
    },
    {
      icon: <GraduationCap size={24} />,
      value: stats?.total_students || 0,
      label: 'Étudiants',
      color: '#10b981'
    },
    {
      icon: <Presentation size={24} />,
      value: stats?.total_teachers || 0,
      label: 'Professeurs',
      color: '#f59e0b'
    },
    {
      icon: <School size={24} />,
      value: stats?.total_promotions || 0,
      label: 'Promotions',
      color: '#8b5cf6'
    },
    {
      icon: <DollarSign size={24} />,
      value: stats?.total_frais ? `${(stats.total_frais).toLocaleString()} FCFA` : '0 FCFA',
      label: 'Frais Totaux',
      color: '#ef4444'
    },
    {
      icon: <CheckCircle2 size={24} />,
      value: (stats && stats.total_frais) ? `${Math.round(((stats.total_paye || 0) / stats.total_frais) * 100)}%` : '0%',
      label: 'Taux de Paiement',
      color: '#06b6d4'
    }
  ];

  const actionButtons = [
    { id: 'users', label: 'Utilisateurs', path: '/dashboard/users', color: '#3b82f6', icon: <Users size={18} /> },
    { id: 'courses', label: 'Cours', path: '/dashboard/courses', color: '#10b981', icon: <Presentation size={18} /> },
    { id: 'classes', label: 'Classes', path: '/dashboard/classes', color: '#8b5cf6', icon: <School size={18} /> },
    { id: 'settings', label: 'Paramètres', path: '/dashboard/settings', color: '#f59e0b', icon: <CheckCircle2 size={18} /> },
  ];

  const paymentChartData = [
    { name: 'Payé', value: stats?.total_paye || 0, color: '#10b981' },
    { name: 'Restant', value: Math.max((stats?.total_frais || 0) - (stats?.total_paye || 0), 0), color: '#60a5fa' },
  ];

  const promotionChartData = stats?.promotion_averages?.map((promo) => ({
    name: promo.nom,
    moyenne: promo.moyenne,
  })) || [];

  const totalPaiementPourcentage = stats?.total_frais ? Math.round((stats.total_paye / stats.total_frais) * 100) : 0;

  const handleActionClick = (path) => {
    navigate(path);
  };

  return (
    <div className="dashboard-content-wrapper">
      <div className="welcome-section">
        <h2>
          Bonjour, {user?.full_name || user?.username}    
          {/* <Hand 
            size={24} 
            style={{ transform: 'rotate(15deg)', color: '#fbbf24' }} 
          /> */}
        </h2>

        <p>Tableau de bord Administrateur - Vue d'ensemble de l'établissement</p>
      </div>

      {/* <div className="quick-actions">
        {actionButtons.map((item) => (
          <button
            key={item.id}
            className="quick-action-button"
            style={{ borderColor: item.color, color: item.color }}
            onClick={() => handleActionClick(item.path)}
          >
            <span className="action-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div> */}

      <div className="stats-grid">
        {statCards.map((card, index) => (
          <div key={index} className="stat-card" style={{ borderTopColor: card.color }}>
            <div className="stat-icon" style={{ color: card.color }}>
              {card.icon}
            </div>
            <div className="stat-info">
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <BarChart3 size={20} />
            <span>Moyennes par Promotion</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={promotionChartData} margin={{ top: 12, right: 12, left: -12, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} minTickGap={10} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="moyenne" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <DollarSign size={20} />
            <span>Répartition des paiements</span>
          </div>
          <div className="chart-summary">
            <div>
              <span className="summary-label">Total frais</span>
              <span className="summary-value">{stats?.total_frais ? `${(stats.total_frais / 1000).toFixed(1)}K €` : '0 €'}</span>
            </div>
            <div>
              <span className="summary-label">Payé</span>
              <span className="summary-value">{stats?.total_paye ? `${(stats.total_paye / 1000).toFixed(1)}K €` : '0 €'}</span>
            </div>
            <div>
              <span className="summary-label">Taux</span>
              <span className="summary-value">{totalPaiementPourcentage}%</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={paymentChartData}
                dataKey="value"
                nameKey="name"
                innerRadius={64}
                outerRadius={98}
                paddingAngle={4}
                cornerRadius={8}
              >
                {paymentChartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {stats?.promotion_averages && stats.promotion_averages.length > 0 && (
        <div className="content-section">
          <h3> <BarChart3 size={20} /> Moyennes par Promotion</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Promotion</th>
                  <th>Moyenne Générale</th>
                  <th>Niveau</th>
                </tr>
              </thead>
              <tbody>
                {stats.promotion_averages.map((promo, index) => (
                  <tr key={index}>
                    <td>{promo.nom}</td>
                    <td>
                      <div className="progress-bar-container">
                        <div 
                          className="progress-bar" 
                          style={{ 
                            width: `${Math.min((promo.moyenne / 20) * 100, 100)}%`,
                            backgroundColor: promo.moyenne >= 10 ? '#10b981' : promo.moyenne >= 8 ? '#f59e0b' : '#ef4444'
                          }}
                        ></div>
                        <span className="progress-text">{promo.moyenne}/20</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${promo.moyenne >= 10 ? 'badge-success' : 'badge-warning'}`}>
                        {promo.moyenne >= 10 ? 'Bon' : 'À améliorer'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
