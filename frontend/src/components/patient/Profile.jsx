import React, { useState, useEffect } from 'react';
import { 
  MdPerson,
  MdEmail,
  MdPhone,
  MdCake,
  MdLocationOn,
  MdEdit,
  MdSave,
  MdCancel,
  MdCamera,
  MdCheckCircle
} from 'react-icons/md';
import { FaTransgender, FaTint } from 'react-icons/fa';
import { getCSRFToken } from '../../utils/csrf';
import '../../styles/patient/Profile.css';

const Profile = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [editData, setEditData] = useState({});
  const [profileImage, setProfileImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Fetch profile data on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('http://localhost:8000/patient/profile/', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
        setEditData(data);
        setProfileImage(data.profilePhoto);
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
    setEditData({ ...profileData });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({ ...profileData });
  };

  const handleSave = async () => {
    try {
      const response = await fetch('http://localhost:8000/patient/profile/update/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken(),
        },
        body: JSON.stringify(editData)
      });

      if (response.ok) {
        setProfileData({ ...editData });
        setIsEditing(false);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
        
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

  const handleInputChange = (field, value) => {
    setEditData({
      ...editData,
      [field]: value
    });
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
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)) {
      alert('Only JPEG, PNG, and GIF images are allowed');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch('http://localhost:8000/patient/profile/upload-photo/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': getCSRFToken(),
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setProfileImage(data.photoUrl);
        
        // ✅ Dispatch event to notify Sidebar immediately
        console.log('Dispatching image update event:', data.photoUrl);
        window.dispatchEvent(new CustomEvent('profileImageUpdated', { 
          detail: { photoUrl: data.photoUrl }
        }));
        
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('An error occurred while uploading photo');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="profile-page">Loading...</div>;
  }

  if (!profileData) {
    return <div className="profile-page">Error loading profile</div>;
  }

  return (
    <div className="profile-page">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="success-message">
          <MdCheckCircle size={20} />
          <span>Profile updated successfully!</span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>My Profile</h1>
          <p>Manage your personal information</p>
        </div>
        {!isEditing ? (
          <button className="btn-edit" onClick={handleEdit}>
            <MdEdit size={18} />
            Edit Profile
          </button>
        ) : (
          <div className="edit-actions">
            <button className="btn-cancel" onClick={handleCancel}>
              <MdCancel size={18} />
              Cancel
            </button>
            <button className="btn-save" onClick={handleSave}>
              <MdSave size={18} />
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Profile Content */}
      <div className="profile-content">
        {/* Profile Card */}
        <div className="profile-card">
          <div className="profile-header-section">
            <div className="profile-image-section">
              <div className="profile-image-wrapper">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="profile-image" />
                ) : (
                  <div className="profile-image-placeholder">
                    <MdPerson size={60} />
                  </div>
                )}
                <label className="image-upload-btn">
                  {uploading ? (
                    <span>Uploading...</span>
                  ) : (
                    <MdCamera size={20} />
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                </label>
              </div>
              <div className="profile-basic-info">
                <h2>{profileData.firstName} {profileData.lastName}</h2>
                <p className="patient-id">Patient ID: {profileData.patientId}</p>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="info-section">
            <h3 className="section-title">Personal Information</h3>
            <div className="info-grid">
              <div className="info-field">
                <label>
                  <MdPerson size={18} />
                  First Name
                </label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Enter first name"
                  />
                ) : (
                  <p>{profileData.firstName || '-'}</p>
                )}
              </div>

              <div className="info-field">
                <label>
                  <MdPerson size={18} />
                  Last Name
                </label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Enter last name"
                  />
                ) : (
                  <p>{profileData.lastName || '-'}</p>
                )}
              </div>

              <div className="info-field">
                <label>
                  <MdEmail size={18} />
                  Email Address
                </label>
                {isEditing ? (
                  <input 
                    type="email" 
                    value={editData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter email"
                  />
                ) : (
                  <p>{profileData.email || '-'}</p>
                )}
              </div>

              <div className="info-field">
                <label>
                  <MdPhone size={18} />
                  Contact Number
                </label>
                {isEditing ? (
                  <input 
                    type="tel" 
                    value={editData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Enter phone number"
                  />
                ) : (
                  <p>{profileData.phone || '-'}</p>
                )}
              </div>

              <div className="info-field">
                <label>
                  <MdCake size={18} />
                  Age
                </label>
                {isEditing ? (
                  <input 
                    type="number" 
                    value={editData.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    placeholder="Enter age"
                    min="1"
                    max="150"
                  />
                ) : (
                  <p>{profileData.age ? `${profileData.age} years` : '-'}</p>
                )}
              </div>

              <div className="info-field">
                <label>
                  <FaTransgender size={18} />
                  Gender
                </label>
                {isEditing ? (
                  <select 
                    value={editData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <p>{profileData.gender || '-'}</p>
                )}
              </div>

              <div className="info-field">
                <label>
                  <FaTint size={18} />
                  Blood Group
                </label>
                {isEditing ? (
                  <select 
                    value={editData.bloodGroup}
                    onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                  >
                    <option value="">Select blood group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                ) : (
                  <p>{profileData.bloodGroup || '-'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="info-section">
            <h3 className="section-title">Address Information</h3>
            <div className="info-grid">
              <div className="info-field full-width">
                <label>
                  <MdLocationOn size={18} />
                  Street Address
                </label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Enter street address"
                  />
                ) : (
                  <p>{profileData.address || '-'}</p>
                )}
              </div>

              <div className="info-field">
                <label>
                  <MdLocationOn size={18} />
                  City
                </label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Enter city"
                  />
                ) : (
                  <p>{profileData.city || '-'}</p>
                )}
              </div>

              <div className="info-field">
                <label>
                  <MdLocationOn size={18} />
                  State
                </label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="Enter state"
                  />
                ) : (
                  <p>{profileData.state || '-'}</p>
                )}
              </div>

              <div className="info-field">
                <label>
                  <MdLocationOn size={18} />
                  ZIP Code
                </label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editData.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    placeholder="Enter ZIP code"
                  />
                ) : (
                  <p>{profileData.zipCode || '-'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="info-section">
            <h3 className="section-title">Emergency Contact</h3>
            <div className="info-grid">
              <div className="info-field">
                <label>
                  <MdPerson size={18} />
                  Contact Name
                </label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editData.emergencyName}
                    onChange={(e) => handleInputChange('emergencyName', e.target.value)}
                    placeholder="Enter contact name"
                  />
                ) : (
                  <p>{profileData.emergencyName || '-'}</p>
                )}
              </div>

              <div className="info-field">
                <label>
                  <MdPerson size={18} />
                  Relationship
                </label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editData.emergencyRelation}
                    onChange={(e) => handleInputChange('emergencyRelation', e.target.value)}
                    placeholder="Enter relationship"
                  />
                ) : (
                  <p>{profileData.emergencyRelation || '-'}</p>
                )}
              </div>

              <div className="info-field">
                <label>
                  <MdPhone size={18} />
                  Contact Number
                </label>
                {isEditing ? (
                  <input 
                    type="tel" 
                    value={editData.emergencyContact}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    placeholder="Enter emergency contact"
                  />
                ) : (
                  <p>{profileData.emergencyContact || '-'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Sidebar */}
        <div className="profile-sidebar">
          <div className="stat-box">
            <div className="stat-icon" style={{ backgroundColor: '#EFF6FF', color: '#3B82F6' }}>
              <MdPerson size={24} />
            </div>
            <div className="stat-content">
              <p>Patient Since</p>
              <h3>{profileData.memberSince}</h3>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon" style={{ backgroundColor: '#D1FAE5', color: '#059669' }}>
              <MdCheckCircle size={24} />
            </div>
            <div className="stat-content">
              <p>Total Visits</p>
              <h3>{profileData.totalVisits}</h3>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
              <FaTint size={24} />
            </div>
            <div className="stat-content">
              <p>Blood Group</p>
              <h3>{profileData.bloodGroup || '-'}</h3>
            </div>
          </div>

          <div className="info-box">
            <h4>Account Information</h4>
            <div className="info-item">
              <span>Patient ID</span>
              <strong>{profileData.patientId}</strong>
            </div>
            <div className="info-item">
              <span>Member Since</span>
              <strong>{profileData.memberSince}</strong>
            </div>
            <div className="info-item">
              <span>Last Updated</span>
              <strong>{profileData.lastUpdated}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;