import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdDashboard,
  MdDescription,
  MdInventory,
  MdWarning,
  MdNotifications,
  MdCheckCircle,
  MdPending,
  MdTrendingUp,
  MdTrendingDown,
  MdAccessTime,
  MdPerson,
  MdArrowForward,
  MdLocalPharmacy
} from 'react-icons/md';
import { FaFlask, FaPrescriptionBottle } from 'react-icons/fa';
import '../../styles/pharmacy/PharmacyOverview.css';

const PharmacyOverview = () => {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  useEffect(() => {
    fetchOverviewData();
  }, [selectedPeriod]);

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/pharmacy/overview/?period=${selectedPeriod}`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="pharmacy-dashboard-wrapper">
        <div className="phd-page">
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: `Prescriptions ${data.period_label}`,
      value: data.stats.prescriptions,
      icon: <MdDescription />,
      color: 'green',
      change: data.stats.prescriptions_change,
      trend: data.stats.prescriptions_change.startsWith('+') ? 'up' : 'down'
    },
    {
      label: 'Total Medicines',
      value: data.stats.total_medicines,
      icon: <MdInventory />,
      color: 'blue',
      change: 'In Stock',
      trend: 'neutral'
    },
    {
      label: 'Low Stock Items',
      value: data.stats.low_stock,
      icon: <MdWarning />,
      color: 'orange',
      change: 'Need Reorder',
      trend: 'neutral'
    },
    {
      label: 'Pending Requests',
      value: data.stats.pending_requests,
      icon: <MdNotifications />,
      color: 'red',
      change: 'Active',
      trend: 'neutral'
    }
  ];

  const getStatusBadgeClass = (status) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'active' || statusLower === 'pending') return 'phd-badge--yellow';
    return 'phd-badge--green';
  };

  const getStockLevelClass = (level) => {
    return level === 'critical' ? 'phd-stock--critical' : 'phd-stock--low';
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'warning': return <MdWarning />;
      case 'success': return <MdCheckCircle />;
      case 'info': return <MdNotifications />;
      default: return <MdNotifications />;
    }
  };

  const getNotificationClass = (type) => {
    switch (type) {
      case 'warning': return 'phd-notif--warning';
      case 'success': return 'phd-notif--success';
      case 'info': return 'phd-notif--info';
      default: return 'phd-notif--info';
    }
  };

  return (
    <div className="pharmacy-dashboard-wrapper">
      <div className="phd-page">

        {/* Header with Period Filter */}
        <div className="phd-header">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome back to Central Pharmacy</p>
          </div>
          
          {/* ✅ Period Filter */}
          <div className="phd-period-filter">
            <button
              className={`phd-period-btn ${selectedPeriod === 'today' ? 'phd-period-btn--active' : ''}`}
              onClick={() => setSelectedPeriod('today')}
            >
              Today
            </button>
            <button
              className={`phd-period-btn ${selectedPeriod === 'month' ? 'phd-period-btn--active' : ''}`}
              onClick={() => setSelectedPeriod('month')}
            >
              This Month
            </button>
            <button
              className={`phd-period-btn ${selectedPeriod === 'year' ? 'phd-period-btn--active' : ''}`}
              onClick={() => setSelectedPeriod('year')}
            >
              This Year
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="phd-stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className={`phd-stat-card phd-stat-card--${stat.color}`}>
              <div className="phd-stat-left">
                <span className="phd-stat-num">{stat.value}</span>
                <span className="phd-stat-label">{stat.label}</span>
              </div>
              <div className="phd-stat-right">
                <div className={`phd-stat-icon phd-stat-icon--${stat.color}`}>
                  {stat.icon}
                </div>
                {stat.trend !== 'neutral' && (
                  <div className={`phd-stat-change ${stat.trend === 'up' ? 'phd-stat-change--up' : 'phd-stat-change--down'}`}>
                    {stat.trend === 'up' ? <MdTrendingUp /> : <MdTrendingDown />}
                    <span>{stat.change}</span>
                  </div>
                )}
                {stat.trend === 'neutral' && (
                  <div className="phd-stat-info">{stat.change}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="phd-content-grid">

          {/* Recent Prescriptions */}
          <div className="phd-card">
            <div className="phd-card-header">
              <div className="phd-card-title">
                <span className="phd-card-icon">
                  <FaPrescriptionBottle />
                </span>
                <span>Recent Prescriptions (Last 10)</span>
              </div>
              <button 
                className="phd-btn-view-all" 
                onClick={() => navigate('/pharmacy/prescriptions')}
              >
                View All <MdArrowForward />
              </button>
            </div>
            <div className="phd-card-body">
              {data.recent_prescriptions.length > 0 ? (
                <div className="phd-table-wrapper">
                  <table className="phd-table">
                    <thead>
                      <tr>
                        <th>Prescription ID</th>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Date & Time</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent_prescriptions.map((presc) => (
                        <tr key={presc.id}>
                          <td>
                            <code className="phd-code">{presc.id}</code>
                          </td>
                          <td>
                            <div className="phd-patient-cell">
                              <MdPerson className="phd-patient-icon" />
                              <div>
                                <div className="phd-patient-name">{presc.patient}</div>
                                <div className="phd-patient-id">{presc.patientId}</div>
                              </div>
                            </div>
                          </td>
                          <td>{presc.doctor}</td>
                          <td>
                            <div className="phd-datetime">
                              <span>{presc.date}</span>
                              <span className="phd-time">{presc.time}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`phd-badge ${getStatusBadgeClass(presc.status)}`}>
                              {presc.status === 'Active' ? <MdPending /> : <MdCheckCircle />}
                              {presc.status}
                            </span>
                          </td>
                          <td>
                            <button className="phd-btn-action phd-btn-action--primary">
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="phd-empty-state">
                  <MdDescription className="phd-empty-icon" />
                  <p>No recent prescriptions</p>
                </div>
              )}
            </div>
          </div>

          {/* Notifications Section */}
          <div className="phd-card">
            <div className="phd-card-header">
              <div className="phd-card-title">
                <span className="phd-card-icon phd-card-icon--notif">
                  <MdNotifications />
                </span>
                <span>Notifications (Last 1 Hour)</span>
              </div>
            </div>
            <div className="phd-card-body">
              {data.notifications.length > 0 ? (
                <div className="phd-notif-list">
                  {data.notifications.map((notif) => (
                    <div key={notif.id} className={`phd-notif-item ${getNotificationClass(notif.type)}`}>
                      <div className="phd-notif-icon">
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="phd-notif-content">
                        <div className="phd-notif-title">{notif.title}</div>
                        <div className="phd-notif-message">{notif.message}</div>
                        <div className="phd-notif-time">
                          <MdAccessTime />
                          {notif.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="phd-empty-state">
                  <MdNotifications className="phd-empty-icon" />
                  <p>No notifications in the last hour</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Low Stock Alert */}
        {data.low_stock_medicines.length > 0 && (
          <div className="phd-card">
            <div className="phd-card-header">
              <div className="phd-card-title">
                <span className="phd-card-icon phd-card-icon--warning">
                  <MdWarning />
                </span>
                <span>Low Stock Alert (Top 3 Critical)</span>
              </div>
              <button 
                className="phd-btn-view-all" 
                onClick={() => navigate('/pharmacy/stock')}
              >
                Manage Stock <MdArrowForward />
              </button>
            </div>
            <div className="phd-card-body">
              <div className="phd-stock-list">
                {data.low_stock_medicines.map((med, index) => (
                  <div key={index} className={`phd-stock-item ${getStockLevelClass(med.level)}`}>
                    <div className="phd-stock-icon">
                      <FaFlask />
                    </div>
                    <div className="phd-stock-info">
                      <div className="phd-stock-name">{med.name}</div>
                      <div className="phd-stock-unit">
                        Only <strong>{med.stock} {med.unit}</strong> left
                      </div>
                    </div>
                    <span className={`phd-badge ${med.level === 'critical' ? 'phd-badge--red' : 'phd-badge--orange'}`}>
                      {med.level === 'critical' ? 'Critical' : 'Low'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PharmacyOverview;