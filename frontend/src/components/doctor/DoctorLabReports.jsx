import React, { useState, useEffect } from 'react';
import { 
  MdScience,
  MdPerson,
  MdCalendarToday,
  MdSearch,
  MdClose,
  MdInfo,
  MdVisibility,
  MdCheckCircle,
  MdWarning,
  MdError,
  MdAttachFile,
  MdImage
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
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchLabReports();
  }, []);

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

  const handleViewDetails = async (report) => {
    setShowDetailsModal(true);
    setLoadingDetails(true);
    setSelectedReport(null);

    try {
      const response = await fetch(
        `http://localhost:8000/doctor/lab-reports/${report.id}/details/`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedReport(data);
      } else {
        console.error('Failed to fetch report details');
        alert('Failed to load report details');
        setShowDetailsModal(false);
      }
    } catch (error) {
      console.error('Error fetching report details:', error);
      alert('Error loading report details');
      setShowDetailsModal(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
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
    return `status-${status?.toLowerCase() || 'normal'}`;
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
      <div className="page-header">
        <div className="header-content">
          <h1>Lab Reports</h1>
          <p>View and manage patient laboratory reports</p>
        </div>
      </div>

      <div className="stats-grid">
        {statsArray.map((stat, index) => (
          <div key={index} className="stat-card" style={{ borderLeftColor: stat.color }}>
            <h3>{stat.value}</h3>
            <p>{stat.label}</p>
          </div>
        ))}
      </div>

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
                <span className={`category-badge ${report.category.toLowerCase().replace(/\s+/g, '-')}`}>
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
              </div>
            </div>
          ))
        )}
      </div>

      {showDetailsModal && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Lab Report Details</h2>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>
                <MdClose size={24} />
              </button>
            </div>

            <div className="details-body">
              {loadingDetails ? (
                <div className="loading-spinner" style={{ padding: '40px', textAlign: 'center' }}>
                  <div className="spinner"></div>
                  <p>Loading report details...</p>
                </div>
              ) : selectedReport ? (
                <>
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
                      <span className={`category-badge ${selectedReport.category?.toLowerCase().replace(/\s+/g, '-')}`}>
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
                      <span className="detail-label">Overall Status:</span>
                      <span className={`status-badge-lab ${getStatusClass(selectedReport.status)}`}>
                        {getStatusIcon(selectedReport.status)}
                        {selectedReport.status}
                      </span>
                    </div>
                  </div>

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

                  {selectedReport.test_sections && selectedReport.test_sections.length > 0 && (
                    <div className="details-section">
                      <div className="section-header-small">
                        <MdScience size={20} />
                        <h3>Test Results</h3>
                      </div>
                      {selectedReport.test_sections.map((section, idx) => (
                        <div key={idx} style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                              {section.test_name} • {section.category}
                            </h4>
                            <span className={`status-badge-lab ${getStatusClass(section.status)}`}>
                              {getStatusIcon(section.status)}
                              {section.status}
                            </span>
                          </div>
                          
                          {section.findings && (
                            <div className="findings-box" style={{ marginBottom: '12px', fontSize: '13px', padding: '10px', background: '#e0f2fe', borderRadius: '6px' }}>
                              <strong>Findings:</strong> {section.findings}
                            </div>
                          )}

                          {section.parameters && section.parameters.length > 0 && (
                            <div className="results-table" style={{ marginTop: '12px' }}>
                              <div className="table-header">
                                <span>Parameter</span>
                                <span>Value</span>
                                <span>Normal Range</span>
                                <span>Status</span>
                              </div>
                              {section.parameters.map((param, pIdx) => (
                                <div key={pIdx} className={`table-row param-${param.status?.toLowerCase() || 'normal'}`}>
                                  <span className="param-name">{param.name}</span>
                                  <span className="param-value">{param.value} {param.unit}</span>
                                  <span className="param-range">{param.normalRange}</span>
                                  <span className="param-status">
                                    <span className={`param-badge param-${param.status?.toLowerCase() || 'normal'}`}>
                                      {param.status}
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ✅ UPDATED: Show attachments array */}
                  {selectedReport.attachments && selectedReport.attachments.length > 0 && (
                    <div className="details-section">
                      <div className="section-header-small">
                        <MdAttachFile size={20} />
                        <h3>Attached Files</h3>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {selectedReport.attachments.map((attachment, idx) => (
                          <a
                            key={idx}
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              padding: '16px 20px',
                              background: '#fff',
                              border: '2px solid #e5e7eb',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              textDecoration: 'none',
                              color: 'inherit',
                              minWidth: '140px'
                            }}
                          >
                            {attachment.type === 'document' ? (
                              <>
                                <MdAttachFile size={32} style={{ color: '#6366f1' }} />
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                                  {attachment.filename || 'Document'}
                                </span>
                              </>
                            ) : (
                              <>
                                <MdImage size={32} style={{ color: '#8b5cf6' }} />
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                                  {attachment.filename || 'Image'}
                                </span>
                              </>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

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
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorLabReports;