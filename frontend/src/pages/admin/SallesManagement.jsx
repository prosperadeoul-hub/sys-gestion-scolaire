import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, MapPin, Users, Calendar, Clock } from 'lucide-react';
import api from '../../api/axios';
import './SallesManagement.css';

const SallesManagement = () => {
  const [salles, setSalles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSalle, setEditingSalle] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    capacite: 30,
    equipement: '',
    statut: 'DISPONIBLE'
  });

  useEffect(() => {
    fetchSalles();
  }, []);

  const fetchSalles = async () => {
    try {
      setLoading(true);
      const response = await api.get('admin/salles/');
      setSalles(response.data || []);
    } catch (err) {
      setError('Erreur lors du chargement des salles');
      console.error('Error fetching salles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSalle) {
        await api.put(`admin/salles/${editingSalle.id}/`, formData);
      } else {
        await api.post('admin/salles/', formData);
      }
      fetchSalles();
      setShowModal(false);
      setEditingSalle(null);
      resetForm();
    } catch (err) {
      setError(`Erreur lors de la sauvegarde: ${err.response?.data?.detail || err.message}`);
      console.error('Error saving salle:', err);
    }
  };

  const handleEdit = (salle) => {
    setEditingSalle(salle);
    setFormData({
      nom: salle.nom,
      capacite: salle.capacite,
      equipement: salle.equipement || '',
      statut: salle.statut
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette salle ?')) return;
    try {
      await api.delete(`admin/salles/${id}/`);
      fetchSalles();
    } catch (err) {
      setError('Erreur lors de la suppression');
      console.error('Error deleting salle:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      capacite: 30,
      equipement: '',
      statut: 'DISPONIBLE'
    });
  };

  const openAddModal = () => {
    resetForm();
    setEditingSalle(null);
    setShowModal(true);
  };

  const getStatutColor = (statut) => {
    switch (statut) {
      case 'DISPONIBLE': return '#10b981';
      case 'OCCUPEE': return '#f59e0b';
      case 'MAINTENANCE': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const filteredSalles = salles.filter(salle =>
    salle.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    salle.equipement?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="management-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement des salles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="management-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="management-container">
      <div className="management-header">
        <h1>
          <MapPin size={28} />
          Gestion des Salles
        </h1>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} /> Ajouter une salle
        </button>
      </div>

      {/* Stats rapides */}
      <div className="quick-stats">
        <div className="stat-box">
          <div className="stat-icon" style={{ background: '#3b82f6' }}>
            <MapPin size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{salles.length}</div>
            <div className="stat-label">Total salles</div>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-icon" style={{ background: '#10b981' }}>
            <Calendar size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{salles.filter(s => s.statut === 'DISPONIBLE').length}</div>
            <div className="stat-label">Disponibles</div>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-icon" style={{ background: '#f59e0b' }}>
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{salles.filter(s => s.statut === 'OCCUPEE').length}</div>
            <div className="stat-label">Occupées</div>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-icon" style={{ background: '#ef4444' }}>
            <Users size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{salles.reduce((acc, s) => acc + s.capacite, 0)}</div>
            <div className="stat-label">Capacité totale</div>
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="search-bar">
        <Search size={18} />
        <input
          type="text"
          placeholder="Rechercher une salle..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tableau des salles */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Capacité</th>
              <th>Équipement</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSalles.map((salle) => (
              <tr key={salle.id}>
                <td>
                  <div className="cell-with-icon">
                    <MapPin size={16} />
                    {salle.nom}
                  </div>
                </td>
                <td>
                  <div className="capacity-badge">
                    <Users size={14} />
                    {salle.capacite} places
                  </div>
                </td>
                <td>{salle.equipement || '-'}</td>
                <td>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: getStatutColor(salle.statut) + '20',
                      color: getStatutColor(salle.statut),
                      border: `1px solid ${getStatutColor(salle.statut)}`
                    }}
                  >
                    {salle.statut}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="action-btn edit"
                      onClick={() => handleEdit(salle)}
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDelete(salle.id)}
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
      </div>

      {filteredSalles.length === 0 && !loading && (
        <div className="empty-state">
          <MapPin size={48} />
          <p>Aucune salle trouvée</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingSalle ? 'Modifier la salle' : 'Nouvelle salle'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Nom de la salle *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                  placeholder="Ex: Salle A101"
                  required
                />
              </div>

              <div className="form-group">
                <label>Capacité *</label>
                <input
                  type="number"
                  value={formData.capacite}
                  onChange={(e) => setFormData({...formData, capacite: parseInt(e.target.value) || 0})}
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label>Équipement</label>
                <input
                  type="text"
                  value={formData.equipement}
                  onChange={(e) => setFormData({...formData, equipement: e.target.value})}
                  placeholder="Ex: Projecteur, tableau, ordinateurs..."
                />
              </div>

              <div className="form-group">
                <label>Statut *</label>
                <select
                  value={formData.statut}
                  onChange={(e) => setFormData({...formData, statut: e.target.value})}
                  required
                >
                  <option value="DISPONIBLE">Disponible</option>
                  <option value="OCCUPEE">Occupée</option>
                  <option value="MAINTENANCE">En maintenance</option>
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSalle ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SallesManagement;
