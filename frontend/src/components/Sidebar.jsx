import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Users, BookOpen, Layers, Settings, ClipboardList, Calendar, LogOut, X, LayoutTemplate, MapPin, FileText } from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeItem, setActiveItem] = useState('dashboard');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getMenuItems = () => {
    switch (role) {
      case 'ADMIN':
        return [
          { id: 'dashboard', label: 'Tableau de bord', icon: <Home size={18} />, path: '/' },
          { id: 'users', label: 'Utilisateurs', icon: <Users size={18} />, path: 'users' },
          { id: 'courses', label: 'Cours', icon: <BookOpen size={18} />, path: 'courses' },
          { id: 'classes', label: 'Promotions', icon: <Layers size={18} />, path: 'classes' },
          { id: 'salles', label: 'Salles', icon: <MapPin size={18} />, path: 'salles' },
          { id: 'scheduler', label: 'Planning', icon: <LayoutTemplate size={18} />, path: 'scheduler' },
          { id: 'settings', label: 'Paramètres', icon: <Settings size={18} />, path: 'settings' },
        ];
      case 'ENSEIGNANT':
        return [
          { id: 'dashboard', label: 'Tableau de bord', icon: <Home size={18} />, path: '/' },
          { id: 'courses', label: 'Mes Cours', icon: <BookOpen size={18} />, path: 'courses' },
          { id: 'students', label: 'Étudiants', icon: <Users size={18} />, path: 'students' },
          { id: 'grades', label: 'Notes', icon: <ClipboardList size={18} />, path: 'grades' },
        ];
      case 'ETUDIANT':
        return [
          { id: 'dashboard', label: 'Tableau de bord', icon: <Home size={18} />, path: '/' },
          { id: 'courses', label: 'Mes Cours', icon: <BookOpen size={18} />, path: 'courses' },
          { id: 'bulletin', label: 'Bulletin', icon: <FileText size={18} />, path: 'grades' },
          { id: 'schedule', label: 'Emploi du temps', icon: <Calendar size={18} />, path: 'schedule' },
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  useEffect(() => {
    const currentPath = location.pathname;
    const relativePath = currentPath.replace('/dashboard', '') || '/';
    const normalizedPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;

    let activeItemId = 'dashboard';
    let maxMatchLength = 0;

    menuItems.forEach((item) => {
      const itemPath = item.path === '/' ? '' : item.path;
      if (
        normalizedPath === itemPath ||
        (itemPath && normalizedPath.startsWith(`${itemPath}/`))
      ) {
        if (itemPath.length > maxMatchLength) {
          activeItemId = item.id;
          maxMatchLength = itemPath.length;
        }
      }
    });

    setActiveItem(activeItemId);
  }, [location.pathname, menuItems]);

  const handleNavigation = (path, itemId) => {
    setActiveItem(itemId);
    const targetPath = path === '/' ? '/dashboard' : `/dashboard/${path}`;
    navigate(targetPath);
    if (window.innerWidth <= 768) {
      onClose();
    }
  };

  return (
    <>
      {isOpen && typeof window !== 'undefined' && window.innerWidth <= 768 && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>EduManager</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="user-info">
          <div className="user-avatar">
            {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
          </div>
          <div className="user-details">
            <div className="user-name">
              {user?.full_name || user?.username}
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
              <span className="nav-icon" aria-hidden>{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout} aria-label="Se déconnecter">
            <span className="nav-icon"><LogOut size={20} /></span>
            <span className="nav-label">Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
