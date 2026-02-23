import React, { useState, useEffect } from 'react';
import { 
  MdCalendarToday,
  MdSearch,
  MdClose,
  MdInfo,
  MdVisibility,
  MdLocalHospital,
  MdAccessTime
} from 'react-icons/md';
import { FaNotesMedical, FaStethoscope, FaUserMd, FaFileMedical } from 'react-icons/fa';
import '../../styles/patient/ConsultationHistory.css';

const ConsultationHistory = () => {
  const [consultations, setConsultations] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    this_year: 0,
    doctors_consulted: 0,
    with_prescription: 0
  });
  const [uniqueDoctors, setUniqueDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('all');

  // Fetch consultation history on component mount
  useEffect(() => {
    fetchConsultationHistory();
  }, []);

  // Fetch when filters change
  useEffect(() => {
    fetchConsultationHistory();
  }, [searchQuery, filterDoctor]);

  const fetchConsultationHistory = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (filterDoctor !== 'all') {
        params.append('doctor', filterDoctor);
      }

      const response = await fetch(
        `http://localhost:8000/patient/consultation-history/?${params.toString()}`,
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        setConsultations(data.consultations);
        setStats(data.stats);
        setUniqueDoctors(data.unique_doctors);
      } else {
        console.error('Failed to fetch consultation history');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching consultation history:', error);
      setLoading(false);
    }
  };

  const statsArray = [
    { label: 'Total Consultations', value: stats.total, color: '#3B82F6' },
    { label: 'This Year', value: stats.this_year, color: '#10B981' },
    { label: 'Doctors Consulted', value: stats.doctors_consulted, color: '#8B5CF6' },
    { label: 'With Prescription', value: stats.with_prescription, color: '#F59E0B' }
  ];

  const handleViewDetails = (consultation) => {
    setSelectedConsultation(consultation);
    setShowDetailsModal(true);
  };

  if (loading) {
    return <div className="consultation-history-page">Loading...</div>;
  }

  return (
    <div className="consultation-history-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Consultation History</h1>
          <p>View your complete medical consultation records</p>
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
            placeholder="Search by doctor, diagnosis, or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select 
            className="filter-select"
            value={filterDoctor}
            onChange={(e) => setFilterDoctor(e.target.value)}
          >
            <option value="all">All Doctors</option>
            {uniqueDoctors.map((doctor, index) => (
              <option key={index} value={doctor}>{doctor}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Consultations Timeline */}
      <div className="consultations-timeline">
        {consultations.length === 0 ? (
          <div className="no-consultations">
            <FaNotesMedical size={48} />
            <h3>No consultations found</h3>
            <p>
              {searchQuery || filterDoctor !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No consultation history available yet'
              }
            </p>
          </div>
        ) : (
          consultations.map((consultation, index) => (
            <div key={consultation.id} className="consultation-card-timeline">
              <div className="timeline-marker">
                <div className="marker-dot"></div>
                {index < consultations.length - 1 && <div className="marker-line"></div>}
              </div>

              <div className="consultation-card-content">
                <div className="card-header-timeline">
                  <div className="date-section">
                    <MdCalendarToday size={18} />
                    <div>
                      <h3>{new Date(consultation.date).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric',
                        year: 'numeric'
                      })}</h3>
                      <p>{consultation.time}</p>
                    </div>
                  </div>
                  <span className={`type-badge ${consultation.type.toLowerCase().replace(' ', '-')}`}>
                    {consultation.type}
                  </span>
                </div>

                <div className="card-body-timeline">
                  <div className="doctor-section">
                    <div className="doctor-avatar">
                      <FaUserMd size={20} />
                    </div>
                    <div className="doctor-info">
                      <h4>{consultation.doctorName}</h4>
                      <p>{consultation.specialty}</p>
                    </div>
                  </div>

                  <div className="consultation-details">
                    <div className="detail-item">
                      <strong>Chief Complaint:</strong>
                      <p>{consultation.chiefComplaint}</p>
                    </div>
                    <div className="detail-item">
                      <strong>Diagnosis:</strong>
                      <p className="diagnosis-text">{consultation.diagnosis}</p>
                    </div>
                    {consultation.prescriptionIssued === 'Yes' && (
                      <div className="prescription-indicator">
                        <FaFileMedical size={14} />
                        <span>Prescription Issued</span>
                      </div>
                    )}
                  </div>

                  {consultation.followUpDate && (
                    <div className="follow-up-info">
                      <MdAccessTime size={14} />
                      <span>Follow-up scheduled: {new Date(consultation.followUpDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}</span>
                    </div>
                  )}
                </div>

                <div className="card-actions-timeline">
                  <button 
                    className="btn-view-details"
                    onClick={() => handleViewDetails(consultation)}
                  >
                    <MdVisibility size={18} />
                    View Full Details
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

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
              {/* Consultation Info */}
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
                    {new Date(selectedConsultation.date).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })} at {selectedConsultation.time}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Type:</span>
                  <span className={`type-badge ${selectedConsultation.type.toLowerCase().replace(' ', '-')}`}>
                    {selectedConsultation.type}
                  </span>
                </div>
              </div>

              {/* Doctor Info */}
              <div className="details-section">
                <div className="section-header-small">
                  <FaUserMd size={20} />
                  <h3>Consulting Doctor</h3>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Doctor Name:</span>
                  <span className="detail-value">{selectedConsultation.doctorName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Specialty:</span>
                  <span className="detail-value">{selectedConsultation.specialty}</span>
                </div>
              </div>

              {/* Chief Complaint */}
              <div className="details-section">
                <div className="section-header-small">
                  <MdInfo size={20} />
                  <h3>Chief Complaint</h3>
                </div>
                <div className="info-box">
                  {selectedConsultation.chiefComplaint}
                </div>
              </div>

              {/* Vital Signs */}
              {Object.keys(selectedConsultation.vitalSigns).length > 0 && (
                <div className="details-section">
                  <div className="section-header-small">
                    <FaStethoscope size={20} />
                    <h3>Vital Signs</h3>
                  </div>
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

              {/* Symptoms */}
              {selectedConsultation.symptoms.length > 0 && (
                <div className="details-section">
                  <div className="section-header-small">
                    <MdInfo size={20} />
                    <h3>Symptoms</h3>
                  </div>
                  <div className="symptoms-tags">
                    {selectedConsultation.symptoms.map((symptom, index) => (
                      <span key={index} className="symptom-tag">{symptom}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Examination */}
              {selectedConsultation.examination && (
                <div className="details-section">
                  <div className="section-header-small">
                    <FaStethoscope size={20} />
                    <h3>Physical Examination</h3>
                  </div>
                  <div className="info-box">
                    {selectedConsultation.examination}
                  </div>
                </div>
              )}

              {/* Diagnosis */}
              <div className="details-section">
                <div className="section-header-small">
                  <MdLocalHospital size={20} />
                  <h3>Diagnosis</h3>
                </div>
                <div className="diagnosis-box">
                  {selectedConsultation.diagnosis}
                </div>
              </div>

              {/* Treatment Plan */}
              <div className="details-section">
                <div className="section-header-small">
                  <FaFileMedical size={20} />
                  <h3>Treatment Plan</h3>
                </div>
                <div className="info-box">
                  {selectedConsultation.treatmentPlan}
                </div>
              </div>

              {/* Follow-up & Notes */}
              <div className="details-section">
                <div className="section-header-small">
                  <MdCalendarToday size={20} />
                  <h3>Follow-up & Notes</h3>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Prescription Issued:</span>
                  <span className="detail-value">{selectedConsultation.prescriptionIssued}</span>
                </div>
                {selectedConsultation.followUpDate && (
                  <div className="detail-row">
                    <span className="detail-label">Follow-up Date:</span>
                    <span className="detail-value">
                      {new Date(selectedConsultation.followUpDate).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                {selectedConsultation.notes && (
                  <div className="notes-box-detail">
                    <strong>Doctor's Notes:</strong> {selectedConsultation.notes}
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

export default ConsultationHistory;