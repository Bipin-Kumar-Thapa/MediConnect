import React, { useState, useEffect } from 'react';
import { 
  MdCalendarToday,
  MdAccessTime,
  MdAdd,
  MdEdit,
  MdDelete,
  MdClose,
  MdCheckCircle,
  MdBlock
} from 'react-icons/md';
import { FaClock, FaCalendarAlt } from 'react-icons/fa';
import { getCSRFToken } from '../../utils/csrf';
import '../../styles/doctor/DoctorSchedule.css';

const DoctorSchedule = () => {
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [viewMode, setViewMode] = useState('week');

  // Form states
  const [slotForm, setSlotForm] = useState({
    day: '',
    start_time: '',
    end_time: '',
    slot_type: 'consultation'
  });

  useEffect(() => {
    fetchSchedule();
  }, [selectedDate]);

  const fetchSchedule = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/doctor/schedule/?date=${selectedDate}`,
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        setScheduleData(data);
      } else {
        console.error('Failed to fetch schedule');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setLoading(false);
    }
  };

  const handleAddTimeSlot = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        'http://localhost:8000/doctor/schedule/add-slot/',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
          },
          body: JSON.stringify(slotForm)
        }
      );

      if (response.ok) {
        alert('Time slot added successfully!');
        setShowAddSlotModal(false);
        setSlotForm({ day: '', start_time: '', end_time: '', slot_type: 'consultation' });
        fetchSchedule();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to add time slot');
      }
    } catch (error) {
      console.error('Error adding time slot:', error);
      alert('An error occurred');
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to delete this time slot?')) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/doctor/schedule/delete-slot/${slotId}/`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'X-CSRFToken': getCSRFToken(),
          }
        }
      );

      if (response.ok) {
        alert('Time slot deleted successfully');
        fetchSchedule();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete time slot');
      }
    } catch (error) {
      console.error('Error deleting time slot:', error);
      alert('An error occurred');
    }
  };

  const handleToggleDay = async (day) => {
    try {
      const response = await fetch(
        `http://localhost:8000/doctor/schedule/toggle-day/${day}/`,
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
        fetchSchedule();
      } else {
        alert('Failed to toggle day');
      }
    } catch (error) {
      console.error('Error toggling day:', error);
    }
  };

  if (loading) {
    return <div className="doctor-schedule-page">Loading...</div>;
  }

  if (!scheduleData) {
    return <div className="doctor-schedule-page">Error loading schedule</div>;
  }

  const stats = [
    { label: 'Working Days', value: scheduleData.stats.working_days, color: '#10B981' },
    { label: 'Today\'s Appointments', value: scheduleData.stats.todays_appointments, color: '#3B82F6' },
    { label: 'This Week', value: scheduleData.stats.this_week, color: '#8B5CF6' }
  ];

  return (
    <div className="doctor-schedule-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>My Schedule</h1>
          <p>Manage your availability and appointments</p>
        </div>
        <div className="header-actions">
          <button className="btn-add-schedule" onClick={() => setShowAddSlotModal(true)}>
            <MdAdd size={20} />
            Add Time Slot
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card" style={{ borderLeftColor: stat.color }}>
            <h3>{stat.value}</h3>
            <p>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* View Mode Selector */}
      <div className="view-mode-section">
        <div className="view-mode-tabs">
          <button 
            className={`view-tab ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
          >
            Day
          </button>
          <button 
            className={`view-tab ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            Week
          </button>
          <button 
            className={`view-tab ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            Month
          </button>
        </div>
        <div className="date-selector">
          <MdCalendarToday size={18} />
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-picker"
          />
        </div>
      </div>

      <div className="schedule-content-grid">
        {/* Weekly Schedule */}
        <div className="weekly-schedule-section">
          <div className="section-header">
            <h2>Weekly Availability</h2>
            <p>Set your regular working hours</p>
          </div>

          <div className="days-schedule">
            {Object.entries(scheduleData.weekly_schedule).map(([day, schedule]) => (
              <div key={day} className={`day-schedule-card ${!schedule.available ? 'unavailable' : ''}`}>
                <div className="day-header">
                  <div className="day-info">
                    <h3>{day}</h3>
                    <span className={`availability-badge ${schedule.available ? 'available' : 'off'}`}>
                      {schedule.available ? (
                        <>
                          <MdCheckCircle size={14} />
                          Available
                        </>
                      ) : (
                        <>
                          <MdBlock size={14} />
                          Day Off
                        </>
                      )}
                    </span>
                  </div>
                  <button 
                    className="btn-toggle-day"
                    onClick={() => handleToggleDay(day)}
                    title={schedule.available ? 'Mark as day off' : 'Mark as available'}
                  >
                    <MdEdit size={18} />
                  </button>
                </div>

                {schedule.available && schedule.slots.length > 0 && (
                  <div className="time-slots">
                    {schedule.slots.map((slot, index) => (
                      <div key={index} className="time-slot">
                        <div className="slot-info">
                          <FaClock size={14} />
                          <span>{slot.startTime} - {slot.endTime}</span>
                          <span className="slot-type-badge">{slot.type}</span>
                        </div>
                        <button 
                          className="btn-delete-slot"
                          onClick={() => handleDeleteSlot(slot.id)}
                          title="Delete this time slot"
                        >
                          <MdDelete size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {schedule.available && schedule.slots.length === 0 && (
                  <div className="no-slots-message">
                    <p>No time slots set for this day</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="todays-appointments-section">
          <div className="section-header">
            <h2>Today's Appointments</h2>
            <p>{new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long', 
              day: 'numeric'
            })}</p>
          </div>

          <div className="appointments-timeline">
            {scheduleData.todays_appointments.length === 0 ? (
              <div className="no-appointments-today">
                <FaCalendarAlt size={40} />
                <h3>No appointments scheduled</h3>
                <p>Your schedule is clear for today</p>
              </div>
            ) : (
              scheduleData.todays_appointments.map((appointment) => (
                <div key={appointment.id} className={`appointment-timeline-item ${appointment.status}`}>
                  <div className="appointment-time-marker">
                    <div className="time-dot"></div>
                    <span className="time-label">{appointment.time}</span>
                  </div>
                  <div className="appointment-card-mini">
                    <div className="appointment-header-mini">
                      <div className="patient-info-mini">
                        <div className="patient-avatar-mini">
                          {appointment.patientName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h4>{appointment.patientName}</h4>
                          <p>{appointment.patientId}</p>
                        </div>
                      </div>
                      <span className={`status-badge-mini ${appointment.status}`}>
                        {appointment.status}
                      </span>
                    </div>
                    <div className="appointment-details-mini">
                      <div className="detail-mini">
                        <MdAccessTime size={14} />
                        <span>{appointment.duration}</span>
                      </div>
                      <div className="detail-mini">
                        <span className="type-label">{appointment.type}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Time Slot Modal */}
      {showAddSlotModal && (
        <div className="modal-overlay" onClick={() => setShowAddSlotModal(false)}>
          <div className="modal-content add-slot-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Time Slot</h2>
              <button className="close-btn" onClick={() => setShowAddSlotModal(false)}>
                <MdClose size={24} />
              </button>
            </div>

            <form className="schedule-form" onSubmit={handleAddTimeSlot}>
              <div className="form-section">
                <h3>Day Selection</h3>
                <div className="form-group">
                  <label>Select Day *</label>
                  <select 
                    required
                    value={slotForm.day}
                    onChange={(e) => setSlotForm({ ...slotForm, day: e.target.value })}
                  >
                    <option value="">Choose a day...</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>
              </div>

              <div className="form-section">
                <h3>Time Details</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Time *</label>
                    <input 
                      type="time" 
                      required
                      value={slotForm.start_time}
                      onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Time *</label>
                    <input 
                      type="time" 
                      required
                      value={slotForm.end_time}
                      onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Slot Type</h3>
                <div className="form-group">
                  <select 
                    required
                    value={slotForm.slot_type}
                    onChange={(e) => setSlotForm({ ...slotForm, slot_type: e.target.value })}
                  >
                    <option value="">Select type...</option>
                    <option value="consultation">Consultation</option>
                    <option value="surgery">Surgery</option>
                    <option value="rounds">Rounds</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddSlotModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  <MdAdd size={18} />
                  Add Time Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorSchedule;