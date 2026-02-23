import React, { useState, useEffect } from 'react';
import { 
  MdSearch,
  MdClose,
  MdLocationOn,
  MdPhone,
  MdEmail,
  MdSchool,
  MdWork,
  MdCalendarToday,
  MdAccessTime,
  MdVerifiedUser,
  MdCancel
} from 'react-icons/md';
import { FaUserMd, FaStethoscope, FaHospital } from 'react-icons/fa';
import '../../styles/patient/Doctors.css';

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('all');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, [filterSpecialty, searchQuery]);

  const fetchDoctors = async () => {
    try {
      const params = new URLSearchParams();
      if (filterSpecialty !== 'all') {
        params.append('specialty', filterSpecialty);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(
        `http://localhost:8000/patient/doctors/?${params.toString()}`,
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDoctors(data.doctors);
        setSpecialties(data.specialties);
      } else {
        console.error('Failed to fetch doctors');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setLoading(false);
    }
  };

  const handleViewDetails = (doctor) => {
    setSelectedDoctor(doctor);
    setShowDetailsModal(true);
  };

  if (loading) {
    return <div className="doctors-page">Loading...</div>;
  }

  return (
    <div className="doctors-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Our Doctors</h1>
          <p>Find and connect with our experienced medical professionals</p>
        </div>
      </div>

      <div className="search-filter-section">
        <div className="search-box">
          <MdSearch size={20} />
          <input 
            type="text" 
            placeholder="Search doctors by name, specialty, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select 
          className="filter-specialty"
          value={filterSpecialty}
          onChange={(e) => setFilterSpecialty(e.target.value)}
        >
          <option value="all">All Specialties</option>
          {specialties.map((specialty) => (
            <option key={specialty.code} value={specialty.code}>
              {specialty.name}
            </option>
          ))}
        </select>
      </div>

      <div className="doctors-grid">
        {doctors.length === 0 ? (
          <div className="no-doctors">
            <FaUserMd size={48} />
            <h3>No doctors found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          doctors.map((doctor) => (
            <div key={doctor.id} className="doctor-card">
              <div className="doctor-card-header">
                <div className="doctor-image-small">
                  {doctor.image ? (
                    <img src={doctor.image} alt={doctor.name} />
                  ) : (
                    <div className="doctor-initials">
                      {doctor.initials}
                    </div>
                  )}
                </div>
                {doctor.isVerified && (
                  <div className="verified-badge-small">
                    <MdVerifiedUser size={16} />
                  </div>
                )}
              </div>

              <div className="doctor-card-body">
                <h3>Dr. {doctor.name}</h3>
                <p className="specialty">{doctor.specialty}</p>
                
                <div className="doctor-info-items">
                  {doctor.experience && (
                    <div className="info-item">
                      <MdWork size={16} />
                      <span>{doctor.experience} experience</span>
                    </div>
                  )}
                  <div className="info-item">
                    <MdLocationOn size={16} />
                    <span>{doctor.department}</span>
                  </div>
                </div>

                {doctor.availability && (
                  <div className="availability-tag">
                    <MdAccessTime size={14} />
                    <span>{doctor.availability}</span>
                  </div>
                )}
              </div>

              <div className="doctor-card-footer">
                <button 
                  className="btn-view-details"
                  onClick={() => handleViewDetails(doctor)}
                >
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showDetailsModal && selectedDoctor && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content doctor-details-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowDetailsModal(false)}>
              <MdClose size={24} />
            </button>

            <div className="doctor-details-header">
              <div className="doctor-image-large">
                {selectedDoctor.image ? (
                  <img src={selectedDoctor.image} alt={selectedDoctor.name} />
                ) : (
                  <div className="doctor-initials-large">
                    {selectedDoctor.initials}
                  </div>
                )}
              </div>
              <div className="doctor-header-info">
                <h2>Dr. {selectedDoctor.name}</h2>
                <p className="specialty-large">{selectedDoctor.specialty}</p>
                <div className="doctor-id-badge">
                  ID: {selectedDoctor.doctorId}
                </div>
                {selectedDoctor.isVerified ? (
                  <div className="verified-badge">
                    <MdVerifiedUser size={18} />
                    <span>Verified Doctor</span>
                  </div>
                ) : (
                  <div className="unverified-badge">
                    <MdCancel size={18} />
                    <span>Unverified</span>
                  </div>
                )}
              </div>
            </div>

            <div className="doctor-details-body">
              <div className="detail-section">
                <h3><FaStethoscope size={20} /> Professional Information</h3>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-label">Department:</span>
                    <span className="info-value">{selectedDoctor.department}</span>
                  </div>
                  {selectedDoctor.subSpecialty && (
                    <div className="info-row">
                      <span className="info-label">Sub-Specialization:</span>
                      <span className="info-value">{selectedDoctor.subSpecialty}</span>
                    </div>
                  )}
                  {selectedDoctor.experience && (
                    <div className="info-row">
                      <span className="info-label">Experience:</span>
                      <span className="info-value">{selectedDoctor.experience}</span>
                    </div>
                  )}
                  {selectedDoctor.licenseNumber && (
                    <div className="info-row">
                      <span className="info-label">License Number:</span>
                      <span className="info-value">{selectedDoctor.licenseNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-section">
                <h3><MdSchool size={20} /> Education & Certification</h3>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-label">Education:</span>
                    <span className="info-value">{selectedDoctor.education}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Certification:</span>
                    <span className="info-value">{selectedDoctor.certification}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Languages:</span>
                    <span className="info-value">{selectedDoctor.languages}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3><FaHospital size={20} /> Hospital & Location</h3>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-label">Hospital:</span>
                    <span className="info-value">{selectedDoctor.hospitalName}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label"><MdLocationOn size={16} /> Office Location:</span>
                    <span className="info-value">{selectedDoctor.location}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3><MdPhone size={20} /> Contact Information</h3>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-label"><MdPhone size={16} /> Phone:</span>
                    <span className="info-value">{selectedDoctor.phone}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label"><MdEmail size={16} /> Email:</span>
                    <span className="info-value">{selectedDoctor.email}</span>
                  </div>
                </div>
              </div>

              {selectedDoctor.availability && selectedDoctor.availability !== 'Not specified' && (
                <div className="detail-section">
                  <h3><MdCalendarToday size={20} /> Availability</h3>
                  <div className="availability-box">
                    <MdAccessTime size={20} />
                    <span>{selectedDoctor.availability}</span>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button className="btn-book-appointment">
                  <MdCalendarToday size={20} />
                  Book Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Doctors;