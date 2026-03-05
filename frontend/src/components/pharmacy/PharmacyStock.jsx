import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdInventory,
  MdSearch,
  MdAdd,
  MdEdit,
  MdDelete,
  MdVisibility,
  MdClose,
  MdWarning,
  MdCheckCircle
} from 'react-icons/md';
import { FaFlask } from 'react-icons/fa';
import '../../styles/pharmacy/PharmacyStock.css';

const PharmacyStock = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    strength: '',
    quantity: '',
    unit: 'Tablets',
    price: '',
    currency: '₹ INR',
    expiryDate: '',
    manufacturer: '',
    description: ''
  });

  const medicines = [
    {
      id: 1,
      name: 'Paracetamol 500mg',
      strength: '500mg',
      quantity: 10,
      unit: 'Tablets',
      price: 10,
      expiryDate: 'Mar 2026',
      manufacturer: 'Generic Labs',
      description: 'Pain reliever and fever reducer',
      status: 'critical'
    },
    {
      id: 2,
      name: 'Amoxicillin 250mg',
      strength: '250mg',
      quantity: 28,
      unit: 'Capsules',
      price: 12,
      expiryDate: 'Apr 2026',
      manufacturer: 'Pharma Corp',
      description: 'Antibiotic for bacterial infections',
      status: 'low'
    },
    {
      id: 3,
      name: 'Ibuprofen 400mg',
      strength: '400mg',
      quantity: 250,
      unit: 'Tablets',
      price: 15,
      expiryDate: 'Jul 2026',
      manufacturer: 'Pharma Inc',
      description: 'Anti-inflammatory pain reliever',
      status: 'good'
    },
    {
      id: 4,
      name: 'Metformin 500mg',
      strength: '500mg',
      quantity: 180,
      unit: 'Tablets',
      price: 8,
      expiryDate: 'Aug 2026',
      manufacturer: 'Diabetes Care',
      description: 'Diabetes management medication',
      status: 'good'
    },
    {
      id: 5,
      name: 'Omeprazole 20mg',
      strength: '20mg',
      quantity: 45,
      unit: 'Capsules',
      price: 18,
      expiryDate: 'Jun 2026',
      manufacturer: 'GastroMed',
      description: 'Reduces stomach acid production',
      status: 'low'
    }
  ];

  const filteredMedicines = medicines.filter(med => {
    if (activeFilter !== 'All') {
      if (activeFilter === 'In Stock' && med.status === 'critical') return false;
      if (activeFilter === 'Low Stock' && med.status !== 'low') return false;
      if (activeFilter === 'Out of Stock' && med.quantity > 0) return false;
    }
    if (searchQuery && !med.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getStockStatusClass = (status) => {
    switch(status) {
      case 'critical': return 'phs-status--critical';
      case 'low': return 'phs-status--low';
      case 'good': return 'phs-status--good';
      default: return 'phs-status--good';
    }
  };

  const getStockStatusLabel = (status) => {
    switch(status) {
      case 'critical': return 'Critical';
      case 'low': return 'Low';
      case 'good': return 'Good Stock';
      default: return 'Good Stock';
    }
  };

  const handleAdd = () => {
    setFormData({
      name: '',
      strength: '',
      quantity: '',
      unit: 'Tablets',
      price: '',
      currency: '₹ INR',
      expiryDate: '',
      manufacturer: '',
      description: ''
    });
    setShowAddModal(true);
  };

  const handleEdit = (medicine) => {
    setSelectedMedicine(medicine);
    setFormData({
      name: medicine.name,
      strength: medicine.strength,
      quantity: medicine.quantity.toString(),
      unit: medicine.unit,
      price: medicine.price.toString(),
      currency: '₹ INR',
      expiryDate: '2026-03-15',
      manufacturer: medicine.manufacturer,
      description: medicine.description
    });
    setShowEditModal(true);
  };

  const handleView = (medicine) => {
    setSelectedMedicine(medicine);
    setShowViewModal(true);
  };

  const handleDelete = (medicine) => {
    if (window.confirm(`Are you sure you want to delete ${medicine.name}?`)) {
      alert(`${medicine.name} deleted successfully!`);
    }
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowViewModal(false);
    setSelectedMedicine(null);
    setFormData({
      name: '',
      strength: '',
      quantity: '',
      unit: 'Tablets',
      price: '',
      currency: '₹ INR',
      expiryDate: '',
      manufacturer: '',
      description: ''
    });
  };

  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmitAdd = () => {
    if (!formData.name || !formData.quantity || !formData.price) {
      alert('Please fill in all required fields');
      return;
    }
    alert(`✓ Medicine "${formData.name}" added successfully!`);
    closeModals();
  };

  const handleSubmitEdit = () => {
    if (!formData.name || !formData.quantity || !formData.price) {
      alert('Please fill in all required fields');
      return;
    }
    alert(`✓ Medicine "${formData.name}" updated successfully!`);
    closeModals();
  };

  return (
    <div className="pharmacy-stock-wrapper">
      <div className="phs-page">

        {/* Header */}
        <div className="phs-header">
          <div>
            <h1>Medicine Stock</h1>
            <p>Inventory of {medicines.length} medicines</p>
          </div>
          <button className="phs-btn-add" onClick={handleAdd}>
            <MdAdd />
            Add Medicine
          </button>
        </div>

        {/* Toolbar */}
        <div className="phs-toolbar">
          <div className="phs-search-wrap">
            <MdSearch className="phs-search-icon" />
            <input 
              type="text" 
              className="phs-search-input" 
              placeholder="Search medicine by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="phs-filter-row">
            <button 
              className={`phs-filter-btn ${activeFilter === 'All' ? 'phs-filter-btn--active' : ''}`}
              onClick={() => setActiveFilter('All')}
            >
              All
            </button>
            <button 
              className={`phs-filter-btn ${activeFilter === 'In Stock' ? 'phs-filter-btn--active' : ''}`}
              onClick={() => setActiveFilter('In Stock')}
            >
              In Stock
            </button>
            <button 
              className={`phs-filter-btn ${activeFilter === 'Low Stock' ? 'phs-filter-btn--active' : ''}`}
              onClick={() => setActiveFilter('Low Stock')}
            >
              Low Stock
            </button>
            <button 
              className={`phs-filter-btn ${activeFilter === 'Out of Stock' ? 'phs-filter-btn--active' : ''}`}
              onClick={() => setActiveFilter('Out of Stock')}
            >
              Out of Stock
            </button>
          </div>
        </div>

        {/* Medicine Cards Grid */}
        <div className="phs-grid">
          {filteredMedicines.map((medicine) => (
            <div key={medicine.id} className={`phs-medicine-card ${getStockStatusClass(medicine.status)}`}>
              <div className="phs-card-header">
                <div>
                  <div className="phs-medicine-name">{medicine.name}</div>
                  <div className="phs-medicine-meta">{medicine.unit} • Expires: {medicine.expiryDate}</div>
                </div>
                <div className={`phs-stock-num ${medicine.status === 'critical' ? 'phs-stock-num--critical' : medicine.status === 'low' ? 'phs-stock-num--low' : 'phs-stock-num--good'}`}>
                  {medicine.quantity}
                </div>
              </div>

              <div className="phs-card-body">
                <div className="phs-info-grid">
                  <div className="phs-info-item">
                    <span className="phs-info-label">Unit:</span>
                    <span className="phs-info-value">{medicine.unit}</span>
                  </div>
                  <div className="phs-info-item">
                    <span className="phs-info-label">Price:</span>
                    <span className="phs-info-value">₹{medicine.price} per {medicine.unit.toLowerCase().slice(0, -1)}</span>
                  </div>
                  <div className="phs-info-item">
                    <span className="phs-info-label">Manufacturer:</span>
                    <span className="phs-info-value">{medicine.manufacturer}</span>
                  </div>
                  <div className="phs-info-item">
                    <span className="phs-info-label">Status:</span>
                    <span className={`phs-badge ${medicine.status === 'critical' ? 'phs-badge--red' : medicine.status === 'low' ? 'phs-badge--orange' : 'phs-badge--green'}`}>
                      {medicine.status === 'critical' ? <MdWarning /> : <MdCheckCircle />}
                      {getStockStatusLabel(medicine.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="phs-card-actions">
                <button className="phs-btn-action phs-btn-edit" onClick={() => handleEdit(medicine)}>
                  <MdEdit />
                  Edit
                </button>
                <button className="phs-btn-action phs-btn-view" onClick={() => handleView(medicine)}>
                  <MdVisibility />
                  View
                </button>
                <button className="phs-btn-action phs-btn-delete" onClick={() => handleDelete(medicine)}>
                  <MdDelete />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="phs-pagination">
          <button className="phs-page-btn" disabled={currentPage === 1}>
            ← Prev
          </button>
          <div className={`phs-page-num ${currentPage === 1 ? 'phs-page-num--active' : ''}`}>1</div>
          <div className={`phs-page-num ${currentPage === 2 ? 'phs-page-num--active' : ''}`}>2</div>
          <div className={`phs-page-num ${currentPage === 3 ? 'phs-page-num--active' : ''}`}>3</div>
          <button className="phs-page-btn">
            Next →
          </button>
        </div>

      </div>

      {/* Add Medicine Modal */}
      {showAddModal && (
        <>
          <div className="phs-modal-overlay" onClick={closeModals} />
          <div className="phs-modal">
            <div className="phs-modal-header">
              <div className="phs-modal-title">
                <span className="phs-modal-icon">
                  <MdAdd />
                </span>
                <span>Add New Medicine</span>
              </div>
              <button className="phs-modal-close" onClick={closeModals}>
                <MdClose />
              </button>
            </div>
            <div className="phs-modal-body">
              <div className="phs-form-grid">
                <div className="phs-form-field">
                  <label>Medicine Name *</label>
                  <input 
                    type="text" 
                    name="name"
                    placeholder="e.g., Aspirin"
                    value={formData.name}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="phs-form-field">
                  <label>Strength</label>
                  <input 
                    type="text" 
                    name="strength"
                    placeholder="e.g., 75mg"
                    value={formData.strength}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div className="phs-form-grid">
                <div className="phs-form-field">
                  <label>Quantity *</label>
                  <input 
                    type="number" 
                    name="quantity"
                    placeholder="e.g., 100"
                    value={formData.quantity}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="phs-form-field">
                  <label>Unit *</label>
                  <select name="unit" value={formData.unit} onChange={handleFormChange}>
                    <option>Tablets</option>
                    <option>Capsules</option>
                    <option>ml</option>
                    <option>mg</option>
                  </select>
                </div>
              </div>

              <div className="phs-form-grid">
                <div className="phs-form-field">
                  <label>Price per Unit *</label>
                  <input 
                    type="number" 
                    name="price"
                    placeholder="e.g., 10"
                    value={formData.price}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="phs-form-field">
                  <label>Currency</label>
                  <select name="currency" value={formData.currency} onChange={handleFormChange}>
                    <option>₹ INR</option>
                    <option>$ USD</option>
                  </select>
                </div>
              </div>

              <div className="phs-form-grid">
                <div className="phs-form-field">
                  <label>Expiry Date</label>
                  <input 
                    type="date" 
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="phs-form-field">
                  <label>Manufacturer</label>
                  <input 
                    type="text" 
                    name="manufacturer"
                    placeholder="e.g., Pfizer"
                    value={formData.manufacturer}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div className="phs-form-field">
                <label>Description</label>
                <textarea 
                  name="description"
                  rows="3"
                  placeholder="Brief description..."
                  value={formData.description}
                  onChange={handleFormChange}
                />
              </div>

              <div className="phs-modal-actions">
                <button className="phs-btn-cancel" onClick={closeModals}>
                  Cancel
                </button>
                <button className="phs-btn-primary" onClick={handleSubmitAdd}>
                  <MdAdd />
                  Add Medicine
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Medicine Modal */}
      {showEditModal && selectedMedicine && (
        <>
          <div className="phs-modal-overlay" onClick={closeModals} />
          <div className="phs-modal">
            <div className="phs-modal-header">
              <div className="phs-modal-title">
                <span className="phs-modal-icon phs-modal-icon--edit">
                  <MdEdit />
                </span>
                <span>Edit Medicine</span>
              </div>
              <button className="phs-modal-close" onClick={closeModals}>
                <MdClose />
              </button>
            </div>
            <div className="phs-modal-body">
              <div className="phs-form-field">
                <label>Medicine Name *</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                />
              </div>

              <div className="phs-form-grid">
                <div className="phs-form-field">
                  <label>Quantity *</label>
                  <input 
                    type="number" 
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="phs-form-field">
                  <label>Unit *</label>
                  <select name="unit" value={formData.unit} onChange={handleFormChange}>
                    <option>Tablets</option>
                    <option>Capsules</option>
                    <option>ml</option>
                  </select>
                </div>
              </div>

              <div className="phs-form-grid">
                <div className="phs-form-field">
                  <label>Price per Unit *</label>
                  <input 
                    type="number" 
                    name="price"
                    value={formData.price}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="phs-form-field">
                  <label>Expiry Date</label>
                  <input 
                    type="date" 
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div className="phs-modal-actions">
                <button className="phs-btn-cancel" onClick={closeModals}>
                  Cancel
                </button>
                <button className="phs-btn-primary phs-btn-primary--edit" onClick={handleSubmitEdit}>
                  <MdEdit />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* View Medicine Modal */}
      {showViewModal && selectedMedicine && (
        <>
          <div className="phs-modal-overlay" onClick={closeModals} />
          <div className="phs-modal">
            <div className="phs-modal-header">
              <div className="phs-modal-title">
                <span className="phs-modal-icon phs-modal-icon--view">
                  <FaFlask />
                </span>
                <span>Medicine Details</span>
              </div>
              <button className="phs-modal-close" onClick={closeModals}>
                <MdClose />
              </button>
            </div>
            <div className="phs-modal-body">
              <div className="phs-view-header">
                <div className="phs-view-name">{selectedMedicine.name}</div>
                <span className={`phs-badge phs-badge--large ${selectedMedicine.status === 'critical' ? 'phs-badge--red' : selectedMedicine.status === 'low' ? 'phs-badge--orange' : 'phs-badge--green'}`}>
                  {selectedMedicine.status === 'critical' ? <MdWarning /> : <MdCheckCircle />}
                  {getStockStatusLabel(selectedMedicine.status)}
                </span>
              </div>

              <div className="phs-info-section">
                <h4>Stock Information</h4>
                <div className="phs-info-row">
                  <span className="phs-info-label">Current Stock</span>
                  <span className="phs-info-value">{selectedMedicine.quantity} {selectedMedicine.unit}</span>
                </div>
                <div className="phs-info-row">
                  <span className="phs-info-label">Unit Type</span>
                  <span className="phs-info-value">{selectedMedicine.unit}</span>
                </div>
                <div className="phs-info-row">
                  <span className="phs-info-label">Price</span>
                  <span className="phs-info-value">₹{selectedMedicine.price} per {selectedMedicine.unit.toLowerCase().slice(0, -1)}</span>
                </div>
                <div className="phs-info-row">
                  <span className="phs-info-label">Expiry Date</span>
                  <span className="phs-info-value">{selectedMedicine.expiryDate}</span>
                </div>
                <div className="phs-info-row">
                  <span className="phs-info-label">Manufacturer</span>
                  <span className="phs-info-value">{selectedMedicine.manufacturer}</span>
                </div>
              </div>

              <div className="phs-info-section">
                <h4>Description</h4>
                <p className="phs-description">{selectedMedicine.description}</p>
              </div>

              <div className="phs-modal-actions">
                <button className="phs-btn-cancel" onClick={closeModals}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default PharmacyStock;