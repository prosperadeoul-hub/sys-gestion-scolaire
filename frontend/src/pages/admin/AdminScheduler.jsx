import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Clock, MapPin, Users, BookOpen, Plus, Edit, Trash2, 
  AlertCircle, CheckCircle, X, Filter, ChevronLeft, ChevronRight,
  LayoutGrid, CalendarDays, Search
} from 'lucide-react';
import api from '../../api/axios';
import { startOfWeek, addWeeks, addDays, format, parseISO, isSameDay, isSameWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import './AdminScheduler.css';

const AdminScheduler = () => {
  const [cours, setCours] = useState([]);
  const [salles, setSalles] = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCours, setEditingCours] = useState(null);
  const [conflictError, setConflictError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());
  const [filterSalle, setFilterSalle] = useState('');
  const [filterEnseignant, setFilterEnseignant] = useState('');
  const [filterPromotion, setFilterPromotion] = useState('');
  const [filterMatiere, setFilterMatiere] = useState('');
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState('Lundi');
  const [viewMode, setViewMode] = useState('week');
  const daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const timeSlots = [
    '07:30 - 09:30', '09:45 - 11:45', '12:00 - 14:00', 
    '14:15 - 16:15', '16:30 - 18:30', '18:45 - 20:45'
  ];

  // Formulaire
  const [formData, setFormData] = useState({
    matiere_id: '',
    enseignant_id: '',
    promotion_id: '',
    salle_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    heure_debut: '08:00',
    heure_fin: '10:00',
    notes: ''
  });

  // Filtered courses based on active filters
  const filteredCours = useMemo(() => {
    return cours.filter(c => {
      if (filterSalle && c.salle.id !== filterSalle) return false;
      if (filterEnseignant && c.enseignant.id !== filterEnseignant) return false;
      if (filterPromotion && c.promotion.id !== filterPromotion) return false;
      if (filterMatiere && c.matiere.id !== filterMatiere) return false;
      return true;
    });
  }, [cours, filterSalle, filterEnseignant, filterPromotion, filterMatiere]);

  // Utilitaire pour filtrer les cours par date
  const getCoursForDate = (targetDate) => {
    return cours.filter(item => {
      const itemDate = new Date(item.date);
      return (
        itemDate.getDate() === targetDate.getDate() &&
        itemDate.getMonth() === targetDate.getMonth() &&
        itemDate.getFullYear() === targetDate.getFullYear()
      );
    });
  };
  
  // Obtenir les cours pour la semaine courante
  const getWeekCours = () => {
    const weekDays = daysOfWeek.map((_, idx) => {
      const dayDate = addDays(currentWeekStart, idx);
      return {
        dayName: daysOfWeek[idx],
        date: dayDate,
        cours: getCoursForDate(dayDate)
      };
    });
    return weekDays;
  };

  const weekData = getWeekCours();

  // Regrouper les cours par créneau pour un jour donné
  const getCoursByTimeSlot = (dayCours) => {
    const groups = {};
    dayCours.forEach(c => {
      const key = `${c.heure_debut}-${c.heure_fin}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  };

  // Couleurs par catégorie
  const getColorForCategorie = (cat) => {
    const colors = {
      'TECH': '#3b82f6',
      'SOFT': '#10b981',
      'LANG': '#f59e0b',
      'SCIE': '#8b5cf6'
    };
    return colors[cat] || '#6b7280';
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true); // On commence le chargement
      try {
        // On lance tous les appels en parallèle pour aller plus vite
        const [resCours, resSalles, resPro] = await Promise.all([
          api.get('admin/schedule/'),
          api.get('admin/rooms/'),
          api.get('admin/promotions/')
        ]);

        setCours(resCours.data);
        setSalles(resSalles.data);
        setPromotions(resPro.data);
        
        setError(null);
      } catch (err) {
        console.error("Erreur de chargement:", err);
        setError("Impossible de charger les données du calendrier.");
      } finally {
        // C'EST CETTE LIGNE QUI ENLÈVE LE MESSAGE "CHARGEMENT..."
        setLoading(false); 
      }
    };

    fetchAllData();

  }, []);
  // Gestion conflits
  const checkConflicts = async (data, excludeId = null) => {
    const conflicts = [];
    try {
      const salleConflict = cours.find(c => 
        c.salle.id === data.salle_id &&
        c.date === data.date &&
        c.id !== excludeId &&
        !(c.heure_fin <= data.heure_debut || c.heure_debut >= data.heure_fin)
      );
      if (salleConflict) {
        conflicts.push(`Salle occupee par "${salleConflict.matiere.nom}" (${salleConflict.heure_debut} - ${salleConflict.heure_fin})`);
      }

      const profConflict = cours.find(c =>
        c.enseignant.id === data.enseignant_id &&
        c.date === data.date &&
        c.id !== excludeId &&
        !(c.heure_fin <= data.heure_debut || c.heure_debut >= data.heure_fin)
      );
      if (profConflict) {
        conflicts.push(`Enseignant occupe par "${profConflict.matiere.nom}" (${profConflict.heure_debut} - ${profConflict.heure_fin})`);
      }
    } catch (e) {
      console.error('Conflict check error:', e);
    }
    return conflicts;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setConflictError('');
    setSuccessMessage('');

    try {
      const data = {
        matiere: formData.matiere_id,
        enseignant: formData.enseignant_id,
        promotion: formData.promotion_id,
        salle: formData.salle_id,
        date: formData.date,
        heure_debut: formData.heure_debut,
        heure_fin: formData.heure_fin,
        notes: formData.notes
      };

      const conflicts = await checkConflicts(data, editingCours?.id);
      if (conflicts.length > 0) {
        setConflictError(conflicts.join(' | '));
        return;
      }

      if (editingCours) {
        await api.put(`admin/cours/${editingCours.id}/`, data);
        setSuccessMessage('Cours modifie avec succes');
      } else {
        await api.post('admin/cours/', data);
        setSuccessMessage('Cours cree avec succes');
      }

      await fetchData();
      closeModal();
    } catch (err) {
      if (err.response?.data) {
        const errors = err.response.data;
        const errorMsg = typeof errors === 'object' ? JSON.stringify(errors, null, 2) : errors;
        setConflictError(`Erreur: ${errorMsg}`);
      } else {
        setConflictError('Erreur de connexion au serveur');
      }
    }
  };

  const openAddModal = () => {
    setEditingCours(null);
    setFormData({
      matiere_id: '',
      enseignant_id: '',
      promotion_id: '',
      salle_id: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      heure_debut: '08:00',
      heure_fin: '10:00',
      notes: ''
    });
    setConflictError('');
    setSuccessMessage('');
    setShowModal(true);
  };

  const openEditModal = (cour) => {
    setEditingCours(cour);
    setFormData({
      matiere_id: cour.matiere.id,
      enseignant_id: cour.enseignant.id,
      promotion_id: cour.promotion.id,
      salle_id: cour.salle.id,
      date: cour.date,
      heure_debut: cour.heure_debut,
      heure_fin: cour.heure_fin,
      notes: cour.notes || ''
    });
    setConflictError('');
    setSuccessMessage('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCours(null);
    setConflictError('');
    setSuccessMessage('');
  };

  const handleDelete = async (coursId) => {
    if (!window.confirm('Etes-vous sur de vouloir supprimer ce cours ?')) return;
    try {
      await api.delete(`admin/cours/${coursId}/`);
      await fetchData();
      setSuccessMessage('Cours supprime avec succes');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  // Statistiques
  const stats = useMemo(() => {
    const totalCours = filteredCours.length;
    const totalHeures = filteredCours.reduce((acc, c) => {
      const [h1, m1] = c.heure_debut.split(':').map(Number);
      const [h2, m2] = c.heure_fin.split(':').map(Number);
      return acc + (h2 - h1) + (m2 - m1) / 60;
    }, 0);
    const matieresUniques = new Set(filteredCours.map(c => c.matiere.id)).size;
    return { totalCours, totalHeures: totalHeures.toFixed(1), matieresUniques };
  }, [filteredCours]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Chargement du planning...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="scheduler-container">
      {/* En-tête principal */}
      <div className="scheduler-header">
        <div className="header-top">
          <h1>
            <Calendar size={28} />
            Planning des Cours
          </h1>
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
              <Calendar size={16} />
              Jour
            </button>
          </div>
        </div>

        {/* Navigation semaine et filtres rapides */}
        <div className="calendar-nav">
          <div className="nav-section">
            <div className="nav-controls">
              <button className="nav-btn" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, -1))}>
                <ChevronLeft size={20} />
                Semaine précédente
              </button>
              <button 
                className="today-btn"
                onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
              >
                Aujourd'hui
              </button>
              <button className="nav-btn" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
                Semaine suivante
                <ChevronRight size={20} />
              </button>
            </div>
            <h2 className="current-period">
              Semaine du {format(currentWeekStart, 'dd MMMM', { locale: fr })} - {format(addDays(currentWeekStart, 6), 'dd MMMM yyyy', { locale: fr })}
            </h2>
          </div>

          <div className="filters-row">
            <div className="search-box">
              <Search size={18} />
              <select
                value={filterMatiere}
                onChange={(e) => setFilterMatiere(e.target.value)}
                className="filter-select"
              >
                <option value="">Toutes les matières</option>
                {matieres.map(m => (
                  <option key={m.id} value={m.id}>{m.nom} ({m.code})</option>
                ))}
              </select>
            </div>
            <select
              value={filterEnseignant}
              onChange={(e) => setFilterEnseignant(e.target.value)}
              className="filter-select"
            >
              <option value="">Tous les enseignants</option>
              {enseignants.map(e => (
                <option key={e.id} value={e.id}>{e.full_name || e.user?.first_name + ' ' + e.user?.last_name}</option>
              ))}
            </select>
            <select
              value={filterPromotion}
              onChange={(e) => setFilterPromotion(e.target.value)}
              className="filter-select"
            >
              <option value="">Toutes les promotions</option>
              {promotions.map(p => (
                <option key={p.id} value={p.id}>{p.nom} ({p.annee})</option>
              ))}
            </select>
            <select
              value={filterSalle}
              onChange={(e) => setFilterSalle(e.target.value)}
              className="filter-select"
            >
              <option value="">Toutes les salles</option>
              {salles.map(s => (
                <option key={s.id} value={s.id}>{s.nom}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={openAddModal}>
              <Plus size={18} /> Ajouter un cours
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          {successMessage}
        </div>
      )}
      {conflictError && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          {conflictError}
        </div>
      )}

      {/* Statistiques */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#3b82f6' }}>
            <BookOpen size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalCours}</div>
            <div className="stat-label">Cours programmés</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#10b981' }}>
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalHeures}h</div>
            <div className="stat-label">Total heures</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f59e0b' }}>
            <MapPin size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{salles.length}</div>
            <div className="stat-label">Salles disponibles</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#8b5cf6' }}>
            <Users size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.matieresUniques}</div>
            <div className="stat-label">Matières uniques</div>
          </div>
        </div>
      </div>

      {/* Vue par semaine (Tableau principal) */}
      {viewMode === 'week' && (
        <div className="week-table-container">
          <h2 className="section-title">Emploi du temps de la semaine</h2>
          <div className="timetable-wrapper">
            <table className="timetable">
              <thead>
                <tr>
                  <th className="time-column-header">Heure</th>
                  {weekData.map((dayData) => (
                    <th key={dayData.dayName} className="day-header-col">
                      <div className="day-header-content">
                        <div className="day-name">{dayData.dayName}</div>
                        <div className="day-date">
                          {format(dayData.date, 'dd MMM', { locale: fr })}
                        </div>
                        {dayData.cours.length > 0 && (
                          <span className="day-count-badge">{dayData.cours.length} cours</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot) => {
                  const slotCoursByDay = weekData.map(dayData => 
                    dayData.cours.filter(c => c.heure_debut === slot.start && c.heure_fin === slot.end)
                  );
                  const hasAnyCours = slotCoursByDay.some(arr => arr.length > 0);
                  
                  return (
                    <tr key={slot.key} className={hasAnyCours ? 'has-cours' : 'free-slot'}>
                      <td className="time-column">
                        <div className="time-label">
                          <Clock size={14} />
                          <span>{slot.start} - {slot.end}</span>
                        </div>
                      </td>
                      {slotCoursByDay.map((coursList, dayIdx) => (
                        <td key={`${slot.key}-${dayIdx}`} className="time-slot-cell">
                          {coursList.length > 0 ? (
                            <div className="cours-in-slot">
                              {coursList.map((cour) => (
                                <div 
                                  key={cour.id}
                                  className="cours-card-small"
                                  style={{ borderLeftColor: getColorForCategorie(cour.matiere.categorie) }}
                                >
                                  <div className="cours-small-header">
                                    <span className="cours-small-code">{cour.matiere.code}</span>
                                    <button onClick={() => openEditModal(cour)} className="edit-small">
                                      <Edit size={12} />
                                    </button>
                                  </div>
                                  <div className="cours-small-title">{cour.matiere.nom}</div>
                                  <div className="cours-small-meta">
                                    <span>{cour.salle.nom}</span>
                                    <span>{cour.promotion.nom}</span>
                                  </div>
                                  <button 
                                    className="delete-small"
                                    onClick={() => handleDelete(cour.id)}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="empty-slot"></div>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vue détaillée par jour */}
      <div className="day-detail-section">
        <div className="day-detail-header">
          <h2>
            <Clock size={20} />
            {viewMode === 'day' ? (
              <>
                Sélectionnez un jour :
                <div className="day-selector">
                  {weekData.map(dayData => (
                    <button
                      key={dayData.dayName}
                      className={`day-selector-btn ${selectedDay === dayData.dayName ? 'active' : ''}`}
                      onClick={() => setSelectedDay(dayData.dayName)}
                    >
                      {dayData.dayName} {format(dayData.date, 'dd MMM', { locale: fr })}
                      {dayData.cours.length > 0 && (
                        <span className="day-selector-count">{dayData.cours.length}</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              `Détails du ${selectedDay} (${format(weekData.find(d => d.dayName === selectedDay)?.date || new Date(), 'dd MMM yyyy', { locale: fr })})`
            )}
            {weekData.find(d => d.dayName === selectedDay)?.cours.length > 0 && (
              <span className="day-count">
                ({weekData.find(d => d.dayName === selectedDay)?.cours.length} cours)
              </span>
            )}
          </h2>
        </div>

        {weekData.find(d => d.dayName === selectedDay)?.cours.length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} />
            <p>Aucun cours programmé pour ce jour</p>
          </div>
        ) : (
          <div className="day-grid">
            {timeSlots.map(slot => {
              const dayCours = weekData.find(d => d.dayName === selectedDay)?.cours || [];
              const slotCours = dayCours.filter(c => c.heure_debut === slot.start && c.heure_fin === slot.end);
              
              return (
                <div key={slot.key} className={`day-grid-row ${slotCours.length > 0 ? 'has-cours' : ''}`}>
                  <div className="day-grid-time">
                    <Clock size={14} />
                    <span>{slot.start} - {slot.end}</span>
                  </div>
                  <div className="day-grid-content">
                    {slotCours.length > 0 ? (
                      <div className="cours-cards-container">
                        {slotCours.map(cour => (
                          <div 
                            key={cour.id}
                            className="cour-card-large"
                            style={{ borderLeftColor: getColorForCategorie(cour.matiere.categorie) }}
                          >
                            <div className="cour-card-header">
                              <div className="cour-main-info">
                                <span className="cour-badge">{cour.matiere.code}</span>
                                <h3>{cour.matiere.nom}</h3>
                              </div>
                              <div className="cour-actions-top">
                                <button className="action-btn edit" onClick={() => openEditModal(cour)}>
                                  <Edit size={16} />
                                </button>
                                <button className="action-btn delete" onClick={() => handleDelete(cour.id)}>
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="cour-card-body">
                              <div className="cour-info-row">
                                <span className="info-label">
                                  <Users size={14} />
                                  Enseignant
                                </span>
                                <span>{cour.enseignant.full_name || cour.enseignant.user?.last_name}</span>
                              </div>
                              <div className="cour-info-row">
                                <span className="info-label">
                                  <MapPin size={14} />
                                  Salle
                                </span>
                                <span>{cour.salle.nom} (Cap: {cour.salle.capacite})</span>
                              </div>
                              <div className="cour-info-row">
                                <span className="info-label">
                                  <BookOpen size={14} />
                                  Promotion
                                </span>
                                <span className="promo-tag">{cour.promotion.nom} ({cour.promotion.annee})</span>
                              </div>
                            </div>
                            {cour.notes && (
                              <div className="cour-notes">
                                <span className="notes-label">Notes:</span>
                                <p>{cour.notes}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-time-slot">
                        <span>Créneau libre</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCours ? 'Modifier le cours' : 'Nouveau cours'}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Matière *</label>
                  <select
                    value={formData.matiere_id}
                    onChange={(e) => setFormData({...formData, matiere_id: e.target.value, enseignant_id: ''})}
                    required
                  >
                    <option value="">Sélectionner...</option>
                    {matieres.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nom} ({m.code}) - Prof: {m.professeur?.user?.last_name || 'N/A'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Enseignant *</label>
                  <select
                    value={formData.enseignant_id}
                    onChange={(e) => setFormData({...formData, enseignant_id: e.target.value})}
                    required
                    disabled={!formData.matiere_id}
                  >
                    <option value="">Sélectionner...</option>
                    {enseignants.filter(e => 
                      !formData.matiere_id || 
                      matieres.find(m => m.id === formData.matiere_id && m.professeur?.id === e.id)
                    ).map(e => (
                      <option key={e.id} value={e.id}>
                        {e.full_name || e.user?.first_name + ' ' + e.user?.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Promotion *</label>
                  <select
                    value={formData.promotion_id}
                    onChange={(e) => setFormData({...formData, promotion_id: e.target.value})}
                    required
                  >
                    <option value="">Sélectionner...</option>
                    {promotions.map(p => (
                      <option key={p.id} value={p.id}>{p.nom} ({p.annee})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Salle *</label>
                  <select
                    value={formData.salle_id}
                    onChange={(e) => setFormData({...formData, salle_id: e.target.value})}
                    required
                  >
                    <option value="">Sélectionner...</option>
                    {salles.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nom} (Cap: {s.capacite}) - {s.statut}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Heure début *</label>
                  <input
                    type="time"
                    value={formData.heure_debut}
                    onChange={(e) => setFormData({...formData, heure_debut: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Heure fin *</label>
                  <input
                    type="time"
                    value={formData.heure_fin}
                    onChange={(e) => setFormData({...formData, heure_fin: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Notes (optionnel)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={2}
                  placeholder="Notes additionnelles..."
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCours ? 'Modifier' : 'Créer le cours'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminScheduler;