import React, { useState, useEffect } from 'react';
import { Download, Calendar, FileText, Filter, Search, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { formatAppDateTime, parseBackendDate } from '../utils/dateTime';
import { apiUrl } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

// Helper: compute duration string from two UTC timestamp strings (format: 'YYYY-MM-DD HH:MM:SS')
// Treats the timestamp as UTC by appending 'Z' if it has no timezone info.
const computeDuration = (entryTimeStr, exitTimeStr) => {
  if (!entryTimeStr) return '-';
  const entry = parseBackendDate(entryTimeStr);
  const exit = exitTimeStr ? parseBackendDate(exitTimeStr) : new Date();
  if (isNaN(entry)) return '-';
  const diffMs = exit - entry;
  if (diffMs < 0) return '0h 0m';
  const hrs = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hrs}h ${mins}m`;
};

const Reports = () => {
  const { language, content, t } = useLanguage();
  const [reportData, setReportData] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch(apiUrl('/api/locations/'));
        if (response.ok) {
          const data = await response.json();
          setLocations(data.filter(loc => loc.is_active));
        }
      } catch (err) {
        console.error('Error fetching locations:', err);
      }
    };
    fetchLocations();
  }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('entryTime');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [columnFilters, setColumnFilters] = useState({
    vehicleNumber: '',
    entryDate: '',
    exitDate: '',
    type: 'all',
    location: 'all',
    status: 'all',
    duration: 'all',
    paymentMethod: 'all',
    amount: 'all'
  });

  const handleColumnFilterChange = (field, value) => {
    setColumnFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const resetAllFilters = () => {
    setDateRange({ start: '', end: '' });
    setSearchTerm('');
    setColumnFilters({
      vehicleNumber: '',
      entryDate: '',
      exitDate: '',
      type: 'all',
      location: 'all',
      status: 'all',
      duration: 'all',
      paymentMethod: 'all',
      amount: 'all'
    });
    setCurrentPage(1);
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      let url = apiUrl(`/api/vehicles/reports?search=${encodeURIComponent(searchTerm)}`);
      if (dateRange.start) url += `&start_date=${dateRange.start}`;
      if (dateRange.end) url += `&end_date=${dateRange.end}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch reports');
      const data = await response.json();
      setReportData(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [searchTerm, dateRange]);

  // Tick every 60 seconds to refresh live duration for vehicles still inside
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const processedData = reportData.filter(vehicle => {
    if (columnFilters.vehicleNumber && !vehicle.vehicleNumber?.toLowerCase().includes(columnFilters.vehicleNumber.toLowerCase())) {
      return false;
    }
    if (columnFilters.entryDate && vehicle.entryTime) {
      const entryDateStr = parseBackendDate(vehicle.entryTime).toISOString().slice(0, 10);
      if (entryDateStr !== columnFilters.entryDate) return false;
    }
    if (columnFilters.exitDate) {
      if (!vehicle.exitTime) return false;
      const exitDateStr = parseBackendDate(vehicle.exitTime).toISOString().slice(0, 10);
      if (exitDateStr !== columnFilters.exitDate) return false;
    }
    if (columnFilters.type !== 'all') {
      const typeVal = (vehicle.type || '').toLowerCase();
      const filterVal = columnFilters.type.toLowerCase();
      if (filterVal === 'subscriber') {
        if (!typeVal.includes('sub') && typeVal !== 'subscriber') return false;
      } else if (typeVal !== filterVal) {
        return false;
      }
    }
    if (columnFilters.location !== 'all') {
      const locName = vehicle.location || '';
      if (locName !== columnFilters.location && String(vehicle.location_id) !== String(columnFilters.location)) return false;
    }
    if (columnFilters.status !== 'all') {
      const isExited = !!vehicle.exitTime;
      if (columnFilters.status === 'Inside' && isExited) return false;
      if (columnFilters.status === 'Exited' && !isExited) return false;
    }
    if (columnFilters.duration !== 'all') {
      const entry = parseBackendDate(vehicle.entryTime);
      const exit = vehicle.exitTime ? parseBackendDate(vehicle.exitTime) : new Date();
      const diffMins = Math.max(0, Math.floor((exit - entry) / (1000 * 60)));

      if (columnFilters.duration === 'under15' && diffMins >= 15) return false;
      if (columnFilters.duration === 'under1h' && diffMins >= 60) return false;
      if (columnFilters.duration === '1to4h' && (diffMins < 60 || diffMins > 240)) return false;
      if (columnFilters.duration === 'over4h' && diffMins <= 240) return false;
    }
    if (columnFilters.paymentMethod !== 'all') {
      const method = (vehicle.paymentMethod || '').toLowerCase();
      const targetMethod = columnFilters.paymentMethod.toLowerCase();
      if (targetMethod === 'waiver') {
        if (!method.includes('waiver') && !method.includes('waived')) return false;
      } else if (!method.includes(targetMethod)) {
        return false;
      }
    }
    if (columnFilters.amount !== 'all') {
      const amtNum = parseFloat(vehicle.paymentAmount || 0);
      if (columnFilters.amount === 'free' && amtNum > 0) return false;
      if (columnFilters.amount === 'paid' && amtNum <= 0) return false;
    }
    return true;
  });

  const filteredData = [...processedData].sort((a, b) => {
    let valueA, valueB;
    if (sortField === 'entryTime' || sortField === 'exitTime') {
      valueA = a[sortField] ? parseBackendDate(a[sortField]).getTime() : 0;
      valueB = b[sortField] ? parseBackendDate(b[sortField]).getTime() : 0;
    } else {
      valueA = a[sortField];
      valueB = b[sortField];
    }
    return sortDirection === 'asc' ? (valueA > valueB ? 1 : -1) : (valueA < valueB ? 1 : -1);
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateRange, columnFilters, sortField, sortDirection]);

  const handleDownload = (format) => {
    let content = "";
    let filename = `vehicle_report_${new Date().toISOString().slice(0, 10)}`;
    let mimeType = "";

    const header = "Vehicle Number,Entry Time,Exit Time,Type,Location,Status,Duration,Payment Method,Payment Amount (OMR)\n";

    const dataToExport = filteredData.map(vehicle => {
      const duration = vehicle.exitTime
        ? (vehicle.duration || computeDuration(vehicle.entryTime, vehicle.exitTime))
        : computeDuration(vehicle.entryTime, null);
      const status = vehicle.exitTime ? 'Exited' : 'Inside';
      const paymentMethod = vehicle.exitTime ? (vehicle.paymentMethod || 'N/A') : '-';
      const paymentAmount = vehicle.exitTime ? (vehicle.type === 'Staff' ? 'N/A' : (vehicle.paymentAmount || '0.000')) : '-';
      const locationName = vehicle.location || '-';

      return [
        vehicle.vehicleNumber,
        vehicle.entryTime,
        vehicle.exitTime || '',
        vehicle.type,
        locationName,
        status,
        duration,
        paymentMethod,
        paymentAmount
      ];
    });

    if (format === 'pdf') { // Simple text for PDF, actual PDF generation needs a library
      content = "Vehicle Report\nDate: " + new Date().toLocaleDateString() + "\n\n";
      content += header.replace(/,/g, " | ");
      content += "-".repeat(header.length * 1.5) + "\n";
      dataToExport.forEach(row => {
        content += row.join(" | ") + "\n";
      });
      filename += ".txt"; // Using .txt for simplicity as PDF generation is complex
      mimeType = 'text/plain';
    } else if (format === 'excel') {
      content = header;
      dataToExport.forEach(row => {
        content += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",") + "\n";
      });
      filename += ".csv";
      mimeType = 'text/csv;charset=utf-8;';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (vehicle) => {
    const isSub = vehicle?.recordCategory === 'Subscription' || vehicle?.type?.includes('Subscription') || vehicle?.id?.startsWith('vis_sub_') || vehicle?.id?.startsWith('sub_');
    if (isSub) {
      const statusStr = vehicle?.status || 'Active';
      const isExpired = statusStr.toLowerCase() === 'expired';
      const isInactive = statusStr.toLowerCase() === 'inactive';
      
      let badgeColor = 'bg-green-100 text-green-800 border border-green-200';
      if (isExpired) badgeColor = 'bg-red-100 text-red-800 border border-red-200';
      else if (isInactive) badgeColor = 'bg-gray-100 text-gray-800 border border-gray-200';
      
      return <span className={`px-2.5 py-1 text-xs rounded-full font-bold ${badgeColor}`}>{statusStr}</span>;
    }

    return vehicle?.exitTime ?
      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{language === 'ar' ? 'خرج' : 'Exited'}</span> :
      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">{language === 'ar' ? 'بالداخل' : 'Inside'}</span>;
  };

  const getTypeBadge = (type) => {
    if (!type) return <span className="px-2.5 py-1 text-xs rounded-full font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">Visitor</span>;
    
    const normalized = String(type).trim().toLowerCase();
    
    if (normalized === 'staff') {
      return <span className="px-2.5 py-1 text-xs rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200">{language === 'ar' ? 'موظف' : 'Staff'}</span>;
    }
    if (normalized === 'subscriber' || normalized.includes('sub')) {
      return <span className="px-2.5 py-1 text-xs rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-200">{language === 'ar' ? 'مشترك' : 'Subscriber'}</span>;
    }
    if (normalized === 'tenant') {
      return <span className="px-2.5 py-1 text-xs rounded-full font-bold bg-purple-100 text-purple-800 border border-purple-200">{language === 'ar' ? 'مستأجر' : 'Tenant'}</span>;
    }

    return <span className="px-2.5 py-1 text-xs rounded-full font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">{language === 'ar' ? 'زائر' : 'Visitor'}</span>;
  };

  const getPaymentMethodBadge = (method) => {
    if (!method || method === 'N/A') return <span className="text-gray-500">-</span>;
    const colors = {
      'cash': 'bg-green-100 text-green-800',
      'card': 'bg-blue-100 text-primary-blue',
      'waiver': 'bg-purple-100 text-purple-800',
      'waived': 'bg-purple-100 text-purple-800'
    };

    let displayMethod = method;
    if (method.toLowerCase() === 'cash') displayMethod = language === 'ar' ? 'نقدي' : 'Cash';
    else if (method.toLowerCase() === 'card') displayMethod = language === 'ar' ? 'بطاقة' : 'Card';
    else if (method.toLowerCase() === 'waiver' || method.toLowerCase() === 'waived') displayMethod = language === 'ar' ? 'إعفاء' : 'Waiver';

    return <span className={`px-2 py-1 text-xs rounded-full ${colors[method.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>{displayMethod}</span>;
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
      <div className={`mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <div className={language === 'ar' ? 'text-right' : 'text-left'}>
          <h1 className="font-logo text-3xl font-black text-gray-900 tracking-wide">{content[language].reports.title}</h1>
          <p className="text-gray-500 mt-1 font-medium">{language === 'ar' ? 'إنشاء وتنزيل تقارير مركبات برو باركينج' : 'Generate and download Pro Parking vehicle reports'}</p>
        </div>
        <div className="flex space-x-3 rtl:space-x-reverse">
          <button
            className={`ripple-button px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 flex items-center transition-all shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-premium-black/20 ${language === 'ar' ? 'ml-2' : ''}`}
            onClick={() => handleDownload('pdf')}
          >
            <Download size={18} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} text-premium-gold`} />
            {language === 'ar' ? 'تنزيل PDF' : 'Download PDF'}
          </button>
          <button
            className="ripple-button px-5 py-2.5 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg hover:shadow-black/20 active:scale-95 flex items-center transition-all font-bold text-sm focus:outline-none focus:ring-2 focus:ring-premium-black/50 group"
            onClick={() => handleDownload('excel')}
          >
            <FileText size={18} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} text-premium-gold drop-shadow-sm group-hover:scale-110 transition-transform`} />
            {language === 'ar' ? 'تصدير Excel' : 'Export Excel'}
          </button>
        </div>
      </div>

      <div className="premium-card p-6 md:p-8 mb-6 overflow-hidden">
        <div className={`flex flex-col md:flex-row gap-4 mb-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
          <div className="relative flex-grow group">
            <div className={`absolute inset-y-0 ${language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
              <Search size={18} className="text-gray-400 group-focus-within:text-premium-gold transition-colors" />
            </div>
            <input
              type="text"
              className={`block w-full ${language === 'ar' ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} py-3.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold focus:bg-white transition-all text-sm font-bold text-gray-900 placeholder-gray-400 shadow-sm`}
              placeholder={language === 'ar' ? 'البحث برقم المركبة...' : 'Search by vehicle number...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-gray-50/50 border border-gray-100 p-5 rounded-xl mb-8">
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <div className={language === 'ar' ? 'text-right' : 'text-left'}>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{language === 'ar' ? 'نطاق التاريخ' : 'Date Range'}</label>
              <div className={`flex items-center space-x-2 ${language === 'ar' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className="relative flex-1">
                  <div className={`absolute inset-y-0 ${language === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                    <Calendar size={16} className="text-gray-400" />
                  </div>
                  <input type="date" className={`block w-full ${language === 'ar' ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3 text-left'} py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm`} value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
                </div>
                <span className="flex-shrink-0 text-xs font-black text-gray-400 uppercase">{language === 'ar' ? 'إلى' : 'to'}</span>
                <div className="relative flex-1">
                  <div className={`absolute inset-y-0 ${language === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                    <Calendar size={16} className="text-gray-400" />
                  </div>
                  <input type="date" className={`block w-full ${language === 'ar' ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3 text-left'} py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm`} value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex items-end">
              <button className="ripple-button w-full px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-black flex items-center justify-center focus:outline-none transition-all font-bold text-sm shadow-md active:scale-95" onClick={resetAllFilters}>
                <Filter size={18} className={`${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                {language === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/80">
              <tr className={language === 'ar' ? 'flex-row-reverse' : ''}>
                {['vehicleNumber', 'entryTime', 'exitTime', 'type', 'location'].map(field => (
                  <th key={field} scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-premium-gold transition-colors`} onClick={() => handleSort(field)}>
                    <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                      {field === 'vehicleNumber' ? t('vehicles.vehicleNumber') :
                        field === 'entryTime' ? t('vehicles.entryTime') :
                          field === 'exitTime' ? t('vehicles.exitTime') :
                            field === 'type' ? t('vehicles.type') : 
                              field === 'location' ? (t('common.location') === 'common.location' ? 'Location' : (t('common.location') || 'Location')) : field}
                      {sortField === field && <span className={`${language === 'ar' ? 'mr-1' : 'ml-1'} text-premium-gold`}><ArrowUp size={14} className={sortDirection === 'desc' ? 'rotate-180 transition-transform' : 'transition-transform'} /></span>}
                    </div>
                  </th>
                ))}
                <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{language === 'ar' ? 'المدة' : 'Duration'}</th>
                <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-premium-gold transition-colors`} onClick={() => handleSort('paymentMethod')}>
                  <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}{sortField === 'paymentMethod' && <span className={`${language === 'ar' ? 'mr-1' : 'ml-1'} text-premium-gold`}><ArrowUp size={14} className={sortDirection === 'desc' ? 'rotate-180 transition-transform' : 'transition-transform'} /></span>}</div>
                </th>
                <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-premium-gold transition-colors`} onClick={() => handleSort('paymentAmount')}>
                  <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>{language === 'ar' ? 'المبلغ (ر.ع.)' : 'Amount (OMR)'}{sortField === 'paymentAmount' && <span className={`${language === 'ar' ? 'mr-1' : 'ml-1'} text-premium-gold`}><ArrowUp size={14} className={sortDirection === 'desc' ? 'rotate-180 transition-transform' : 'transition-transform'} /></span>}</div>
                </th>
              </tr>
              {/* Column Filters Row */}
              <tr className="bg-gray-100/70 border-t border-b border-gray-200/70">
                {/* Vehicle Number */}
                <th className="p-2">
                  <input
                    type="text"
                    placeholder={language === 'ar' ? 'فلترة الرقم...' : 'Filter plate...'}
                    value={columnFilters.vehicleNumber}
                    onChange={(e) => handleColumnFilterChange('vehicleNumber', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-premium-gold shadow-sm"
                  />
                </th>
                {/* Entry Date */}
                <th className="p-2">
                  <input
                    type="date"
                    value={columnFilters.entryDate}
                    onChange={(e) => handleColumnFilterChange('entryDate', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-premium-gold shadow-sm"
                  />
                </th>
                {/* Exit Date */}
                <th className="p-2">
                  <input
                    type="date"
                    value={columnFilters.exitDate}
                    onChange={(e) => handleColumnFilterChange('exitDate', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-premium-gold shadow-sm"
                  />
                </th>
                {/* Type */}
                <th className="p-2">
                  <select
                    value={columnFilters.type}
                    onChange={(e) => handleColumnFilterChange('type', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-premium-gold shadow-sm cursor-pointer"
                  >
                    <option value="all">{language === 'ar' ? 'الكل' : 'All Types'}</option>
                    <option value="Visitor">{language === 'ar' ? 'زائر' : 'Visitor'}</option>
                    <option value="Subscriber">{language === 'ar' ? 'مشترك' : 'Subscriber'}</option>
                    <option value="Staff">{language === 'ar' ? 'موظف' : 'Staff'}</option>
                    <option value="Tenant">{language === 'ar' ? 'مستأجر' : 'Tenant'}</option>
                  </select>
                </th>
                {/* Location */}
                <th className="p-2">
                  <select
                    value={columnFilters.location}
                    onChange={(e) => handleColumnFilterChange('location', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-premium-gold shadow-sm cursor-pointer"
                  >
                    <option value="all">{language === 'ar' ? 'الكل' : 'All Locations'}</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.location_name}>
                        {loc.location_name}
                      </option>
                    ))}
                  </select>
                </th>
                {/* Status */}
                <th className="p-2">
                  <select
                    value={columnFilters.status}
                    onChange={(e) => handleColumnFilterChange('status', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-premium-gold shadow-sm cursor-pointer"
                  >
                    <option value="all">{language === 'ar' ? 'الكل' : 'All Statuses'}</option>
                    <option value="Inside">{language === 'ar' ? 'بالداخل' : 'Inside'}</option>
                    <option value="Exited">{language === 'ar' ? 'خرج' : 'Exited'}</option>
                  </select>
                </th>
                {/* Duration */}
                <th className="p-2">
                  <select
                    value={columnFilters.duration}
                    onChange={(e) => handleColumnFilterChange('duration', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-premium-gold shadow-sm cursor-pointer"
                  >
                    <option value="all">{language === 'ar' ? 'الكل' : 'All Durations'}</option>
                    <option value="under15">&lt; 15 mins</option>
                    <option value="under1h">&lt; 1 hour</option>
                    <option value="1to4h">1 - 4 hours</option>
                    <option value="over4h">&gt; 4 hours</option>
                  </select>
                </th>
                {/* Payment Method */}
                <th className="p-2">
                  <select
                    value={columnFilters.paymentMethod}
                    onChange={(e) => handleColumnFilterChange('paymentMethod', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-premium-gold shadow-sm cursor-pointer"
                  >
                    <option value="all">{language === 'ar' ? 'الكل' : 'All Methods'}</option>
                    <option value="Cash">{language === 'ar' ? 'نقدي' : 'Cash'}</option>
                    <option value="Card">{language === 'ar' ? 'بطاقة' : 'Card'}</option>
                    <option value="Waiver">{language === 'ar' ? 'إعفاء' : 'Waiver'}</option>
                  </select>
                </th>
                {/* Amount */}
                <th className="p-2">
                  <select
                    value={columnFilters.amount}
                    onChange={(e) => handleColumnFilterChange('amount', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-premium-gold shadow-sm cursor-pointer"
                  >
                    <option value="all">{language === 'ar' ? 'الكل' : 'All Amounts'}</option>
                    <option value="free">{language === 'ar' ? 'مجاني / N/A' : 'Free / N/A'}</option>
                    <option value="paid">{language === 'ar' ? 'مدفوع' : 'Paid (> 0)'}</option>
                  </select>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {currentItems.map((vehicle) => {
                // Use backend-calculated duration for exited vehicles;
                // for live vehicles (still inside), compute locally with UTC correction.
                const duration = vehicle.exitTime
                  ? (vehicle.duration || computeDuration(vehicle.entryTime, vehicle.exitTime))
                  : computeDuration(vehicle.entryTime, null);
                return (
                  <tr key={vehicle.id} className={`hover:bg-gray-50/50 transition-colors ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-right' : ''}`}><div className="font-black text-gray-900 tracking-tight">{vehicle.vehicleNumber}</div></td>
                    <td className={`px-6 py-5 whitespace-nowrap text-sm font-bold text-gray-600 ${language === 'ar' ? 'text-right' : ''}`}>{formatAppDateTime(vehicle.entryTime, vehicle.entryTime)}</td>
                    <td className={`px-6 py-5 whitespace-nowrap text-sm font-bold text-gray-600 ${language === 'ar' ? 'text-right' : ''}`}>{vehicle.exitTime ? formatAppDateTime(vehicle.exitTime, vehicle.exitTime) : '-'}</td>
                    <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-right' : ''}`}>{getTypeBadge(vehicle.type)}</td>
                    <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-right' : ''}`}>
                      <div className={`flex items-center gap-2 text-sm font-bold text-gray-700 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <MapPin size={15} className="text-gray-400 group-hover:text-premium-gold transition-colors" />
                        <span>{vehicle.location || '-'}</span>
                      </div>
                    </td>
                    <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-right' : ''}`}>{getStatusBadge(vehicle)}</td>
                    <td className={`px-6 py-5 whitespace-nowrap text-sm font-black text-gray-700 ${language === 'ar' ? 'text-right' : ''}`}>{duration}</td>
                    <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-right' : ''}`}>{getPaymentMethodBadge(vehicle.paymentMethod || vehicle.paymentMode)}</td>
                    <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-right' : ''}`}>{['Staff', 'Tenant'].includes(vehicle.type) ? <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">N/A</span> : <span className="font-black text-gradient-gold drop-shadow-sm">{vehicle.paymentAmount || '0.000'}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredData.length === 0 && <div className="text-center py-8 text-gray-500">{language === 'ar' ? 'لا توجد مركبات.' : 'No vehicles found.'}</div>}
        </div>

        {filteredData.length > 0 && (
          <div className="mt-4 flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
            <div className="mb-2 md:mb-0">
              {language === 'ar' ? (
                <>عرض {indexOfFirstItem + 1} إلى {Math.min(indexOfLastItem, filteredData.length)} من أصل {filteredData.length} مركبة</>
              ) : (
                <>Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length} vehicles</>
              )}
            </div>
            <div className={`flex items-center space-x-1 px-2 ${language === 'ar' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <button className="px-3 py-1.5 bg-white border border-gray-100 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all" onClick={prevPage} disabled={currentPage === 1}>
                {language === 'ar' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
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
              <button className="px-3 py-1.5 bg-white border border-gray-100 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all" onClick={nextPage} disabled={currentPage === totalPages}>
                {language === 'ar' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              </button>
            </div>
            <div className="mt-4 md:mt-0 flex items-center space-x-2 rtl:space-x-reverse">
              <span className="text-xs font-semibold uppercase tracking-wider">{language === 'ar' ? 'صفوف لكل صفحة:' : 'Items per page:'}</span>
              <select className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#121212] focus:border-[#121212] shadow-sm cursor-pointer" value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                {[5, 10, 20, 50].map(val => <option key={val} value={val}>{val}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
