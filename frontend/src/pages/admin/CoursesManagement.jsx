import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, Edit, Trash2, BookOpen } from 'lucide-react';
import api from '../../api/axios';

const CoursesManagement = () => {
  const { user, role } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [professeurs, setProfesseurs] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [formData, setFormData] = useState({
    nom: '',
    code: '',
    description: '',
    coefficient: 1,
    categorie: 'TECH',
    professeur_id: '',
    promotion_ids: []
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [profRes, promoRes] = await Promise.all([
          api.get('admin/professeurs/'),
          api.get('admin/classes/')
        ]);
        setProfesseurs(profRes.data);
        setPromotions(promoRes.data);
      } catch (err) {
        console.error('Erreur chargement données:', err);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await api.get('admin/courses/');
      setCourses(response.data);
    } catch (err) {
      setError('Erreur lors du chargement des cours');
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        nom: formData.nom,
        code: formData.code,
        description: formData.description,
        coefficient: formData.coefficient,
        categorie: formData.categorie,
        professeur_id: formData.professeur_id || null,
        promotion_ids: formData.promotion_ids
      };

      if (editingCourse) {
        await api.put(`admin/courses/${editingCourse.id}/`, data);
      } else {
        await api.post('admin/courses/', data);
      }

      fetchCourses();
      setShowAddModal(false);
      setEditingCourse(null);
      resetForm();
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
      console.error('Error saving course:', err);
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      nom: course.nom || '',
      code: course.code || '',
      description: course.description || '',
      coefficient: course.coefficient || 1,
      categorie: course.categorie || 'TECH',
      professeur_id: course.professeur?.id || '',
      promotion_ids: course.promotions?.map(p => p.id) || []
    });
    setShowAddModal(true);
  };

  const handleDelete = async (courseId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce cours ?')) {
      try {
        await api.delete(`admin/courses/${courseId}/`);
        fetchCourses();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting course:', err);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      code: '',
      description: '',
      coefficient: 1,
      categorie: 'TECH',
      professeur_id: '',
      promotion_ids: []
    });
  };

  const filteredCourses = courses.filter(course =>
    course.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="dashboard-content-wrapper">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement des cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-content-wrapper">
      <div className="welcome-section">
        <h2>
          <BookOpen size={24} style={{ marginRight: '12px' }} />
          Gestion des Cours
        </h2>
        <p>Gérer les matières et cours de l'établissement</p>
      </div>

      <div className="management-header">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Rechercher un cours..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setEditingCourse(null);
            setShowAddModal(true);
          }}
        >
          <Plus size={18} style={{ marginRight: '8px' }} />
          Ajouter un cours
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cours</th>
              <th>Code</th>
              <th>Coefficient</th>
              <th>Catégorie</th>
              <th>Professeur</th>
              <th>Promotions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCourses.map((course) => (
              <tr key={course.id}>
                <td>
                  <div className="course-info">
                    <div className="course-icon">
                      <BookOpen size={16} />
                    </div>
                    <div>
                      <div className="course-name">{course.nom}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="badge">{course.code}</span>
                </td>
                <td>
                  <span className="coefficient-badge">{course.coefficient}</span>
                </td>
                <td>
                  <span className="badge" style={{ backgroundColor:
                    course.categorie === 'TECH' ? '#3b82f6' :
                    course.categorie === 'SOFT' ? '#10b981' :
                    course.categorie === 'LANG' ? '#f59e0b' : '#8b5cf6'
                  }}>
                    {course.categorie}
                  </span>
                </td>
                <td>
                  {course.professeur ? course.professeur.nom : '-'}
                </td>
                <td>
                  <div className="promotions-cell">
                    {course.promotions?.length > 0 ? (
                      course.promotions.map(p => (
                        <span key={p.id} className="badge badge-secondary">{p.nom}</span>
                      ))
                    ) : '-'}
                  </div>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-icon btn-edit"
                      onClick={() => handleEdit(course)}
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleDelete(course.id)}
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCourses.length === 0 && (
          <div className="empty-state">
            <BookOpen size={48} color="#ccc" />
            <p>Aucun cours trouvé</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingCourse ? 'Modifier le cours' : 'Ajouter un cours'}</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCourse(null);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom du cours *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({...formData, nom: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Coefficient *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={formData.coefficient}
                    onChange={(e) => setFormData({...formData, coefficient: parseFloat(e.target.value)})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Catégorie *</label>
                  <select
                    value={formData.categorie}
                    onChange={(e) => setFormData({...formData, categorie: e.target.value})}
                    required
                  >
                    <option value="TECH">Technique</option>
                    <option value="SOFT">Soft Skills</option>
                    <option value="LANG">Langues</option>
                    <option value="SCIE">Sciences</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Professeur</label>
                  <select
                    value={formData.professeur_id}
                    onChange={(e) => setFormData({...formData, professeur_id: e.target.value})}
                  >
                    <option value="">Aucun professeur</option>
                    {professeurs.map(prof => (
                      <option key={prof.id} value={prof.id}>
                        {prof.full_name || prof.username}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Promotions</label>
                  <select
                    multiple
                    value={formData.promotion_ids}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                      setFormData({...formData, promotion_ids: selected});
                    }}
                    style={{ minHeight: '100px' }}
                  >
                    {promotions.map(promo => (
                      <option key={promo.id} value={promo.id}>
                        {promo.nom} {promo.annee ? `(${promo.annee})` : ''}
                      </option>
                    ))}
                  </select>
                  <small>Maintenez Ctrl/Cmd pour sélectionner plusieurs</small>
                </div>
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    placeholder="Description du cours..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setShowAddModal(false);
                  setEditingCourse(null);
                  resetForm();
                }}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCourse ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesManagement;
