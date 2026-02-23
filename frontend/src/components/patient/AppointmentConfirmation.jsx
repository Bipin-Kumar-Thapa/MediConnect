import React, { useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { MdClose, MdDownload } from 'react-icons/md';
import '../../styles/patient/AppointmentConfirmation.css';

const AppointmentConfirmation = ({ appointmentData, onClose }) => {
  const cardRef = useRef(null);
  const hasDownloaded = useRef(false);

  // Auto-download on mount (one time only)
  useEffect(() => {
    if (hasDownloaded.current) return;
    hasDownloaded.current = true;      
    setTimeout(() => {
      handleDownload();
    }, 500);
  }, []);

  const handleDownload = async () => {
    try {
      const cardElement = cardRef.current;
      if (!cardElement) return;

      // Convert HTML to canvas
      const canvas = await html2canvas(cardElement, {
        scale: 2, // Higher quality
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Appointment-Confirmation-${appointmentData.patientId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');

    } catch (error) {
      console.error('Error downloading appointment card:', error);
      alert('Failed to download appointment card. Please take a screenshot.');
    }
  };

  return (
    <div className="confirmation-overlay">
      <div className="confirmation-modal">
        <div className="confirmation-header">
          <h2>Appointment Booked Successfully! 🎉</h2>
          <button className="close-btn" onClick={onClose}>
            <MdClose size={24} />
          </button>
        </div>

        <div className="confirmation-body">
          {/* The Card that will be downloaded */}
          <div className="appointment-card-container" ref={cardRef}>
            <div className="card-header">
              <div className="card-logo">
                <div className="logo-circle">M</div>
              </div>
              <div className="card-branding">
                <h1>MediConnect</h1>
                <p>Thapathali, Kathmandu</p>
              </div>
            </div>

            <div className="card-divider"></div>

            {/* Main Content */}
            <div className="card-content">
              <h2 className="card-title">Appointment Confirmation</h2>

              {/* Patient Info */}
              <div className="info-section">
                <div className="info-row">
                  <span className="info-label">Patient:</span>
                  <span className="info-value">{appointmentData.patientName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Patient ID:</span>
                  <span className="info-value">{appointmentData.patientId}</span>
                </div>
              </div>

              {/* Appointment Details */}
              <div className="info-section">
                <div className="info-row">
                  <span className="info-label">Doctor:</span>
                  <span className="info-value">{appointmentData.doctorName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Specialty:</span>
                  <span className="info-value">{appointmentData.specialty}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Date:</span>
                  <span className="info-value">{appointmentData.date}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Time:</span>
                  <span className="info-value">{appointmentData.time}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Location:</span>
                  <span className="info-value">{appointmentData.location}</span>
                </div>
              </div>

              {/* Important Instructions */}
              <div className="instructions-section">
                <h3>IMPORTANT INSTRUCTIONS:</h3>
                <ul>
                  <li>Arrive 10 minutes before your appointment time</li>
                  <li>Visit the reception first for payment and document registration</li>
                  <li>Please show this card for further processing</li>
                  <li>Late arrivals will be marked as MISSED</li>
                  <li>No hospital authority will be responsible for missed appointments</li>
                </ul>
              </div>

              {/* Download Notice */}
              <div className="notice-section">
                <p className="notice-text">
                  <strong>NOTE:</strong> This card will be automatically downloaded to your device. 
                  Please check your downloads folder or take a screenshot. 
                  This is a one-time download only.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="card-footer">
              <p>Thank you for choosing MediConnect Healthcare</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="confirmation-actions">
            <button className="btn-download" onClick={handleDownload}>
              <MdDownload size={20} />
              Download Again
            </button>
            <button className="btn-close-confirm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentConfirmation;