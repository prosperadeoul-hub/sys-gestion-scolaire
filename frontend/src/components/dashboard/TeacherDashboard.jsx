import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { BookOpen, Presentation, ClipboardList, Tag, Users, BarChart3, TrendingUp } from 'lucide-react';
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
} from 'recharts';

const TeacherDashboard = ({ stats, user }) => {
  const navigate = useNavigate();

  const actionButtons = [
    { id: 'courses', label: 'Mes Cours', path: '/dashboard/courses', color: '#3b82f6', icon: <BookOpen size={18} /> },
    { id: 'students', label: 'Étudiants', path: '/dashboard/students', color: '#10b981', icon: <Users size={18} /> },
    { id: 'grades', label: 'Notes', path: '/dashboard/grades', color: '#f59e0b', icon: <ClipboardList size={18} /> },
  ];

  // Sample chart data - in a real app, this would come from the API
  const [gradeDistributionData, setGradeDistributionData] = useState([]);
  const [performanceTrendData, setPerformanceTrendData] = useState([]);

  useEffect(() => {
    // aggregate notes from teacher/courses/ to build distribution and trend
    const build = async () => {
      try {
        const resp = await api.get('teacher/courses/');
        const cours = resp.data.cours || [];

        // collect all numeric notes
        const notes = [];
        const dateMap = {}; // date -> { total, count }

        cours.forEach(c => {
          (c.students || []).forEach(s => {
            (s.examens || []).forEach(ex => {
              if (ex.note != null) {
                const n = Number(ex.note);
                if (!Number.isNaN(n)) notes.push(n);
                if (ex.date) {
                  const key = ex.date;
                  if (!dateMap[key]) dateMap[key] = { total: 0, count: 0 };
                  dateMap[key].total += n;
                  dateMap[key].count += 1;
                }
              }
            });
          });
        });

        // buckets for distribution
        const buckets = [ { range: '0-5', min:0, max:5, count:0 }, { range: '6-10', min:6, max:10, count:0 }, { range: '11-15', min:11, max:15, count:0 }, { range: '16-20', min:16, max:20, count:0 } ];
        notes.forEach(n => {
          const b = buckets.find(bk => n >= bk.min && n <= bk.max);
          if (b) b.count += 1;
        });

        setGradeDistributionData(buckets.map(b => ({ range: b.range, count: b.count })));

        const perf = Object.keys(dateMap).sort().map(d => ({ month: d, moyenne: dateMap[d].count ? Number((dateMap[d].total / dateMap[d].count).toFixed(2)) : 0 }));
        setPerformanceTrendData(perf.slice(-12));
      } catch (e) {
        // fallback: keep empty arrays
        setGradeDistributionData([]);
        setPerformanceTrendData([]);
      }
    };

    build();
  }, []);

  const handleActionClick = (path) => {
    navigate(path);
  };
  return (
    <div className="dashboard-content-wrapper">
      <div className="welcome-section">
        <h2>
          Bonjour, {stats?.nom || user?.full_name || user?.username}
        </h2>
        <p>Tableau de bord Professeur - Gestion de vos matières et classes</p>
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
        <div className="stat-card" style={{ borderTopColor: '#3b82f6' }}>
          <div className="stat-icon" style={{ color: '#3b82f6' }}>
            <BookOpen />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.nombre_matieres || 0}</div>
            <div className="stat-label">Matières</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderTopColor: '#10b981' }}>
          <div className="stat-icon" style={{ color: '#10b981' }}>
            <Presentation />
          </div>
          <div className="stat-info">
            <div className="stat-value">Enseignant</div>
            <div className="stat-label">{stats?.nom || user?.full_name || 'Professeur'}</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderTopColor: '#f59e0b' }}>
          <div className="stat-icon" style={{ color: '#f59e0b' }}>
            <ClipboardList />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.total_notes || 0}</div>
            <div className="stat-label">Notes saisies</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderTopColor: '#8b5cf6' }}>
          <div className="stat-icon" style={{ color: '#8b5cf6' }}>
            <Users />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.total_etudiants || 0}</div>
            <div className="stat-label">Étudiants</div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <BarChart3 size={20} />
            <span>Répartition des Notes</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={gradeDistributionData} margin={{ top: 12, right: 12, left: -12, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <TrendingUp size={20} />
            <span>Évolution des Moyennes</span>
          </div>
          {performanceTrendData && performanceTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={performanceTrendData} margin={{ top: 12, right: 12, left: -12, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
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

      {stats?.matieres && stats.matieres.length > 0 ? (
        <div className="content-section">
          <h3>Vos Matières</h3>
          <div className="subjects-grid">
            {stats.matieres.map((matiere, index) => (
              <div key={index} className="subject-card">
                <div className="subject-header">
                  <div className="subject-icon">
                    <BookOpen />
                  </div>
                  <div className="subject-info">
                    <h4>{matiere.nom}</h4>
                    <span className="subject-code">{matiere.code}</span>
                  </div>
                </div>
                <div className="subject-details">
                  <div className="detail-item">
                    <ClipboardList className="detail-icon" />
                    <span>Coefficient: {matiere.coefficient || 1}</span>
                  </div>
                  <div className="detail-item">
                    <Tag className="detail-icon" />
                    <span>{matiere.credits || 0} Crédits</span>
                  </div>
                </div>
                <div className="subject-actions">
                  <button className="btn btn-primary">
                    <ClipboardList style={{ marginRight: '8px' }} />
                    Gérer les Notes
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="content-section">
          <div className="empty-state">
            <BookOpen style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }} />
            <p>Aucune matière assignée pour le moment.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
