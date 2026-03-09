import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MdDashboard, 
  MdCalendarToday, 
  MdDescription, 
  MdScience, 
  MdMedication, 
  MdLogout,
  MdMenu,
  MdClose,
  MdBook,
  MdPerson,
} from 'react-icons/md';
import { getCSRFToken } from '../../utils/csrf';
import '../../styles/patient/Sidebar.css';

const Sidebar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userData, setUserData] = useState({
    name: 'Loading...',
    patient_id: '---',
    initials: 'P',
    profileImage: null
  });
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: MdDashboard, path: '/patient/overview' },
    { id: 'appointments', label: 'Appointments', icon: MdCalendarToday, path: '/patient/appointments' },
    { id: 'prescriptions', label: 'Prescriptions', icon: MdDescription, path: '/patient/prescriptions' },
    { id: 'lab-reports', label: 'Lab Reports', icon: MdScience, path: '/patient/reports' },
    { id: 'medicine', label: 'Medicine Schedule', icon: MdMedication, path: '/patient/medicine' },
    { id: 'history', label: 'Consultation History', icon: MdBook, path: '/patient/history' },
    { id: 'doctor', label: 'Find by Symptom', icon: MdPerson, path: '/patient/doctors' },
  ];

  // Fetch user data on component mount
  useEffect(() => {
    fetchUserData();
  }, []);

  // Listen for profile image updates from Profile page
  useEffect(() => {
    const handleProfileImageUpdate = (e) => {
      console.log('Sidebar received image update:', e.detail);
      setUserData(prev => ({
        ...prev,
        profileImage: e.detail.photoUrl
      }));
    };

    window.addEventListener('profileImageUpdated', handleProfileImageUpdate);

    return () => {
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate);
    };
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('http://localhost:8000/patient/sidebar-data/', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        setUserData({
          name: data.name,
          patient_id: data.patient_id,
          initials: data.initials,
          profileImage: data.profile_photo || null 
        });
      } else {
        console.error('Failed to fetch user data');
        if (response.status === 401 || response.status === 403) {
          navigate('/login');
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleProfileClick = () => {
    navigate('profile');
    setIsMobileMenuOpen(false);
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

        await fetch('http://localhost:8000/patient/logout/', {
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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button 
        className="mobile-menu-toggle" 
        onClick={toggleMobileMenu}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <MdClose size={24} /> : <MdMenu size={24} />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-overlay" 
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Logo Section */}
        <div className="logo-section">
          <div className="logo-icon">
            <img src="/images/Logo.png" alt="Logo" />
          </div>
          <div className="logo-text">
            <h1>MediConnect</h1>
            <p>Patient dashboard</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="nav-menu">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <div
                key={item.id}
                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => handleNavigation(item.path)}
              >
                <IconComponent className="nav-icon" size={20} />
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="user-section">
          <div className="user-profile" onClick={handleProfileClick}>
            <div className="user-avatar">
              {userData.profileImage ? (
                <img 
                  src={userData.profileImage} 
                  alt={userData.name}
                  className="avatar-image"
                />
              ) : (
                <span className="avatar-initials">{userData.initials}</span>
              )}
            </div>
            <div className="user-info">
              <div className="user-name">{userData.name}</div>
              <div className="user-id">{userData.patient_id}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <MdLogout size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;