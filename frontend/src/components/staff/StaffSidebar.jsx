import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MdDashboard,
  MdUpload,
  MdScience,
  MdLocalHospital,
  MdLogout,
  MdMenu,
  MdClose
} from 'react-icons/md';
import '../../styles/staff/StaffSidebar.css';

const StaffSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [staffData, setStaffData] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Fetch sidebar data on mount
  useEffect(() => {
    fetch('http://localhost:8000/staff/sidebar/', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (!data.error) setStaffData(data);
      })
      .catch(err => console.error('Failed to load staff sidebar:', err));
  }, []);

  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <MdDashboard />,
      path: '/staff/overview',
      badge: null
    },
    {
      id: 'upload',
      label: 'Upload Lab Report',
      icon: <MdUpload />,
      path: '/staff/upload',
      badge: null
    },
    {
      id: 'reports',
      label: 'Lab Reports',
      icon: <MdScience />,
      path: '/staff/reports',
      badge: null
    }
  ];

  const isActive = (path) => location.pathname === path;

  const handleNav = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleProfileClick = () => {
    navigate('/staff/profile');
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      try {
        const getCookie = (name) => {
          let cookieValue = null;
          if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
              const cookie = cookies[i].trim();
              if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
              }
            }
          }
          return cookieValue;
        };

        await fetch('http://localhost:8000/staff/logout/', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'X-CSRFToken': getCookie('csrftoken'),
          }
        });

        // ✅ Clear login state
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');

        navigate('/login');
      } catch (error) {
        console.error('Logout error:', error);
        
        // ✅ Clear login state even on error
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        
        navigate('/login');
      }
    }
  };

  // Display values — fallback while loading
  const displayName = staffData?.name || 'Staff';
  const displayId   = staffData?.staff_id || '—';
  const initials    = staffData?.initials || 'ST';
  const photoUrl    = staffData?.photo_url;

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="ssb-mobile-topbar">
        <button className="ssb-hamburger" onClick={() => setMobileOpen(true)}>
          <MdMenu />
        </button>
      </div>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div className="ssb-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`ssb-sidebar ${mobileOpen ? 'ssb-sidebar--open' : ''}`}>

        {/* Logo */}
        <div className="ssb-logo">
          <div className="logo-icon">
            <img src="/images/Logo.png" alt="Logo" />
          </div>
          <div className="ssb-logo-text">
            <h2>MediConnect</h2>
            <span>Staff Portal</span>
          </div>
          <button className="ssb-close-btn" onClick={() => setMobileOpen(false)}>
            <MdClose />
          </button>
        </div>

        {/* Profile */}
        <div className="ssb-profile">
          <div
            className="ssb-profile-card"
            onClick={handleProfileClick}
            title="View Profile"
          >
            {/* Photo or initials */}
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={displayName}
                className="ssb-avatar-photo"
              />
            ) : (
              <div className="ssb-avatar">{initials}</div>
            )}
            <div className="ssb-profile-info">
              <h4>{displayName}</h4>
              <span>{displayId}</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="ssb-nav">
          <p className="ssb-nav-label">Menu</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`ssb-nav-item ${isActive(item.path) ? 'ssb-nav-item--active' : ''}`}
              onClick={() => handleNav(item.path)}
            >
              <span className="ssb-nav-icon">{item.icon}</span>
              <span className="ssb-nav-label-text">{item.label}</span>
              {item.badge && (
                <span className="ssb-nav-badge">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="ssb-footer">
          <button
            className="ssb-logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <MdLogout />
            <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>

      </aside>
    </>
  );
};

export default StaffSidebar;