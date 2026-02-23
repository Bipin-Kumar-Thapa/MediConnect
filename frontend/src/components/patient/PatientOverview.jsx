import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MdCalendarToday, 
  MdDescription, 
  MdScience, 
  MdMedication,
  MdDownload,
  MdCheckCircle,
  MdPending,
  MdCancel,
  MdPerson,
  MdWc,
  MdCake,
  MdLocalHospital,
  MdNotifications,
  MdPriorityHigh,
  MdArrowForward
} from 'react-icons/md';
import '../../styles/patient/PatientOverview.css';

const Overview = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/patient/overview/', {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        setOverview(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="overview-page">Loading...</div>;
  }

  // Patient info stats - ID, Gender, Age, Blood Group
  const patientStats = [
    { label: 'Patient ID', value: overview?.patient_id ?? '-', unit: '', icon: MdPerson, color: '#3B82F6' },
    { label: 'Gender', value: overview?.gender ?? '-', unit: '', icon: MdWc, color: '#8B5CF6' },
    { label: 'Age', value: overview?.age ?? '-', unit: 'years', icon: MdCake, color: '#10B981' },
    { label: 'Blood Group', value: overview?.blood_group ?? '-', unit: '', icon: MdLocalHospital, color: '#EF4444' }
  ];

  // Quick stats with icons and navigation paths
  const quickStats = [
    { 
      label: 'Total Appointments', 
      value: overview?.total_appointments ?? 0, 
      icon: MdCalendarToday, 
      color: '#3B82F6',
      bgColor: '#DBEAFE',
      path: '/patient/appointments'
    },
    { 
      label: 'Active Prescriptions', 
      value: overview?.active_prescriptions ?? 0, 
      icon: MdDescription, 
      color: '#10B981',
      bgColor: '#D1FAE5',
      path: '/patient/prescriptions'
    },
    { 
      label: 'Lab Reports', 
      value: overview?.lab_reports ?? 0, 
      icon: MdScience, 
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
      path: '/patient/reports'
    },
    { 
      label: 'Medications', 
      value: overview?.today_medicines ?? 0, 
      icon: MdMedication, 
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      path: '/patient/medicine'
    }
  ];

  // ✅ Get data from backend
  const upcomingAppointments = overview?.upcoming_appointments_list || [];
  const recentPrescriptions = overview?.active_prescriptions_list || [];
  const recentLabReports = overview?.recent_lab_reports || [];
  const notifications = overview?.notifications || [];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return <MdCheckCircle />;
      case 'pending': return <MdPending />;
      case 'cancelled': return <MdCancel />;
      default: return <MdCheckCircle />;
    }
  };

  const getPriorityClass = (priority) => {
    return `priority-${priority}`;
  };

  const handleBookAppointment = () => {
    navigate('/patient/appointments');
  };

  const handleQuickStatClick = (path) => {
    navigate(path);
  };

  // Click on appointment card → go to appointments page and highlight that appointment
  const handleAppointmentCardClick = (appointmentId) => {
    navigate(`/patient/appointments?highlight=${appointmentId}`);
  };

  const handlePrescriptionCardClick = (prescriptionId) => {
    navigate(`/patient/prescriptions?highlight=${prescriptionId}`);
  };

  const handleLabReportCardClick = (reportId) => {
    navigate(`/patient/reports?highlight=${reportId}`);
  };

  return (
    <div className="overview-page">

      {/* Header Section */}
      <div className="page-header">
        <div className="header-content">
          <h1>Welcome back, {overview?.name || 'Patient'}! 👋</h1>
          <p>Here's your health overview for today</p>
        </div>
        <button className="btn-primary" onClick={handleBookAppointment}>
          <MdCalendarToday />
          Book Appointment
        </button>
      </div>

      {/* Patient Info Stats Cards */}
      <div className="health-stats-grid">
        {patientStats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="health-stat-card">
              <div className="stat-icon" style={{ backgroundColor: `${stat.color}15` }}>
                <IconComponent style={{ color: stat.color }} size={24} />
              </div>
              <div className="stat-content">
                <p className="stat-label">{stat.label}</p>
                <div className="stat-value-group">
                  <h3 className="stat-value">{stat.value}</h3>
                  {stat.unit && <span className="stat-unit">{stat.unit}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Stats - Clickable WITH ICONS */}
      <div className="quick-stats-grid">
        {quickStats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div 
              key={index} 
              className="quick-stat-card-new"
              onClick={() => handleQuickStatClick(stat.path)}
            >
              <div className="stat-icon-large" style={{ backgroundColor: stat.bgColor }}>
                <IconComponent style={{ color: stat.color }} size={32} />
              </div>
              <div className="stat-info-new">
                <h2>{stat.value}</h2>
                <p>{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid with Notifications */}
      <div className="content-grid-with-sidebar">
        
        {/* Left Column - Appointments and Prescriptions */}
        <div className="main-content-column">

          {/* Upcoming Appointments with View All button */}
          <div className="section-card">
            <div className="section-header-clean">
              <h3>
                <MdCalendarToday size={20} />
                Upcoming Appointments
              </h3>
              {/* View All Button */}
              <button 
                className="view-all-btn"
                onClick={() => navigate('/patient/appointments')}
              >
                View All
                <MdArrowForward size={16} />
              </button>
            </div>

            <div className="appointments-list">
              {upcomingAppointments.length === 0 ? (
                <p className="empty-text">No upcoming appointments</p>
              ) : (
                upcomingAppointments.map((appointment) => (
                  // Clicking card navigates to appointments page with highlight
                  <div 
                    key={appointment.id} 
                    className="appointment-card clickable-card"
                    onClick={() => handleAppointmentCardClick(appointment.id)}
                  >
                    <div className="appointment-left">
                      {/* Show doctor photo if available, else initials */}
                      {appointment.doctorPhoto ? (
                        <img 
                          src={appointment.doctorPhoto}
                          alt={appointment.doctor}
                          className="doctor-avatar-photo"
                        />
                      ) : (
                        <div className="doctor-avatar">{appointment.avatar}</div>
                      )}
                      <div className="appointment-info">
                        <h4>{appointment.doctor}</h4>
                        <p>{appointment.specialty}</p>
                      </div>
                    </div>

                    <div className="appointment-right">
                      <div className="appointment-datetime">
                        <span className="date">{appointment.date}</span>
                        <span className="time">{appointment.time}</span>
                      </div>

                      <span className={`status-badge status-${appointment.status}`}>
                        {getStatusIcon(appointment.status)}
                        {appointment.status}
                      </span>
                    </div>

                    {/* Arrow hint for clickable card */}
                    <div className="card-arrow">
                      <MdArrowForward size={16} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Prescriptions with View All button */}
          <div className="section-card">
            <div className="section-header-clean">
              <h3>
                <MdDescription size={20} />
                Active Prescriptions
              </h3>
              {/* View All Button */}
              <button 
                className="view-all-btn"
                onClick={() => navigate('/patient/prescriptions')}
              >
                View All
                <MdArrowForward size={16} />
              </button>
            </div>

            <div className="prescriptions-list">
              {recentPrescriptions.length === 0 ? (
                <p className="empty-text">No active prescriptions</p>
              ) : (
                recentPrescriptions.map(prescription => (
                  <div key={prescription.id} className="prescription-item clickable-card"
                    onClick={() => handlePrescriptionCardClick(prescription.id)}
                  >
                    <div className="prescription-icon">
                      <MdMedication size={20} />
                    </div>
                    <div className="prescription-details">
                      <h4>{prescription.name} <span>{prescription.dosage}</span></h4>
                      <p>{prescription.frequency} • {prescription.duration}</p>
                      <span className="prescribed-by">Prescribed by {prescription.doctor}</span>
                    </div>
                    <div className="card-arrow"><MdArrowForward size={16} /></div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Notifications */}
        <div className="sidebar-column">
          <div className="section-card">
            <div className="section-header-clean">
              <h3>
                <MdNotifications size={20} />
                Notifications
              </h3>
            </div>

            <div className="notifications-list">
              {notifications.length === 0 ? (
                <p className="empty-text">No notifications</p>
              ) : (
                notifications.map((notification) => (
                  <div key={notification.id} className={`notification-item ${getPriorityClass(notification.priority)}`}>
                    <div className="notification-icon">
                      <MdPriorityHigh size={18} />
                    </div>
                    <div className="notification-content">
                      <h4>{notification.title}</h4>
                      <p>{notification.message}</p>
                      <span className="notification-time">{notification.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Lab Reports with View All button */}
      <div className="section-card full-width">
        <div className="section-header-clean">
          <h3>
            <MdScience size={20} />
            Recent Lab Reports
          </h3>
          {/* View All Button */}
          <button 
            className="view-all-btn"
            onClick={() => navigate('/patient/reports')}
          >
            View All
            <MdArrowForward size={16} />
          </button>
        </div>

        <div className="lab-reports-grid">
          {recentLabReports.length === 0 ? (
            <p className="empty-text">No lab reports available</p>
          ) : (
            recentLabReports.map(report => (
              <div key={report.id} className="lab-report-card clickable-card"
                onClick={() => handleLabReportCardClick(report.id)}
              >
                <div className="report-header">
                  <div className="report-icon"><MdScience size={24} /></div>
                  <span className={`report-status status-${report.status}`}>{report.status}</span>
                </div>
                <h4>{report.test_name}</h4>
                <p className="report-date">{report.date}</p>
                <button className="download-btn">
                  <MdDownload size={18} /> Download
                </button>
                <div className="card-arrow"><MdArrowForward size={16} /></div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};

export default Overview;