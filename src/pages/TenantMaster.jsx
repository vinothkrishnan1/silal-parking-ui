import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Search, X, Car, User, Phone, AlertCircle, RefreshCw, Trash } from 'lucide-react';
import { API_BASE_URL } from '../utils/api';
import { isEightDigitPhoneNumber, sanitizeDigits } from '../utils/inputValidation';
import { useLanguage } from '../context/LanguageContext';

const TENANT_MASTER_UPDATED_EVENT = 'tenant-master-updated';

const TenantMaster = () => {
  const { language, t } = useLanguage();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    id: null,
    tenant_name: '',
    phone_number: '',
    house_number: '',
    block: '',
    vehicles: [''], // Array of strings for car plates
    tenant_type: 'Tenant',
    // Default dates for backend requirements
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const apiUrl = API_BASE_URL;

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/tenants/`);
      setTenants(response.data);
      setLoading(false);
    } catch (err) {
      setError(t('tenant.errorFetchTenants'));
      setLoading(false);
      console.error(err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError('');
    try {
      const response = await axios.get(`${apiUrl}/api/tenants/`);
      setTenants(response.data);
    } catch (err) {
      setError(t('tenant.errorRefresh'));
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormError('');

    let finalValue = value;
    if (name === 'phone_number') {
      finalValue = sanitizeDigits(value, 8);
    }

    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const handleVehicleChange = (index, value) => {
    const updatedVehicles = [...formData.vehicles];
    updatedVehicles[index] = value.toUpperCase();
    setFormData(prev => ({
      ...prev,
      vehicles: updatedVehicles
    }));
  };

  const addVehicleField = () => {
    setFormData(prev => ({
      ...prev,
      vehicles: [...prev.vehicles, '']
    }));
  };

  const removeVehicleField = (index) => {
    if (formData.vehicles.length <= 1) return;
    const updatedVehicles = formData.vehicles.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      vehicles: updatedVehicles
    }));
  };

  const openModal = (tenant = null) => {
    setFormError('');
    if (tenant) {
      setFormData({
        ...tenant,
        tenant_type: 'Tenant', // always Tenant, Staff is managed via Passes
        phone_number: sanitizeDigits(tenant.phone_number || '', 8),
        house_number: tenant.house_number || '',
        block: tenant.block || '',
        vehicles: tenant.vehicles && tenant.vehicles.length > 0 ? tenant.vehicles : ['']
      });
    } else {
      setFormData({
        id: null,
        tenant_name: '',
        phone_number: '',
        house_number: '',
        block: '',
        vehicles: [''],
        tenant_type: 'Tenant'
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const validateForm = () => {
    if (!formData.tenant_name.trim()) {
      setFormError(t('tenant.validationName'));
      return false;
    }
    if (!formData.phone_number.trim()) {
      setFormError(t('tenant.validationPhone'));
      return false;
    }
    if (!isEightDigitPhoneNumber(formData.phone_number)) {
      setFormError(t('tenant.validationPhoneDigits'));
      return false;
    }
    if (formData.vehicles.some(v => !v.trim())) {
      setFormError(t('tenant.validationPlates'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const payload = { ...formData, tenant_type: 'Tenant' };
      let savedTenant;
      if (formData.id) {
        const response = await axios.put(`${apiUrl}/api/tenants/${formData.id}`, payload);
        savedTenant = response.data;
        setTenants((prev) => prev.map((tenant) => (tenant.id === savedTenant.id ? savedTenant : tenant)));
      } else {
        const response = await axios.post(`${apiUrl}/api/tenants/`, payload);
        savedTenant = response.data;
        setTenants((prev) => [...prev, savedTenant]);
      }
      window.dispatchEvent(new CustomEvent(TENANT_MASTER_UPDATED_EVENT, { detail: savedTenant }));
      closeModal();
    } catch (err) {
      console.error(err);
      const serverMsg = err.response?.data?.error;
      setFormError(serverMsg || t('tenant.errorUnexpected'));
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await axios.delete(`${apiUrl}/api/tenants/${deleteConfirmId}`);
      setTenants((prev) => prev.filter((tenant) => tenant.id !== deleteConfirmId));
      window.dispatchEvent(new CustomEvent(TENANT_MASTER_UPDATED_EVENT, { detail: { id: deleteConfirmId, deleted: true } }));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      alert(t('tenant.errorDelete'));
      setDeleteConfirmId(null);
    }
  };

  const filteredTenants = tenants.filter(t =>
    t.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.house_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.block || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.vehicles.some(v => v.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className={`p-6 md:p-8 max-w-[1600px] mx-auto ${language === 'ar' ? 'rtl' : 'ltr'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header Section */}
      <div className={`mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <div className={language === 'ar' ? 'text-right' : 'text-left'}>
          <h1 className="font-logo text-3xl font-black text-gray-900 tracking-wide">{t('tenant.title')}</h1>
          <p className="text-gray-500 mt-1 flex items-center font-medium">
            <User size={16} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} text-premium-gold`} />
            {t('tenant.subtitle')}
          </p>
        </div>
        <div className="flex gap-3 rtl:space-x-reverse">
          <button
            onClick={handleRefresh}
            className={`ripple-button px-5 py-3 bg-white border border-gray-100 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 flex items-center transition-all shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-premium-black/20 ${isRefreshing ? 'animate-spin text-premium-gold' : ''}`}
            title={t('tenant.refreshTitle')}
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => openModal()}
            className="ripple-button px-5 py-3 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg hover:shadow-black/20 active:scale-95 flex items-center transition-all font-bold text-sm focus:outline-none group"
          >
            <Plus size={18} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} text-premium-gold transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90`} />
            <span className="tracking-wide">{t('tenant.addTenant')}</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className={`relative mb-8 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
        <div className={`absolute inset-y-0 ${language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
          <Search size={18} className="text-premium-gold" />
        </div>
        <input
          type="text"
          placeholder={t('tenant.searchPlaceholder')}
          className={`block w-full py-4 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 placeholder-gray-400 shadow-sm ${language === 'ar' ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left'}`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50/80 border-l-4 border-red-500 text-red-700 rounded-r-xl flex items-center shadow-sm">
          <AlertCircle size={20} className={`${language === 'ar' ? 'ml-3' : 'mr-3'} flex-shrink-0`} />
          <p className="font-bold text-sm tracking-wide">{error}</p>
        </div>
      )}

      {/* Table Section */}
      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/80">
              <tr className={language === 'ar' ? 'flex-row-reverse' : ''}>
                <th className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('tenant.tenantName')}</th>
                <th className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('tenant.contact')}</th>
                <th className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('tenant.address')}</th>
                <th className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('tenant.registeredVehicles')}</th>
                <th className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('tenant.type')}</th>
                <th className={`px-6 py-5 ${language === 'ar' ? 'text-left' : 'text-right'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('tenant.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-premium-gold border-t-transparent"></div>
                      <span className={`${language === 'ar' ? 'mr-3' : 'ml-3'} font-bold tracking-wide`}>{t('tenant.loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center">
                      <User size={48} className="text-gray-200 mb-4" />
                      <p className="text-lg font-bold text-gray-500 tracking-wide">{t('tenant.noTenants')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className={`hover:bg-gray-50/50 transition-colors group ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <div className="h-10 w-10 rounded-xl bg-premium-gold/10 flex items-center justify-center text-premium-gold font-black shadow-sm group-hover:scale-105 transition-transform">
                          {tenant.tenant_name.charAt(0).toUpperCase()}
                        </div>
                        <div className={`${language === 'ar' ? 'mr-4' : 'ml-4'} font-black text-gray-900 tracking-tight`}>{tenant.tenant_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-gray-600">
                      <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <Phone size={14} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} text-premium-gold`} />
                        <span className="tracking-wide">{tenant.phone_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600 font-bold">
                      <div className={`space-y-1.5 ${language === 'ar' ? 'text-right' : ''}`}>
                        <div className="flex items-center gap-1.5"><span className="text-gray-400 text-xs uppercase tracking-widest">{t('tenant.houseNoLabel')}:</span> <span className="tracking-wide">{tenant.house_number || '--'}</span></div>
                        <div className="flex items-center gap-1.5"><span className="text-gray-400 text-xs uppercase tracking-widest">{t('tenant.blockLabel')}:</span> <span className="tracking-wide">{tenant.block || '--'}</span></div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className={`flex flex-wrap gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                        {tenant.vehicles && tenant.vehicles.map((v, i) => (
                          <span key={i} className={`inline-flex items-center px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-800 font-mono text-xs font-bold border border-gray-100 shadow-sm ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                            <Car size={12} className={`${language === 'ar' ? 'ml-1.5' : 'mr-1.5'} text-premium-gold`} />
                            {v}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-right' : ''}`}>
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${tenant.tenant_type === 'Staff' ? 'bg-gray-100 text-gray-600' : 'bg-premium-gold/10 text-premium-gold border border-premium-gold/20'}`}>
                        {tenant.tenant_type}
                      </span>
                    </td>
                    <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-left' : 'text-right'} text-sm font-medium`}>
                      <button onClick={() => openModal(tenant)} className={`text-gray-400 hover:text-premium-black bg-gray-50 hover:bg-gray-100 p-2 rounded-lg ${language === 'ar' ? 'ml-2' : 'mr-2'} focus:outline-none transition-all shadow-sm`}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteClick(tenant.id)} className={`text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-2 rounded-lg focus:outline-none transition-all shadow-sm`}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
            <div className={`px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white`}>
              <h2 className={`text-xl font-black text-gray-900 flex items-center tracking-tight ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                {formData.id
                  ? <Edit2 size={20} className={`${language === 'ar' ? 'ml-3' : 'mr-3'} text-premium-gold`} />
                  : <Plus size={20} className={`${language === 'ar' ? 'ml-3' : 'mr-3'} text-premium-gold`} />}
                {formData.id ? t('tenant.editTenant') : t('tenant.addTenant')}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-2 rounded-xl transition-all focus:outline-none"><X size={20} /></button>
            </div>

            <form id="tenantMasterForm" onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto bg-gray-50/30">
              {formError && (
                <div className="p-4 bg-red-50/80 border border-red-100 text-red-700 text-sm rounded-xl flex items-center font-bold shadow-sm">
                  <AlertCircle size={18} className={`${language === 'ar' ? 'ml-3' : 'mr-3'} flex-shrink-0 text-red-500`} /> {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6">
                <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('tenant.tenantName')}</label>
                  <div className="relative">
                    <User className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-3.5 text-gray-400`} size={18} />
                    <input required type="text" name="tenant_name" value={formData.tenant_name} onChange={handleInputChange}
                      className={`block w-full py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`}
                      placeholder={t('tenant.fullNamePlaceholder')}
                    />
                  </div>
                </div>

                <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('tenant.phoneNumber')}</label>
                  <div className="relative">
                    <Phone className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-3.5 text-gray-400`} size={18} />
                    <input required type="text" inputMode="numeric" maxLength={8} pattern="\d{8}" title={t('tenant.validationPhoneDigits')} name="phone_number" value={formData.phone_number} onChange={handleInputChange}
                      className={`block w-full py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`}
                      placeholder={t('tenant.phonePlaceholder')}
                    />
                  </div>
                </div>

                <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('tenant.houseNumber')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="house_number"
                      value={formData.house_number}
                      onChange={handleInputChange}
                      className={`block w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}
                      placeholder={t('tenant.houseNumberPlaceholder')}
                    />
                  </div>
                </div>

                <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('tenant.block')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="block"
                      value={formData.block}
                      onChange={handleInputChange}
                      className={`block w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}
                      placeholder={t('tenant.blockPlaceholder')}
                    />
                  </div>
                </div>

                <div className="md:col-span-1">
                  <label className={`block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex justify-between items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    {t('tenant.carPlates')}
                    <button type="button" onClick={addVehicleField} className="text-premium-black hover:text-premium-gold text-xs font-black flex items-center focus:outline-none transition-colors">
                      <Plus size={14} className={`${language === 'ar' ? 'ml-1' : 'mr-1'}`} /> {t('tenant.addCar')}
                    </button>
                  </label>
                  <div className="space-y-3">
                    {formData.vehicles.map((vehicle, index) => (
                      <div key={index} className={`flex gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <div className="relative flex-grow">
                          <Car className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-3.5 text-gray-400`} size={18} />
                          <input
                            required
                            type="text"
                            value={vehicle}
                            onChange={(e) => handleVehicleChange(index, e.target.value)}
                            className={`block w-full py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-black text-gray-900 shadow-sm uppercase tracking-wide ${language === 'ar' ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`}
                            placeholder={t('tenant.carPlaceholder')}
                          />
                        </div>
                        {formData.vehicles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVehicleField(index)}
                            className="p-3 text-gray-400 hover:text-red-500 bg-white border border-gray-200 hover:border-red-100 hover:bg-red-50 rounded-xl transition-all shadow-sm focus:outline-none"
                          >
                            <Trash size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </form>

            <div className={`flex justify-end p-6 border-t border-gray-100 bg-white gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <button type="button" onClick={closeModal} className="ripple-button px-6 py-3.5 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all shadow-sm focus:outline-none">
                {t('tenant.cancel')}
              </button>
              <button type="submit" form="tenantMasterForm" className="ripple-button px-8 py-3.5 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg hover:shadow-black/20 active:scale-95 font-bold text-sm transition-all focus:outline-none group">
                <span className="tracking-wide">{formData.id ? t('tenant.saveChanges') : t('tenant.createTenant')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center border border-gray-100">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-50/80 mb-6 border border-red-100 shadow-sm">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">{t('tenant.deleteTenant')}</h3>
            <p className="text-sm font-bold text-gray-500 mb-8 px-4">
              {t('tenant.deleteConfirm')}
            </p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setDeleteConfirmId(null)} className="ripple-button flex-1 py-3.5 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all shadow-sm focus:outline-none">{t('tenant.cancel')}</button>
              <button onClick={confirmDelete} className="ripple-button flex-1 py-3.5 bg-red-500 text-white font-bold text-sm rounded-xl hover:bg-red-600 shadow-md hover:shadow-red-500/20 active:scale-95 transition-all focus:outline-none">{t('tenant.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantMaster;
