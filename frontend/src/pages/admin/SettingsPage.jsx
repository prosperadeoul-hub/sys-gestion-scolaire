import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, Database, Shield, Mail, Globe } from 'lucide-react';
import api from '../../api/axios';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    site_name: 'École Supérieure de Technologie',
    site_description: 'Système de gestion scolaire moderne',
    contact_email: 'contact@ecole.edu',
    contact_phone: '+225 01 02 03 04 05',
    address: 'Abidjan, Côte d\'Ivoire',
    academic_year_start: '09-01',
    academic_year_end: '06-30',
    max_students_per_class: 35,
    default_language: 'fr',
    timezone: 'Africa/Abidjan',
    enable_notifications: true,
    enable_email_notifications: true,
    maintenance_mode: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('admin/settings/');
      setSettings({ ...settings, ...response.data });
    } catch (err) {
      console.error('Error fetching settings:', err);
      // Use default settings if API fails
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await api.post('admin/settings/', settings);

      setSuccess('Paramètres sauvegardés avec succès !');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erreur lors de la sauvegarde des paramètres');
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleReset = () => {
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) {
      fetchSettings();
      setSuccess('Paramètres réinitialisés');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-content-wrapper">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement des paramètres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-content-wrapper">
      <div className="welcome-section">
        <h2>
          <Settings size={24} style={{ marginRight: '12px' }} />
          Paramètres Système
        </h2>
        <p>Configuration générale de l'application</p>
      </div>

      <div className="settings-actions">
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <RefreshCw size={18} className="spinning" style={{ marginRight: '8px' }} />
              Sauvegarde...
            </>
          ) : (
            <>
              <Save size={18} style={{ marginRight: '8px' }} />
              Sauvegarder
            </>
          )}
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleReset}
        >
          <RefreshCw size={18} style={{ marginRight: '8px' }} />
          Réinitialiser
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      <div className="settings-grid">
        {/* Informations générales */}
        <div className="settings-section">
          <div className="section-header">
            <Globe size={20} />
            <h3>Informations générales</h3>
          </div>
          <div className="settings-form">
            <div className="form-group">
              <label>Nom de l'établissement</label>
              <input
                type="text"
                value={settings.site_name}
                onChange={(e) => handleInputChange('site_name', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                rows={3}
                value={settings.site_description}
                onChange={(e) => handleInputChange('site_description', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Adresse</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="settings-section">
          <div className="section-header">
            <Mail size={20} />
            <h3>Contact</h3>
          </div>
          <div className="settings-form">
            <div className="form-group">
              <label>Email de contact</label>
              <input
                type="email"
                value={settings.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Téléphone</label>
              <input
                type="tel"
                value={settings.contact_phone}
                onChange={(e) => handleInputChange('contact_phone', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Configuration académique */}
        <div className="settings-section">
          <div className="section-header">
            <Database size={20} />
            <h3>Configuration académique</h3>
          </div>
          <div className="settings-form">
            <div className="form-group">
              <label>Début de l'année académique (MM-JJ)</label>
              <input
                type="text"
                placeholder="09-01"
                value={settings.academic_year_start}
                onChange={(e) => handleInputChange('academic_year_start', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Fin de l'année académique (MM-JJ)</label>
              <input
                type="text"
                placeholder="06-30"
                value={settings.academic_year_end}
                onChange={(e) => handleInputChange('academic_year_end', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Nombre maximum d'étudiants par classe</label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.max_students_per_class}
                onChange={(e) => handleInputChange('max_students_per_class', parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Paramètres système */}
        <div className="settings-section">
          <div className="section-header">
            <Shield size={20} />
            <h3>Paramètres système</h3>
          </div>
          <div className="settings-form">
            <div className="form-group">
              <label>Langue par défaut</label>
              <select
                value={settings.default_language}
                onChange={(e) => handleInputChange('default_language', e.target.value)}
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="form-group">
              <label>Fuseau horaire</label>
              <select
                value={settings.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
              >
                <option value="Africa/Abidjan">Afrique/Abidjan (UTC+0)</option>
                <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                <option value="America/New_York">Amérique/New York (UTC-5)</option>
              </select>
            </div>
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.enable_notifications}
                  onChange={(e) => handleInputChange('enable_notifications', e.target.checked)}
                />
                Activer les notifications
              </label>
            </div>
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.enable_email_notifications}
                  onChange={(e) => handleInputChange('enable_email_notifications', e.target.checked)}
                />
                Activer les notifications par email
              </label>
            </div>
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.maintenance_mode}
                  onChange={(e) => handleInputChange('maintenance_mode', e.target.checked)}
                />
                Mode maintenance
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;