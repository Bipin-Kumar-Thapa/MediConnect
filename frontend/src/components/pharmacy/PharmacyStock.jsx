import React, { useState, useEffect } from 'react';
import {
  MdSearch,
  MdClose,
  MdEdit,
  MdDelete,
  MdVisibility,
  MdScience,
  MdAdd,
  MdChevronLeft,
  MdChevronRight
} from 'react-icons/md';
import '../../styles/pharmacy/PharmacyStock.css';

const PharmacyStock = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState(''); // ✅ Separate input state
  const [activeFilter, setActiveFilter] = useState('Low Stock');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [loading, setLoading] = useState(true);

  const [medicines, setMedicines] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    in_stock: 0,
    low_stock: 0,
    out_of_stock: 0,
    expired: 0
  });
  const [pagination, setPagination] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    dosage: '', // ✅ NEW FIELD
    generic_name: '',
    category: 'other',
    manufacturer: '',
    quantity: '',
    unit_type: 'tablet',
    price: '',
    reorder_level: '50',
    expiryDate: '',
    description: '',
    side_effects: '',
    storage_instructions: ''
  });

  useEffect(() => {
    fetchMedicines();
  }, [activeFilter, searchQuery, currentPage]);

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const filterMap = {
        'All': 'all',
        'In Stock': 'in_stock',
        'Low Stock': 'low_stock',
        'Out of Stock': 'out_of_stock',
        'Expired': 'expired'
      };

      const params = new URLSearchParams({
        status: filterMap[activeFilter],
        search: searchQuery,
        page: currentPage
      });

      const response = await fetch(
        `http://localhost:8000/pharmacy/stock/?${params}`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setMedicines(data.medicines || []);
        setStats(data.stats || {
          total: 0,
          in_stock: 0,
          low_stock: 0,
          out_of_stock: 0,
          expired: 0
        });
        setPagination(data.pagination || {});
      }
    } catch (error) {
      console.error('Error fetching medicines:', error);
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'critical': return 'pms-badge--critical';
      case 'low': return 'pms-badge--low';
      case 'good': return 'pms-badge--good';
      case 'out_of_stock': return 'pms-badge--out';
      case 'expired': return 'pms-badge--expired';
      default: return 'pms-badge--good';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'critical': return '⚠️';
      case 'low': return '⚡';
      case 'good': return '✓';
      case 'out_of_stock': return '✕';
      case 'expired': return '⏰';
      default: return '✓';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'critical': return 'Critical';
      case 'low': return 'Low';
      case 'good': return 'Good';
      case 'out_of_stock': return 'Out';
      case 'expired': return 'Expired';
      default: return 'Good';
    }
  };

  const getCardStatusClass = (status) => {
    switch(status) {
      case 'critical': return 'pms-card--critical';
      case 'low': return 'pms-card--low';
      case 'good': return 'pms-card--good';
      case 'out_of_stock': return 'pms-card--out';
      case 'expired': return 'pms-card--expired';
      default: return 'pms-card--good';
    }
  };

  const getStockNumberClass = (status) => {
    switch(status) {
      case 'critical': return 'pms-stock-critical';
      case 'low': return 'pms-stock-low';
      case 'good': return 'pms-stock-good';
      case 'out_of_stock': return 'pms-stock-out';
      case 'expired': return 'pms-stock-expired';
      default: return 'pms-stock-good';
    }
  };

  const handleAddMedicine = () => {
    setFormData({
      name: '',
      dosage: '', // ✅ RESET
      generic_name: '',
      category: 'other',
      manufacturer: '',
      quantity: '',
      unit_type: 'tablet',
      price: '',
      reorder_level: '50',
      expiryDate: '',
      description: '',
      side_effects: '',
      storage_instructions: ''
    });
    setShowAddModal(true);
  };

  const handleEditMedicine = async (medicine) => {
    try {
      const response = await fetch(
        `http://localhost:8000/pharmacy/stock/${medicine.id}/`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedMedicine(data);
        setFormData({
          name: data.name,
          dosage: data.dosage || '', // ✅ NEW
          generic_name: data.generic_name,
          category: data.category_value,
          manufacturer: data.manufacturer,
          quantity: data.quantity.toString(),
          unit_type: data.unit_type,
          price: data.price.toString(),
          reorder_level: data.reorder_level.toString(),
          expiryDate: data.expiry_date_full,
          description: data.description,
          side_effects: data.side_effects,
          storage_instructions: data.storage_instructions
        });
        setShowEditModal(true);
      }
    } catch (error) {
      console.error('Error fetching medicine details:', error);
      alert('Failed to load medicine details');
    }
  };

  const handleViewMedicine = async (medicine) => {
    try {
      const response = await fetch(
        `http://localhost:8000/pharmacy/stock/${medicine.id}/`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedMedicine(data);
        setShowViewModal(true);
      }
    } catch (error) {
      console.error('Error fetching medicine details:', error);
      alert('Failed to load medicine details');
    }
  };

  const handleDeleteMedicine = async (medicine) => {
    if (!window.confirm(`Are you sure you want to delete ${medicine.name}?`)) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/pharmacy/stock/${medicine.id}/delete/`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
          }
        }
      );

      if (response.ok) {
        alert(`${medicine.name} deleted successfully!`);
        fetchMedicines();
      } else {
        const errorData = await response.json();
        alert(`Failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting medicine:', error);
      alert('Error deleting medicine');
    }
  };

  const handleFormChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

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

  const handleSubmitAdd = async () => {
    if (!formData.name || !formData.quantity || !formData.price) {
      alert('Please fill in all required fields (Name, Quantity, Price)');
      return;
    }

    try {
      const response = await fetch(
        'http://localhost:8000/pharmacy/stock/create/',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
          },
          body: JSON.stringify(formData)
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setShowAddModal(false);
        fetchMedicines();
      } else {
        const errorData = await response.json();
        alert(`Failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding medicine:', error);
      alert('Error adding medicine');
    }
  };

  const handleSubmitEdit = async () => {
    if (!formData.name || !formData.quantity || !formData.price) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/pharmacy/stock/${selectedMedicine.id}/update/`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
          },
          body: JSON.stringify(formData)
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setShowEditModal(false);
        fetchMedicines();
      } else {
        const errorData = await response.json();
        alert(`Failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating medicine:', error);
      alert('Error updating medicine');
    }
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowViewModal(false);
    setSelectedMedicine(null);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && !medicines.length) {
    return (
      <div className="pharmacy-stock-wrapper">
        <div className="pms-page">
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pharmacy-stock-wrapper">
      <div className="pms-page">

        {/* Header */}
        <div className="pms-header">
          <div>
            <h1>Medicine Stock</h1>
            <p>Manage your pharmacy inventory and stock levels</p>
          </div>
          <button className="pms-btn-add" onClick={handleAddMedicine}>
            <MdAdd />
            <span>Add New Medicine</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="pms-stats-grid">
          <div className="pms-stat-card pms-stat-card--blue">
            <div className="pms-stat-num">{stats.total}</div>
            <div className="pms-stat-label">Total</div>
          </div>
          <div className="pms-stat-card pms-stat-card--green">
            <div className="pms-stat-num">{stats.in_stock}</div>
            <div className="pms-stat-label">In Stock</div>
          </div>
          <div className="pms-stat-card pms-stat-card--orange">
            <div className="pms-stat-num">{stats.low_stock}</div>
            <div className="pms-stat-label">Low Stock</div>
          </div>
          <div className="pms-stat-card pms-stat-card--red">
            <div className="pms-stat-num">{stats.out_of_stock}</div>
            <div className="pms-stat-label">Out of Stock</div>
          </div>
          <div className="pms-stat-card pms-stat-card--purple">
            <div className="pms-stat-num">{stats.expired}</div>
            <div className="pms-stat-label">Expired</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="pms-toolbar">
          <div className="pms-search-wrap">
            <MdSearch className="pms-search-icon" />
            <input
              type="text"
              className="pms-search-input"
              placeholder="Search by medicine name, generic name, or manufacturer..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="pms-filter-row">
            {['All', 'In Stock', 'Low Stock', 'Out of Stock', 'Expired'].map(filter => (
              <button
                key={filter}
                className={`pms-filter-btn ${activeFilter === filter ? 'pms-filter-btn--active' : ''}`}
                onClick={() => { setActiveFilter(filter); setCurrentPage(1); }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Results Info */}
        {medicines.length > 0 && (
          <div className="pms-results-info">
            Showing 1-{medicines.length} of {pagination.total_count || medicines.length} medicines
          </div>
        )}

        {/* Medicines Grid */}
        <div className="pms-medicines-grid">
          {medicines.length === 0 ? (
            <div className="pms-no-medicines">
              <MdScience size={64} />
              <h3>No medicines found</h3>
              <p>
                {activeFilter !== 'All' || searchQuery
                  ? 'Try adjusting your filters or search query'
                  : 'Start by adding medicines to your inventory'
                }
              </p>
              {activeFilter === 'All' && !searchQuery && (
                <button className="pms-btn-add" onClick={handleAddMedicine} style={{marginTop: '16px'}}>
                  <MdAdd />
                  <span>Add Your First Medicine</span>
                </button>
              )}
            </div>
          ) : (
            medicines.filter(medicine => medicine && medicine.id).map((medicine) => (
              <div key={medicine.id} className={`pms-medicine-card ${getCardStatusClass(medicine.status)}`}>
                <div className="pms-card-header">
                  <div>
                    <div className="pms-medicine-name">
                      {medicine.name}
                      {medicine.dosage && <span style={{fontWeight: 400, marginLeft: '8px'}}>({medicine.dosage})</span>}
                    </div>
                    <div className="pms-medicine-meta">
                      {medicine.unit} • Expires: {medicine.expiry_date}
                    </div>
                  </div>
                  <span className={`pms-stock-badge ${getStatusBadgeClass(medicine.status)}`}>
                    {getStatusIcon(medicine.status)} {getStatusText(medicine.status)}
                  </span>
                </div>

                <div className="pms-card-body">
                  <div className={`pms-stock-number ${getStockNumberClass(medicine.status)}`}>
                    {medicine.quantity} {medicine.unit}s
                  </div>

                  <div className="pms-info-grid">
                    <div className="pms-info-row">
                      <div style={{ flex: 1 }}>
                        <span className="pms-info-label">Unit Type</span>
                        <span className="pms-info-value">{medicine.unit}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <span className="pms-info-label">Price per Unit</span>
                        <span className="pms-info-value">NPR {medicine.price}</span>
                      </div>
                    </div>
                    <div className="pms-info-row">
                      <div style={{ flex: 1 }}>
                        <span className="pms-info-label">Manufacturer</span>
                        <span className="pms-info-value">{medicine.manufacturer}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <span className="pms-info-label">Status</span>
                        <span className={`pms-info-value ${getStockNumberClass(medicine.status)}`}>
                          {getStatusText(medicine.status)} Stock
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pms-card-actions">
                  <button className="pms-btn-action pms-btn-view" onClick={() => handleViewMedicine(medicine)}>
                    <MdVisibility />
                    <span>View</span>
                  </button>
                  <button className="pms-btn-action pms-btn-edit" onClick={() => handleEditMedicine(medicine)}>
                    <MdEdit />
                    <span>Edit</span>
                  </button>
                  <button className="pms-btn-action pms-btn-delete" onClick={() => handleDeleteMedicine(medicine)}>
                    <MdDelete />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="pms-pagination">
            <button 
              className="pms-page-btn" 
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <MdChevronLeft /> Prev
            </button>
            
            {[...Array(pagination.total_pages)].map((_, i) => (
              <div 
                key={i + 1}
                className={`pms-page-num ${currentPage === i + 1 ? 'pms-page-num--active' : ''}`}
                onClick={() => handlePageChange(i + 1)}
                style={{ cursor: 'pointer' }}
              >
                {i + 1}
              </div>
            ))}
            
            <button 
              className="pms-page-btn"
              disabled={currentPage === pagination.total_pages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next <MdChevronRight />
            </button>
          </div>
        )}

      </div>

      {/* Add Medicine Modal */}
      {showAddModal && (
        <div className="pms-modal-overlay" onClick={closeModals}>
          <div className="pms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pms-modal-header pms-modal-header--green">
              <div className="pms-modal-title">
                <div className="pms-modal-icon pms-modal-icon--green">
                  <MdAdd />
                </div>
                <span>Add New Medicine</span>
              </div>
              <button className="pms-modal-close" onClick={closeModals}>
                <MdClose />
              </button>
            </div>
            <div className="pms-modal-body">
              <div className="pms-form-grid">
                <div className="pms-form-field">
                  <label className="pms-form-label">Medicine Name <span className="pms-required">*</span></label>
                  <input
                    type="text"
                    className="pms-form-input"
                    placeholder="e.g., Paracetamol"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                  />
                </div>
                <div className="pms-form-field">
                  <label className="pms-form-label">Dosage</label>
                  <input
                    type="text"
                    className="pms-form-input"
                    placeholder="e.g., 500mg"
                    value={formData.dosage}
                    onChange={(e) => handleFormChange('dosage', e.target.value)}
                  />
                </div>
                <div className="pms-form-field">
                  <label className="pms-form-label">Generic Name</label>
                  <input
                    type="text"
                    className="pms-form-input"
                    placeholder="e.g., Acetaminophen"
                    value={formData.generic_name}
                    onChange={(e) => handleFormChange('generic_name', e.target.value)}
                  />
                </div>
                <div className="pms-form-field">
                  <label className="pms-form-label">Category</label>
                  <select
                    className="pms-form-select"
                    value={formData.category}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                  >
                    <option value="other">Other</option>
                    <option value="antibiotic">Antibiotic</option>
                    <option value="painkiller">Painkiller</option>
                    <option value="antiviral">Antiviral</option>
                    <option value="antifungal">Antifungal</option>
                    <option value="vitamin">Vitamin/Supplement</option>
                    <option value="cardiac">Cardiac</option>
                    <option value="diabetes">Diabetes</option>
                    <option value="respiratory">Respiratory</option>
                    <option value="gastrointestinal">Gastrointestinal</option>
                  </select>
                </div>
                <div className="pms-form-field">
                  <label className="pms-form-label">Manufacturer</label>
                  <input
                    type="text"
                    className="pms-form-input"
                    placeholder="e.g., Generic Labs"
                    value={formData.manufacturer}
                    onChange={(e) => handleFormChange('manufacturer', e.target.value)}
                  />
                </div>
                <div className="pms-form-field">
                  <label className="pms-form-label">Quantity <span className="pms-required">*</span></label>
                  <input
                    type="number"
                    className="pms-form-input"
                    placeholder="e.g., 100"
                    value={formData.quantity}
                    onChange={(e) => handleFormChange('quantity', e.target.value)}
                  />
                </div>
                <div className="pms-form-field">
                  <label className="pms-form-label">Unit Type <span className="pms-required">*</span></label>
                  <select
                    className="pms-form-select"
                    value={formData.unit_type}
                    onChange={(e) => handleFormChange('unit_type', e.target.value)}
                  >
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="syrup">Syrup</option>
                    <option value="injection">Injection</option>
                    <option value="drops">Drops</option>
                    <option value="cream">Cream</option>
                    <option value="inhaler">Inhaler</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="pms-form-field">
                  <label className="pms-form-label">Price per Unit (NPR) <span className="pms-required">*</span></label>
                  <input
                    type="number"
                    className="pms-form-input"
                    placeholder="e.g., 10"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleFormChange('price', e.target.value)}
                  />
                </div>
                <div className="pms-form-field">
                  <label className="pms-form-label">Reorder Level</label>
                  <input
                    type="number"
                    className="pms-form-input"
                    placeholder="50"
                    value={formData.reorder_level}
                    onChange={(e) => handleFormChange('reorder_level', e.target.value)}
                  />
                </div>
                <div className="pms-form-field">
                  <label className="pms-form-label">Expiry Date</label>
                  <input
                    type="date"
                    className="pms-form-input"
                    value={formData.expiryDate}
                    onChange={(e) => handleFormChange('expiryDate', e.target.value)}
                  />
                </div>
                <div className="pms-form-field pms-form-field--full">
                  <label className="pms-form-label">Description</label>
                  <textarea
                    className="pms-form-textarea"
                    placeholder="Brief description..."
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                  />
                </div>
                <div className="pms-form-field pms-form-field--full">
                  <label className="pms-form-label">Side Effects</label>
                  <textarea
                    className="pms-form-textarea"
                    placeholder="Common side effects..."
                    value={formData.side_effects}
                    onChange={(e) => handleFormChange('side_effects', e.target.value)}
                  />
                </div>
                <div className="pms-form-field pms-form-field--full">
                  <label className="pms-form-label">Storage Instructions</label>
                  <textarea
                    className="pms-form-textarea"
                    placeholder="How to store this medicine..."
                    value={formData.storage_instructions}
                    onChange={(e) => handleFormChange('storage_instructions', e.target.value)}
                  />
                </div>
              </div>
              <div className="pms-form-actions">
                <button className="pms-btn-cancel" onClick={closeModals}>Cancel</button>
                <button className="pms-btn-submit" onClick={handleSubmitAdd}>
                  <MdAdd />
                  <span>Add Medicine</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Medicine Modal */}
      {showEditModal && selectedMedicine && (
        <div className="pms-modal-overlay" onClick={closeModals}>
          <div className="pms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pms-modal-header pms-modal-header--green">
              <div className="pms-modal-title">
                <div className="pms-modal-icon pms-modal-icon--green">
                  <MdEdit />
                </div>
                <span>Edit Medicine</span>
              </div>
              <button className="pms-modal-close" onClick={closeModals}>
                <MdClose />
              </button>
            </div>
            <div className="pms-modal-body">
              <div className="pms-form-grid">
                <div className="pms-form-field">
                  <label className="pms-form-label">Medicine Name <span className="pms-required">*</span></label>
                  <input
                    type="text"
                    className="pms-form-input"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                  />
                </div>
                <div className="pms-form-field">
                  <label className="pms-form-label">Dosage</label>
                  <input
                    type="text"
                    className="pms-form-input"
                    placeholder="e.g., 500mg"
                    value={formData.dosage}
                    onChange={(e) => handleFormChange('dosage', e.target.value)}
                  />
                </div>
                <div className="pms-form-field">
                  <label className="pms-form-label">Generic Name</label>
                  <input
                    type="text"
                    className="pms-form-input"
                    value={formData.generic_name}
                    onChange={(e) => handleFormChange('generic_name', e.target.value)}
                  />
                </div>
                <div className="pms-form-field">
                  <label className="pms-form-label">Category</label>
                  <select
                    className="pms-form-select"
                    value={formData.category}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                  >
                    <option value="other">Other</option>
                    <option value="antibiotic">Antibiotic</option>
                    <option value="painkiller">Painkiller</option>
                    <option value="antiviral">Antiviral</option>
                    <option value="antifungal">Antifungal</option>
                    <option value="vitamin">Vitamin/Supplement</option>
                    <option value="cardiac">Cardiac</option>
                    <option value="diabetes">Diabetes</option>
                    <option value="respiratory">Respiratory</option>
                    <option value="gastrointestinal">Gastrointestinal</option>
                  </select>
                </div>
                <div className="pms-form-field">
                  <label className="pms-form-label">Manufacturer</label>
                  <input
                    type="text"
                    className="pms-form-input"
                    value={formData.manufacturer}
                    onChange={(e) => handleFormChange('manufacturer', e.target.value)}
                  />
                </div>
                <div className="pms-form-field">
                  <label className="pms-form-label">Quantity <span className="pms-required">*</span></label>
                  <input
                    type="number"
                    className="pms-form-input"
                    value={formData.quantity}
                    onChange={(e) => handleFormChange('quantity', e.target.value)}
                  />
                </div>
                <div className="pms-form-field">
                  <label className="pms-form-label">Unit Type <span className="pms-required">*</span></label>
                  <select
                    className="pms-form-select"
                    value={formData.unit_type}
                    onChange={(e) => handleFormChange('unit_type', e.target.value)}
                  >
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="syrup">Syrup</option>
                    <option value="injection">Injection</option>
                    <option value="drops">Drops</option>
                    <option value="cream">Cream</option>
                    <option value="inhaler">Inhaler</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="pms-form-field">
                  <label className="pms-form-label">Price per Unit (NPR) <span className="pms-required">*</span></label>
                  <input
                    type="number"
                    className="pms-form-input"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleFormChange('price', e.target.value)}
                  />
                </div>
                <div className="pms-form-field">
                  <label className="pms-form-label">Reorder Level</label>
                  <input
                    type="number"
                    className="pms-form-input"
                    value={formData.reorder_level}
                    onChange={(e) => handleFormChange('reorder_level', e.target.value)}
                  />
                </div>
                <div className="pms-form-field">
                  <label className="pms-form-label">Expiry Date</label>
                  <input
                    type="date"
                    className="pms-form-input"
                    value={formData.expiryDate}
                    onChange={(e) => handleFormChange('expiryDate', e.target.value)}
                  />
                </div>
                <div className="pms-form-field pms-form-field--full">
                  <label className="pms-form-label">Description</label>
                  <textarea
                    className="pms-form-textarea"
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                  />
                </div>
                <div className="pms-form-field pms-form-field--full">
                  <label className="pms-form-label">Side Effects</label>
                  <textarea
                    className="pms-form-textarea"
                    value={formData.side_effects}
                    onChange={(e) => handleFormChange('side_effects', e.target.value)}
                  />
                </div>
                <div className="pms-form-field pms-form-field--full">
                  <label className="pms-form-label">Storage Instructions</label>
                  <textarea
                    className="pms-form-textarea"
                    value={formData.storage_instructions}
                    onChange={(e) => handleFormChange('storage_instructions', e.target.value)}
                  />
                </div>
              </div>
              <div className="pms-form-actions">
                <button className="pms-btn-cancel" onClick={closeModals}>Cancel</button>
                <button className="pms-btn-submit" onClick={handleSubmitEdit}>
                  💾
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Medicine Modal */}
      {showViewModal && selectedMedicine && (
        <div className="pms-modal-overlay" onClick={closeModals}>
          <div className="pms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pms-modal-header pms-modal-header--blue">
              <div className="pms-modal-title">
                <div className="pms-modal-icon pms-modal-icon--blue">
                  🧪
                </div>
                <span>Medicine Details</span>
              </div>
              <button className="pms-modal-close" onClick={closeModals}>
                <MdClose />
              </button>
            </div>
            <div className="pms-modal-body">
              
              <div className="pms-view-title-row">
                <h2>
                  {selectedMedicine.name}
                  {selectedMedicine.dosage && <span style={{fontWeight: 400, marginLeft: '8px'}}>({selectedMedicine.dosage})</span>}
                </h2>
                <span className={`pms-stock-badge ${getStatusBadgeClass(selectedMedicine.status)}`}>
                  {getStatusIcon(selectedMedicine.status)} {getStatusText(selectedMedicine.status)}
                </span>
              </div>

              {selectedMedicine.generic_name && (
                <div className="pms-view-section">
                  <div className="pms-section-title">Generic Name</div>
                  <div className="pms-detail-box">
                    <p>{selectedMedicine.generic_name}</p>
                  </div>
                </div>
              )}

              <div className="pms-view-section">
                <div className="pms-section-title">Stock Information</div>
                <div className="pms-detail-box">
                  <div className="pms-detail-row">
                    <span className="pms-detail-label">Current Stock</span>
                    <span className="pms-detail-value">{selectedMedicine.quantity} {selectedMedicine.unit}</span>
                  </div>
                  <div className="pms-detail-row">
                    <span className="pms-detail-label">Reorder Level</span>
                    <span className="pms-detail-value">{selectedMedicine.reorder_level} {selectedMedicine.unit}</span>
                  </div>
                  <div className="pms-detail-row">
                    <span className="pms-detail-label">Unit Type</span>
                    <span className="pms-detail-value">{selectedMedicine.unit}</span>
                  </div>
                  <div className="pms-detail-row">
                    <span className="pms-detail-label">Category</span>
                    <span className="pms-detail-value">{selectedMedicine.category}</span>
                  </div>
                  <div className="pms-detail-row">
                    <span className="pms-detail-label">Price</span>
                    <span className="pms-detail-value">NPR {selectedMedicine.price} per {selectedMedicine.unit.toLowerCase()}</span>
                  </div>
                  <div className="pms-detail-row">
                    <span className="pms-detail-label">Expiry Date</span>
                    <span className="pms-detail-value">{selectedMedicine.expiry_date}</span>
                  </div>
                  <div className="pms-detail-row">
                    <span className="pms-detail-label">Manufacturer</span>
                    <span className="pms-detail-value">{selectedMedicine.manufacturer || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {selectedMedicine.description && (
                <div className="pms-view-section">
                  <div className="pms-section-title">Description</div>
                  <div className="pms-text-box">
                    <p>{selectedMedicine.description}</p>
                  </div>
                </div>
              )}

              {selectedMedicine.side_effects && (
                <div className="pms-view-section">
                  <div className="pms-section-title">Side Effects</div>
                  <div className="pms-text-box">
                    <p>{selectedMedicine.side_effects}</p>
                  </div>
                </div>
              )}

              {selectedMedicine.storage_instructions && (
                <div className="pms-view-section">
                  <div className="pms-section-title">Storage Instructions</div>
                  <div className="pms-text-box">
                    <p>{selectedMedicine.storage_instructions}</p>
                  </div>
                </div>
              )}

              <div className="pms-form-actions" style={{ marginTop: 0, paddingTop: '20px' }}>
                <button className="pms-btn-cancel" onClick={closeModals} style={{ flex: 1 }}>
                  Close
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PharmacyStock;