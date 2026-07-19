import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Search, X, MapPin, AlertCircle, RefreshCw, Archive, RotateCcw } from 'lucide-react';
import { API_BASE_URL } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

const LocationMaster = () => {
  const { language, t } = useLanguage();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    id: null,
    location_name: ''
  });

  const fetchLocations = async () => {
    setIsRefreshing(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/locations/`);
      setLocations(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError(err.response?.data?.error || 'Failed to load locations');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    setFormError('');
  };

  const resetForm = () => {
    setFormData({
      id: null,
      location_name: ''
    });
    setFormError('');
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.location_name.trim()) {
      setFormError(t('locationMaster.nameRequired'));
      return;
    }

    try {
      if (formData.id) {
        await axios.put(`${API_BASE_URL}/api/locations/${formData.id}`, {
          location_name: formData.location_name
        });
      } else {
        await axios.post(`${API_BASE_URL}/api/locations/`, {
          location_name: formData.location_name
        });
      }
      fetchLocations();
      resetForm();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save location');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/locations/${id}`);
      fetchLocations();
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to archive location');
      setDeleteConfirmId(null);
    }
  };

  const handleRestore = async (id) => {
    try {
      await axios.put(`${API_BASE_URL}/api/locations/${id}/restore`);
      fetchLocations();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to restore location');
    }
  };

  const openEditModal = (location) => {
    setFormData({
      id: location.id,
      location_name: location.location_name
    });
    setIsModalOpen(true);
  };

  const filteredLocations = locations.filter((loc) =>
    loc.location_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`p-6 md:p-8 max-w-[1600px] mx-auto ${language === 'ar' ? 'rtl' : 'ltr'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className={`mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <div className={language === 'ar' ? 'text-right' : 'text-left'}>
          <h1 className="font-logo text-3xl font-black text-gray-900 tracking-wide">{t('locationMaster.title')}</h1>
          <p className="text-gray-500 mt-1 flex items-center font-medium">
            <MapPin size={16} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} text-premium-gold`} />
            {t('locationMaster.description')}
          </p>
        </div>
        <div className="flex gap-3 rtl:space-x-reverse w-full sm:w-auto">
          <button
            onClick={fetchLocations}
            disabled={isRefreshing}
            className={`ripple-button px-5 py-3 bg-white border border-gray-100 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 flex items-center transition-all shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-premium-black/20 ${isRefreshing ? 'animate-spin text-premium-gold' : ''}`}
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none ripple-button px-5 py-3 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg hover:shadow-black/20 active:scale-95 flex items-center justify-center transition-all font-bold text-sm focus:outline-none group"
          >
            <Plus size={18} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} text-premium-gold transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90`} />
            <span className="tracking-wide">{t('locationMaster.addLocation')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className={`p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center ${language === 'ar' ? 'text-right' : 'text-left'}`}>
          <div className="relative w-full sm:w-96">
            <div className={`absolute inset-y-0 ${language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
              <Search size={18} className="text-premium-gold" />
            </div>
            <input
              type="text"
              placeholder={t('locationMaster.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`block w-full py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 placeholder-gray-400 shadow-sm ${language === 'ar' ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left'}`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-premium-gold"></div>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-64 text-gray-500">
              <MapPin size={48} className="text-premium-gold mb-4 opacity-50" />
              <p className="text-lg font-medium">{t('locationMaster.noLocations')}</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/50 text-gray-500">
                <tr>
                  <th className={`px-6 py-4 font-semibold ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                    {t('locationMaster.locationName')}
                  </th>
                  <th className="px-6 py-4 font-semibold text-center w-32">Status</th>
                  <th className="px-6 py-4 font-semibold text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLocations.map((location) => (
                  <tr key={location.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-premium-gold/10 flex items-center justify-center flex-shrink-0">
                          <MapPin size={18} className="text-premium-gold" />
                        </div>
                        <div className="font-bold text-gray-900">{location.location_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {location.is_active ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Active</span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">Archived</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {location.is_active ? (
                          <>
                            <button
                              onClick={() => openEditModal(location)}
                              className="p-2 text-gray-400 hover:text-premium-gold hover:bg-premium-gold/10 rounded-lg transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(location.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Archive"
                            >
                              <Archive size={18} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleRestore(location.id)}
                            className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                            title="Restore"
                          >
                            <RotateCcw size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={resetForm}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
            <div className={`px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white`}>
              <h2 className={`text-xl font-black text-gray-900 flex items-center tracking-tight ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                {formData.id ? (
                  <>
                    <Edit2 size={20} className={`${language === 'ar' ? 'ml-3' : 'mr-3'} text-premium-gold`} />
                    {t('locationMaster.editLocation')}
                  </>
                ) : (
                  <>
                    <Plus size={20} className={`${language === 'ar' ? 'ml-3' : 'mr-3'} text-premium-gold`} />
                    {t('locationMaster.addLocation')}
                  </>
                )}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
              {formError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600">
                  <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{formError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className={`block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                    {t('locationMaster.locationName')}
                  </label>
                  <input
                    type="text"
                    name="location_name"
                    value={formData.location_name}
                    onChange={handleInputChange}
                    className={`block w-full py-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 placeholder-gray-400 shadow-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}
                    placeholder="Enter location name"
                    autoFocus
                  />
                </div>

                <div className={`flex gap-3 pt-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-6 py-4 bg-white border border-gray-100 text-gray-700 font-black rounded-xl hover:bg-gray-50 transition-all text-sm tracking-wide focus:outline-none focus:ring-2 focus:ring-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white font-black rounded-xl hover:shadow-lg hover:shadow-black/20 transition-all text-sm tracking-wide focus:outline-none group flex items-center justify-center gap-2"
                  >
                    {formData.id ? t('common.update') || 'Update' : t('common.save') || 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-center p-8 border border-gray-100">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Archive className="text-red-500" size={36} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Archive Location?</h3>
            <p className="text-gray-500 text-sm font-medium mb-8">Are you sure you want to archive this location? It will be hidden from new bookings.</p>
            <div className={`flex gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-6 py-4 bg-white border border-gray-100 text-gray-700 font-black rounded-xl hover:bg-gray-50 transition-all text-sm tracking-wide"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 px-6 py-4 bg-red-500 text-white font-black rounded-xl hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/30 transition-all text-sm tracking-wide"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationMaster;
