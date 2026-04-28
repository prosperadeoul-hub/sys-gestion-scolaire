import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Users, Mail, Phone, Calendar } from 'lucide-react';
import api from '../../api/axios';

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'ETUDIANT',
    phone: '',
    date_of_birth: '',
    address: '',
    // Student fields
    matricule: '',
    promotion_id: '',
    // Teacher fields
    specialite: '',
    matiere_ids: []
  });

  useEffect(() => {
    fetchUsers();
    fetchPromotions();
    fetchMatieres();
  }, []);

  const fetchMatieres = async () => {
    try {
      const response = await api.get('admin/courses/');
      setMatieres(response.data);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('admin/users/');
      setUsers(response.data);
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPromotions = async () => {
    try {
      const response = await api.get('admin/classes/');
      setPromotions(response.data);
    } catch (err) {
      console.error('Error fetching promotions:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        username: formData.username,
        email: formData.email,
        password: formData.password || 'default123',
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth,
        address: formData.address
      };

      // Ajouter les champs spécifiques selon le rôle
      if (formData.role === 'ETUDIANT') {
        data.matricule = formData.matricule || '';
        data.promotion_id = formData.promotion_id || null;
      } else if (formData.role === 'ENSEIGNANT') {
        data.specialite = formData.specialite || '';
        data.matiere_ids = formData.matiere_ids;
      }

      if (editingUser) {
        if (!formData.password) {
          delete data.password;
        }
        await api.put(`admin/users/${editingUser.id}/`, data);
      } else {
        await api.post('admin/users/', data);
      }

      fetchUsers();
      setShowAddModal(false);
      setEditingUser(null);
      resetForm();
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
      console.error('Error saving user:', err);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username || '',
      email: user.email || '',
      password: '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role || 'ETUDIANT',
      phone: user.phone || '',
      date_of_birth: user.date_of_birth || '',
      address: user.address || '',
      matricule: user.matricule || '',
      promotion_id: user.promotion || '',
      specialite: user.specialite || '',
      matiere_ids: [] // Dans l'édition, on ne charge pas les matières pour l'instant
    });
    setShowAddModal(true);
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      try {
        await api.delete(`admin/users/${userId}/`);
        fetchUsers();
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error('Error deleting user:', err);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'ETUDIANT',
      phone: '',
      date_of_birth: '',
      address: '',
      matricule: '',
      promotion_id: '',
      specialite: '',
      matiere_ids: []
    });
  };

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN': return '#ef4444';
      case 'ENSEIGNANT': return '#f59e0b';
      case 'ETUDIANT': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'ADMIN': return 'Administrateur';
      case 'ENSEIGNANT': return 'Enseignant';
      case 'ETUDIANT': return 'Étudiant';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="dashboard-content-wrapper">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-content-wrapper">
      <div className="welcome-section">
        <h2>
          <Users size={24} style={{ marginRight: '12px' }} />
          Gestion des Utilisateurs
        </h2>
        <p>Gérer les comptes utilisateurs de l'établissement</p>
      </div>

      <div className="management-header">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setEditingUser(null);
            setShowAddModal(true);
          }}
        >
          <Plus size={18} style={{ marginRight: '8px' }} />
          Ajouter un utilisateur
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
              <th>Utilisateur</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Téléphone</th>
              <th>Date d'inscription</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.full_name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <div className="user-name">{user.full_name || user.username}</div>
                      <div className="user-username">@{user.username}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="email-cell">
                    <Mail size={14} />
                    {user.email}
                  </div>
                </td>
                <td>
                  <span
                    className="role-badge"
                    style={{ backgroundColor: getRoleColor(user.role) }}
                  >
                    {getRoleLabel(user.role)}
                  </span>
                </td>
                <td>
                  {user.phone && (
                    <div className="phone-cell">
                      <Phone size={14} />
                      {user.phone}
                    </div>
                  )}
                </td>
                <td>
                  <div className="date-cell">
                    <Calendar size={14} />
                    {new Date(user.date_joined).toLocaleDateString('fr-FR')}
                  </div>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-icon btn-edit"
                      onClick={() => handleEdit(user)}
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleDelete(user.id)}
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

        {filteredUsers.length === 0 && (
          <div className="empty-state">
            <Users size={48} color="#ccc" />
            <p>Aucun utilisateur trouvé</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingUser ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingUser(null);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom d'utilisateur *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Mot de passe {editingUser ? '(laisser vide pour ne pas changer)' : '*'}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required={!editingUser}
                  />
                </div>
                <div className="form-group">
                  <label>Prénom</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Nom</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Rôle *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    required
                  >
                    <option value="ETUDIANT">Étudiant</option>
                    <option value="ENSEIGNANT">Enseignant</option>
                    <option value="ADMIN">Administrateur</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Téléphone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Date de naissance</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Adresse</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    rows={3}
                  />
                </div>

                 {/* Champs spécifiques aux étudiants */}
                 {formData.role === 'ETUDIANT' && (
                   <>
                     {editingUser ? (
                       <div className="form-group">
                         <label>Matricule</label>
                         <input
                           type="text"
                           value={formData.matricule}
                           disabled
                         />
                       </div>
                     ) : (
                       <div className="form-group">
                         <label>Matricule</label>
                         <input
                           type="text"
                           value="Généré automatiquement"
                           disabled
                           placeholder="Généré automatiquement"
                         />
                       </div>
                     )}
                     <div className="form-group">
                       <label>Promotion</label>
                       <select
                         value={formData.promotion_id}
                         onChange={(e) => setFormData({...formData, promotion_id: e.target.value})}
                       >
                         <option value="">Aucune promotion</option>
                         {promotions.map(promo => (
                           <option key={promo.id} value={promo.id}>
                             {promo.nom} ({promo.annee})
                           </option>
                         ))}
                       </select>
                     </div>
                   </>
                 )}

                 {/* Champs spécifiques aux enseignants */}
                 {formData.role === 'ENSEIGNANT' && (
                   <>
                      <div className="form-group">
                        <label>Spécialité</label>
                        <input
                          type="text"
                          value={formData.specialite}
                          onChange={(e) => setFormData({...formData, specialite: e.target.value})}
                        />
                      </div>
                     {!editingUser && (
                       <div className="form-group">
                         <label>Matieres enseignées</label>
                         <select
                           multiple
                           value={formData.matiere_ids}
                           onChange={(e) => {
                             const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                             setFormData({...formData, matiere_ids: selected});
                           }}
                           style={{ minHeight: '120px' }}
                         >
                           {matieres.map(m => (
                             <option key={m.id} value={m.id}>
                               {m.nom} ({m.code})
                             </option>
                           ))}
                         </select>
                         <small>Maintenez Ctrl/Cmd pour sélectionner plusieurs matières</small>
                       </div>
                     )}
                   </>
                 )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setShowAddModal(false);
                  setEditingUser(null);
                  resetForm();
                }}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
