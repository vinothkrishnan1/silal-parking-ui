import React, { useState, useEffect } from 'react';
import { Edit, AlertTriangle, Check, X, Users, Car } from 'lucide-react';
import { apiUrl } from '../utils/api';
import { sanitizeDigits } from '../utils/inputValidation';
import { useLanguage } from '../context/LanguageContext';

const SlotManagement = () => {
  const { t, language } = useLanguage();
  const [slotData, setSlotData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    total_visitor_slots: 0,
    total_tenant_slots: 0,
    visitor_reserved: 0,
    tenant_reserved: 0
  });

  const fetchSlotDetails = async () => {
    try {
      const response = await fetch(apiUrl('/api/slot/list-slot-details'));
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const data = await response.json();
      setSlotData(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching slot details:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlotDetails();
    const interval = setInterval(fetchSlotDetails, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleEditSlots = () => {
    if (!slotData) return;
    setFormData({
      total_visitor_slots: slotData.visitor?.total || 0,
      total_tenant_slots: slotData.tenant?.total || 0,
      visitor_reserved: slotData.visitor?.reserved || 0,
      tenant_reserved: slotData.tenant?.reserved || 0
    });
    setShowModal(true);
  };

  const handleIntegerFieldChange = (field, value) => {
    const digitsOnly = sanitizeDigits(value);
    setFormData((prev) => ({
      ...prev,
      [field]: digitsOnly === '' ? 0 : parseInt(digitsOnly, 10)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(apiUrl('/api/slot/update-settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setShowModal(false);
        fetchSlotDetails();
      } else {
        const errorData = await response.json();
        alert(errorData.message || t('slotManagement.updateError'));
      }
    } catch (error) {
      console.error('Error updating slots:', error);
      alert(t('slotManagement.connectionErrorMessage'));
    }
  };

  if (loading && !slotData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50/50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#121212] mb-4"></div>
          <p className="text-gray-400 text-sm animate-pulse">{t('slotManagement.loadingMetrics')}</p>
        </div>
      </div>
    );
  }

  if (error && !slotData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm max-w-md w-full text-center border border-gray-100">
          <AlertTriangle className="mx-auto text-red-400 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{t('slotManagement.connectionError')}</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchSlotDetails(); }}
            className="w-full py-3 bg-[#121212] text-white rounded-xl font-medium hover:bg-black transition-colors shadow-md"
          >
            {t('slotManagement.retryConnection')}
          </button>
        </div>
      </div>
    );
  }

  const SlotCard = ({ title, data, icon, themeAccent, subtitle }) => {
    if (!data) return null;

    const total = data.total || 1;
    const reservedWidth = Math.min(100, (data.reserved / total) * 100);
    const occupancyRate = data.occupancy_rate || 0;

    const isDark = themeAccent === 'dark';
    const accentColor = isDark ? 'text-[#121212]' : 'text-[#c6a87c]';
    const bgAccent = isDark ? 'bg-[#121212]' : 'bg-[#c6a87c]';
    const lightBgAccent = isDark ? 'bg-[#121212]/10' : 'bg-[#c6a87c]/15';
    const groupHoverColor = isDark ? 'group-hover:text-[#121212]' : 'group-hover:text-[#c6a87c]';

    return (
      <div 
        className={`premium-card overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 ${language === 'ar' ? 'rtl' : 'ltr'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="p-6 border-b border-gray-50/80 flex justify-between items-center bg-gray-50/30">
          <div className="flex items-center gap-4">
            <div className={`${lightBgAccent} p-3 rounded-xl ${accentColor}`}>
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-xl text-gray-900 tracking-tight leading-tight">{title}</h3>
              <p className="text-xs text-gray-500 mt-1 font-medium">{subtitle}</p>
            </div>
          </div>
          <div className="px-4 py-2 rounded-xl bg-white text-gray-700 text-sm font-bold border border-gray-100 shadow-sm">
            {data.total} <span className="text-gray-400 font-semibold ml-1">{t('slotManagement.totalSlots')}</span>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="text-center group-hover:bg-gray-50/80 p-4 rounded-xl transition-colors">
              <p className="text-[11px] text-gray-400 uppercase tracking-wider font-bold mb-2">{t('slotManagement.available')}</p>
              <p className={`text-3xl font-black ${groupHoverColor} transition-colors text-gray-800`}>{data.available}</p>
            </div>
            <div className="text-center group-hover:bg-gray-50/80 p-4 rounded-xl transition-colors relative">
              <p className="text-[11px] text-gray-400 uppercase tracking-wider font-bold mb-2">{t('slotManagement.occupied')}</p>
              <p className="text-3xl font-black text-gray-800">{data.occupied}</p>
            </div>
            <div className="text-center group-hover:bg-gray-50/80 p-4 rounded-xl transition-colors">
              <p className="text-[11px] text-gray-400 uppercase tracking-wider font-bold mb-2">{t('slotManagement.reserved')}</p>
              <p className="text-3xl font-black text-gray-800">{data.reserved}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center mb-2 px-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('slotManagement.occupancy')}</span>
              <span className={`text-[10px] font-black ${occupancyRate > 90 ? 'text-red-500' : 'text-gray-600'}`}>{occupancyRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 relative overflow-hidden shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${bgAccent}`}
                style={{ 
                  width: `${occupancyRate}%`,
                  [language === 'ar' ? 'right' : 'left']: 0
                }}
              ></div>
              {data.reserved > 0 && (
                <div
                  className="absolute top-0 h-full bg-black/10 border-l border-black/20"
                  style={{
                    [language === 'ar' ? 'right' : 'left']: `${occupancyRate}%`,
                    width: `${reservedWidth}%`
                  }}
                ></div>
              )}
            </div>
            <div className="flex items-center justify-center pt-4 gap-2">
               <span className="relative flex h-2 w-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
               </span>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                 {t('slotManagement.realTimeMonitoring')}
               </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="font-logo text-3xl font-black text-gray-900 tracking-wide">{t('slotManagement.title')}</h1>
          <p className="text-gray-500 mt-1 font-medium">{t('slotManagement.subtitle')}</p>
        </div>
        <button
          className="ripple-button px-6 py-3.5 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg hover:shadow-black/20 active:scale-95 flex items-center focus:outline-none group transition-all"
          onClick={handleEditSlots}
        >
          <Edit size={18} className={`text-premium-gold transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
          <span className="font-bold text-sm tracking-wide">{t('slotManagement.updateAllocation')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SlotCard
          title={t('slotManagement.visitorStaffZone')}
          subtitle={t('slotManagement.visitorStaffSubtitle')}
          data={slotData.visitor}
          icon={<Users size={22} />}
          themeAccent="dark"
        />
        <SlotCard
          title={t('slotManagement.tenantZone')}
          subtitle={t('slotManagement.tenantSubtitle')}
          data={slotData.tenant}
          icon={<Car size={22} />}
          themeAccent="gold"
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100"
          >
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center text-gray-900 bg-gray-50/50">
              <div>
                <h3 className="text-xl font-bold tracking-tight">{t('slotManagement.updateModalTitle')}</h3>
                <p className="text-xs text-gray-500 mt-1 font-medium">{t('slotManagement.updateModalSubtitle')}</p>
              </div>
              <button
                className="text-gray-400 hover:text-[#121212] p-2 hover:bg-gray-100 rounded-xl transition-all"
                onClick={() => setShowModal(false)}
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Visitor & Staff Section */}
                <div className="space-y-6">
                  <div className={`flex items-center text-[#121212] text-sm font-black tracking-widest uppercase pb-3 border-b border-gray-100 ${language === 'ar' ? 'justify-end' : ''}`}>
                    {t('slotManagement.visitorStaff')}
                  </div>
                  <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('slotManagement.totalCapacity')}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:border-premium-gold focus:ring-2 focus:ring-premium-gold/30 focus:bg-white outline-none font-black text-lg transition-all text-gray-900 shadow-sm"
                      value={formData.total_visitor_slots}
                      onChange={(e) => handleIntegerFieldChange('total_visitor_slots', e.target.value)}
                    />
                  </div>
                  <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('slotManagement.reservedSlots')}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:border-premium-gold focus:ring-2 focus:ring-premium-gold/30 focus:bg-white outline-none font-black text-lg transition-all text-gray-900 shadow-sm"
                      value={formData.visitor_reserved}
                      onChange={(e) => handleIntegerFieldChange('visitor_reserved', e.target.value)}
                    />
                  </div>
                </div>

                {/* Tenant Section */}
                <div className="space-y-6">
                  <div className={`flex items-center text-[#c6a87c] text-sm font-black tracking-widest uppercase pb-3 border-b border-gray-100 ${language === 'ar' ? 'justify-end' : ''}`}>
                    {t('slotManagement.tenant')}
                  </div>
                  <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('slotManagement.totalCapacity')}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:border-premium-gold focus:ring-2 focus:ring-premium-gold/30 focus:bg-white outline-none font-black text-lg transition-all text-gray-900 shadow-sm"
                      value={formData.total_tenant_slots}
                      onChange={(e) => handleIntegerFieldChange('total_tenant_slots', e.target.value)}
                    />
                  </div>
                  <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('slotManagement.reservedSlots')}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:border-premium-gold focus:ring-2 focus:ring-premium-gold/30 focus:bg-white outline-none font-black text-lg transition-all text-gray-900 shadow-sm"
                      value={formData.tenant_reserved}
                      onChange={(e) => handleIntegerFieldChange('tenant_reserved', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className={`mt-10 flex gap-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <button
                  type="button"
                  className="ripple-button flex-1 py-4 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-all focus:outline-none"
                  onClick={() => setShowModal(false)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="ripple-button flex-1 py-4 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-black/20 transition-all active:scale-95 flex justify-center items-center group focus:outline-none"
                >
                  <Check size={20} className={`text-premium-gold transition-transform duration-300 group-hover:scale-110 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                  <span className="tracking-wide">{t('slotManagement.applyAllocation')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlotManagement;
