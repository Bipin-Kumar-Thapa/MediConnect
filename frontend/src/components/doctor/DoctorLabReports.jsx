import React, { useState, useEffect } from 'react';
import { 
  MdScience,
  MdPerson,
  MdCalendarToday,
  MdSearch,
  MdClose,
  MdInfo,
  MdDownload,
  MdVisibility,
  MdCheckCircle,
  MdWarning,
  MdError
} from 'react-icons/md';
import { FaFlask } from 'react-icons/fa';
import '../../styles/doctor/DoctorLabReports.css';

const DoctorLabReports = () => {
  const [labReports, setLabReports] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    normal: 0,
    abnormal: 0,
    critical: 0
  });
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch lab reports on component mount
  useEffect(() => {
    fetchLabReports();
  }, []);

  // Fetch when filters change
  useEffect(() => {
    fetchLabReports();
  }, [filterCategory, filterStatus, searchQuery]);

  const fetchLabReports = async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory !== 'all') {
        params.append('category', filterCategory);
      }
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(
        `http://localhost:8000/doctor/lab-reports/?${params.toString()}`,
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLabReports(data.reports);
        setStats(data.stats);
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

  const handleDownload = (report) => {
    if (report.fileUrl) {
      window.open(report.fileUrl, '_blank');
    } else {
      alert('No file available for download');
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'normal':
        return <MdCheckCircle />;
      case 'abnormal':
        return <MdWarning />;
      case 'critical':
        return <MdError />;
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
    { label: 'Critical', value: stats.critical, color: '#EF4444' }
  ];

  if (loading) {
    return <div className="doctor-lab-reports-page">Loading...</div>;
  }

  return (
    <div className="doctor-lab-reports-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Lab Reports</h1>
          <p>View and manage patient laboratory reports</p>
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
            placeholder="Search by patient name, test, or report number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select 
            className="filter-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="hematology">Hematology</option>
            <option value="biochemistry">Biochemistry</option>
            <option value="endocrinology">Endocrinology</option>
            <option value="microbiology">Microbiology</option>
            <option value="pathology">Pathology</option>
            <option value="radiology">Radiology</option>
            <option value="other">Other</option>
          </select>
          <select 
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="normal">Normal</option>
            <option value="abnormal">Abnormal</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Lab Reports Grid */}
      <div className="lab-reports-grid">
        {labReports.length === 0 ? (
          <div className="no-reports">
            <FaFlask size={48} />
            <h3>No lab reports found</h3>
            <p>
              {filterCategory !== 'all' || filterStatus !== 'all' || searchQuery
                ? 'Try adjusting your search or filters'
                : 'No lab reports available for your patients'
              }
            </p>
          </div>
        ) : (
          labReports.map((report) => (
            <div key={report.id} className="lab-report-card">
              <div className="card-header-lab">
                <div className="report-number">
                  <FaFlask size={16} />
                  {report.reportNumber}
                </div>
                <span className={`category-badge ${report.category.toLowerCase()}`}>
                  {report.category}
                </span>
              </div>

              <div className="card-body-lab">
                <div className="patient-section-lab">
                  <div className="patient-avatar-lab">
                    {report.patientName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3>{report.patientName}</h3>
                    <p className="patient-id-lab">{report.patientId}</p>
                  </div>
                </div>

                <div className="test-info">
                  <h4>{report.testName}</h4>
                  <div className="test-meta">
                    <div className="meta-item-lab">
                      <MdCalendarToday size={14} />
                      <span>{new Date(report.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}</span>
                    </div>
                    <div className="meta-item-lab">
                      <MdScience size={14} />
                      <span>Uploaded: {report.uploadedDate}</span>
                    </div>
                  </div>
                </div>

                <div className="status-section-lab">
                  <span className={`status-badge-lab ${getStatusClass(report.status)}`}>
                    {getStatusIcon(report.status)}
                    {report.status}
                  </span>
                </div>
              </div>

              <div className="card-actions-lab">
                <button 
                  className="btn-view-lab"
                  onClick={() => handleViewDetails(report)}
                >
                  <MdVisibility size={18} />
                  View Report
                </button>
                {report.hasFile && (
                  <button 
                    className="btn-download-lab"
                    onClick={() => handleDownload(report)}
                  >
                    <MdDownload size={18} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Modal */}
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
                  <FaFlask size={20} />
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
                  <span className={`category-badge ${selectedReport.category.toLowerCase()}`}>
                    {selectedReport.category}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Test Date:</span>
                  <span className="detail-value">
                    {new Date(selectedReport.date).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className={`status-badge-lab ${getStatusClass(selectedReport.status)}`}>
                    {getStatusIcon(selectedReport.status)}
                    {selectedReport.status}
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
                  <span className="detail-value">{selectedReport.patientName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Patient ID:</span>
                  <span className="detail-value">{selectedReport.patientId}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Uploaded By:</span>
                  <span className="detail-value">{selectedReport.uploadedBy}</span>
                </div>
              </div>

              {/* Findings */}
              {selectedReport.findings ? (
                <div className="details-section">
                  <div className="section-header-small">
                    <MdScience size={20} />
                    <h3>Findings</h3>
                  </div>
                  <div className="findings-box">
                    {selectedReport.findings}
                  </div>
                </div>
              ) : (
                <div className="details-section">
                  <div className="pending-message">
                    <MdInfo size={24} />
                    <p>Test results are being processed. Please check back later.</p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedReport.notes && (
                <div className="details-section">
                  <div className="section-header-small">
                    <MdInfo size={20} />
                    <h3>Notes & Observations</h3>
                  </div>
                  <div className={`notes-box ${selectedReport.status === 'critical' ? 'critical-notes' : ''}`}>
                    {selectedReport.notes}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedReport.hasFile && (
                <div className="details-actions">
                  <button 
                    className="btn-download-full"
                    onClick={() => handleDownload(selectedReport)}
                  >
                    <MdDownload size={18} />
                    Download Report
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

export default DoctorLabReports;