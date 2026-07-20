import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  CalendarDays,
  Car,
  ChevronDown,
  Edit2,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  User,
  X,
  Trash,
  Save,
  CheckCircle
} from 'lucide-react';
import StatusModal from '../components/StatusModal';
import {
  getSubscriptionStatusMeta,
  getTodayInputValue,
  parseSubscriptionDate,
  sortSubscriptionsNewestFirst
} from '../utils/subscriptionStatus';
import { API_BASE_URL } from '../utils/api';
import { isEightDigitPhoneNumber, sanitizeDigits } from '../utils/inputValidation';
import { useLanguage } from '../context/LanguageContext';

const VISITOR_MASTER_UPDATED_EVENT = 'visitor-master-updated';
const SUBSCRIPTION_PAYMENT_METHOD_OPTIONS = ['Cash', 'Card', 'Online'];

const normalizeSubscriptionPaymentMethod = (value) => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  const matchedMethod = SUBSCRIPTION_PAYMENT_METHOD_OPTIONS.find(
    (option) => option.toLowerCase() === normalizedValue
  );

  return matchedMethod || 'Card';
};

const createInitialFormData = () => {
  const today = getTodayInputValue();

  return {
    id: null,
    visitor_id: null,
    visitor_name: '',
    phone_number: '',
    house_number: '',
    block: '',
    visitor_type: 'Visitor',
    vehicles: [''],
    start_date: today,
    end_date: today,
    allocated_slots: 1,
    subscription_plan_id: '',
    amount_paid: '',
    payment_method: normalizeSubscriptionPaymentMethod('Card'),
    payment_status: 'Pending',
    payment_date: today,
    status: 'active'
  };
};

const getEditableSubscriptionStatus = (subscription) => {
  const normalizedStatus = String(subscription?.status || '').trim().toLowerCase();

  if (normalizedStatus === 'inactive') {
    return 'inactive';
  }

  if (!subscription?.status && subscription?.is_active === false) {
    return 'inactive';
  }

  return 'active';
};

const formatDisplayDate = (value) => {
  const parsedDate = parseSubscriptionDate(value);
  return parsedDate ? parsedDate.toLocaleDateString() : '--';
};

const statusBadgeClassName = {
  Active: 'bg-green-50 text-green-700 border border-green-100',
  Expired: 'bg-red-50 text-red-700 border border-red-100',
  Scheduled: 'bg-[#c6a87c]/10 text-[#c6a87c] border border-[#c6a87c]/20',
  Inactive: 'bg-gray-50 text-gray-700 border border-gray-200',
  'Pending Payment': 'bg-amber-50 text-amber-700 border border-amber-100'
};

const filterKeyMap = {
  All: 'all',
  Active: 'active',
  Expired: 'expired',
  Scheduled: 'scheduled',
  Inactive: 'inactive',
  'Pending Payment': 'pendingPayment'
};

