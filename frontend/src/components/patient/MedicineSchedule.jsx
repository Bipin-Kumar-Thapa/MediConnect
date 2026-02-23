import React, { useState } from 'react';
import { 
  MdMedication,
  MdAccessTime,
  MdCalendarToday,
  MdNotifications,
  MdCheckCircle,
  MdInfo,
  MdClose,
  MdAlarm,
  MdLocalHospital,
  MdSearch
} from 'react-icons/md';
import { FaSun, FaMoon, FaCloudSun } from 'react-icons/fa';
import '../../styles/patient/MedicineSchedule.css';

const MedicineSchedule = () => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [takenMedicines, setTakenMedicines] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  // Sample medicines data
  const medicines = [
    {
      id: 1,
      name: 'Aspirin',
      dosage: '75mg',
      type: 'Tablet',
      frequency: 'Once daily',
      timing: {
        morning: true,
        afternoon: false,
        night: false
      },
      duration: '30 days',
      startDate: '2026-01-28',
      endDate: '2026-02-28',
      instructions: 'Take with food in the morning',
      stockRemaining: 25,
      totalStock: 30,
      prescribedBy: 'Dr. Sarah Mitchell',
      purpose: 'Blood thinning for heart health',
      sideEffects: 'May cause stomach upset',
      status: 'active'
    },
    {
      id: 2,
      name: 'Metoprolol',
      dosage: '50mg',
      type: 'Tablet',
      frequency: 'Twice daily',
      timing: {
        morning: true,
        afternoon: false,
        night: true
      },
      duration: '30 days',
      startDate: '2026-01-28',
      endDate: '2026-02-28',
      instructions: 'Take in morning and evening',
      stockRemaining: 48,
      totalStock: 60,
      prescribedBy: 'Dr. Sarah Mitchell',
      purpose: 'Blood pressure management',
      sideEffects: 'May cause dizziness, fatigue',
      status: 'active'
    },
    {
      id: 3,
      name: 'Vitamin D3',
      dosage: '1000 IU',
      type: 'Capsule',
      frequency: 'Once daily',
      timing: {
        morning: true,
        afternoon: false,
        night: false
      },
      duration: '60 days',
      startDate: '2026-01-15',
      endDate: '2026-03-15',
      instructions: 'Take with breakfast',
      stockRemaining: 40,
      totalStock: 60,
      prescribedBy: 'Dr. James Rodriguez',
      purpose: 'Vitamin D supplementation',
      sideEffects: 'Generally well tolerated',
      status: 'active'
    },
    {
      id: 4,
      name: 'Calcium Carbonate',
      dosage: '500mg',
      type: 'Tablet',
      frequency: 'Twice daily',
      timing: {
        morning: true,
        afternoon: false,
        night: true
      },
      duration: '60 days',
      startDate: '2026-01-15',
      endDate: '2026-03-15',
      instructions: 'Take with meals',
      stockRemaining: 3,
      totalStock: 120,
      prescribedBy: 'Dr. James Rodriguez',
      purpose: 'Calcium supplementation',
      sideEffects: 'May cause constipation',
      status: 'active'
    }
  ];

  const todaySchedule = [
    { time: 'Morning', icon: FaSun, color: '#F59E0B', medicines: medicines.filter(m => m.timing.morning && m.status === 'active') },
    { time: 'Afternoon', icon: FaCloudSun, color: '#3B82F6', medicines: medicines.filter(m => m.timing.afternoon && m.status === 'active') },
    { time: 'Night', icon: FaMoon, color: '#8B5CF6', medicines: medicines.filter(m => m.timing.night && m.status === 'active') }
  ];

  const stats = [
    { label: 'Active Medicines', value: medicines.filter(m => m.status === 'active').length, color: '#10B981' },
    { label: 'Today\'s Doses', value: todaySchedule.reduce((sum, slot) => sum + slot.medicines.length, 0), color: '#3B82F6' },
    { label: 'Low Stock', value: medicines.filter(m => m.stockRemaining < 5 && m.status === 'active').length, color: '#EF4444' },
    { label: 'Completed', value: medicines.filter(m => m.status === 'completed').length, color: '#8B5CF6' }
  ];

  // Filter medicines based on search query
  const filteredMedicines = medicines.filter(medicine => {
    const matchesSearch = 
      medicine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      medicine.dosage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      medicine.prescribedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      medicine.purpose.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleViewDetails = (medicine) => {
    setSelectedMedicine(medicine);
    setShowDetailsModal(true);
  };

  const toggleMedicineTaken = (medicineId, timeSlot) => {
    const key = `${medicineId}-${timeSlot}`;
    setTakenMedicines(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isMedicineTaken = (medicineId, timeSlot) => {
    const key = `${medicineId}-${timeSlot}`;
    return takenMedicines[key] || false;
  };

  const handleRefillStock = (medicine) => {
    alert(`Refill request sent for ${medicine.name}. The pharmacy will contact you soon.`);
    // Add your refill logic here
  };

  const getStockStatus = (medicine) => {
    const percentage = (medicine.stockRemaining / medicine.totalStock) * 100;
    if (percentage === 0) return 'out-of-stock';
    if (percentage < 15) return 'low-stock';
    if (percentage < 50) return 'medium-stock';
    return 'good-stock';
  };

  const getStockColor = (status) => {
    switch(status) {
      case 'out-of-stock': return '#EF4444';
      case 'low-stock': return '#F59E0B';
      case 'medium-stock': return '#3B82F6';
      case 'good-stock': return '#10B981';
      default: return '#6B7280';
    }
  };

  return (
    <div className="medicine-schedule-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Medicine Schedule</h1>
          <p>Manage your daily medication routine</p>
        </div>
        <div className="header-actions">
          <div className="header-date">
            <MdCalendarToday size={18} />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-picker"
            />
          </div>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card" style={{ borderLeftColor: stat.color }}>
            <h3>{stat.value}</h3>
            <p>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search Section */}
      <div className="search-section">
        <div className="search-box">
          <MdSearch size={20} />
          <input 
            type="text" 
            placeholder="Search medicines by name, dosage, doctor, or purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="schedule-section">
        <div className="section-header">
          <h2>Today's Schedule</h2>
          <button className="btn-reminder">
            <MdNotifications size={18} />
            Set Reminders
          </button>
        </div>

        <div className="schedule-grid">
          {todaySchedule.map((slot, index) => {
            const Icon = slot.icon;
            const timeSlot = slot.time.toLowerCase();
            
            return (
              <div key={index} className="schedule-slot">
                <div className="slot-header" style={{ backgroundColor: `${slot.color}15` }}>
                  <div className="slot-time">
                    <Icon style={{ color: slot.color }} size={24} />
                    <h3>{slot.time}</h3>
                  </div>
                  <span className="slot-count" style={{ backgroundColor: slot.color }}>
                    {slot.medicines.length}
                  </span>
                </div>
                <div className="slot-medicines">
                  {slot.medicines.length === 0 ? (
                    <div className="no-medicines">
                      <MdInfo size={20} />
                      <p>No medicines scheduled</p>
                    </div>
                  ) : (
                    slot.medicines.map((medicine) => {
                      const isTaken = isMedicineTaken(medicine.id, timeSlot);
                      
                      return (
                        <div 
                          key={medicine.id} 
                          className={`schedule-medicine-card ${isTaken ? 'taken' : ''}`}
                          onClick={() => toggleMedicineTaken(medicine.id, timeSlot)}
                        >
                          <div className="medicine-icon-small">
                            <MdMedication size={18} />
                          </div>
                          <div className="medicine-details-small">
                            <h4>{medicine.name}</h4>
                            <p>{medicine.dosage}</p>
                          </div>
                          <div className={`btn-take ${isTaken ? 'taken' : ''}`}>
                            <MdCheckCircle size={18} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="medicines-section">
        <div className="section-header">
          <h2>All Medicines</h2>
        </div>

        <div className="medicines-grid">
          {filteredMedicines.filter(m => m.status === 'active').length === 0 ? (
            <div className="no-medicines-found">
              <MdInfo size={48} />
              <h3>No medicines found</h3>
              <p>Try adjusting your search query</p>
            </div>
          ) : (
            filteredMedicines.filter(m => m.status === 'active').map((medicine) => {
            const stockStatus = getStockStatus(medicine);
            const stockPercentage = (medicine.stockRemaining / medicine.totalStock) * 100;
            
            return (
              <div key={medicine.id} className="medicine-card">
                <div className="card-header-med">
                  <div className="medicine-info-main">
                    <div className="medicine-icon-large">
                      <MdMedication size={24} />
                    </div>
                    <div>
                      <h3>{medicine.name}</h3>
                      <p className="dosage-info">{medicine.dosage} • {medicine.type}</p>
                    </div>
                  </div>
                  {stockStatus === 'low-stock' && (
                    <span className="stock-alert">
                      <MdAlarm size={14} />
                      Low
                    </span>
                  )}
                </div>

                <div className="card-body-med">
                  <div className="medicine-schedule-info">
                    <div className="schedule-times-display">
                      <span className={`time-badge ${medicine.timing.morning ? 'active' : ''}`}>
                        <FaSun size={12} /> 
                      </span>
                      <span className={`time-badge ${medicine.timing.afternoon ? 'active' : ''}`}>
                        <FaCloudSun size={12} />
                      </span>
                      <span className={`time-badge ${medicine.timing.night ? 'active' : ''}`}>
                        <FaMoon size={12} />
                      </span>
                    </div>
                    <span className="frequency-text">{medicine.frequency}</span>
                  </div>

                  <div className="stock-section">
                    <div className="stock-header-inline">
                      <span className="stock-label-small">Stock</span>
                      <span className="stock-count-small" style={{ color: getStockColor(stockStatus) }}>
                        {medicine.stockRemaining}/{medicine.totalStock}
                      </span>
                    </div>
                    <div className="stock-bar">
                      <div 
                        className="stock-fill" 
                        style={{ 
                          width: `${stockPercentage}%`,
                          backgroundColor: getStockColor(stockStatus)
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="card-actions-med">
                  <button 
                    className="btn-view-med"
                    onClick={() => handleViewDetails(medicine)}
                  >
                    <MdInfo size={18} />
                    Details
                  </button>
                  {stockStatus === 'low-stock' && (
                    <button 
                      className="btn-refill-med"
                      onClick={() => handleRefillStock(medicine)}
                    >
                      <MdMedication size={18} />
                      Refill Stock
                    </button>
                  )}
                </div>
              </div>
            );
          })
          )}
        </div>
      </div>

      {showDetailsModal && selectedMedicine && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Medicine Details</h2>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>
                <MdClose size={24} />
              </button>
            </div>

            <div className="details-body">
              <div className="details-section">
                <div className="section-header-small">
                  <MdMedication size={20} />
                  <h3>Medicine Information</h3>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{selectedMedicine.name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Dosage:</span>
                  <span className="detail-value">{selectedMedicine.dosage}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Type:</span>
                  <span className="detail-value">{selectedMedicine.type}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Frequency:</span>
                  <span className="detail-value">{selectedMedicine.frequency}</span>
                </div>
              </div>

              <div className="details-section">
                <div className="section-header-small">
                  <MdAccessTime size={20} />
                  <h3>Daily Schedule</h3>
                </div>
                <div className="timing-badges-detail">
                  {selectedMedicine.timing.morning && (
                    <div className="timing-badge-detail morning">
                      <FaSun size={16} />
                      <span>Morning</span>
                    </div>
                  )}
                  {selectedMedicine.timing.afternoon && (
                    <div className="timing-badge-detail afternoon">
                      <FaCloudSun size={16} />
                      <span>Afternoon</span>
                    </div>
                  )}
                  {selectedMedicine.timing.night && (
                    <div className="timing-badge-detail night">
                      <FaMoon size={16} />
                      <span>Night</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="details-section">
                <div className="section-header-small">
                  <MdCalendarToday size={20} />
                  <h3>Duration</h3>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Start Date:</span>
                  <span className="detail-value">
                    {new Date(selectedMedicine.startDate).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">End Date:</span>
                  <span className="detail-value">
                    {new Date(selectedMedicine.endDate).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              <div className="details-section">
                <div className="section-header-small">
                  <MdLocalHospital size={20} />
                  <h3>Prescription Details</h3>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Prescribed By:</span>
                  <span className="detail-value">{selectedMedicine.prescribedBy}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Purpose:</span>
                  <span className="detail-value">{selectedMedicine.purpose}</span>
                </div>
              </div>

              <div className="details-section">
                <div className="section-header-small">
                  <MdInfo size={20} />
                  <h3>Instructions</h3>
                </div>
                <div className="instructions-box">
                  {selectedMedicine.instructions}
                </div>
              </div>

              {selectedMedicine.sideEffects && (
                <div className="details-section">
                  <div className="section-header-small">
                    <MdInfo size={20} />
                    <h3>Side Effects</h3>
                  </div>
                  <div className="warning-box">
                    {selectedMedicine.sideEffects}
                  </div>
                </div>
              )}

              <div className="details-section">
                <div className="section-header-small">
                  <MdMedication size={20} />
                  <h3>Stock Information</h3>
                </div>
                <div className="stock-detail-box">
                  <div className="stock-numbers-large">
                    <span>Remaining: <strong>{selectedMedicine.stockRemaining}</strong></span>
                    <span>Total: <strong>{selectedMedicine.totalStock}</strong></span>
                  </div>
                  <div className="stock-bar-large">
                    <div 
                      className="stock-fill-large"
                      style={{ 
                        width: `${(selectedMedicine.stockRemaining / selectedMedicine.totalStock) * 100}%`,
                        backgroundColor: getStockColor(getStockStatus(selectedMedicine))
                      }}
                    ></div>
                  </div>
                  {getStockStatus(selectedMedicine) === 'low-stock' && (
                    <div className="refill-alert">
                      <MdAlarm size={18} />
                      <span>Low stock! Please refill soon.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineSchedule;