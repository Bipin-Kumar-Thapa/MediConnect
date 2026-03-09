import React, { useState, useEffect } from 'react';
import {
  MdEdit,
  MdClose,
  MdBusiness,
  MdPerson,
  MdDescription,
  MdCheckCircle,
  MdCancel
} from 'react-icons/md';
import { FaAward } from 'react-icons/fa';
import '../../styles/pharmacy/PharmacyProfile.css';

const PharmacyProfile = () => {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [profileData, setProfileData] = useState(null);

  const [contactData, setContactData] = useState({
    contactName: '',
    contactDesignation: '',
    contactPhone: '',
    contactEmail: ''
  });

  const [originalContactData, setOriginalContactData] = useState({});

  // Fetch profile data
  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const response = await fetch('http://localhost:8000/pharmacy/profile/data/', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
        
        // Set contact data
        const contact = {
          contactName: data.contactName,
          contactDesignation: data.contactDesignation,
          contactPhone: data.contactPhone,
          contactEmail: data.contactEmail
        };
        setContactData(contact);
        setOriginalContactData(contact);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (isEditing) {
      // Save changes
      try {
        const getCookie = (name) => {
          let cookieValue = null;
          if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
              const cookie = cookies[i].trim();
              if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
              }
            }
          }
          return cookieValue;
        };

        const response = await fetch('http://localhost:8000/pharmacy/profile/update/', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
          },
          body: JSON.stringify(contactData)
        });

        if (response.ok) {
          setOriginalContactData({ ...contactData });
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
          setIsEditing(false);
          
          // Refresh profile data
          fetchProfileData();
        } else {
          alert('Failed to update profile');
        }
      } catch (error) {
        console.error('Error updating profile:', error);
        alert('Error updating profile');
      }
    } else {
      // Start editing
      setOriginalContactData({ ...contactData });
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setContactData({ ...originalContactData });
    setIsEditing(false);
  };

  const handleChange = (field, value) => {
    setContactData({
      ...contactData,
      [field]: value
    });
  };

  if (loading || !profileData) {
    return (
      <div className="pharmacy-profile-wrapper">
        <div className="php-page">
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pharmacy-profile-wrapper">
      <div className="php-page">

        {/* Header */}
        <div className="php-header">
          <div>
            <h1>Pharmacy Profile</h1>
            <p>Manage your pharmacy information and settings</p>
          </div>
        </div>

        {/* Profile Header Card */}
        <div className="php-profile-header">
          <div className="php-pharmacy-icon">
            <MdBusiness />
          </div>
          <div className="php-pharmacy-name">{profileData.pharmacyName}</div>
          <div className="php-pharmacy-branch">{profileData.branchName} • Thapathali, Kathmandu</div>
          <div className="php-license-badge">
            <FaAward />
            <span>License: {profileData.licenseNumber || profileData.pharmacyId}</span>
          </div>
        </div>

        {/* Basic Information Card - NO EDIT BUTTON */}
        <div className="php-card">
          <div className="php-card-header">
            <div className="php-card-title">
              <span className="php-card-icon">
                <MdBusiness />
              </span>
              <span>Basic Information</span>
            </div>
          </div>
          <div className="php-card-body">
            <div className="php-info-grid">
              <div className="php-info-field">
                <label>Pharmacy Name</label>
                <input type="text" value={profileData.pharmacyName} disabled />
              </div>
              <div className="php-info-field">
                <label>Branch Name</label>
                <input type="text" value={profileData.branchName} disabled />
              </div>
              <div className="php-info-field">
                <label>Phone Number</label>
                <input type="text" value={profileData.phone} disabled />
              </div>
              <div className="php-info-field">
                <label>Email Address</label>
                <input type="email" value={profileData.email} disabled />
              </div>
              <div className="php-info-field php-info-field--full">
                <label>Full Address</label>
                <textarea value={profileData.address} disabled />
              </div>
            </div>

            <div className="php-operating-hours">
              <div className="php-hours-icon">🕐</div>
              <div className="php-hours-text">
                <div className="php-hours-label">Operating Hours</div>
                <div className="php-hours-value">{profileData.operatingHours}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Person Card - EDITABLE */}
        <div className="php-card">
          <div className="php-card-header">
            <div className="php-card-title">
              <span className="php-card-icon">
                <MdPerson />
              </span>
              <span>Primary Contact Person</span>
            </div>
            <div className="php-btn-group">
              <button 
                className={`php-btn-edit ${isEditing ? 'php-btn-edit--active' : ''}`}
                onClick={handleEdit}
              >
                {isEditing ? <MdCheckCircle /> : <MdEdit />}
                <span>{isEditing ? 'Save' : 'Edit'}</span>
              </button>
              {isEditing && (
                <button className="php-btn-cancel" onClick={handleCancel}>
                  <MdCancel />
                  <span>Cancel</span>
                </button>
              )}
            </div>
          </div>
          <div className="php-card-body">
            <div className="php-info-grid">
              <div className="php-info-field">
                <label>Full Name</label>
                <input 
                  type="text" 
                  value={contactData.contactName}
                  onChange={(e) => handleChange('contactName', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="php-info-field">
                <label>Designation</label>
                <input 
                  type="text" 
                  value={contactData.contactDesignation}
                  onChange={(e) => handleChange('contactDesignation', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="php-info-field">
                <label>Contact Phone</label>
                <input 
                  type="text" 
                  value={contactData.contactPhone}
                  onChange={(e) => handleChange('contactPhone', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="php-info-field">
                <label>Contact Email</label>
                <input 
                  type="email" 
                  value={contactData.contactEmail}
                  onChange={(e) => handleChange('contactEmail', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Additional Details Card - NO EDIT BUTTON */}
        <div className="php-card">
          <div className="php-card-header">
            <div className="php-card-title">
              <span className="php-card-icon">
                <MdDescription />
              </span>
              <span>Additional Details</span>
            </div>
          </div>
          <div className="php-card-body">
            <div className="php-info-grid">
              <div className="php-info-field">
                <label>Pharmacy ID</label>
                <input type="text" value={profileData.pharmacyId} disabled />
              </div>
              <div className="php-info-field">
                <label>Member Since</label>
                <input type="text" value={profileData.memberSince} disabled />
              </div>
              <div className="php-info-field">
                <label>Established Year</label>
                <input type="text" value={profileData.establishedYear} disabled />
              </div>
              <div className="php-info-field">
                <label>Registration Number</label>
                <input type="text" value={profileData.registrationNumber} disabled />
              </div>
              <div className="php-info-field php-info-field--full">
                <label>Services Offered</label>
                <textarea value={profileData.servicesOffered} disabled />
              </div>
              <div className="php-info-field php-info-field--full">
                <label>About Pharmacy</label>
                <textarea value={profileData.aboutPharmacy} disabled />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Success Toast */}
      {showToast && (
        <div className="php-success-toast">
          <MdCheckCircle />
          <span>Contact information updated successfully!</span>
        </div>
      )}

    </div>
  );
};

export default PharmacyProfile;