import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Clock, ChevronLeft, ChevronRight, Printer, Download } from 'lucide-react';
import api from '../../api/axios';
import './StudentCourses.css';

const daysOrder = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const StudentSchedule = () => {
  const { role } = useAuth();
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState('week');

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!role || role !== 'ETUDIANT') {
        setError('Accès refusé : cette page est réservée aux étudiants.');
        setLoading(false);
        return;
      }

      try {
        const resp = await api.get('student/schedule/');
        if (resp.data.schedule) setSchedule(resp.data.schedule);
        else if (Array.isArray(resp.data)) {
          const map = {};
          resp.data.forEach((ev) => {
            const day = ev.jour || ev.day || 'Lundi';
            if (!map[day]) map[day] = [];
            map[day].push(ev);
          });
          setSchedule(map);
        } else setSchedule(resp.data || {});
      } catch (err) {
        console.error('Erreur fetch schedule', err);
        if (err.response && err.response.status === 404) {
          setError("Emploi du temps indisponible : endpoint backend '/student/schedule/' non trouvé.");
          setSchedule({
            Lundi: [{ heure_debut: '08:00', heure_fin: '10:00', matiere: 'Mathématiques', salle: 'A101', professeur: 'M. Dupont' }],
            Mardi: [{ heure_debut: '10:15', heure_fin: '12:00', matiere: 'Physique', salle: 'B202', professeur: 'Mme. Ndiaye' }],
            Mercredi: [],
            Jeudi: [],
            Vendredi: [],
            Samedi: [],
          });
        } else {
          setError('Impossible de charger l\'emploi du temps.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [role]);

  const handlePrevWeek = () => setWeekOffset((s) => s - 1);
  const handleNextWeek = () => setWeekOffset((s) => s + 1);
  const handlePrint = () => window.print();
  const handleExport = () => {
    const payload = { schedule };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule_week_${weekOffset || 'current'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const visibleDays = useMemo(() => daysOrder, [weekOffset]);

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Chargement de l'emploi du temps...</p>
    </div>
  );

  return (
    <div className="student-courses-page">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1><Calendar size={28} /> Emploi du temps</h1>
            <p className="muted">Vue hebdomadaire — consultez, imprimez ou exportez votre planning.</p>
          </div>

          <div className="schedule-toolbar">
            <div className="week-nav">
              <button className="icon-btn" onClick={handlePrevWeek}><ChevronLeft size={18} /></button>
              <div className="week-label">Semaine {weekOffset === 0 ? 'courante' : weekOffset}</div>
              <button className="icon-btn" onClick={handleNextWeek}><ChevronRight size={18} /></button>
            </div>

            <div className="view-actions">
              <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} className="view-select">
                <option value="week">Semaine</option>
                <option value="day">Jour</option>
              </select>
              <button className="action-outline" onClick={handleExport}><Download size={16} /> Export</button>
              <button className="action-primary" onClick={handlePrint}><Printer size={16} /> Imprimer</button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message" style={{ marginBottom: '1rem' }}>
          <strong>Info:</strong> {error}
        </div>
      )}

      <div className="content-section">
        <div className="schedule-grid">
          {visibleDays.map((day) => (
            <div key={day} className="schedule-day-card">
              <div className="schedule-day-header">{day}</div>
              <div className="schedule-day-body">
                {(schedule[day] && schedule[day].length > 0) ? (
                  schedule[day].map((ev, i) => (
                    <article key={i} className="schedule-event card-elevated">
                      <div className="event-left">
                        <div className="event-time"><Clock size={14} /> {ev.heure_debut || ev.start || '—'}</div>
                        <div className="event-duration">{ev.heure_fin || ev.end || '—'}</div>
                      </div>
                      <div className="event-main">
                        <div className="event-title">{ev.matiere || ev.nom || ev.cours || 'Cours'}</div>
                        <div className="event-meta">{ev.salle || ev.room || ''} {ev.professeur ? `• ${ev.professeur}` : ''}</div>
                      </div>
                      <div className="event-badge">{ev.type || ''}</div>
                    </article>
                  ))
                ) : (
                  <div className="no-event">Aucun cours</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentSchedule;
