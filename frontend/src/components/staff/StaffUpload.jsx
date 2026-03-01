import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdPerson,
  MdScience,
  MdAdd,
  MdDelete,
  MdCheckCircle,
  MdPending,
  MdInfo,
  MdCalendarToday,
  MdUpload,
  MdCancel,
  MdNotes,
  MdImage,
  MdAttachFile,
  MdClose,
  MdRemoveCircle,
  MdSearch,
} from 'react-icons/md';
import { FaUserMd, FaFlask, FaNotesMedical } from 'react-icons/fa';
import '../../styles/staff/StaffUpload.css';

const getCSRF = () =>
  document.cookie.split('; ').find(r => r.startsWith('csrftoken='))?.split('=')[1] || '';

const StaffUpload = () => {
  const navigate = useNavigate();

  // Patient search states
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const patientSearchRef = useRef(null);

  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedPatientObj, setSelectedPatientObj] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [consultingDoctor, setConsultingDoctor] = useState(null);
  const [testDate, setTestDate] = useState('');
  const [reportStatus, setReportStatus] = useState('Pending');
  const [notes, setNotes] = useState('');
  const [reportFiles, setReportFiles] = useState([]);
  const [reportImages, setReportImages] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [testSections, setTestSections] = useState([
    {
      id: 1,
      test_name_choice: '',
      custom_test_name: '',
      category: '',
      status: 'Normal',
      findings: '',
      parameters: [
        { id: 1, name: '', value: '', unit: '', normalRange: '', status: 'Normal' }
      ]
    }
  ]);

  const categories = [
    'Hematology', 'Biochemistry', 'Endocrinology',
    'Microbiology', 'Radiology', 'Other'
  ];

  const testNames = [
    'CBC', 'LFT', 'KFT', 'Lipid Profile', 'Thyroid Panel',
    'HbA1c', 'Urinalysis', 'ESR', 'CRP', 'Vitamin D',
    'Vitamin B12', 'Iron Studies', 'Electrolytes',
    'Blood Gas', 'Coagulation', 'Other'
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (patientSearchRef.current && !patientSearchRef.current.contains(event.target)) {
        setShowPatientDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search patients with debounce
  useEffect(() => {
    // Don't search if less than 2 characters
    if (patientSearchQuery.length < 2) {
      setPatientSearchResults([]);
      setSearchingPatients(false);
      setShowPatientDropdown(false);
      return;
    }

    setSearchingPatients(true);
    const timeoutId = setTimeout(() => {
      fetch(`http://localhost:8000/staff/patients/search/?q=${encodeURIComponent(patientSearchQuery)}`, {
        credentials: 'include'
      })
        .then(r => r.json())
        .then(data => {
          setPatientSearchResults(data.patients || []);
          setSearchingPatients(false);
          if (patientSearchQuery.length >= 2) {
            setShowPatientDropdown(true);
          }
        })
        .catch(() => {
          setSearchingPatients(false);
          setShowPatientDropdown(false);
        });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [patientSearchQuery]);

  const handlePatientSelect = (patient) => {
    setSelectedPatient(String(patient.id));
    setSelectedPatientObj(patient);
    setPatientSearchQuery(`${patient.name} • ${patient.patient_id}`);
    setShowPatientDropdown(false);
    setPatientSearchResults([]);
    setSelectedDoctor('');
    setConsultingDoctor(null);
    setDoctors([]);

    // Load doctors for this patient
    setLoadingDoctors(true);
    fetch(`http://localhost:8000/staff/patients/${patient.id}/doctors/`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const docs = data.doctors || [];
        setDoctors(docs);
        setLoadingDoctors(false);
        if (docs.length === 1) {
          setSelectedDoctor(String(docs[0].id));
          setConsultingDoctor(docs[0]);
        }
      })
      .catch(() => setLoadingDoctors(false));
  };

  const handleDoctorChange = (e) => {
    const id = e.target.value;
    setSelectedDoctor(id);
    const doc = doctors.find(d => String(d.id) === id);
    setConsultingDoctor(doc || null);
  };

  const addTestSection = () => {
    setTestSections([...testSections, {
      id: Date.now(),
      test_name_choice: '',
      custom_test_name: '',
      category: '',
      status: 'Normal',
      findings: '',
      parameters: [
        { id: Date.now(), name: '', value: '', unit: '', normalRange: '', status: 'Normal' }
      ]
    }]);
  };

  const removeTestSection = (sectionId) => {
    if (testSections.length > 1) {
      setTestSections(testSections.filter(s => s.id !== sectionId));
    }
  };

  const updateTestSection = (sectionId, field, value) => {
    setTestSections(testSections.map(section =>
      section.id === sectionId ? { ...section, [field]: value } : section
    ));
  };

  const addParameter = (sectionId) => {
    setTestSections(testSections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            parameters: [...section.parameters, {
              id: Date.now(),
              name: '',
              value: '',
              unit: '',
              normalRange: '',
              status: 'Normal'
            }]
          }
        : section
    ));
  };

  const removeParameter = (sectionId, paramId) => {
    setTestSections(testSections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            parameters: section.parameters.length > 1
              ? section.parameters.filter(p => p.id !== paramId)
              : section.parameters
          }
        : section
    ));
  };

  const updateParameter = (sectionId, paramId, field, value) => {
    setTestSections(testSections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            parameters: section.parameters.map(param =>
              param.id === paramId ? { ...param, [field]: value } : param
            )
          }
        : section
    ));
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Normal':   return 'sup-param-status--normal';
      case 'High':     return 'sup-param-status--high';
      case 'Low':      return 'sup-param-status--low';
      case 'Critical': return 'sup-param-status--critical';
      default:         return '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleReset = () => {
    setSelectedPatient('');
    setSelectedPatientObj(null);
    setPatientSearchQuery('');
    setPatientSearchResults([]);
    setSelectedDoctor('');
    setConsultingDoctor(null);
    setDoctors([]);
    setTestDate('');
    setReportStatus('Pending');
    setNotes('');
    setReportFiles([]);
    setReportImages([]);
    setErrorMsg('');
    setTestSections([{
      id: 1,
      test_name_choice: '',
      custom_test_name: '',
      category: '',
      status: 'Normal',
      findings: '',
      parameters: [
        { id: 1, name: '', value: '', unit: '', normalRange: '', status: 'Normal' }
      ]
    }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('patient_id', selectedPatient);
      formData.append('doctor_id', selectedDoctor);
      formData.append('test_date', testDate);
      formData.append('is_completed', reportStatus === 'Completed' ? 'true' : 'false');
      formData.append('notes', notes);
      formData.append('test_sections', JSON.stringify(testSections));
      reportFiles.forEach(file => formData.append('report_files', file));
      reportImages.forEach(image => formData.append('report_images', image));

      const response = await fetch('http://localhost:8000/staff/lab-reports/upload/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCSRF() },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMsg(`Report ${data.report_number} uploaded successfully!`);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          handleReset();
        }, 3000);
      } else {
        setErrorMsg(data.error || 'Upload failed. Please try again.');
      }
    } catch (err) {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sup-page">

      {showSuccess && (
        <div className="sup-toast">
          <div className="sup-toast-icon"><MdCheckCircle /></div>
          <div className="sup-toast-msg">
            <strong>Report Uploaded!</strong>
            <span>{successMsg}</span>
          </div>
          <button className="sup-toast-close" onClick={() => setShowSuccess(false)}>
            <MdClose />
          </button>
        </div>
      )}

      <div className="sup-header">
        <div className="sup-header-left">
          <h1>Upload Lab Report</h1>
          <p>Search patient, add multiple tests, parameters and upload files</p>
        </div>
      </div>

      {errorMsg && (
        <div className="sup-error-banner">
          <MdClose /> {errorMsg}
        </div>
      )}

      <form className="sup-form" onSubmit={handleSubmit}>

        {/* PATIENT & DOCTOR */}
        <div className="sup-card sup-card--patient">
          <div className="sup-card-head">
            <div className="sup-card-head-icon sup-icon--blue"><MdPerson /></div>
            <h2>Patient & Doctor Information</h2>
          </div>
          <div className="sup-card-body">
            <div className="sup-grid-2">
              
              {/* FIXED: Searchable Patient Field */}
              <div className="sup-field" style={{ position: 'relative', zIndex: 100 }}>
                <label>Search Patient <span className="sup-required">*</span></label>
                <div className="sup-search-wrap" ref={patientSearchRef}>
                  <MdSearch className="sup-search-icon" />
                  <input
                    type="text"
                    className="sup-search-input"
                    value={patientSearchQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPatientSearchQuery(value);
                      if (value.length >= 2) {
                        setShowPatientDropdown(true);
                      } else {
                        setShowPatientDropdown(false);
                      }
                    }}
                    onFocus={() => {
                      if (patientSearchQuery.length >= 2 && patientSearchResults.length > 0) {
                        setShowPatientDropdown(true);
                      }
                    }}
                    placeholder="Type patient name or ID..."
                    required
                  />
                  {searchingPatients && <div className="sup-search-spinner" />}
                  
                  {/* Dropdown directly below input */}
                  {showPatientDropdown && patientSearchQuery.length >= 2 && (
                    <div className="sup-search-dropdown">
                      {patientSearchResults.length > 0 ? (
                        patientSearchResults.map(patient => (
                          <div
                            key={patient.id}
                            className="sup-search-item"
                            onClick={() => handlePatientSelect(patient)}
                          >
                            <div className="sup-search-item-main">
                              <span className="sup-search-item-name">{patient.name}</span>
                              <span className="sup-search-item-id">{patient.patient_id}</span>
                            </div>
                            <div className="sup-search-item-meta">
                              {patient.age}y • {patient.gender}
                            </div>
                          </div>
                        ))
                      ) : !searchingPatients ? (
                        <div className="sup-search-empty">No patients found</div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              <div className="sup-field">
                <label>Select Doctor <span className="sup-required">*</span></label>
                <select value={selectedDoctor} onChange={handleDoctorChange} required disabled={!selectedPatient || loadingDoctors}>
                  <option value="">
                    {!selectedPatient ? 'Select patient first...' : loadingDoctors ? 'Loading...' : doctors.length === 0 ? 'No doctors found' : 'Choose a doctor...'}
                  </option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.specialty} {d.last_visit ? `(${d.last_visit})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {consultingDoctor && (
              <div className="sup-doctor-box">
                {consultingDoctor.photo_url ? (
                  <img src={consultingDoctor.photo_url} alt={consultingDoctor.name} className="sup-doctor-photo" />
                ) : (
                  <div className="sup-doctor-av"><FaUserMd /></div>
                )}
                <div className="sup-doctor-info">
                  <h4>{consultingDoctor.name}</h4>
                  <p>{consultingDoctor.specialty}{consultingDoctor.department ? ` • ${consultingDoctor.department}` : ''}</p>
                  {consultingDoctor.last_visit && <small>Last visit: {consultingDoctor.last_visit}</small>}
                </div>
                <div className="sup-doctor-note">
                  <MdInfo />
                  <span>Report sent to doctor and patient</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TEST DATE & STATUS */}
        <div className="sup-card">
          <div className="sup-card-head">
            <div className="sup-card-head-icon sup-icon--purple"><FaFlask /></div>
            <h2>Report Information</h2>
          </div>
          <div className="sup-card-body">
            <div className="sup-grid-2">
              <div className="sup-field">
                <label>Test Date <span className="sup-required">*</span></label>
                <div className="sup-input-icon-wrap">
                  <MdCalendarToday className="sup-input-icon" />
                  <input type="date" value={testDate} onChange={e => setTestDate(e.target.value)} required />
                </div>
              </div>
              <div className="sup-field">
                <label>Report Completion</label>
                <div className="sup-complete-wrap">
                  <button
                    type="button"
                    className={`sup-complete-btn ${reportStatus === 'Completed' ? 'sup-complete-btn--done' : 'sup-complete-btn--pending'}`}
                    onClick={() => setReportStatus(reportStatus === 'Completed' ? 'Pending' : 'Completed')}
                  >
                    {reportStatus === 'Completed' ? <><MdCheckCircle /> Mark as Completed</> : <><MdPending /> Mark as Pending</>}
                  </button>
                  <span className={`sup-status-badge ${reportStatus === 'Completed' ? 'sup-status-badge--completed' : 'sup-status-badge--pending'}`}>
                    {reportStatus === 'Completed' ? <><MdCheckCircle /> Completed</> : <><MdPending /> Pending</>}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TEST SECTIONS */}
        {testSections.map((section, sectionIndex) => (
          <div key={section.id} className="sup-card">
            <div className="sup-card-head">
              <div className="sup-card-head-icon sup-icon--green"><FaNotesMedical /></div>
              <h2>Test Section {sectionIndex + 1}</h2>
              {testSections.length > 1 && (
                <button type="button" className="sup-remove-section-btn" onClick={() => removeTestSection(section.id)}>
                  <MdRemoveCircle /> Remove
                </button>
              )}
            </div>
            <div className="sup-card-body">
              <div className="sup-grid-3">
                <div className="sup-field">
                  <label>Test Name <span className="sup-required">*</span></label>
                  <select
                    value={section.test_name_choice}
                    onChange={e => updateTestSection(section.id, 'test_name_choice', e.target.value)}
                    required
                  >
                    <option value="">Select test...</option>
                    {testNames.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {section.test_name_choice === 'Other' && (
                  <div className="sup-field">
                    <label>Custom Test Name <span className="sup-required">*</span></label>
                    <input
                      type="text"
                      value={section.custom_test_name}
                      onChange={e => updateTestSection(section.id, 'custom_test_name', e.target.value)}
                      placeholder="Enter custom test name"
                      required
                    />
                  </div>
                )}

                <div className="sup-field">
                  <label>Category <span className="sup-required">*</span></label>
                  <select
                    value={section.category}
                    onChange={e => updateTestSection(section.id, 'category', e.target.value)}
                    required
                  >
                    <option value="">Select category...</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="sup-field">
                  <label>Test Result <span className="sup-required">*</span></label>
                  <select
                    value={section.status}
                    onChange={e => updateTestSection(section.id, 'status', e.target.value)}
                    className={`sup-result-select sup-result-select--${section.status.toLowerCase()}`}
                  >
                    <option value="Normal">✅  Normal</option>
                    <option value="Abnormal">⚠️  Abnormal</option>
                    <option value="Critical">🚨  Critical</option>
                  </select>
                </div>
              </div>

              <div className="sup-params-section">
                <div className="sup-params-header">
                  <h3>Parameters</h3>
                  <button type="button" className="sup-add-param-btn" onClick={() => addParameter(section.id)}>
                    <MdAdd /> Add Parameter
                  </button>
                </div>

                <div className="sup-params-head">
                  <span>Parameter Name</span>
                  <span>Value</span>
                  <span>Unit</span>
                  <span>Normal Range</span>
                  <span>Status</span>
                  <span></span>
                </div>

                {section.parameters.map(param => (
                  <div key={param.id} className="sup-param-row">
                    <input
                      type="text"
                      value={param.name}
                      onChange={e => updateParameter(section.id, param.id, 'name', e.target.value)}
                      placeholder="e.g., Hemoglobin"
                    />
                    <input
                      type="text"
                      value={param.value}
                      onChange={e => updateParameter(section.id, param.id, 'value', e.target.value)}
                      placeholder="14.5"
                    />
                    <input
                      type="text"
                      value={param.unit}
                      onChange={e => updateParameter(section.id, param.id, 'unit', e.target.value)}
                      placeholder="g/dL"
                    />
                    <input
                      type="text"
                      value={param.normalRange}
                      onChange={e => updateParameter(section.id, param.id, 'normalRange', e.target.value)}
                      placeholder="12–16"
                    />
                    <select
                      value={param.status}
                      onChange={e => updateParameter(section.id, param.id, 'status', e.target.value)}
                      className={`sup-param-status-sel ${getStatusClass(param.status)}`}
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Low">Low</option>
                      <option value="Critical">Critical</option>
                    </select>
                    <button
                      type="button"
                      className="sup-del-btn"
                      onClick={() => removeParameter(section.id, param.id)}
                      disabled={section.parameters.length === 1}
                    >
                      <MdDelete />
                    </button>
                  </div>
                ))}
              </div>

              <div className="sup-field" style={{ marginTop: '16px' }}>
                <label>Findings for {section.test_name_choice || 'this test'}</label>
                <textarea
                  value={section.findings}
                  onChange={e => updateTestSection(section.id, 'findings', e.target.value)}
                  placeholder="Enter findings specific to this test..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
          <button type="button" className="sup-add-test-section-btn" onClick={addTestSection}>
            <MdAdd /> Add Another Test Section
          </button>
        </div>

        {/* FILE UPLOAD */}
        {/* FILE UPLOAD */}
        <div className="sup-card">
          <div className="sup-card-head">
            <div className="sup-card-head-icon sup-icon--pink"><MdAttachFile /></div>
            <h2>Upload Files & Images (Multiple)</h2>
          </div>
          <div className="sup-card-body">
            <div className="sup-grid-2">
              
              {/* DOCUMENTS */}
              <div className="sup-field">
                <label>Report Files (PDF / DOC)</label>
                
                {/* Show existing files */}
                {reportFiles.length > 0 && (
                  <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {reportFiles.map((file, idx) => (
                      <div key={idx} className="sup-file-preview">
                        <MdAttachFile className="sup-file-preview-icon" />
                        <div className="sup-file-preview-info">
                          <span className="sup-file-name">{file.name}</span>
                          <span className="sup-file-size">{formatFileSize(file.size)}</span>
                        </div>
                        <button 
                          type="button" 
                          className="sup-file-remove" 
                          onClick={() => setReportFiles(reportFiles.filter((_, i) => i !== idx))}
                        >
                          <MdClose />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Upload zone */}
                <label className="sup-upload-zone">
                  <input 
                    type="file" 
                    accept=".pdf,.doc,.docx" 
                    multiple 
                    onChange={e => {
                      const newFiles = Array.from(e.target.files);
                      setReportFiles([...reportFiles, ...newFiles]);
                      e.target.value = ''; // Reset input
                    }} 
                    hidden 
                  />
                  <MdAttachFile className="sup-upload-zone-icon" />
                  <span className="sup-upload-zone-title">Click to add files</span>
                  <span className="sup-upload-zone-sub">PDF, DOC, DOCX — Max 10MB each • Multiple files</span>
                </label>
              </div>

              {/* IMAGES */}
              <div className="sup-field">
                <label>Report Images (JPG / PNG)</label>
                
                {/* Show existing images */}
                {reportImages.length > 0 && (
                  <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {reportImages.map((image, idx) => (
                      <div key={idx} className="sup-file-preview">
                        <MdImage className="sup-file-preview-icon sup-file-preview-icon--img" />
                        <div className="sup-file-preview-info">
                          <span className="sup-file-name">{image.name}</span>
                          <span className="sup-file-size">{formatFileSize(image.size)}</span>
                        </div>
                        <button 
                          type="button" 
                          className="sup-file-remove" 
                          onClick={() => setReportImages(reportImages.filter((_, i) => i !== idx))}
                        >
                          <MdClose />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Upload zone */}
                <label className="sup-upload-zone sup-upload-zone--image">
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    onChange={e => {
                      const newImages = Array.from(e.target.files);
                      setReportImages([...reportImages, ...newImages]);
                      e.target.value = ''; // Reset input
                    }} 
                    hidden 
                  />
                  <MdImage className="sup-upload-zone-icon" />
                  <span className="sup-upload-zone-title">Click to add images</span>
                  <span className="sup-upload-zone-sub">JPG, PNG, WEBP — Max 5MB each • Multiple images</span>
                </label>
              </div>
              
            </div>
          </div>
        </div>

        {/* NOTES */}
        <div className="sup-card">
          <div className="sup-card-head">
            <div className="sup-card-head-icon sup-icon--orange"><MdNotes /></div>
            <h2>Additional Notes</h2>
          </div>
          <div className="sup-card-body">
            <div className="sup-field">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Enter general observations, remarks, or clinical notes for the entire report..."
                rows={6}
              />
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="sup-form-actions">
          <button type="button" className="sup-btn-cancel" onClick={handleReset} disabled={submitting}>
            <MdCancel /> Cancel
          </button>
          <button type="submit" className="sup-btn-submit" disabled={!selectedPatient || !selectedDoctor || submitting}>
            <MdUpload /> {submitting ? 'Uploading...' : 'Upload Report'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default StaffUpload;