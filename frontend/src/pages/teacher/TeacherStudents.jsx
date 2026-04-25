import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search } from 'lucide-react';
import api from '../../api/axios';
import '../../pages/student/StudentCourses.css';

const TeacherStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const resp = await api.get('teacher/courses/');
        const cours = resp.data.cours || [];
        const map = {};
        cours.forEach(c => {
          (c.students || []).forEach(s => {
            if (!map[s.id]) map[s.id] = { ...s, courses: new Set() };
            map[s.id].courses.add(c.nom);
          });
        });
        const list = Object.values(map).map(s => ({ ...s, courses: Array.from(s.courses) }));
        setStudents(list);
      } catch (err) {
        console.error('Erreur teacher students', err);
        setError('Impossible de charger la liste des étudiants.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const navigate = useNavigate();

  const filtered = students.filter(s =>
    s.nom?.toLowerCase().includes(search.toLowerCase()) ||
    s.matricule?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (<div className="loading-container"><div className="loading-spinner"/>Chargement...</div>);
  if (error) return (<div className="error-container"><p>{error}</p></div>);

  return (
    <div className="student-courses-page">
      <div className="page-header">
        <div className="header-content">
          <h1><Users size={28} /> Mes Étudiants</h1>
          <p>Liste des étudiants rattachés à vos cours.</p>
        </div>
      </div>

      <div className="management-header">
        <div className="search-bar">
          <Search size={18} />
          <input placeholder="Rechercher un étudiant..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Étudiant</th>
              <th>Matricule</th>
              <th>Cours</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} onClick={() => navigate(`/dashboard/students/${s.id}`)} style={{ cursor: 'pointer' }}>
                <td>{s.nom}</td>
                <td>{s.matricule}</td>
                <td>{(s.courses || []).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeacherStudents;
