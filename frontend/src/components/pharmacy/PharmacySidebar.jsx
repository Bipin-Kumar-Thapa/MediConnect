import React, { useState } from 'react';
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

  const menuItems = [
    { path: '/pharmacy/overview', icon: <MdDashboard />, label: 'Overview', badge: null },
    { path: '/pharmacy/prescriptions', icon: <MdDescription />, label: 'Prescriptions', badge: '5' },
    { path: '/pharmacy/requests', icon: <MdNotifications />, label: 'Patient Requests', badge: '3' },
    { path: '/pharmacy/stock', icon: <MdInventory />, label: 'Medicine Stock', badge: null }
  ];

  const isActive = (path) => location.pathname === path;

  const handleNavigation = (path) => {
    navigate(path);
    setIsMobileOpen(false);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      navigate('/login');
    }
  };

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
          <div className="phsb-logo-icon">
            <MdLocalPharmacy />
          </div>
          <div className="phsb-logo-text">
            <h2>MediConnect</h2>
            <span>Pharmacy Portal</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="phsb-nav">
          <p className="phsb-nav-label">Menu</p>
          {menuItems.map((item) => (
            <button
              key={item.path}
              className={`phsb-nav-item ${isActive(item.path) ? 'phsb-nav-item--active' : ''}`}
              onClick={() => handleNavigation(item.path)}
            >
              <span className="phsb-nav-icon">{item.icon}</span>
              <span className="phsb-nav-text">{item.label}</span>
              {item.badge && (
                <span className="phsb-nav-badge">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

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