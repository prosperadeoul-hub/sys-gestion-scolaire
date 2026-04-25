import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { TrendingUp, Trophy, BookOpen, Wallet, GraduationCap, ClipboardList, Calendar, BarChart3, Target } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Legend,
  Pie,
  Cell,
} from 'recharts';

const StudentDashboard = ({ stats, user }) => {
  const navigate = useNavigate();

  const getGradeColor = (grade) => {
    if (grade >= 16) return '#10b981';
    if (grade >= 14) return '#3b82f6';
    if (grade >= 12) return '#8b5cf6';
    if (grade >= 10) return '#f59e0b';
    return '#ef4444';
  };

  const getRankBadge = (rank, total) => {
    const percentile = (rank / total) * 100;
    if (percentile <= 10) return { text: 'Excellent', color: '#10b981' };
    if (percentile <= 25) return { text: 'Très Bien', color: '#3b82f6' };
    if (percentile <= 50) return { text: 'Bien', color: '#8b5cf6' };
    return { text: 'Passable', color: '#f59e0b' };
  };

  const rankInfo = getRankBadge(stats?.rang || 1, stats?.total_etudiants || 1);

  const actionButtons = [
    { id: 'courses', label: 'Mes Cours', path: '/dashboard/courses', color: '#3b82f6', icon: <BookOpen size={20} /> },
    { id: 'grades', label: 'Mes Notes', path: '/dashboard/grades', color: '#10b981', icon: <ClipboardList size={20} /> },
    { id: 'schedule', label: 'Emploi du temps', path: '/dashboard/schedule', color: '#f59e0b', icon: <Calendar size={20} /> },
  ];

  const [gradesData, setGradesData] = useState([]);
  const [performanceTrendData, setPerformanceTrendData] = useState([]);
  const [attendanceData, setAttendanceData] = useState(null);

  useEffect(() => {
    // Build charts from API where possible. student/courses provides per-matiere averages and exam notes.
    const buildFromCourses = async () => {
      try {
        const resp = await api.get('student/courses/');
        const cours = resp.data.cours || [];

        const gData = cours.map(c => ({
          matiere: (c.nom || '').substring(0, 12) + ((c.nom || '').length > 12 ? '...' : ''),
          note: c.moyenne != null ? Number(c.moyenne) : 0,
          coefficient: c.coefficient || 1,
        }));
        setGradesData(gData);

        // performanceTrend: aggregate exam dates to compute average per date
        const examMap = {};
        cours.forEach(c => {
          (c.examens || []).forEach(ex => {
            if (!ex.date) return;
            const key = ex.date;
            if (!examMap[key]) examMap[key] = { total: 0, count: 0 };
            if (ex.note != null) {
              examMap[key].total += Number(ex.note);
              examMap[key].count += 1;
            }
          });
        });
        const perf = Object.keys(examMap).sort().map((date, idx) => ({ periode: date, moyenne: examMap[date].count ? Number((examMap[date].total / examMap[date].count).toFixed(2)) : 0 }));
        setPerformanceTrendData(perf.slice(-8));

        // Attendance not tracked in DB currently; use stats.attendance if backend provides it
        if (stats && stats.attendance) {
          setAttendanceData(stats.attendance);
        } else {
          setAttendanceData(null);
        }
      } catch (e) {
        // fallback: use matieres list from stats for basic grades chart
        const fallback = stats?.matieres?.map(m => ({ matiere: (m.nom||'').substring(0,12), note: 0, coefficient: m.coefficient || 1 })) || [];
        setGradesData(fallback);
        setPerformanceTrendData([]);
        setAttendanceData(null);
      }
    };

    buildFromCourses();
  }, [stats]);

  const handleActionClick = (path) => {
    navigate(path);
  };

  return (
    <div className="dashboard-content-wrapper">
      <div className="welcome-section">
        <h2>
          Bonjour, {user?.full_name || user?.username} 👋
        </h2>
        <p>Tableau de bord Étudiant - Suivez vos performances académiques</p>
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
        <div className="stat-card" style={{ borderTopColor: getGradeColor(stats?.moyenne_generale || 0) }}>
          <div className="stat-icon" style={{ color: getGradeColor(stats?.moyenne_generale || 0) }}>
            <TrendingUp />
          </div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: getGradeColor(stats?.moyenne_generale || 0) }}>
              {stats?.moyenne_generale || 0}/20
            </div>
            <div className="stat-label">Moyenne Générale</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderTopColor: rankInfo.color }}>
          <div className="stat-icon" style={{ color: rankInfo.color }}>
            <Trophy />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.rang || 0}</div>
            <div className="stat-label">
              Rang / {stats?.total_etudiants || 0}
              <span className="rank-badge" style={{ backgroundColor: rankInfo.color }}>
                {rankInfo.text}
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ borderTopColor: '#3b82f6' }}>
          <div className="stat-icon" style={{ color: '#3b82f6' }}>
            <BookOpen />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.matieres?.length || 0}</div>
            <div className="stat-label">Matières</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderTopColor: '#f59e0b' }}>
          <div className="stat-icon" style={{ color: '#f59e0b' }}>
            <Wallet />
          </div>
          <div className="stat-info">
            <div className="stat-value">
              {stats?.solde_restant ? `${stats.solde_restant} FCFA` : '0 FCFA'}
            </div>
            <div className="stat-label">Solde à Payer</div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <BarChart3 size={20} />
            <span>Notes par Matière</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={gradesData} margin={{ top: 12, right: 12, left: -12, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="matiere" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
              <YAxis domain={[0, 20]} />
              <Tooltip />
              <Bar dataKey="note" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <Target size={20} />
            <span>Évolution des Moyennes</span>
          </div>
          {performanceTrendData && performanceTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={performanceTrendData} margin={{ top: 12, right: 12, left: -12, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="periode" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 20]} />
                <Tooltip />
                <Line type="monotone" dataKey="moyenne" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: '1rem' }}>Données d'évolution indisponibles.</div>
          )}
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <GraduationCap size={20} />
            <span>Assiduité</span>
          </div>
          <div className="chart-summary">
            <div>
              <span className="summary-label">Taux de présence</span>
              <span className="summary-value">{attendanceData ? `${attendanceData.present || 0}%` : 'N/A'}</span>
            </div>
            <div>
              <span className="summary-label">Total cours</span>
              <span className="summary-value">{stats?.matieres?.length || 0}</span>
            </div>
          </div>
          {attendanceData ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={attendanceData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={4}
                  cornerRadius={8}
                >
                  {attendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: '1rem' }}>Données d'assiduité non disponibles dans la base.</div>
          )}
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <Wallet size={20} />
            <span>État des Paiements</span>
          </div>
          <div className="payment-status">
            <div className="payment-item">
              <span className="payment-label">Frais de scolarité</span>
              <span className="payment-amount">{stats?.frais_total ? `${stats.frais_total} FCFA` : 'N/A'}</span>
            </div>
            <div className="payment-item">
              <span className="payment-label">Payé</span>
              <span className="payment-amount paid">{stats?.frais_payes ? `${stats.frais_payes} FCFA` : 'N/A'}</span>
            </div>
            <div className="payment-item">
              <span className="payment-label">Restant</span>
              <span className="payment-amount remaining">{stats?.solde_restant ? `${stats.solde_restant} FCFA` : '0 FCFA'}</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: stats && stats.frais_total ? `${Math.min(100, Math.round(((stats.frais_payes || 0) / stats.frais_total) * 100))}%` : '0%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {stats?.matieres && stats.matieres.length > 0 && (
        <div className="content-section">
          <h3>📚 Vos Matières</h3>
          <div className="subjects-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Matière</th>
                  <th>Code</th>
                  <th>Coefficient</th>
                  <th>Crédits</th>
                </tr>
              </thead>
              <tbody>
                {stats.matieres.map((matiere, index) => (
                  <tr key={index}>
                    <td>
                      <div className="subject-name">
                        <GraduationCap className="subject-icon" />
                        {matiere.nom}
                      </div>
                    </td>
                    <td><span className="badge">{matiere.code}</span></td>
                    <td>{matiere.coefficient || 1}</td>
                    <td>{matiere.credits || 0}</td>
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

export default StudentDashboard;
