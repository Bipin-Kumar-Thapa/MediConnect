import React, { useState, useEffect } from 'react';
import { 
  MdPerson,
  MdCalendarToday,
  MdAccessTime,
  MdCheckCircle,
  MdPending,
  MdClose,
  MdPhone,
  MdEmail,
  MdLocationOn,
  MdDescription,
  MdVisibility
} from 'react-icons/md';
import { FaUserMd, FaStethoscope, FaFileMedical, FaTint } from 'react-icons/fa';
import '../../styles/doctor/DoctorOverview.css';

const DoctorOverview = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(false);

  // Fetch overview data on mount and when period changes
  useEffect(() => {
    fetchOverviewData();
  }, [selectedPeriod]);

  const fetchOverviewData = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/doctor/overview/?period=${selectedPeriod}`,
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        setOverviewData(data);
      } else {
        console.error('Failed to fetch overview data');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching overview data:', error);
      setLoading(false);
    }
  };

  const handleViewPatientDetails = async (patientId) => {
    setLoadingPatient(true);
    setShowPatientModal(true);
    
    try {
      const response = await fetch(
        `http://localhost:8000/doctor/patient/${patientId}/details/`,
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedPatient(data);
      } else {
        console.error('Failed to fetch patient details');
        alert('Failed to load patient details');
        setShowPatientModal(false);
      }
    } catch (error) {
      console.error('Error fetching patient details:', error);
      alert('Error loading patient details');
      setShowPatientModal(false);
    } finally {
      setLoadingPatient(false);
    }
  };

  const getActivityIcon = (iconType) => {
    switch (iconType) {
      case 'prescription':
        return FaFileMedical;
      case 'completed':
        return MdCheckCircle;
      case 'lab':
        return MdDescription;
      default:
        return MdCalendarToday;
    }
  };

  if (loading) {
    return <div className="doctor-overview-page">Loading...</div>;
  }

  if (!overviewData) {
    return <div className="doctor-overview-page">Error loading data</div>;
  }

  const stats = [
    { 
      label: 'Total Patients', 
      value: overviewData.stats.total_patients, 
      change: overviewData.stats.total_patients_change,
      icon: MdPerson, 
      color: '#3B82F6',
      bgColor: '#EFF6FF'
    },
    { 
      label: 'Appointments', 
      value: overviewData.stats.total_appointments, 
      change: overviewData.stats.total_appointments_change,
      icon: MdCalendarToday, 
      color: '#10B981',
      bgColor: '#D1FAE5'
    },
    { 
      label: 'Pending Consultations', 
      value: overviewData.stats.pending_consultations, 
      change: overviewData.stats.pending_consultations_change,
      icon: MdPending, 
      color: '#F59E0B',
      bgColor: '#FEF3C7'
    },
    { 
      label: 'Prescriptions Issued', 
      value: overviewData.stats.prescriptions_issued, 
      change: overviewData.stats.prescriptions_issued_change,
      icon: FaFileMedical, 
      color: '#8B5CF6',
      bgColor: '#EDE9FE'
    }
  ];

  return (
    <div className="doctor-overview-page">
      {/* Welcome Header */}
      <div className="welcome-header">
        <div className="welcome-content">
          <h1>Welcome back, Dr. {overviewData.doctorName}</h1>
          <p>Here's what's happening with your patients today</p>
        </div>
        <div className="period-selector">
          <button 
            className={`period-btn ${selectedPeriod === 'today' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('today')}
          >
            Today
          </button>
          <button 
            className={`period-btn ${selectedPeriod === 'week' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('week')}
          >
            This Week
          </button>
          <button 
            className={`period-btn ${selectedPeriod === 'month' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('month')}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: stat.bgColor, color: stat.color }}>
                <IconComponent size={28} />
              </div>
              <div className="stat-details">
                <p className="stat-label">{stat.label}</p>
                <h2 className="stat-value">{stat.value}</h2>
                <span className="stat-change">{stat.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Upcoming Appointments */}
        <div className="content-section appointments-section">
          <div className="section-header">
            <h3>Upcoming Appointments</h3>
            <a href="/doctor/appointments" className="view-all-link">View All</a>
          </div>
          <div className="appointments-list">
            {overviewData.upcoming_appointments.length === 0 ? (
              <div className="no-appointments">
                <MdCalendarToday size={48} />
                <p>No upcoming appointments</p>
              </div>
            ) : (
              overviewData.upcoming_appointments.map((appointment) => (
                <div key={appointment.appointmentId} className="appointment-item">
                  <div className="appointment-time">
                    <MdAccessTime size={20} />
                    <div>
                      <span className="appointment-date">{appointment.date}</span>
                      <span>{appointment.time}</span>
                    </div>
                  </div>
                  <div className="appointment-details">
                    <div className="patient-info">
                      {/* ✅ Show photo if available, otherwise initials */}
                      {appointment.profilePhoto ? (
                        <img 
                          src={appointment.profilePhoto} 
                          alt={appointment.patientName}
                          className="patient-avatar-photo"
                        />
                      ) : (
                        <div className="patient-avatar">
                          {appointment.patientName.split(' ').map(n => n[0]).join('')}
                        </div>
                      )}
                      <div>
                        <h4>{appointment.patientName}</h4>
                        <p>{appointment.age} yrs • {appointment.gender}</p>
                      </div>
                    </div>
                    <div className="appointment-meta">
                      <span className="appointment-type">{appointment.type}</span>
                      <p className="appointment-reason">{appointment.reason}</p>
                    </div>
                  </div>
                  <button 
                    className="btn-view-patient"
                    onClick={() => handleViewPatientDetails(appointment.id)}
                  >
                    <MdVisibility size={16} />
                    Details
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="sidebar-section">
          {/* Notifications */}
          <div className="notifications-card">
            <div className="section-header">
              <h3>Notifications</h3>
              <span className="notification-badge">{overviewData.notifications.length}</span>
            </div>
            <div className="notifications-list">
              {overviewData.notifications.length === 0 ? (
                <p className="no-data">No notifications</p>
              ) : (
                overviewData.notifications.map((notification) => (
                  <div key={notification.id} className={`notification-item priority-${notification.priority}`}>
                    <div className="notification-dot"></div>
                    <div className="notification-content">
                      <p>{notification.message}</p>
                      <span className="notification-time">{notification.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="activity-card">
            <div className="section-header">
              <h3>Recent Activity</h3>
            </div>
            <div className="activity-list">
              {overviewData.recent_activity.length === 0 ? (
                <p className="no-data">No recent activity</p>
              ) : (
                overviewData.recent_activity.map((activity) => {
                  const IconComponent = getActivityIcon(activity.icon);
                  return (
                    <div key={activity.id} className="activity-item">
                      <div className="activity-icon" style={{ backgroundColor: `${activity.color}15`, color: activity.color }}>
                        <IconComponent size={18} />
                      </div>
                      <div className="activity-content">
                        <p className="activity-action">{activity.action}</p>
                        <p className="activity-patient">{activity.patient}</p>
                        <span className="activity-time">{activity.time}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions-card">
            <h3>Quick Actions</h3>
            <div className="quick-actions-grid">
              <button className="quick-action-btn" onClick={() => window.location.href = '/doctor/consultations'}>
                <FaStethoscope size={20} />
                <span>Consultations</span>
              </button>
              <button className="quick-action-btn" onClick={() => window.location.href = '/doctor/prescriptions'}>
                <FaFileMedical size={20} />
                <span>Prescriptions</span>
              </button>
              <button className="quick-action-btn" onClick={() => window.location.href = '/doctor/reports'}>
                <MdDescription size={20} />
                <span>Lab Reports</span>
              </button>
              <button className="quick-action-btn" onClick={() => window.location.href = '/doctor/schedule'}>
                <MdCalendarToday size={20} />
                <span>Schedule</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Details Modal */}
      {showPatientModal && (
        <div className="modal-overlay" onClick={() => setShowPatientModal(false)}>
          <div className="modal-content patient-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Patient Information</h2>
              <button className="close-btn" onClick={() => setShowPatientModal(false)}>
                <MdClose size={24} />
              </button>
            </div>

            {loadingPatient ? (
              <div className="modal-body">
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <p>Loading patient details...</p>
                </div>
              </div>
            ) : selectedPatient && (
              <div className="modal-body">
                {/* Patient Header */}
                <div className="patient-header-section">
                  {/* ✅ Show photo if available in modal */}
                  {selectedPatient.profilePhoto ? (
                    <img 
                      src={selectedPatient.profilePhoto} 
                      alt={selectedPatient.name}
                      className="patient-avatar-large-photo"
                    />
                  ) : (
                    <div className="patient-avatar-large">
                      {selectedPatient.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}
                  <div className="patient-info-header">
                    <h3>{selectedPatient.name}</h3>
                    <p className="patient-id-badge">{selectedPatient.patientId}</p>
                    <div className="patient-status-row">
                      <span className={`status-badge ${selectedPatient.status.toLowerCase()}`}>
                        <MdCheckCircle size={14} />
                        {selectedPatient.status}
                      </span>
                      <div className="patient-stats-mini">
                        <span>{selectedPatient.totalVisits} Visits</span>
                        <span>•</span>
                        <span>Last: {selectedPatient.lastVisit}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Patient Details Sections */}
                <div className="patient-sections">
                  {/* Personal Information */}
                  <div className="detail-section">
                    <h4 className="section-title">
                      <MdPerson size={18} />
                      Personal Information
                    </h4>
                    <div className="detail-grid">
                      <div className="detail-item-new">
                        <span className="detail-label">Age & Gender</span>
                        <span className="detail-value">{selectedPatient.age} years • {selectedPatient.gender}</span>
                      </div>
                      <div className="detail-item-new">
                        <span className="detail-label">Blood Group</span>
                        <span className="detail-value blood-group">
                          <FaTint size={14} />
                          {selectedPatient.bloodGroup}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="detail-section">
                    <h4 className="section-title">
                      <MdPhone size={18} />
                      Contact Information
                    </h4>
                    <div className="detail-grid">
                      <div className="detail-item-new">
                        <span className="detail-label">Email Address</span>
                        <span className="detail-value">{selectedPatient.email}</span>
                      </div>
                      <div className="detail-item-new">
                        <span className="detail-label">Phone Number</span>
                        <span className="detail-value">{selectedPatient.phone}</span>
                      </div>
                      <div className="detail-item-new full-width">
                        <span className="detail-label">Address</span>
                        <span className="detail-value">{selectedPatient.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="detail-section">
                    <h4 className="section-title">
                      <MdPhone size={18} />
                      Emergency Contact
                    </h4>
                    <div className="detail-grid">
                      <div className="detail-item-new">
                        <span className="detail-label">Contact Name</span>
                        <span className="detail-value">{selectedPatient.emergencyContactName}</span>
                      </div>
                      <div className="detail-item-new">
                        <span className="detail-label">Contact Number</span>
                        <span className="detail-value">{selectedPatient.emergencyContact}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorOverview;