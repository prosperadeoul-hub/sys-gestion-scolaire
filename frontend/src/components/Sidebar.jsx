import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, role } = useAuth();
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState('dashboard');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getMenuItems = () => {
    switch (role) {
      case 'admin':
        return [
          { id: 'dashboard', label: 'Tableau de bord', icon: '📊', path: '/dashboard' },
          { id: 'users', label: 'Utilisateurs', icon: '👥', path: '/dashboard/users' },
          { id: 'courses', label: 'Cours', icon: '📚', path: '/dashboard/courses' },
          { id: 'classes', label: 'Classes', icon: '🏫', path: '/dashboard/classes' },
          { id: 'settings', label: 'Paramètres', icon: '⚙️', path: '/dashboard/settings' },
        ];
      case 'teacher':
        return [
          { id: 'dashboard', label: 'Tableau de bord', icon: '📊', path: '/dashboard' },
          { id: 'courses', label: 'Mes Cours', icon: '📚', path: '/dashboard/courses' },
          { id: 'students', label: 'Étudiants', icon: '🎓', path: '/dashboard/students' },
          { id: 'grades', label: 'Notes', icon: '📝', path: '/dashboard/grades' },
        ];
      case 'student':
        return [
          { id: 'dashboard', label: 'Tableau de bord', icon: '📊', path: '/dashboard' },
          { id: 'courses', label: 'Mes Cours', icon: '📚', path: '/dashboard/courses' },
          { id: 'grades', label: 'Mes Notes', icon: '📝', path: '/dashboard/grades' },
          { id: 'schedule', label: 'Emploi du temps', icon: '📅', path: '/dashboard/schedule' },
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  const handleNavigation = (path, itemId) => {
    setActiveItem(itemId);
    navigate(path);
    if (window.innerWidth <= 768) {
      onClose();
    }
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>EduManager</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="user-info">
          <div className="user-avatar">
            {user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
          </div>
          <div className="user-details">
            <div className="user-name">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="user-role">{role}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeItem === item.id ? 'active' : ''}`}
              onClick={() => handleNavigation(item.path, item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            <span className="nav-label">Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
