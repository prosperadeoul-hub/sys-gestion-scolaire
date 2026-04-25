import { useState } from 'react';
import { Menu, Search, Bell } from 'lucide-react';
import './Topbar.css';

const Topbar = ({ onMenuClick, title }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="menu-btn" onClick={onMenuClick}>
          <Menu size={22} />
        </button>
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div className="topbar-right">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">
            <Search size={16} />
          </button>
        </form>

        <div className="topbar-actions">
          <button className="action-btn" title="Notifications">
            <Bell size={20} />
            <span className="notification-badge">3</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
