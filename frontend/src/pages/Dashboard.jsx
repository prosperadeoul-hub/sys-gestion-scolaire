import { useState, useEffect } from 'react';
import { useRoutes, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import TeacherDashboard from '../components/dashboard/TeacherDashboard';
import StudentDashboard from '../components/dashboard/StudentDashboard';
import UsersManagement from './admin/UsersManagement';
import CoursesManagement from './admin/CoursesManagement';
import ClassesManagement from './admin/ClassesManagement';
import SallesManagement from './admin/SallesManagement';
import SettingsPage from './admin/SettingsPage';
import AdminScheduler from './admin/AdminScheduler';
import TeacherCourses from './teacher/TeacherCourses';
import TeacherStudents from './teacher/TeacherStudents';
import StudentCourses from './student/StudentCourses';
import StudentSchedule from './student/StudentSchedule';
import StudentBulletin from './student/StudentBulletin';
import './Dashboard.css';

const Dashboard = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth > 768 : true);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Composants de pages
  const UsersPage = () => <UsersManagement />;
  const CoursesPage = () => {
    if (role === 'ETUDIANT') return <StudentCourses />;
    if (role === 'ENSEIGNANT') return <TeacherCourses />;
    return <CoursesManagement />;
  };
  const ClassesPage = () => <ClassesManagement />;
  const SallesPage = () => <SallesManagement />;
  const SettingsPageComponent = () => <SettingsPage />;
  const SchedulerPage = () => <AdminScheduler />;

  const StudentsPage = () => <StudentCourses />;
  const TeacherStudentsPage = () => <TeacherStudents />;

  const GradesPage = () => {
    if (role === 'ENSEIGNANT') return <TeacherCourses />;
    // Pour les étudiants, afficher le bulletin
    return <StudentBulletin />;
  };

  const SchedulePage = () => <StudentSchedule />;

  const renderDashboard = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement des statistiques...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-state">
          <p>{error}</p>
        </div>
      );
    }

    try {
      switch (role) {
        case 'ADMIN':
          return <AdminDashboard stats={stats} user={user} />;
        case 'ENSEIGNANT':
          return <TeacherDashboard stats={stats} user={user} />;
        case 'ETUDIANT':
          return <StudentDashboard stats={stats} user={user} />;
        default:
          return <StudentDashboard stats={stats} user={user} />;
      }
    } catch (renderErr) {
      console.error('Dashboard render error:', renderErr);
      return (
        <div className="error-state">
          <p>Erreur lors de l'affichage du tableau de bord.</p>
        </div>
      );
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      setLoading(true);
      setError('');

      try {
        let endpoint;
        switch (role) {
          case 'ADMIN':
            endpoint = 'admin/stats/';
            break;
          case 'ENSEIGNANT':
            endpoint = 'teacher/dashboard/';
            break;
          case 'ETUDIANT':
            endpoint = 'student/dashboard-stats/';
            break;
          default:
            endpoint = 'student/dashboard-stats/';
        }

        const response = await api.get(endpoint);
        if (!isMounted) return;
        setStats(response.data ?? null);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          // force logout and redirect to login
          try {
            logout();
          } catch (e) {
            console.error('Logout failed:', e);
          }
          navigate('/login');
          return;
        }
        if (isMounted) setError('Impossible de charger les statistiques. Veuillez réessayer.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, [role, logout, navigate]);

   const routes = useRoutes([
     { path: '/', element: renderDashboard() },
     { path: 'users', element: <UsersPage /> },
     { path: 'courses', element: <CoursesPage /> },
     { path: 'classes', element: <ClassesPage /> },
     { path: 'salles', element: <SallesPage /> },
     { path: 'settings', element: <SettingsPageComponent /> },
     { path: 'students', element: role === 'ENSEIGNANT' ? <TeacherStudentsPage /> : <StudentsPage /> },
     { path: 'grades', element: <GradesPage /> },
     { path: 'schedule', element: <SchedulePage /> },
     { path: 'scheduler', element: role === 'ADMIN' ? <SchedulerPage /> : <SchedulePage /> },
   ]);

  const getTitle = () => {
    const path = location.pathname.replace('/dashboard', '');
    switch (path) {
      case '/':
        switch (role) {
          case 'ADMIN':
            return 'Tableau de bord Administrateur';
          case 'ENSEIGNANT':
            return 'Tableau de bord Professeur';
          case 'ETUDIANT':
            return 'Tableau de bord Étudiant';
          default:
            return 'Tableau de bord';
        }
      case '/users':
        return 'Gestion des Utilisateurs';
      case '/courses':
        return 'Gestion des Cours';
      case '/classes':
        return 'Gestion des Classes';
      case '/salles':
        return 'Gestion des Salles';
      case '/settings':
        return 'Paramètres';
      case '/students':
        return 'Gestion des Étudiants';
      case '/grades':
        return role === 'ENSEIGNANT' ? 'Gestion des Notes' : 'Mon Bulletin';
      case '/schedule':
        return 'Emploi du temps';
      case '/scheduler':
        return 'Planning des Cours';
      default:
        return 'Tableau de bord';
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} title={getTitle()} />
        
        <main className="dashboard-content">
          {routes}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
