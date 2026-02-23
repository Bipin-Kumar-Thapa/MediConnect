import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  MdScience,
  MdCalendarToday,
  MdPerson,
  MdDownload,
  MdClose,
  MdInfo,
  MdSearch,
  MdCheckCircle,
  MdWarning,
  MdError,
  MdVisibility,
  MdLocalHospital,
  MdChevronLeft,
  MdChevronRight
} from 'react-icons/md';
import '../../styles/patient/LabReports.css';

const LabReports = () => {
  const location = useLocation();

  const [labReports, setLabReports] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    normal: 0,
    abnormal: 0,
    critical: 0,
    pending: 0
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
  const [selectedReport, setSelectedReport] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [timePeriod, setTimePeriod] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [highlightedId, setHighlightedId] = useState(null);

  // Fetch lab reports on component mount
  useEffect(() => {
    fetchLabReports();
  }, []);

  // Fetch lab reports when filters change
  useEffect(() => {
    fetchLabReports();
  }, [filterStatus, timePeriod, searchQuery, currentPage]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const highlightId = params.get('highlight');

    if (highlightId && labReports.length > 0) {
      const id = parseInt(highlightId);
      setHighlightedId(id);

      setTimeout(() => {
        const element = document.getElementById(`report-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);

      setTimeout(() => setHighlightedId(null), 4000);
    }
  }, [location.search, labReports]);

  const fetchLabReports = async () => {
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
        `http://localhost:8000/patient/lab-reports/?${params.toString()}`,
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLabReports(data.reports);
        setStats(data.stats);
        setPagination(data.pagination);
        setAvailableYears(data.available_years || []);
      } else {
        console.error('Failed to fetch lab reports');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching lab reports:', error);
      setLoading(false);
    }
  };

  const handleViewDetails = (report) => {
    setSelectedReport(report);
    setShowDetailsModal(true);
  };

  const handleDownload = async (report) => {
    if (report.status === 'pending') {
      alert('This report is still pending. Results will be available soon.');
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/patient/lab-reports/${report.id}/download/`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LabReport_${report.reportNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download report');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('An error occurred while downloading');
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
    setCurrentPage(1); // Reset to page 1 when filter changes
  };

  const handleStatusChange = (status) => {
    setFilterStatus(status);
    setCurrentPage(1); // Reset to page 1 when filter changes
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'normal':
        return <MdCheckCircle />;
      case 'abnormal':
        return <MdWarning />;
      case 'critical':
        return <MdError />;
      case 'pending':
        return <MdInfo />;
      default:
        return <MdInfo />;
    }
  };

  const getStatusClass = (status) => {
    return `status-${status}`;
  };

  const statsArray = [
    { label: 'Total Reports', value: stats.total, color: '#3B82F6' },
    { label: 'Normal', value: stats.normal, color: '#10B981' },
    { label: 'Abnormal', value: stats.abnormal, color: '#F59E0B' },
    { label: 'Critical', value: stats.critical, color: '#EF4444' },
    { label: 'Pending', value: stats.pending, color: '#6366F1' }
  ];

  // Generate page numbers for pagination
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
    return <div className="lab-reports-page">Loading...</div>;
  }

  return (
    <div className="lab-reports-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Lab Reports</h1>
          <p>View and download your medical test reports</p>
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
            placeholder="Search by test name, report number, or category..."
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
            className={`filter-btn ${filterStatus === 'normal' ? 'active' : ''}`}
            onClick={() => handleStatusChange('normal')}
          >
            Normal
          </button>
          <button 
            className={`filter-btn ${filterStatus === 'abnormal' ? 'active' : ''}`}
            onClick={() => handleStatusChange('abnormal')}
          >
            Abnormal
          </button>
          <button 
            className={`filter-btn ${filterStatus === 'critical' ? 'active' : ''}`}
            onClick={() => handleStatusChange('critical')}
          >
            Critical
          </button>
          <button 
            className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
            onClick={() => handleStatusChange('pending')}
          >
            Pending
          </button>
        </div>
      </div>

      {/* Results Count */}
      {pagination.total_count > 0 && (
        <div className="results-info">
          Showing {((currentPage - 1) * pagination.per_page) + 1}-{Math.min(currentPage * pagination.per_page, pagination.total_count)} of {pagination.total_count} reports
        </div>
      )}

      {/* Lab Reports List */}
      <div className="reports-list">
        {labReports.length === 0 ? (
          <div className="no-reports">
            <MdScience size={48} />
            <h3>No lab reports found</h3>
            <p>
              {filterStatus !== 'all' || searchQuery || timePeriod !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'No lab reports available yet'
              }
            </p>
          </div>
        ) : (
          labReports.map((report) => (
            <div 
              key={report.id} 
              id={`report-${report.id}`}
              className={`report-card ${highlightedId === report.id ? 'highlighted' : ''}`}
            >
              <div className="card-header">
                <div className="report-info">
                  <div className="report-number">
                    <MdScience size={20} />
                    {report.reportNumber}
                  </div>
                  <span className={`category-badge`}>
                    {report.category}
                  </span>
                </div>
                <span className={`status-badge ${getStatusClass(report.status)}`}>
                  {getStatusIcon(report.status)}
                  {report.status}
                </span>
              </div>

              <div className="card-body">
                <h3 className="test-name">{report.testName}</h3>

                <div className="report-meta">
                  <div className="meta-item">
                    <MdCalendarToday size={16} />
                    <div>
                      <span className="meta-label">Test Date</span>
                      <span className="meta-value">
                        {new Date(report.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="meta-item">
                    <MdPerson size={16} />
                    <div>
                      <span className="meta-label">Uploaded By</span>
                      <span className="meta-value">{report.uploadedBy}</span>
                    </div>
                  </div>

                  <div className="meta-item">
                    <MdCalendarToday size={16} />
                    <div>
                      <span className="meta-label">Uploaded On</span>
                      <span className="meta-value">
                        {new Date(report.uploadedDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-actions">
                <button 
                  className="btn-view-details"
                  onClick={() => handleViewDetails(report)}
                >
                  <MdVisibility size={18} />
                  View Report
                </button>
                <button 
                  className="btn-download"
                  onClick={() => handleDownload(report)}
                  disabled={report.status === 'pending'}
                >
                  <MdDownload size={18} />
                  Download
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
      {showDetailsModal && selectedReport && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Lab Report Details</h2>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>
                <MdClose size={24} />
              </button>
            </div>

            <div className="details-body">
              {/* Report Info */}
              <div className="details-section">
                <div className="section-header-small">
                  <MdScience size={20} />
                  <h3>Report Information</h3>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Report Number:</span>
                  <span className="detail-value">{selectedReport.reportNumber}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Test Name:</span>
                  <span className="detail-value">{selectedReport.testName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Category:</span>
                  <span className="category-badge">{selectedReport.category}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className={`status-badge ${getStatusClass(selectedReport.status)}`}>
                    {getStatusIcon(selectedReport.status)}
                    {selectedReport.status}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Test Date:</span>
                  <span className="detail-value">
                    {new Date(selectedReport.date).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Uploaded By:</span>
                  <span className="detail-value">{selectedReport.uploadedBy}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Uploaded On:</span>
                  <span className="detail-value">
                    {new Date(selectedReport.uploadedDate).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Parameters Table */}
              {selectedReport.parameters && selectedReport.parameters.length > 0 && (
                <div className="details-section">
                  <div className="section-header-small">
                    <MdScience size={20} />
                    <h3>Test Parameters</h3>
                  </div>
                  <div className="results-table">
                    <div className="table-header">
                      <span>Parameter</span>
                      <span>Value</span>
                      <span>Normal Range</span>
                      <span>Status</span>
                    </div>
                    {selectedReport.parameters.map((param, index) => (
                      <div key={index} className={`table-row param-${param.status.toLowerCase()}`}>
                        <span className="param-name">{param.name}</span>
                        <span className="param-value">{param.value} {param.unit}</span>
                        <span className="param-range">{param.normalRange}</span>
                        <span className="param-status">
                          <span className={`param-badge param-${param.status.toLowerCase()}`}>
                            {param.status}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uploaded Files */}
              {selectedReport.uploadedFiles && selectedReport.uploadedFiles.length > 0 && (
                <div className="details-section">
                  <div className="section-header-small">
                    <MdLocalHospital size={20} />
                    <h3>Attached Files</h3>
                  </div>
                  <div className="files-grid">
                    {selectedReport.uploadedFiles.map((file, index) => (
                      <div key={index} className="file-item">
                        {file.type === 'image' ? (
                          <div className="file-preview-image" onClick={() => window.open(file.url, '_blank')}>
                            <img src={file.url} alt={file.name} />
                            <div className="file-overlay">
                              <MdVisibility size={24} />
                              <span>Click to view</span>
                            </div>
                          </div>
                        ) : (
                          <div className="file-preview-pdf" onClick={() => window.open(file.url, '_blank')}>
                            <div className="pdf-icon">📄</div>
                            <span className="file-name">{file.name}</span>
                            <span className="file-type">PDF Document</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Findings */}
              {selectedReport.findings && (
                <div className="details-section">
                  <div className="section-header-small">
                    <MdInfo size={20} />
                    <h3>Findings</h3>
                  </div>
                  <div className="notes-box">
                    {selectedReport.findings}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedReport.notes && (
                <div className="details-section">
                  <div className="section-header-small">
                    <MdInfo size={20} />
                    <h3>Notes & Recommendations</h3>
                  </div>
                  <div className={`notes-box ${selectedReport.status === 'critical' ? 'critical-note' : ''}`}>
                    {selectedReport.notes}
                  </div>
                </div>
              )}

              {/* Pending Message */}
              {selectedReport.status === 'pending' && (
                <div className="pending-message">
                  <MdInfo size={24} />
                  <p>This report is still being processed. Results will be available soon.</p>
                </div>
              )}

              {/* Actions */}
              {selectedReport.status !== 'pending' && (
                <div className="details-actions">
                  <button 
                    className="btn-download-full"
                    onClick={() => handleDownload(selectedReport)}
                  >
                    <MdDownload size={20} />
                    Download Complete Report
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabReports;