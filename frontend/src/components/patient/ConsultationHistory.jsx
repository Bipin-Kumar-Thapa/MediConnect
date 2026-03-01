import React, { useState, useEffect } from 'react';
import { 
  MdCalendarToday,
  MdSearch,
  MdClose,
  MdInfo,
  MdVisibility,
  MdLocalHospital,
  MdAccessTime,
  MdChevronLeft,
  MdChevronRight
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
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
    total_pages: 1,
    total_count: 0,
    has_next: false,
    has_prev: false
  });
  const [availableYears, setAvailableYears] = useState([]);
  const [uniqueDoctors, setUniqueDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('all');
  const [timePeriod, setTimePeriod] = useState('last_month');  // ✅ NEW
  const [currentPage, setCurrentPage] = useState(1);  // ✅ NEW

  // Fetch consultation history on component mount
  useEffect(() => {
    fetchConsultationHistory();
  }, []);

  // Fetch when filters change
  useEffect(() => {
    fetchConsultationHistory();
  }, [searchQuery, filterDoctor, timePeriod, currentPage]);  // ✅ Added timePeriod, currentPage

  const fetchConsultationHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (filterDoctor !== 'all') {
        params.append('doctor', filterDoctor);
      }
      if (timePeriod !== 'all') {  // ✅ NEW
        params.append('time_period', timePeriod);
      }
      params.append('page', currentPage);  // ✅ NEW

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
        setPagination(data.pagination);  // ✅ NEW
        setAvailableYears(data.available_years || []);  // ✅ NEW
      } else {
        console.error('Failed to fetch consultation history');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching consultation history:', error);
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {  // ✅ NEW
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleTimePeriodChange = (period) => {  // ✅ NEW
    setTimePeriod(period);
    setCurrentPage(1); // Reset to page 1 when filter changes
  };

  const getPageNumbers = () => {  // ✅ NEW
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
        
        {/* ✅ NEW: Time Period Filter - Top Right */}
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
            {availableYears.filter(year => year !== new Date().getFullYear()).map(year => (
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
            placeholder="Search by doctor, diagnosis, or specialty..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);  // ✅ Reset to page 1
            }}
          />
        </div>
        <div className="filter-group">
          <select 
            className="filter-select"
            value={filterDoctor}
            onChange={(e) => {
              setFilterDoctor(e.target.value);
              setCurrentPage(1);  // ✅ Reset to page 1
            }}
          >
            <option value="all">All Doctors</option>
            {uniqueDoctors.map((doctor, index) => (
              <option key={index} value={doctor}>{doctor}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ✅ NEW: Results Count */}
      {pagination.total_count > 0 && (
        <div className="results-info">
          Showing {((currentPage - 1) * pagination.per_page) + 1}-{Math.min(currentPage * pagination.per_page, pagination.total_count)} of {pagination.total_count} consultations
        </div>
      )}

      {/* Consultations Timeline */}
      <div className="consultations-timeline">
        {consultations.length === 0 ? (
          <div className="no-consultations">
            <FaNotesMedical size={48} />
            <h3>No consultations found</h3>
            <p>
              {searchQuery || filterDoctor !== 'all' || timePeriod !== 'all'
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

      {/* ✅ NEW: Pagination */}
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

      {/* Details Modal - SAME AS BEFORE */}
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
              {/* ... REST OF MODAL CONTENT STAYS THE SAME ... */}
              {/* (Keep all the existing modal content from your original file) */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultationHistory;