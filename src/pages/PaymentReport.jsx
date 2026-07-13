import React, { useState, useEffect } from 'react';
import { Download, Calendar, FileText, Filter, Search, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Printer, CreditCard, DollarSign } from 'lucide-react';
import { formatAppDateTime, parseBackendDate } from '../utils/dateTime';
import { apiUrl } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

// Treat backend timestamp strings (no timezone suffix) as UTC before computing diff.
const computeDuration = (entryTimeStr, exitTimeStr, t = (s) => s) => {
  if (!entryTimeStr) return '-';
  const entry = parseBackendDate(entryTimeStr);
  const exit = exitTimeStr ? parseBackendDate(exitTimeStr) : new Date();
  if (isNaN(entry)) return '-';
  const diffMs = exit - entry;
  if (diffMs < 0) return `0${t('durations.hourShort')} 0${t('durations.minuteShort')}`;
  const hrs = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hrs}${t('durations.hourShort')} ${mins}${t('durations.minuteShort')}`;
};

const normalizePaymentStatusKey = (status) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const statusKeyMap = {
    paid: 'paid',
    unpaid: 'unpaid',
    'not paid': 'unpaid',
    pending: 'pending',
    waived: 'waiver',
    waiver: 'waiver'
  };

  return statusKeyMap[normalizedStatus] || normalizedStatus.replace(/\s+/g, '');
};

const normalizePaymentModeKey = (mode) => {
  const normalizedMode = String(mode || '').trim().toLowerCase();
  const modeKeyMap = {
    cash: 'cash',
    card: 'card',
    upi: 'upi',
    wallet: 'wallet',
    waived: 'waiver',
    waiver: 'waiver'
  };

  return modeKeyMap[normalizedMode] || normalizedMode.replace(/\s+/g, '');
};

const PaymentReport = () => {
  const { t, language } = useLanguage();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleNumberFilter, setVehicleNumberFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all'); // visitor, tenant, all
  const [sortField, setSortField] = useState('entryTime');
  const [sortDirection, setSortDirection] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [tick, setTick] = useState(0); // live duration refresh

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchPaymentReports = async () => {
    try {
      setLoading(true);
      let url = apiUrl(`/api/vehicles/reports?search=${encodeURIComponent(searchTerm)}&payment_type=${paymentTypeFilter}`);
      if (dateRange.start) url += `&start_date=${dateRange.start}`;
      if (dateRange.end) url += `&end_date=${dateRange.end}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch payment reports');
      const data = await response.json();
      setReportData(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching payment reports:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentReports();
  }, [searchTerm, dateRange, paymentTypeFilter]);

  // Tick every 60 s so live durations (vehicles still inside) update automatically
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, dateRange, vehicleNumberFilter, paymentStatusFilter, paymentModeFilter, staffFilter, sortField, sortDirection, paymentTypeFilter]);

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const filteredData = reportData.filter(vehicle => {
    if (vehicleNumberFilter && !vehicle.vehicleNumber.toLowerCase().includes(vehicleNumberFilter.toLowerCase())) return false;
    if (paymentStatusFilter !== 'all' && vehicle.paymentStatus.toLowerCase() !== paymentStatusFilter.toLowerCase()) return false;
    if (paymentModeFilter !== 'all' && vehicle.paymentMode.toLowerCase() !== paymentModeFilter.toLowerCase()) return false;
    if (staffFilter !== 'all' && vehicle.collectedBy !== staffFilter) return false;
    return true;
  }).sort((a, b) => {
    let valueA = a[sortField], valueB = b[sortField];
    if (sortField === 'entryTime' || sortField === 'exitTime') {
      valueA = a[sortField] ? parseBackendDate(a[sortField]).getTime() : 0;
      valueB = b[sortField] ? parseBackendDate(b[sortField]).getTime() : 0;
    } else if (sortField === 'paymentAmount') {
      valueA = a[sortField] === '-' ? -Infinity : parseFloat(a[sortField]);
      valueB = b[sortField] === '-' ? -Infinity : parseFloat(b[sortField]);
    }
    return sortDirection === 'asc' ? (valueA > valueB ? 1 : -1) : (valueA < valueB ? 1 : -1);
  });

  const totalTransactions = filteredData.filter(v => v.paymentStatus !== 'Pending').length;
  const totalCollected = filteredData.filter(v => v.paymentAmount !== '-').reduce((sum, v) => sum + parseFloat(v.paymentAmount || 0), 0).toFixed(3);

  const uniquePaymentStatuses = ['all', ...new Set(reportData.map(v => v.paymentStatus))];
  const uniquePaymentModes = ['all', ...new Set(reportData.map(v => v.paymentMode).filter(mode => mode && mode !== '-'))];
  const uniqueStaffMembers = ['all', ...new Set(reportData.map(v => v.collectedBy).filter(staff => staff && staff !== '-'))];

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  const handleDownload = (format) => {
    let content = "";
    let filename = `payment_report_${new Date().toISOString().slice(0, 10)}`;
    let mimeType = "";
    const header = `${t('paymentReports.serialNumber')},${t('paymentReports.vehicleNumber')},${t('paymentReports.entryTime')},${t('paymentReports.exitTime')},${t('paymentReports.duration')},${t('paymentReports.paymentAmount')},${t('paymentReports.paymentStatus')},${t('paymentReports.paymentMode')},${t('paymentReports.collectedBy')}\n`;
    const dataToExport = filteredData.map((v, index) => {
      const duration = v.exitTime
        ? (v.duration || computeDuration(v.entryTime, v.exitTime, t))
        : computeDuration(v.entryTime, null, t);
      return [index + 1, v.vehicleNumber, v.entryTime, v.exitTime || '-', duration, v.paymentAmount, v.paymentStatus, v.paymentMode, v.collectedBy];
    });

    if (format === 'pdf') {
      content = t('paymentReports.title') + "\n" + t('common.date') + ": " + new Date().toLocaleDateString() + "\n\n" + header.replace(/,/g, " | ") + "-".repeat(header.length * 1.5) + "\n";
      dataToExport.forEach(row => { content += row.join(" | ") + "\n"; });
      filename += ".txt"; mimeType = 'text/plain';
    } else if (format === 'excel') {
      content = header;
      dataToExport.forEach(row => { content += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",") + "\n"; });
      filename += ".csv"; mimeType = 'text/csv;charset=utf-8;';
    }
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  const getPaymentStatusLabel = (status) => {
    const statusKey = normalizePaymentStatusKey(status);
    const translatedStatus = t(`paymentReports.status.${statusKey}`);
    return translatedStatus === `paymentReports.status.${statusKey}` ? status : translatedStatus;
  };

  const getPaymentStatusBadge = (status) => {
    const statusKey = normalizePaymentStatusKey(status);
    const colors = { 'paid': 'bg-green-100 text-green-800', 'unpaid': 'bg-red-100 text-primary-red', 'pending': 'bg-yellow-100 text-yellow-800', 'waiver': 'bg-purple-100 text-purple-800' };
    return <span className={`px-2 py-1 text-xs rounded-full ${colors[statusKey] || 'bg-gray-100 text-gray-800'}`}>{getPaymentStatusLabel(status)}</span>;
  };
  const getPaymentModeBadge = (mode) => {
    if (mode === '-') return '-';
    const modeKey = normalizePaymentModeKey(mode);
    const colors = { 'cash': 'bg-green-100 text-green-800', 'card': 'bg-blue-100 text-primary-blue', 'upi': 'bg-purple-100 text-purple-800', 'wallet': 'bg-orange-100 text-orange-800', 'waiver': 'bg-gray-100 text-gray-800' };
    const translatedMode = t(`paymentReports.mode.${modeKey}`);
    return <span className={`px-2 py-1 text-xs rounded-full ${colors[modeKey] || 'bg-gray-100 text-gray-800'}`}>{translatedMode === `paymentReports.mode.${modeKey}` ? mode : translatedMode}</span>;
  };

  return (
    <div className={`p-6 md:p-8 max-w-[1600px] mx-auto ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className={`mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <div className={language === 'ar' ? 'text-right' : 'text-left'}>
          <h1 className="font-logo text-3xl font-black text-gray-900 tracking-wide">{t('paymentReports.title')}</h1>
          <p className="text-gray-500 mt-1 font-medium">{t('paymentReports.subtitle')}</p>
        </div>
        <div className="flex space-x-3 rtl:space-x-reverse">
          <button className={`ripple-button px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 flex items-center transition-all shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-premium-black/20 ${language === 'ar' ? 'ml-2' : ''}`} onClick={handlePrint}><Printer size={18} className={language === 'ar' ? 'ml-2' : 'mr-2 text-premium-gold'} />{t('pricing.print')}</button>
          <button className="ripple-button px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 flex items-center transition-all shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-premium-black/20" onClick={() => handleDownload('pdf')}><Download size={18} className={language === 'ar' ? 'ml-2' : 'mr-2 text-premium-gold'} />{t('reports.downloadPdf')}</button>
          <button className="ripple-button px-5 py-2.5 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg hover:shadow-black/20 active:scale-95 flex items-center transition-all font-bold text-sm focus:outline-none focus:ring-2 focus:ring-premium-black/50 group" onClick={() => handleDownload('excel')}><FileText size={18} className={language === 'ar' ? 'ml-2' : 'mr-2 text-premium-gold drop-shadow-sm group-hover:scale-110 transition-transform'} />{t('reports.exportExcel')}</button>
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <div className={`premium-card p-6 flex items-center relative overflow-hidden group ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-premium-gold/5 rounded-full blur-2xl pointer-events-none group-hover:bg-premium-gold/10 transition-colors"></div>
          <div className={`p-4 rounded-xl bg-premium-black/5 border border-premium-black/10 shadow-inner ${language === 'ar' ? 'ml-5' : 'mr-5'}`}><CreditCard size={28} className="text-premium-black" /></div>
          <div className={`relative z-10 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{t('paymentReports.totalTransactions')}</p>
            <p className="text-4xl font-black text-gray-900 tracking-tight">{totalTransactions}</p>
          </div>
        </div>
        <div className={`premium-card p-6 flex items-center relative overflow-hidden group ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-premium-gold/5 rounded-full blur-2xl pointer-events-none group-hover:bg-premium-gold/10 transition-colors"></div>
          <div className={`p-4 rounded-xl bg-premium-gold/10 border border-premium-gold/20 shadow-inner ${language === 'ar' ? 'ml-5' : 'mr-5'}`}><DollarSign size={28} className="text-premium-gold" /></div>
          <div className={`relative z-10 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{t('paymentReports.totalCollected')}</p>
            <p className="text-4xl font-black text-gradient-gold drop-shadow-sm">{totalCollected} <span className="text-base text-gray-500 font-bold ml-1 uppercase tracking-widest">{t('dashboard.omr')}</span></p>
          </div>
        </div>
      </div>

      <div className="premium-card p-6 md:p-8 mb-6 overflow-hidden">
        <div className={`flex flex-col md:flex-row gap-4 mb-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
          <div className="relative flex-grow group">
            <div className={`absolute inset-y-0 flex items-center pointer-events-none ${language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'}`}><Search size={18} className="text-gray-400 group-focus-within:text-premium-gold transition-colors" /></div>
            <input type="text" className={`block w-full py-3.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold focus:bg-white transition-all text-sm font-bold text-gray-900 placeholder-gray-400 shadow-sm ${language === 'ar' ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`} placeholder={t('common.search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button className="ripple-button flex items-center px-6 py-3.5 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all shadow-sm focus:outline-none group" onClick={() => setShowFilters(!showFilters)}><Filter size={18} className={`text-premium-gold group-hover:scale-110 transition-transform ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />{t('paymentReports.advancedFilters')}</button>
        </div>

        {showFilters && (
          <div className="bg-gray-50/50 border border-gray-100 p-5 rounded-xl mb-8">
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('reports.dateRange')}</label>
                <div className={`flex items-center space-x-2 ${language === 'ar' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <input type="date" className={`block w-full px-3 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : ''}`} value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
                  <span className="flex-shrink-0 text-xs font-black text-gray-400 uppercase">{t('reports.to')}</span>
                  <input type="date" className={`block w-full px-3 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : ''}`} value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
                </div>
              </div>
              {[
                { label: t('paymentReports.vehicleNumber'), value: vehicleNumberFilter, setter: setVehicleNumberFilter, type: 'text', placeholder: t('paymentReports.enterVehicleNumber') },
                { label: t('paymentReports.paymentType'), value: paymentTypeFilter, setter: setPaymentTypeFilter, type: 'select', options: ['all', 'visitor', 'tenant'], allLabel: t('paymentReports.allPayments'), customLabel: (opt) => opt === 'visitor' ? t('paymentReports.visitorPayments') : opt === 'tenant' ? t('paymentReports.tenantPayments') : opt },
                { label: t('paymentReports.paymentStatus'), value: paymentStatusFilter, setter: setPaymentStatusFilter, type: 'select', options: uniquePaymentStatuses, allLabel: t('paymentReports.allStatuses') },
                { label: t('paymentReports.paymentMode'), value: paymentModeFilter, setter: setPaymentModeFilter, type: 'select', options: uniquePaymentModes, allLabel: t('paymentReports.allPaymentModes') },
                { label: t('paymentReports.collectedBy'), value: staffFilter, setter: setStaffFilter, type: 'select', options: uniqueStaffMembers, allLabel: t('paymentReports.allStaffMembers') }
              ].map(filter => (
                <div key={filter.label} className={language === 'ar' ? 'text-right' : 'text-left'}>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{filter.label}</label>
                  {filter.type === 'text' ?
                    <input type="text" className={`block w-full px-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : ''}`} placeholder={filter.placeholder} value={filter.value} onChange={(e) => filter.setter(e.target.value)} />
                    :
                    <select className={`block w-full px-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm cursor-pointer ${language === 'ar' ? 'text-right' : ''}`} value={filter.value} onChange={(e) => filter.setter(e.target.value)}>
                      {filter.options.map(opt => (
                        <option key={opt} value={opt}>
                          {opt === 'all'
                            ? filter.allLabel
                            : filter.customLabel
                              ? filter.customLabel(opt)
                              : filter.label === t('paymentReports.paymentStatus')
                                ? getPaymentStatusLabel(opt)
                                : opt}
                        </option>
                      ))}
                    </select>
                  }
                </div>
              ))}
              <div className="flex items-end">
                <button className="ripple-button w-full px-4 py-3 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-black flex items-center justify-center transition-all shadow-md active:scale-95 focus:outline-none" onClick={() => { setDateRange({ start: '', end: '' }); setSearchTerm(''); setVehicleNumberFilter(''); setPaymentStatusFilter('all'); setPaymentModeFilter('all'); setStaffFilter('all'); setPaymentTypeFilter('all'); }}>{t('reports.reset')}</button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/80">
              <tr className={language === 'ar' ? 'flex-row-reverse' : ''}>
                {['serialNumber', 'vehicleNumber', 'entryTime', 'exitTime', 'paymentAmount', 'paymentStatus', 'paymentMode', 'collectedBy'].map(field => (
                  <th key={field} scope="col" className={`px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-premium-gold transition-colors ${language === 'ar' ? 'text-right' : 'text-left'}`} onClick={() => handleSort(field)}>
                    <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                      {t(`paymentReports.${field}`)}
                      {sortField === field && <span className={`${language === 'ar' ? 'mr-1' : 'ml-1'} text-premium-gold`}><ArrowUp size={14} className={sortDirection === 'desc' ? 'rotate-180 transition-transform' : 'transition-transform'} /></span>}
                    </div>
                  </th>
                ))}
                <th scope="col" className={`px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t('paymentReports.duration')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {currentItems.map((v, index) => {
                const duration = v.exitTime
                  ? (v.duration || computeDuration(v.entryTime, v.exitTime, t))
                  : computeDuration(v.entryTime, null, t);
                return (
                  <tr key={v.id} className={`hover:bg-gray-50/50 transition-colors ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <td className={`px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-500 ${language === 'ar' ? 'text-right' : ''}`}>{indexOfFirstItem + index + 1}</td>
                    <td className={`px-6 py-5 whitespace-nowrap font-black text-gray-900 tracking-tight ${language === 'ar' ? 'text-right' : ''}`}>{v.vehicleNumber}</td>
                    <td className={`px-6 py-5 whitespace-nowrap text-sm font-bold text-gray-600 ${language === 'ar' ? 'text-right' : ''}`}>{formatAppDateTime(v.entryTime, v.entryTime)}</td>
                    <td className={`px-6 py-5 whitespace-nowrap text-sm font-bold text-gray-600 ${language === 'ar' ? 'text-right' : ''}`}>{v.exitTime ? formatAppDateTime(v.exitTime, v.exitTime) : '-'}</td>
                    <td className={`px-6 py-5 whitespace-nowrap font-black text-gray-900 ${language === 'ar' ? 'text-right' : ''}`}>{v.paymentAmount === '-' ? '-' : <span className="text-gradient-gold drop-shadow-sm">{v.paymentAmount} {t('dashboard.omr')}</span>}</td>
                    <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-right' : ''}`}>{getPaymentStatusBadge(v.paymentStatus)}</td>
                    <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-right' : ''}`}>{getPaymentModeBadge(v.paymentMode)}</td>
                    <td className={`px-6 py-5 whitespace-nowrap text-sm font-bold text-gray-600 ${language === 'ar' ? 'text-right' : ''}`}>{v.collectedBy}</td>
                    <td className={`px-6 py-5 whitespace-nowrap text-sm font-black text-gray-700 ${language === 'ar' ? 'text-right' : ''}`}>{duration}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredData.length === 0 && <div className="text-center py-8 text-gray-500">{t('paymentReports.noRecords')}</div>}
        </div>

        {filteredData.length > 0 && (
          <div className={`mt-4 flex flex-col md:flex-row justify-between items-center text-sm text-gray-600 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <div className="mb-2 md:mb-0">{t('paymentReports.showing')} {indexOfFirstItem + 1} {t('paymentReports.to')} {Math.min(indexOfLastItem, filteredData.length)} {t('paymentReports.of')} {filteredData.length} {t('paymentReports.records')}</div>
            <div className={`flex items-center space-x-1 ${language === 'ar' ? 'flex-row-reverse space-x-reverse' : ''} px-2`}>
              <button className="px-3 py-1.5 bg-white border border-gray-100 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all" onClick={prevPage} disabled={currentPage === 1}><ChevronLeft size={18} /></button>
              <div className={`flex space-x-1 ${language === 'ar' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) pageNumber = i + 1;
                  else if (currentPage <= 3) pageNumber = i + 1;
                  else if (currentPage >= totalPages - 2) pageNumber = totalPages - 4 + i;
                  else pageNumber = currentPage - 2 + i;
                  return <button key={i} className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all ${currentPage === pageNumber ? 'bg-gradient-to-r from-premium-black to-[#1a1a1a] text-premium-gold shadow-md' : 'bg-transparent text-gray-600 hover:bg-gray-100'}`} onClick={() => paginate(pageNumber)}>{pageNumber}</button>;
                })}
              </div>
              <button className="px-3 py-1.5 bg-white border border-gray-100 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all" onClick={nextPage} disabled={currentPage === totalPages}><ChevronRight size={18} /></button>
            </div>
            <div className={`mt-4 md:mt-0 flex items-center space-x-2 ${language === 'ar' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <span className="text-xs font-semibold uppercase tracking-wider">{t('paymentReports.itemsPerPage')}</span>
              <select className={`px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#121212] focus:border-[#121212] shadow-sm cursor-pointer ${language === 'ar' ? 'text-right' : ''}`} value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                {[5, 10, 20, 50].map(val => <option key={val} value={val}>{val}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentReport;
