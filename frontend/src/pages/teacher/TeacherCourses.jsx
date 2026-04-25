import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Users, FileText, Search, Save, Download, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api/axios';
import '../student/StudentCourses.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const TeacherCourses = () => {
  const { user, role } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [promotions, setPromotions] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [selectedPromotionId, setSelectedPromotionId] = useState('');
  const [selectedMatiereId, setSelectedMatiereId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [gradesState, setGradesState] = useState({}); // {examId: { studentId: note }}
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('nom');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    const fetch = async () => {
      if (!role || role !== 'ENSEIGNANT') {
        setError("Accès refusé : cette page est réservée aux enseignants.");
        setLoading(false);
        return;
      }

      try {
        const params = {};
        if (selectedPromotionId) params.promotion_id = selectedPromotionId;
        if (selectedMatiereId) params.matiere_id = selectedMatiereId;
        const resp = await api.get('teacher/courses/', { params });
        const fetched = resp.data.cours || [];
        const filters = resp.data.filters || {};
        if (filters.promotions) setPromotions(filters.promotions || []);
        if (filters.matieres) setMatieres(filters.matieres || []);
        setCourses(fetched);
        if (fetched.length) setSelectedCourseId(fetched[0].id);
        // init editable grades
        const eg = {};
        fetched.forEach(c => {
          (c.examens || []).forEach(ex => {
            eg[ex.id] = {};
            (c.students || []).forEach(s => {
              const noteEntry = s.examens && s.examens.find(se => String(se.id) === String(ex.id));
              eg[ex.id][s.id] = noteEntry && noteEntry.note != null ? noteEntry.note : '';
            });
          });
        });
        setGradesState(eg);
      } catch (err) {
        console.error('Erreur teacher courses', err);
        setError('Impossible de charger les cours assignés.');
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [role]);

  // Refetch when filters change
  useEffect(() => {
    if (!role || role !== 'ENSEIGNANT') return;
    const fetchWithFilters = async () => {
      setLoading(true);
      try {
        const params = {};
        if (selectedPromotionId) params.promotion_id = selectedPromotionId;
        if (selectedMatiereId) params.matiere_id = selectedMatiereId;
        const resp = await api.get('teacher/courses/', { params });
        const fetched = resp.data.cours || [];
        const filters = resp.data.filters || {};
        if (filters.promotions) setPromotions(filters.promotions || []);
        if (filters.matieres) setMatieres(filters.matieres || []);
        setCourses(fetched);
      } catch (err) {
        console.error('Erreur teacher courses with filters', err);
        setError('Impossible de charger les cours assignés.');
      } finally {
        setLoading(false);
      }
    };

    fetchWithFilters();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPromotionId, selectedMatiereId]);

  // derived values and hooks that must run before any early returns
  const filtered = courses.filter(c =>
    c.nom?.toLowerCase().includes(search.toLowerCase()) ||
    c.code?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCourse = useMemo(() => courses.find(c => String(c.id) === String(selectedCourseId)) || filtered[0] || null, [courses, selectedCourseId, filtered]);
  const exams = selectedCourse?.examens || [];
  const students = selectedCourse?.students || [];

  useEffect(() => {
    if (selectedCourse && exams.length > 0) setSelectedExamId(exams[0].id);
    else setSelectedExamId(null);
    setPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId, selectedCourse?.id]);

  useEffect(() => {
    if (!selectedExamId) return;
    setGradesState(prev => {
      const next = { ...prev };
      if (!next[selectedExamId]) {
        next[selectedExamId] = {};
        (students || []).forEach(s => {
          const noteEntry = s.examens && s.examens.find(se => String(se.id) === String(selectedExamId));
          next[selectedExamId][s.id] = noteEntry && noteEntry.note != null ? noteEntry.note : '';
        });
      }
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExamId, selectedCourseId]);

  const sortedStudents = useMemo(() => {
    const list = (students || []).slice();
    list.sort((a,b) => {
      let A = a[sortBy] || '';
      let B = b[sortBy] || '';
      if (sortBy === 'nom') { A = (a.nom||'').toLowerCase(); B = (b.nom||'').toLowerCase(); }
      if (sortBy === 'matricule') { A = (a.matricule||'').toLowerCase(); B = (b.matricule||'').toLowerCase(); }
      if (sortBy === 'note') {
        const an = gradesState[selectedExamId]?.[a.id]?.note ?? gradesState[selectedExamId]?.[a.id];
        const bn = gradesState[selectedExamId]?.[b.id]?.note ?? gradesState[selectedExamId]?.[b.id];
        A = an === '' || an === null || an === undefined ? -Infinity : parseFloat(an);
        B = bn === '' || bn === null || bn === undefined ? -Infinity : parseFloat(bn);
      }
      if (A < B) return sortDir === 'asc' ? -1 : 1;
      if (A > B) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [students, sortBy, sortDir, gradesState, selectedExamId]);
  const pageCount = Math.max(1, Math.ceil((sortedStudents.length || 0) / pageSize));
  const pagedStudents = sortedStudents.slice((page-1)*pageSize, page*pageSize);

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Chargement des cours...</p>
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


  const updateGrade = (studentId, value) => {
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
    const payload = [];
    const examGrades = gradesState[selectedExamId] || {};
    for (const studentId of Object.keys(examGrades)) {
      const rec = examGrades[studentId];
      payload.push({ etudiant_id: studentId, valeur: rec === '' ? null : rec });
    }

    try {
      await api.post(`teacher/exams/${selectedExamId}/bulk-save/`, { grades: payload });
      // refresh courses to show updated notes
      const params = {};
      if (selectedPromotionId) params.promotion_id = selectedPromotionId;
      if (selectedMatiereId) params.matiere_id = selectedMatiereId;
      const resp = await api.get('teacher/courses/', { params });
      const fetched = resp.data.cours || [];
      setCourses(fetched);
      alert('Notes sauvegardées');
    } catch (err) {
      console.error('Erreur save grades', err);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const exportCSV = () => {
    if (!selectedCourse) return;
    if (!selectedExamId) return;
    const rows = [['Nom','Matricule','Note']];
    const examGrades = gradesState[selectedExamId] || {};
    for (const s of sortedStudents) {
      const g = examGrades[s.id];
      rows.push([s.nom, s.matricule, g ?? '']);
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${selectedCourse?.code || 'course'}_exam_${selectedExamId}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (!selectedCourse || !selectedExamId) return;
    const examGrades = gradesState[selectedExamId] || {};
    const doc = new jsPDF();
    const title = `${selectedCourse.nom} - Examen ${selectedExamId}`;
    doc.setFontSize(14);
    doc.text(title, 14, 20);
    const rows = sortedStudents.map(s => [s.nom, s.matricule, examGrades[s.id] ?? '']);
    // AutoTable columns
    // eslint-disable-next-line no-undef
    doc.autoTable({
      head: [['Nom', 'Matricule', 'Note']],
      body: rows,
      startY: 28,
    });
    doc.save(`${selectedCourse.code || 'course'}_exam_${selectedExamId}.pdf`);
  };

  const exportICS = () => {
    if (!selectedCourse) return;
    let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//EduManager//EN\n';
    (selectedCourse.examens||[]).forEach((e) => {
      const uid = `${e.id}@edumanager.local`;
      const dt = (e.date || e.date_examen || '').replace(/-/g,'');
      ics += `BEGIN:VEVENT\nUID:${uid}\nSUMMARY:${selectedCourse.nom} - ${e.nom}\nDTSTAMP:${dt}T080000\nDTSTART:${dt}T080000\nDTEND:${dt}T100000\nEND:VEVENT\n`;
    });
    ics += 'END:VCALENDAR';
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${selectedCourse.code || 'course'}_exams.ics`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="student-courses-page">
      <div className="page-header">
        <div className="header-content">
          <h1><BookOpen size={28} /> Mes Cours</h1>
          <p>Liste des cours que vous enseignez et notes des étudiants.</p>
        </div>
      </div>

      <div className="management-header" style={{ gap: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div className="search-bar">
            <Search size={18} />
            <input placeholder="Rechercher un cours..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select value={selectedPromotionId || ''} onChange={(e) => setSelectedPromotionId(e.target.value)}>
            <option value="">Toutes promotions</option>
            {promotions.map(p => (
              <option key={p.id} value={p.id}>{p.nom}</option>
            ))}
          </select>
          <select value={selectedMatiereId || ''} onChange={(e) => setSelectedMatiereId(e.target.value)}>
            <option value="">Toutes matières</option>
            {matieres.map(m => (
              <option key={m.id} value={m.id}>{m.nom}</option>
            ))}
          </select>
          <select value={selectedCourseId || ''} onChange={(e) => setSelectedCourseId(e.target.value)}>
            {filtered.map(c => (
              <option key={c.id} value={c.id}>{c.nom} — {c.code}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="action-outline" onClick={exportCSV}><Download size={14} /> CSV</button>
          <button className="action-outline" onClick={exportPDF}><Download size={14} /> PDF</button>
          <button className="action-outline" onClick={exportICS}><Download size={14} /> ICS</button>
          <button className="action-primary" onClick={() => window.print()}><Printer size={14} /> Imprimer</button>
        </div>
      </div>

      {!selectedCourse && (
        <div className="no-courses">Aucun cours sélectionné</div>
      )}

      {selectedCourse && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>{selectedCourse.nom} <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>({selectedCourse.code})</span></h2>
              <div className="stat-item"><Users size={16} /> <span>{selectedCourse.students?.length || 0} étudiants</span></div>
              <div className="stat-item"><FileText size={16} /> <span>{selectedCourse.examens?.length || 0} examens</span></div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select value={selectedExamId || ''} onChange={(e) => setSelectedExamId(e.target.value)}>
                <option value="">Sélectionner un examen...</option>
                {selectedCourse.examens?.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.nom} — {ex.date}</option>
                ))}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="nom">Trier: Nom</option>
                <option value="matricule">Trier: Matricule</option>
                <option value="note">Trier: Note</option>
              </select>
              <select value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </select>
            </div>
          </div>

          {selectedExamId ? (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <label>Page size: </label>
                  <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="action-outline" onClick={() => { setPage((p) => Math.max(1,p-1)) }}><ChevronLeft size={16} /></button>
                  <div style={{ alignSelf: 'center' }}>Page {page} / {pageCount}</div>
                  <button className="action-outline" onClick={() => { setPage((p) => Math.min(pageCount,p+1)) }}><ChevronRight size={16} /></button>
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Étudiant</th>
                      <th>Matricule</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedStudents.map(s => (
                      <tr key={s.id}>
                        <td>{s.nom}</td>
                        <td>{s.matricule}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            step="0.01"
                            value={(gradesState[selectedExamId] && gradesState[selectedExamId][s.id]) ?? ''}
                            onChange={(e) => updateGrade(s.id, e.target.value === '' ? '' : Number(e.target.value))}
                            style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button className="action-primary" onClick={saveGrades}><Save size={14} /> Sauvegarder</button>
                <button className="action-outline" onClick={exportCSV}><Download size={14} /> Export CSV</button>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '1rem' }} className="no-courses">Sélectionnez un examen pour modifier les notes.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherCourses;