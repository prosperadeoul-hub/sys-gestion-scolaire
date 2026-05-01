import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  BookOpen, Clock, Award, TrendingUp, Calendar, User,
  GraduationCap, ChevronDown, ChevronUp, BarChart3, AlertCircle, CheckCircle
} from 'lucide-react';
import api from '../../api/axios';
import './StudentCourses.css';

const StudentCourses = () => {
  const { user, role } = useAuth();
  const [courses, setCourses] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCourse, setExpandedCourse] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      if (!role || role !== 'ETUDIANT') {
        setError("Accès refusé : Cette page est réservée aux étudiants.");
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('student/courses/');
        setCourses(response.data.cours || []);
        setStudentInfo(response.data.etudiant);
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

    fetchCourses();
  }, [user, role]);

  // Calculer les stats globales
  const globalStats = useMemo(() => {
    const totalCredits = courses.reduce((acc, c) => acc + (c.credits || 0), 0);
    const totalCoeff = courses.reduce((acc, c) => acc + (c.coefficient || 1), 0);
    const notesValides = courses.filter(c => c.moyenne !== null && c.moyenne !== undefined);
    const moyenneGenerale = notesValides.length > 0 
      ? notesValides.reduce((sum, c) => sum + c.moyenne * c.coefficient, 0) / totalCoeff
      : null;

    return {
      totalCredits,
      totalCourses: courses.length,
      moyenneGenerale: moyenneGenerale ? moyenneGenerale.toFixed(2) : null,
      coursCompletes: notesValides.length
    };
  }, [courses]);

  // Obtenir couleur catégorie
  const getCategoryColor = (cat) => {
    const colors = {
      'TECH': '#3b82f6',
      'SOFT': '#10b981',
      'LANG': '#f59e0b',
      'SCIE': '#8b5cf6'
    };
    return colors[cat] || '#6b7280';
  };

  // Obtenir badge statut note
  const getGradeBadge = (note) => {
    if (note === null || note === undefined) return { text: 'Non noté', class: 'badge-neutral' };
    if (note >= 16) return { text: 'Très Bien', class: 'badge-excellent' };
    if (note >= 14) return { text: 'Bien', class: 'badge-good' };
    if (note >= 10) return { text: 'Passable', class: 'badge-average' };
    return { text: 'Échec', class: 'badge-fail' };
  };

  const toggleCourseExpand = (courseId) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId);
  };

  if (loading) {
    return (
      <div className="student-courses-page">
        <div className="page-header">
          <div className="header-content">
            <h1><GraduationCap size={28} /> Mes Cours</h1>
          </div>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Chargement de vos cours...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-courses-page">
        <div className="page-header">
          <div className="header-content">
            <h1><GraduationCap size={28} /> Mes Cours</h1>
          </div>
        </div>
        <div className="error-container">
          <div className="error-message">
            <AlertCircle size={48} />
            <h3>Erreur de chargement</h3>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="student-courses-page">
      {/* Header avec profil étudiant */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-left">
            <h1>
              <GraduationCap size={32} />
              Mes Cours
            </h1>
            {studentInfo && (
              <div className="student-badges">
                <span className="badge-promo">
                  <BookOpen size={14} />
                  {studentInfo.promotion?.nom || studentInfo.promotion}
                </span>
                <span className="badge-matricule">
                  <Award size={14} />
                  {studentInfo.matricule}
                </span>
              </div>
            )}
          </div>
          
          {studentInfo?.moyenne_generale && (
            <div className="global-average">
              <div className="average-circle">
                <TrendingUp size={24} />
                <span className="average-value">{studentInfo.moyenne_generale}</span>
                <span className="average-label">/20</span>
              </div>
              <span className="average-text">Moyenne Générale</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats globales */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <BookOpen size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-number">{globalStats.totalCourses}</div>
            <div className="stat-label">Cours inscrits</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <Award size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-number">{globalStats.totalCredits}</div>
            <div className="stat-label">Credits</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <CheckCircle size={24} />
          </div>
          <div className="stat-details">
            <div className="stat-number">{globalStats.coursCompletes}/{globalStats.totalCourses}</div>
            <div className="stat-label">Avec notes</div>
          </div>
        </div>

        {globalStats.moyenneGenerale && (
          <div className={`stat-card highlight ${parseFloat(globalStats.moyenneGenerale) >= 10 ? 'good' : 'bad'}`}>
            <div className="stat-icon">
              <TrendingUp size={24} />
            </div>
            <div className="stat-details">
              <div className="stat-number">{globalStats.moyenneGenerale}/20</div>
              <div className="stat-label">Moyenne Générale</div>
            </div>
          </div>
        )}
      </div>

      {/* Liste des cours */}
      <div className="courses-section">
        <h2>
          <BarChart3 size={20} />
          Détail par matière
        </h2>

        {courses.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={64} />
            <h3>Aucun cours disponible</h3>
            <p>Vous n'êtes inscrit à aucun cours pour le moment.</p>
          </div>
        ) : (
          <div className="courses-list">
            {courses.map((course) => {
              const isExpanded = expandedCourse === course.id;
              const badge = getGradeBadge(course.moyenne);
              
              return (
                <div 
                  key={course.id} 
                  className={`course-item ${isExpanded ? 'expanded' : ''}`}
                >
                  <div className="course-main" onClick={() => toggleCourseExpand(course.id)}>
                    <div className="course-info">
                      <div 
                        className="category-indicator"
                        style={{ backgroundColor: getCategoryColor(course.categorie) }}
                      />
                      <div className="course-details">
                        <h3 className="course-name">
                          {course.nom}
                          <span className="course-code">{course.code}</span>
                        </h3>
                        <div className="course-meta">
                          <span className="meta-item">
                            <User size={14} />
                            {course.professeur?.nom || 'Prof. à définir'}
                          </span>
                          <span className="meta-item">
                            <Award size={14} />
                            Coef: {course.coefficient || 1}
                          </span>
                          <span className="meta-item">
                            <Clock size={14} />
                            {course.credits || 0} crédits
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="course-status">
                      {course.moyenne !== null && course.moyenne !== undefined ? (
                        <div className="grade-display">
                          <div className="grade-circle">
                            <span className={`grade-value ${course.moyenne >= 10 ? 'good' : 'bad'}`}>
                              {course.moyenne.toFixed(1)}
                            </span>
                            <span className="grade-max">/20</span>
                          </div>
                          <span className={`grade-badge ${badge.class}`}>
                            {badge.text}
                          </span>
                        </div>
                      ) : (
                        <div className="no-grade">
                          <AlertCircle size={20} />
                          <span>Non noté</span>
                        </div>
                      )}
                      
                      <button className="expand-btn">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Section examens (dépliable) */}
                  {isExpanded && course.examens && course.examens.length > 0 && (
                    <div className="exams-section">
                      <div className="exams-header">
                        <h4><Calendar size={16} /> Examens</h4>
                        <span className="exams-count">{course.examens.length} examen(s)</span>
                      </div>
                      <div className="exams-grid">
                        {course.examens.map((exam) => {
                          const examBadge = getGradeBadge(exam.note);
                          return (
                            <div key={exam.id} className="exam-card">
                              <div className="exam-header">
                                <h5>{exam.nom}</h5>
                                <span className={`exam-status-badge ${examBadge.class}`}>
                                  {examBadge.text}
                                </span>
                              </div>
                              <div className="exam-details">
                                <div className="exam-date">
                                  <Calendar size={14} />
                                  {new Date(exam.date).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                  })}
                                </div>
                                {exam.note !== null && (
                                  <div className="exam-note">
                                    <div className="note-circle">
                                      <span className={`note-value ${exam.note >= 10 ? 'good' : 'bad'}`}>
                                        {exam.note}
                                      </span>
                                      <span className="note-max">/20</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentCourses;
