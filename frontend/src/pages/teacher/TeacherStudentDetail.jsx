import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ChevronLeft } from 'lucide-react';
import api from '../../api/axios';
import '../../pages/student/StudentCourses.css';

const TeacherStudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [examens, setExamens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const resp = await api.get(`teacher/students/${id}/`);
        setStudent(resp.data.etudiant);
        const ex = (resp.data.examens || []).map(e => ({ ...e }));
        setExamens(ex);
      } catch (err) {
        console.error('Erreur student detail', err);
        setError('Impossible de charger le détail de l\'étudiant.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const updateNote = (examId, value) => {
    setExamens(prev => prev.map(e => e.id === examId ? { ...e, note: value } : e));
  };

  const save = async () => {
    const grades = examens.map(e => ({ exam_id: e.id, valeur: e.note }));
    try {
      await api.post(`teacher/students/${id}/`, { grades });
      alert('Notes sauvegardées');
      // refresh
      const resp = await api.get(`teacher/students/${id}/`);
      setExamens(resp.data.examens || []);
    } catch (err) {
      console.error('Erreur save student grades', err);
      alert('Erreur lors de la sauvegarde');
    }
  };

  if (loading) return <div className="loading-container">Chargement...</div>;
  if (error) return <div className="error-container">{error}</div>;

  return (
    <div className="student-courses-page">
      <div className="page-header">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="action-outline" onClick={() => navigate(-1)}><ChevronLeft size={18} /> Retour</button>
          <h1>Étudiant: {student?.nom} ({student?.matricule})</h1>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Matière</th>
              <th>Examen</th>
              <th>Date</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {examens.map(e => (
              <tr key={e.id}>
                <td>{e.matiere?.nom}</td>
                <td>{e.nom}</td>
                <td>{e.date}</td>
                <td>
                  <input type="number" min="0" max="20" step="0.01" value={e.note ?? ''} onChange={(ev) => updateNote(e.id, ev.target.value === '' ? null : Number(ev.target.value))} style={{ width: '90px' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <button className="action-primary" onClick={save}><Save size={14} /> Sauvegarder</button>
      </div>
    </div>
  );
};

export default TeacherStudentDetail;
