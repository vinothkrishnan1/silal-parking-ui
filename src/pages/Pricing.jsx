import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Plus,
  Trash,
  Save,
  Edit,
  ChevronUp,
  ChevronDown,
  X,
  Printer,
  Clock,
  Eye,
  AlertCircle,
  FileText,
  ShieldCheck
} from 'lucide-react';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import StatusModal from '../components/StatusModal';
import { API_BASE_URL } from '../utils/api';
import { sanitizeDecimal, sanitizeDigits } from '../utils/inputValidation';
import { useLanguage } from '../context/LanguageContext';

const Pricing = () => {
  const { language, content, t } = useLanguage();
  const [pricingData, setPricingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    pricing_type: 'Visitor Parking',
    vehicle_type: '4-Wheeler',
    name: '',
    description: '',
    price: '0.00',
    start_date: '',
    end_date: '',
    is_active: true,
    tiers: [
      { id: Date.now(), duration: 1, unit: 'hour', price_omr: '0.500' }
    ]
  });

  const apiUrl = API_BASE_URL;

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/pricing/`);
      setPricingData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch pricing:', err);
      setLoading(false);
    }
  };
  const [showSampleBillModal, setShowSampleBillModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });
  const [statusModal, setStatusModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  const handleEdit = (item) => {
    setFormData({
      pricing_type: item.pricing_type || 'Visitor Parking',
      vehicle_type: item.vehicle_type,
      name: item.name,
      description: item.description || '',
      price: item.price || '0.000',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      is_active: item.is_active,
      tiers: item.tiers ? [...item.tiers] : []
    });
    setEditingId(item.id);
    setErrors({});
    setShowForm(true);
  };

  const handleDelete = (item) => {
    setDeleteModal({ isOpen: true, id: item.id, name: item.name });
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${apiUrl}/api/pricing/${deleteModal.id}`);
      fetchPricing();
      setDeleteModal({ isOpen: false, id: null, name: '' });
    } catch (err) {
      console.error('Failed to delete pricing:', err);
    }
  };

  const handleAdd = () => {
    setFormData({
      pricing_type: 'Visitor Parking',
      vehicle_type: '4-Wheeler',
      name: '',
      description: '',
      price: '0.00',
      start_date: '',
      end_date: '',
      is_active: true,
      tiers: [
        { id: Date.now(), duration: 1, unit: 'hour', price_omr: '0.500' }
      ]
    });
    setEditingId(null);
    setErrors({});
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation for Plan Price
    const newErrors = {};
    if (formData.pricing_type === 'Tenant Subscription') {
      const priceValue = formData.price ? formData.price.toString() : '';

      if (!priceValue || priceValue.trim() === '') {
        newErrors.price = language === 'ar' ? "سعر الخطة مطلوب." : "Plan Price is required.";
      } else if (!/^\d+(\.\d+)?$/.test(priceValue)) {
        newErrors.price = language === 'ar' ? "يجب أن يكون سعر الخطة رقماً صالحاً." : "Plan Price must be a valid number.";
      } else {
        const priceNum = parseFloat(priceValue);
        if (priceNum <= 0) {
          newErrors.price = language === 'ar' ? "يجب أن يكون سعر الخطة أكبر من 0." : "Plan Price must be greater than 0.";
        } else if (priceNum > 9999.99) {
          newErrors.price = language === 'ar' ? "لا يمكن أن يتجاوز سعر الخطة 9,999.99 ريال عماني. أدخل قيمة صحيحة." : "Plan Price cannot exceed 9,999.99 OMR. Enter a correct value.";
        } else {
          const parts = priceValue.split('.');
          if (parts.length > 1 && parts[1].length > 2) {
            newErrors.price = language === 'ar' ? "يُسمح بما يصل إلى منزلتين عشريتين فقط." : "Only up to 2 decimal places are allowed.";
          }
        }
      }
    }

    if (formData.pricing_type === 'Visitor Parking') {
      const hasInvalidTier = formData.tiers.some((tier) => {
        const duration = parseInt(sanitizeDigits(tier.duration), 10);
        const tierPrice = String(tier.price_omr || '');
        return !duration || duration < 1 || !/^\d+(\.\d{1,3})?$/.test(tierPrice);
      });

      if (hasInvalidTier) {
        newErrors.tiers = language === 'ar' ? 'يجب أن تكون كل مدة عدداً صحيحاً ويجب أن يكون سعر كل مستوى مبلغاً صالحاً مع ما يصل إلى 3 أرقام عشرية.' : 'Each duration must be a whole number and each tier price must be a valid amount with up to 3 decimals.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      if (editingId) {
        await axios.put(`${apiUrl}/api/pricing/${editingId}`, formData);
      } else {
        await axios.post(`${apiUrl}/api/pricing/`, formData);
      }
      fetchPricing();
      setShowForm(false);
      setEditingId(null);
      setStatusModal({
        isOpen: true,
        type: 'success',
        title: language === 'ar' ? 'نجاح!' : 'Success!',
        message: language === 'ar' ? `تم ${editingId ? 'تحديث' : 'حفظ'} هيكل التسعير بنجاح.` : `Pricing structure ${editingId ? 'updated' : 'saved'} successfully.`
      });
    } catch (err) {
      console.error('Failed to save pricing:', err);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: language === 'ar' ? 'فشل الحفظ' : 'Save Failed',
        message: language === 'ar' ? 'تعذر حفظ هيكل التسعير. يرجى إدخال مبلغ صحيح والمحاولة مرة أخرى.' : 'Could not save the pricing structure. Please enter a correct amount and try again.'
      });
    }
  };

  const toggleStatus = async (item) => {
    try {
      await axios.put(`${apiUrl}/api/pricing/${item.id}`, {
        ...item,
        is_active: !item.is_active
      });
      fetchPricing();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const addTier = () => {
    const lastTier = formData.tiers[formData.tiers.length - 1] || { duration: 0, unit: 'hour', price_omr: '0.500' };
    const newTier = {
      id: Date.now(),
      duration: lastTier.duration + 1,
      unit: lastTier.unit,
      price_omr: lastTier.price_omr
    };
    setFormData({
      ...formData,
      tiers: [...formData.tiers, newTier]
    });
  };

  const removeTier = (tierId) => {
    if (formData.tiers.length <= 1) return;
    setFormData({
      ...formData,
      tiers: formData.tiers.filter(tier => tier.id !== tierId)
    });
  };

  const updateTier = (tierId, field, value) => {
    let nextValue = value;

    if (field === 'duration') {
      const digitsOnly = sanitizeDigits(value);
      nextValue = digitsOnly === '' ? 1 : parseInt(digitsOnly, 10);
    }

    if (field === 'price_omr') {
      nextValue = sanitizeDecimal(value, 3);
    }

    setFormData({
      ...formData,
      tiers: formData.tiers.map(tier =>
        tier.id === tierId ? { ...tier, [field]: nextValue } : tier
      )
    });
  };

  const SamplePaymentReceiptContent = () => { // Renamed for clarity
    const currentDate = new Date().toLocaleDateString(language === 'ar' ? 'ar-OM' : 'en-GB');
    const currentTime = new Date().toLocaleTimeString(language === 'ar' ? 'ar-OM' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const entryTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleTimeString(language === 'ar' ? 'ar-OM' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const exitTime = currentTime;

    return (
      <div className={`font-mono text-xs text-black bg-white p-4 max-w-xs mx-auto border border-dashed border-black ${language === 'ar' ? 'text-right rtl' : 'text-left ltr'}`}>
        <div className="text-center mb-2">
          <img
            src="https://img-wrapper.vercel.app/image?url=https://i.ibb.co/K9fK5dK/Life-Line-Logo.png"
            alt="Life Line Hospital Logo"
            className="w-16 h-auto mx-auto mb-1"
          />
          <p className="font-bold">Pro Parking</p>
          <p>{language === 'ar' ? 'صلالة، عمان' : 'Salalah, Oman'}</p>
        </div>
        <hr className="border-dashed border-black my-1" />
        <p>{language === 'ar' ? 'رقم الإيصال' : 'Receipt No'} : RCPT-{Math.floor(Math.random() * 90000) + 10000}</p>
        <p>{language === 'ar' ? 'التاريخ' : 'Date'}       : {currentDate}</p>
        <p>{language === 'ar' ? 'الوقت' : 'Time'}       : {currentTime}</p>
        <hr className="border-dashed border-black my-1" />
        <p>{language === 'ar' ? 'رقم المركبة' : 'Vehicle No'} : RNO 1234</p>
        <p>{language === 'ar' ? 'وقت الدخول' : 'Entry Time'} : {entryTime}</p>
        <p>{language === 'ar' ? 'وقت الخروج' : 'Exit Time'}  : {exitTime}</p>
        <p>{language === 'ar' ? 'المدة' : 'Duration'}   : 2h 0m</p>
        <hr className="border-dashed border-black my-1" />
        <div className="flex justify-between">
          <span>{language === 'ar' ? 'التفاصيل' : 'Particulars'}</span>
          <span>{language === 'ar' ? 'المبلغ (ر.ع.)' : 'Amount (OMR)'}</span>
        </div>
        <hr className="border-dashed border-black my-1" />
        <div className="flex justify-between">
          <span>{language === 'ar' ? 'رسوم المواقف' : 'Parking Fee'}</span>
          <span>1.000</span>
        </div>
        <hr className="border-dashed border-black my-1" />
        <div className="flex justify-between font-bold mt-1">
          <span>{language === 'ar' ? 'إجمالي المبلغ المدفوع' : 'Total Amount Paid'}</span>
          <span>{language === 'ar' ? 'ر.ع. 1.000' : 'OMR 1.000'}</span>
        </div>
        <hr className="border-dashed border-black my-1" />
        {/* QR Code Removed from here */}
        <p className="text-center text-[10px] leading-tight mt-2">
          {language === 'ar' ? '"شكراً لزيارتكم. نتمنى لكم ولأحبائكم دوام الصحة والعافية والشفاء العاجل."' : '"Thank you for visiting. We wish you and your loved ones good health and a speedy recovery."'}
        </p>
        <hr className="border-dashed border-black mt-2" />
      </div>
    );
  };


  return (
    <div className={`p-6 md:p-8 max-w-[1600px] mx-auto ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className={`mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <div className={language === 'ar' ? 'text-right' : 'text-left'}>
          <h1 className="font-logo text-3xl font-black text-gray-900 tracking-wide">{t('pricing.title')}</h1>
          <p className="text-gray-500 mt-1 flex items-center font-medium">
            <ShieldCheck size={16} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} text-premium-gold`} />
            {t('pricing.subtitle')}
          </p>
        </div>
        <div className="flex space-x-3 rtl:space-x-reverse">
          <button
            className="ripple-button px-5 py-3 bg-white border border-gray-100 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 flex items-center transition-all shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-premium-black/20"
            onClick={() => setShowSampleBillModal(true)}
          >
            <Eye size={18} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} text-premium-gold`} />
            {t('pricing.viewSampleReceipt')}
          </button>
          <button
            className="ripple-button px-5 py-3 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg hover:shadow-black/20 active:scale-95 flex items-center transition-all font-bold text-sm focus:outline-none focus:ring-2 focus:ring-premium-black/50 group"
            onClick={handleAdd}
          >
            <Plus size={18} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} text-premium-gold transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90`} />
            <span className="tracking-wide">{t('pricing.addPricing')}</span>
          </button>
        </div>
      </div>

      {showForm ? (
        <div className="premium-card p-6 md:p-8 mb-6 overflow-hidden">
          <div className={`flex justify-between items-center mb-8 pb-4 border-b border-gray-100 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">
              {editingId ? t('pricing.editPricing') : t('pricing.addNewPricing')}
            </h3>
            <button
              className="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-2 rounded-xl transition-all focus:outline-none"
              onClick={() => {
                setShowForm(false);
                setErrors({});
              }}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('pricing.pricingType')}</label>
                <select
                  className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold focus:bg-white transition-all text-sm font-bold text-gray-900 shadow-sm"
                  value={formData.pricing_type}
                  onChange={(e) => setFormData({ ...formData, pricing_type: e.target.value })}
                  required
                >
                  <option value="Visitor Parking">{t('pricing.visitorParking')}</option>
                  <option value="Tenant Subscription">{t('pricing.tenantSubscription')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('pricing.vehicleType')}</label>
                <select
                  className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold focus:bg-white transition-all text-sm font-bold text-gray-900 shadow-sm"
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  required
                >
                  <option value="4-Wheeler">{t('pricing.fourWheeler')}</option>
                  <option value="2-Wheeler">{t('pricing.twoWheeler')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('pricing.pricingName')}</label>
                <input
                  type="text"
                  className={`w-full px-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold focus:bg-white transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder={formData.pricing_type === 'Tenant Subscription' ? (language === 'ar' ? "مثلاً خطة شهرية" : "e.g. Monthly Plan") : (language === 'ar' ? "مثلاً مواقف الزوار القياسية" : "e.g. Standard Visitor Parking")}
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('pricing.status')}</label>
                <select
                  className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold focus:bg-white transition-all text-sm font-bold text-gray-900 shadow-sm"
                  value={formData.is_active ? "active" : "inactive"}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "active" })}
                >
                  <option value="active">{t('pricing.active')}</option>
                  <option value="inactive">{t('pricing.inactive')}</option>
                </select>
              </div>

              {formData.pricing_type === 'Tenant Subscription' && (
                <>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('pricing.planPrice')}</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className={`w-full px-4 py-3.5 bg-gray-50/50 border ${errors.price ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-100 focus:border-premium-gold focus:ring-premium-gold/30'} rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: sanitizeDecimal(e.target.value, 2) })}
                      placeholder="0.00"
                    />
                    {errors.price && (
                      <p className="mt-2 text-xs text-red-500 flex items-center font-bold">
                        <AlertCircle size={14} className={`${language === 'ar' ? 'ml-1' : 'mr-1'} flex-shrink-0`} />
                        {errors.price}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('pricing.description')}</label>
                <textarea
                  className={`w-full px-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold focus:bg-white transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  placeholder={language === 'ar' ? "أضف أي تفاصيل إضافية حول هيكل التسعير هذا" : "Add any additional details about this pricing structure"}
                ></textarea>
              </div>

              {formData.pricing_type === 'Visitor Parking' && (
                <div className="md:col-span-2 mt-2">
                  <div className={`flex justify-between items-center mb-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">{t('pricing.tiersTitle')}</label>
                    <button
                      type="button"
                      className="text-premium-black hover:text-premium-gold font-bold text-sm flex items-center focus:outline-none transition-colors"
                      onClick={addTier}
                    >
                      <Plus size={16} className={`${language === 'ar' ? 'ml-1' : 'mr-1'}`} />
                      {t('pricing.addTier')}
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50/80">
                        <tr className={language === 'ar' ? 'flex-row-reverse' : ''}>
                          <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>
                            {t('pricing.duration')}
                          </th>
                          <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>
                            {t('pricing.priceOmr')}
                          </th>
                          <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-left' : 'text-right'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>
                            {t('pricing.actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-50">
                        {formData.tiers.map((tier, index) => (
                          <tr key={tier.id} className={language === 'ar' ? 'flex-row-reverse' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                                {index === 0 ? (
                                  <span className="text-gray-900 font-bold text-sm tracking-wide">{t('pricing.first')}</span>
                                ) : (
                                  <span className="text-gray-900 font-bold text-sm tracking-wide">{t('pricing.after')}</span>
                                )}
                                <div className={`flex items-center ${language === 'ar' ? 'mr-3 flex-row-reverse' : 'ml-3'}`}>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className="w-20 px-3 py-2 bg-gray-50/80 border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold focus:bg-white text-center font-black text-gray-900 transition-all shadow-sm"
                                    value={tier.duration}
                                    onChange={(e) => updateTier(tier.id, 'duration', e.target.value)}
                                  />
                                  <select
                                    className={`${language === 'ar' ? 'mr-2' : 'ml-2'} px-4 py-2 bg-gray-50/80 border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold focus:bg-white text-sm font-bold text-gray-700 transition-all shadow-sm cursor-pointer`}
                                    value={tier.unit}
                                    onChange={(e) => updateTier(tier.id, 'unit', e.target.value)}
                                  >
                                    <option value="hour">{t('pricing.hours')}</option>
                                    <option value="day">{t('pricing.days')}</option>
                                  </select>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className="w-28 px-3 py-2 bg-gray-50/80 border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold focus:bg-white text-center font-black text-gray-900 transition-all shadow-sm"
                                  value={tier.price_omr}
                                  onChange={(e) => updateTier(tier.id, 'price_omr', e.target.value)}
                                />
                                <span className={`${language === 'ar' ? 'mr-2' : 'ml-2'} text-gray-500 font-black text-xs uppercase tracking-widest`}>{t('dashboard.omr')}</span>
                              </div>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap ${language === 'ar' ? 'text-left' : 'text-right'}`}>
                              <button
                                type="button"
                                className={`text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 transition-all focus:outline-none p-2 rounded-lg ${formData.tiers.length <= 1 ? "opacity-50 cursor-not-allowed" : ""}`}
                                onClick={() => removeTier(tier.id)}
                                disabled={formData.tiers.length <= 1}
                              >
                                <Trash size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className={`mt-3 text-xs font-bold text-gray-500 flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <Clock size={14} className={`${language === 'ar' ? 'ml-1' : 'mr-1'}`} />
                    <span>{t('pricing.tiersHelp')}</span>
                  </div>
                  {errors.tiers && (
                    <p className={`mt-2 text-xs text-red-500 flex items-center font-bold ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                      <AlertCircle size={14} className={`${language === 'ar' ? 'ml-1' : 'mr-1'} flex-shrink-0`} />
                      {errors.tiers}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 rtl:space-x-reverse mt-10 pt-6 border-t border-gray-100">
              <button
                type="button"
                className="ripple-button px-6 py-3.5 bg-white border border-gray-100 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 flex items-center transition-all shadow-sm active:scale-95 focus:outline-none"
                onClick={() => {
                  setShowForm(false);
                  setErrors({});
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="ripple-button px-8 py-3.5 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg hover:shadow-black/20 active:scale-95 flex items-center transition-all font-bold text-sm focus:outline-none group"
              >
                <Save size={18} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} text-premium-gold transition-transform duration-300 group-hover:scale-110`} />
                <span className="tracking-wide">{editingId ? t('common.save') : t('pricing.addPricing')}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/80">
                <tr className={language === 'ar' ? 'flex-row-reverse' : ''}>
                  <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>
                    {t('pricing.type')}
                  </th>
                  <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>
                    {t('pricing.vehicleType')}
                  </th>
                  <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>
                    {t('pricing.pricingName')}
                  </th>
                  <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>
                    {t('pricing.basePrice')}
                  </th>
                  <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>
                    {t('pricing.status')}
                  </th>
                  <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-left' : 'text-right'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>
                    {t('pricing.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {pricingData.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr className={`hover:bg-gray-50/50 transition-colors ${expandedId === item.id ? 'bg-gray-50/80' : ''} ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                      <td className={`px-6 py-5 whitespace-nowrap text-sm font-bold text-gray-500 ${language === 'ar' ? 'text-right' : ''}`}>
                        {item.pricing_type === 'Visitor Parking' ? t('pricing.visitorParking') : t('pricing.tenantSubscription')}
                      </td>
                      <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-right' : ''}`}>
                        <div className="font-black text-gray-900 tracking-tight">{item.vehicle_type === '4-Wheeler' ? t('pricing.fourWheeler') : t('pricing.twoWheeler')}</div>
                      </td>
                      <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-right' : ''}`}>
                        <div className="font-black text-gray-900 tracking-tight">{item.name}</div>
                      </td>
                      <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-right' : ''}`}>
                        <div className="font-black text-gradient-gold drop-shadow-sm">
                          {item.pricing_type === 'Tenant Subscription' ? (
                            <span>{parseFloat(item.price).toFixed(3)} {t('dashboard.omr')} / {t('pricing.plan')}</span>
                          ) : (
                            <>
                              {item.tiers[0]?.price_omr ? parseFloat(item.tiers[0].price_omr).toFixed(3) : '0.000'} {t('dashboard.omr')}
                              <span className={`${language === 'ar' ? 'mr-1' : 'ml-1'} text-gray-400 font-bold text-xs`}>
                                / {item.tiers[0]?.duration || 1} {item.tiers[0]?.unit === 'hour' ? t('pricing.hours') : t('pricing.days')}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-right' : ''}`}>
                        <button
                          onClick={() => toggleStatus(item)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 ${item.is_active
                            ? 'bg-premium-gold/10 text-premium-gold border border-premium-gold/20 hover:bg-premium-gold/20'
                            : 'bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-200'
                            }`}
                        >
                          {item.is_active ? t('pricing.active') : t('pricing.inactive')}
                        </button>
                      </td>
                      <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-left' : 'text-right'} text-sm font-medium`}>
                        <button
                          className={`text-gray-400 hover:text-premium-black bg-gray-50 hover:bg-gray-100 p-2 rounded-lg ${language === 'ar' ? 'ml-2' : 'mr-2'} focus:outline-none transition-all shadow-sm`}
                          onClick={() => handleEdit(item)}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className={`text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-2 rounded-lg ${language === 'ar' ? 'ml-2' : 'mr-2'} focus:outline-none transition-all shadow-sm`}
                          onClick={() => handleDelete(item)}
                        >
                          <Trash size={16} />
                        </button>
                        <button
                          className="text-gray-400 hover:text-premium-black bg-gray-50 hover:bg-gray-100 p-2 rounded-lg focus:outline-none transition-all shadow-sm"
                          onClick={() => toggleExpand(item.id)}
                        >
                          {expandedId === item.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                    </tr>
                    {expandedId === item.id && (
                      <tr>
                        <td colSpan={6} className="px-0 py-0">
                          <div className="bg-gray-50/80 p-6 border-b border-gray-100">
                            <div className={`text-sm text-gray-600 mb-4 ${language === 'ar' ? 'text-right' : ''}`}>
                              <span className="font-semibold text-gray-900">{t('pricing.description')}:</span> {item.description || '-'}
                            </div>
                            {item.pricing_type === 'Tenant Subscription' ? (
                              <div className={`text-sm text-gray-700 ${language === 'ar' ? 'text-right' : ''}`}>
                                <span className="font-semibold">{t('pricing.validity')}:</span> {item.start_date} {language === 'ar' ? 'إلى' : 'to'} {item.end_date}
                              </div>
                            ) : (
                              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white max-w-2xl">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50/80">
                                    <tr className={language === 'ar' ? 'flex-row-reverse' : ''}>
                                      <th scope="col" className={`px-6 py-3 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-bold text-gray-500 uppercase tracking-wider`}>
                                        {t('pricing.duration')}
                                      </th>
                                      <th scope="col" className={`px-6 py-3 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-bold text-gray-500 uppercase tracking-wider`}>
                                        {t('pricing.priceOmr')}
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {item.tiers.map((tier, index) => (
                                      <tr key={tier.id} className={language === 'ar' ? 'flex-row-reverse' : ''}>
                                        <td className={`px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-700 ${language === 'ar' ? 'text-right' : ''}`}>
                                          {index === 0 ? (
                                            <span>{t('pricing.first')} {tier.duration} {tier.unit === 'hour' ? t('pricing.hours') : t('pricing.days')}</span>
                                          ) : (
                                            <span>{t('pricing.after')} {tier.duration} {tier.unit === 'hour' ? t('pricing.hours') : t('pricing.days')}</span>
                                          )}
                                        </td>
                                        <td className={`px-6 py-3 whitespace-nowrap font-bold text-gray-900 ${language === 'ar' ? 'text-right' : ''}`}>
                                          {parseFloat(tier.price_omr).toFixed(3)} {t('dashboard.omr')}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {pricingData.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {language === 'ar' ? 'لا توجد بيانات تسعير متاحة. انقر فوق "إضافة تسعير" لإنشاء قواعد تسعير جديدة.' : 'No pricing data available. Click "Add Pricing" to create new pricing rules.'}
              </div>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showSampleBillModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
            onClick={() => setShowSampleBillModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-sm p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-md font-semibold text-gray-700">{t('pricing.sampleReceipt')}</h3>
                <button
                  onClick={() => setShowSampleBillModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-blue"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4">
                <div id="samplePaymentReceiptForPrint"> {/* Added ID for printing */}
                  <SamplePaymentReceiptContent />
                </div>
              </div>
              <div className="p-3 bg-gray-50 border-t flex justify-end space-x-2 rtl:space-x-reverse">
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(`<html><head><title>${language === 'ar' ? 'إيصال الدفع' : 'Payment Receipt'}</title>`);
                    printWindow.document.write(`<style>body{font-family:monospace;font-size:10px;margin:10px;color:black; direction: ${language === 'ar' ? 'rtl' : 'ltr'};} .bill-container{width:300px;margin:auto;padding:10px;border:1px dashed #000;} .center{text-align:center;} .flex-between{display:flex;justify-content:space-between;} .bold{font-weight:bold;} .logo{width:60px;margin:5px auto;} hr{border:none;border-top:1px dashed #000;margin:5px 0;}</style>`);
                    printWindow.document.write('</head><body>');
                    const billContent = document.getElementById('samplePaymentReceiptForPrint');
                    if (billContent) printWindow.document.write(billContent.innerHTML); else printWindow.document.write("Error: Bill content not found.");
                    printWindow.document.write('</body></html>');
                    printWindow.document.close();
                    printWindow.print();
                  }}
                  className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-blue"
                >
                  <Printer size={14} className={`${language === 'ar' ? 'ml-1' : 'mr-1'}`} /> {t('pricing.print')}
                </button>
                <button
                  onClick={() => setShowSampleBillModal(false)}
                  className="px-3 py-1.5 text-xs bg-primary-red text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-red"
                >
                  {t('common.close')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={confirmDelete}
        title={language === 'ar' ? 'حذف هيكل التسعير' : 'Delete Pricing Structure'}
        message={language === 'ar' ? 'هل أنت متأكد أنك تريد حذف هيكل التسعير هذا؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this pricing structure? This action cannot be undone.'}
        itemName={deleteModal.name}
      />
      <StatusModal
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
      />
    </div>
  );
};

export default Pricing;