const VisitorVehicles = () => {
  const { t, language } = useLanguage();
  const [visitors, setVisitors] = useState([]);
  const [masterVisitors, setMasterVisitors] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [visitorSearch, setVisitorSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [statusModal, setStatusModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });
  const [formData, setFormData] = useState(createInitialFormData());
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const apiUrl = API_BASE_URL;
  const todayStr = getTodayInputValue();

  const loadPageData = async ({ refreshOnly = false } = {}) => {
    if (refreshOnly) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [subscriptionsResponse, plansResponse, visitorsResponse] = await Promise.all([
        axios.get(`${apiUrl}/api/visitors/subscriptions/`),
        axios.get(`${apiUrl}/api/pricing/`),
        axios.get(`${apiUrl}/api/visitors/`)
      ]);

      setVisitors(Array.isArray(subscriptionsResponse.data) ? subscriptionsResponse.data : []);
      setPlans(
        (Array.isArray(plansResponse.data) ? plansResponse.data : []).filter(
          (plan) => plan.pricing_type === 'Visitor Subscription'
        )
      );
      setMasterVisitors(Array.isArray(visitorsResponse.data) ? visitorsResponse.data : []);
      setError('');
    } catch (err) {
      setError(t('visitorSubscriptions.validation.fetchError'));
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  useEffect(() => {
    const handleVisitorMasterUpdate = () => {
      loadPageData({ refreshOnly: true });
    };

    window.addEventListener(VISITOR_MASTER_UPDATED_EVENT, handleVisitorMasterUpdate);
    return () => window.removeEventListener(VISITOR_MASTER_UPDATED_EVENT, handleVisitorMasterUpdate);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!formData.subscription_plan_id || plans.length === 0) {
      return;
    }

    const selectedPlan = plans.find((plan) => String(plan.id) === String(formData.subscription_plan_id));
    if (!selectedPlan) {
      return;
    }

    const slots = parseInt(formData.allocated_slots, 10) || 0;
    const calculatedAmount = (selectedPlan.price * slots).toFixed(3);

    if (formData.amount_paid !== calculatedAmount && !Number.isNaN(Number(calculatedAmount))) {
      setFormData((prev) => ({ ...prev, amount_paid: calculatedAmount }));
    }
  }, [formData.subscription_plan_id, formData.allocated_slots, formData.amount_paid, plans]);

  const handleRefresh = async () => {
    await loadPageData({ refreshOnly: true });
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormError('');

    let finalValue = value;
    if (name === 'phone_number') {
      finalValue = sanitizeDigits(value, 8);
    }

    if (name === 'allocated_slots') {
      const digitsOnly = sanitizeDigits(value);
      finalValue = digitsOnly === '' ? '' : parseInt(digitsOnly, 10);
    }

    setFormData((prev) => {
      const nextState = {
        ...prev,
        [name]: type === 'checkbox' ? checked : finalValue
      };

      if (name === 'payment_status' && finalValue === 'Paid' && !prev.payment_date) {
        nextState.payment_date = todayStr;
      }

      if (name === 'allocated_slots') {
        const slots = parseInt(finalValue, 10) || 0;
        const selectedPlan = plans.find((p) => String(p.id) === String(nextState.subscription_plan_id));
        if (selectedPlan) {
          nextState.amount_paid = (selectedPlan.price * slots).toFixed(3);
        }
      }

      return nextState;
    });
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
    const updatedVehicles = formData.vehicles.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      vehicles: updatedVehicles.length > 0 ? updatedVehicles : ['']
    }));
  };

  const handlePlanSelect = (event) => {
    const planId = event.target.value;
    const selectedPlan = plans.find((plan) => String(plan.id) === planId);

    if (selectedPlan) {
      const slots = parseInt(formData.allocated_slots, 10) || 1;
      setFormData((prev) => ({
        ...prev,
        subscription_plan_id: planId,
        vehicle_type: selectedPlan.vehicle_type,
        amount_paid: (selectedPlan.price * slots).toFixed(3)
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      subscription_plan_id: '',
      amount_paid: ''
    }));
  };

  const openModal = (visitor = null) => {
    setFormError('');
    setVisitorSearch('');
    setShowDropdown(false);

    if (visitor) {
      setFormData({
        ...createInitialFormData(),
        ...visitor,
        vehicles: visitor.vehicles && visitor.vehicles.length > 0 ? visitor.vehicles : [''],
        phone_number: sanitizeDigits(visitor.phone_number || '', 8),
        house_number: visitor.house_number || '',
        block: visitor.block || '',
        start_date: visitor.start_date || todayStr,
        end_date: visitor.end_date || todayStr,
        payment_method: normalizeSubscriptionPaymentMethod(visitor.payment_method),
        transaction_id: '',
        payment_date: visitor.payment_date || todayStr,
        status: getEditableSubscriptionStatus(visitor),
        subscription_plan_id: visitor.subscription_plan_id ? String(visitor.subscription_plan_id) : ''
      });
    } else {
      setFormData(createInitialFormData());
    }

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const validateForm = () => {
    if (!formData.visitor_name?.trim() || !formData.phone_number?.trim()) {
      setFormError(language === 'ar' ? 'يرجى إدخال اسم الزائر ورقم الهاتف' : 'Please enter Visitor Name and Phone Number');
      return false;
    }

    if (!isEightDigitPhoneNumber(formData.phone_number)) {
      setFormError(t('visitorSubscriptions.validation.invalidPhone'));
      return false;
    }

    if (!formData.start_date || !formData.end_date) {
      setFormError(t('visitorSubscriptions.validation.datesRequired'));
      return false;
    }

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      setFormError(t('visitorSubscriptions.validation.invalidDateRange'));
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    try {
      const submissionData = {
        ...formData,
        status: formData.status === 'inactive' ? 'inactive' : 'active',
        payment_method: normalizeSubscriptionPaymentMethod(formData.payment_method),
        transaction_id: ''
      };

      if (formData.id) {
        await axios.put(`${apiUrl}/api/visitors/subscriptions/${formData.id}`, submissionData);
      } else {
        await axios.post(`${apiUrl}/api/visitors/subscriptions/`, submissionData);
      }

      await loadPageData({ refreshOnly: true });
      closeModal();
      setStatusModal({
        isOpen: true,
        type: 'success',
        title: t('common.success'),
        message: formData.id
          ? t('visitorSubscriptions.updateSuccess')
          : t('visitorSubscriptions.createSuccess')
      });
    } catch (err) {
      console.error(err);
      const serverMsg = err.response?.data?.error;
      if (serverMsg) {
        setFormError(serverMsg);
      } else if (err.message === 'Network Error') {
        setFormError(t('visitorSubscriptions.validation.networkError'));
      } else {
        setFormError(t('visitorSubscriptions.validation.unexpectedError'));
      }
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      await axios.delete(`${apiUrl}/api/visitors/subscriptions/${deleteConfirmId}`);
      setDeleteConfirmId(null);
      await loadPageData({ refreshOnly: true });
      setStatusModal({
        isOpen: true,
        type: 'success',
        title: t('common.delete'),
        message: t('visitorSubscriptions.deleteSuccess')
      });
    } catch (err) {
      console.error(err);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Delete Failed',
        message: 'Could not delete the subscription. Please check if the record exists.'
      });
      setDeleteConfirmId(null);
    }
  };

  const planNameById = useMemo(() => {
    const nextMap = new Map();
    plans.forEach((plan) => nextMap.set(String(plan.id), plan.name));
    return nextMap;
  }, [plans]);

  const enrichedVisitors = useMemo(
    () =>
      sortSubscriptionsNewestFirst(
        visitors.map((visitor) => ({
          ...visitor,
          statusMeta: getSubscriptionStatusMeta(visitor, currentTime),
          planName: planNameById.get(String(visitor.subscription_plan_id)) || 'Custom Plan'
        }))
      ),
    [visitors, planNameById, currentTime]
  );

  const searchMatchedVisitors = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return enrichedVisitors;
    }

    return enrichedVisitors.filter((visitor) => {
      const combinedText = [
        visitor.visitor_name,
        visitor.phone_number,
        visitor.planName,
        visitor.payment_status,
        normalizeSubscriptionPaymentMethod(visitor.payment_method),
        visitor.statusMeta.status,
        ...(visitor.vehicles || [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return combinedText.includes(normalizedSearch);
    });
  }, [enrichedVisitors, searchTerm]);

  const filteredVisitors = searchMatchedVisitors;

  const filteredMasterVisitors = useMemo(
    () =>
      masterVisitors.filter(
        (visitor) =>
          !visitorSearch ||
          visitor.visitor_name.toLowerCase().includes(visitorSearch.toLowerCase()) ||
          visitor.phone_number.includes(visitorSearch)
      ),
    [masterVisitors, visitorSearch]
  );

  return (
    <div className={`p-6 md:p-8 max-w-[1600px] mx-auto ${language === 'ar' ? 'rtl' : 'ltr'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className={`mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <div className={language === 'ar' ? 'text-right' : 'text-left'}>
          <h1 className="font-logo text-3xl font-black text-gray-900 tracking-wide">{t('visitorSubscriptions.title')}</h1>
          <p className="text-gray-500 mt-1 flex items-center font-medium">
            <ShieldCheck size={16} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} text-premium-gold`} />
            {t('visitorSubscriptions.subtitle')}
          </p>
        </div>
        <div className="flex gap-3 rtl:space-x-reverse">
          <button
            onClick={handleRefresh}
            className={`ripple-button px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 flex items-center transition-all shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-premium-black/20 ${isRefreshing ? 'animate-spin' : ''
              }`}
            title="Refresh list"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => openModal()}
            className="ripple-button px-6 py-2.5 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg hover:shadow-black/20 active:scale-95 flex items-center transition-all font-bold text-sm focus:outline-none focus:ring-2 focus:ring-premium-black/50 group"
          >
            <Plus size={18} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} group-hover:rotate-90 transition-transform text-premium-gold drop-shadow-sm`} />
            {t('visitorSubscriptions.manage')}
          </button>
        </div>
      </div>

      <div className="relative mb-6 group">
        <div className={`absolute inset-y-0 ${language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
          <Search size={18} className="text-gray-400 group-focus-within:text-premium-gold transition-colors" />
        </div>
        <input
          type="text"
          placeholder={t('visitorSubscriptions.searchPlaceholder')}
          className={`block w-full py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 placeholder-gray-400 ${language === 'ar' ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left'}`}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-md flex items-center shadow-sm">
          <AlertCircle size={20} className="mr-3" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-premium">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/80">
              <tr className={language === 'ar' ? 'flex-row-reverse' : ''}>
                <th className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('visitorSubscriptions.visitorInfo')}</th>
                <th className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('visitorSubscriptions.vehicleDetails')}</th>
                <th className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('visitorSubscriptions.planPayment')}</th>
                <th className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('visitorSubscriptions.dates')}</th>
                <th className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('visitorSubscriptions.status')}</th>
                <th className={`px-6 py-5 ${language === 'ar' ? 'text-left' : 'text-right'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('visitorSubscriptions.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-gray-500">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-premium-gold"></div>
                      <span className={`font-bold ${language === 'ar' ? 'mr-3' : 'ml-3'}`}>{t('visitorSubscriptions.loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredVisitors.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <Car size={48} className="text-gray-300 mb-3" />
                      <p className="text-lg font-medium text-gray-600">{t('visitorSubscriptions.noRecords')}</p>
                      <p className="text-sm">{t('visitorSubscriptions.adjustSearch')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVisitors.map((visitor) => {
                  const { status, paymentPending } = visitor.statusMeta;

                  return (
                    <tr key={visitor.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                          <div className="h-10 w-10 rounded-xl bg-premium-gold/10 flex items-center justify-center text-premium-gold font-black shadow-sm group-hover:bg-premium-gold group-hover:text-white transition-colors">
                            {(visitor.visitor_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className={`${language === 'ar' ? 'mr-4 text-right' : 'ml-4 text-left'}`}>
                            <div className="text-sm font-black text-gray-900 tracking-tight">{visitor.visitor_name}</div>
                            <div className={`space-y-1 ${language === 'ar' ? 'text-right' : ''}`}>
                              <div className="text-[11px] font-bold text-gray-500 tracking-wide">
                                <Phone size={12} className={`${language === 'ar' ? 'ml-1' : 'mr-1'} text-premium-gold`} /> {visitor.phone_number || '--'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {visitor.vehicles?.length ? (
                          <div className={`flex flex-wrap gap-2 ${language === 'ar' ? 'justify-end' : ''}`}>
                            {visitor.vehicles.map((vehicle, index) => (
                              <span
                                key={`${visitor.id}-${vehicle}-${index}`}
                                className={`inline-flex items-center px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-800 font-mono text-xs font-bold border border-gray-100 shadow-sm ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                              >
                                <Car size={12} className={`${language === 'ar' ? 'ml-1.5 text-premium-gold' : 'mr-1.5 text-premium-gold'}`} />
                                {vehicle}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className={`text-sm text-gray-400 font-bold ${language === 'ar' ? 'block text-right' : ''}`}>{t('visitorSubscriptions.noVehicles')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-bold text-gray-900 ${language === 'ar' ? 'text-right' : ''}`}>{visitor.planName}</div>
                        <div className={`text-xs mt-1 font-bold ${paymentPending ? 'text-amber-600' : 'text-green-600'} ${language === 'ar' ? 'text-right' : ''}`}>
                          {paymentPending ? t('visitorSubscriptionHistory.pending') : t('visitorSubscriptionHistory.paid')} - {visitor.amount_paid} {t('dashboard.omr')}
                        </div>
                        <div className={`text-xs font-semibold text-gray-500 mt-1 ${language === 'ar' ? 'text-right' : ''}`}>
                          {t(`visitorSubscriptions.paymentMethods.${visitor.payment_method?.toLowerCase()}`) || visitor.payment_method}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm text-gray-900 flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                          <CalendarDays size={14} className={`${language === 'ar' ? 'ml-2 text-green-500' : 'mr-2 text-green-500'}`} />
                          <span className="w-24 font-semibold">{formatDisplayDate(visitor.start_date)}</span>
                        </div>
                        <div className={`text-xs text-gray-400 mt-0.5 font-medium ${language === 'ar' ? 'mr-6 text-right' : 'ml-6 text-left'}`}>{visitor.statusMeta.startText}</div>
                        <div className={`text-sm text-gray-500 flex items-center mt-1.5 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                          <CalendarDays size={14} className={`${language === 'ar' ? 'ml-2 text-red-400' : 'mr-2 text-red-400'}`} />
                          <span className="w-24 font-semibold">{formatDisplayDate(visitor.end_date)}</span>
                        </div>
                        <div className={`text-xs mt-0.5 font-medium ${language === 'ar' ? 'mr-6 text-right' : 'ml-6 text-left'} ${status === 'Expired' ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                          {visitor.statusMeta.expiryText}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${statusBadgeClassName[status] || statusBadgeClassName.Inactive
                              } ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                          >
                            <ShieldCheck size={12} className={language === 'ar' ? 'ml-1' : 'mr-1'} />
                            {t(`visitorSubscriptionHistory.filters.${filterKeyMap[status] || 'inactive'}`)}
                          </span>
                          {paymentPending && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700">
                              {t('visitorSubscriptions.pendingPayment')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-left' : 'text-right'} text-sm font-medium`}>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openModal(visitor)}
                            className="p-2 text-gray-400 hover:text-premium-gold hover:bg-premium-gold/10 rounded-xl transition-all active:scale-95 focus:outline-none"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(visitor.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95 focus:outline-none"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={closeModal}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all sm:my-8 flex flex-col max-h-[90vh]">
            <div className={`px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <h2 className={`text-xl font-bold text-gray-900 flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                {formData.id ? (
                  <>
                    <Edit2 size={20} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} text-[#121212]`} /> {t('visitorSubscriptions.editTitle')}
                  </>
                ) : (
                  <>
                    <Plus size={20} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} text-[#121212]`} /> {t('visitorSubscriptions.newTitle')}
                  </>
                )}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-[#121212] transition-colors focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>

            <form id="visitorForm" onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
              {formError && (
                <div className={`p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-start font-semibold ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <AlertCircle size={18} className={`${language === 'ar' ? 'ml-2.5' : 'mr-2.5'} mt-0.5 flex-shrink-0`} />
                  <span className={language === 'ar' ? 'text-right' : ''}>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2 space-y-4">
                  <div>
                    <label className={`block text-sm font-semibold text-gray-700 mb-1.5 ${language === 'ar' ? 'text-right' : ''}`}>{language === 'ar' ? 'اسم الزائر' : 'Visitor Name'}</label>
                    <input
                      type="text"
                      placeholder="Visitor Name"
                      value={formData.visitor_name || ''}
                      onChange={(event) => {
                        setFormData({ ...formData, visitor_name: event.target.value });
                      }}
                      className={`block w-full py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#121212] focus:border-[#121212] focus:bg-white transition-all text-sm font-medium text-gray-900 shadow-sm px-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold text-gray-700 mb-1.5 ${language === 'ar' ? 'text-right' : ''}`}>Phone Number</label>
                    <input
                      type="text"
                      placeholder="Phone Number"
                      value={formData.phone_number || ''}
                      onChange={(event) => {
                        setFormData({ ...formData, phone_number: event.target.value });
                      }}
                      className={`block w-full py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#121212] focus:border-[#121212] focus:bg-white transition-all text-sm font-medium text-gray-900 shadow-sm px-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 border-t border-gray-100 pt-5 mt-2">
                  <div className="flex justify-between items-center mb-3">
                    <label className={`block text-sm font-bold text-gray-800 uppercase tracking-wider ${language === 'ar' ? 'text-right' : ''}`}>{t('visitorSubscriptions.vehicleDetails')}</label>
                    <button
                      type="button"
                      onClick={addVehicleField}
                      className="text-[#121212] hover:text-black text-xs font-bold flex items-center focus:outline-none transition-colors"
                    >
                      <Plus size={14} className={language === 'ar' ? 'ml-1' : 'mr-1'} />
                      {language === 'ar' ? 'إضافة مركبة' : 'Add Vehicle'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.vehicles.map((vehicle, index) => (
                      <div key={index} className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <div className="relative flex-grow">
                          <Car className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} size={16} />
                          <input
                            type="text"
                            value={vehicle}
                            onChange={(e) => handleVehicleChange(index, e.target.value)}
                            placeholder={language === 'ar' ? 'رقم اللوحة' : 'Plate Number'}
                            className={`block w-full py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#121212] focus:border-[#121212] focus:bg-white transition-all text-sm font-bold text-gray-900 shadow-sm uppercase ${language === 'ar' ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3 text-left'}`}
                          />
                        </div>
                        {formData.vehicles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVehicleField(index)}
                            className="p-3 text-red-500 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-all focus:outline-none flex-shrink-0"
                          >
                            <Trash size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className={`block text-sm font-semibold text-gray-700 mb-1.5 ${language === 'ar' ? 'text-right' : ''}`}>{t('visitorSubscriptions.planPayment')}</label>
                  <select
                    name="subscription_plan_id"
                    value={formData.subscription_plan_id || ''}
                    onChange={handlePlanSelect}
                    className={`block w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#121212] focus:border-[#121212] focus:bg-white transition-all text-sm font-semibold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : ''}`}
                  >
                    <option value="">{t('visitorSubscriptions.selectPlan')}</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} ({plan.vehicle_type === 'Car' ? t('dashboard.car') : (plan.vehicle_type === 'Bike' ? t('dashboard.bike') : plan.vehicle_type)}) - {plan.price} {t('dashboard.omr')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-semibold text-gray-700 mb-1.5 ${language === 'ar' ? 'text-right' : ''}`}>{t('visitorSubscriptions.startDate')}</label>
                  <input
                    required
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    className={`block w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#121212] focus:border-[#121212] focus:bg-white transition-all text-sm font-semibold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : ''}`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-semibold text-gray-700 mb-1.5 ${language === 'ar' ? 'text-right' : ''}`}>{t('visitorSubscriptions.endDate')}</label>
                  <input
                    required
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    className={`block w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#121212] focus:border-[#121212] focus:bg-white transition-all text-sm font-semibold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : ''}`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-semibold text-gray-700 mb-1.5 ${language === 'ar' ? 'text-right' : ''}`}>{t('visitorSubscriptions.allocatedSlots')}</label>
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    name="allocated_slots"
                    value={formData.allocated_slots}
                    onChange={handleInputChange}
                    className={`block w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#121212] focus:border-[#121212] focus:bg-white transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : ''}`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-semibold text-gray-700 mb-1.5 ${language === 'ar' ? 'text-right' : ''}`}>{t('visitorSubscriptions.status')}</label>
                  <select
                    name="status"
                    value={formData.status || 'active'}
                    onChange={handleInputChange}
                    className={`block w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#121212] focus:border-[#121212] focus:bg-white transition-all text-sm font-semibold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : ''}`}
                  >
                    <option value="active">{t('visitorSubscriptions.active')}</option>
                    <option value="inactive">{t('visitorSubscriptions.inactive')}</option>
                  </select>
                </div>

                <div className="sm:col-span-2 border-t border-gray-100 pt-5 mt-2">
                  <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">{t('visitorSubscriptions.paymentDetails')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={`block text-sm font-semibold text-gray-700 mb-1.5 ${language === 'ar' ? 'text-right' : ''}`}>{t('visitorSubscriptions.amount')}</label>
                      <input
                        readOnly
                        type="text"
                        name="amount_paid"
                        value={formData.amount_paid}
                        className={`block w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 shadow-sm ${language === 'ar' ? 'text-right' : ''}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold text-gray-700 mb-1.5 ${language === 'ar' ? 'text-right' : ''}`}>{t('visitorSubscriptions.paymentStatus')}</label>
                      <select
                        name="payment_status"
                        value={formData.payment_status}
                        onChange={handleInputChange}
                        className={`block w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#121212] focus:border-[#121212] focus:bg-white transition-all text-sm font-semibold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : ''}`}
                      >
                        <option value="Paid">{t('visitorSubscriptions.paid')}</option>
                        <option value="Pending">{t('visitorSubscriptions.pending')}</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold text-gray-700 mb-1.5 ${language === 'ar' ? 'text-right' : ''}`}>{t('visitorSubscriptions.paymentMethod')}</label>
                      <select
                        name="payment_method"
                        value={normalizeSubscriptionPaymentMethod(formData.payment_method)}
                        onChange={handleInputChange}
                        className={`block w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#121212] focus:border-[#121212] focus:bg-white transition-all text-sm font-semibold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : ''}`}
                      >
                        {SUBSCRIPTION_PAYMENT_METHOD_OPTIONS.map((method) => (
                          <option key={method} value={method}>
                            {method === 'Cash' ? t('dashboard.cash') : method === 'Card' ? t('dashboard.card') : method === 'Online' ? t('dashboard.online') : method}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold text-gray-700 mb-1.5 ${language === 'ar' ? 'text-right' : ''}`}>{t('visitorSubscriptions.paymentDate')}</label>
                      <input
                        type="date"
                        name="payment_date"
                        value={formData.payment_date}
                        onChange={handleInputChange}
                        className={`block w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#121212] focus:border-[#121212] focus:bg-white transition-all text-sm font-semibold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </form>

            <div className={`p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white flex-shrink-0 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#121212]/20"
              >
                {t('visitor.cancel')}
              </button>
              <button
                type="submit"
                form="visitorForm"
                className="px-5 py-2.5 bg-gradient-to-r from-[#121212] to-[#2a2a2a] text-white rounded-xl hover:from-black hover:to-[#1a1a1a] shadow-md active:scale-95 font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#121212]/50"
              >
                {formData.id ? t('visitor.saveChanges') : t('visitor.createVisitor')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50 mb-6">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('visitorSubscriptionHistory.deleteTitle')}</h3>
            <p className="text-sm text-gray-500 mb-6">
              {t('visitorSubscriptionHistory.deleteConfirm')}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteConfirmId(null)} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#121212]/20">{t('visitor.cancel')}</button>
              <button onClick={confirmDelete} className="px-5 py-2.5 bg-red-600 text-white font-semibold text-sm rounded-xl hover:bg-red-700 shadow-md active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-red-600/50">{t('visitor.delete')}</button>
            </div>
          </div>
        </div>
      )}

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

export default VisitorVehicles;

