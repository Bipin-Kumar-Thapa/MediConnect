import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  MdDescription,
  MdCalendarToday,
  MdPerson,
  MdMedication,
  MdDownload,
  MdClose,
  MdInfo,
  MdSearch,
  MdAccessTime,
  MdLocalHospital,
  MdChevronLeft,
  MdChevronRight
} from 'react-icons/md';
import '../../styles/patient/Prescriptions.css';

const Prescriptions = () => {
  const location = useLocation();

  const [prescriptions, setPrescriptions] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
    total_pages: 1,
    total_count: 0,
    has_next: false,
    has_prev: false
  });
  const [availableYears, setAvailableYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [timePeriod, setTimePeriod] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState(null);

  const [highlightedId, setHighlightedId] = useState(null);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  useEffect(() => {
    fetchPrescriptions();
  }, [filterStatus, timePeriod, searchQuery, currentPage]);

  // Handle highlight param from overview page
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const highlightId = params.get('highlight');

    if (highlightId && prescriptions.length > 0) {
      const id = parseInt(highlightId);
      setHighlightedId(id);

      setTimeout(() => {
        const element = document.getElementById(`prescription-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);

      setTimeout(() => {
        setHighlightedId(null);
      }, 4000);
    }
  }, [location.search, prescriptions]);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      if (timePeriod !== 'all') {
        params.append('time_period', timePeriod);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      params.append('page', currentPage);

      const response = await fetch(
        `http://localhost:8000/patient/prescriptions/?${params.toString()}`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setPrescriptions(data.prescriptions);
        setStats(data.stats);
        setPagination(data.pagination);
        setAvailableYears(data.available_years || []);
      } else {
        console.error('Failed to fetch prescriptions');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      setLoading(false);
    }
  };

  const handleViewDetails = (prescription) => {
    setSelectedPrescription(prescription);
    setShowDetailsModal(true);
  };

  const handleDownload = async (prescription) => {
    setDownloadingId(prescription.id);
    try {
      const response = await fetch(
        `http://localhost:8000/patient/prescriptions/${prescription.id}/download/`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `prescription_${prescription.prescriptionNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to download prescription');
      }
    } catch (error) {
      alert('An error occurred while downloading');
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleTimePeriodChange = (period) => {
    setTimePeriod(period);
    setCurrentPage(1);
  };

  const handleStatusChange = (status) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const getStatusClass = (status) => `status-${status}`;

  const statsArray = [
    { label: 'Total Prescriptions', value: stats.total,   color: '#3B82F6' },
    { label: 'Active',              value: stats.active,  color: '#10B981' },
    { label: 'Expired',             value: stats.expired, color: '#EF4444' }
  ];

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(pagination.total_pages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  if (loading) {
    return <div className="prescriptions-page">Loading...</div>;
  }

  return (
    <div className="prescriptions-page">

      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Prescriptions</h1>
          <p>View and manage your medical prescriptions</p>
        </div>

        {/* Time Period Filter - Top Right */}
        <div className="time-period-filter-header">
          <MdCalendarToday size={18} />
          <select 
            value={timePeriod}
            onChange={(e) => handleTimePeriodChange(e.target.value)}
            className="time-period-select"
          >
            <option value="all">All Time</option>
            <option value="last_month">Last Month</option>
            <option value="last_3_months">Last 3 Months</option>
            <option value="last_6_months">Last 6 Months</option>
            <option value="last_year">Last Year</option>
            {availableYears.filter(year => year !== 2026).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
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
            placeholder="Search by doctor, prescription number, or medicine..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => handleStatusChange('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
            onClick={() => handleStatusChange('active')}
          >
            Active
          </button>
          <button 
            className={`filter-btn ${filterStatus === 'expired' ? 'active' : ''}`}
            onClick={() => handleStatusChange('expired')}
          >
            Expired
          </button>
        </div>
      </div>

      {/* Results Count */}
      {pagination.total_count > 0 && (
        <div className="results-info">
          Showing {((currentPage - 1) * pagination.per_page) + 1}-{Math.min(currentPage * pagination.per_page, pagination.total_count)} of {pagination.total_count} prescriptions
        </div>
      )}

      {/* Prescriptions List */}
      <div className="prescriptions-list">
        {prescriptions.length === 0 ? (
          <div className="no-prescriptions">
            <MdDescription size={48} />
            <h3>No prescriptions found</h3>
            <p>
              {filterStatus !== 'all' || searchQuery || timePeriod !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'No prescriptions available yet'
              }
            </p>
          </div>
        ) : (
          prescriptions.map((prescription) => (
            <div
              key={prescription.id}
              id={`prescription-${prescription.id}`}
              className={`prescription-card ${highlightedId === prescription.id ? 'highlighted' : ''}`}
            >
              <div className="card-header">
                <div className="prescription-info">
                  <div className="prescription-number">
                    <MdDescription size={20} />
                    {prescription.prescriptionNumber}
                  </div>
                  <span className={`status-badge ${getStatusClass(prescription.status)}`}>
                    {prescription.status}
                  </span>
                </div>
              </div>

              <div className="card-body">
                <div className="doctor-section">
                  <div className="doctor-avatar">
                    {prescription.doctor.split(' ').slice(1).map(n => n[0]).join('')}
                  </div>
                  <div className="doctor-details">
                    <h3>{prescription.doctor}</h3>
                    <p>{prescription.specialty}</p>
                  </div>
                </div>

                <div className="prescription-meta">
                  <div className="meta-item">
                    <MdCalendarToday size={16} />
                    <div>
                      <span className="meta-label">Prescribed Date</span>
                      <span className="meta-value">
                        {new Date(prescription.date).toLocaleDateString('en-US', { 
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="meta-item">
                    <MdAccessTime size={16} />
                    <div>
                      <span className="meta-label">Valid Until</span>
                      <span className="meta-value">
                        {new Date(prescription.validUntil).toLocaleDateString('en-US', { 
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="meta-item">
                    <MdMedication size={16} />
                    <div>
                      <span className="meta-label">Medicines</span>
                      <span className="meta-value">{prescription.medicines.length} items</span>
                    </div>
                  </div>
                </div>

                <div className="medicines-preview">
                  <h4>Medicines:</h4>
                  <div className="medicines-list">
                    {prescription.medicines.map((medicine, index) => (
                      <div key={index} className="medicine-tag">
                        <MdMedication size={14} />
                        {medicine.name} ({medicine.dosage})
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card-actions">
                <button 
                  className="btn-view-details"
                  onClick={() => handleViewDetails(prescription)}
                >
                  <MdInfo size={18} />
                  View Details
                </button>
                <button 
                  className="btn-download"
                  onClick={() => handleDownload(prescription)}
                  disabled={downloadingId === prescription.id}
                >
                  <MdDownload size={18} />
                  {downloadingId === prescription.id ? 'Downloading...' : 'Download'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="pagination-container">
          <button 
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!pagination.has_prev}
          >
            <MdChevronLeft size={20} />
            Previous
          </button>

          <div className="pagination-pages">
            {getPageNumbers().map(pageNum => (
              <button
                key={pageNum}
                className={`pagination-page ${pageNum === currentPage ? 'active' : ''}`}
                onClick={() => handlePageChange(pageNum)}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button 
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!pagination.has_next}
          >
            Next
            <MdChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Details Modal - Same as before */}
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
                  <MdDescription size={20} />
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
                  <span className="detail-label">Prescribed Date:</span>
                  <span className="detail-value">
                    {new Date(selectedPrescription.date).toLocaleDateString('en-US', { 
                      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Valid Until:</span>
                  <span className="detail-value">
                    {new Date(selectedPrescription.validUntil).toLocaleDateString('en-US', { 
                      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Doctor Info */}
              <div className="details-section">
                <div className="section-header-small">
                  <MdPerson size={20} />
                  <h3>Prescribed By</h3>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Doctor Name:</span>
                  <span className="detail-value">{selectedPrescription.doctor}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Specialty:</span>
                  <span className="detail-value">{selectedPrescription.specialty}</span>
                </div>
              </div>

              {/* Diagnosis */}
              {selectedPrescription.diagnosis && (
                <div className="details-section">
                  <div className="section-header-small">
                    <MdLocalHospital size={20} />
                    <h3>Diagnosis</h3>
                  </div>
                  <div className="diagnosis-box">
                    {selectedPrescription.diagnosis}
                  </div>
                </div>
              )}

              {/* Medicines */}
              <div className="details-section">
                <div className="section-header-small">
                  <MdMedication size={20} />
                  <h3>Prescribed Medicines</h3>
                </div>
                <div className="medicines-detail-list">
                  {selectedPrescription.medicines.map((medicine, index) => (
                    <div key={index} className="medicine-detail-card">
                      <div className="medicine-header">
                        <h4>{medicine.name}</h4>
                        <span className="dosage-badge">{medicine.dosage}</span>
                      </div>
                      <div className="medicine-info">
                        <div className="medicine-info-item">
                          <strong>Frequency:</strong> {medicine.frequency}
                        </div>
                        <div className="medicine-info-item">
                          <strong>Duration:</strong> {medicine.duration}
                        </div>
                        <div className="medicine-instructions">
                          <strong>Instructions:</strong> {medicine.instructions}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedPrescription.notes && (
                <div className="details-section">
                  <div className="section-header-small">
                    <MdInfo size={20} />
                    <h3>Additional Notes</h3>
                  </div>
                  <div className="notes-box">
                    {selectedPrescription.notes}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="details-actions">
                <button 
                  className="btn-download-full"
                  onClick={() => handleDownload(selectedPrescription)}
                  disabled={downloadingId === selectedPrescription.id}
                >
                  <MdDownload size={20} />
                  {downloadingId === selectedPrescription.id ? 'Downloading...' : 'Download Prescription'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prescriptions;