import React, { useState, useEffect } from 'react';
import { 
  MdClose, 
  MdCalendarToday, 
  MdAccessTime, 
  MdPerson,
  MdLocationOn,
  MdCheckCircle,
  MdSwapHoriz,
  MdWarning
} from 'react-icons/md';
import { getCSRFToken } from '../../utils/csrf';
import '../../styles/patient/RescheduleModal.css';


const RescheduleModal = ({ appointment, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('reschedule');
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Reschedule tab state
  const [availableDates, setAvailableDates] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // Transfer tab state
  const [alternativeDoctors, setAlternativeDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDoctorDate, setSelectedDoctorDate] = useState(''); // NEW
  const [selectedDoctorTime, setSelectedDoctorTime] = useState('');
  const [doctorAvailableDates, setDoctorAvailableDates] = useState([]); // NEW
  const [doctorAvailableTimes, setDoctorAvailableTimes] = useState([]); // NEW
  const [loadingDoctorSlots, setLoadingDoctorSlots] = useState(false); // NEW

  // Fetch reschedule options when component mounts or tab changes to reschedule
  useEffect(() => {
    if (activeTab === 'reschedule') {
      fetchRescheduleOptions();
    }
  }, [activeTab]);

  // Fetch transfer options when tab changes to transfer
  useEffect(() => {
    if (activeTab === 'transfer') {
      fetchTransferOptions();
    }
  }, [activeTab]);

  const fetchRescheduleOptions = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/patient/appointments/${appointment.id}/reschedule-options/`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        setAvailableDates(data.available_dates || []);
      } else {
        console.error('Failed to fetch reschedule options');
        setAvailableDates([]);
      }
    } catch (error) {
      console.error('Error fetching reschedule options:', error);
      setAvailableDates([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransferOptions = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/patient/appointments/${appointment.id}/transfer-options/`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        setAlternativeDoctors(data.alternative_doctors || []);
      } else {
        console.error('Failed to fetch transfer options');
        setAlternativeDoctors([]);
      }
    } catch (error) {
      console.error('Error fetching transfer options:', error);
      setAlternativeDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Fetch available dates for selected transfer doctor
  const fetchDoctorAvailableDates = async () => {
    setLoadingDoctorSlots(true);
    try {
      const response = await fetch(
        `http://localhost:8000/patient/appointments/transfer-doctor-slots/${selectedDoctor.id}/`, 
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDoctorAvailableDates(data.available_dates || []);
      } else {
        setDoctorAvailableDates([]);
      }
    } catch (error) {
      setDoctorAvailableDates([]);
    } finally {
      setLoadingDoctorSlots(false);
    }
  };

  // NEW: Fetch available times for selected date
  const fetchDoctorAvailableTimes = async (doctorId, date) => {
    setLoadingDoctorSlots(true);
    try {
      const response = await fetch(
        `http://localhost:8000/patient/appointments/transfer-doctor-slots/${doctorId}/?date=${date}`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        setDoctorAvailableTimes(data.available_times || []);
      } else {
        setDoctorAvailableTimes([]);
      }
    } catch (error) {
      console.error('Error fetching doctor times:', error);
      setDoctorAvailableTimes([]);
    } finally {
      setLoadingDoctorSlots(false);
    }
  };

  // When date is selected in reschedule tab, update available times
  useEffect(() => {
    if (selectedDate) {
      const dateObj = availableDates.find(d => d.date === selectedDate);
      if (dateObj) {
        setAvailableTimes(dateObj.times || []);
        setSelectedTime(''); // Reset time selection
      }
    } else {
      setAvailableTimes([]);
      setSelectedTime('');
    }
  }, [selectedDate, availableDates]);

  // NEW: When doctor is selected in transfer tab, fetch their dates
  useEffect(() => {
    if (selectedDoctor) {
      fetchDoctorAvailableDates(selectedDoctor.id);
      setSelectedDoctorDate('');
      setSelectedDoctorTime('');
      setDoctorAvailableTimes([]);
    }
  }, [selectedDoctor]);

  // NEW: When date is selected in transfer tab, fetch times
  useEffect(() => {
    if (selectedDoctor && selectedDoctorDate) {
      fetchDoctorAvailableTimes(selectedDoctor.id, selectedDoctorDate);
      setSelectedDoctorTime('');
    }
  }, [selectedDoctorDate]);

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

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      alert('Please select both date and time');
      return;
    }

    setSubmitLoading(true);

    try {
      const response = await fetch(
        `http://localhost:8000/patient/appointments/${appointment.id}/reschedule/`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
          },
          body: JSON.stringify({
            appointment_date: selectedDate,
            appointment_time: convertTo24hr(selectedTime)
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert('✅ Appointment rescheduled successfully!');
        onSuccess();
        onClose();
      } else {
        alert(data.error || 'Failed to reschedule appointment');
      }
    } catch (error) {
      alert('An error occurred while rescheduling');
      console.error('Error:', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleTransfer = async () => {
    // UPDATED: Check for date as well
    if (!selectedDoctor || !selectedDoctorDate || !selectedDoctorTime) {
      alert('Please select a doctor, date, and time');
      return;
    }

    setSubmitLoading(true);

    try {
      const response = await fetch(
        `http://localhost:8000/patient/appointments/${appointment.id}/transfer/`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
          },
          body: JSON.stringify({
            doctor_id: selectedDoctor.id,
            appointment_date: selectedDoctorDate, // NEW: Send date
            appointment_time: convertTo24hr(selectedDoctorTime)
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert('✅ Appointment transferred successfully!');
        onSuccess();
        onClose();
      } else {
        alert(data.error || 'Failed to transfer appointment');
      }
    } catch (error) {
      alert('An error occurred while transferring');
      console.error('Error:', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!window.confirm('Are you sure you want to cancel this appointment? This action cannot be undone.')) {
      return;
    }

    setSubmitLoading(true);

    try {
      const response = await fetch(
        `http://localhost:8000/patient/appointments/${appointment.id}/cancel/`,
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
        alert('✅ Appointment cancelled successfully');
        onSuccess();
        onClose();
      } else {
        alert(data.error || 'Failed to cancel appointment');
      }
    } catch (error) {
      alert('An error occurred while cancelling');
      console.error('Error:', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="reschedule-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="reschedule-header">
          <div className="header-icon">
            <MdWarning size={24} />
          </div>
          <div className="header-text">
            <h2>Appointment Needs Rescheduling</h2>
            <p>Your appointment has been affected. Please choose an option below.</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <MdClose size={24} />
          </button>
        </div>

        {/* Original Appointment Info */}
        <div className="original-appointment-info">
          <h3>Original Appointment</h3>
          <div className="info-grid">
            <div className="info-item">
              <MdPerson size={18} />
              <div>
                <span className="label">Doctor</span>
                <span className="value">{appointment.doctor}</span>
              </div>
            </div>
            <div className="info-item">
              <MdCalendarToday size={18} />
              <div>
                <span className="label">Date</span>
                <span className="value">
                  {new Date(appointment.date).toLocaleDateString('en-US', { 
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </span>
              </div>
            </div>
            <div className="info-item">
              <MdAccessTime size={18} />
              <div>
                <span className="label">Time</span>
                <span className="value">{appointment.time}</span>
              </div>
            </div>
            <div className="info-item">
              <MdLocationOn size={18} />
              <div>
                <span className="label">Specialty</span>
                <span className="value">{appointment.specialty}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <button
            className={`tab-btn ${activeTab === 'reschedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('reschedule')}
          >
            <MdCalendarToday size={20} />
            Reschedule with Same Doctor
          </button>
          <button
            className={`tab-btn ${activeTab === 'transfer' ? 'active' : ''}`}
            onClick={() => setActiveTab('transfer')}
          >
            <MdSwapHoriz size={20} />
            Transfer to Another Doctor
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          
          {/* Reschedule Tab */}
          {activeTab === 'reschedule' && (
            <div className="reschedule-tab">
              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading available slots...</p>
                </div>
              ) : availableDates.length === 0 ? (
                <div className="empty-state">
                  <MdCalendarToday size={48} />
                  <h3>No Available Dates</h3>
                  <p>This doctor has no available slots at the moment. Please try transferring to another doctor.</p>
                </div>
              ) : (
                <>
                  <div className="form-section">
                    <label>Select New Date *</label>
                    <select 
                      value={selectedDate} 
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="form-select"
                    >
                      <option value="">Choose a date...</option>
                      {availableDates.map((dateObj, index) => (
                        <option key={index} value={dateObj.date}>
                          {dateObj.formatted} ({dateObj.day})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedDate && (
                    <div className="form-section">
                      <label>Select New Time *</label>
                      {availableTimes.length === 0 ? (
                        <p className="error-text">No available times for this date</p>
                      ) : (
                        <div className="time-slots-grid">
                          {availableTimes.map((time, index) => (
                            <button
                              key={index}
                              className={`time-slot ${selectedTime === time ? 'selected' : ''}`}
                              onClick={() => setSelectedTime(time)}
                            >
                              <MdAccessTime size={16} />
                              {time}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="action-buttons">
                    <button className="btn-secondary" onClick={onClose} disabled={submitLoading}>
                      Close
                    </button>
                    <button 
                      className="btn-danger" 
                      onClick={handleCancelAppointment}
                      disabled={submitLoading}
                    >
                      Cancel Appointment
                    </button>
                    <button 
                      className="btn-primary" 
                      onClick={handleReschedule}
                      disabled={!selectedDate || !selectedTime || submitLoading}
                    >
                      {submitLoading ? 'Rescheduling...' : 'Confirm Reschedule'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Transfer Tab */}
          {activeTab === 'transfer' && (
            <div className="transfer-tab">
              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Finding available doctors...</p>
                </div>
              ) : alternativeDoctors.length === 0 ? (
                <div className="empty-state">
                  <MdPerson size={48} />
                  <h3>No Alternative Doctors</h3>
                  <p>No other doctors with the same specialty are available at this time. Please try rescheduling with your current doctor.</p>
                </div>
              ) : (
                <>
                  <div className="doctors-list">
                    {alternativeDoctors.map((doctor) => (
                      <div 
                        key={doctor.id}
                        className={`doctor-card ${selectedDoctor?.id === doctor.id ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedDoctor(doctor);
                          // Reset selections when changing doctor
                          setSelectedDoctorDate('');
                          setSelectedDoctorTime('');
                        }}
                      >
                        <div className="doctor-header">
                          <div className="doctor-avatar-transfer">
                            {doctor.photo ? (
                              <img src={doctor.photo} alt={doctor.name} />
                            ) : (
                              <div className="avatar-placeholder">
                                {doctor.name.split(' ').slice(1).map(n => n[0]).join('')}
                              </div>
                            )}
                          </div>
                          <div className="doctor-info-transfer">
                            <h4>{doctor.name}</h4>
                            <p className="specialty-text">{doctor.specialty}</p>
                            <p className="experience-text">
                              {doctor.experience} years experience
                            </p>
                          </div>
                          {doctor.same_time_available && (
                            <div className="same-time-badge">
                              <MdCheckCircle size={16} />
                              Same time available
                            </div>
                          )}
                        </div>

                        {doctor.room_location && (
                          <div className="doctor-location">
                            <MdLocationOn size={16} />
                            <span>{doctor.room_location}</span>
                          </div>
                        )}

                        {/* UPDATED: Show date selection first, then times */}
                        {selectedDoctor?.id === doctor.id && (
                          <div className="time-selection">
                            {/* Date Selection */}
                            <div className="form-section-inline">
                              <label>Select Date *</label>
                              {loadingDoctorSlots && doctorAvailableDates.length === 0 ? (
                                <p className="loading-text-small">Loading dates...</p>
                              ) : doctorAvailableDates.length === 0 ? (
                                <p className="error-text-small">No available dates</p>
                              ) : (
                                <select
                                  value={selectedDoctorDate}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    setSelectedDoctorDate(e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="form-select-inline"
                                >
                                  <option value="">Choose a date...</option>
                                  {doctorAvailableDates.map((dateObj, index) => (
                                    <option key={index} value={dateObj.date}>
                                      {dateObj.formatted} ({dateObj.day})
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>

                            {/* Time Selection - Only show after date is selected */}
                            {selectedDoctorDate && (
                              <div className="form-section-inline">
                                <label>Select Time *</label>
                                {loadingDoctorSlots ? (
                                  <p className="loading-text-small">Loading times...</p>
                                ) : doctorAvailableTimes.length === 0 ? (
                                  <p className="error-text-small">No available times for this date</p>
                                ) : (
                                  <div className="time-slots-grid">
                                    {doctorAvailableTimes.map((time, index) => (
                                      <button
                                        key={index}
                                        className={`time-slot ${selectedDoctorTime === time ? 'selected' : ''}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedDoctorTime(time);
                                        }}
                                      >
                                        <MdAccessTime size={16} />
                                        {time}
                                        {doctor.same_time_available && time === appointment.time && (
                                          <span className="original-time-badge">Original</span>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="action-buttons">
                    <button className="btn-secondary" onClick={onClose} disabled={submitLoading}>
                      Close
                    </button>
                    <button 
                      className="btn-danger" 
                      onClick={handleCancelAppointment}
                      disabled={submitLoading}
                    >
                      Cancel Appointment
                    </button>
                    <button 
                      className="btn-primary" 
                      onClick={handleTransfer}
                      disabled={!selectedDoctor || !selectedDoctorDate || !selectedDoctorTime || submitLoading}
                    >
                      {submitLoading ? 'Transferring...' : 'Confirm Transfer'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RescheduleModal;