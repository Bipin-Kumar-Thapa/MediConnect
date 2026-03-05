import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdNotifications,
  MdSearch,
  MdPerson,
  MdEmail,
  MdPhone,
  MdLocationOn,
  MdClose,
  MdCheckCircle,
  MdCancel,
  MdAccessTime
} from 'react-icons/md';
import { FaPrescriptionBottle } from 'react-icons/fa';
import '../../styles/pharmacy/PharmacyRequests.css';

const PharmacyRequests = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [pharmacyNotes, setPharmacyNotes] = useState('');
  const [declineReason, setDeclineReason] = useState('');

  const requests = [
    {
      id: 'REQ-045',
      patient: 'John Doe',
      patientId: 'PAT-001',
      phone: '+1 (555) 123-4567',
      email: 'john.doe@email.com',
      address: '123 Main Street, Apt 4B, New York, NY 10001',
      status: 'Pending',
      medicines: [
        { name: 'Paracetamol 500mg', quantity: 20, unit: 'tablets', reason: 'Fever, headache', price: 10 },
        { name: 'Cough Syrup 100ml', quantity: 1, unit: 'bottle', reason: 'Persistent cough', price: 50 }
      ],
      reason: 'Having fever and headache for 2 days. Need immediate relief.',
      requestDate: '2 hours ago',
      totalAmount: 250
    },
    {
      id: 'REQ-044',
      patient: 'Sarah Williams',
      patientId: 'PAT-002',
      phone: '+1 (555) 234-5678',
      email: 'sarah.w@email.com',
      address: '456 Oak Avenue, Brooklyn, NY 11201',
      status: 'Pending',
      medicines: [
        { name: 'Vitamin D 1000IU', quantity: 30, unit: 'tablets', reason: 'Deficiency', price: 15 }
      ],
      reason: 'Doctor recommended Vitamin D supplement. Running out of supply.',
      requestDate: '4 hours ago',
      totalAmount: 450
    },
    {
      id: 'REQ-043',
      patient: 'Michael Brown',
      patientId: 'PAT-003',
      phone: '+1 (555) 345-6789',
      email: 'michael.b@email.com',
      address: '789 Park Lane, Queens, NY 11432',
      status: 'Pending',
      medicines: [
        { name: 'Insulin Injection', quantity: 3, unit: 'vials', reason: 'Diabetes management', price: 80 }
      ],
      reason: 'Regular monthly insulin supply needed for diabetes.',
      requestDate: '6 hours ago',
      totalAmount: 240
    }
  ];

  const filteredRequests = requests.filter(req => {
    if (activeFilter !== 'All' && req.status !== activeFilter) return false;
    if (searchQuery && !req.patient.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !req.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleAccept = (request) => {
    setSelectedRequest(request);
    setShowAcceptModal(true);
  };

  const handleDecline = (request) => {
    setSelectedRequest(request);
    setShowDeclineModal(true);
  };

  const closeModals = () => {
    setShowAcceptModal(false);
    setShowDeclineModal(false);
    setSelectedRequest(null);
    setPharmacyNotes('');
    setDeclineReason('');
  };

  const confirmAccept = () => {
    alert(`✓ Request ${selectedRequest.id} accepted!\nDelivery scheduled.\nTotal: ₹${selectedRequest.totalAmount}`);
    closeModals();
  };

  const confirmDecline = () => {
    if (!declineReason.trim()) {
      alert('Please provide a reason for declining');
      return;
    }
    alert(`Request ${selectedRequest.id} declined.\nReason: ${declineReason}`);
    closeModals();
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'Pending': return 'phr-badge--yellow';
      case 'Accepted': return 'phr-badge--green';
      case 'Declined': return 'phr-badge--red';
      default: return 'phr-badge--yellow';
    }
  };

  return (
    <div className="pharmacy-requests-wrapper">
      <div className="phr-page">

        {/* Header */}
        <div className="phr-header">
          <div>
            <h1>Patient Medicine Requests</h1>
            <p>Review and approve patient requests</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="phr-toolbar">
          <div className="phr-search-wrap">
            <MdSearch className="phr-search-icon" />
            <input 
              type="text" 
              className="phr-search-input" 
              placeholder="Search by patient name, request ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="phr-filter-row">
            <button 
              className={`phr-filter-btn ${activeFilter === 'All' ? 'phr-filter-btn--active' : ''}`}
              onClick={() => setActiveFilter('All')}
            >
              All
            </button>
            <button 
              className={`phr-filter-btn ${activeFilter === 'Pending' ? 'phr-filter-btn--active' : ''}`}
              onClick={() => setActiveFilter('Pending')}
            >
              Pending
            </button>
            <button 
              className={`phr-filter-btn ${activeFilter === 'Accepted' ? 'phr-filter-btn--active' : ''}`}
              onClick={() => setActiveFilter('Accepted')}
            >
              Accepted
            </button>
            <button 
              className={`phr-filter-btn ${activeFilter === 'Declined' ? 'phr-filter-btn--active' : ''}`}
              onClick={() => setActiveFilter('Declined')}
            >
              Declined
            </button>
          </div>
        </div>

        {/* Request Cards */}
        {filteredRequests.map((request) => (
          <div key={request.id} className="phr-request-card">
            <div className="phr-request-header">
              <div>
                <div className="phr-request-patient">{request.patient}</div>
                <div className="phr-request-id">Patient ID: {request.patientId} • Request ID: {request.id}</div>
                <div className="phr-request-time">
                  <MdAccessTime />
                  {request.requestDate}
                </div>
              </div>
              <span className={`phr-badge ${getStatusBadgeClass(request.status)}`}>
                {request.status}
              </span>
            </div>

            <div className="phr-request-body">
              <div className="phr-medicines-section">
                <strong className="phr-section-label">REQUESTED MEDICINES:</strong>
                {request.medicines.map((med, index) => (
                  <div key={index} className="phr-medicine-item">
                    <FaPrescriptionBottle className="phr-med-icon" />
                    <div className="phr-med-details">
                      <div className="phr-med-name">{med.name}</div>
                      <div className="phr-med-meta">
                        {med.quantity} {med.unit} • {med.reason}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="phr-reason-section">
                <strong>Reason:</strong> {request.reason}
              </div>
            </div>

            <div className="phr-request-actions">
              <button 
                className="phr-btn-action phr-btn-accept"
                onClick={() => handleAccept(request)}
              >
                <MdCheckCircle />
                Accept & Deliver
              </button>
              <button 
                className="phr-btn-action phr-btn-decline"
                onClick={() => handleDecline(request)}
              >
                <MdCancel />
                Decline
              </button>
            </div>
          </div>
        ))}

        {/* Pagination */}
        <div className="phr-pagination">
          <button className="phr-page-btn" disabled={currentPage === 1}>
            ← Prev
          </button>
          <div className={`phr-page-num ${currentPage === 1 ? 'phr-page-num--active' : ''}`}>1</div>
          <div className={`phr-page-num ${currentPage === 2 ? 'phr-page-num--active' : ''}`}>2</div>
          <button className="phr-page-btn">
            Next →
          </button>
        </div>

      </div>

      {/* Accept Request Modal */}
      {showAcceptModal && selectedRequest && (
        <>
          <div className="phr-modal-overlay" onClick={closeModals} />
          <div className="phr-modal">
            <div className="phr-modal-header">
              <div className="phr-modal-title">
                <span className="phr-modal-icon phr-modal-icon--success">
                  <MdCheckCircle />
                </span>
                <span>Accept Medicine Request</span>
              </div>
              <button className="phr-modal-close" onClick={closeModals}>
                <MdClose />
              </button>
            </div>
            <div className="phr-modal-body">

              {/* Patient Information */}
              <div className="phr-info-section">
                <h4><MdPerson /> Patient Information</h4>
                <div className="phr-info-row">
                  <span className="phr-info-label">Name</span>
                  <span className="phr-info-value">{selectedRequest.patient}</span>
                </div>
                <div className="phr-info-row">
                  <span className="phr-info-label">Patient ID</span>
                  <span className="phr-info-value">{selectedRequest.patientId}</span>
                </div>
                <div className="phr-info-row">
                  <span className="phr-info-label">Phone</span>
                  <span className="phr-info-value">
                    <MdPhone style={{ fontSize: '14px', marginRight: '4px' }} />
                    {selectedRequest.phone}
                  </span>
                </div>
                <div className="phr-info-row">
                  <span className="phr-info-label">Email</span>
                  <span className="phr-info-value">
                    <MdEmail style={{ fontSize: '14px', marginRight: '4px' }} />
                    {selectedRequest.email}
                  </span>
                </div>
                <div className="phr-info-row">
                  <span className="phr-info-label">Address</span>
                  <span className="phr-info-value">
                    <MdLocationOn style={{ fontSize: '14px', marginRight: '4px' }} />
                    {selectedRequest.address}
                  </span>
                </div>
              </div>

              {/* Requested Medicines */}
              <div className="phr-info-section">
                <h4><FaPrescriptionBottle /> Requested Medicines</h4>
                {selectedRequest.medicines.map((med, index) => (
                  <div key={index} className="phr-med-item-detail">
                    • {med.name} - {med.quantity} {med.unit}
                  </div>
                ))}
              </div>

              {/* Pharmacy Notes */}
              <div className="phr-form-field">
                <label>Pharmacy Notes (Optional)</label>
                <textarea 
                  rows="3" 
                  placeholder="Add any notes or instructions for the patient..."
                  value={pharmacyNotes}
                  onChange={(e) => setPharmacyNotes(e.target.value)}
                />
              </div>

              {/* Payment Box */}
              <div className="phr-payment-box">
                <h4>💰 Payment - Cash on Delivery</h4>
                <div className="phr-payment-breakdown">
                  {selectedRequest.medicines.map((med, index) => (
                    <div key={index} className="phr-payment-item">
                      • {med.name}: ₹{med.price} × {med.quantity} = ₹{med.price * med.quantity}
                    </div>
                  ))}
                </div>
                <div className="phr-payment-amount">₹ {selectedRequest.totalAmount}.00</div>
                <div className="phr-payment-note">💵 Patient will pay cash when medicine is delivered</div>
              </div>

              <div className="phr-modal-actions">
                <button className="phr-btn-cancel" onClick={closeModals}>
                  Cancel
                </button>
                <button className="phr-btn-primary phr-btn-primary--success" onClick={confirmAccept}>
                  <MdCheckCircle />
                  Accept & Schedule Delivery
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Decline Request Modal */}
      {showDeclineModal && selectedRequest && (
        <>
          <div className="phr-modal-overlay" onClick={closeModals} />
          <div className="phr-modal">
            <div className="phr-modal-header">
              <div className="phr-modal-title">
                <span className="phr-modal-icon phr-modal-icon--danger">
                  <MdCancel />
                </span>
                <span>Decline Medicine Request</span>
              </div>
              <button className="phr-modal-close" onClick={closeModals}>
                <MdClose />
              </button>
            </div>
            <div className="phr-modal-body">

              <div className="phr-decline-info">
                <strong>Patient:</strong> {selectedRequest.patient} ({selectedRequest.patientId}) | <strong>Request ID:</strong> {selectedRequest.id}
              </div>

              <div className="phr-form-field">
                <label>Reason for Declining (Required) *</label>
                <textarea 
                  rows="4" 
                  placeholder="Please provide a reason for declining this request..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  required
                />
              </div>

              <div className="phr-modal-actions">
                <button className="phr-btn-cancel" onClick={closeModals}>
                  Cancel
                </button>
                <button className="phr-btn-primary phr-btn-primary--danger" onClick={confirmDecline}>
                  <MdCancel />
                  Decline Request
                </button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default PharmacyRequests;