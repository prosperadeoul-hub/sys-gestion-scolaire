import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, School, Calendar } from 'lucide-react';
import api from '../../api/axios';

const ClassesManagement = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    annee: new Date().getFullYear()
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await api.get('admin/classes/');
      setClasses(response.data);
    } catch (err) {
      setError('Erreur lors du chargement des classes');
      console.error('Error fetching classes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClass) {
        await api.put(`admin/classes/${editingClass.id}/`, formData);
      } else {
        await api.post('admin/classes/', formData);
      }

      fetchClasses();
      setShowAddModal(false);
      setEditingClass(null);
      resetForm();
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
      console.error('Error saving class:', err);
    }
  };

  const handleEdit = (classItem) => {
    setEditingClass(classItem);
    setFormData({
      nom: classItem.nom || '',
      annee: classItem.annee || new Date().getFullYear()
    });
    setShowAddModal(true);
  };

  const handleDelete = async (classId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette classe ?')) {
      try {
        await api.delete(`admin/classes/${classId}/`);
        fetchClasses();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting class:', err);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      annee: new Date().getFullYear()
    });
  };

  const filteredClasses = classes.filter(classItem =>
    classItem.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.annee?.toString().includes(searchTerm)
  );

  const getClassStatus = (classItem) => {
    const currentYear = new Date().getFullYear();
    if (classItem.annee < currentYear) return { text: 'Archivée', color: '#6b7280' };
    if (classItem.annee === currentYear) return { text: 'Active', color: '#10b981' };
    return { text: 'Future', color: '#3b82f6' };
  };

  if (loading) {
    return (
      <div className="dashboard-content-wrapper">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement des classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-content-wrapper">
      <div className="welcome-section">
        <h2>
          <School size={24} style={{ marginRight: '12px' }} />
          Gestion des Classes
        </h2>
        <p>Gérer les promotions et classes de l'établissement</p>
      </div>

      <div className="management-header">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Rechercher une classe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setEditingClass(null);
            setShowAddModal(true);
          }}
        >
          <Plus size={18} style={{ marginRight: '8px' }} />
          Ajouter une classe
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
              <th>Classe</th>
              <th>Année</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClasses.map((classItem) => {
              const status = getClassStatus(classItem);
              return (
                <tr key={classItem.id}>
                  <td>
                    <div className="class-info">
                      <div className="class-icon">
                        <School size={16} />
                      </div>
                      <div>
                        <div className="class-name">{classItem.nom}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="year-cell">
                      <Calendar size={14} />
                      {classItem.annee}
                    </div>
                  </td>
                  <td>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: status.color }}
                    >
                      {status.text}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon btn-edit"
                        onClick={() => handleEdit(classItem)}
                        title="Modifier"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        onClick={() => handleDelete(classItem.id)}
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredClasses.length === 0 && (
          <div className="empty-state">
            <School size={48} color="#ccc" />
            <p>Aucune classe trouvée</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingClass ? 'Modifier la classe' : 'Ajouter une classe'}</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingClass(null);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom de la classe *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({...formData, nom: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Année *</label>
                  <input
                    type="number"
                    min="2020"
                    max="2030"
                    value={formData.annee}
                    onChange={(e) => setFormData({...formData, annee: parseInt(e.target.value)})}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setShowAddModal(false);
                  setEditingClass(null);
                  resetForm();
                }}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingClass ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassesManagement;
