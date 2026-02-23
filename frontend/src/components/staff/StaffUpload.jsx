import React, { useState, useEffect } from 'react';
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
} from 'react-icons/md';
import { FaUserMd, FaFlask, FaNotesMedical } from 'react-icons/fa';
import '../../styles/staff/StaffUpload.css';

const getCSRF = () =>
  document.cookie.split('; ').find(r => r.startsWith('csrftoken='))?.split('=')[1] || '';

const StaffUpload = () => {
  const navigate = useNavigate();

  // ── Data from backend ──
  const [patients, setPatients]         = useState([]);
  const [doctors, setDoctors]           = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingDoctors, setLoadingDoctors]   = useState(false);
  const [submitting, setSubmitting]     = useState(false);

  // ── Form state ──
  const [selectedPatient, setSelectedPatient]   = useState('');
  const [selectedPatientObj, setSelectedPatientObj] = useState(null);
  const [selectedDoctor, setSelectedDoctor]     = useState('');
  const [consultingDoctor, setConsultingDoctor] = useState(null);
  const [testName, setTestName]                 = useState('');
  const [testDate, setTestDate]                 = useState('');
  const [category, setCategory]                 = useState('');
  const [overallResult, setOverallResult]       = useState('Normal');
  const [reportStatus, setReportStatus]         = useState('Pending');
  const [notes, setNotes]                       = useState('');
  const [reportFile, setReportFile]             = useState(null);
  const [reportImage, setReportImage]           = useState(null);
  const [showSuccess, setShowSuccess]           = useState(false);
  const [successMsg, setSuccessMsg]             = useState('');
  const [errorMsg, setErrorMsg]                 = useState('');

  const [parameters, setParameters] = useState([
    { id: 1, name: '', value: '', unit: '', normalRange: '', status: 'Normal' }
  ]);

  const categories = [
    'Hematology', 'Biochemistry', 'Endocrinology',
    'Microbiology', 'Radiology', 'Immunology', 'Pathology'
  ];

  // ── Fetch patients on mount ──
  useEffect(() => {
    fetch('http://localhost:8000/staff/patients/', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setPatients(data.patients || []);
        setLoadingPatients(false);
      })
      .catch(() => setLoadingPatients(false));
  }, []);

  // ── When patient changes → fetch their doctors ──
  const handlePatientChange = (e) => {
    const id = e.target.value;
    setSelectedPatient(id);
    setSelectedDoctor('');
    setConsultingDoctor(null);
    setDoctors([]);

    const pat = patients.find(p => String(p.id) === id);
    setSelectedPatientObj(pat || null);

    if (!id) return;

    setLoadingDoctors(true);
    fetch(`http://localhost:8000/staff/patients/${id}/doctors/`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const docs = data.doctors || [];
        setDoctors(docs);
        setLoadingDoctors(false);
        // Auto-select if only one doctor
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

  // ── Parameters ──
  const addParameter = () => {
    setParameters([...parameters, {
      id: Date.now(), name: '', value: '', unit: '', normalRange: '', status: 'Normal'
    }]);
  };

  const removeParameter = (id) => {
    if (parameters.length > 1) setParameters(parameters.filter(p => p.id !== id));
  };

  const updateParameter = (id, field, value) => {
    setParameters(parameters.map(p => p.id === id ? { ...p, [field]: value } : p));
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
    setSelectedDoctor('');
    setConsultingDoctor(null);
    setDoctors([]);
    setTestName('');
    setTestDate('');
    setCategory('');
    setOverallResult('Normal');
    setReportStatus('Pending');
    setNotes('');
    setReportFile(null);
    setReportImage(null);
    setErrorMsg('');
    setParameters([{ id: 1, name: '', value: '', unit: '', normalRange: '', status: 'Normal' }]);
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('patient_id',     selectedPatient);
      formData.append('doctor_id',      selectedDoctor);
      formData.append('test_name',      testName);
      formData.append('test_date',      testDate);
      formData.append('category',       category.toLowerCase());
      formData.append('overall_status', overallResult.toLowerCase());
      formData.append('is_completed',   reportStatus === 'Completed' ? 'true' : 'false');
      formData.append('notes',          notes);
      formData.append('parameters',     JSON.stringify(parameters));
      if (reportFile)  formData.append('report_file',  reportFile);
      if (reportImage) formData.append('report_image', reportImage);

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

      {/* Success Toast */}
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

      {/* Page Header */}
      <div className="sup-header">
        <div className="sup-header-left">
          <h1>Upload Lab Report</h1>
          <p>Fill in all patient test results, parameters and upload files</p>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="sup-error-banner">
          <MdClose /> {errorMsg}
        </div>
      )}

      <form className="sup-form" onSubmit={handleSubmit}>

        {/* ── 1. PATIENT & DOCTOR ── */}
        <div className="sup-card">
          <div className="sup-card-head">
            <div className="sup-card-head-icon sup-icon--blue"><MdPerson /></div>
            <h2>Patient & Doctor Information</h2>
          </div>
          <div className="sup-card-body">
            <div className="sup-grid-2">

              {/* Patient dropdown */}
              <div className="sup-field">
                <label>Select Patient <span className="sup-required">*</span></label>
                <select
                  value={selectedPatient}
                  onChange={handlePatientChange}
                  required
                  disabled={loadingPatients}
                >
                  <option value="">
                    {loadingPatients ? 'Loading patients...' : 'Choose a patient...'}
                  </option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} • {p.patient_id} • {p.age}y {p.gender}
                    </option>
                  ))}
                </select>
              </div>

              {/* Doctor dropdown — only shown after patient selected */}
              <div className="sup-field">
                <label>Select Doctor <span className="sup-required">*</span></label>
                <select
                  value={selectedDoctor}
                  onChange={handleDoctorChange}
                  required
                  disabled={!selectedPatient || loadingDoctors}
                >
                  <option value="">
                    {!selectedPatient
                      ? 'Select a patient first...'
                      : loadingDoctors
                        ? 'Loading doctors...'
                        : doctors.length === 0
                          ? 'No doctors found for this patient'
                          : 'Choose a doctor...'}
                  </option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.specialty}
                      {d.last_visit ? ` (Last visit: ${d.last_visit})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Doctor info card — shows after doctor selected */}
            {consultingDoctor && (
              <div className="sup-doctor-box">
                {consultingDoctor.photo_url ? (
                  <img
                    src={consultingDoctor.photo_url}
                    alt={consultingDoctor.name}
                    className="sup-doctor-photo"
                  />
                ) : (
                  <div className="sup-doctor-av"><FaUserMd /></div>
                )}
                <div className="sup-doctor-info">
                  <h4>{consultingDoctor.name}</h4>
                  <p>{consultingDoctor.specialty}
                    {consultingDoctor.department ? ` • ${consultingDoctor.department}` : ''}
                  </p>
                  {consultingDoctor.last_visit && (
                    <small>Last visit with patient: {consultingDoctor.last_visit}</small>
                  )}
                </div>
                <div className="sup-doctor-note">
                  <MdInfo />
                  <span>Report will be sent to both doctor and patient</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 2. TEST INFORMATION ── */}
        <div className="sup-card">
          <div className="sup-card-head">
            <div className="sup-card-head-icon sup-icon--purple"><FaFlask /></div>
            <h2>Test Information</h2>
          </div>
          <div className="sup-card-body">
            <div className="sup-grid-3">
              <div className="sup-field">
                <label>Test Name <span className="sup-required">*</span></label>
                <input
                  type="text"
                  value={testName}
                  onChange={e => setTestName(e.target.value)}
                  placeholder="e.g., Complete Blood Count"
                  required
                />
              </div>
              <div className="sup-field">
                <label>Test Date <span className="sup-required">*</span></label>
                <div className="sup-input-icon-wrap">
                  <MdCalendarToday className="sup-input-icon" />
                  <input
                    type="date"
                    value={testDate}
                    onChange={e => setTestDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="sup-field">
                <label>Category <span className="sup-required">*</span></label>
                <select value={category} onChange={e => setCategory(e.target.value)} required>
                  <option value="">Select category...</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. REPORT STATUS ── */}
        <div className="sup-card">
          <div className="sup-card-head">
            <div className="sup-card-head-icon sup-icon--orange"><MdScience /></div>
            <h2>Report Status</h2>
          </div>
          <div className="sup-card-body">
            <div className="sup-status-row">
              <div className="sup-field sup-field--flex1">
                <label>Overall Result <span className="sup-required">*</span></label>
                <select
                  value={overallResult}
                  onChange={e => setOverallResult(e.target.value)}
                  className={`sup-result-select sup-result-select--${overallResult.toLowerCase()}`}
                >
                  <option value="Normal">✅  Normal</option>
                  <option value="Abnormal">⚠️  Abnormal</option>
                  <option value="Critical">🚨  Critical</option>
                </select>
              </div>
              <div className="sup-field sup-field--flex1">
                <label>Report Completion</label>
                <div className="sup-complete-wrap">
                  <button
                    type="button"
                    className={`sup-complete-btn ${reportStatus === 'Completed' ? 'sup-complete-btn--done' : 'sup-complete-btn--pending'}`}
                    onClick={() => setReportStatus(reportStatus === 'Completed' ? 'Pending' : 'Completed')}
                  >
                    {reportStatus === 'Completed'
                      ? <><MdCheckCircle /> Mark as Completed</>
                      : <><MdPending /> Mark as Pending</>}
                  </button>
                  <span className={`sup-status-badge ${reportStatus === 'Completed' ? 'sup-status-badge--completed' : 'sup-status-badge--pending'}`}>
                    {reportStatus === 'Completed'
                      ? <><MdCheckCircle /> Completed</>
                      : <><MdPending /> Pending</>}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. TEST PARAMETERS ── */}
        <div className="sup-card">
          <div className="sup-card-head">
            <div className="sup-card-head-icon sup-icon--green"><FaNotesMedical /></div>
            <h2>Test Parameters</h2>
            <button type="button" className="sup-add-param-btn" onClick={addParameter}>
              <MdAdd /> Add Parameter
            </button>
          </div>
          <div className="sup-card-body sup-card-body--no-pad">
            <div className="sup-params-head">
              <span>Parameter Name</span>
              <span>Value</span>
              <span>Unit</span>
              <span>Normal Range</span>
              <span>Status</span>
              <span></span>
            </div>
            {parameters.map((param) => (
              <div key={param.id} className="sup-param-row">
                <input type="text" value={param.name}
                  onChange={e => updateParameter(param.id, 'name', e.target.value)}
                  placeholder="e.g., Hemoglobin" />
                <input type="text" value={param.value}
                  onChange={e => updateParameter(param.id, 'value', e.target.value)}
                  placeholder="14.5" />
                <input type="text" value={param.unit}
                  onChange={e => updateParameter(param.id, 'unit', e.target.value)}
                  placeholder="g/dL" />
                <input type="text" value={param.normalRange}
                  onChange={e => updateParameter(param.id, 'normalRange', e.target.value)}
                  placeholder="12–16" />
                <select
                  value={param.status}
                  onChange={e => updateParameter(param.id, 'status', e.target.value)}
                  className={`sup-param-status-sel ${getStatusClass(param.status)}`}
                >
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Low">Low</option>
                  <option value="Critical">Critical</option>
                </select>
                <button type="button" className="sup-del-btn"
                  onClick={() => removeParameter(param.id)}
                  disabled={parameters.length === 1}>
                  <MdDelete />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. FILE + IMAGE UPLOAD ── */}
        <div className="sup-card">
          <div className="sup-card-head">
            <div className="sup-card-head-icon sup-icon--pink"><MdAttachFile /></div>
            <h2>Upload Files & Images</h2>
          </div>
          <div className="sup-card-body">
            <div className="sup-grid-2">

              {/* PDF / DOC */}
              <div className="sup-field">
                <label>Report File (PDF / DOC)</label>
                {!reportFile ? (
                  <label className="sup-upload-zone">
                    <input type="file" accept=".pdf,.doc,.docx" onChange={e => setReportFile(e.target.files[0])} hidden />
                    <MdAttachFile className="sup-upload-zone-icon" />
                    <span className="sup-upload-zone-title">Click or drag to upload</span>
                    <span className="sup-upload-zone-sub">PDF, DOC, DOCX — Max 10MB</span>
                  </label>
                ) : (
                  <div className="sup-file-preview">
                    <MdAttachFile className="sup-file-preview-icon" />
                    <div className="sup-file-preview-info">
                      <span className="sup-file-name">{reportFile.name}</span>
                      <span className="sup-file-size">{formatFileSize(reportFile.size)}</span>
                    </div>
                    <button type="button" className="sup-file-remove" onClick={() => setReportFile(null)}>
                      <MdClose />
                    </button>
                  </div>
                )}
              </div>

              {/* Image */}
              <div className="sup-field">
                <label>Report Image (JPG / PNG)</label>
                {!reportImage ? (
                  <label className="sup-upload-zone sup-upload-zone--image">
                    <input type="file" accept="image/*" onChange={e => setReportImage(e.target.files[0])} hidden />
                    <MdImage className="sup-upload-zone-icon" />
                    <span className="sup-upload-zone-title">Click or drag to upload</span>
                    <span className="sup-upload-zone-sub">JPG, PNG, WEBP — Max 5MB</span>
                  </label>
                ) : (
                  <div className="sup-file-preview">
                    <MdImage className="sup-file-preview-icon sup-file-preview-icon--img" />
                    <div className="sup-file-preview-info">
                      <span className="sup-file-name">{reportImage.name}</span>
                      <span className="sup-file-size">{formatFileSize(reportImage.size)}</span>
                    </div>
                    <button type="button" className="sup-file-remove" onClick={() => setReportImage(null)}>
                      <MdClose />
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* ── 6. NOTES ── */}
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
                placeholder="Enter any additional observations, remarks, or clinical notes..."
                rows={6}
              />
            </div>
          </div>
        </div>

        {/* ── ACTIONS ── */}
        <div className="sup-form-actions">
          <button type="button" className="sup-btn-cancel" onClick={handleReset} disabled={submitting}>
            <MdCancel /> Cancel
          </button>
          <button
            type="submit"
            className="sup-btn-submit"
            disabled={!selectedPatient || !selectedDoctor || submitting}
          >
            <MdUpload />
            {submitting ? 'Uploading...' : 'Upload Report'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default StaffUpload;