import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  MdCalendarToday, 
  MdAccessTime,
  MdPerson,
  MdCheckCircle,
  MdPending,
  MdCancel,
  MdClose,
  MdAdd,
  MdSearch,
  MdLocationOn,
  MdInfo,
  MdEventBusy,
  MdChevronLeft,
  MdChevronRight,
  MdWarning
} from 'react-icons/md';
import { getCSRFToken } from '../../utils/csrf';
import AppointmentConfirmation from './AppointmentConfirmation';
import RescheduleModal from './RescheduleModal'; 
import '../../styles/patient/Appointments.css';

const ITEMS_PER_PAGE = 10;

const Appointments = () => {
  const location = useLocation();

  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0,
    missed: 0,
    needs_rescheduling: 0 // ← NEW STAT
  });
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [highlightedId, setHighlightedId] = useState(null);
  const [isOffDay, setIsOffDay] = useState(false);

  // ← NEW: Reschedule modal state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);

  const [availableDates, setAvailableDates] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);

  const [formData, setFormData] = useState({
    specialty: '',
    doctor_id: '',
    appointment_date: '',
    appointment_time: '',
    appointment_type: '',
    reason: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, []);

  useEffect(() => {
    fetchAppointments();
    setCurrentPage(1);
  }, [filterStatus, searchQuery]);

  // ← UPDATED: Handle both highlight and reschedule params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const highlightId = params.get('highlight');
    const rescheduleId = params.get('reschedule');

    // Handle reschedule param
    if (rescheduleId && appointments.length > 0) {
      const id = parseInt(rescheduleId);
      const appointment = appointments.find(a => a.id === id);
      
      if (appointment && appointment.status === 'needs_rescheduling') {
        setHighlightedId(id);
        
        // Find which page the appointment is on
        const appointmentIndex = appointments.findIndex(a => a.id === id);
        if (appointmentIndex !== -1) {
          const page = Math.ceil((appointmentIndex + 1) / ITEMS_PER_PAGE);
          setCurrentPage(page);
        }

        setTimeout(() => {
          const element = document.getElementById(`appointment-${rescheduleId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);

        setTimeout(() => {
          setHighlightedId(null);
        }, 4000);
      }
    }
    // Handle regular highlight param (from overview)
    else if (highlightId && appointments.length > 0) {
      const id = parseInt(highlightId);
      setHighlightedId(id);

      const appointmentIndex = appointments.findIndex(a => a.id === id);
      if (appointmentIndex !== -1) {
        const page = Math.ceil((appointmentIndex + 1) / ITEMS_PER_PAGE);
        setCurrentPage(page);
      }

      setTimeout(() => {
        const element = document.getElementById(`appointment-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);

      setTimeout(() => {
        setHighlightedId(null);
      }, 4000);
    }
  }, [location.search, appointments]);

  useEffect(() => {
    if (formData.doctor_id) {
      fetchAvailableDates();
    } else {
      setAvailableDates([]);
      setAvailableTimes([]);
      setFormData(prev => ({ ...prev, appointment_date: '', appointment_time: '' }));
    }
  }, [formData.doctor_id]);

  useEffect(() => {
    if (formData.doctor_id && formData.appointment_date) {
      fetchAvailableTimes();
    } else {
      setAvailableTimes([]);
      setFormData(prev => ({ ...prev, appointment_time: '' }));
    }
  }, [formData.appointment_date]);

  const fetchAppointments = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(
        `http://localhost:8000/patient/appointments/?${params.toString()}`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments);
        setStats(data.stats);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await fetch(
        'http://localhost:8000/patient/appointments/doctors/',
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        setDoctors(data.doctors);
        
        const uniqueSpecialties = [...new Set(
          data.doctors.map(d => ({
            code: d.specialty_code,
            name: d.specialty
          }))
        )];
        
        const specialtiesMap = new Map();
        uniqueSpecialties.forEach(s => {
          if (s.code) specialtiesMap.set(s.code, s.name);
        });
        
        const specialtiesArray = Array.from(specialtiesMap, ([code, name]) => ({
          code,
          name
        })).sort((a, b) => a.name.localeCompare(b.name));
        
        setSpecialties(specialtiesArray);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  useEffect(() => {
    if (formData.specialty) {
      setFormData(prev => ({ ...prev, doctor_id: '', appointment_date: '', appointment_time: '' }));
      setAvailableDates([]);
      setAvailableTimes([]);
    }
  }, [formData.specialty]);

  const fetchAvailableDates = async () => {
    setLoadingSlots(true);
    try {
      const response = await fetch(
        `http://localhost:8000/patient/appointments/doctor-slots/${formData.doctor_id}/`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        setAvailableDates(data.available_dates || []);
      } else {
        setAvailableDates([]);
      }
    } catch (error) {
      setAvailableDates([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const fetchAvailableTimes = async () => {
    setLoadingSlots(true);
    setIsOffDay(false);
    try {
      const response = await fetch(
        `http://localhost:8000/patient/appointments/doctor-slots/${formData.doctor_id}/?date=${formData.appointment_date}`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.off_day) {
          setIsOffDay(true);
          setAvailableTimes([]);
        } else {
          setIsOffDay(false);
          setAvailableTimes(data.available_times || []);
        }
      } else {
        setAvailableTimes([]);
      }
    } catch (error) {
      setAvailableTimes([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'confirmed':          return <MdCheckCircle />;
      case 'pending':            return <MdPending />;
      case 'cancelled':          return <MdCancel />;
      case 'completed':          return <MdCheckCircle />;
      case 'missed':             return <MdEventBusy />;
      case 'needs_rescheduling': return <MdWarning />; // ← NEW STATUS
      default:                   return <MdCheckCircle />;
    }
  };

  const getStatusClass = (status) => `status-${status}`;

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const convertTo24hr = (time12) => {
    const [time, modifier] = time12.split(' ');
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours);
    if (modifier === 'AM') {
      if (hours === 12) hours = 0;
    } else {
      if (hours !== 12) hours += 12;
    }
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const formDataToSend = {
        ...formData,
        appointment_time: convertTo24hr(formData.appointment_time)
      };

      const response = await fetch(
        'http://localhost:8000/patient/appointments/book/',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
          },
          body: JSON.stringify(formDataToSend)
        }
      );

      const data = await response.json();

      if (response.ok) {
        setShowBookingModal(false);

        const selectedDoctor = doctors.find(d => d.id === parseInt(formData.doctor_id));
        
        const dateObj = new Date(formData.appointment_date);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        });

        const formattedTime = formData.appointment_time;

        setConfirmationData({
          patientName: data.patient_name || 'Patient Name',
          patientId: data.patient_id || 'PAT-XXXX-XXX',
          doctorName: selectedDoctor?.name || 'Doctor Name',
          specialty: selectedDoctor?.specialty || 'Specialty',
          date: formattedDate,
          time: formattedTime,
          location: data.doctor_location || 'Visit Reception at Ground Floor'
        });

        setShowConfirmation(true);

        setFormData({
          specialty: '',
          doctor_id: '',
          appointment_date: '',
          appointment_time: '',
          appointment_type: '',
          reason: ''
        });
        setAvailableDates([]);
        setAvailableTimes([]);
        fetchAppointments();
      } else {
        alert(data.error || 'Failed to book appointment');
      }
    } catch (error) {
      alert('An error occurred while booking appointment');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      const response = await fetch(
        `http://localhost:8000/patient/appointments/${appointmentId}/cancel/`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
          }
        }
      );
      const data = await response.json();
      if (response.ok) {
        alert('Appointment cancelled successfully');
        setShowDetailsModal(false);
        fetchAppointments();
      } else {
        alert(data.error || 'Failed to cancel appointment');
      }
    } catch (error) {
      alert('An error occurred while cancelling appointment');
    }
  };

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  // ← NEW: Handle reschedule button click
  const handleRescheduleClick = (appointment) => {
    setRescheduleAppointment(appointment);
    setShowRescheduleModal(true);
  };

  // ← NEW: Handle reschedule success
  const handleRescheduleSuccess = () => {
    setShowRescheduleModal(false);
    setRescheduleAppointment(null);
    fetchAppointments(); // Refresh appointments list
  };

  const totalPages = Math.ceil(appointments.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentAppointments = appointments.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages = [];
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const statsArray = [
    { label: 'Total Appointments', value: stats.total,         color: '#3B82F6' },
    { label: 'Upcoming',           value: stats.upcoming,      color: '#10B981' },
    { label: 'Completed',          value: stats.completed,     color: '#8B5CF6' },
    { label: 'Cancelled',          value: stats.cancelled,     color: '#EF4444' },
    { label: 'Missed',             value: stats.missed || 0,   color: '#F59E0B' },
    { label: 'Needs Rescheduling', value: stats.needs_rescheduling || 0, color: '#F97316' } // ← NEW STAT
  ];

  if (loading) {
    return <div className="appointments-page">Loading...</div>;
  }

  return (
    <div className="appointments-page">

      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Appointments</h1>
          <p>Manage your medical appointments</p>
        </div>
        <button className="btn-primary" onClick={() => setShowBookingModal(true)}>
          <MdAdd size={20} />
          Book Appointment
        </button>
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
            placeholder="Search by doctor or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          {['all', 'pending', 'needs_rescheduling', 'missed', 'completed', 'cancelled'].map(status => (
            <button
              key={status}
              className={`filter-btn ${filterStatus === status ? 'active' : ''}`}
              onClick={() => setFilterStatus(status)}
            >
              {status === 'needs_rescheduling' ? 'Needs Action' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
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
                : 'Book your first appointment to get started'
              }
            </p>
          </div>
        ) : (
          <>
            {currentAppointments.map((appointment) => (
              <div
                key={appointment.id}
                id={`appointment-${appointment.id}`}
                className={`appointment-card ${highlightedId === appointment.id ? 'highlighted' : ''} ${
                  appointment.status === 'needs_rescheduling' ? 'needs-action' : ''
                }`}
              >
                <div className="card-left">
                  {appointment.doctorPhoto ? (
                    <img
                      src={appointment.doctorPhoto}
                      alt={appointment.doctor}
                      className="doctor-avatar-photo-apt"
                    />
                  ) : (
                    <div className="doctor-avatar">
                      {appointment.doctor.split(' ').slice(1).map(n => n[0]).join('')}
                    </div>
                  )}
                  <div className="doctor-info">
                    <h3>{appointment.doctor}</h3>
                    <p className="specialty">{appointment.specialty}</p>
                  </div>
                </div>

                <div className="card-center">
                  <div className="info-item">
                    <MdCalendarToday size={16} />
                    <span>{new Date(appointment.date).toLocaleDateString('en-US', { 
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}</span>
                  </div>
                  <div className="info-item">
                    <MdAccessTime size={16} />
                    <span>{appointment.time}</span>
                  </div>
                  <div className="info-item">
                    <MdPerson size={16} />
                    <span>{appointment.type}</span>
                  </div>
                </div>

                <div className="card-right">
                  <span className={`status-badge ${getStatusClass(appointment.status)}`}>
                    {getStatusIcon(appointment.status)}
                    {appointment.status === 'needs_rescheduling' ? 'Needs Action' : appointment.status}
                  </span>
                  
                  {/* ← UPDATED: Show Reschedule button for needs_rescheduling status */}
                  {appointment.status === 'needs_rescheduling' ? (
                    <button 
                      className="btn-reschedule"
                      onClick={() => handleRescheduleClick(appointment)}
                    >
                      <MdWarning size={18} />
                      Reschedule Now
                    </button>
                  ) : (
                    <button 
                      className="btn-view-details"
                      onClick={() => handleViewDetails(appointment)}
                    >
                      <MdInfo size={18} />
                      View Details
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination">
                <div className="pagination-info">
                  Showing {startIndex + 1}–{Math.min(endIndex, appointments.length)} of {appointments.length} appointments
                </div>
                <div className="pagination-controls">
                  <button
                    className="page-btn page-btn-nav"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <MdChevronLeft size={20} />
                  </button>

                  {getPageNumbers()[0] > 1 && (
                    <>
                      <button className="page-btn" onClick={() => handlePageChange(1)}>1</button>
                      {getPageNumbers()[0] > 2 && <span className="page-ellipsis">...</span>}
                    </>
                  )}

                  {getPageNumbers().map(page => (
                    <button
                      key={page}
                      className={`page-btn ${currentPage === page ? 'active' : ''}`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  ))}

                  {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
                    <>
                      {getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && (
                        <span className="page-ellipsis">...</span>
                      )}
                      <button className="page-btn" onClick={() => handlePageChange(totalPages)}>
                        {totalPages}
                      </button>
                    </>
                  )}

                  <button
                    className="page-btn page-btn-nav"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <MdChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="modal-overlay" onClick={() => setShowBookingModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Book New Appointment</h2>
              <button className="close-btn" onClick={() => setShowBookingModal(false)}>
                <MdClose size={24} />
              </button>
            </div>

            <form className="booking-form" onSubmit={handleBookAppointment}>

              <div className="form-group">
                <label>Select Specialty *</label>
                <select name="specialty" value={formData.specialty} onChange={handleFormChange} required>
                  <option value="">Choose a specialty...</option>
                  {specialties.map(spec => (
                    <option key={spec.code} value={spec.code}>
                      {spec.name}
                    </option>
                  ))}
                </select>
              </div>

              {formData.specialty && (
                <div className="form-group">
                  <label>Select Doctor *</label>
                  <select name="doctor_id" value={formData.doctor_id} onChange={handleFormChange} required>
                    <option value="">Choose a doctor...</option>
                    {doctors
                      .filter(doctor => doctor.specialty_code === formData.specialty)
                      .map(doctor => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.name}
                        </option>
                      ))}
                  </select>
                  {doctors.filter(d => d.specialty_code === formData.specialty).length === 0 && (
                    <p className="error-text" style={{marginTop: '8px', fontSize: '13px'}}>
                      No doctors available for this specialty
                    </p>
                  )}
                </div>
              )}

              {formData.doctor_id && (
                <div className="form-group">
                  <label>Appointment Date *</label>
                  {loadingSlots && !formData.appointment_date ? (
                    <p className="loading-text">Loading available dates...</p>
                  ) : availableDates.length === 0 ? (
                    <p className="error-text">No available dates for this doctor</p>
                  ) : (
                    <select name="appointment_date" value={formData.appointment_date} onChange={handleFormChange} required>
                      <option value="">Choose a date...</option>
                      {availableDates.map((dateObj, index) => (
                        <option key={index} value={dateObj.date}>
                          {dateObj.formatted} ({dateObj.day})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {formData.doctor_id && formData.appointment_date && (
                <div className="form-group">
                  <label>Appointment Time *</label>
                  {loadingSlots ? (
                    <p className="loading-text">Loading available times...</p>
                  ) : isOffDay ? (
                    <div className="off-day-message">
                      <span>🚫</span>
                      <p>Doctor is not available on this day (Off Day)</p>
                      <small>Please select a different date</small>
                    </div>
                  ) : availableTimes.length === 0 ? (
                    <p className="error-text">No available time slots for this date</p>
                  ) : (
                    <select
                      name="appointment_time"
                      value={formData.appointment_time}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Choose a time...</option>
                      {availableTimes.map((time, index) => (
                        <option key={index} value={time}>{time}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Appointment Type *</label>
                <select name="appointment_type" value={formData.appointment_type} onChange={handleFormChange} required>
                  <option value="">Select type...</option>
                  <option value="consultation">Consultation</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="check-up">Check-up</option>
                </select>
              </div>

              <div className="form-group">
                <label>Reason for Visit *</label>
                <textarea 
                  name="reason"
                  value={formData.reason}
                  onChange={handleFormChange}
                  rows="4" 
                  placeholder="Describe your symptoms or reason for visit..."
                  required
                ></textarea>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowBookingModal(false)} disabled={formLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={formLoading || loadingSlots || isOffDay}>
                  {formLoading ? 'Booking...' : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

              <div className="details-section">
                <div className="section-header-small">
                  <MdPerson size={20} />
                  <h3>Doctor Information</h3>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Doctor Name:</span>
                  <span className="detail-value">{selectedAppointment.doctor}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Specialty:</span>
                  <span className="detail-value">{selectedAppointment.specialty}</span>
                </div>
              </div>

              <div className="details-section">
                <div className="section-header-small">
                  <MdCalendarToday size={20} />
                  <h3>Appointment Information</h3>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">
                    {new Date(selectedAppointment.date).toLocaleDateString('en-US', { 
                      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
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
                  <span className={`status-badge ${getStatusClass(selectedAppointment.status)}`}>
                    {getStatusIcon(selectedAppointment.status)}
                    {selectedAppointment.status}
                  </span>
                </div>
              </div>

              <div className="details-section">
                <div className="section-header-small">
                  <MdLocationOn size={20} />
                  <h3>Location</h3>
                </div>
                <div className="location-box">
                  <MdLocationOn size={20} />
                  <span>
                    {selectedAppointment.location && selectedAppointment.location !== 'To be assigned'
                      ? selectedAppointment.location
                      : 'Visit Reception at Ground Floor'
                    }
                  </span>
                </div>
              </div>

              {selectedAppointment.reason && (
                <div className="details-section">
                  <div className="section-header-small">
                    <MdInfo size={20} />
                    <h3>Reason for Visit</h3>
                  </div>
                  <div className="notes-box">{selectedAppointment.reason}</div>
                </div>
              )}

              {selectedAppointment.notes && (
                <div className="details-section">
                  <div className="section-header-small">
                    <MdInfo size={20} />
                    <h3>Additional Notes</h3>
                  </div>
                  <div className="notes-box">{selectedAppointment.notes}</div>
                </div>
              )}

              {(selectedAppointment.status === 'confirmed' || selectedAppointment.status === 'pending') && (
                <div className="details-actions">
                  <button 
                    className="btn-danger"
                    onClick={() => handleCancelAppointment(selectedAppointment.id)}
                  >
                    <MdCancel size={18} />
                    Cancel Appointment
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ← NEW: Reschedule Modal */}
      {showRescheduleModal && rescheduleAppointment && (
        <RescheduleModal
          appointment={rescheduleAppointment}
          onClose={() => {
            setShowRescheduleModal(false);
            setRescheduleAppointment(null);
          }}
          onSuccess={handleRescheduleSuccess}
        />
      )}

      {/* Appointment Confirmation Modal */}
      {showConfirmation && confirmationData && (
        <AppointmentConfirmation 
          appointmentData={confirmationData}
          onClose={() => setShowConfirmation(false)}
        />
      )}
    </div>
  );
};

export default Appointments;