import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Clock, Award, TrendingUp, Calendar, User } from 'lucide-react';
import api from '../../api/axios';
import './StudentCourses.css';

const StudentCourses = () => {
  const { user, role } = useAuth();
  const [courses, setCourses] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      console.log("Utilisateur connecté:", user);
      console.log("Rôle de l'utilisateur:", role);

      if (!role || role !== 'ETUDIANT') {
        console.error("Accès refusé : Cette page est réservée aux étudiants. Rôle actuel:", role);
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
          console.error(`Erreur ${error.response.status}:`, error.response.data);
          if (error.response.status === 403) {
            setError("Accès refusé : Vérifiez que vous êtes connecté en tant qu'étudiant");
          } else {
            setError(`Erreur ${error.response.status}: ${error.response.data?.detail || 'Erreur inconnue'}`);
          }
        } else {
          console.error("Erreur réseau:", error.message);
          setError("Erreur de connexion au serveur");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user, role]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement de vos cours...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h2>⚠️ Erreur</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-courses-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Mes Cours</h1>
          {studentInfo && (
            <div className="student-info">
              <div className="info-item">
                <User size={18} />
                <span>{studentInfo.nom}</span>
              </div>
              <div className="info-item">
                <Award size={18} />
                <span>{studentInfo.matricule}</span>
              </div>
               <div className="info-item">
                 <BookOpen size={18} />
                 <span>{studentInfo.promotion?.nom || studentInfo.promotion}</span>
               </div>
            </div>
          )}
        </div>
      </div>

      {studentInfo?.moyenne_generale && (
        <div className="stats-cards">
          <div className="stat-card highlight">
            <div className="stat-icon">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <h3>Moyenne Générale</h3>
              <p className="stat-value">{studentInfo.moyenne_generale}/20</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <BookOpen size={24} />
            </div>
            <div className="stat-content">
              <h3>Total Cours</h3>
              <p className="stat-value">{courses.length}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Award size={24} />
            </div>
            <div className="stat-content">
              <h3>Credits</h3>
              <p className="stat-value">
                {courses.reduce((acc, course) => acc + (course.credits || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="courses-grid">
        {courses.map((course) => (
          <div 
            key={course.id} 
            className={`course-card ${selectedCourse?.id === course.id ? 'selected' : ''}`}
            onClick={() => setSelectedCourse(selectedCourse?.id === course.id ? null : course)}
          >
            <div className="course-header">
              <div className="course-badge">{course.categorie}</div>
              <div className="course-code">{course.code}</div>
            </div>
            
            <h3 className="course-title">{course.nom}</h3>
            
            {course.professeur && (
              <div className="course-prof">
                <User size={16} />
                <span>{course.professeur.nom}</span>
              </div>
            )}
            
            <div className="course-stats">
              <div className="stat-item">
                <Award size={16} />
                <span>Coef: {course.coefficient}</span>
              </div>
              {course.credits && (
                <div className="stat-item">
                  <Clock size={16} />
                  <span>{course.credits} crédits</span>
                </div>
              )}
            </div>

            {course.moyenne !== null && (
              <div className={`course-grade ${course.moyenne >= 10 ? 'good' : course.moyenne >= 8 ? 'medium' : 'bad'}`}>
                <span className="grade-label">Moyenne</span>
                <span className="grade-value">{course.moyenne}/20</span>
              </div>
            )}

            {selectedCourse?.id === course.id && course.examens && course.examens.length > 0 && (
              <div className="examens-details">
                <h4>Examens & Notes</h4>
                <div className="examens-list">
                  {course.examens.map((examen) => (
                    <div key={examen.id} className="examen-item">
                      <div className="examen-info">
                        <span className="examen-name">{examen.nom}</span>
                        <span className="examen-date">
                          <Calendar size={14} />
                          {new Date(examen.date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div className="examen-grade">
                        {examen.note !== null ? (
                          <span className={`note ${examen.note >= 10 ? 'good' : 'bad'}`}>
                            {examen.note}/20
                          </span>
                        ) : (
                          <span className="no-note">Non noté</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="no-courses">
          <BookOpen size={64} />
          <h2>Aucun cours disponible</h2>
          <p>Vous n'êtes inscrit à aucun cours pour le moment.</p>
        </div>
      )}
    </div>
  );
};

export default StudentCourses;
