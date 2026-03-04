import React from 'react';
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

  const stats = [
    {
      label: 'Prescriptions Today',
      value: '42',
      icon: <MdDescription />,
      color: 'green',
      change: '+12%',
      trend: 'up'
    },
    {
      label: 'Total Medicines',
      value: '156',
      icon: <MdInventory />,
      color: 'blue',
      change: '+5',
      trend: 'up'
    },
    {
      label: 'Low Stock Items',
      value: '8',
      icon: <MdWarning />,
      color: 'orange',
      change: '+3',
      trend: 'up'
    },
    {
      label: 'Pending Requests',
      value: '3',
      icon: <MdNotifications />,
      color: 'red',
      change: '-2',
      trend: 'down'
    }
  ];

  const recentPrescriptions = [
    {
      id: 'PRSC-127',
      patient: 'John Doe',
      patientId: 'PAT-001',
      doctor: 'Dr. Sarah Mitchell',
      date: 'Feb 19, 2026',
      time: '10:30 AM',
      status: 'Pending',
      medicines: 2
    },
    {
      id: 'PRSC-126',
      patient: 'Sarah Williams',
      patientId: 'PAT-002',
      doctor: 'Dr. James Rodriguez',
      date: 'Feb 19, 2026',
      time: '09:15 AM',
      status: 'Fulfilled',
      medicines: 1
    },
    {
      id: 'PRSC-125',
      patient: 'Michael Brown',
      patientId: 'PAT-003',
      doctor: 'Dr. Emily Chen',
      date: 'Feb 19, 2026',
      time: '08:45 AM',
      status: 'Fulfilled',
      medicines: 3
    }
  ];

  const lowStockMedicines = [
    { name: 'Paracetamol 500mg', stock: 10, unit: 'tablets', level: 'critical' },
    { name: 'Amoxicillin 250mg', stock: 28, unit: 'capsules', level: 'low' },
    { name: 'Ibuprofen 400mg', stock: 35, unit: 'tablets', level: 'low' }
  ];

  const notifications = [
    {
      id: 1,
      type: 'warning',
      title: 'Low Stock Alert',
      message: 'Paracetamol 500mg is running low (10 tablets remaining)',
      time: '5 minutes ago'
    },
    {
      id: 2,
      type: 'info',
      title: 'New Prescription',
      message: 'New prescription PRSC-127 from Dr. Sarah Mitchell',
      time: '15 minutes ago'
    },
    {
      id: 3,
      type: 'success',
      title: 'Request Fulfilled',
      message: 'Patient request REQ-042 has been delivered',
      time: '1 hour ago'
    },
    {
      id: 4,
      type: 'warning',
      title: 'Expiry Alert',
      message: '3 medicines expiring in the next 30 days',
      time: '2 hours ago'
    }
  ];

  const getStatusBadgeClass = (status) => {
    return status === 'Pending' ? 'phd-badge--yellow' : 'phd-badge--green';
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

        {/* Header */}
        <div className="phd-header">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome back to Central Pharmacy</p>
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
                <div className={`phd-stat-change ${stat.trend === 'up' ? 'phd-stat-change--up' : 'phd-stat-change--down'}`}>
                  {stat.trend === 'up' ? <MdTrendingUp /> : <MdTrendingDown />}
                  <span>{stat.change}</span>
                </div>
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
                <span>Recent Prescriptions</span>
              </div>
              <button 
                className="phd-btn-view-all" 
                onClick={() => navigate('/pharmacy/prescriptions')}
              >
                View All <MdArrowForward />
              </button>
            </div>
            <div className="phd-card-body">
              {recentPrescriptions.length > 0 ? (
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
                      {recentPrescriptions.map((presc) => (
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
                              {presc.status === 'Pending' ? <MdPending /> : <MdCheckCircle />}
                              {presc.status}
                            </span>
                          </td>
                          <td>
                            <button className="phd-btn-action phd-btn-action--primary">
                              {presc.status === 'Pending' ? 'Assign' : 'View'}
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
                <span>Notifications</span>
              </div>
            </div>
            <div className="phd-card-body">
              {notifications.length > 0 ? (
                <div className="phd-notif-list">
                  {notifications.map((notif) => (
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
                  <p>No notifications</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Low Stock Alert */}
        <div className="phd-card">
          <div className="phd-card-header">
            <div className="phd-card-title">
              <span className="phd-card-icon phd-card-icon--warning">
                <MdWarning />
              </span>
              <span>Low Stock Alert</span>
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
              {lowStockMedicines.map((med, index) => (
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

        {/* Quick Stats Row */}
        <div className="phd-quick-stats">
          <div className="phd-quick-stat">
            <div className="phd-quick-stat-icon phd-quick-stat-icon--blue">
              <MdDescription />
            </div>
            <div className="phd-quick-stat-info">
              <span className="phd-quick-stat-value">127</span>
              <span className="phd-quick-stat-label">Total Prescriptions</span>
            </div>
          </div>
          <div className="phd-quick-stat">
            <div className="phd-quick-stat-icon phd-quick-stat-icon--green">
              <MdCheckCircle />
            </div>
            <div className="phd-quick-stat-info">
              <span className="phd-quick-stat-value">98.5%</span>
              <span className="phd-quick-stat-label">Fulfillment Rate</span>
            </div>
          </div>
          <div className="phd-quick-stat">
            <div className="phd-quick-stat-icon phd-quick-stat-icon--purple">
              <MdAccessTime />
            </div>
            <div className="phd-quick-stat-info">
              <span className="phd-quick-stat-value">15 min</span>
              <span className="phd-quick-stat-label">Avg. Response Time</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PharmacyOverview;