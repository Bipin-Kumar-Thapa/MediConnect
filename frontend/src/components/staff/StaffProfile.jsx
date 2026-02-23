import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdEdit,
  MdSave,
  MdCancel,
  MdPerson,
  MdEmail,
  MdPhone,
  MdCalendarToday,
  MdBadge,
  MdWork,
  MdAccessTime,
  MdCheckCircle,
  MdScience,
  MdBarChart,
  MdTrendingUp
} from 'react-icons/md';
import { FaFlask, FaAward } from 'react-icons/fa';
import '../../styles/staff/StaffProfile.css';

const StaffProfile = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [profileData, setProfileData] = useState({
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@mediconnect.com',
    phone: '+1 (555) 123-4567',
    role: 'Lab Technician',
    department: 'Laboratory Services',
    employeeId: 'STAFF-2024-001',
    dateOfJoining: 'January 15, 2024',
    shift: 'Morning (8:00 AM - 4:00 PM)',
    specialization: 'Clinical Chemistry & Hematology',
    certification: 'Medical Laboratory Scientist (MLS)',
    yearsOfExperience: '5 years'
  });

  const [formData, setFormData] = useState(profileData);

  const stats = [
    { label: 'Total Reports', value: '127', icon: <FaFlask />, color: 'blue' },
    { label: 'This Month', value: '43', icon: <MdBarChart />, color: 'green' },
    { label: 'This Week', value: '12', icon: <MdTrendingUp />, color: 'purple' },
    { label: 'Accuracy Rate', value: '98.5%', icon: <MdCheckCircle />, color: 'teal' }
  ];



  const recentActivity = [
    { action: 'Uploaded Lab Report', id: 'LAB-127', time: '2 hours ago' },
    { action: 'Completed Blood Test', id: 'LAB-126', time: '4 hours ago' },
    { action: 'Updated Patient Record', id: 'PAT-003', time: '1 day ago' },
    { action: 'Uploaded Lab Report', id: 'LAB-125', time: '2 days ago' }
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    setProfileData(formData);
    setIsEditing(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleCancel = () => {
    setFormData(profileData);
    setIsEditing(false);
  };

  return (
    <div className="spr-page">

      {/* Success Toast */}
      {showSuccess && (
        <div className="spr-toast">
          <MdCheckCircle className="spr-toast-icon" />
          <div>
            <strong>Profile Updated!</strong>
            <span>Your changes have been saved successfully.</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="spr-header">
        <h1>My Profile</h1>
        <div className="spr-header-actions">
          {!isEditing ? (
            <button className="spr-edit-btn" onClick={() => setIsEditing(true)}>
              <MdEdit /> Edit Profile
            </button>
          ) : (
            <>
              <button className="spr-cancel-btn" onClick={handleCancel}>
                <MdCancel /> Cancel
              </button>
              <button className="spr-save-btn" onClick={handleSave}>
                <MdSave /> Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <div className="spr-profile-card">
        <div className="spr-profile-header">
          <div className="spr-avatar-large">
            {profileData.firstName[0]}{profileData.lastName[0]}
          </div>
          <div className="spr-profile-info">
            <h2>{profileData.firstName} {profileData.lastName}</h2>
            <p className="spr-role">{profileData.role}</p>
            <p className="spr-dept">{profileData.department}</p>
            <div className="spr-badges">
              <span className="spr-badge spr-badge--blue">
                <MdBadge /> {profileData.employeeId}
              </span>
              <span className="spr-badge spr-badge--green">
                <MdAccessTime /> {profileData.shift}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="spr-stats-grid">
          {stats.map((stat, i) => (
            <div key={i} className={`spr-stat-card spr-stat-card--${stat.color}`}>
              <div className={`spr-stat-icon spr-stat-icon--${stat.color}`}>
                {stat.icon}
              </div>
              <div className="spr-stat-info">
                <h3>{stat.value}</h3>
                <p>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="spr-content-grid">

        {/* Left Column - Profile Details */}
        <div className="spr-section-col">

          {/* Personal Information */}
          <div className="spr-card">
            <div className="spr-card-head">
              <div className="spr-card-icon spr-card-icon--blue">
                <MdPerson />
              </div>
              <h3>Personal Information</h3>
            </div>
            <div className="spr-card-body">
              <div className="spr-form-grid">
                <div className="spr-field">
                  <label>First Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                    />
                  ) : (
                    <p>{profileData.firstName}</p>
                  )}
                </div>
                <div className="spr-field">
                  <label>Last Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                    />
                  ) : (
                    <p>{profileData.lastName}</p>
                  )}
                </div>
              </div>

              <div className="spr-field">
                <label><MdEmail /> Email Address</label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                ) : (
                  <p>{profileData.email}</p>
                )}
              </div>

              <div className="spr-field">
                <label><MdPhone /> Phone Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                ) : (
                  <p>{profileData.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="spr-card">
            <div className="spr-card-head">
              <div className="spr-card-icon spr-card-icon--purple">
                <MdWork />
              </div>
              <h3>Professional Information</h3>
            </div>
            <div className="spr-card-body">
              <div className="spr-field">
                <label><MdBadge /> Role</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                  />
                ) : (
                  <p>{profileData.role}</p>
                )}
              </div>

              <div className="spr-field">
                <label><MdWork /> Department</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                  />
                ) : (
                  <p>{profileData.department}</p>
                )}
              </div>

              <div className="spr-field">
                <label><MdScience /> Specialization</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                  />
                ) : (
                  <p>{profileData.specialization}</p>
                )}
              </div>

              <div className="spr-field">
                <label><FaAward /> Certification</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="certification"
                    value={formData.certification}
                    onChange={handleChange}
                  />
                ) : (
                  <p>{profileData.certification}</p>
                )}
              </div>

              <div className="spr-form-grid">
                <div className="spr-field">
                  <label><MdCalendarToday /> Date of Joining</label>
                  <p>{profileData.dateOfJoining}</p>
                </div>
                <div className="spr-field">
                  <label><MdAccessTime /> Experience</label>
                  <p>{profileData.yearsOfExperience}</p>
                </div>
              </div>

              <div className="spr-field">
                <label><MdAccessTime /> Shift Timing</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="shift"
                    value={formData.shift}
                    onChange={handleChange}
                  />
                ) : (
                  <p>{profileData.shift}</p>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column - Activity */}
        <div className="spr-section-col">

          {/* Recent Activity */}
          <div className="spr-card">
            <div className="spr-card-head">
              <div className="spr-card-icon spr-card-icon--green">
                <MdBarChart />
              </div>
              <h3>Recent Activity</h3>
            </div>
            <div className="spr-card-body">
              <div className="spr-activity-list">
                {recentActivity.map((activity, i) => (
                  <div key={i} className="spr-activity-item">
                    <div className="spr-activity-dot" />
                    <div className="spr-activity-info">
                      <p className="spr-activity-action">{activity.action}</p>
                      <div className="spr-activity-meta">
                        <code className="spr-activity-id">{activity.id}</code>
                        <span className="spr-activity-time">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default StaffProfile;