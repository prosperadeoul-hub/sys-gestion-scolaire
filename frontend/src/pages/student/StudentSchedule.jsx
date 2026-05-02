import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import { 
  Calendar, Clock, MapPin, User, BookOpen, ChevronLeft, ChevronRight, 
  LayoutGrid, CalendarDays, TrendingUp
} from 'lucide-react';
import { startOfWeek, addWeeks, addDays, format, isToday, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import './StudentSchedule.css';

const StudentSchedule = () => {
  const { user, role } = useAuth();
  const [schedule, setSchedule] = useState({});
  const [timeSlots, setTimeSlots] = useState([]);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ totalCourses: 0, daysWithClasses: 0 });
  
  // View state
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'day'
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState(null);
  const daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  useEffect(() => {
    const fetchSchedule = async () => {
      // 1. Vérifications de sécurité avant l'appel
      if (!role) return;
      
      if (role !== 'ETUDIANT') {
        setError("Accès refusé : Cette page est réservée aux étudiants.");
        setLoading(false);
        return;
      }

      try {
        console.log("Tentative de récupération de l'emploi du temps...");
        const response = await api.get('student/schedule/');
        
        // Extraction sécurisée des données
        const data = response.data || {};
        const scheduleData = data.schedule || {};
        const timeSlotsData = data.time_slots || [];
        const daysData = data.days || [];

        // 2. Mise à jour des states de base
        setSchedule(scheduleData);
        setTimeSlots(timeSlotsData);
        setDays(daysData);

        // 3. Calcul des statistiques de manière robuste
        const daysKeys = Object.keys(scheduleData);
        const activeDaysCount = daysKeys.filter(day => {
          const slots = scheduleData[day] || {};
          return Object.values(slots).some(course => course !== null);
        }).length;

        setStats({
          totalCourses: data.total_courses || 0,
          daysWithClasses: activeDaysCount
        });

        // 4. Détermination du premier jour à afficher
        // On utilise daysOfWeek défini dans ton composant
        const firstDayWithClass = daysOfWeek.find(day => {
          const slots = scheduleData[day] || {};
          return Object.values(slots).some(c => c !== null);
        }) || 'Lundi';
        
        setSelectedDay(firstDayWithClass);
        setError(''); // Efface les erreurs précédentes en cas de succès

      } catch (err) {
        // 5. Debugging précis dans la console
        console.error("Erreur détaillée lors du fetchSchedule:", err);

        if (err.response) {
          // Erreur provenant du serveur (401, 403, 404, 500)
          const status = err.response.status;
          const detail = err.response.data?.detail || "Erreur serveur";
          
          if (status === 403) {
            setError("Accès refusé : Vous n'avez pas les droits nécessaires.");
          } else if (status === 401) {
            setError("Session expirée : Veuillez vous reconnecter.");
          } else {
            setError(`Erreur ${status}: ${detail}`);
          }
        } else if (err.request) {
          // La requête a été envoyée mais pas de réponse (CORS ou serveur éteint)
          setError("Le serveur ne répond pas. Vérifiez que Django est lancé.");
        } else {
          // Erreur de logique JavaScript dans le bloc try
          setError(`Erreur d'exécution : ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [role]); // On ne redéclenche que si le rôle change

  const getDaySchedule = (day) => {
    return schedule[day] || {};
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

  // Get courses for a specific day based on current week
  const getWeekCours = () => {
    return daysOfWeek.map(dayName => ({
      dayName,
      date: addDays(currentWeekStart, daysOfWeek.indexOf(dayName)),
      cours: Object.values(getDaySchedule(dayName) || {}).filter(c => c !== null)
    }));
  };

  const weekData = getWeekCours();

  const handlePrevWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, -1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const handleToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
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
          <h2>Erreur</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="schedule-container">
      {/* Header */}
      <div className="schedule-header">
        <div className="header-info">
          <h1>
            <Calendar size={28} />
            Emploi du Temps
          </h1>
          <p className="subtitle">Consultez votre planning hebdomadaire</p>
        </div>

        {/* View toggle */}
        <div className="view-toggle">
          <button
            className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            <LayoutGrid size={16} />
            Semaine
          </button>
          <button
            className={`view-btn ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
          >
            <CalendarDays size={16} />
            Jour
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <BookOpen size={20} />
          <span>{stats.totalCourses} cours ce semestre</span>
        </div>
        <div className="stat-card">
          <TrendingUp size={20} />
          <span>{stats.daysWithClasses} jours avec cours</span>
        </div>
        <div className="stat-card">
          <Calendar size={20} />
          <span>{days.length} jours programmés</span>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="week-controls">
        <div className="nav-controls">
          <button className="nav-btn" onClick={handlePrevWeek}>
            <ChevronLeft size={20} />
            Semaine précédente
          </button>
          <span className="current-week">
            Semaine du {format(currentWeekStart, 'dd MMM', { locale: fr })} - {format(addDays(currentWeekStart, 6), 'dd MMM yyyy', { locale: fr })}
          </span>
          <button className="nav-btn" onClick={handleNextWeek}>
            Semaine suivante
            <ChevronRight size={20} />
          </button>
        </div>
        <button className="today-btn" onClick={handleToday}>
          Aujourd'hui
        </button>
      </div>

      {/* Week Grid View */}
      {viewMode === 'week' && days.length > 0 && (
        <div className="week-view">
          <div className="timetable-wrapper">
            <div className="time-column-header">Heure</div>
            {weekData.map((dayData) => {
              const today = new Date();
              const isCurrentDay = isSameDay(dayData.date, today);
              return (
                <div 
                  key={dayData.dayName} 
                  className={`day-header-col ${isCurrentDay ? 'today' : ''} ${selectedDay === dayData.dayName ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedDay(dayData.dayName);
                    setViewMode('day');
                  }}
                >
                  <div className="day-header-content">
                    <div className="day-name">{dayData.dayName.substring(0, 3)}</div>
                    <div className="day-date">
                      {format(dayData.date, 'dd/MM')}
                    </div>
                    {dayData.cours.length > 0 && (
                      <span className="day-count-badge">{dayData.cours.length} cours</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Time slots rows */}
            {timeSlots.map((slot) => {
              const slotParts = slot.split(' - ');
              const start = slotParts[0];
              const end = slotParts[1];
              console.log("Slot actuel:", slot);
              console.log("Données du jour Lundi:", getDaySchedule('Lundi')[slot]);
              
              return (
                <div key={slot} className="grid-row">
                  <div className="time-label">
                    <Clock size={14} />
                    <span>{slot}</span>
                  </div>
                  {weekData.map((dayData) => {
                    // Remplace ton bloc dayCours par celui-ci :
                    const dayCours = dayData.cours.filter(c => {
                      if (!c.heure_debut || !c.heure_fin) return false;

                      // On nettoie et on ne garde que HH:MM
                      const courseStart = c.heure_debut.trim().substring(0, 5);
                      const courseEnd = c.heure_fin.trim().substring(0, 5);
                      
                      const slotStart = start.trim().substring(0, 5);
                      const slotEnd = end.trim().substring(0, 5);

                      return courseStart === slotStart && courseEnd === slotEnd;
                    });
                    
                    return (
                      <div 
                        key={`${dayData.dayName}-${slot}`} 
                        className={`grid-cell ${dayCours.length > 0 ? 'occupied' : 'empty'} ${selectedDay === dayData.dayName ? 'selected-day' : ''}`}
                        style={dayCours.length > 0 ? { backgroundColor: getCategoryColor(dayCours[0].categorie) } : {}}
                      >
                        {dayCours.length > 0 && dayCours.map(cour => (
                          <div 
                            key={cour.id}
                            className="mini-course"
                            style={{ 
                              backgroundColor: getCategoryColor(cour.categorie),
                              color: 'white'
                            }}
                          >
                            <div className="mini-course-code">{cour.code}</div>
                            <div className="mini-course-name">{cour.matiere.substring(0, 18)}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day Detail View */}
      {viewMode === 'day' && selectedDay && (
        <div className="day-view">
          <div className="day-view-header">
            <button 
              className="back-to-week-btn"
              onClick={() => setViewMode('week')}
            >
              <ChevronLeft size={18} />
              Retour à la semaine
            </button>
            <h2>
              {selectedDay}
              <span className="day-badge">
                {Object.values(getDaySchedule(selectedDay)).filter(c => c !== null).length} cours
              </span>
            </h2>
          </div>

          {timeSlots.length > 0 ? (
            <div className="day-slots">
              {timeSlots.map((slot) => {
                const course = getDaySchedule(selectedDay)[slot];
                {/* À supprimer après le test */}
                <pre style={{fontSize: '10px', backgroundColor: '#eee', padding: '10px'}}>
                  {JSON.stringify(schedule, null, 2)}
                </pre>
                return (
                  <div key={slot} className={`day-slot-row ${course ? 'has-course' : 'free'}`}>
                    <div className="slot-time-label">
                      <Clock size={16} />
                      <span>{slot}</span>
                    </div>
                    <div className="slot-content">
                      {course ? (
                        <div className="course-card">
                          <div 
                            className="course-accent"
                            style={{ backgroundColor: getCategoryColor(course.categorie) }}
                          />
                          <div className="course-main">
                            <div className="course-header-row">
                              <div className="course-badge">{course.code}</div>
                              <h3>{course.matiere}</h3>
                            </div>
                            <div className="course-meta-row">
                              <span className="meta-item">
                                <User size={14} />
                                {course.professeur}
                              </span>
                              <span className="meta-item">
                                <MapPin size={14} />
                                {course.salle}
                              </span>
                            </div>
                            <div className="course-time-badge">
                              {course.heure_debut} - {course.heure_fin}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="free-slot-content">
                          <span className="free-icon">+</span>
                          <span>Créneau libre</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <CalendarDays size={48} />
              <p>Aucun créneau horaire défini</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentSchedule;
