import React, { useState, useEffect } from 'react';
import { 
  MdNoteAlt,
  MdAdd,
  MdPerson,
  MdCalendarToday,
  MdSearch,
  MdClose,
  MdInfo,
  MdVisibility,
  MdAccessTime,
  MdShare,
  MdSend
} from 'react-icons/md';
import { FaNotesMedical, FaStethoscope, FaFileMedical } from 'react-icons/fa';
import { getCSRFToken } from '../../utils/csrf';
import '../../styles/doctor/DoctorConsultations.css';

const DoctorConsultations = () => {
  const [consultations, setConsultations] = useState([]);
  const [stats, setStats] = useState({
    total: 0, this_week: 0, follow_ups: 0, new_visits: 0, shared: 0
  });
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [consultationToShare, setConsultationToShare] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Share modal state
  const [allDoctors, setAllDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [sharing, setSharing] = useState(false);
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    patient_id: '', consultation_type: '', chief_complaint: '',
    symptoms: '', blood_pressure: '', heart_rate: '', temperature: '',
    weight: '', height: '', examination: '', diagnosis: '',
    treatment_plan: '', follow_up_date: '', prescription_issued: 'No', notes: ''
  });

  useEffect(() => {
    fetchConsultations();
    fetchPatients();
  }, []);

  useEffect(() => {
    fetchConsultations();
  }, [filterType, searchQuery]);

  const fetchConsultations = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('type', filterType);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(
        `http://localhost:8000/doctor/consultations/?${params.toString()}`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        setConsultations(data.consultations);
        setStats(data.stats);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching consultations:', error);
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await fetch('http://localhost:8000/doctor/patients/list/', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchDoctorsForShare = async () => {
    try {
      const response = await fetch('http://localhost:8000/doctor/doctors/list/', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setAllDoctors(data.doctors);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const handleViewDetails = (consultation) => {
    setSelectedConsultation(consultation);
    setShowDetailsModal(true);
  };

  const handleOpenShare = (consultation) => {
    setConsultationToShare(consultation);
    setSelectedDoctorId('');
    setShareMessage('');
    setDoctorSearchQuery('');
    setShowShareModal(true);
    fetchDoctorsForShare();
  };

  const handleShare = async () => {
    if (!selectedDoctorId) {
      alert('Please select a doctor to share with');
      return;
    }
    setSharing(true);
    try {
      const response = await fetch(
        `http://localhost:8000/doctor/consultations/${consultationToShare.id}/share/`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
          body: JSON.stringify({ doctor_id: selectedDoctorId, message: shareMessage })
        }
      );
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        setShowShareModal(false);
      } else {
        alert(data.error || 'Failed to share consultation');
      }
    } catch (error) {
      alert('An error occurred while sharing');
    } finally {
      setSharing(false);
    }
  };

  const handleFormChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleAddConsultation = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        'http://localhost:8000/doctor/consultations/create/',
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
          body: JSON.stringify(formData)
        }
      );
      if (response.ok) {
        const data = await response.json();
        alert(`Consultation ${data.consultation_number} created successfully!`);
        setShowAddModal(false);
        setFormData({
          patient_id: '', consultation_type: '', chief_complaint: '',
          symptoms: '', blood_pressure: '', heart_rate: '', temperature: '',
          weight: '', height: '', examination: '', diagnosis: '',
          treatment_plan: '', follow_up_date: '', prescription_issued: 'No', notes: ''
        });
        fetchConsultations();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create consultation');
      }
    } catch (error) {
      alert('An error occurred while creating consultation');
    }
  };

  // Filter doctors in share modal by search
  const filteredDoctors = allDoctors.filter(d =>
    d.name.toLowerCase().includes(doctorSearchQuery.toLowerCase()) ||
    d.specialty.toLowerCase().includes(doctorSearchQuery.toLowerCase())
  );

  const statsArray = [
    { label: 'Total Consultations', value: stats.total,     color: '#3B82F6' },
    { label: 'This Week',           value: stats.this_week, color: '#10B981' },
    { label: 'Follow-ups',          value: stats.follow_ups, color: '#8B5CF6' },
    { label: 'New Visits',          value: stats.new_visits, color: '#F59E0B' },
    { label: 'Shared With Me',      value: stats.shared,    color: '#EC4899' },
  ];

  if (loading) return <div className="doctor-consultations-page">Loading...</div>;

  return (
    <div className="doctor-consultations-page">

      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Consultations</h1>
          <p>View and manage patient consultation notes</p>
        </div>
        <button className="btn-add-consultation" onClick={() => setShowAddModal(true)}>
          <MdAdd size={20} />
          Add Consultation
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
            placeholder="Search by patient name, diagnosis, or consultation number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          <button className={`filter-btn ${filterType === 'all'       ? 'active' : ''}`} onClick={() => setFilterType('all')}>All</button>
          <button className={`filter-btn ${filterType === 'New Visit' ? 'active' : ''}`} onClick={() => setFilterType('New Visit')}>New Visits</button>
          <button className={`filter-btn ${filterType === 'Follow-up' ? 'active' : ''}`} onClick={() => setFilterType('Follow-up')}>Follow-ups</button>
          {/* Shared filter */}
          <button className={`filter-btn ${filterType === 'Shared'    ? 'active' : ''}`} onClick={() => setFilterType('Shared')}>
            Shared With Me
          </button>
        </div>
      </div>

      {/* Consultations List */}
      <div className="consultations-list">
        {consultations.length === 0 ? (
          <div className="no-consultations">
            <FaNotesMedical size={48} />
            <h3>No consultations found</h3>
            <p>{filterType !== 'all' || searchQuery ? 'Try adjusting your search or filters' : 'No consultation notes available yet'}</p>
          </div>
        ) : (
          consultations.map((consultation) => (
            <div key={consultation.id} className="consultation-card">

              {/* Shared banner - only shows for shared consultations */}
              {consultation.isShared && (
                <div className="shared-banner">
                  <MdShare size={16} />
                  <span>Shared by <strong>{consultation.sharedBy}</strong> ({consultation.sharedBySpecialty}) • {consultation.sharedAt}</span>
                  {consultation.sharedMessage && (
                    <span className="shared-message">"{consultation.sharedMessage}"</span>
                  )}
                </div>
              )}

              <div className="card-header-cons">
                <div className="cons-number">
                  <FaNotesMedical size={16} />
                  {consultation.consultationNumber}
                </div>
                <span className={`type-badge ${consultation.type.toLowerCase().replace(' ', '-')}`}>
                  {consultation.type}
                </span>
              </div>

              <div className="card-body-cons">
                <div className="patient-section-cons">
                  <div className="patient-avatar-cons">
                    {consultation.patientName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="patient-details-cons">
                    <h3>{consultation.patientName}</h3>
                    <p>{consultation.patientId} • {consultation.age} yrs • {consultation.gender}</p>
                  </div>
                </div>

                <div className="consultation-info">
                  <div className="info-row-cons">
                    <MdCalendarToday size={14} />
                    <span>{new Date(consultation.date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })} at {consultation.time}</span>
                  </div>
                  <div className="diagnosis-preview">
                    <strong>Diagnosis:</strong> {consultation.diagnosis}
                  </div>
                  <div className="complaint-preview">
                    <strong>Chief Complaint:</strong> {consultation.chiefComplaint}
                  </div>
                </div>

                {consultation.followUpDate && (
                  <div className="follow-up-tag">
                    <MdAccessTime size={14} />
                    <span>Follow-up: {new Date(consultation.followUpDate).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}</span>
                  </div>
                )}
              </div>

              <div className="card-actions-cons">
                <button className="btn-view-cons" onClick={() => handleViewDetails(consultation)}>
                  <MdVisibility size={18} />
                  View Details
                </button>
                {/* Share button — only show on own consultations, not already-shared ones */}
                {!consultation.isShared && (
                  <button className="btn-share-cons" onClick={() => handleOpenShare(consultation)}>
                    <MdShare size={18} />
                    Share
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && consultationToShare && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Share Consultation</h2>
              <button className="close-btn" onClick={() => setShowShareModal(false)}>
                <MdClose size={24} />
              </button>
            </div>

            <div className="share-modal-body">
              {/* Consultation summary */}
              <div className="share-consultation-summary">
                <div className="summary-row">
                  <span className="summary-label">Consultation:</span>
                  <span className="summary-value">{consultationToShare.consultationNumber}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Patient:</span>
                  <span className="summary-value">{consultationToShare.patientName} ({consultationToShare.patientId})</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Diagnosis:</span>
                  <span className="summary-value">{consultationToShare.diagnosis}</span>
                </div>
              </div>

              {/* Doctor search */}
              <div className="share-section">
                <label>Select Doctor to Share With *</label>
                <div className="doctor-search-box">
                  <MdSearch size={18} />
                  <input
                    type="text"
                    placeholder="Search by name or specialty..."
                    value={doctorSearchQuery}
                    onChange={(e) => setDoctorSearchQuery(e.target.value)}
                  />
                </div>

                <div className="doctors-list-share">
                  {filteredDoctors.length === 0 ? (
                    <p className="no-doctors-text">No doctors found</p>
                  ) : (
                    filteredDoctors.map((doctor) => (
                      <div
                        key={doctor.id}
                        className={`doctor-share-item ${selectedDoctorId === doctor.id ? 'selected' : ''}`}
                        onClick={() => setSelectedDoctorId(doctor.id)}
                      >
                        <div className="doctor-share-avatar">
                          {doctor.photoUrl
                            ? <img src={doctor.photoUrl} alt={doctor.name} />
                            : <span>{doctor.name.split(' ').slice(1).map(n => n[0]).join('')}</span>
                          }
                        </div>
                        <div className="doctor-share-info">
                          <h4>{doctor.name}</h4>
                          <p>{doctor.specialty} {doctor.department ? `• ${doctor.department}` : ''}</p>
                          <span className="doctor-share-id">{doctor.doctorId}</span>
                        </div>
                        {selectedDoctorId === doctor.id && (
                          <div className="selected-check">✓</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Message */}
              <div className="share-section">
                <label>Message (Optional)</label>
                <textarea
                  rows="3"
                  placeholder="e.g., Please review this patient, I suspect cardiac involvement..."
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                ></textarea>
              </div>

              <div className="share-actions">
                <button className="btn-cancel" onClick={() => setShowShareModal(false)} disabled={sharing}>
                  Cancel
                </button>
                <button className="btn-send-share" onClick={handleShare} disabled={sharing || !selectedDoctorId}>
                  <MdSend size={18} />
                  {sharing ? 'Sharing...' : 'Share Consultation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Consultation Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Consultation Note</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                <MdClose size={24} />
              </button>
            </div>
            <form className="consultation-form" onSubmit={handleAddConsultation}>
              <div className="form-section">
                <h3>Patient Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Select Patient *</label>
                    <select required value={formData.patient_id} onChange={(e) => handleFormChange('patient_id', e.target.value)}>
                      <option value="">Choose a patient...</option>
                      {patients.map(patient => (
                        <option key={patient.id} value={patient.id}>{patient.display}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Consultation Type *</label>
                    <select required value={formData.consultation_type} onChange={(e) => handleFormChange('consultation_type', e.target.value)}>
                      <option value="">Select type...</option>
                      <option value="New Visit">New Visit</option>
                      <option value="Follow-up">Follow-up</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="form-section">
                <h3>Chief Complaint *</h3>
                <div className="form-group">
                  <textarea rows="2" placeholder="Enter patient's main complaint..." required value={formData.chief_complaint} onChange={(e) => handleFormChange('chief_complaint', e.target.value)}></textarea>
                </div>
              </div>
              <div className="form-section">
                <h3>Vital Signs</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Blood Pressure</label>
                    <input type="text" placeholder="e.g., 120/80 mmHg" value={formData.blood_pressure} onChange={(e) => handleFormChange('blood_pressure', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Heart Rate</label>
                    <input type="text" placeholder="e.g., 72 bpm" value={formData.heart_rate} onChange={(e) => handleFormChange('heart_rate', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Temperature</label>
                    <input type="text" placeholder="e.g., 98.6°F" value={formData.temperature} onChange={(e) => handleFormChange('temperature', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Weight</label>
                    <input type="text" placeholder="e.g., 70 kg" value={formData.weight} onChange={(e) => handleFormChange('weight', e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="form-section">
                <h3>Symptoms</h3>
                <div className="form-group">
                  <textarea rows="2" placeholder="List patient's symptoms (comma-separated)..." value={formData.symptoms} onChange={(e) => handleFormChange('symptoms', e.target.value)}></textarea>
                </div>
              </div>
              <div className="form-section">
                <h3>Physical Examination *</h3>
                <div className="form-group">
                  <textarea rows="3" placeholder="Enter physical examination findings..." required value={formData.examination} onChange={(e) => handleFormChange('examination', e.target.value)}></textarea>
                </div>
              </div>
              <div className="form-section">
                <h3>Diagnosis *</h3>
                <div className="form-group">
                  <textarea rows="2" placeholder="Enter diagnosis..." required value={formData.diagnosis} onChange={(e) => handleFormChange('diagnosis', e.target.value)}></textarea>
                </div>
              </div>
              <div className="form-section">
                <h3>Treatment Plan *</h3>
                <div className="form-group">
                  <textarea rows="3" placeholder="Enter treatment plan and recommendations..." required value={formData.treatment_plan} onChange={(e) => handleFormChange('treatment_plan', e.target.value)}></textarea>
                </div>
              </div>
              <div className="form-section">
                <h3>Follow-up</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Follow-up Date</label>
                    <input type="date" value={formData.follow_up_date} onChange={(e) => handleFormChange('follow_up_date', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Prescription Issued</label>
                    <select value={formData.prescription_issued} onChange={(e) => handleFormChange('prescription_issued', e.target.value)}>
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="form-section">
                <h3>Additional Notes</h3>
                <div className="form-group">
                  <textarea rows="3" placeholder="Any additional notes or observations..." value={formData.notes} onChange={(e) => handleFormChange('notes', e.target.value)}></textarea>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit">
                  <FaNotesMedical size={18} />
                  Save Consultation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedConsultation && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Consultation Details</h2>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>
                <MdClose size={24} />
              </button>
            </div>
            <div className="details-body">

              {/* ✅ Shared info banner inside details modal */}
              {selectedConsultation.isShared && (
                <div className="shared-banner-modal">
                  <MdShare size={18} />
                  <div>
                    <strong>Shared by {selectedConsultation.sharedBy}</strong> ({selectedConsultation.sharedBySpecialty}) on {selectedConsultation.sharedAt}
                    {selectedConsultation.sharedMessage && (
                      <p className="shared-message-modal">Message: "{selectedConsultation.sharedMessage}"</p>
                    )}
                  </div>
                </div>
              )}

              <div className="details-section">
                <div className="section-header-small">
                  <FaNotesMedical size={20} />
                  <h3>Consultation Information</h3>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Consultation Number:</span>
                  <span className="detail-value">{selectedConsultation.consultationNumber}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date & Time:</span>
                  <span className="detail-value">
                    {new Date(selectedConsultation.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at {selectedConsultation.time}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Type:</span>
                  <span className={`type-badge ${selectedConsultation.type.toLowerCase().replace(' ', '-')}`}>{selectedConsultation.type}</span>
                </div>
              </div>

              <div className="details-section">
                <div className="section-header-small">
                  <MdPerson size={20} />
                  <h3>Patient Information</h3>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{selectedConsultation.patientName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Patient ID:</span>
                  <span className="detail-value">{selectedConsultation.patientId}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Age:</span>
                  <span className="detail-value">{selectedConsultation.age} years</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Gender:</span>
                  <span className="detail-value">{selectedConsultation.gender}</span>
                </div>
              </div>

              <div className="details-section">
                <div className="section-header-small"><MdInfo size={20} /><h3>Chief Complaint</h3></div>
                <div className="info-box">{selectedConsultation.chiefComplaint}</div>
              </div>

              {Object.keys(selectedConsultation.vitalSigns).length > 0 && (
                <div className="details-section">
                  <div className="section-header-small"><FaStethoscope size={20} /><h3>Vital Signs</h3></div>
                  <div className="vitals-grid">
                    {Object.entries(selectedConsultation.vitalSigns).map(([key, value]) => (
                      <div key={key} className="vital-item">
                        <span className="vital-label">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <span className="vital-value">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedConsultation.symptoms.length > 0 && (
                <div className="details-section">
                  <div className="section-header-small"><MdInfo size={20} /><h3>Symptoms</h3></div>
                  <div className="symptoms-tags">
                    {selectedConsultation.symptoms.map((symptom, index) => (
                      <span key={index} className="symptom-tag">{symptom}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedConsultation.examination && (
                <div className="details-section">
                  <div className="section-header-small"><FaStethoscope size={20} /><h3>Physical Examination</h3></div>
                  <div className="info-box">{selectedConsultation.examination}</div>
                </div>
              )}

              <div className="details-section">
                <div className="section-header-small"><FaFileMedical size={20} /><h3>Diagnosis</h3></div>
                <div className="diagnosis-box">{selectedConsultation.diagnosis}</div>
              </div>

              <div className="details-section">
                <div className="section-header-small"><MdNoteAlt size={20} /><h3>Treatment Plan</h3></div>
                <div className="info-box">{selectedConsultation.treatmentPlan}</div>
              </div>

              <div className="details-section">
                <div className="section-header-small"><MdCalendarToday size={20} /><h3>Follow-up & Notes</h3></div>
                <div className="detail-row">
                  <span className="detail-label">Prescription Issued:</span>
                  <span className="detail-value">{selectedConsultation.prescriptionIssued}</span>
                </div>
                {selectedConsultation.followUpDate && (
                  <div className="detail-row">
                    <span className="detail-label">Follow-up Date:</span>
                    <span className="detail-value">
                      {new Date(selectedConsultation.followUpDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                )}
                {selectedConsultation.notes && (
                  <div className="notes-box-detail">
                    <strong>Notes:</strong> {selectedConsultation.notes}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorConsultations;