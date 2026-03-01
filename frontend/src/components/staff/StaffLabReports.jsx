import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MdSearch, MdCheckCircle, MdPending, MdWarning, MdError,
  MdClose, MdCalendarToday, MdPerson, MdDownload, MdUpload,
  MdInfo, MdScience, MdEdit, MdAdd, MdDelete, MdSave, MdNotes,
  MdAttachFile, MdImage,
} from 'react-icons/md';
import { FaUserMd, FaFlask, FaNotesMedical } from 'react-icons/fa';
import '../../styles/staff/StaffLabReport.css';

const getCSRF = () =>
  document.cookie.split('; ').find(r => r.startsWith('csrftoken='))?.split('=')[1] || '';

const CATEGORIES = ['Hematology','Biochemistry','Endocrinology','Microbiology','Radiology','Other'];
const TEST_NAMES = ['CBC','LFT','KFT','Lipid Profile','Thyroid Panel','HbA1c','Urinalysis','ESR','CRP','Vitamin D','Vitamin B12','Iron Studies','Electrolytes','Blood Gas','Coagulation','Other'];

const StaffLabReports = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [reports, setReports]               = useState([]);
  const [stats, setStats]                   = useState({});
  const [pagination, setPagination]         = useState({ page:1, total_pages:1, total_count:0 });
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState('');
  const [activeFilter, setActiveFilter]     = useState('All');
  const [currentPage, setCurrentPage]       = useState(1);
  const [selectedReport, setSelectedReport] = useState(null);
  const [editReport, setEditReport]         = useState(null);
  const [highlightId, setHighlightId]       = useState(null);
  const [savingEdit, setSavingEdit]         = useState(false);
  const [editError, setEditError]           = useState('');
  const [editSuccess, setEditSuccess]       = useState('');

  // Edit form state
  const [editPatients, setEditPatients]         = useState([]);
  const [editDoctors, setEditDoctors]           = useState([]);
  const [editForm, setEditForm]                 = useState({});
  const [editTestSections, setEditTestSections] = useState([]);
  // ✅ NEW: Support multiple files
  const [editFiles, setEditFiles]               = useState([]);
  const [editImages, setEditImages]             = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [loadingEditDoctors, setLoadingEditDoctors] = useState(false);
  const [deletingAttachment, setDeletingAttachment] = useState(null);

  const highlightRef = useRef(null);
  const filters = ['All','Normal','Abnormal','Critical','Completed','Pending'];

  useEffect(() => { fetchReports(); }, [currentPage, search, activeFilter]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('highlight');
    if (id) {
      setHighlightId(Number(id));
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior:'smooth', block:'center' });
        setTimeout(() => setHighlightId(null), 3000);
      }, 400);
    }
  }, [location.search, reports]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page:currentPage, filter:activeFilter, search });
      const res = await fetch(`http://localhost:8000/staff/lab-reports/?${params}`, { credentials:'include' });
      const data = await res.json();
      setReports(data.reports || []);
      setStats(data.stats || {});
      setPagination(data.pagination || { page:1, total_pages:1, total_count:0 });
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const onSearch = (e) => { setSearch(e.target.value); setCurrentPage(1); };
  const onFilter = (f)  => { setActiveFilter(f); setCurrentPage(1); };
  const onPage   = (p)  => { setCurrentPage(p); window.scrollTo({ top:0, behavior:'smooth' }); };

  // Helper: Get test names from sections
  const getTestNamesDisplay = (sections) => {
    if (!sections || sections.length === 0) return 'No tests';
    if (sections.length === 1) return sections[0].test_name;
    return `${sections.length} Tests`;
  };

  // Helper: Get categories from sections
  const getCategoriesDisplay = (sections) => {
    if (!sections || sections.length === 0) return 'N/A';
    const cats = [...new Set(sections.map(s => s.category))];
    if (cats.length === 1) return cats[0];
    return 'Multiple';
  };

  // ── Open Edit Modal ──
  const openEdit = async (r) => {
    setEditError('');
    setEditSuccess('');
    setEditFiles([]);
    setEditImages([]);
    
    // ✅ NEW: Load existing attachments
    setExistingAttachments(r.attachments || []);
    
    setEditForm({
      patient_id:     r.patient_db_id,
      doctor_id:      r.doctor_db_id || '',
      test_date:      r.test_date_raw,
      is_completed:   r.is_completed,
      notes:          r.notes || '',
    });

    // Convert test_sections to editable format
    const sections = (r.test_sections || []).map((section, idx) => ({
      id: idx + 1,
      test_name_choice: section.test_name || '',
      custom_test_name: '',
      category: section.category ? section.category.toLowerCase() : '',
      status: section.status || 'Normal',
      findings: section.findings || '',
      parameters: (section.parameters || []).map((p, i) => ({
        id: i + 1,
        name: p.name || '',
        value: p.value || '',
        unit: p.unit || '',
        normalRange: p.normalRange || '',
        status: p.status || 'Normal'
      }))
    }));

    setEditTestSections(sections.length > 0 ? sections : [{
      id: 1,
      test_name_choice: '',
      custom_test_name: '',
      category: '',
      status: 'Normal',
      findings: '',
      parameters: [{ id: 1, name: '', value: '', unit: '', normalRange: '', status: 'Normal' }]
    }]);

    setEditReport(r);

    // Fetch patients if not loaded
    if (editPatients.length === 0) {
      const res = await fetch('http://localhost:8000/staff/patients/', { credentials:'include' });
      const data = await res.json();
      setEditPatients(data.patients || []);
    }

    // Fetch doctors for this patient
    if (r.patient_db_id) {
      setLoadingEditDoctors(true);
      const res = await fetch(`http://localhost:8000/staff/patients/${r.patient_db_id}/doctors/`, { credentials:'include' });
      const data = await res.json();
      setEditDoctors(data.doctors || []);
      setLoadingEditDoctors(false);
    }
  };

  // When patient changes in edit form → reload doctors
  const onEditPatientChange = async (e) => {
    const id = e.target.value;
    setEditForm(f => ({ ...f, patient_id: id, doctor_id: '' }));
    if (!id) { setEditDoctors([]); return; }
    setLoadingEditDoctors(true);
    const res = await fetch(`http://localhost:8000/staff/patients/${id}/doctors/`, { credentials:'include' });
    const data = await res.json();
    setEditDoctors(data.doctors || []);
    setLoadingEditDoctors(false);
  };

  // ✅ NEW: Handle multiple file selection
  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files);
    setEditFiles(prev => [...prev, ...files]);
  };

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files);
    setEditImages(prev => [...prev, ...files]);
  };

  const removeNewFile = (index) => {
    setEditFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index) => {
    setEditImages(prev => prev.filter((_, i) => i !== index));
  };

  // ✅ NEW: Delete existing attachment
  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    
    setDeletingAttachment(attachmentId);
    try {
      const res = await fetch(`http://localhost:8000/staff/attachments/${attachmentId}/delete/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCSRF() },
      });
      
      const data = await res.json();
      if (data.success) {
        setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
        setEditSuccess('Attachment deleted successfully');
        setTimeout(() => setEditSuccess(''), 2000);
      } else {
        setEditError(data.error || 'Failed to delete attachment');
      }
    } catch (e) {
      setEditError('Network error. Please try again.');
    } finally {
      setDeletingAttachment(null);
    }
  };

  // ── Test Section Management ──
  const addTestSection = () => {
    // ✅ Check if completed
    if (editForm.is_completed) {
      alert('Cannot add test sections to completed reports. Please mark as pending first.');
      return;
    }
    
    setEditTestSections([...editTestSections, {
      id: Date.now(),
      test_name_choice: '',
      custom_test_name: '',
      category: '',
      status: 'Normal',
      findings: '',
      parameters: [{ id: Date.now(), name: '', value: '', unit: '', normalRange: '', status: 'Normal' }]
    }]);
  };

  const removeTestSection = (sectionId) => {
    // ✅ Check if completed
    if (editForm.is_completed) {
      alert('Cannot modify test sections of completed reports. Please mark as pending first.');
      return;
    }
    
    if (editTestSections.length > 1) {
      setEditTestSections(editTestSections.filter(s => s.id !== sectionId));
    }
  };

  const updateTestSection = (sectionId, field, value) => {
    // ✅ Check if completed
    if (editForm.is_completed) {
      alert('Cannot modify completed reports. Please mark as pending first.');
      return;
    }
    
    setEditTestSections(editTestSections.map(section =>
      section.id === sectionId ? { ...section, [field]: value } : section
    ));
  };

  // ── Parameters Management ──
  const addParameter = (sectionId) => {
    // ✅ Check if completed
    if (editForm.is_completed) {
      alert('Cannot add parameters to completed reports. Please mark as pending first.');
      return;
    }
    
    setEditTestSections(editTestSections.map(section =>
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
    // ✅ Check if completed
    if (editForm.is_completed) {
      alert('Cannot modify parameters of completed reports. Please mark as pending first.');
      return;
    }
    
    setEditTestSections(editTestSections.map(section =>
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
    // ✅ Check if completed
    if (editForm.is_completed) {
      alert('Cannot modify completed reports. Please mark as pending first.');
      return;
    }
    
    setEditTestSections(editTestSections.map(section =>
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

  const paramStatusClass = (s) => ({
    Normal:'slr-ps--normal', High:'slr-ps--high', Low:'slr-ps--low', Critical:'slr-ps--critical'
  }[s] || '');

  // ── Save Edit ──
  const handleSaveEdit = async () => {
    setEditError('');
    setSavingEdit(true);
    try {
      const fd = new FormData();
      fd.append('patient_id',     editForm.patient_id);
      fd.append('doctor_id',      editForm.doctor_id || '');
      fd.append('test_date',      editForm.test_date);
      fd.append('is_completed',   editForm.is_completed ? 'true' : 'false');
      fd.append('notes',          editForm.notes);
      fd.append('test_sections',  JSON.stringify(editTestSections));
      
      // ✅ NEW: Append multiple files
      editFiles.forEach(file => fd.append('report_files', file));
      editImages.forEach(image => fd.append('report_images', image));

      const res = await fetch(`http://localhost:8000/staff/lab-reports/${editReport.id}/edit/`, {
        method: 'POST', credentials: 'include',
        headers: { 'X-CSRFToken': getCSRF() },
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setEditSuccess(`Report ${data.report_number} updated successfully!`);
        fetchReports();
        setTimeout(() => { setEditReport(null); setEditSuccess(''); }, 1500);
      } else {
        setEditError(data.error || 'Update failed.');
      }
    } catch(e) {
      setEditError('Network error. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Badges & Boxes ──
  const resultBadge = (status) => {
    const cfg = {
      normal:   { cls:'slr-badge--normal',   icon:<MdCheckCircle />, label:'Normal'   },
      abnormal: { cls:'slr-badge--abnormal', icon:<MdWarning />,     label:'Abnormal' },
      critical: { cls:'slr-badge--critical', icon:<MdError />,       label:'Critical' },
    }[status] || { cls:'slr-badge--normal', icon:<MdCheckCircle />, label:status };
    return <span className={`slr-badge ${cfg.cls}`}>{cfg.icon}{cfg.label}</span>;
  };

  const statusBadge = (is_completed) => is_completed
    ? <span className="slr-badge slr-badge--completed"><MdCheckCircle /> Completed</span>
    : <span className="slr-badge slr-badge--pending"><MdPending /> Pending</span>;

  const resultBox = (status) => {
    const cfg = {
      normal:   { icon:<MdCheckCircle />, label:'Normal'   },
      abnormal: { icon:<MdWarning />,     label:'Abnormal' },
      critical: { icon:<MdError />,       label:'Critical' },
    }[status] || { icon:<MdCheckCircle />, label:status };
    return <div className={`slr-result-box slr-result-box--${status}`}>{cfg.icon} {cfg.label}</div>;
  };

  const statCards = [
    { label:'Total Reports', value:stats.total     ?? 0, color:'blue'   },
    { label:'Normal',        value:stats.normal    ?? 0, color:'green'  },
    { label:'Abnormal',      value:stats.abnormal  ?? 0, color:'orange' },
    { label:'Critical',      value:stats.critical  ?? 0, color:'red'    },
    { label:'Completed',     value:stats.completed ?? 0, color:'teal'   },
    { label:'Pending',       value:stats.pending   ?? 0, color:'purple' },
  ];

  return (
    <div className="slr-page">

      {/* HEADER */}
      <div className="slr-header">
        <div><h1>Lab Reports</h1><p>Manage all uploaded lab reports</p></div>
        <button className="slr-upload-btn" onClick={() => navigate('/staff/upload')}>
          <MdUpload /> Upload Report
        </button>
      </div>

      {/* STAT CARDS */}
      <div className="slr-stats-grid">
        {statCards.map((s,i) => (
          <div key={i} className={`slr-stat-card slr-stat-card--${s.color}`}>
            <span className="slr-stat-num">{s.value}</span>
            <span className="slr-stat-lbl">{s.label}</span>
          </div>
        ))}
      </div>

      {/* SEARCH + FILTER */}
      <div className="slr-toolbar">
        <div className="slr-search-wrap">
          <MdSearch className="slr-search-ico" />
          <input className="slr-search" type="text"
            placeholder="Search by patient, test name, doctor..."
            value={search} onChange={onSearch} />
          {search && <button className="slr-search-x" onClick={() => { setSearch(''); setCurrentPage(1); }}><MdClose /></button>}
        </div>
        <div className="slr-filter-row">
          {filters.map(f => (
            <button key={f}
              className={`slr-filter-btn ${activeFilter === f ? 'slr-filter-btn--on' : ''}`}
              onClick={() => onFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      {/* REPORT CARDS */}
      <div className="slr-list">
        {loading ? (
          <div className="slr-empty"><FaFlask /><p>Loading reports...</p></div>
        ) : reports.length === 0 ? (
          <div className="slr-empty"><FaFlask /><p>No reports found</p><span>Try adjusting your search or filter</span></div>
        ) : reports.map(r => {
          const isHighlighted = highlightId === r.id;
          return (
            <div key={r.id}
              ref={isHighlighted ? highlightRef : null}
              className={`slr-card ${isHighlighted ? 'slr-card--highlighted' : ''}`}>

              {/* Patient */}
              <div className="slr-card-patient">
                {r.patient_photo
                  ? <img src={r.patient_photo} alt={r.patient_name} className="slr-avatar-photo" />
                  : <div className="slr-avatar">{r.patient_initials}</div>}
                <div><h4>{r.patient_name}</h4><span>{r.patient_id}</span></div>
              </div>

              {/* Details */}
              <div className="slr-card-details">
                <div className="slr-card-row">
                  <FaFlask className="slr-ico slr-ico--purple" />
                  <span className="slr-card-key">Tests:</span>
                  <span className="slr-card-val">{getTestNamesDisplay(r.test_sections)}</span>
                </div>
                <div className="slr-card-row">
                  <FaUserMd className="slr-ico slr-ico--green" />
                  <span className="slr-card-key">Doctor:</span>
                  <span className="slr-card-val">{r.doctor}</span>
                </div>
                <div className="slr-card-row">
                  <MdScience className="slr-ico slr-ico--blue" />
                  <span className="slr-card-key">Categories:</span>
                  <span className="slr-cat">{getCategoriesDisplay(r.test_sections)}</span>
                </div>
              </div>

              {/* Right */}
              <div className="slr-card-right">
                <div className="slr-card-time"><MdCalendarToday /><span>{r.date}</span></div>
                {resultBox(r.status)}
                {statusBadge(r.is_completed)}
                <div className="slr-card-btns">
                  <button className="slr-details-btn" onClick={() => setSelectedReport(r)}><MdInfo /> Details</button>
                  <button className="slr-edit-btn"    onClick={() => openEdit(r)}><MdEdit /> Edit</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* PAGINATION */}
      {pagination.total_pages > 1 && (
        <div className="slr-pagination">
          <button className="slr-pg-btn" disabled={currentPage===1} onClick={() => onPage(currentPage-1)}>← Prev</button>
          {Array.from({ length: pagination.total_pages }, (_,i) => i+1).map(p => (
            <button key={p} className={`slr-pg-num ${currentPage===p ? 'slr-pg-num--on':''}`} onClick={() => onPage(p)}>{p}</button>
          ))}
          <button className="slr-pg-btn" disabled={currentPage===pagination.total_pages} onClick={() => onPage(currentPage+1)}>Next →</button>
        </div>
      )}
      {pagination.total_count > 0 && (
        <p className="slr-pg-info">Showing {((currentPage-1)*10)+1}–{Math.min(currentPage*10, pagination.total_count)} of {pagination.total_count} reports</p>
      )}

      {/* ── DETAIL MODAL ── */}
      {selectedReport && (
        <div className="slr-overlay" onClick={() => setSelectedReport(null)}>
          <div className="slr-modal" onClick={e => e.stopPropagation()}>
            <div className="slr-modal-head">
              <div className="slr-modal-title">
                <div className="slr-modal-ico"><FaFlask /></div>
                <div>
                  <h2>{getTestNamesDisplay(selectedReport.test_sections)}</h2>
                  <code>{selectedReport.report_number}</code>
                </div>
              </div>
              <button className="slr-modal-x" onClick={() => setSelectedReport(null)}><MdClose /></button>
            </div>
            <div className="slr-modal-body">
              <div className="slr-modal-grid">
                <div className="slr-mi slr-mi--blue">
                  <div className="slr-mi-ico">
                    {selectedReport.patient_photo
                      ? <img src={selectedReport.patient_photo} alt={selectedReport.patient_name} className="slr-mi-photo" />
                      : <MdPerson />}
                  </div>
                  <div><p>Patient</p><h4>{selectedReport.patient_name}</h4><span>{selectedReport.age}y • {selectedReport.gender} • {selectedReport.patient_id}</span></div>
                </div>
                <div className="slr-mi slr-mi--green">
                  <div className="slr-mi-ico"><FaUserMd /></div>
                  <div><p>Doctor</p><h4>{selectedReport.doctor}</h4><span>{selectedReport.doctor_specialty}</span></div>
                </div>
                <div className="slr-mi slr-mi--purple">
                  <div className="slr-mi-ico"><MdCalendarToday /></div>
                  <div><p>Test Date</p><h4>{selectedReport.date}</h4></div>
                </div>
                <div className="slr-mi slr-mi--orange">
                  <div className="slr-mi-ico"><MdScience /></div>
                  <div><p>Overall Status</p>
                    <div className="slr-mi-badges">
                      {resultBadge(selectedReport.status)}
                      {statusBadge(selectedReport.is_completed)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Sections */}
              {selectedReport.test_sections && selectedReport.test_sections.length > 0 && (
                <div className="slr-modal-sec">
                  <h3><FaFlask /> Test Sections</h3>
                  {selectedReport.test_sections.map((section, idx) => (
                    <div key={idx} style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                        {section.test_name} • {section.category} • {resultBadge(section.status)}
                      </h4>
                      {section.findings && <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>{section.findings}</p>}
                      
                      {section.parameters && section.parameters.length > 0 && (
                        <div className="slr-tbl-wrap">
                          <table className="slr-tbl">
                            <thead><tr><th>Parameter</th><th>Value</th><th>Unit</th><th>Normal Range</th><th>Status</th></tr></thead>
                            <tbody>
                              {section.parameters.map((p,i) => (
                                <tr key={i}>
                                  <td className="slr-pm-name">{p.name}</td>
                                  <td className="slr-pm-val">{p.value}</td>
                                  <td className="slr-pm-unit">{p.unit}</td>
                                  <td className="slr-pm-range">{p.normalRange}</td>
                                  <td><span className={`slr-pm-badge ${paramStatusClass(p.status)}`}>{p.status}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedReport.notes && <div className="slr-notes"><h3>📝 Notes</h3><p>{selectedReport.notes}</p></div>}
              
              {/* ✅ NEW: Show all attachments */}
              {selectedReport.attachments && selectedReport.attachments.length > 0 && (
                <div className="slr-attachments">
                  <h3><MdAttachFile /> Attachments</h3>
                  <div className="slr-attachments-grid">
                    {selectedReport.attachments.map((att, idx) => (
                      <a key={idx} href={att.url} target="_blank" rel="noreferrer" 
                        className={`slr-attachment-btn ${att.type === 'image' ? 'slr-attachment-btn--img' : ''}`}>
                        {att.type === 'document' ? <MdAttachFile /> : <MdImage />}
                        <span>{att.filename || `${att.type} ${idx + 1}`}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="slr-modal-actions">
                <button className="slr-modal-cancel" onClick={() => setSelectedReport(null)}><MdClose /> Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editReport && (
        <div className="slr-overlay" onClick={() => setEditReport(null)}>
          <div className="slr-modal slr-modal--edit" onClick={e => e.stopPropagation()}>
            <div className="slr-modal-head">
              <div className="slr-modal-title">
                <div className="slr-modal-ico slr-modal-ico--edit"><MdEdit /></div>
                <div><h2>Edit Report</h2><code>{editReport.report_number}</code></div>
              </div>
              <button className="slr-modal-x" onClick={() => setEditReport(null)}><MdClose /></button>
            </div>

            <div className="slr-modal-body">
              {editError   && <div className="slr-edit-error"><MdClose /> {editError}</div>}
              {editSuccess && <div className="slr-edit-success"><MdCheckCircle /> {editSuccess}</div>}

              {/* ✅ Warning for completed reports */}
              {editForm.is_completed && (
                <div style={{ padding: '12px 16px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <MdWarning size={20} style={{ color: '#f59e0b' }} />
                  <span style={{ fontSize: '13px', color: '#92400e' }}>This report is marked as completed. Mark it as pending to make changes.</span>
                </div>
              )}

              {/* Patient & Doctor */}
              <div className="slr-edit-section">
                <h3><MdPerson /> Patient & Doctor</h3>
                <div className="slr-edit-grid-2">
                  <div className="slr-edit-field">
                    <label>Patient <span className="slr-req">*</span></label>
                    <select value={editForm.patient_id || ''} onChange={onEditPatientChange} disabled={editForm.is_completed}>
                      <option value="">Select patient...</option>
                      {editPatients.map(p => (
                        <option key={p.id} value={p.id}>{p.name} • {p.patient_id}</option>
                      ))}
                    </select>
                  </div>
                  <div className="slr-edit-field">
                    <label>Doctor</label>
                    <select
                      value={editForm.doctor_id || ''}
                      onChange={e => setEditForm(f => ({ ...f, doctor_id: e.target.value }))}
                      disabled={loadingEditDoctors || !editForm.patient_id || editForm.is_completed}
                    >
                      <option value="">{loadingEditDoctors ? 'Loading...' : 'Select doctor...'}</option>
                      {editDoctors.map(d => (
                        <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Test Date */}
              <div className="slr-edit-section">
                <h3><FaFlask /> Test Information</h3>
                <div className="slr-edit-grid-2">
                  <div className="slr-edit-field">
                    <label>Test Date <span className="slr-req">*</span></label>
                    <input type="date" value={editForm.test_date || ''}
                      onChange={e => setEditForm(f => ({ ...f, test_date: e.target.value }))} 
                      disabled={editForm.is_completed} />
                  </div>
                  <div className="slr-edit-field">
                    <label>Completion Status</label>
                    <button
                      type="button"
                      className={`slr-complete-btn ${editForm.is_completed ? 'slr-complete-btn--done' : 'slr-complete-btn--pending'}`}
                      onClick={() => setEditForm(f => ({ ...f, is_completed: !f.is_completed }))}
                    >
                      {editForm.is_completed ? <><MdCheckCircle /> Completed</> : <><MdPending /> Pending</>}
                    </button>
                  </div>
                </div>
              </div>

              {/* Test Sections */}
              {editTestSections.map((section, sectionIndex) => (
                <div key={section.id} className="slr-edit-section">
                  <div className="slr-edit-sec-head">
                    <h3><FaNotesMedical /> Test Section {sectionIndex + 1}</h3>
                    {editTestSections.length > 1 && (
                      <button type="button" className="slr-del-param" onClick={() => removeTestSection(section.id)} 
                        style={{ width: 'auto', padding: '6px 12px' }} disabled={editForm.is_completed}>
                        Remove Section
                      </button>
                    )}
                  </div>

                  <div className="slr-edit-grid-3">
                    <div className="slr-edit-field">
                      <label>Test Name <span className="slr-req">*</span></label>
                      <select value={section.test_name_choice} onChange={e => updateTestSection(section.id, 'test_name_choice', e.target.value)} disabled={editForm.is_completed}>
                        <option value="">Select test...</option>
                        {TEST_NAMES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    {section.test_name_choice === 'Other' && (
                      <div className="slr-edit-field">
                        <label>Custom Test Name <span className="slr-req">*</span></label>
                        <input type="text" value={section.custom_test_name} onChange={e => updateTestSection(section.id, 'custom_test_name', e.target.value)} 
                          placeholder="Enter custom test name" disabled={editForm.is_completed} />
                      </div>
                    )}

                    <div className="slr-edit-field">
                      <label>Category <span className="slr-req">*</span></label>
                      <select value={section.category} onChange={e => updateTestSection(section.id, 'category', e.target.value)} disabled={editForm.is_completed}>
                        <option value="">Select category...</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="slr-edit-field">
                      <label>Test Result <span className="slr-req">*</span></label>
                      <select value={section.status} onChange={e => updateTestSection(section.id, 'status', e.target.value)} 
                        className={`slr-result-sel slr-result-sel--${section.status.toLowerCase()}`} disabled={editForm.is_completed}>
                        <option value="Normal">✅ Normal</option>
                        <option value="Abnormal">⚠️ Abnormal</option>
                        <option value="Critical">🚨 Critical</option>
                      </select>
                    </div>
                  </div>

                  {/* Parameters for this section */}
                  <div style={{ marginTop: '16px' }}>
                    <div className="slr-edit-sec-head">
                      <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#374151' }}>Parameters</h4>
                      <button type="button" className="slr-add-param" onClick={() => addParameter(section.id)} disabled={editForm.is_completed}>
                        <MdAdd /> Add Parameter
                      </button>
                    </div>

                    <div className="slr-params-head">
                      <span>Name</span><span>Value</span><span>Unit</span><span>Range</span><span>Status</span><span></span>
                    </div>

                    {section.parameters.map(p => (
                      <div key={p.id} className="slr-param-row">
                        <input type="text" value={p.name} onChange={e => updateParameter(section.id, p.id, 'name', e.target.value)} 
                          placeholder="Hemoglobin" disabled={editForm.is_completed} />
                        <input type="text" value={p.value} onChange={e => updateParameter(section.id, p.id, 'value', e.target.value)} 
                          placeholder="14.5" disabled={editForm.is_completed} />
                        <input type="text" value={p.unit} onChange={e => updateParameter(section.id, p.id, 'unit', e.target.value)} 
                          placeholder="g/dL" disabled={editForm.is_completed} />
                        <input type="text" value={p.normalRange} onChange={e => updateParameter(section.id, p.id, 'normalRange', e.target.value)} 
                          placeholder="12–16" disabled={editForm.is_completed} />
                        <select value={p.status} onChange={e => updateParameter(section.id, p.id, 'status', e.target.value)} 
                          className={`slr-param-sel ${paramStatusClass(p.status)}`} disabled={editForm.is_completed}>
                          <option value="Normal">Normal</option>
                          <option value="High">High</option>
                          <option value="Low">Low</option>
                          <option value="Critical">Critical</option>
                        </select>
                        <button type="button" className="slr-del-param" onClick={() => removeParameter(section.id, p.id)} 
                          disabled={section.parameters.length === 1 || editForm.is_completed}><MdDelete /></button>
                      </div>
                    ))}
                  </div>

                  {/* Findings */}
                  <div className="slr-edit-field" style={{ marginTop: '12px' }}>
                    <label>Findings</label>
                    <textarea rows={3} value={section.findings} onChange={e => updateTestSection(section.id, 'findings', e.target.value)} 
                      placeholder="Enter findings for this test..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontFamily: 'inherit' }} 
                      disabled={editForm.is_completed} />
                  </div>
                </div>
              ))}

              {/* Add Test Section Button */}
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <button type="button" className="slr-add-param" onClick={addTestSection} style={{ padding: '10px 20px' }} disabled={editForm.is_completed}>
                  <MdAdd /> Add Another Test Section
                </button>
              </div>

              {/* ✅ NEW: File & Image Upload with multiple support */}
              <div className="slr-edit-section">
                <h3><MdAttachFile /> Files & Images</h3>
                
                {/* Existing Attachments */}
                {existingAttachments.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>Existing Attachments:</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                      {existingAttachments.map(att => (
                        <div key={att.id} style={{ position: 'relative', padding: '12px', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {att.type === 'document' ? <MdAttachFile size={20} style={{ color: '#6366f1' }} /> : <MdImage size={20} style={{ color: '#8b5cf6' }} />}
                          <a href={att.url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: '12px', color: '#374151', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {att.filename || `${att.type} file`}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att.id)}
                            disabled={deletingAttachment === att.id || editForm.is_completed}
                            style={{ padding: '4px', background: 'transparent', border: 'none', cursor: editForm.is_completed ? 'not-allowed' : 'pointer', opacity: editForm.is_completed ? 0.5 : 1 }}
                          >
                            <MdClose size={16} style={{ color: '#ef4444' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New File Uploads */}
                <div className="slr-edit-grid-2">
                  <div className="slr-edit-field">
                    <label>Add Documents (PDF / DOC)</label>
                    {editFiles.length > 0 && (
                      <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {editFiles.map((file, idx) => (
                          <div key={idx} className="slr-file-preview">
                            <MdAttachFile className="slr-file-preview-icon" />
                            <span className="slr-file-preview-name">{file.name}</span>
                            <button type="button" className="slr-file-remove-btn" onClick={() => removeNewFile(idx)}><MdClose /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className={`slr-file-zone ${editForm.is_completed ? 'slr-file-zone--disabled' : ''}`}>
                      <input type="file" accept=".pdf,.doc,.docx" multiple hidden onChange={handleFilesChange} disabled={editForm.is_completed} />
                      <MdAttachFile /><span>{editForm.is_completed ? 'Cannot add files to completed report' : 'Click to upload PDF / DOC (multiple)'}</span>
                    </label>
                  </div>

                  <div className="slr-edit-field">
                    <label>Add Images (JPG / PNG)</label>
                    {editImages.length > 0 && (
                      <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {editImages.map((image, idx) => (
                          <div key={idx} className="slr-file-preview">
                            <MdImage className="slr-file-preview-icon slr-file-preview-icon--img" />
                            <span className="slr-file-preview-name">{image.name}</span>
                            <button type="button" className="slr-file-remove-btn" onClick={() => removeNewImage(idx)}><MdClose /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className={`slr-file-zone slr-file-zone--image ${editForm.is_completed ? 'slr-file-zone--disabled' : ''}`}>
                      <input type="file" accept="image/*" multiple hidden onChange={handleImagesChange} disabled={editForm.is_completed} />
                      <MdImage /><span>{editForm.is_completed ? 'Cannot add images to completed report' : 'Click to upload images (multiple)'}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="slr-edit-section slr-edit-section--last">
                <h3><MdNotes /> Additional Notes</h3>
                <div className="slr-edit-field slr-edit-field--full">
                  <textarea rows={6} value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} 
                    placeholder="Enter any additional observations, remarks, or clinical notes about this lab report..." 
                    className="slr-notes-textarea" disabled={editForm.is_completed} />
                </div>
              </div>

              {/* Actions */}
              <div className="slr-modal-actions">
                <button className="slr-modal-cancel" onClick={() => setEditReport(null)} disabled={savingEdit}><MdClose /> Cancel</button>
                <button className="slr-modal-save"   onClick={handleSaveEdit}            disabled={savingEdit}>
                  <MdSave /> {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffLabReports;