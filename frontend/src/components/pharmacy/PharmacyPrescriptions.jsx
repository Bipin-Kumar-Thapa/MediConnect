import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdDescription,
  MdSearch,
  MdPerson,
  MdCalendarToday,
  MdCheckCircle,
  MdPending,
  MdClose,
  MdAccessTime,
  MdInfo,
  MdScience
} from 'react-icons/md';
import { FaUserMd } from 'react-icons/fa';
import '../../styles/pharmacy/PharmacyPrescriptions.css';

const PharmacyPrescriptions = () => {
  const navigate = useNavigate();
  const [activeBox, setActiveBox] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('2026-02-19');
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const prescriptionsData = {
    pending: [
      {
        id: 'PRSC-127',
        patient: 'John Doe',
        patientId: 'PAT-001',
        age: 45,
        doctor: 'Dr. Sarah Mitchell',
        specialty: 'Cardiologist',
        date: 'Feb 19, 2026',
        time: '10:30 AM',
        diagnosis: 'Hypertension and mild headache',
        medicines: [
          {
            name: 'Paracetamol 500mg',
            dosage: '500mg',
            frequency: '2 times daily',
            duration: '4 days',
            instructions: 'Take after meals. Avoid alcohol.'
          },
          {
            name: 'Amoxicillin 250mg',
            dosage: '250mg',
            frequency: '3 times daily',
            duration: '7 days',
            instructions: 'Complete the full course.'
          }
        ],
        notes: 'Monitor blood pressure daily. Return for follow-up in 1 week.'
      },
      {
        id: 'PRSC-128',
        patient: 'Michael Brown',
        patientId: 'PAT-003',
        age: 38,
        doctor: 'Dr. Emily Chen',
        specialty: 'Neurologist',
        date: 'Feb 19, 2026',
        time: '11:45 AM',
        diagnosis: 'Migraine',
        medicines: [
          {
            name: 'Ibuprofen 400mg',
            dosage: '400mg',
            frequency: '2 times daily',
            duration: '5 days',
            instructions: 'Take with food.'
          }
        ],
        notes: 'Avoid bright lights and loud noises.'
      }
    ],
    fulfilled: [
      {
        id: 'PRSC-126',
        patient: 'Sarah Williams',
        patientId: 'PAT-002',
        age: 32,
        doctor: 'Dr. James Rodriguez',
        specialty: 'General Physician',
        date: 'Feb 19, 2026',
        time: '09:15 AM',
        diagnosis: 'Common cold',
        medicines: [
          {
            name: 'Vitamin C 1000mg',
            dosage: '1000mg',
            frequency: '1 time daily',
            duration: '10 days',
            instructions: 'Take with breakfast.'
          }
        ],
        notes: 'Rest and drink plenty of fluids.'
      }
    ]
  };

  const activePrescriptions = prescriptionsData[activeBox] || [];
  const totalPending = prescriptionsData.pending.length;
  const totalFulfilled = prescriptionsData.fulfilled.length;

  const handleViewDetails = (prescription) => {
    setSelectedPrescription(prescription);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPrescription(null);
  };

  return (
    <div className="pharmacy-prescriptions-wrapper">
      <div className="php-page">

        {/* Header */}
        <div className="php-header">
          <div>
            <h1>Prescriptions</h1>
            <p>Doctor-assigned prescriptions to fulfill</p>
          </div>
          <div className="php-header-right">
            <input 
              type="date" 
              className="php-date-picker" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        {/* Pending/Fulfilled Boxes */}
        <div className="php-boxes">
          <div 
            className={`php-box ${activeBox === 'pending' ? 'php-box--active' : ''}`}
            onClick={() => setActiveBox('pending')}
          >
            <div className="php-box-num">{totalPending}</div>
            <div className="php-box-label">Pending</div>
          </div>
          <div 
            className={`php-box ${activeBox === 'fulfilled' ? 'php-box--active' : ''}`}
            onClick={() => setActiveBox('fulfilled')}
          >
            <div className="php-box-num">{totalFulfilled}</div>
            <div className="php-box-label">Fulfilled</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="php-toolbar">
          <div className="php-search-wrap">
            <MdSearch className="php-search-icon" />
            <input 
              type="text" 
              className="php-search-input" 
              placeholder="Search by patient, doctor, prescription ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="php-filter-row">
            <button 
              className={`php-filter-btn ${activeFilter === 'All' ? 'php-filter-btn--active' : ''}`}
              onClick={() => setActiveFilter('All')}
            >
              All
            </button>
            <button 
              className={`php-filter-btn ${activeFilter === 'Today' ? 'php-filter-btn--active' : ''}`}
              onClick={() => setActiveFilter('Today')}
            >
              Today
            </button>
            <button 
              className={`php-filter-btn ${activeFilter === 'This Week' ? 'php-filter-btn--active' : ''}`}
              onClick={() => setActiveFilter('This Week')}
            >
              This Week
            </button>
          </div>
        </div>

        {/* Prescriptions Card */}
        <div className="php-card">
          <div className="php-card-header">
            <div className="php-card-title">
              <span className="php-card-icon">
                <MdDescription />
              </span>
              <span>{activeBox === 'pending' ? 'Pending' : 'Fulfilled'} Prescriptions</span>
            </div>
          </div>
          <div className="php-card-body">
            <div className="php-table-wrapper">
              <table className="php-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Date/Time</th>
                    <th>Medicines</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activePrescriptions.map((presc) => (
                    <tr key={presc.id}>
                      <td>
                        <code className="php-code">{presc.id}</code>
                      </td>
                      <td>
                        <div className="php-patient-cell">
                          <MdPerson className="php-patient-icon" />
                          <div>
                            <div className="php-patient-name">{presc.patient}</div>
                            <div className="php-patient-id">{presc.patientId}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="php-doctor-name">{presc.doctor}</div>
                          <div className="php-specialty">{presc.specialty}</div>
                        </div>
                      </td>
                      <td>
                        <div className="php-datetime">
                          <span>{presc.date}</span>
                          <span className="php-time">{presc.time}</span>
                        </div>
                      </td>
                      <td>{presc.medicines.length} medicine{presc.medicines.length > 1 ? 's' : ''}</td>
                      <td>
                        <button 
                          className="php-btn-action php-btn-action--assign"
                          onClick={() => handleViewDetails(presc)}
                        >
                          {activeBox === 'pending' ? 'Assign' : 'View'}
                        </button>
                        <button 
                          className="php-btn-action php-btn-action--view"
                          onClick={() => handleViewDetails(presc)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="php-pagination">
              <button className="php-page-btn" disabled={currentPage === 1}>
                ← Prev
              </button>
              <div className={`php-page-num ${currentPage === 1 ? 'php-page-num--active' : ''}`}>1</div>
              <div className={`php-page-num ${currentPage === 2 ? 'php-page-num--active' : ''}`}>2</div>
              <div className={`php-page-num ${currentPage === 3 ? 'php-page-num--active' : ''}`}>3</div>
              <button className="php-page-btn">
                Next →
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* View Prescription Modal */}
      {showModal && selectedPrescription && (
        <>
          <div className="php-modal-overlay" onClick={closeModal} />
          <div className="php-modal">
            <div className="php-modal-header">
              <div className="php-modal-title">
                <span className="php-modal-icon">
                  <MdDescription />
                </span>
                <span>Prescription Details</span>
              </div>
              <button className="php-modal-close" onClick={closeModal}>
                <MdClose />
              </button>
            </div>
            <div className="php-modal-body">
              
              {/* Patient Info */}
              <div className="php-info-section">
                <h4><MdPerson /> Patient Information</h4>
                <div className="php-info-row">
                  <span className="php-info-label">Name</span>
                  <span className="php-info-value">{selectedPrescription.patient}</span>
                </div>
                <div className="php-info-row">
                  <span className="php-info-label">Patient ID</span>
                  <span className="php-info-value">{selectedPrescription.patientId}</span>
                </div>
                <div className="php-info-row">
                  <span className="php-info-label">Age</span>
                  <span className="php-info-value">{selectedPrescription.age} years</span>
                </div>
              </div>

              {/* Doctor Info */}
              <div className="php-info-section">
                <h4><FaUserMd /> Doctor Information</h4>
                <div className="php-info-row">
                  <span className="php-info-label">Doctor</span>
                  <span className="php-info-value">{selectedPrescription.doctor}</span>
                </div>
                <div className="php-info-row">
                  <span className="php-info-label">Specialty</span>
                  <span className="php-info-value">{selectedPrescription.specialty}</span>
                </div>
                <div className="php-info-row">
                  <span className="php-info-label">Date</span>
                  <span className="php-info-value">{selectedPrescription.date} - {selectedPrescription.time}</span>
                </div>
              </div>

              {/* Diagnosis */}
              <div className="php-info-section">
                <h4><MdScience /> Diagnosis</h4>
                <div className="php-diagnosis-text">{selectedPrescription.diagnosis}</div>
              </div>

              {/* Medicines */}
              <div className="php-info-section">
                <h4><MdDescription /> Prescribed Medicines</h4>
                <div className="php-medicine-list">
                  {selectedPrescription.medicines.map((med, index) => (
                    <div key={index} className="php-medicine-item">
                      <h5>Medicine {index + 1}: {med.name}</h5>
                      <div className="php-medicine-meta">
                        <div>
                          <label>Dosage</label>
                          <span>{med.dosage}</span>
                        </div>
                        <div>
                          <label>Frequency</label>
                          <span>{med.frequency}</span>
                        </div>
                        <div>
                          <label>Duration</label>
                          <span>{med.duration}</span>
                        </div>
                      </div>
                      <div className="php-medicine-instructions">
                        📝 Instructions: {med.instructions}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Notes */}
              <div className="php-info-section">
                <h4><MdInfo /> Additional Notes</h4>
                <div className="php-notes-text">{selectedPrescription.notes}</div>
              </div>

              <div className="php-modal-actions">
                <button className="php-btn-cancel" onClick={closeModal}>
                  Close
                </button>
                {activeBox === 'pending' && (
                  <button className="php-btn-primary">
                    Assign Medicines
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default PharmacyPrescriptions;