import React, { useState, useEffect } from 'react';
import { 
  MdMedication,
  MdAdd,
  MdPerson,
  MdCalendarToday,
  MdClose,
  MdSearch,
  MdInfo,
  MdDelete
} from 'react-icons/md';
import { FaFileMedical, FaPrescription } from 'react-icons/fa';
import { getCSRFToken } from '../../utils/csrf';
import '../../styles/doctor/DoctorPrescriptions.css';

const DoctorPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0
  });
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    patient_id: '',
    diagnosis: '',
    notes: '',
    valid_until: ''
  });

  const [medicines, setMedicines] = useState([
    { name: '', dosage: '', frequency: '', duration: '', instructions: '' }
  ]);

  useEffect(() => {
    fetchPrescriptions();
    fetchPatients();
  }, []);

  useEffect(() => {
    fetchPrescriptions();
  }, [filterStatus, searchQuery]);

  const fetchPrescriptions = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(
        `http://localhost:8000/doctor/prescriptions/?${params.toString()}`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setPrescriptions(data.prescriptions);
        setStats(data.stats);
      } else {
        console.error('Failed to fetch prescriptions');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await fetch(
        'http://localhost:8000/doctor/patients/list/',
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const handleViewDetails = (prescription) => {
    setSelectedPrescription(prescription);
    setShowDetailsModal(true);
  };

  const handleFormChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleMedicineChange = (index, field, value) => {
    const updatedMedicines = [...medicines];
    updatedMedicines[index][field] = value;
    setMedicines(updatedMedicines);
  };

  const addMedicine = () => {
    setMedicines([...medicines, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };

  const removeMedicine = (index) => {
    if (medicines.length > 1) {
      setMedicines(medicines.filter((_, i) => i !== index));
    }
  };

  const handleCreatePrescription = async (e) => {
    e.preventDefault();

    const validMedicines = medicines.filter(m => m.name && m.dosage && m.frequency && m.duration);
    if (validMedicines.length === 0) {
      alert('Please add at least one medicine with all required fields');
      return;
    }

    try {
      const response = await fetch(
        'http://localhost:8000/doctor/prescriptions/create/',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
          },
          body: JSON.stringify({ ...formData, medicines: validMedicines })
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert(`Prescription ${data.prescription_number} created successfully!`);
        setShowCreateModal(false);
        setFormData({ patient_id: '', diagnosis: '', notes: '', valid_until: '' });
        setMedicines([{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
        fetchPrescriptions();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create prescription');
      }
    } catch (error) {
      console.error('Error creating prescription:', error);
      alert('An error occurred while creating prescription');
    }
  };

  const getStatusClass = (status) => `status-${status}`;

  // ✅ Removed 'Completed' stat
  const statsArray = [
    { label: 'Total Prescriptions', value: stats.total,   color: '#3B82F6' },
    { label: 'Active',              value: stats.active,  color: '#10B981' },
    { label: 'Expired',             value: stats.expired, color: '#EF4444' }
  ];

  if (loading) {
    return <div className="doctor-prescriptions-page">Loading...</div>;
  }

  return (
    <div className="doctor-prescriptions-page">

      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Prescriptions</h1>
          <p>Manage patient prescriptions</p>
        </div>
        <button className="btn-create" onClick={() => setShowCreateModal(true)}>
          <MdAdd size={20} />
          New Prescription
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
            placeholder="Search by patient name, ID, or prescription number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {/* ✅ Removed 'Completed' filter button */}
        <div className="filter-buttons">
          <button className={`filter-btn ${filterStatus === 'all'     ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>All</button>
          <button className={`filter-btn ${filterStatus === 'active'  ? 'active' : ''}`} onClick={() => setFilterStatus('active')}>Active</button>
          <button className={`filter-btn ${filterStatus === 'expired' ? 'active' : ''}`} onClick={() => setFilterStatus('expired')}>Expired</button>
        </div>
      </div>

      {/* Prescriptions Grid */}
      <div className="prescriptions-grid">
        {prescriptions.length === 0 ? (
          <div className="no-prescriptions">
            <FaPrescription size={48} />
            <h3>No prescriptions found</h3>
            <p>
              {filterStatus !== 'all' || searchQuery
                ? 'Try adjusting your search or filters'
                : 'No prescriptions issued yet'
              }
            </p>
          </div>
        ) : (
          prescriptions.map((prescription) => (
            <div key={prescription.id} className="prescription-card">
              <div className="card-header-rx">
                <div className="rx-number">
                  <FaFileMedical size={18} />
                  {prescription.prescriptionNumber}
                </div>
                <span className={`status-badge ${getStatusClass(prescription.status)}`}>
                  {prescription.status}
                </span>
              </div>

              <div className="card-body-rx">
                <div className="patient-section">
                  <div className="patient-avatar-small">
                    {prescription.patientName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3>{prescription.patientName}</h3>
                    <p className="patient-id-small">{prescription.patientId}</p>
                  </div>
                </div>

                <div className="rx-info">
                  <div className="info-item-rx">
                    <MdCalendarToday size={14} />
                    <span>Issued: {new Date(prescription.date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}</span>
                  </div>
                  <div className="info-item-rx">
                    <MdMedication size={14} />
                    <span>{prescription.medicines.length} medicine(s)</span>
                  </div>
                </div>

                <div className="diagnosis-box">
                  <strong>Diagnosis:</strong> {prescription.diagnosis}
                </div>
              </div>

              {/* ✅ Only View Details button — Download removed */}
              <div className="card-actions-rx">
                <button
                  className="btn-view-rx"
                  onClick={() => handleViewDetails(prescription)}
                >
                  <MdInfo size={18} />
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Prescription Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content create-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Prescription</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>
                <MdClose size={24} />
              </button>
            </div>

            <form className="prescription-form" onSubmit={handleCreatePrescription}>

              <div className="form-section">
                <h3>Patient Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Select Patient *</label>
                    <select
                      required
                      value={formData.patient_id}
                      onChange={(e) => handleFormChange('patient_id', e.target.value)}
                    >
                      <option value="">Choose a patient...</option>
                      {patients.map(patient => (
                        <option key={patient.id} value={patient.id}>
                          {patient.display}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Diagnosis *</h3>
                <div className="form-group">
                  <textarea
                    rows="3"
                    placeholder="Enter diagnosis..."
                    required
                    value={formData.diagnosis}
                    onChange={(e) => handleFormChange('diagnosis', e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="form-section">
                <h3>Medicines *</h3>
                {medicines.map((medicine, index) => (
                  <div key={index} className="medicine-entry">
                    <div className="medicine-entry-header">
                      <h4>Medicine {index + 1}</h4>
                      {medicines.length > 1 && (
                        <button
                          type="button"
                          className="btn-remove-medicine"
                          onClick={() => removeMedicine(index)}
                        >
                          <MdDelete size={18} />
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Medicine Name *</label>
                        <input
                          type="text"
                          placeholder="e.g., Aspirin"
                          required
                          value={medicine.name}
                          onChange={(e) => handleMedicineChange(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Dosage *</label>
                        <input
                          type="text"
                          placeholder="e.g., 75mg"
                          required
                          value={medicine.dosage}
                          onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Frequency *</label>
                        <input
                          type="text"
                          placeholder="e.g., Once daily"
                          required
                          value={medicine.frequency}
                          onChange={(e) => handleMedicineChange(index, 'frequency', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Duration *</label>
                        <input
                          type="text"
                          placeholder="e.g., 30 days"
                          required
                          value={medicine.duration}
                          onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Instructions</label>
                      <textarea
                        rows="2"
                        placeholder="e.g., Take with food"
                        value={medicine.instructions}
                        onChange={(e) => handleMedicineChange(index, 'instructions', e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-add-medicine" onClick={addMedicine}>
                  <MdAdd size={18} />
                  Add Another Medicine
                </button>
              </div>

              <div className="form-section">
                <h3>Validity</h3>
                <div className="form-group">
                  <label>Valid Until *</label>
                  <input
                    type="date"
                    required
                    value={formData.valid_until}
                    onChange={(e) => handleFormChange('valid_until', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Additional Notes</h3>
                <div className="form-group">
                  <textarea
                    rows="3"
                    placeholder="Any additional instructions or notes..."
                    value={formData.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  <FaFileMedical size={18} />
                  Create Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedPrescription && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Prescription Details</h2>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>
                <MdClose size={24} />
              </button>
            </div>

            <div className="details-body">

              {/* Prescription Info */}
              <div className="details-section">
                <div className="section-header-small">
                  <FaFileMedical size={20} />
                  <h3>Prescription Information</h3>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Prescription Number:</span>
                  <span className="detail-value">{selectedPrescription.prescriptionNumber}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className={`status-badge ${getStatusClass(selectedPrescription.status)}`}>
                    {selectedPrescription.status}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Issue Date:</span>
                  <span className="detail-value">
                    {new Date(selectedPrescription.date).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Valid Until:</span>
                  <span className="detail-value">
                    {new Date(selectedPrescription.validUntil).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Patient Info */}
              <div className="details-section">
                <div className="section-header-small">
                  <MdPerson size={20} />
                  <h3>Patient Information</h3>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{selectedPrescription.patientName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Patient ID:</span>
                  <span className="detail-value">{selectedPrescription.patientId}</span>
                </div>
              </div>

              {/* Diagnosis */}
              <div className="details-section">
                <div className="section-header-small">
                  <MdInfo size={20} />
                  <h3>Diagnosis</h3>
                </div>
                <div className="diagnosis-detail-box">
                  {selectedPrescription.diagnosis}
                </div>
              </div>

              {/* Medicines */}
              <div className="details-section">
                <div className="section-header-small">
                  <MdMedication size={20} />
                  <h3>Prescribed Medicines</h3>
                </div>
                {selectedPrescription.medicines.map((medicine, index) => (
                  <div key={index} className="medicine-detail-card">
                    <div className="medicine-detail-header">
                      <h4>{medicine.name}</h4>
                      <span className="dosage-badge">{medicine.dosage}</span>
                    </div>
                    <div className="medicine-detail-info">
                      <p><strong>Frequency:</strong> {medicine.frequency}</p>
                      <p><strong>Duration:</strong> {medicine.duration}</p>
                      <p><strong>Instructions:</strong> {medicine.instructions}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {selectedPrescription.notes && (
                <div className="details-section">
                  <div className="section-header-small">
                    <MdInfo size={20} />
                    <h3>Additional Notes</h3>
                  </div>
                  <div className="notes-detail-box">
                    {selectedPrescription.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorPrescriptions;