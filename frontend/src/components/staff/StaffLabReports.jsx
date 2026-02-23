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

const CATEGORIES = ['Hematology','Biochemistry','Endocrinology','Microbiology','Radiology','Immunology','Pathology'];

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
  const [editParams, setEditParams]             = useState([]);
  const [editFile, setEditFile]                 = useState(null);
  const [editImage, setEditImage]               = useState(null);
  const [loadingEditDoctors, setLoadingEditDoctors] = useState(false);

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

  // ── Open Edit Modal ──
  const openEdit = async (r) => {
    setEditError('');
    setEditSuccess('');
    setEditFile(null);
    setEditImage(null);
    setEditForm({
      patient_id:     r.patient_db_id,
      doctor_id:      r.doctor_db_id || '',
      test_name:      r.test_name,
      test_date:      r.test_date_raw,
      category:       r.category_raw,
      overall_status: r.status,
      is_completed:   r.is_completed,
      notes:          r.notes || '',
    });
    setEditParams(r.parameters.map((p, i) => ({ ...p, id: i })));
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

  // ── Edit Parameters ──
  const addEditParam = () => {
    setEditParams(p => [...p, { id: Date.now(), name:'', value:'', unit:'', normalRange:'', status:'Normal' }]);
  };
  const removeEditParam = (id) => {
    if (editParams.length > 1) setEditParams(p => p.filter(x => x.id !== id));
  };
  const updateEditParam = (id, field, val) => {
    setEditParams(p => p.map(x => x.id === id ? { ...x, [field]: val } : x));
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
      fd.append('test_name',      editForm.test_name);
      fd.append('test_date',      editForm.test_date);
      fd.append('category',       editForm.category);
      fd.append('overall_status', editForm.overall_status);
      fd.append('is_completed',   editForm.is_completed ? 'true' : 'false');
      fd.append('notes',          editForm.notes);
      fd.append('parameters',     JSON.stringify(editParams));
      if (editFile)  fd.append('report_file',  editFile);
      if (editImage) fd.append('report_image', editImage);

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
                <div className="slr-card-row"><FaFlask className="slr-ico slr-ico--purple" /><span className="slr-card-key">Test:</span><span className="slr-card-val">{r.test_name}</span></div>
                <div className="slr-card-row"><FaUserMd className="slr-ico slr-ico--green" /><span className="slr-card-key">Doctor:</span><span className="slr-card-val">{r.doctor}</span></div>
                <div className="slr-card-row"><MdScience className="slr-ico slr-ico--blue" /><span className="slr-card-key">Category:</span><span className="slr-cat">{r.category}</span></div>
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
                <div><h2>{selectedReport.test_name}</h2><code>{selectedReport.report_number}</code></div>
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
                  <div><p>Date & Category</p><h4>{selectedReport.date}</h4><span>{selectedReport.category}</span></div>
                </div>
                <div className="slr-mi slr-mi--orange">
                  <div className="slr-mi-ico"><MdScience /></div>
                  <div><p>Result & Status</p>
                    <div className="slr-mi-badges">
                      {resultBadge(selectedReport.status)}
                      {statusBadge(selectedReport.is_completed)}
                    </div>
                  </div>
                </div>
              </div>
              {selectedReport.parameters.length > 0 && (
                <div className="slr-modal-sec">
                  <h3><FaFlask /> Test Parameters</h3>
                  <div className="slr-tbl-wrap">
                    <table className="slr-tbl">
                      <thead><tr><th>Parameter</th><th>Value</th><th>Unit</th><th>Normal Range</th><th>Status</th></tr></thead>
                      <tbody>
                        {selectedReport.parameters.map((p,i) => (
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
                </div>
              )}
              {selectedReport.notes && <div className="slr-notes"><h3>📝 Notes</h3><p>{selectedReport.notes}</p></div>}
              
              {/* Attachments */}
              {(selectedReport.file_url || selectedReport.image_url) && (
                <div className="slr-attachments">
                  <h3><MdAttachFile /> Attachments</h3>
                  <div className="slr-attachments-grid">
                    {selectedReport.file_url && (
                      <a
                        href={selectedReport.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="slr-attachment-btn"
                      >
                        <MdAttachFile />
                        <span>Document-1</span>
                      </a>
                    )}
                    {selectedReport.image_url && (
                      <a
                        href={selectedReport.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="slr-attachment-btn slr-attachment-btn--img"
                      >
                        <MdImage />
                        <span>Image-1</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="slr-modal-actions">
                <button className="slr-modal-cancel" onClick={() => setSelectedReport(null)}><MdClose /> Close</button>
                {selectedReport.file_url && (
                  <a href={selectedReport.file_url} target="_blank" rel="noreferrer" className="slr-modal-download">
                    <MdDownload /> Download Report
                  </a>
                )}
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

              {/* Patient & Doctor */}
              <div className="slr-edit-section">
                <h3><MdPerson /> Patient & Doctor</h3>
                <div className="slr-edit-grid-2">
                  <div className="slr-edit-field">
                    <label>Patient <span className="slr-req">*</span></label>
                    <select value={editForm.patient_id || ''} onChange={onEditPatientChange}>
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
                      disabled={loadingEditDoctors || !editForm.patient_id}
                    >
                      <option value="">{loadingEditDoctors ? 'Loading...' : 'Select doctor...'}</option>
                      {editDoctors.map(d => (
                        <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Test Info */}
              <div className="slr-edit-section">
                <h3><FaFlask /> Test Information</h3>
                <div className="slr-edit-grid-3">
                  <div className="slr-edit-field">
                    <label>Test Name <span className="slr-req">*</span></label>
                    <input type="text" value={editForm.test_name || ''}
                      onChange={e => setEditForm(f => ({ ...f, test_name: e.target.value }))} />
                  </div>
                  <div className="slr-edit-field">
                    <label>Test Date <span className="slr-req">*</span></label>
                    <input type="date" value={editForm.test_date || ''}
                      onChange={e => setEditForm(f => ({ ...f, test_date: e.target.value }))} />
                  </div>
                  <div className="slr-edit-field">
                    <label>Category <span className="slr-req">*</span></label>
                    <select value={editForm.category || ''}
                      onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                      <option value="">Select...</option>
                      {CATEGORIES.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="slr-edit-section">
                <h3><MdScience /> Report Status</h3>
                <div className="slr-edit-grid-2">
                  <div className="slr-edit-field">
                    <label>Overall Result</label>
                    <select
                      value={editForm.overall_status || 'normal'}
                      onChange={e => setEditForm(f => ({ ...f, overall_status: e.target.value }))}
                      className={`slr-result-sel slr-result-sel--${editForm.overall_status}`}
                    >
                      <option value="normal">✅ Normal</option>
                      <option value="abnormal">⚠️ Abnormal</option>
                      <option value="critical">🚨 Critical</option>
                    </select>
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

              {/* Parameters */}
              <div className="slr-edit-section">
                <div className="slr-edit-sec-head">
                  <h3><FaNotesMedical /> Test Parameters</h3>
                  <button type="button" className="slr-add-param" onClick={addEditParam}><MdAdd /> Add</button>
                </div>
                <div className="slr-params-head">
                  <span>Name</span><span>Value</span><span>Unit</span><span>Range</span><span>Status</span><span></span>
                </div>
                {editParams.map(p => (
                  <div key={p.id} className="slr-param-row">
                    <input type="text" value={p.name}        onChange={e => updateEditParam(p.id,'name',e.target.value)}        placeholder="Hemoglobin" />
                    <input type="text" value={p.value}       onChange={e => updateEditParam(p.id,'value',e.target.value)}       placeholder="14.5" />
                    <input type="text" value={p.unit}        onChange={e => updateEditParam(p.id,'unit',e.target.value)}        placeholder="g/dL" />
                    <input type="text" value={p.normalRange} onChange={e => updateEditParam(p.id,'normalRange',e.target.value)} placeholder="12–16" />
                    <select value={p.status} onChange={e => updateEditParam(p.id,'status',e.target.value)}
                      className={`slr-param-sel ${paramStatusClass(p.status)}`}>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Low">Low</option>
                      <option value="Critical">Critical</option>
                    </select>
                    <button type="button" className="slr-del-param" onClick={() => removeEditParam(p.id)} disabled={editParams.length===1}><MdDelete /></button>
                  </div>
                ))}
              </div>

              {/* File + Image Upload */}
              <div className="slr-edit-section">
                <h3><MdAttachFile /> Files & Images</h3>
                <div className="slr-edit-grid-2">

                  {/* PDF / DOC */}
                  <div className="slr-edit-field">
                    <label>Report File (PDF / DOC)</label>
                    {editReport.file_url && !editFile && (
                      <p className="slr-existing-file">
                        Current: <a href={editReport.file_url} target="_blank" rel="noreferrer">Download existing</a>
                      </p>
                    )}
                    {editFile ? (
                      <div className="slr-file-preview">
                        <MdAttachFile className="slr-file-preview-icon" />
                        <span className="slr-file-preview-name">{editFile.name}</span>
                        <button type="button" className="slr-file-remove-btn" onClick={() => setEditFile(null)}>
                          <MdClose />
                        </button>
                      </div>
                    ) : (
                      <label className="slr-file-zone">
                        <input type="file" accept=".pdf,.doc,.docx" hidden
                          onChange={e => setEditFile(e.target.files[0])} />
                        <MdAttachFile />
                        <span>Click to upload PDF / DOC</span>
                      </label>
                    )}
                  </div>

                  {/* Image */}
                  <div className="slr-edit-field">
                    <label>Report Image (JPG / PNG)</label>
                    {editReport.image_url && !editImage && (
                      <p className="slr-existing-file">
                        Current: <a href={editReport.image_url} target="_blank" rel="noreferrer">View existing</a>
                      </p>
                    )}
                    {editImage ? (
                      <div className="slr-file-preview">
                        <MdImage className="slr-file-preview-icon slr-file-preview-icon--img" />
                        <span className="slr-file-preview-name">{editImage.name}</span>
                        <button type="button" className="slr-file-remove-btn" onClick={() => setEditImage(null)}>
                          <MdClose />
                        </button>
                      </div>
                    ) : (
                      <label className="slr-file-zone slr-file-zone--image">
                        <input type="file" accept="image/*" hidden
                          onChange={e => setEditImage(e.target.files[0])} />
                        <MdImage />
                        <span>Click to upload image</span>
                      </label>
                    )}
                  </div>

                </div>
              </div>
              <div className="slr-edit-section slr-edit-section--last">
                <h3><MdNotes /> Additional Notes</h3>
                <div className="slr-edit-field slr-edit-field--full">
                  <textarea
                    rows={6}
                    value={editForm.notes || ''}
                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Enter any additional observations, remarks, or clinical notes about this lab report..."
                    className="slr-notes-textarea"
                  />
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