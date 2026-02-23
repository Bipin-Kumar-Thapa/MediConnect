import React, { useState } from 'react';
import { 
  MdPerson,
  MdPhone,
  MdEmail,
  MdCalendarToday,
  MdSearch,
  MdFilterList,
  MdClose,
  MdInfo,
  MdVisibility,
  MdHistory
} from 'react-icons/md';
import { FaTint, FaStethoscope } from 'react-icons/fa';
import '../../styles/doctor/DoctorPatients.css';

const DoctorPatients = () => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState('all');
  const [filterBloodGroup, setFilterBloodGroup] = useState('all');

  // Sample patients data
  const patients = [
    {
      id: 1,
      patientId: 'PAT-001',
      name: 'John Doe',
      age: 35,
      gender: 'Male',
      bloodGroup: 'O+',
      phone: '+1 (555) 123-4567',
      email: 'john.doe@email.com',
      address: '123 Main St, New York, NY 10001',
      registeredDate: '2024-01-15',
      lastVisit: '2026-02-01',
      totalVisits: 12,
      conditions: ['Hypertension', 'Diabetes Type 2'],
      allergies: ['Penicillin'],
      emergencyContact: {
        name: 'Jane Doe',
        relation: 'Spouse',
        phone: '+1 (555) 123-4568'
      }
    },
    {
      id: 2,
      patientId: 'PAT-002',
      name: 'Sarah Williams',
      age: 28,
      gender: 'Female',
      bloodGroup: 'A+',
      phone: '+1 (555) 234-5678',
      email: 'sarah.w@email.com',
      address: '456 Oak Ave, Brooklyn, NY 11201',
      registeredDate: '2024-03-20',
      lastVisit: '2026-01-28',
      totalVisits: 8,
      conditions: ['Asthma'],
      allergies: ['Pollen', 'Dust'],
      emergencyContact: {
        name: 'Robert Williams',
        relation: 'Father',
        phone: '+1 (555) 234-5679'
      }
    },
    {
      id: 3,
      patientId: 'PAT-003',
      name: 'Michael Brown',
      age: 45,
      gender: 'Male',
      bloodGroup: 'B+',
      phone: '+1 (555) 345-6789',
      email: 'michael.b@email.com',
      address: '789 Pine Rd, Queens, NY 11375',
      registeredDate: '2023-11-10',
      lastVisit: '2026-01-25',
      totalVisits: 15,
      conditions: ['Diabetes Type 2', 'High Cholesterol'],
      allergies: ['None'],
      emergencyContact: {
        name: 'Lisa Brown',
        relation: 'Wife',
        phone: '+1 (555) 345-6790'
      }
    },
    {
      id: 4,
      patientId: 'PAT-004',
      name: 'Emma Davis',
      age: 52,
      gender: 'Female',
      bloodGroup: 'AB+',
      phone: '+1 (555) 456-7890',
      email: 'emma.d@email.com',
      address: '321 Elm St, Manhattan, NY 10002',
      registeredDate: '2023-08-05',
      lastVisit: '2026-01-30',
      totalVisits: 20,
      conditions: ['Arthritis', 'Osteoporosis'],
      allergies: ['Sulfa drugs'],
      emergencyContact: {
        name: 'Tom Davis',
        relation: 'Husband',
        phone: '+1 (555) 456-7891'
      }
    },
    {
      id: 5,
      patientId: 'PAT-005',
      name: 'Robert Johnson',
      age: 38,
      gender: 'Male',
      bloodGroup: 'O-',
      phone: '+1 (555) 567-8901',
      email: 'robert.j@email.com',
      address: '654 Maple Dr, Bronx, NY 10451',
      registeredDate: '2024-02-14',
      lastVisit: '2025-12-20',
      totalVisits: 6,
      conditions: ['None'],
      allergies: ['Latex'],
      emergencyContact: {
        name: 'Mary Johnson',
        relation: 'Mother',
        phone: '+1 (555) 567-8902'
      }
    },
    {
      id: 6,
      patientId: 'PAT-006',
      name: 'Lisa Anderson',
      age: 31,
      gender: 'Female',
      bloodGroup: 'A-',
      phone: '+1 (555) 678-9012',
      email: 'lisa.a@email.com',
      address: '987 Cedar Ln, Staten Island, NY 10301',
      registeredDate: '2024-04-22',
      lastVisit: '2026-02-02',
      totalVisits: 9,
      conditions: ['Migraine'],
      allergies: ['None'],
      emergencyContact: {
        name: 'James Anderson',
        relation: 'Brother',
        phone: '+1 (555) 678-9013'
      }
    }
  ];

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = 
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.phone.includes(searchQuery);
    
    const matchesGender = filterGender === 'all' || patient.gender === filterGender;
    const matchesBloodGroup = filterBloodGroup === 'all' || patient.bloodGroup === filterBloodGroup;
    
    return matchesSearch && matchesGender && matchesBloodGroup;
  });

  const stats = [
    { label: 'Total Patients', value: patients.length, color: '#3B82F6' },
    { label: 'Male', value: patients.filter(p => p.gender === 'Male').length, color: '#10B981' },
    { label: 'Female', value: patients.filter(p => p.gender === 'Female').length, color: '#F59E0B' },
    { label: 'Active This Month', value: patients.filter(p => new Date(p.lastVisit) > new Date('2026-01-01')).length, color: '#8B5CF6' }
  ];

  const handleViewDetails = (patient) => {
    setSelectedPatient(patient);
    setShowDetailsModal(true);
  };

  const handleViewHistory = (patient) => {
    alert(`Viewing medical history for ${patient.name}`);
    // Navigate to patient history page
  };

  return (
    <div className="doctor-patients-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Patients</h1>
          <p>Manage your patient records</p>
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

      {/* Filters and Search */}
      <div className="filters-section">
        <div className="search-box">
          <MdSearch size={20} />
          <input 
            type="text" 
            placeholder="Search by name, ID, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-dropdowns">
          <select 
            className="filter-select"
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
          >
            <option value="all">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          <select 
            className="filter-select"
            value={filterBloodGroup}
            onChange={(e) => setFilterBloodGroup(e.target.value)}
          >
            <option value="all">All Blood Groups</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>
      </div>

      {/* Patients Grid */}
      <div className="patients-grid">
        {filteredPatients.length === 0 ? (
          <div className="no-patients">
            <MdPerson size={48} />
            <h3>No patients found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredPatients.map((patient) => (
            <div key={patient.id} className="patient-card">
              <div className="patient-header">
                <div className="patient-avatar">
                  {patient.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="patient-basic-info">
                  <h3>{patient.name}</h3>
                  <p className="patient-id">{patient.patientId}</p>
                </div>
                <div className="blood-group-badge">
                  <FaTint size={12} />
                  {patient.bloodGroup}
                </div>
              </div>

              <div className="patient-details">
                <div className="detail-item">
                  <span className="detail-label">Age:</span>
                  <span className="detail-value">{patient.age} yrs</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Gender:</span>
                  <span className="detail-value">{patient.gender}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Phone:</span>
                  <span className="detail-value">{patient.phone}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Last Visit:</span>
                  <span className="detail-value">
                    {new Date(patient.lastVisit).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total Visits:</span>
                  <span className="detail-value">{patient.totalVisits}</span>
                </div>
              </div>

              <div className="patient-conditions">
                <span className="conditions-label">Conditions:</span>
                <div className="conditions-tags">
                  {patient.conditions.map((condition, index) => (
                    <span key={index} className="condition-tag">
                      {condition}
                    </span>
                  ))}
                </div>
              </div>

              <div className="patient-actions">
                <button 
                  className="btn-view-details"
                  onClick={() => handleViewDetails(patient)}
                >
                  <MdInfo size={18} />
                  Details
                </button>
                <button 
                  className="btn-view-history"
                  onClick={() => handleViewHistory(patient)}
                >
                  <MdHistory size={18} />
                  History
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Patient Details</h2>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>
                <MdClose size={24} />
              </button>
            </div>

            <div className="details-body">
              {/* Basic Info */}
              <div className="details-section">
                <div className="section-header-small">
                  <MdPerson size={20} />
                  <h3>Basic Information</h3>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Patient ID:</span>
                  <span className="detail-value">{selectedPatient.patientId}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Full Name:</span>
                  <span className="detail-value">{selectedPatient.name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Age:</span>
                  <span className="detail-value">{selectedPatient.age} years</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Gender:</span>
                  <span className="detail-value">{selectedPatient.gender}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Blood Group:</span>
                  <span className="detail-value">{selectedPatient.bloodGroup}</span>
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
                  <span className="detail-value">{selectedPatient.phone}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{selectedPatient.email}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Address:</span>
                  <span className="detail-value">{selectedPatient.address}</span>
                </div>
              </div>

              {/* Medical Info */}
              <div className="details-section">
                <div className="section-header-small">
                  <FaStethoscope size={20} />
                  <h3>Medical Information</h3>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Registered Date:</span>
                  <span className="detail-value">
                    {new Date(selectedPatient.registeredDate).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Last Visit:</span>
                  <span className="detail-value">
                    {new Date(selectedPatient.lastVisit).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Total Visits:</span>
                  <span className="detail-value">{selectedPatient.totalVisits}</span>
                </div>
              </div>

              {/* Conditions */}
              <div className="details-section">
                <div className="section-header-small">
                  <MdInfo size={20} />
                  <h3>Medical Conditions</h3>
                </div>
                <div className="info-box">
                  {selectedPatient.conditions.join(', ')}
                </div>
              </div>

              {/* Allergies */}
              <div className="details-section">
                <div className="section-header-small">
                  <MdInfo size={20} />
                  <h3>Allergies</h3>
                </div>
                <div className="warning-box">
                  {selectedPatient.allergies.join(', ')}
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="details-section">
                <div className="section-header-small">
                  <MdPhone size={20} />
                  <h3>Emergency Contact</h3>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{selectedPatient.emergencyContact.name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Relationship:</span>
                  <span className="detail-value">{selectedPatient.emergencyContact.relation}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Phone:</span>
                  <span className="detail-value">{selectedPatient.emergencyContact.phone}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorPatients;