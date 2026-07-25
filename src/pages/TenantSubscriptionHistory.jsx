import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  CalendarDays,
  Car,
  ChevronLeft,
  ChevronRight,
  History,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck
} from 'lucide-react';
import {
  buildSubscriptionSummary,
  getSubscriptionStatusMeta,
  matchesSubscriptionFilter,
  parseSubscriptionDate,
  sortSubscriptionsNewestFirst,
  subscriptionStatusFilters
} from '../utils/subscriptionStatus';
import { API_BASE_URL } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

const TENANT_MASTER_UPDATED_EVENT = 'tenant-master-updated';
const SUBSCRIPTION_PAYMENT_METHOD_OPTIONS = ['Cash', 'Card', 'Online'];

const normalizeSubscriptionPaymentMethod = (value) => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  const matchedMethod = SUBSCRIPTION_PAYMENT_METHOD_OPTIONS.find(
    (option) => option.toLowerCase() === normalizedValue
  );

  return matchedMethod || 'Card';
};

const formatCurrency = (value, t) => `${Number(value || 0).toFixed(3)} ${t('dashboard.omr')}`;

const formatDate = (value) => {
  const parsedDate = parseSubscriptionDate(value);
  return parsedDate ? parsedDate.toLocaleDateString() : '--';
};

const formatDateTime = (value) => {
  if (!value) return '--';
  const normalizedValue =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) && !/[zZ]|[+-]\d{2}:\d{2}$/.test(value)
      ? `${value}Z`
      : value;
  const parsedDate = new Date(normalizedValue);
  if (Number.isNaN(parsedDate.getTime())) return value;
  return parsedDate.toLocaleString([], {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  });
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

const TenantSubscriptionHistory = () => {
  const { t, language } = useLanguage();
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [masterTenants, setMasterTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const apiUrl = API_BASE_URL;

  const loadHistoryData = async ({ refreshOnly = false } = {}) => {
    if (refreshOnly) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [subscriptionsResponse, plansResponse, tenantsResponse] = await Promise.all([
        axios.get(`${apiUrl}/api/tenants/subscriptions/`),
        axios.get(`${apiUrl}/api/pricing/`),
        axios.get(`${apiUrl}/api/tenants/`)
      ]);

      const subscriptionData = Array.isArray(subscriptionsResponse.data) ? subscriptionsResponse.data : [];
      const pricingData = Array.isArray(plansResponse.data) ? plansResponse.data : [];
      const tenantData = Array.isArray(tenantsResponse.data) ? tenantsResponse.data : [];

      setSubscriptions(subscriptionData);
      setPlans(pricingData.filter((plan) => plan.pricing_type === 'Tenant Subscription'));
      setMasterTenants(tenantData);
      setError('');
    } catch (err) {
      setError(t('tenantSubscriptions.validation.fetchError'));
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistoryData();
  }, []);

  useEffect(() => {
    const handleTenantMasterUpdate = () => {
      loadHistoryData({ refreshOnly: true });
    };

    window.addEventListener(TENANT_MASTER_UPDATED_EVENT, handleTenantMasterUpdate);
    return () => window.removeEventListener(TENANT_MASTER_UPDATED_EVENT, handleTenantMasterUpdate);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  const historyRows = useMemo(() => {
    const enrichedRows = subscriptions.map((subscription) => {
      const matchedPlan = plans.find((plan) => String(plan.id) === String(subscription.subscription_plan_id));
      const matchedTenant = masterTenants.find((tenant) => tenant.id === subscription.tenant_id);
      const statusMeta = getSubscriptionStatusMeta(subscription, currentTime, t);

      return {
        ...subscription,
        ...statusMeta,
        planName: matchedPlan?.name || t('tenantSubscriptionHistory.customPlan'),
        vehicleType: matchedPlan?.vehicle_type || t('tenantSubscriptionHistory.vehicleTypeNotSet'),
        tenantType: matchedTenant?.tenant_type || t('tenantSubscriptionHistory.tenant'),
        house_number: subscription.house_number || matchedTenant?.house_number || '',
        block: subscription.block || matchedTenant?.block || ''
      };
    });

    return sortSubscriptionsNewestFirst(enrichedRows);
  }, [subscriptions, plans, masterTenants, currentTime]);

  const searchMatchedRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return historyRows;
    }

    return historyRows.filter((row) => {
      const combinedText = [
        row.tenant_name,
        row.phone_number,
        row.house_number,
        row.block,
        row.planName,
        row.vehicleType,
        row.tenantType,
        row.payment_status,
        row.transaction_id,
        normalizeSubscriptionPaymentMethod(row.payment_method),
        row.status,
        ...(row.vehicles || [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return combinedText.includes(normalizedSearch);
    });
  }, [historyRows, searchTerm]);

  const summary = useMemo(() => buildSubscriptionSummary(searchMatchedRows), [searchMatchedRows]);

  const statusCounts = useMemo(
    () => ({
      All: searchMatchedRows.length,
      Active: summary.active,
      Expired: summary.expired,
      Scheduled: summary.scheduled,
      Inactive: summary.inactive,
      'Pending Payment': summary.pending
    }),
    [searchMatchedRows.length, summary]
  );

  const filteredSubscriptions = useMemo(() => {
    return searchMatchedRows.filter((row) => matchesSubscriptionFilter(row, statusFilter));
  }, [searchMatchedRows, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, rowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredSubscriptions.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedSubscriptions = filteredSubscriptions.slice(startIndex, endIndex);

  return (
    <div className={`p-6 md:p-8 max-w-[1600px] mx-auto ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className={`mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <div className={language === 'ar' ? 'text-right' : 'text-left'}>
          <h1 className="font-logo text-3xl font-black text-gray-900 tracking-wide">{t('tenantSubscriptionHistory.title')}</h1>
          <p className="text-gray-500 mt-1 flex items-center font-medium">
            <History size={16} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} text-premium-gold`} />
            {t('tenantSubscriptionHistory.subtitle')}
          </p>
        </div>
        <button
          onClick={() => loadHistoryData({ refreshOnly: true })}
          className={`ripple-button px-5 py-3 bg-white border border-gray-100 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 flex items-center transition-all shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-premium-black/20 ${isRefreshing ? 'animate-spin text-premium-gold' : ''}`}
          title={t('common.refresh')}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-6 mb-8 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <div className={`premium-card p-5 group ${language === 'ar' ? 'text-right' : 'text-left'}`}>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('tenantSubscriptionHistory.totalRecords')}</p>
          <p className="mt-3 text-3xl font-black text-gray-900 group-hover:text-premium-gold transition-colors">{summary.total}</p>
        </div>
        <div className={`premium-card p-5 group ${language === 'ar' ? 'text-right' : 'text-left'}`}>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('tenantSubscriptionHistory.active')}</p>
          <p className="mt-3 text-3xl font-black text-green-600 drop-shadow-sm">{summary.active}</p>
        </div>
        <div className={`premium-card p-5 group ${language === 'ar' ? 'text-right' : 'text-left'}`}>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('tenantSubscriptionHistory.expired')}</p>
          <p className="mt-3 text-3xl font-black text-red-500 drop-shadow-sm">{summary.expired}</p>
        </div>
        <div className={`premium-card p-5 group ${language === 'ar' ? 'text-right' : 'text-left'}`}>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('tenantSubscriptionHistory.scheduled')}</p>
          <p className="mt-3 text-3xl font-black text-premium-gold drop-shadow-sm">{summary.scheduled}</p>
        </div>
        <div className={`premium-card p-5 group ${language === 'ar' ? 'text-right' : 'text-left'}`}>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('tenantSubscriptionHistory.inactive')}</p>
          <p className="mt-3 text-3xl font-black text-gray-700">{summary.inactive}</p>
        </div>
        <div className={`premium-card p-5 group ${language === 'ar' ? 'text-right' : 'text-left'}`}>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('tenantSubscriptionHistory.pendingPayment')}</p>
          <p className="mt-3 text-3xl font-black text-amber-500 drop-shadow-sm">{summary.pending}</p>
        </div>
      </div>

      <div className={`relative mb-6 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
        <div className={`absolute inset-y-0 ${language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
          <Search size={18} className="text-premium-gold" />
        </div>
        <input
          type="text"
          placeholder={t('tenantSubscriptionHistory.searchPlaceholder')}
          className={`block w-full py-4 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 placeholder-gray-400 shadow-sm ${language === 'ar' ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left'}`}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className={`flex flex-wrap gap-3 mb-8 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        {subscriptionStatusFilters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setStatusFilter(filter)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border focus:outline-none shadow-sm ${statusFilter === filter
                ? 'bg-gradient-to-r from-premium-black to-[#1a1a1a] text-premium-gold border-premium-black shadow-md'
                : 'bg-white text-gray-600 border-gray-100 hover:border-premium-gold/30 hover:text-premium-black'
              }`}
          >
            {t(`tenantSubscriptionHistory.filters.${filterKeyMap[filter] || 'all'}`)} <span className={`inline-flex items-center justify-center min-w-[20px] h-[20px] text-[10px] rounded-full ml-1 ${statusFilter === filter ? 'bg-premium-gold/20 text-premium-gold' : 'bg-gray-100 text-gray-500'}`}>{statusCounts[filter] ?? 0}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50/80 border-l-4 border-red-500 text-red-700 rounded-r-xl flex items-center shadow-sm">
          <AlertCircle size={20} className="mr-3 flex-shrink-0" />
          <p className="font-bold tracking-wide text-sm">{error}</p>
        </div>
      )}

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/80">
              <tr className={language === 'ar' ? 'flex-row-reverse' : ''}>
                <th className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('tenantSubscriptionHistory.tenantInfo')}</th>
                <th className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('tenantSubscriptionHistory.vehicles')}</th>
                <th className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('tenantSubscriptionHistory.plan')}</th>
                <th className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('tenantSubscriptionHistory.period')}</th>
                <th className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('tenantSubscriptionHistory.status')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-premium-gold border-t-transparent"></div>
                      <span className={`font-bold tracking-wide ${language === 'ar' ? 'mr-3' : 'ml-3'}`}>{t('tenantSubscriptionHistory.loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center">
                      <History size={48} className="text-gray-200 mb-4" />
                      <p className="text-lg font-bold text-gray-500 tracking-wide">{t('tenantSubscriptionHistory.noRecords')}</p>
                      <p className="text-sm font-semibold">{t('tenantSubscriptionHistory.adjustFilters')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedSubscriptions.map((row) => (
                  <tr key={row.id} className={`hover:bg-gray-50/50 transition-colors group ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <div className="h-10 w-10 rounded-xl bg-premium-gold/10 flex items-center justify-center text-premium-gold font-black shadow-sm group-hover:bg-premium-gold group-hover:text-white transition-colors">
                          {(row.tenant_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className={`${language === 'ar' ? 'mr-4 text-right' : 'ml-4 text-left'}`}>
                          <div className="text-sm font-black text-gray-900 tracking-tight">{row.tenant_name}</div>
                          <div className={`text-sm text-gray-500 flex items-center mt-0.5 font-medium ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                            <Phone size={12} className={`${language === 'ar' ? 'ml-1' : 'mr-1'} text-premium-gold`} /> {row.phone_number || '--'}
                          </div>
                          <div className="text-xs font-bold text-gray-400 mt-1">
                            {t('tenantSubscriptions.houseNo')} {row.house_number || '--'} | {t('tenantSubscriptions.block')} {row.block || '--'}
                          </div>
                          <div className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-wider">{row.tenantType === 'Staff' ? t('dashboard.staff') : t('dashboard.tenant')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {row.vehicles?.length ? (
                        <div className={`flex flex-wrap gap-2 ${language === 'ar' ? 'justify-end' : ''}`}>
                          {row.vehicles.map((vehicle, index) => (
                            <span
                              key={`${row.id}-${vehicle}-${index}`}
                              className={`inline-flex items-center px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-800 font-mono text-xs font-bold border border-gray-100 shadow-sm ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                            >
                              <Car size={12} className={`${language === 'ar' ? 'ml-1.5 text-premium-gold' : 'mr-1.5 text-premium-gold'}`} />
                              {vehicle}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className={`text-sm text-gray-400 font-bold ${language === 'ar' ? 'block text-right' : ''}`}>{t('tenantSubscriptions.noVehicles')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-bold text-gray-900 ${language === 'ar' ? 'text-right' : ''}`}>{row.planName}</div>
                      <div className={`text-xs mt-1 font-bold ${row.paymentPending ? 'text-amber-600' : 'text-green-600'} ${language === 'ar' ? 'text-right' : ''}`}>
                        {row.paymentPending ? t('tenantSubscriptionHistory.pending') : t('tenantSubscriptionHistory.paid')} - {formatCurrency(row.amount_paid, t)}
                      </div>
                      <div className={`text-xs font-semibold text-gray-500 mt-1 ${language === 'ar' ? 'text-right' : ''}`}>
                        {t(`tenantSubscriptions.paymentMethods.${row.payment_method?.toLowerCase()}`) || row.payment_method}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm text-gray-900 flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <CalendarDays size={14} className={`${language === 'ar' ? 'ml-2 text-green-500' : 'mr-2 text-green-500'}`} />
                        <span className="w-24 font-semibold">{formatDate(row.start_date)}</span>
                      </div>
                      <div className={`text-xs text-gray-400 mt-0.5 font-medium ${language === 'ar' ? 'mr-6 text-right' : 'ml-6 text-left'}`}>{row.startText}</div>
                      <div className={`text-sm text-gray-500 flex items-center mt-1.5 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <CalendarDays size={14} className={`${language === 'ar' ? 'ml-2 text-red-400' : 'mr-2 text-red-400'}`} />
                        <span className="w-24 font-semibold">{formatDate(row.end_date)}</span>
                      </div>
                      <div className={`text-xs mt-0.5 font-medium ${language === 'ar' ? 'mr-6 text-right' : 'ml-6 text-left'} ${row.status === 'Expired' ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                        {row.expiryText}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${statusBadgeClassName[row.status] || statusBadgeClassName.Inactive
                            } ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                        >
                          <ShieldCheck size={12} className={language === 'ar' ? 'ml-1' : 'mr-1'} />
                          {t(`tenantSubscriptionHistory.filters.${filterKeyMap[row.status] || 'inactive'}`)}
                        </span>
                        {row.paymentPending && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700">
                            {t('tenantSubscriptions.pendingPayment')}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredSubscriptions.length > 0 && (
          <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-6 py-4 border-t border-gray-100 bg-white ${language === 'ar' ? 'lg:flex-row-reverse' : ''}`}>
            <div className="text-sm font-bold text-gray-500">
              {t('tenantSubscriptionHistory.showing')} {startIndex + 1} {t('tenantSubscriptionHistory.to')} {Math.min(endIndex, filteredSubscriptions.length)} {t('tenantSubscriptionHistory.of')} {filteredSubscriptions.length} {t('tenantSubscriptionHistory.records')}
            </div>

            <div className={`flex flex-col sm:flex-row sm:items-center gap-4 ${language === 'ar' ? 'sm:flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <label htmlFor="rows-per-page" className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  {t('tenantSubscriptionHistory.rowsPerPage')}
                </label>
                <select
                  id="rows-per-page"
                  value={rowsPerPage}
                  onChange={(event) => setRowsPerPage(Number(event.target.value))}
                  className="px-3 py-2 border border-gray-100 rounded-xl bg-gray-50 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold"
                >
                  {[10, 25, 50].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={safeCurrentPage === 1}
                  className={`inline-flex items-center px-4 py-2 rounded-xl border border-gray-100 bg-white text-sm font-bold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:border-premium-gold/30 hover:text-premium-black focus:outline-none transition-all shadow-sm ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                >
                  <ChevronLeft size={16} className={language === 'ar' ? 'ml-1 rotate-180' : 'mr-1'} />
                  {t('tenantSubscriptionHistory.prev')}
                </button>
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">
                  {t('tenantSubscriptionHistory.page')} {safeCurrentPage} {t('tenantSubscriptionHistory.outOf')} {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={safeCurrentPage === totalPages}
                  className={`inline-flex items-center px-4 py-2 rounded-xl border border-gray-100 bg-white text-sm font-bold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:border-premium-gold/30 hover:text-premium-black focus:outline-none transition-all shadow-sm ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                >
                  {t('tenantSubscriptionHistory.next')}
                  <ChevronRight size={16} className={language === 'ar' ? 'mr-1 rotate-180' : 'ml-1'} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantSubscriptionHistory;
