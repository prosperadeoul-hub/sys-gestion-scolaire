import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ClipboardList, BookOpen, Calendar } from 'lucide-react';
import api from '../../api/axios';
import './StudentCourses.css';

const StudentGrades = () => {
  const { user, role } = useAuth();
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGrades = async () => {
      if (!role || role !== 'ETUDIANT') {
        setError('Accès refusé : cette page est réservée aux étudiants.');
        setLoading(false);
        return;
      }

      try {
        // backend currently exposes student/courses/ which contains exams and notes
        const resp = await api.get('student/courses/');
        // server returns { cours: [...] }
        const data = resp.data.cours || resp.data.matieres || resp.data || [];

        // Normalize to array of subjects with examens and moyenne
        const matieres = data.map((c) => ({
          id: c.id,
          nom: c.nom,
          moyenne: c.moyenne,
          coefficient: c.coefficient,
          examens: c.examens || [],
        }));

        setGrades(matieres);
      } catch (err) {
        console.error('Erreur fetch grades', err);
        setError('Impossible de charger les notes.');
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [role]);

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Chargement des notes...</p>
    </div>
  );

  if (error) return (
    <div className="error-container">
      <div className="error-message">
        <h2>⚠️ Erreur</h2>
        <p>{error}</p>
      </div>
    </div>
  );

  return (
    <div className="student-courses-page">
      <div className="page-header">
        <div className="header-content">
          <h1><ClipboardList size={28} /> Gestion des Notes</h1>
          <p>Consultez vos moyennes et détails des examens.</p>
        </div>
      </div>

      <div className="content-section">
        <h3>📊 Résumé des Matières</h3>
        <div className="subjects-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Matière</th>
                <th>Moyenne</th>
                <th>Coefficient</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((m, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="subject-name">
                      <BookOpen className="subject-icon" />
                      {m.nom || m.matiere || '—'}
                    </div>
                  </td>
                  <td>{m.moyenne !== undefined && m.moyenne !== null ? `${m.moyenne}/20` : '—'}</td>
                  <td>{m.coefficient || m.coeff || 1}</td>
                  <td>
                    {m.examens && m.examens.length > 0 ? (
                      <div className="examens-list-small">
                        {m.examens.map((e) => (
                          <div key={e.id} className="examen-item-small">
                            <span className="examen-name">{e.nom}</span>
                            <span className="examen-grade">{e.note !== null ? `${e.note}/20` : 'Non noté'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="no-note">Aucun détail</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentGrades;
