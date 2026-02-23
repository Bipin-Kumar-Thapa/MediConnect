import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MdUpload,
  MdScience,
  MdCheckCircle,
  MdPending,
  MdCalendarToday,
  MdArrowForward,
  MdTrendingUp,
  MdPerson,
  MdWarning,
  MdError
} from 'react-icons/md';
import { FaFlask, FaUserMd } from 'react-icons/fa';
import '../../styles/staff/StaffOverview.css';

const StaffOverview = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [highlightId, setHighlightId] = useState(null);
  const highlightRef = useRef(null);

  useEffect(() => {
    fetch('http://localhost:8000/staff/overview/', { credentials: 'include' })
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Handle highlight from navigation (e.g. from reports page)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('highlight');
    if (id) {
      setHighlightId(Number(id));
      // Scroll to highlighted row after render
      setTimeout(() => {
        if (highlightRef.current) {
          highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        // Remove highlight after 3s
        setTimeout(() => setHighlightId(null), 3000);
      }, 300);
    }
  }, [location.search, data]);

  const getResultBadge = (status) => {
    switch (status) {
      case 'normal':
        return <span className="sov-badge sov-badge--normal"><MdCheckCircle /> Normal</span>;
      case 'abnormal':
        return <span className="sov-badge sov-badge--abnormal"><MdWarning /> Abnormal</span>;
      case 'critical':
        return <span className="sov-badge sov-badge--critical"><MdError /> Critical</span>;
      default:
        return <span className="sov-badge sov-badge--normal">{status}</span>;
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  if (loading) return <div className="sov-page">Loading...</div>;
  if (!data)   return <div className="sov-page">Error loading overview.</div>;

  const { stats, recent_reports, staff_name } = data;

  const statCards = [
    {
      label: 'Total Reports',
      value: stats.total_reports,
      icon: <FaFlask />,
      color: 'blue',
      sub: `+${stats.week_reports} this week`
    },
    {
      label: 'Uploaded Today',
      value: stats.today_reports,
      icon: <MdUpload />,
      color: 'purple',
      sub: stats.today_date
    },
    {
      label: 'This Week',
      value: stats.week_reports,
      icon: <MdTrendingUp />,
      color: 'green',
      sub: 'Last 7 days'
    },
    {
      label: 'Critical Reports',
      value: stats.critical_reports,
      icon: <MdError />,
      color: 'orange',
      sub: stats.critical_reports > 0 ? 'Needs attention' : 'All clear'
    }
  ];

  return (
    <div className="sov-page">

      {/* Page Header */}
      <div className="sov-header">
        <div className="sov-header-left">
          <h1>Welcome back, {staff_name}! 👋</h1>
          <p><MdCalendarToday />{today}</p>
        </div>
        <button className="sov-upload-btn" onClick={() => navigate('/staff/upload')}>
          <MdUpload />
          Upload Report
        </button>
      </div>

      {/* Stats Grid */}
      <div className="sov-stats-grid">
        {statCards.map((stat, i) => (
          <div key={i} className={`sov-stat-card sov-stat-card--${stat.color}`}>
            <div className={`sov-stat-icon sov-stat-icon--${stat.color}`}>
              {stat.icon}
            </div>
            <div className="sov-stat-info">
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
              <span>{stat.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="sov-content-grid">

        {/* Recent Reports Table */}
        <div className="sov-card sov-card--wide">
          <div className="sov-card-head">
            <div className="sov-card-head-icon sov-card-head-icon--blue">
              <FaFlask />
            </div>
            <h2>Recent Lab Reports</h2>
            <button className="sov-view-all-btn" onClick={() => navigate('/staff/reports')}>
              View All <MdArrowForward />
            </button>
          </div>

          {recent_reports.length === 0 ? (
            <p className="sov-empty">No reports uploaded yet.</p>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="sov-table-wrapper">
                <table className="sov-table">
                  <thead>
                    <tr>
                      <th>Report ID</th>
                      <th>Patient</th>
                      <th>Test Name</th>
                      <th>Doctor</th>
                      <th>Date</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent_reports.map((report) => {
                      const isHighlighted = highlightId === report.id;
                      return (
                        <tr
                          key={report.id}
                          ref={isHighlighted ? highlightRef : null}
                          className={`sov-table-row ${isHighlighted ? 'sov-row--highlighted' : ''}`}
                          onClick={() => navigate(`/staff/reports?highlight=${report.id}`)}
                        >
                          <td>
                            <span className="sov-report-id">{report.report_number}</span>
                          </td>
                          <td>
                            <div className="sov-patient-cell">
                              {report.patient_photo ? (
                                <img
                                  src={report.patient_photo}
                                  alt={report.patient_name}
                                  className="sov-patient-photo"
                                />
                              ) : (
                                <div className="sov-patient-av">
                                  {report.patient_initials}
                                </div>
                              )}
                              <div>
                                <span>{report.patient_name}</span>
                                <small>{report.patient_id}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="sov-test-cell">
                              <FaFlask />
                              <span>{report.test_name}</span>
                            </div>
                          </td>
                          <td>
                            <div className="sov-doctor-cell">
                              <FaUserMd />
                              <span>{report.doctor}</span>
                            </div>
                          </td>
                          <td>
                            <span className="sov-date">{report.date}</span>
                          </td>
                          <td>{getResultBadge(report.status)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sov-mobile-cards">
                {recent_reports.map((report) => {
                  const isHighlighted = highlightId === report.id;
                  return (
                    <div
                      key={report.id}
                      ref={isHighlighted ? highlightRef : null}
                      className={`sov-mobile-report-card ${isHighlighted ? 'sov-row--highlighted' : ''}`}
                      onClick={() => navigate(`/staff/reports?highlight=${report.id}`)}
                    >
                      <div className="sov-mobile-report-top">
                        <span className="sov-report-id">{report.report_number}</span>
                        {getResultBadge(report.status)}
                      </div>
                      <div className="sov-patient-cell">
                        {report.patient_photo ? (
                          <img
                            src={report.patient_photo}
                            alt={report.patient_name}
                            className="sov-patient-photo"
                          />
                        ) : (
                          <div className="sov-patient-av">{report.patient_initials}</div>
                        )}
                        <h4>{report.patient_name}</h4>
                      </div>
                      <p className="sov-mobile-test"><FaFlask /> {report.test_name}</p>
                      <p className="sov-mobile-doctor"><FaUserMd /> {report.doctor}</p>
                      <p className="sov-mobile-date"><MdCalendarToday /> {report.date}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="sov-card">
          <div className="sov-card-head">
            <div className="sov-card-head-icon sov-card-head-icon--purple">
              <MdTrendingUp />
            </div>
            <h2>Quick Actions</h2>
          </div>
          <div className="sov-actions-list">
            <button className="sov-action-item" onClick={() => navigate('/staff/upload')}>
              <div className="sov-action-icon sov-action-icon--blue"><MdUpload /></div>
              <div className="sov-action-info">
                <h4>Upload Lab Report</h4>
                <p>Submit new test results</p>
              </div>
              <MdArrowForward className="sov-action-arrow" />
            </button>
            <button className="sov-action-item" onClick={() => navigate('/staff/reports')}>
              <div className="sov-action-icon sov-action-icon--green"><MdScience /></div>
              <div className="sov-action-info">
                <h4>View All Reports</h4>
                <p>Browse uploaded reports</p>
              </div>
              <MdArrowForward className="sov-action-arrow" />
            </button>
            <button className="sov-action-item" onClick={() => navigate('/staff/profile')}>
              <div className="sov-action-icon sov-action-icon--purple"><MdPerson /></div>
              <div className="sov-action-info">
                <h4>My Profile</h4>
                <p>View and edit your profile</p>
              </div>
              <MdArrowForward className="sov-action-arrow" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StaffOverview;