import React, { useState, useEffect } from 'react';
import { 
  MdCalendarToday,
  MdAccessTime,
  MdPerson,
  MdCheckCircle,
  MdPending,
  MdCancel,
  MdClose,
  MdInfo,
  MdSearch,
  MdPhone,
  MdEmail,
  MdEventBusy
} from 'react-icons/md';
import { FaTint } from 'react-icons/fa';
import { getCSRFToken } from '../../utils/csrf';
import '../../styles/doctor/DoctorAppointments.css';

const DoctorAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    scheduled: 0,
    completed: 0,
    missed: 0,
    cancelled: 0
  });
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch appointments on component mount
  useEffect(() => {
    fetchAppointments();
  }, []);

  // Fetch when filters change
  useEffect(() => {
    fetchAppointments();
  }, [filterStatus, searchQuery, selectedDate]);

  const fetchAppointments = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      params.append('date', selectedDate);

      const response = await fetch(
        `http://localhost:8000/doctor/appointments/?${params.toString()}`,
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments);
        setStats(data.stats);
      } else {
        console.error('Failed to fetch appointments');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setLoading(false);
    }
  };

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  const handleMarkComplete = async (appointmentId) => {
    try {
      const response = await fetch(
        `http://localhost:8000/doctor/appointments/${appointmentId}/complete/`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
          }
        }
      );

      if (response.ok) {
        alert('Appointment marked as completed');
        setShowDetailsModal(false);
        fetchAppointments();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to mark appointment as complete');
      }
    } catch (error) {
      console.error('Error marking appointment complete:', error);
      alert('An error occurred');
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'scheduled':
        return <MdPending />;
      case 'completed':
        return <MdCheckCircle />;
      case 'cancelled':
        return <MdCancel />;
      case 'missed':
        return <MdEventBusy />;
      default:
        return <MdInfo />;
    }
  };

  const getStatusClass = (status) => {
    return `status-${status}`;
  };

  const statsArray = [
    { label: 'Total Today', value: stats.total, color: '#3B82F6' },
    { label: 'Scheduled', value: stats.scheduled, color: '#10B981' },
    { label: 'Completed', value: stats.completed, color: '#8B5CF6' },
    { label: 'Missed', value: stats.missed, color: '#EF4444' },
    { label: 'Cancelled',   value: stats.cancelled || 0,  color: '#6B7280' }
  ];

  if (loading) {
    return <div className="doctor-appointments-page">Loading...</div>;
  }

  return (
    <div className="doctor-appointments-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Appointments</h1>
          <p>Manage your patient appointments</p>
        </div>
        <div className="header-date">
          <MdCalendarToday size={18} />
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-picker"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {statsArray.map((stat, index) => (
          <div key={index} className="stat-card" style={{ borderLeftColor: stat.color }}>
            <h3>{stat.value}</h3>
            <p>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="filters-section">
        <div className="search-box">
          <MdSearch size={20} />
          <input 
            type="text" 
            placeholder="Search by patient name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${filterStatus === 'scheduled' ? 'active' : ''}`}
            onClick={() => setFilterStatus('scheduled')}
          >
            Scheduled
          </button>
          <button 
            className={`filter-btn ${filterStatus === 'completed' ? 'active' : ''}`}
            onClick={() => setFilterStatus('completed')}
          >
            Completed
          </button>
          <button 
            className={`filter-btn ${filterStatus === 'missed' ? 'active' : ''}`}
            onClick={() => setFilterStatus('missed')}
          >
            Missed
          </button>
          <button 
            className={`filter-btn ${filterStatus === 'cancelled' ? 'active' : ''}`}
            onClick={() => setFilterStatus('cancelled')}
          >
            Cancelled
          </button>
        </div>
      </div>

      {/* Appointments List */}
      <div className="appointments-list">
        {appointments.length === 0 ? (
          <div className="no-appointments">
            <MdCalendarToday size={48} />
            <h3>No appointments found</h3>
            <p>
              {filterStatus !== 'all' || searchQuery 
                ? 'Try adjusting your filters or search query'
                : 'No appointments scheduled for this date'
              }
            </p>
          </div>
        ) : (
          appointments.map((appointment) => (
            <div key={appointment.id} className="appointment-card-new">
              {/* Left Section - Avatar & Name */}
              <div className="card-section-avatar">
                {/* ✅ Show photo if available, otherwise initials */}
                {appointment.profilePhoto ? (
                  <img 
                    src={appointment.profilePhoto} 
                    alt={appointment.patientName}
                    className="patient-avatar-photo-apt"
                  />
                ) : (
                  <div className="patient-avatar-new">
                    {appointment.patientName.split(' ').map(n => n[0]).join('')}
                  </div>
                )}
                <div className="patient-name-section">
                  <h3>{appointment.patientName}</h3>
                  <p className="patient-id-text">{appointment.patientId}</p>
                </div>
              </div>

              {/* Center Section - Patient Info */}
              <div className="card-section-info">
                <div className="info-grid">
                  <div className="info-item-compact">
                    <span className="info-icon-label">
                      <MdPerson size={14} />
                      Age:
                    </span>
                    <span className="info-value-compact">{appointment.age} yrs • {appointment.gender}</span>
                  </div>
                  <div className="info-item-compact">
                    <span className="info-icon-label">
                      <FaTint size={14} />
                      Blood:
                    </span>
                    <span className="info-value-compact">{appointment.bloodGroup}</span>
                  </div>
                </div>
                
                <div className="appointment-type-reason">
                  <span className="type-badge">{appointment.type}</span>
                  <p className="reason-text">{appointment.reason}</p>
                </div>
              </div>

              {/* Right Section - Time & Actions */}
              <div className="card-section-actions">
                <div className="time-status-group">
                  <div className="time-display">
                    <MdAccessTime size={18} />
                    <span>{appointment.time}</span>
                  </div>
                  <span className={`status-badge-new ${getStatusClass(appointment.status)}`}>
                    {getStatusIcon(appointment.status)}
                    {appointment.status}
                  </span>
                </div>
                
                <div className="action-buttons-group">
                  <button 
                    className="btn-details-new"
                    onClick={() => handleViewDetails(appointment)}
                  >
                    <MdInfo size={16} />
                    Details
                  </button>
                  {appointment.status === 'scheduled' && (
                    <button 
                      className="btn-complete-new"
                      onClick={() => handleMarkComplete(appointment.id)}
                    >
                      <MdCheckCircle size={16} />
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedAppointment && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Appointment Details</h2>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>
                <MdClose size={24} />
              </button>
            </div>

            <div className="details-body">
              {/* Patient Info */}
              <div className="details-section">
                <div className="section-header-small">
                  <MdPerson size={20} />
                  <h3>Patient Information</h3>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{selectedAppointment.patientName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Patient ID:</span>
                  <span className="detail-value">{selectedAppointment.patientId}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Age:</span>
                  <span className="detail-value">{selectedAppointment.age} years</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Gender:</span>
                  <span className="detail-value">{selectedAppointment.gender}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Blood Group:</span>
                  <span className="detail-value">{selectedAppointment.bloodGroup}</span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="details-section">
                <div className="section-header-small">
                  <MdPhone size={20} />
                  <h3>Contact Information</h3>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Phone:</span>
                  <span className="detail-value">{selectedAppointment.phone}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{selectedAppointment.email}</span>
                </div>
              </div>

              {/* Appointment Info */}
              <div className="details-section">
                <div className="section-header-small">
                  <MdCalendarToday size={20} />
                  <h3>Appointment Information</h3>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">
                    {new Date(selectedAppointment.date).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Time:</span>
                  <span className="detail-value">{selectedAppointment.time}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Type:</span>
                  <span className="detail-value">{selectedAppointment.type}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className={`status-badge-new ${getStatusClass(selectedAppointment.status)}`}>
                    {getStatusIcon(selectedAppointment.status)}
                    {selectedAppointment.status}
                  </span>
                </div>
                {selectedAppointment.lastVisit && (
                  <div className="detail-row">
                    <span className="detail-label">Last Visit:</span>
                    <span className="detail-value">
                      {new Date(selectedAppointment.lastVisit).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div className="details-section">
                <div className="section-header-small">
                  <MdInfo size={20} />
                  <h3>Reason for Visit</h3>
                </div>
                <div className="reason-box">
                  {selectedAppointment.reason}
                </div>
              </div>

              {/* Actions - Only Mark Complete */}
              {selectedAppointment.status === 'scheduled' && (
                <div className="details-actions-single">
                  <button 
                    className="btn-complete-modal"
                    onClick={() => handleMarkComplete(selectedAppointment.id)}
                  >
                    <MdCheckCircle size={18} />
                    Mark as Complete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAppointments;