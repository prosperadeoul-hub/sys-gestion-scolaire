import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import { Calendar, Clock, MapPin, User, BookOpen, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import './StudentSchedule.css';

const StudentSchedule = () => {
  const { user, role } = useAuth();
  const [schedule, setSchedule] = useState({});
  const [timeSlots, setTimeSlots] = useState([]);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState('Lundi');
  const [stats, setStats] = useState({ totalCourses: 0, daysWithClasses: 0 });

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!role || role !== 'ETUDIANT') {
        setError("Accès refusé : Cette page est réservée aux étudiants.");
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('student/schedule/');
        setSchedule(response.data.schedule || {});
        setTimeSlots(response.data.time_slots || []);
        setDays(response.data.days || []);
        setStats({
          totalCourses: response.data.total_courses || 0,
          daysWithClasses: Object.keys(response.data.schedule || {}).filter(
            day => (response.data.schedule[day] || []).some(course => course !== null)
          ).length
        });
      } catch (error) {
        if (error.response) {
          if (error.response.status === 403) {
            setError("Accès refusé : Vérifiez que vous êtes connecté en tant qu'étudiant");
          } else {
            setError(`Erreur ${error.response.status}: ${error.response.data?.detail || 'Erreur inconnue'}`);
          }
        } else {
          setError("Erreur de connexion au serveur");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [role]);

  const getDaySchedule = (day) => {
    return schedule[day] || {};
  };

  const hasClassesOnDay = (day) => {
    const daySchedule = getDaySchedule(day);
    return Object.values(daySchedule).some(course => course !== null);
  };

  const getCategoryColor = (categorie) => {
    const colors = {
      'TECH': '#3b82f6',
      'SOFT': '#10b981',
      'LANG': '#f59e0b',
      'SCIE': '#8b5cf6',
    };
    return colors[categorie] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="schedule-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement de l'emploi du temps...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="schedule-container">
        <div className="error-state">
          <h2>⚠️ Erreur</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <div className="header-info">
          <h1>
            <Calendar size={28} />
            Emploi du Temps
          </h1>
          <p className="subtitle">Votre calendrier hebdomadaire</p>
        </div>
        
        <div className="week-navigation">
          <button className="nav-btn" onClick={() => {
            const idx = days.indexOf(selectedDay);
            setSelectedDay(days[(idx - 1 + days.length) % days.length]);
          }}>
            <ChevronLeft size={20} />
          </button>
          <span className="current-day">{selectedDay}</span>
          <button className="nav-btn" onClick={() => {
            const idx = days.indexOf(selectedDay);
            setSelectedDay(days[(idx + 1) % days.length]);
          }}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="schedule-stats">
        <div className="stat-item">
          <BookOpen size={20} />
          <span>{stats.totalCourses} cours this week</span>
        </div>
        <div className="stat-item">
          <TrendingUp size={20} />
          <span>{stats.daysWithClasses} jours de cours</span>
        </div>
      </div>

      {/* Vue journalière détaillée */}
      <div className="day-schedule-view">
        <h2 className="day-title">
          {selectedDay}
          <span className="day-count">
            {Object.values(getDaySchedule(selectedDay)).filter(c => c !== null).length} cours
          </span>
        </h2>

        {timeSlots.length > 0 ? (
          <div className="time-slots">
            {timeSlots.map((slot, idx) => {
              const course = getDaySchedule(selectedDay)[slot];
              return (
                <div key={slot} className={`time-slot ${course ? 'has-course' : 'free'}`}>
                  <div className="slot-time">
                    <Clock size={16} />
                    <span>{slot}</span>
                  </div>
                  <div className="slot-content">
                    {course ? (
                      <div className="course-slot">
                        <div 
                          className="course-header"
                          style={{ borderLeftColor: getCategoryColor(course.categorie) }}
                        >
                          <div className="course-code-badge">{course.code}</div>
                          <h3>{course.matiere}</h3>
                          <div className="course-meta">
                            <span className="professor">
                              <User size={14} />
                              {course.professeur}
                            </span>
                            <span className="room">
                              <MapPin size={14} />
                              {course.salle}
                            </span>
                          </div>
                          <div className="course-times">
                            <span>{course.heure_debut} - {course.heure_fin}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="free-slot">
                        <span className="free-label">Créneau libre</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-slots">
            <p>Aucun créneau horaire défini</p>
          </div>
        )}
      </div>

      {/* Vue semaine complète (optionnel - pour écrans larges) */}
      {days.length > 0 && (
        <div className="week-grid-container">
          <h2 className="section-title">Vue Hebdomadaire</h2>
          <div className="week-grid">
            <div className="grid-header">
              <div className="time-column-header">Heure</div>
              {days.map(day => (
                <div 
                  key={day} 
                  className={`day-header ${selectedDay === day ? 'active' : ''}`}
                  onClick={() => setSelectedDay(day)}
                >
                  {day.substring(0, 3)}
                </div>
              ))}
            </div>

            <div className="grid-body">
              {timeSlots.map(slot => (
                <div key={slot} className="grid-row">
                  <div className="time-label">{slot}</div>
                  {days.map(day => {
                    const course = schedule[day]?.[slot];
                    return (
                      <div 
                        key={`${day}-${slot}`} 
                        className={`grid-cell ${course ? 'occupied' : 'empty'} ${selectedDay === day ? 'selected-day' : ''}`}
                        style={course ? { backgroundColor: getCategoryColor(course.categorie) + '15' } : {}}
                      >
                        {course && (
                          <div 
                            className="mini-course"
                            style={{ borderLeftColor: getCategoryColor(course.categorie) }}
                          >
                            <div className="mini-course-code">{course.code}</div>
                            <div className="mini-course-name">{course.matiere.substring(0, 15)}...</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentSchedule;
