import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, ChevronLeft, ChevronRight, BookOpen, Award, Clock, X, Save, Calendar as CalendarIcon, TrendingUp } from 'lucide-react';
import api from '../../api/axios';
import './TeacherStudents.css';

const ITEMS_PER_PAGE = 10;

const TeacherStudents = () => {
  const navigate = useNavigate();
  
  // États principaux
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPromotionId, setSelectedPromotionId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  
  // Modal détails étudiant
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentExamens, setStudentExamens] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.get('teacher/courses/');
      const fetchedCourses = resp.data.cours || [];
      setCourses(fetchedCourses);
      
      // Extraire tous les étudiants uniques
      const studentsMap = new Map();
      fetchedCourses.forEach(course => {
        (course.students || []).forEach(student => {
          if (!studentsMap.has(student.id)) {
            studentsMap.set(student.id, {
              ...student,
              courses: [],
              promotions: new Set()
            });
          }
          const entry = studentsMap.get(student.id);
          entry.courses.push({
            id: course.id,
            nom: course.nom,
            code: course.code
          });
          (course.promotions || []).forEach(p => entry.promotions.add(p));
        });
      });
      
      const uniqueStudents = Array.from(studentsMap.values()).map(s => ({
        ...s,
        promotions: Array.from(s.promotions)
      }));
      
      setStudents(uniqueStudents);
    } catch (err) {
      console.error('Erreur teacher students', err);
      setError('Impossible de charger la liste des étudiants.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Extraire toutes les promotions uniques
  const allPromotions = useMemo(() => {
    const set = new Set();
    students.forEach(s => {
      (s.promotions || []).forEach(p => set.add(p));
    });
    return Array.from(set);
  }, [students]);

  // Filtrer les étudiants
  const filteredStudents = useMemo(() => {
    let result = [...students];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.nom?.toLowerCase().includes(term) ||
        s.matricule?.toLowerCase().includes(term)
      );
    }
    
    if (selectedPromotionId) {
      result = result.filter(s => 
        s.promotions?.some(p => p.id === selectedPromotionId)
      );
    }
    
    if (selectedCourseId) {
      result = result.filter(s => 
        s.courses?.some(c => c.id === selectedCourseId)
      );
    }
    
    return result;
  }, [students, searchTerm, selectedPromotionId, selectedCourseId]);

  // Trier par nom
  const sortedStudents = useMemo(() => {
    return filteredStudents.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
  }, [filteredStudents]);

  // Pagination
  const totalPages = Math.ceil(sortedStudents.length / pageSize);
  const paginatedStudents = sortedStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Ouvrir modal et charger détails
  const openStudentDetail = async (student) => {
    setSelectedStudent(student);
    setDetailError('');
    setStudentExamens([]);
    setLoadingDetail(true);
    
    try {
      const resp = await api.get(`teacher/students/${student.id}/`);
      setStudentExamens(resp.data.examens || []);
    } catch (err) {
      console.error('Erreur chargement détails', err);
      setDetailError('Impossible de charger les notes de l\'étudiant.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeModal = () => {
    setSelectedStudent(null);
    setStudentExamens([]);
    setDetailError('');
    setSuccessMessage('');
  };

  // Grouper les examens par matière
  const examsByMatiere = useMemo(() => {
    const map = new Map();
    studentExamens.forEach(ex => {
      const matiereId = ex.matiere?.id || 'unknown';
      if (!map.has(matiereId)) {
        map.set(matiereId, {
          matiere: ex.matiere,
          examens: []
        });
      }
      map.get(matiereId).examens.push(ex);
    });
    return Array.from(map.values());
  }, [studentExamens]);

  // Calculer moyenne générale
  const moyenneGenerale = useMemo(() => {
    const allNotes = studentExamens.filter(e => e.note !== null).map(e => e.note);
    if (allNotes.length === 0) return null;
    return (allNotes.reduce((a, b) => a + b, 0) / allNotes.length).toFixed(2);
  }, [studentExamens]);

  // Mettre à jour une note
  const updateNote = (examId, value) => {
    setStudentExamens(prev => prev.map(e => 
      e.id === examId 
        ? { ...e, note: value === '' ? null : Number(value) }
        : e
    ));
  };

  // Sauvegarder toutes les notes
  const saveAllGrades = async () => {
    if (!selectedStudent) return;
    
    setSavingNotes(true);
    setDetailError('');
    setSuccessMessage('');
    
    try {
      const grades = studentExamens.map(e => ({
        exam_id: e.id,
        valeur: e.note
      }));
      
      await api.post(`teacher/students/${selectedStudent.id}/`, { grades });
      setSuccessMessage('Notes sauvegardées avec succès');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Recharger les détails
      const resp = await api.get(`teacher/students/${selectedStudent.id}/`);
      setStudentExamens(resp.data.examens || []);
    } catch (err) {
      console.error('Erreur save grades', err);
      setDetailError(err.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSavingNotes(false);
    }
  };

  // Obtenir classe de note pour style
  const getGradeClass = (note) => {
    if (note === null || note === undefined || note === '') return 'grade-empty';
    const n = parseFloat(note);
    if (n >= 14) return 'grade-excellent';
    if (n >= 10) return 'grade-good';
    if (n >= 8) return 'grade-average';
    return 'grade-poor';
  };

  const getGradeLabel = (note) => {
    if (note === null || note === undefined || note === '') return 'Non noté';
    const n = parseFloat(note);
    if (n >= 14) return 'Très bien';
    if (n >= 10) return 'Admissible';
    if (n >= 8) return 'Passable';
    return 'Échec';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des étudiants...</p>
      </div>
    );
  }

  if (error && students.length === 0) {
    return (
      <div className="error-container">
        <div className="error-message">
          <Award size={48} />
          <h3>Erreur</h3>
          <p>{error}</p>
          <button className="btn-retry" onClick={fetchData}>Réessayer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-students-page">
      <div className="page-header">
        <div className="header-content">
          <h1><Users size={28} /> Mes Étudiants</h1>
          <p>Consultez la liste de vos étudiants et leurs performances.</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="management-header">
        <div className="filters-group">
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="Rechercher par nom ou matricule..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          
          <select 
            value={selectedPromotionId} 
            onChange={(e) => { setSelectedPromotionId(e.target.value); setCurrentPage(1); }}
          >
            <option value="">Toutes promotions</option>
            {allPromotions.map(p => (
              <option key={p.id} value={p.id}>{p.nom} ({p.annee})</option>
            ))}
          </select>

          <select 
            value={selectedCourseId || ''} 
            onChange={(e) => { setSelectedCourseId(e.target.value); setCurrentPage(1); }}
          >
            <option value="">Tous les cours</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.nom} ({c.code})</option>
            ))}
          </select>
        </div>

        <div className="actions-group">
          <select 
            value={pageSize} 
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="page-size-select"
          >
            <option value={5}>5 par page</option>
            <option value={10}>10 par page</option>
            <option value={25}>25 par page</option>
            <option value={50}>50 par page</option>
          </select>
        </div>
      </div>

      {/* Résultats */}
      <div className="students-section">
        <div className="results-info">
          <span>{sortedStudents.length} étudiant{sortedStudents.length !== 1 ? 's' : ''} trouvé{sortedStudents.length !== 1 ? 's' : ''}</span>
        </div>

        {sortedStudents.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <p>Aucun étudiant trouvé</p>
          </div>
        ) : (
          <>
            <div className="students-table-wrapper">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>Étudiant</th>
                    <th>Matricule</th>
                    <th>Promotions</th>
                    <th>Cours suivis</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map(student => (
                    <tr key={student.id}>
                      <td>
                        <div className="student-cell">
                          <div className="student-avatar-sm">
                            {(student.nom || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="student-name">{student.nom}</span>
                        </div>
                      </td>
                      <td className="matricule-cell">{student.matricule}</td>
                      <td>
                        <div className="promotions-tags">
                          {(student.promotions || []).slice(0, 2).map(p => (
                            <span key={p.id} className="mini-promo">{p.nom}</span>
                          ))}
                          {(student.promotions || []).length > 2 && (
                            <span className="more-count">+{student.promotions.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="courses-count">
                          <BookOpen size={14} />
                          {student.courses?.length || 0} cours
                        </div>
                      </td>
                      <td>
                        <button 
                          className="btn-view"
                          onClick={() => openStudentDetail(student)}
                        >
                          Voir détails
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} /> Précédent
                </button>
                <div className="page-info">
                  Page {currentPage} / {totalPages}
                  <span className="total-items">({sortedStudents.length} étudiants)</span>
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Suivant <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Détails Étudiant */}
      {selectedStudent && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="student-profile-mini">
                <div className="avatar-large">
                  {(selectedStudent.nom || '?').charAt(0).toUpperCase()}
                </div>
                <div className="profile-info-mini">
                  <h2>{selectedStudent.nom}</h2>
                  <p className="matricule-mini">Matricule: <strong>{selectedStudent.matricule}</strong></p>
                  <div className="promotions-list-mini">
                    {(selectedStudent.promotions || []).map(p => (
                      <span key={p.id} className="promo-badge-mini">{p.nom} ({p.annee})</span>
                    ))}
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={closeModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              {/* Messages */}
              {successMessage && (
                <div className="alert alert-success">
                  <TrendingUp size={18} />
                  {successMessage}
                </div>
              )}
              {detailError && (
                <div className="alert alert-error">
                  <Award size={18} />
                  {detailError}
                </div>
              )}

              {/* Stats rapides */}
              <div className="quick-stats-modal">
                <div className="stat-card-mini">
                  <BookOpen size={20} />
                  <div>
                    <div className="value-mini">{selectedStudent.courses?.length || 0}</div>
                    <div className="label-mini">Cours</div>
                  </div>
                </div>
                <div className="stat-card-mini">
                  <CalendarIcon size={20} />
                  <div>
                    <div className="value-mini">{examsByMatiere.length}</div>
                    <div className="label-mini">Matières</div>
                  </div>
                </div>
                <div className="stat-card-mini highlight">
                  <Award size={20} />
                  <div>
                    <div className="value-mini">
                      {moyenneGenerale ? `${moyenneGenerale}/20` : 'Non noté'}
                    </div>
                    <div className="label-mini">Moyenne</div>
                  </div>
                </div>
              </div>

              {/* Notes par matière */}
              <div className="grades-section-modal">
                <div className="section-header-modal">
                  <h3>Notes par matière</h3>
                  <button 
                    className="btn-save-modal"
                    onClick={saveAllGrades}
                    disabled={savingNotes}
                  >
                    <Save size={14} />
                    {savingNotes ? 'Sauvegarde...' : 'Tout sauvegarder'}
                  </button>
                </div>

                {loadingDetail ? (
                  <div className="loading-state-modal">
                    <div className="loading-spinner-small"></div>
                    <p>Chargement des notes...</p>
                  </div>
                ) : examsByMatiere.length === 0 ? (
                  <div className="empty-state-modal">
                    <BookOpen size={40} />
                    <p>Aucun examen pour cet étudiant</p>
                  </div>
                ) : (
                  <div className="grades-grid-modal">
                    {examsByMatiere.map(group => {
                      const moyenne = getMoyenneMatiere(group.examens);
                      
                      return (
                        <div key={group.matiere.id} className="course-card-modal">
                          <div className="course-header-modal">
                            <div className="course-info-modal">
                              <h4>{group.matiere.nom}</h4>
                              {group.matiere.code && (
                                <span className="course-code-mini">{group.matiere.code}</span>
                              )}
                            </div>
                            {moyenne !== null && (
                              <div className={`moyenne-mini ${parseFloat(moyenne) >= 10 ? 'good' : 'bad'}`}>
                                <TrendingUp size={12} />
                                {moyenne}/20
                              </div>
                            )}
                          </div>

                          <div className="exams-list-modal">
                            {group.examens.map(exam => {
                              const gradeClass = getGradeClass(exam.note);
                              const gradeLabel = getGradeLabel(exam.note);
                              
                              return (
                                <div key={exam.id} className="exam-row-modal">
                                  <div className="exam-info-modal">
                                    <span className="exam-name-mini">{exam.nom}</span>
                                    <span className="exam-date-mini">
                                      <CalendarIcon size={12} />
                                      {exam.date || 'Date non définie'}
                                    </span>
                                  </div>
                                  <div className="exam-note-modal">
                                    <input
                                      type="number"
                                      min="0"
                                      max="20"
                                      step="0.25"
                                      value={exam.note ?? ''}
                                      onChange={(e) => updateNote(exam.id, e.target.value)}
                                      className={`note-input-modal ${gradeClass}`}
                                      placeholder="—"
                                    />
                                    {exam.note !== null && exam.note !== '' && (
                                      <span className={`grade-badge ${gradeClass}`}>
                                        {gradeLabel}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions
const getMoyenneMatiere = (exams) => {
  const notes = exams.filter(e => e.note !== null).map(e => e.note);
  if (notes.length === 0) return null;
  const sum = notes.reduce((a, b) => a + b, 0);
  return (sum / notes.length).toFixed(2);
};

export default TeacherStudents;
