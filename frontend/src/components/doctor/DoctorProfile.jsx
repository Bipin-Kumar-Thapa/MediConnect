import React, { useState, useEffect } from 'react';
import { 
  MdPerson,
  MdEmail,
  MdPhone,
  MdLocationOn,
  MdEdit,
  MdSave,
  MdCancel,
  MdCamera,
  MdWork,
  MdSchool,
  MdVerifiedUser
} from 'react-icons/md';
import { FaUserMd, FaStethoscope, FaHospital } from 'react-icons/fa';
import { getCSRFToken } from '../../utils/csrf';
import '../../styles/doctor/DoctorProfile.css';

const DoctorProfile = () => {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  
  // ✅ Specialty choices matching backend model
  const specialtyChoices = [
    { value: 'cardiology', label: 'Cardiologist' },
    { value: 'general', label: 'General Physician' },
    { value: 'dermatology', label: 'Dermatologist' },
    { value: 'orthopedic', label: 'Orthopedic' },
    { value: 'ophthalmology', label: 'Ophthalmologist' },
    { value: 'dentistry', label: 'Dentist' },
    { value: 'neurology', label: 'Neurologist' },
    { value: 'pediatrics', label: 'Pediatrician' },
    { value: 'psychiatry', label: 'Psychiatrist' },
    { value: 'gynecology', label: 'Gynecologist' },
    { value: 'other', label: 'Other' },
  ];
  
  const [doctorData, setDoctorData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialty: '',
    specialtyCode: '', // ✅ Added for backend value
    subSpecialty: '',
    licenseNumber: '',
    yearsOfExperience: '',
    roomLocation: '',
    department: '',
    education: '',
    certification: '',
    languages: '',
    hospitalName: '',
    availableHours: '',
    doctorId: '',
    memberSince: '',
    lastUpdated: '',
    photoUrl: null
  });

  const [formData, setFormData] = useState(doctorData);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('http://localhost:8000/doctor/profile/', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setDoctorData(data);
        setFormData(data);
        setProfileImage(data.photoUrl);
      } else {
        console.error('Failed to fetch profile');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData(doctorData);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      const response = await fetch('http://localhost:8000/doctor/profile/update/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken(),
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setDoctorData(formData);
        setIsEditing(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        // Refresh profile to get updated data
        fetchProfile();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('An error occurred while updating profile');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // ✅ Handle specialty dropdown change
  const handleSpecialtyChange = (e) => {
    const selectedCode = e.target.value;
    const selectedSpecialty = specialtyChoices.find(s => s.value === selectedCode);
    
    setFormData(prev => ({
      ...prev,
      specialtyCode: selectedCode,
      specialty: selectedSpecialty ? selectedSpecialty.label : ''
    }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPEG, PNG, and GIF images are allowed');
      return;
    }

    // Preview image
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImage(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload image
    const formDataImg = new FormData();
    formDataImg.append('photo', file);

    try {
      const response = await fetch('http://localhost:8000/doctor/profile/upload-photo/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': getCSRFToken(),
        },
        body: formDataImg
      });

      if (response.ok) {
        const data = await response.json();
        setProfileImage(data.photo_url);

        window.dispatchEvent(new CustomEvent('profileImageUpdated', { 
          detail: { photoUrl: data.photo_url }
        }));
        
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('An error occurred while uploading photo');
    }
  };

  if (loading) {
    return <div className="doctor-profile-page">Loading...</div>;
  }

  return (
    <div className="doctor-profile-page">
      {/* Success Notification */}
      {showSuccess && (
        <div className="success-notification">
          <MdVerifiedUser size={20} />
          <span>Profile updated successfully!</span>
        </div>
      )}

      {/* Profile Header */}
      <div className="profile-header-doctor">
        <div className="profile-banner">
          <div className="profile-image-section">
            <div className="profile-image-wrapper">
              {profileImage ? (
                <img src={profileImage} alt="Doctor" className="profile-image" />
              ) : (
                <div className="profile-image-placeholder">
                  <FaUserMd size={60} />
                </div>
              )}
              {isEditing && (
                <label className="image-upload-btn">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <MdCamera size={20} />
                </label>
              )}
            </div>
            <div className="profile-name-section">
              <h1>Dr. {doctorData.firstName} {doctorData.lastName}</h1>
              <p className="specialty-text">{doctorData.specialty}</p>
              <div className="license-badge">
                <MdVerifiedUser size={16} />
                <span>License: {doctorData.licenseNumber}</span>
              </div>
            </div>
          </div>
          <div className="profile-actions">
            {!isEditing ? (
              <button className="btn-edit-profile" onClick={handleEdit}>
                <MdEdit size={20} />
                Edit Profile
              </button>
            ) : (
              <div className="edit-actions">
                <button className="btn-cancel-edit" onClick={handleCancel}>
                  <MdCancel size={20} />
                  Cancel
                </button>
                <button className="btn-save-profile" onClick={handleSave}>
                  <MdSave size={20} />
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="profile-content-grid">
        {/* Main Information */}
        <div className="profile-main-section">
          {/* Personal Information */}
          <div className="profile-card">
            <div className="card-header-profile">
              <h2>
                <MdPerson size={24} />
                Personal Information
              </h2>
            </div>
            <div className="card-body-profile">
              <div className="form-grid">
                <div className="form-field">
                  <label>First Name</label>
                  <div className="input-wrapper">
                    <MdPerson size={18} />
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={!isEditing ? 'disabled' : ''}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Last Name</label>
                  <div className="input-wrapper">
                    <MdPerson size={18} />
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={!isEditing ? 'disabled' : ''}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Email Address</label>
                  <div className="input-wrapper">
                    <MdEmail size={18} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={!isEditing ? 'disabled' : ''}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Phone Number</label>
                  <div className="input-wrapper">
                    <MdPhone size={18} />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={!isEditing ? 'disabled' : ''}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="profile-card">
            <div className="card-header-profile">
              <h2>
                <FaStethoscope size={24} />
                Professional Information
              </h2>
            </div>
            <div className="card-body-profile">
              <div className="form-grid">
                {/* ✅ PRIMARY SPECIALTY - NOW DROPDOWN */}
                <div className="form-field">
                  <label>Primary Specialty</label>
                  <div className="input-wrapper">
                    <MdWork size={18} />
                    <select
                      name="specialtyCode"
                      value={formData.specialtyCode}
                      onChange={handleSpecialtyChange}
                      disabled={!isEditing}
                      className={!isEditing ? 'disabled' : ''}
                    >
                      <option value="">Select Specialty</option>
                      {specialtyChoices.map(specialty => (
                        <option key={specialty.value} value={specialty.value}>
                          {specialty.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label>Sub-Specialty</label>
                  <div className="input-wrapper">
                    <FaStethoscope size={18} />
                    <input
                      type="text"
                      name="subSpecialty"
                      value={formData.subSpecialty}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={!isEditing ? 'disabled' : ''}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>License Number</label>
                  <div className="input-wrapper">
                    <MdVerifiedUser size={18} />
                    <input
                      type="text"
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={!isEditing ? 'disabled' : ''}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Years of Experience</label>
                  <div className="input-wrapper">
                    <MdWork size={18} />
                    <input
                      type="text"
                      name="yearsOfExperience"
                      value={formData.yearsOfExperience}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={!isEditing ? 'disabled' : ''}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Department</label>
                  <div className="input-wrapper">
                    <FaHospital size={18} />
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={!isEditing ? 'disabled' : ''}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Hospital/Clinic Name</label>
                  <div className="input-wrapper">
                    <FaHospital size={18} />
                    <input
                      type="text"
                      name="hospitalName"
                      value={formData.hospitalName}
                      onChange={handleChange}
                      placeholder="Enter hospital or clinic name"
                      disabled={!isEditing}
                      className={!isEditing ? 'disabled' : ''}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Room Location */}
          <div className="profile-card">
            <div className="card-header-profile">
              <h2>
                <MdLocationOn size={24} />
                Room Location
              </h2>
            </div>
            <div className="card-body-profile">
              <div className="form-field-full">
                <label>Office/Room Location</label>
                <div className="input-wrapper">
                  <MdLocationOn size={18} />
                  <input
                    type="text"
                    name="roomLocation"
                    value={formData.roomLocation}
                    onChange={handleChange}
                    placeholder="e.g., 2nd Floor - Room 205 - Cardiology Wing"
                    disabled={!isEditing}
                    className={!isEditing ? 'disabled' : ''}
                  />
                </div>
                <small className="field-hint">
                  Include floor, room number, and wing/department for easy patient navigation
                </small>
              </div>
            </div>
          </div>

          {/* Education & Certification */}
          <div className="profile-card">
            <div className="card-header-profile">
              <h2>
                <MdSchool size={24} />
                Education & Certification
              </h2>
            </div>
            <div className="card-body-profile">
              <div className="form-field-full">
                <label>Education</label>
                <div className="input-wrapper">
                  <MdSchool size={18} />
                  <input
                    type="text"
                    name="education"
                    value={formData.education}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={!isEditing ? 'disabled' : ''}
                  />
                </div>
              </div>

              <div className="form-field-full">
                <label>Board Certification</label>
                <div className="input-wrapper">
                  <MdVerifiedUser size={18} />
                  <input
                    type="text"
                    name="certification"
                    value={formData.certification}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={!isEditing ? 'disabled' : ''}
                  />
                </div>
              </div>

              <div className="form-field-full">
                <label>Languages Spoken</label>
                <div className="input-wrapper">
                  <MdPerson size={18} />
                  <input
                    type="text"
                    name="languages"
                    value={formData.languages}
                    onChange={handleChange}
                    placeholder="e.g., English, Spanish, French"
                    disabled={!isEditing}
                    className={!isEditing ? 'disabled' : ''}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="profile-sidebar">
          {/* Quick Stats */}
          <div className="sidebar-card">
            <h3>Quick Stats</h3>
            <div className="stats-list">
              <div className="stat-item">
                <FaUserMd size={20} style={{ color: '#3B82F6' }} />
                <div>
                  <span className="stat-label">Experience</span>
                  <span className="stat-value">
                    {doctorData.yearsOfExperience ? `${doctorData.yearsOfExperience} Years` : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="stat-item">
                <FaStethoscope size={20} style={{ color: '#10B981' }} />
                <div>
                  <span className="stat-label">Specialty</span>
                  <span className="stat-value">{doctorData.specialty || 'N/A'}</span>
                </div>
              </div>
              <div className="stat-item">
                <FaHospital size={20} style={{ color: '#8B5CF6' }} />
                <div>
                  <span className="stat-label">Department</span>
                  <span className="stat-value">{doctorData.department || 'N/A'}</span>
                </div>
              </div>
              <div className="stat-item">
                <MdLocationOn size={20} style={{ color: '#F59E0B' }} />
                <div>
                  <span className="stat-label">Location</span>
                  <span className="stat-value">{doctorData.roomLocation || 'Not set'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Availability */}
          <div className="sidebar-card">
            <h3>Availability</h3>
            <div className="availability-info">
              <div className="input-wrapper">
                <input
                  type="text"
                  name="availableHours"
                  value={formData.availableHours}
                  onChange={handleChange}
                  placeholder="e.g., Mon-Fri: 9:00 AM - 5:00 PM"
                  disabled={!isEditing}
                  className={!isEditing ? 'disabled' : ''}
                />
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="sidebar-card">
            <h3>Account Information</h3>
            <div className="account-info">
              <div className="info-row-sidebar">
                <span className="info-label-sidebar">Doctor ID:</span>
                <span className="info-value-sidebar">{doctorData.doctorId}</span>
              </div>
              <div className="info-row-sidebar">
                <span className="info-label-sidebar">Member Since:</span>
                <span className="info-value-sidebar">{doctorData.memberSince}</span>
              </div>
              <div className="info-row-sidebar">
                <span className="info-label-sidebar">Last Updated:</span>
                <span className="info-value-sidebar">{doctorData.lastUpdated}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;