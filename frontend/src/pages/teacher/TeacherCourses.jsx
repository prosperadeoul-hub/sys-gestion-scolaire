import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Users, FileText, Search, Save, Download, Printer, ChevronLeft, ChevronRight, Plus, Edit, Trash2, Calendar, Clock, AlertCircle, CheckCircle, X, BarChart3 } from 'lucide-react';
import api from '../../api/axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './TeacherCourses.css';

const ITEMS_PER_PAGE = 10;

const TeacherCourses = () => {
  const { user, role } = useAuth();
  
  // États principaux
  const [courses, setCourses] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPromotionId, setSelectedPromotionId] = useState('');
  const [selectedMatiereId, setSelectedMatiereId] = useState('');
  
  // Sélection courante
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  
  // Notes
  const [gradesState, setGradesState] = useState({});
  const [savingGrades, setSavingGrades] = useState(false);
  
  // Pagination pour les cours
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  
  // Tri
  const [sortBy, setSortBy] = useState('nom');
  const [sortDir, setSortDir] = useState('asc');
  
  // Modal examen
  const [showExamModal, setShowExamModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [examForm, setExamForm] = useState({ nom: '', date: '' });

  // Charger les données
  const fetchData = useCallback(async () => {
    if (!role || role !== 'ENSEIGNANT') {
      setError("Accès refusé : cette page est réservée aux enseignants.");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = {};
      if (selectedPromotionId) params.promotion_id = selectedPromotionId;
      if (selectedMatiereId) params.matiere_id = selectedMatiereId;
      
      const resp = await api.get('teacher/courses/', { params });
      const fetched = resp.data.cours || [];
      const filters = resp.data.filters || {};
      
      setCourses(fetched);
      setPromotions(filters.promotions || []);
      setMatieres(filters.matieres || []);
      
      if (fetched.length > 0 && !selectedCourseId) {
        setSelectedCourseId(fetched[0].id);
      }
      
      // Initialiser les grades state
      const grades = {};
      fetched.forEach(c => {
        (c.examens || []).forEach(ex => {
          grades[ex.id] = {};
          (c.students || []).forEach(s => {
            const noteEntry = s.examens && s.examens.find(se => String(se.id) === String(ex.id));
            grades[ex.id][s.id] = noteEntry && noteEntry.note != null ? noteEntry.note : '';
          });
        });
      });
      setGradesState(grades);
    } catch (err) {
      console.error('Erreur teacher courses', err);
      setError('Impossible de charger les cours assignés.');
    } finally {
      setLoading(false);
    }
  }, [role, selectedPromotionId, selectedMatiereId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtrer et trier les cours
  const filteredAndSortedCourses = useMemo(() => {
    let result = [...courses];
    
    // Filtre recherche
    if (searchTerm) {
      result = result.filter(c => 
        c.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Tri
    result.sort((a, b) => {
      let A, B;
      if (sortBy === 'nom') {
        A = (a.nom || '').toLowerCase();
        B = (b.nom || '').toLowerCase();
      } else if (sortBy === 'code') {
        A = (a.code || '').toLowerCase();
        B = (b.code || '').toLowerCase();
      } else if (sortBy === 'students') {
        A = a.students?.length || 0;
        B = b.students?.length || 0;
      } else if (sortBy === 'exams') {
        A = a.examens?.length || 0;
        B = b.examens?.length || 0;
      }
      
      if (A < B) return sortDir === 'asc' ? -1 : 1;
      if (A > B) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [courses, searchTerm, sortBy, sortDir]);

  // Pagination des cours
  const totalPages = Math.ceil(filteredAndSortedCourses.length / pageSize);
  const paginatedCourses = filteredAndSortedCourses.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Sélection du cours actuel
  const selectedCourse = useMemo(() => {
    if (selectedCourseId) {
      return courses.find(c => String(c.id) === String(selectedCourseId)) || null;
    }
    return filteredAndSortedCourses[0] || null;
  }, [courses, selectedCourseId, filteredAndSortedCourses]);

  useEffect(() => {
    if (selectedCourse) {
      setSelectedExamId(selectedCourse.examens?.[0]?.id || '');
    }
  }, [selectedCourse]);

  const exams = selectedCourse?.examens || [];
  const students = selectedCourse?.students || [];

  // Gestion des notes
  const updateGrade = (studentId, value) => {
    if (!selectedExamId) return;
    setGradesState(prev => ({
      ...prev,
      [selectedExamId]: {
        ...(prev[selectedExamId] || {}),
        [studentId]: value
      }
    }));
  };

  const saveGrades = async () => {
    if (!selectedExamId) return;
    
    setSavingGrades(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const payload = [];
      const examGrades = gradesState[selectedExamId] || {};
      
      for (const studentId of Object.keys(examGrades)) {
        const rec = examGrades[studentId];
        payload.push({ 
          etudiant_id: studentId, 
          valeur: rec === '' ? null : rec 
        });
      }
      
      await api.post(`teacher/exams/${selectedExamId}/bulk-save/`, { grades: payload });
      
      // Recharger les données
      await fetchData();
      setSuccessMessage('Notes sauvegardées avec succès');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erreur save grades', err);
      const msg = err.response?.data?.detail || 'Erreur lors de la sauvegarde';
      setError(msg);
    } finally {
      setSavingGrades(false);
    }
  };

  // Export functions
  const exportCSV = () => {
    if (!selectedCourse || !selectedExamId) return;
    const rows = [['Nom', 'Matricule', 'Note']];
    const examGrades = gradesState[selectedExamId] || {};
    
    const sortedStudents = [...students].sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    sortedStudents.forEach(s => {
      rows.push([s.nom, s.matricule, examGrades[s.id] ?? '']);
    });
    
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCourse.code || 'cours'}_examen_${selectedExamId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (!selectedCourse || !selectedExamId) return;
    
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`${selectedCourse.nom} - Notes d'examen`, 14, 20);
    doc.setFontSize(11);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);
    
    const examGrades = gradesState[selectedExamId] || {};
    const rows = students.map(s => [
      s.nom,
      s.matricule,
      examGrades[s.id] ?? 'Non noté'
    ]);
    
    // @ts-ignore - jspdf-autotable
    doc.autoTable({
      head: [['Nom', 'Matricule', 'Note']],
      body: rows,
      startY: 40,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`${selectedCourse.code}_notes_${selectedExamId}.pdf`);
  };

  if (loading && courses.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des cours...</p>
      </div>
    );
  }

  if (error && courses.length === 0) {
    return (
      <div className="error-container">
        <div className="error-message">
          <AlertCircle size={48} />
          <h3>Erreur de chargement</h3>
          <p>{error}</p>
          <button className="btn-retry" onClick={fetchData}>Réessayer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-courses-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1><BookOpen size={28} /> Mes Cours</h1>
          <p>Gérez vos cours, examens et saisissez les notes des étudiants.</p>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          {successMessage}
        </div>
      )}
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Filtres et recherche */}
      <div className="management-header">
        <div className="filters-group">
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="Rechercher un cours..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          
          <select 
            value={selectedPromotionId} 
            onChange={(e) => { setSelectedPromotionId(e.target.value); setCurrentPage(1); }}
          >
            <option value="">Toutes promotions</option>
            {promotions.map(p => (
              <option key={p.id} value={p.id}>{p.nom} ({p.annee})</option>
            ))}
          </select>
          
          <select 
            value={selectedMatiereId} 
            onChange={(e) => { setSelectedMatiereId(e.target.value); setCurrentPage(1); }}
          >
            <option value="">Toutes matières</option>
            {matieres.map(m => (
              <option key={m.id} value={m.id}>{m.nom} ({m.code})</option>
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

      {/* Liste des cours (paginée) */}
      <div className="courses-section">
        <h2>Vos Cours ({filteredAndSortedCourses.length})</h2>
        
        {filteredAndSortedCourses.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={48} />
            <p>Aucun cours trouvé</p>
          </div>
        ) : (
          <>
            <div className="courses-grid">
              {paginatedCourses.map(course => (
                <div 
                  key={course.id}
                  className={`course-card ${selectedCourseId === course.id ? 'active' : ''}`}
                  onClick={() => setSelectedCourseId(course.id)}
                >
                  <div className="course-card-header">
                    <div className="course-icon">
                      <BookOpen size={24} />
                    </div>
                    <div className="course-code">{course.code}</div>
                  </div>
                  <h3 className="course-title">{course.nom}</h3>
                  <div className="course-meta">
                    <span><Users size={14} /> {course.students?.length || 0} étudiants</span>
                    <span><FileText size={14} /> {course.examens?.length || 0} examens</span>
                  </div>
                  <div className="course-promotions">
                    {(course.promotions || []).slice(0, 2).map(p => (
                      <span key={p.id} className="promo-tag">{p.nom}</span>
                    ))}
                    {(course.promotions || []).length > 2 && (
                      <span className="promo-more">+{course.promotions.length - 2}</span>
                    )}
                  </div>
                </div>
              ))}
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
                  <span className="total-items">({filteredAndSortedCourses.length} cours)</span>
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

      {/* Détails du cours sélectionné */}
      {selectedCourse && (
        <div className="course-details-section">
          <div className="details-header">
            <h2>
              <BookOpen size={24} />
              {selectedCourse.nom}
              <span className="course-code-badge">{selectedCourse.code}</span>
            </h2>
            
            <div className="details-actions">
              <select 
                value={selectedExamId || ''} 
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="exam-select"
              >
                <option value="">Sélectionner un examen...</option>
                {exams.map(ex => (
                  <option key={ex.id} value={ex.id}>
                    {ex.nom} — {ex.date_examen || ex.date || 'Date non définie'}
                  </option>
                ))}
              </select>

              <div className="sort-controls">
                <label>Trier:</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="nom">Nom</option>
                  <option value="matricule">Matricule</option>
                  <option value="note">Note</option>
                </select>
                <select value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                  <option value="asc">Ascendant</option>
                  <option value="desc">Descendant</option>
                </select>
              </div>

              <div className="export-buttons">
                <button className="btn-outline" onClick={exportCSV} disabled={!selectedExamId}>
                  <Download size={16} /> CSV
                </button>
                <button className="btn-outline" onClick={exportPDF} disabled={!selectedExamId}>
                  <Download size={16} /> PDF
                </button>
                <button className="btn-outline" onClick={() => window.print()}>
                  <Printer size={16} /> Imprimer
                </button>
              </div>
            </div>
          </div>

          {/* Liste des étudiants avec notes */}
          {selectedExamId ? (
            <div className="grades-container">
              <div className="grades-header">
                <div className="stats">
                  <span><Users size={16} /> {students.length} étudiants</span>
                  <span><FileText size={16} /> Examen: {exams.find(e => e.id === selectedExamId)?.nom}</span>
                </div>
                <button 
                  className="btn-primary" 
                  onClick={saveGrades} 
                  disabled={savingGrades}
                >
                  <Save size={16} />
                  {savingGrades ? 'Sauvegarde...' : 'Sauvegarder les notes'}
                </button>
              </div>

              <div className="grades-table-wrapper">
                <table className="grades-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nom complet</th>
                      <th>Matricule</th>
                      <th>Note (0-20)</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, idx) => {
                      const grade = gradesState[selectedExamId]?.[student.id] ?? '';
                      const isValid = grade === '' || (grade >= 0 && grade <= 20);
                      
                      return (
                        <tr key={student.id}>
                          <td className="rank-cell">{idx + 1}</td>
                          <td className="name-cell">
                            <div className="student-avatar">
                              {(student.nom || '?').charAt(0).toUpperCase()}
                            </div>
                            {student.nom}
                          </td>
                          <td className="matricule-cell">{student.matricule}</td>
                          <td className="grade-cell">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.01"
                              value={grade}
                              onChange={(e) => updateGrade(student.id, 
                                e.target.value === '' ? '' : Number(e.target.value)
                              )}
                              className={`grade-input ${!isValid && grade !== '' ? 'invalid' : ''}`}
                              placeholder="..."
                            />
                          </td>
                          <td className="status-cell">
                            {grade === '' ? (
                              <span className="status-badge empty">Non noté</span>
                            ) : !isValid ? (
                              <span className="status-badge invalid">Invalide</span>
                            ) : (
                              <span className={`status-badge ${grade >= 10 ? 'pass' : 'fail'}`}>
                                {grade >= 10 ? 'Admissible' : 'Échec'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="no-exam-selected">
              <FileText size={48} />
              <p>Sélectionnez un examen pour saisir les notes</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherCourses;
