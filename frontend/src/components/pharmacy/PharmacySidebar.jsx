import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MdDashboard,
  MdDescription,
  MdNotifications,
  MdInventory,
  MdLogout,
  MdMenu,
  MdClose,
  MdLocalPharmacy
} from 'react-icons/md';
import '../../styles/pharmacy/PharmacySidebar.css';

const PharmacySidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [sidebarData, setSidebarData] = useState(null);

  // ✅ Fetch sidebar data
  useEffect(() => {
    fetchSidebarData();
    
    // ✅ Refresh badge counts every 30 seconds
    const interval = setInterval(() => {
      fetchSidebarData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchSidebarData = async () => {
    try {
      const response = await fetch('http://localhost:8000/pharmacy/sidebar/', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setSidebarData(data);
      }
    } catch (error) {
      console.error('Error fetching sidebar data:', error);
    }
  };

  const menuItems = [
    { 
      path: '/pharmacy/overview', 
      icon: <MdDashboard />, 
      label: 'Overview',
      badge: null
    },
    { 
      path: '/pharmacy/prescriptions', 
      icon: <MdDescription />, 
      label: 'Prescriptions',
      badge: 'prescriptions' 
    },
    { 
      path: '/pharmacy/requests', 
      icon: <MdNotifications />, 
      label: 'Patient Requests',
      badge: 'requests'  
    },
    { 
      path: '/pharmacy/stock', 
      icon: <MdInventory />, 
      label: 'Medicine Stock',
      badge: null
    }
  ];

  const isActive = (path) => location.pathname === path;

  const handleNavigation = (path) => {
    navigate(path);
    setIsMobileOpen(false);
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

        await fetch('http://localhost:8000/pharmacy/logout/', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'X-CSRFToken': getCookie('csrftoken'),
          }
        });

        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');

        navigate('/login');
      } catch (error) {
        console.error('Logout error:', error);
        
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        
        navigate('/login');
      }
    }
  };

  if (!sidebarData) {
    return <div className="phsb-sidebar">Loading...</div>;
  }

  return (
    <div className="pharmacy-sidebar-wrapper">
      {/* Mobile Hamburger Button */}
      <button className="phsb-mobile-toggle" onClick={() => setIsMobileOpen(true)}>
        <MdMenu />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div className="phsb-overlay" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`phsb-sidebar ${isMobileOpen ? 'phsb-sidebar--open' : ''}`}>
        
        {/* Mobile Close Button */}
        <button className="phsb-mobile-close" onClick={() => setIsMobileOpen(false)}>
          <MdClose />
        </button>

        {/* Logo */}
        <div className="phsb-logo">
          <div className="logo-icon">
            <img src="/images/Logo.png" alt="Logo" />
          </div>
          <div className="phsb-logo-text">
            <h2>MediConnect</h2>
            <span>Pharmacy Dashboard</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="phsb-nav">
          <p className="phsb-nav-label">Menu</p>
          {menuItems.map((item) => {
            const badgeCount = item.badge && sidebarData.badges 
              ? sidebarData.badges[item.badge] 
              : 0;
            
            return (
              <button
                key={item.path}
                className={`phsb-nav-item ${isActive(item.path) ? 'phsb-nav-item--active' : ''}`}
                onClick={() => handleNavigation(item.path)}
              >
                <span className="phsb-nav-icon">{item.icon}</span>
                <span className="phsb-nav-text">{item.label}</span>
                {badgeCount > 0 && (
                  <span className="phsb-nav-badge">{badgeCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Profile Section (Clickable) */}
        <div className="phsb-profile-section">
          <div 
            className="phsb-profile-card"
            onClick={() => handleNavigation('/pharmacy/profile')}
            style={{ cursor: 'pointer' }}
          >
            {sidebarData.photo_url ? (
              <img
                src={sidebarData.photo_url}
                alt={sidebarData.name}
                className="phsb-profile-photo"
              />
            ) : (
              <div className="phsb-profile-avatar">
                {sidebarData.initials}
              </div>
            )}
            <div className="phsb-profile-info">
              <h4>{sidebarData.name}</h4>
              <span>{sidebarData.pharmacy_id}</span>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="phsb-logout-section">
          <button className="phsb-logout-btn" onClick={handleLogout}>
            <MdLogout />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PharmacySidebar;