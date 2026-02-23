import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MdDashboard,
  MdCalendarToday,
  MdPerson,
  MdMedication,
  MdScience,
  MdNoteAlt,
  MdSchedule,
  MdLogout,
  MdMenu,
  MdClose
} from 'react-icons/md';
import { FaUserMd } from 'react-icons/fa';
import { getCSRFToken } from '../../utils/csrf';
import '../../styles/doctor/DoctorSidebar.css';

const DoctorSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [doctorData, setDoctorData] = useState({
    name: 'Loading...',
    doctor_id: '---',
    specialty: 'Loading...',
    initials: 'D',
    profile_photo: null  // ✅ Added
  });

  // Fetch doctor data on component mount
  useEffect(() => {
    fetchDoctorData();
  }, []);

  // ✅ Listen for profile image updates
  useEffect(() => {
    const handleProfileImageUpdate = (e) => {
      console.log('Sidebar received image update:', e.detail);
      setDoctorData(prev => ({
        ...prev,
        profile_photo: e.detail.photoUrl
      }));
    };

    window.addEventListener('profileImageUpdated', handleProfileImageUpdate);

    return () => {
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate);
    };
  }, []);

  const fetchDoctorData = async () => {
    try {
      const response = await fetch('http://localhost:8000/doctor/sidebar-data/', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setDoctorData(data);
      } else {
        console.error('Failed to fetch doctor data');
      }
    } catch (error) {
      console.error('Error fetching doctor data:', error);
    }
  };

  const menuItems = [
    { path: '/doctor/overview', icon: MdDashboard, label: 'Overview' },
    { path: '/doctor/appointments', icon: MdCalendarToday, label: 'Appointments' },
    { path: '/doctor/prescriptions', icon: MdMedication, label: 'Prescriptions' },
    { path: '/doctor/reports', icon: MdScience, label: 'Lab Reports' },
    { path: '/doctor/consultations', icon: MdNoteAlt, label: 'Consultations' },
    { path: '/doctor/schedule', icon: MdSchedule, label: 'Schedule' }
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm('Are you sure you want to logout?');
    if (confirmLogout) {
      try {
        const response = await fetch('http://localhost:8000/doctor/logout/', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
          }
        });

        if (response.ok) {
          localStorage.clear();
          navigate('/login');
        } else {
          alert('Logout failed. Please try again.');
        }
      } catch (error) {
        console.error('Logout error:', error);
        alert('An error occurred during logout');
      }
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
        {isMobileMenuOpen ? <MdClose size={24} /> : <MdMenu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div className="sidebar-overlay" onClick={toggleMobileMenu}></div>
      )}

      {/* Sidebar */}
      <div className={`doctor-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Logo/Brand Section */}
        <div className="sidebar-header">
          <div className="brand-logo">
            <img src="/images/Logo.png" alt="Logo" />
          </div>
          <div className="brand-info">
            <h2>MediConnect</h2>
            <p>Doctor Dashboard</p>
          </div>
        </div>

        {/* Doctor Profile Section */}
        <div 
          className="doctor-profile-section"
          onClick={() => handleNavigation('/doctor/profile')}
        >
          <div className="doctor-avatar">
            {doctorData.profile_photo ? (
              <img 
                src={doctorData.profile_photo} 
                alt={doctorData.name}
                className="avatar-image"
              />
            ) : (
              <span className="avatar-initials">{doctorData.initials}</span>
            )}
          </div>
          <div className="doctor-info">
            <h3>Dr. {doctorData.name}</h3>
            <p>{doctorData.specialty}</p>
            <span className="doctor-id-badge">{doctorData.doctor_id}</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          <ul className="menu-list">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <button
                    className={`menu-item ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => handleNavigation(item.path)}
                  >
                    <Icon size={22} />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Section */}
        <div className="sidebar-bottom">
          <button className="logout-btn" onClick={handleLogout}>
            <MdLogout size={22} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default DoctorSidebar;