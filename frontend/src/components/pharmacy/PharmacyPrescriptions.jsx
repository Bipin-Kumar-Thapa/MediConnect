import React, { useState, useEffect } from 'react';
import {
  MdSearch,
  MdCalendarToday,
  MdPerson,
  MdDescription,
  MdCheckCircle,
  MdClose,
  MdVisibility,
  MdAssignment,
  MdCancel,
  MdPauseCircle,
  MdLocalHospital
} from 'react-icons/md';
import { FaUserMd, FaPrescriptionBottle } from 'react-icons/fa';
import '../../styles/pharmacy/PharmacyPrescriptions.css';

const PharmacyPrescriptions = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeFilter, setActiveFilter] = useState('pending');
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [prescriptionDetails, setPrescriptionDetails] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [prescriptions, setPrescriptions] = useState([]);
  const [stats, setStats] = useState({
    total_pending: 0,
    total_fulfilled: 0,
    total_hold: 0,
    total_cancelled: 0
  });
  
  const [selectedMedicines, setSelectedMedicines] = useState([]);

  // Fetch prescriptions
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchPrescriptions();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [activeFilter, selectedDate, searchQuery]);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: activeFilter,
        date: selectedDate,
        search: searchQuery
      });

      const response = await fetch(
        `http://localhost:8000/pharmacy/prescriptions/?${params}`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setPrescriptions(data.prescriptions);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (prescription) => {
    try {
      const response = await fetch(
        `http://localhost:8000/pharmacy/prescriptions/${prescription.id}/`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedPrescription(prescription);
        setPrescriptionDetails(data);
        setShowViewModal(true);
      }
    } catch (error) {
      console.error('Error fetching prescription details:', error);
      alert('Failed to load prescription details');
    }
  };

  const handleAssign = async (prescription) => {
    try {
      const response = await fetch(
        `http://localhost:8000/pharmacy/prescriptions/${prescription.id}/`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedPrescription(prescription);
        setPrescriptionDetails(data);
        
        // Auto-select available/partial medicines
        const initialSelection = data.medicines
          .filter(m => m.stock_status === 'available' || m.stock_status === 'partial')
          .map(m => ({
            medicine_id: m.id,
            stock_id: m.stock_id,
            quantity: Math.min(m.total_needed, m.stock_available),
            total_needed: m.total_needed
          }));
        
        setSelectedMedicines(initialSelection);
        setShowAssignModal(true);
      }
    } catch (error) {
      console.error('Error fetching prescription details:', error);
      alert('Failed to load prescription details');
    }
  };

  const closeModals = () => {
    setShowViewModal(false);
    setShowAssignModal(false);
    setSelectedPrescription(null);
    setPrescriptionDetails(null);
    setSelectedMedicines([]);
  };

  const toggleMedicineSelection = (medicine) => {
    const exists = selectedMedicines.find(m => m.medicine_id === medicine.id);
    
    if (exists) {
      setSelectedMedicines(selectedMedicines.filter(m => m.medicine_id !== medicine.id));
    } else {
      if (medicine.stock_status === 'available' || medicine.stock_status === 'partial') {
        setSelectedMedicines([...selectedMedicines, {
          medicine_id: medicine.id,
          stock_id: medicine.stock_id,
          quantity: Math.min(medicine.total_needed, medicine.stock_available),
          total_needed: medicine.total_needed
        }]);
      }
    }
  };

  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  const handleFulfill = async () => {
    if (selectedMedicines.length === 0) {
      alert('Please select at least one medicine to fulfill');
      return;
    }

    if (!window.confirm(`Fulfill ${selectedMedicines.length} medicine(s)?`)) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/pharmacy/prescriptions/${prescriptionDetails.id}/fulfill/`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
          },
          body: JSON.stringify({
            action: 'fulfill',
            selected_medicines: selectedMedicines
          })
        }
      );

      if (response.ok) {
        alert('Prescription fulfilled successfully!');
        closeModals();
        fetchPrescriptions();
      } else {
        const errorData = await response.json();
        alert(`Failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fulfilling prescription:', error);
      alert('Error fulfilling prescription');
    }
  };

  const handleHold = async () => {
    if (!window.confirm('Put this prescription on hold?')) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/pharmacy/prescriptions/${prescriptionDetails.id}/fulfill/`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
          },
          body: JSON.stringify({ action: 'hold' })
        }
      );

      if (response.ok) {
        alert('Prescription put on hold');
        closeModals();
        fetchPrescriptions();
      } else {
        const errorData = await response.json();
        alert(`Failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error holding prescription:', error);
      alert('Error holding prescription');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this prescription?')) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/pharmacy/prescriptions/${prescriptionDetails.id}/fulfill/`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
          },
          body: JSON.stringify({ action: 'cancel' })
        }
      );

      if (response.ok) {
        alert('Prescription cancelled');
        closeModals();
        fetchPrescriptions();
      } else {
        const errorData = await response.json();
        alert(`Failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error cancelling prescription:', error);
      alert('Error cancelling prescription');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'pending': return 'ppn-badge--pending';
      case 'fulfilled': 
      case 'partial': return 'ppn-badge--fulfilled';
      case 'on_hold': return 'ppn-badge--hold';
      case 'cancelled': return 'ppn-badge--cancelled';
      default: return 'ppn-badge--pending';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending': return '⏳';
      case 'fulfilled': 
      case 'partial': return '✓';
      case 'on_hold': return '⏸️';
      case 'cancelled': return '✕';
      default: return '⏳';
    }
  };

  const getStatusDisplay = (status) => {
    switch(status) {
      case 'pending': return 'Pending';
      case 'fulfilled': return 'Fulfilled';
      case 'partial': return 'Partial';
      case 'on_hold': return 'Hold';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getStockStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return <span className="ppn-stock-badge ppn-stock-badge--available">✅ Available</span>;
      case 'partial':
        return <span className="ppn-stock-badge ppn-stock-badge--partial">⚠️ Partial</span>;
      case 'out_of_stock':
        return <span className="ppn-stock-badge ppn-stock-badge--out">❌ Out of Stock</span>;
      case 'not_found':
        return <span className="ppn-stock-badge ppn-stock-badge--notfound">❓ Not Found</span>;
      default:
        return null;
    }
  };

  const totalStats = stats.total_pending + stats.total_fulfilled + stats.total_hold + stats.total_cancelled;

  if (loading && !prescriptions.length) {
    return (
      <div className="pharmacy-prescriptions-new-wrapper">
        <div className="ppn-page">
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pharmacy-prescriptions-new-wrapper">
      <div className="ppn-page">

        {/* Header */}
        <div className="ppn-header">
          <div>
            <h1>Prescriptions</h1>
            <p>Manage and fulfill doctor prescriptions</p>
          </div>
          <div className="ppn-calendar-filter">
            <MdCalendarToday />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        {/* Stats Grid - 2x2 */}
        <div className="ppn-stats-grid">
          <div className="ppn-stat-card ppn-stat-card--blue">
            <div className="ppn-stat-num">{totalStats}</div>
            <div className="ppn-stat-label">Total</div>
          </div>
          <div className="ppn-stat-card ppn-stat-card--green">
            <div className="ppn-stat-num">{stats.total_fulfilled}</div>
            <div className="ppn-stat-label">Fulfilled</div>
          </div>
          <div className="ppn-stat-card ppn-stat-card--orange">
            <div className="ppn-stat-num">{stats.total_hold}</div>
            <div className="ppn-stat-label">Hold</div>
          </div>
          <div className="ppn-stat-card ppn-stat-card--red">
            <div className="ppn-stat-num">{stats.total_cancelled}</div>
            <div className="ppn-stat-label">Cancelled</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="ppn-toolbar">
          <div className="ppn-search-wrap">
            <MdSearch className="ppn-search-icon" />
            <input 
              type="text" 
              className="ppn-search-input" 
              placeholder="Search by prescription ID, patient name, or doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="ppn-filter-row">
            <button 
              className={`ppn-filter-btn ${activeFilter === 'all' ? 'ppn-filter-btn--active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All
            </button>
            <button 
              className={`ppn-filter-btn ${activeFilter === 'pending' ? 'ppn-filter-btn--active' : ''}`}
              onClick={() => setActiveFilter('pending')}
            >
              Pending
            </button>
            <button 
              className={`ppn-filter-btn ${activeFilter === 'fulfilled' ? 'ppn-filter-btn--active' : ''}`}
              onClick={() => setActiveFilter('fulfilled')}
            >
              Fulfilled
            </button>
            <button 
              className={`ppn-filter-btn ${activeFilter === 'on_hold' ? 'ppn-filter-btn--active' : ''}`}
              onClick={() => setActiveFilter('on_hold')}
            >
              Hold
            </button>
            <button 
              className={`ppn-filter-btn ${activeFilter === 'cancelled' ? 'ppn-filter-btn--active' : ''}`}
              onClick={() => setActiveFilter('cancelled')}
            >
              Cancelled
            </button>
          </div>
        </div>

        {/* Results Info */}
        {prescriptions.length > 0 && (
          <div className="ppn-results-info">
            Showing 1-{prescriptions.length} of {prescriptions.length} prescriptions
          </div>
        )}

        {/* Prescriptions Grid */}
        {prescriptions.length === 0 ? (
          <div className="ppn-empty-state">
            <FaPrescriptionBottle style={{ fontSize: '64px', color: '#d1d5db' }} />
            <p>No prescriptions found for this date</p>
          </div>
        ) : (
          <div className="ppn-prescriptions-grid">
            {prescriptions.map((prescription) => (
              <div key={prescription.id} className="ppn-prescription-card">
                <div className="ppn-card-header">
                  <div className="ppn-card-id">
                    <MdDescription className="ppn-card-id-icon" />
                    <span className="ppn-card-id-text">{prescription.prescription_number}</span>
                  </div>
                  <span className={`ppn-status-badge ${getStatusBadgeClass(prescription.status)}`}>
                    {getStatusIcon(prescription.status)} {getStatusDisplay(prescription.status)}
                  </span>
                </div>

                <div className="ppn-card-info">
                  <div className="ppn-info-row">
                    <span className="ppn-info-label">
                      <MdCalendarToday />
                      PRESCRIBED DATE
                    </span>
                    <span className="ppn-info-value">{prescription.date}</span>
                  </div>
                  <div className="ppn-info-row">
                    <span className="ppn-info-label">
                      <MdPerson />
                      PATIENT
                    </span>
                    <span className="ppn-info-value">{prescription.patient_name}</span>
                  </div>
                  <div className="ppn-info-row">
                    <span className="ppn-info-label">
                      <FaUserMd />
                      DOCTOR
                    </span>
                    <span className="ppn-info-value">{prescription.doctor_name}</span>
                  </div>
                  <div className="ppn-info-row">
                    <span className="ppn-info-label">
                      <FaPrescriptionBottle />
                      MEDICINES
                    </span>
                    <span className="ppn-info-value">{prescription.medicines_count} item{prescription.medicines_count > 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="ppn-card-actions">
                  <button 
                    className="ppn-btn ppn-btn-view"
                    onClick={() => handleViewDetails(prescription)}
                  >
                    <MdVisibility />
                    View Details
                  </button>
                  {/* Show Assign button for pending and on_hold */}
                  {(prescription.status === 'pending' || prescription.status === 'on_hold') && (
                    <button 
                      className="ppn-btn ppn-btn-assign"
                      onClick={() => handleAssign(prescription)}
                    >
                      <MdAssignment />
                      Assign
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* View Details Modal */}
      {showViewModal && prescriptionDetails && (
        <>
          <div className="ppn-modal-overlay" onClick={closeModals} />
          <div className="ppn-modal">
            <div className="ppn-modal-header">
              <div className="ppn-modal-title">
                <MdDescription />
                <span>Prescription Details (View Only)</span>
              </div>
              <button className="ppn-modal-close" onClick={closeModals}>
                <MdClose />
              </button>
            </div>
            <div className="ppn-modal-body">
              <div className="ppn-modal-section">
                <h4><MdPerson /> Patient Information</h4>
                <div className="ppn-modal-info-grid">
                  <span className="ppn-modal-label">Name:</span>
                  <span className="ppn-modal-value">{prescriptionDetails.patient_name}</span>
                  <span className="ppn-modal-label">Patient ID:</span>
                  <span className="ppn-modal-value">{prescriptionDetails.patient_id}</span>
                  <span className="ppn-modal-label">Age:</span>
                  <span className="ppn-modal-value">{prescriptionDetails.patient_age} years</span>
                </div>
              </div>

              <div className="ppn-modal-section">
                <h4><FaUserMd /> Doctor Information</h4>
                <div className="ppn-modal-info-grid">
                  <span className="ppn-modal-label">Doctor:</span>
                  <span className="ppn-modal-value">{prescriptionDetails.doctor_name}</span>
                  <span className="ppn-modal-label">Specialty:</span>
                  <span className="ppn-modal-value">{prescriptionDetails.doctor_specialty}</span>
                  <span className="ppn-modal-label">Date:</span>
                  <span className="ppn-modal-value">{prescriptionDetails.date} at {prescriptionDetails.time}</span>
                </div>
              </div>

              <div className="ppn-modal-section">
                <h4><MdLocalHospital /> Diagnosis</h4>
                <div className="ppn-diagnosis-box">
                  {prescriptionDetails.diagnosis}
                </div>
              </div>

              <div className="ppn-modal-section">
                <h4><FaPrescriptionBottle /> Prescribed Medicines</h4>
                <div className="ppn-medicines-list">
                  {prescriptionDetails.medicines.map((med, index) => (
                    <div key={index} className="ppn-medicine-item">
                      <div className="ppn-medicine-header">
                        <strong>{index + 1}. {med.name}</strong>
                        {getStockStatusBadge(med.stock_status)}
                      </div>
                      <p><strong>Dosage:</strong> {med.dosage}</p>
                      <p><strong>Frequency:</strong> {med.frequency}</p>
                      <p><strong>Duration:</strong> {med.duration}</p>
                      <p><strong>Total Needed:</strong> {med.total_needed} units</p>
                      {med.stock_available > 0 && (
                        <p><strong>Stock Available:</strong> {med.stock_available} units</p>
                      )}
                      {med.instructions && (
                        <p><strong>Instructions:</strong> {med.instructions}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {prescriptionDetails.notes && (
                <div className="ppn-modal-section">
                  <h4>Notes</h4>
                  <div className="ppn-diagnosis-box">
                    {prescriptionDetails.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Assign Modal */}
      {showAssignModal && prescriptionDetails && (
        <>
          <div className="ppn-modal-overlay" onClick={closeModals} />
          <div className="ppn-modal ppn-modal-assign">
            <div className="ppn-modal-header">
              <div className="ppn-modal-title">
                <MdAssignment />
                <span>Assign Prescription - {prescriptionDetails.prescription_number}</span>
              </div>
              <button className="ppn-modal-close" onClick={closeModals}>
                <MdClose />
              </button>
            </div>
            <div className="ppn-modal-body">
              <div className="ppn-modal-section">
                <h4><MdPerson /> Patient: {prescriptionDetails.patient_name} ({prescriptionDetails.patient_id})</h4>
              </div>

              <div className="ppn-modal-section">
                <h4><FaPrescriptionBottle /> Select Medicines to Dispense</h4>
                <div className="ppn-medicines-checklist">
                  {prescriptionDetails.medicines.map((med, index) => {
                    const isSelected = selectedMedicines.find(m => m.medicine_id === med.id);
                    const canSelect = med.stock_status === 'available' || med.stock_status === 'partial';
                    
                    return (
                      <div key={index} className="ppn-medicine-check-item">
                        <div className="ppn-medicine-check-header">
                          <strong>{index + 1}. {med.name}</strong>
                          {getStockStatusBadge(med.stock_status)}
                        </div>
                        <p>Frequency: {med.frequency} | Duration: {med.duration}</p>
                        <p>Total Needed: {med.total_needed} units | Available: {med.stock_available} units</p>
                        
                        {canSelect && (
                          <div className="ppn-medicine-checkbox">
                            <label>
                              <input
                                type="checkbox"
                                checked={!!isSelected}
                                onChange={() => toggleMedicineSelection(med)}
                              />
                              <span>Dispense ({Math.min(med.total_needed, med.stock_available)} units)</span>
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="ppn-action-buttons">
                <button className="ppn-btn ppn-btn-cancel" onClick={handleCancel}>
                  <MdCancel />
                  Cancel
                </button>
                <button className="ppn-btn ppn-btn-hold" onClick={handleHold}>
                  <MdPauseCircle />
                  Hold
                </button>
                <button 
                  className="ppn-btn ppn-btn-fulfill" 
                  onClick={handleFulfill}
                  disabled={selectedMedicines.length === 0}
                >
                  <MdCheckCircle />
                  Fulfill ({selectedMedicines.length})
                </button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default PharmacyPrescriptions;