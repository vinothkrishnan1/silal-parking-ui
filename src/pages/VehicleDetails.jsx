import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Filter, Calendar, Clock, Car, X, Eye, Plus, QrCode, Check, Printer, CreditCard, DollarSign, FileText, Ticket, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { mockTieredPricingData } from '../data/mockData';
import { motion, AnimatePresence } from 'framer-motion';
import { formatAppDateTime, parseBackendDate } from '../utils/dateTime';
import { apiUrl } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

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

const VehicleDetails = () => {
  const { vehiclesData, updateVehiclesData } = useOutletContext();
  const { language, t } = useLanguage();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicleForPreview, setSelectedVehicleForPreview] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAddFormModal, setShowAddFormModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scannedVehicleData, setScannedVehicleData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentStep, setPaymentStep] = useState('initial');
  const [waiverRemarks, setWaiverRemarks] = useState('');
  const [addFormState, setAddFormState] = useState({ vehicleNumber: '', entryTime: '', type: 'Visitor', plateImage: 'https://placehold.co/300x100/333/white?text=NEW+PLATE' });
  const [slotData, setSlotData] = useState(null);
  const [tick, setTick] = useState(0);

  const fetchSlotData = async () => {
    try {
      const response = await fetch(apiUrl('/api/vehicles/dashboard'));
      const data = await response.json();
      setSlotData(data);
    } catch (error) {
      console.error('Error fetching slot data:', error);
    }
  };

  useEffect(() => {
    fetchSlotData();
    const interval = setInterval(fetchSlotData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const receiptRef = useRef(null);
  const [showSampleEntryTicketModal, setShowSampleEntryTicketModal] = useState(false);
  const entryTicketRef = useRef(null);

  const vehiclesInsideParking = vehiclesData.filter(vehicle => !vehicle.exitTime);

  const filteredVehiclesToDisplay = vehiclesInsideParking.filter(vehicle => {
    if (searchTerm && !vehicle.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredVehiclesToDisplay.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredVehiclesToDisplay.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const getTypeBadge = (type) => {
    const typeKey = type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : 'Visitor';
    const colors = {
      'Staff': 'bg-gray-100 text-[#121212] border-gray-200',
      'Tenant': 'bg-[#c6a87c]/15 text-[#9a7b4f] border-[#c6a87c]/30',
      'Visitor': 'bg-gray-50 text-gray-600 border-gray-200'
    };
    
    const displayType = t(`dashboard.${typeKey.toLowerCase()}`) || typeKey;

    return (
      <span className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg border ${colors[typeKey] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
        {displayType}
      </span>
    );
  };

  const handlePreview = (vehicle) => { setSelectedVehicleForPreview(vehicle); setShowPreviewModal(true); };

  const handleOpenAddVehicleForm = () => {
    setAddFormState({
      vehicleNumber: '',
      entryTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
      type: 'Visitor',
      plateImage: 'https://placehold.co/300x100/333/white?text=NEW+PLATE'
    });
    setShowAddFormModal(true);
  };

  const handleScanTicket = () => {
    setShowScanModal(true);
    setPaymentStep('initial');
    setScannedVehicleData(null);
    setWaiverRemarks('');
    setTimeout(() => {
      const insideVehicles = vehiclesData.filter(v => !v.exitTime);
      if (insideVehicles.length > 0) {
        const randomVehicle = insideVehicles[Math.floor(Math.random() * insideVehicles.length)];
        setScannedVehicleData({
          ...randomVehicle,
          calculatedFee: calculateParkingFee(randomVehicle),
          paymentTime: new Date().toISOString()
        });
        setPaymentStep('methodOrWaiverSelection');
      } else {
        alert(t('vehicles.noVehiclesFound'));
        setShowScanModal(false);
      }
    }, 1500);
  };

  const calculateParkingFee = (vehicle) => {
    if (!vehicle || !vehicle.entryTime || vehicle.type === 'Staff') return '0.000';
    const pricingTierData = mockTieredPricingData.find(p => p.isActive && p.name.includes('Standard Car Parking')) || mockTieredPricingData[0];
    if (!pricingTierData || !pricingTierData.tiers) return '0.000';
    const entryTime = new Date(vehicle.entryTime); const currentTime = new Date();
    const durationMs = currentTime - entryTime;
    const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));
    let totalFee = 0;
    let remainingHours = durationHours;
    const sortedTiers = [...pricingTierData.tiers].sort((a, b) => {
      const durationA = a.unit === 'day' ? a.duration * 24 : a.duration;
      const durationB = b.unit === 'day' ? b.duration * 24 : b.duration;
      return durationA - durationB;
    });
    for (const tier of sortedTiers) {
      if (remainingHours <= 0) break;
      const tierDurationInHours = tier.unit === 'day' ? tier.duration * 24 : tier.duration;
      const hoursInThisTier = Math.min(remainingHours, tierDurationInHours);
      totalFee += hoursInThisTier * parseFloat(tier.priceOMR);
      remainingHours -= hoursInThisTier;
    }
    return totalFee > 0 ? totalFee.toFixed(3) : '0.500';
  };

  const processVehicleExitAndUpdateGlobal = (vehicleId, exitData) => {
    const updatedGlobalVehicles = vehiclesData.map(v =>
      v.id === vehicleId ? { ...v, ...exitData, paymentProcessedTime: new Date().toISOString() } : v
    );
    updateVehiclesData(updatedGlobalVehicles);
    setPaymentStep('receipt');
  };

  const handleSelectPaymentOrWaiver = (type) => {
    if (type === 'payment') setPaymentStep('paymentMethodSelection');
    else if (type === 'waiver') setPaymentStep('waiverReasonInput');
  };

  const handleProcessPayment = async () => {
    if (!scannedVehicleData) return;
    const exitTime = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const paymentData = {
      exitTime: exitTime,
      paymentMethod: paymentMethod,
      paymentAmount: scannedVehicleData.calculatedFee,
      paymentTime: new Date().toISOString(),
      waiverReason: null
    };

    try {
      await fetch(apiUrl('/payment_status'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_plate: scannedVehicleData.vehicleNumber,
          payment_status: 'paid',
          payment_mode: paymentMethod.toLowerCase()
        })
      });
    } catch (error) {
      console.error("Failed to notify backend of payment:", error);
    }

    setScannedVehicleData(prev => ({ ...prev, ...paymentData }));
    processVehicleExitAndUpdateGlobal(scannedVehicleData.id, paymentData);
  };

  const handleConfirmWaiver = async () => {
    if (!scannedVehicleData || !waiverRemarks.trim()) {
      alert(t('vehicles.enterWaiverReason'));
      return;
    }
    const exitTime = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const waiverData = {
      exitTime: exitTime,
      paymentMethod: 'Waiver',
      paymentAmount: '0.000',
      waiverReason: waiverRemarks.trim(),
      paymentTime: new Date().toISOString()
    };

    try {
      await fetch(apiUrl('/payment_status'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_plate: scannedVehicleData.vehicleNumber,
          payment_status: 'waived',
          payment_mode: 'waiver'
        })
      });
    } catch (error) {
      console.error("Failed to notify backend of waiver:", error);
    }

    setScannedVehicleData(prev => ({ ...prev, ...waiverData }));
    processVehicleExitAndUpdateGlobal(scannedVehicleData.id, waiverData);
  };

  const handleAddNewVehicleSubmit = (e) => {
    e.preventDefault();
    const newVehicleEntry = {
      id: Date.now().toString(),
      ...addFormState,
      vehicleImage: 'https://placehold.co/400x300/333/white?text=Vehicle+Image',
      exitTime: null,
      paymentProcessedTime: null
    };
    updateVehiclesData([...vehiclesData, newVehicleEntry]);
    setShowAddFormModal(false);
  };

  const handlePrintReceipt = () => {
    const printContent = receiptRef.current;
    if (printContent) {
      const originalContents = document.body.innerHTML;
      const printableArea = printContent.innerHTML;
      document.body.innerHTML = `<div class="print-container" dir="${language === 'ar' ? 'rtl' : 'ltr'}">${printableArea}</div>`;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  const formatDateTimeForDisplay = (isoString) => {
    if (!isoString) return '-';
    try {
      return formatAppDateTime(isoString, isoString);
    } catch (e) { return isoString; }
  };

  const SampleEntryTicketContent = () => {
    const currentDate = new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB');
    const currentTime = new Date().toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return (
      <div className={`font-mono text-xs text-black bg-white p-6 max-w-xs mx-auto border-2 border-dashed border-gray-400 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
        <div className="text-center mb-4">
          <img
            src="https://img-wrapper.vercel.app/image?url=https://i.ibb.co/K9fK5dK/Life-Line-Logo.png"
            alt="Logo"
            className="w-16 h-auto mx-auto mb-2"
          />
          <p className="font-black text-sm uppercase tracking-widest">Pro Parking</p>
          <p className="text-[10px] font-bold mt-1 bg-gray-100 py-1">{t('vehicles.entryTicketHeader')}</p>
        </div>
        <div className="space-y-1 mb-4 border-b border-dashed border-gray-300 pb-2">
          <div className={`flex justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <span>{t('vehicles.ticketId')}:</span>
            <span className="font-bold">TKT-{Math.floor(Math.random() * 90000) + 10000}</span>
          </div>
          <div className={`flex justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <span>{t('common.date')}:</span>
            <span className="font-bold">{currentDate}</span>
          </div>
          <div className={`flex justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <span>{t('common.time')}:</span>
            <span className="font-bold">{currentTime}</span>
          </div>
        </div>
        <div className="space-y-1 mb-4 border-b border-dashed border-gray-300 pb-2">
          <div className={`flex justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <span>{t('vehicles.vehicleNumber')}:</span>
            <span className="font-bold">ABC 1234</span>
          </div>
        </div>
        <div className="flex flex-col items-center my-4">
          <div className="p-2 border border-gray-200 rounded-md">
            <img src="https://img-wrapper.vercel.app/image?url=https://placehold.co/100x100/000/fff?text=QR" alt="QR Code" className="w-24 h-24" />
          </div>
          <p className="text-[10px] font-bold mt-1">{t('vehicles.scanMe')}</p>
        </div>
        <p className="text-center text-[9px] leading-tight text-gray-600 mt-2 italic px-2">
          {t('vehicles.ticketFooter')}
        </p>
      </div>
    );
  };

  const handlePrintEntryTicket = () => {
    const printContent = entryTicketRef.current;
    if (printContent) {
      const originalContents = document.body.innerHTML;
      const printableArea = printContent.innerHTML;
      document.body.innerHTML = `<div class="print-container" dir="${language === 'ar' ? 'rtl' : 'ltr'}">${printableArea}</div>`;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };


  return (
    <div className={`p-6 md:p-8 max-w-[1600px] mx-auto ${language === 'ar' ? 'text-right' : 'text-left'}`}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className={`mb-8 flex flex-col md:flex-row justify-between items-start md:items-center no-print gap-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <div>
          <h1 className="font-logo text-3xl font-black text-gray-900 tracking-wide">{t('vehicles.title')}</h1>
          <p className="text-gray-500 mt-1 font-medium">{t('vehicles.subtitle')}</p>
        </div>
        <div className={`flex flex-wrap gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
          <button className="ripple-button px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 flex items-center transition-all shadow-sm focus:outline-none font-bold" onClick={() => setShowSampleEntryTicketModal(true)}>
            <Ticket size={18} className={language === 'ar' ? 'ml-2' : 'mr-2'} />
            <span className="text-sm">{t('vehicles.sampleEntryTicket')}</span>
          </button>
          <button className="ripple-button px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:shadow-lg hover:shadow-red-200 flex items-center transition-all active:scale-95 focus:outline-none group font-bold" onClick={handleScanTicket}>
            <QrCode size={18} className={`transition-transform duration-300 group-hover:scale-110 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
            <span className="text-sm">{t('vehicles.scanTicket')}</span>
          </button>
          <button className="ripple-button px-5 py-2.5 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg hover:shadow-black/20 flex items-center transition-all active:scale-95 focus:outline-none group font-bold" onClick={handleOpenAddVehicleForm}>
            <Plus size={18} className={`transition-transform duration-300 group-hover:rotate-90 ${language === 'ar' ? 'ml-2 text-premium-gold' : 'mr-2 text-premium-gold'}`} />
            <span className="text-sm">{t('vehicles.addVehicle')}</span>
          </button>
        </div>
      </div>

      <div className="premium-card p-6 mb-8 no-print relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-premium-gold/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className={`flex justify-between items-center mb-6 pb-2 relative z-10 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
          <div className="flex items-center gap-3">
             <h3 className="text-lg font-black text-gray-900 tracking-tight">{t('vehicles.parkingSlotStatus')}</h3>
             <div className="h-1.5 w-12 bg-gradient-gold rounded-full hidden sm:block"></div>
          </div>
          <span className="text-xs font-bold text-gray-500 flex items-center gap-2 px-3 py-1.5 bg-gray-50/80 rounded-lg border border-gray-100 shadow-sm">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> {t('slots.realTimeMonitoring')}
          </span>
        </div>
        {slotData ? (
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
            <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 hover:shadow-md hover:bg-white hover:border-premium-gold/20 transition-all duration-300">
              <div className={`flex justify-between items-center mb-5 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <span className={`text-sm font-black text-gray-700 flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <div className="bg-premium-black/5 p-1.5 rounded-lg text-premium-black">
                     <Users size={16} />
                  </div>
                  {t('dashboard.visitorStaff')}
                </span>
                <span className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase rounded-lg border ${slotData.visitor?.available > 0 ? 'bg-green-50 text-green-700 border-green-200/60' : 'bg-red-50 text-red-700 border-red-200/60'}`}>
                  {slotData.visitor?.available > 0 && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>}
                  {slotData.visitor?.available > 0 ? t('vehicles.available') : t('vehicles.full')}
                </span>
              </div>
              <div className={`flex justify-between items-end ${language === 'ar' ? 'flex-row-reverse text-right' : 'text-left'}`}>
                <div>
                  <p className="text-4xl font-black text-gray-900 tracking-tight">{slotData.visitor?.available}</p>
                  <p className="text-[11px] font-semibold text-gray-500 mt-1 uppercase tracking-wider">{t('vehicles.available')} / {slotData.visitor?.total} {t('vehicles.total')}</p>
                </div>
                <div className={language === 'ar' ? 'text-left' : 'text-right'}>
                  <p className="text-2xl font-bold text-gray-700">{slotData.visitor?.occupied}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('vehicles.occupied')}</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mt-6 overflow-hidden shadow-inner">
                <div className="bg-premium-black h-full rounded-full transition-all duration-1000 relative" style={{ width: `${(slotData.visitor?.occupied / slotData.visitor?.total) * 100}%` }}>
                  <div className="absolute inset-0 bg-white/20 w-full h-full animate-shimmer"></div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 hover:shadow-md hover:bg-white hover:border-premium-gold/20 transition-all duration-300">
              <div className={`flex justify-between items-center mb-5 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <span className={`text-sm font-black text-gray-700 flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <div className="bg-premium-gold/10 p-1.5 rounded-lg text-premium-gold">
                     <Car size={16} />
                  </div>
                  {t('dashboard.tenantSlots')}
                </span>
                <span className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase rounded-lg border ${slotData.tenant?.available > 0 ? 'bg-green-50 text-green-700 border-green-200/60' : 'bg-red-50 text-red-700 border-red-200/60'}`}>
                  {slotData.tenant?.available > 0 && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>}
                  {slotData.tenant?.available > 0 ? t('vehicles.available') : t('vehicles.full')}
                </span>
              </div>
              <div className={`flex justify-between items-end ${language === 'ar' ? 'flex-row-reverse text-right' : 'text-left'}`}>
                <div>
                  <p className="text-4xl font-black text-gray-900 tracking-tight">{slotData.tenant?.available}</p>
                  <p className="text-[11px] font-semibold text-gray-500 mt-1 uppercase tracking-wider">{t('vehicles.available')} / {slotData.tenant?.total} {t('vehicles.total')}</p>
                </div>
                <div className={language === 'ar' ? 'text-left' : 'text-right'}>
                  <p className="text-2xl font-bold text-gray-700">{slotData.tenant?.occupied}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('vehicles.occupied')}</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mt-6 overflow-hidden shadow-inner">
                <div className="bg-gradient-gold h-full rounded-full transition-all duration-1000 relative" style={{ width: `${(slotData.tenant?.occupied / slotData.tenant?.total) * 100}%` }}>
                  <div className="absolute inset-0 bg-white/20 w-full h-full animate-shimmer" style={{ animationDelay: '0.5s' }}></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-32 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-premium-gold"></div>
            <p className="text-sm text-gray-400 animate-pulse font-medium">{t('vehicles.loadingStatus')}</p>
          </div>
        )}
      </div>

      <div className="premium-card p-6 mb-8 no-print overflow-hidden">
        <div className={`flex flex-col md:flex-row gap-4 mb-6 justify-between items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
          <div className="relative flex-grow max-w-md w-full group">
            <div className={`absolute inset-y-0 ${language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
              <Search size={18} className="text-gray-400 group-focus-within:text-premium-gold transition-colors" />
            </div>
            <input 
              type="text" 
              className={`block w-full ${language === 'ar' ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} py-3.5 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all bg-gray-50/50 focus:bg-white text-sm font-bold shadow-sm`} 
              placeholder={t('vehicles.searchPlaceholder')} 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className={`flex items-center gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <label htmlFor="itemsPerPage" className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{t('vehicles.rowsPerPage')}</label>
            <select
              id="itemsPerPage"
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c6a87c]/30 focus:border-[#c6a87c] bg-white text-sm font-bold text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              {[5, 10, 20, 50].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/80">
              <tr>
                <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('vehicles.vehicleNumber')}</th>
                <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('vehicles.entryTime')}</th>
                <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('vehicles.type')}</th>
                <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('vehicles.anprImage')}</th>
                <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('vehicles.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {currentItems.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                    <div className={`flex items-center gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                      <div className="w-10 h-10 bg-premium-gold/10 rounded-full flex items-center justify-center text-premium-gold group-hover:bg-premium-gold group-hover:text-white transition-colors">
                        <Car size={18} />
                      </div>
                      <span className="font-black text-gray-900 text-sm tracking-tight">{vehicle.vehicleNumber}</span>
                    </div>
                  </td>
                  <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                    <div className={`flex items-center gap-2 text-sm text-gray-500 font-bold ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                      <Clock size={15} className="text-gray-400 group-hover:text-premium-gold transition-colors" />
                      <span>{formatDateTimeForDisplay(vehicle.entryTime)}</span>
                    </div>
                  </td>
                  <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-right' : 'text-left'}`}>{getTypeBadge(vehicle.type)}</td>
                  <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                    <div className="w-32 h-10 bg-gray-900 rounded-lg border border-gray-200 overflow-hidden shadow-sm group-hover:shadow-md relative cursor-pointer transition-all" onClick={() => handlePreview(vehicle)}>
                      <img src={vehicle.plateImage} alt="Plate" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                         <Eye size={16} className="text-white" />
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                    <button className={`flex items-center gap-2 text-gray-400 hover:text-premium-black font-black text-sm transition-colors ${language === 'ar' ? 'flex-row-reverse' : ''}`} onClick={() => handlePreview(vehicle)}>
                      <div className="p-1.5 rounded-lg bg-gray-50 group-hover:bg-premium-gold/20 group-hover:text-premium-gold transition-colors">
                        <Eye size={16} />
                      </div>
                      <span className="group-hover:text-premium-gold transition-colors">{t('vehicles.preview')}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredVehiclesToDisplay.length === 0 && (
            <div className="text-center py-16 bg-gray-50/30">
              <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-5 text-gray-300 shadow-inner">
                <Search size={32} />
              </div>
              <p className="text-gray-500 font-medium text-lg">{t('vehicles.noVehiclesFound')}</p>
            </div>
          )}
        </div>

        {filteredVehiclesToDisplay.length > 0 && (
          <div className={`flex items-center justify-between mt-6 px-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <div className="hidden sm:block">
              <p className="text-sm text-gray-500">
                {t('vehicles.showing')} <span className="font-bold text-gray-800">{indexOfFirstItem + 1}</span> {t('vehicles.to')} <span className="font-bold text-gray-800">{Math.min(indexOfLastItem, filteredVehiclesToDisplay.length)}</span> {t('vehicles.of')}{' '}
                <span className="font-bold text-gray-800">{filteredVehiclesToDisplay.length}</span> {t('vehicles.results')}
              </p>
            </div>
            <div className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors ${currentPage === 1 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {language === 'ar' ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
              
              <div className={`flex gap-1 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                {Array.from({ length: totalPages }).map((_, i) => {
                   const pageNum = i + 1;
                   if (totalPages > 5 && (pageNum > 2 && pageNum < totalPages - 1 && Math.abs(pageNum - currentPage) > 1)) {
                     if (pageNum === 3 || pageNum === totalPages - 1) return <span key={pageNum} className="px-2 text-gray-300">...</span>;
                     return null;
                   }
                   return (
                     <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${currentPage === pageNum ? 'bg-primary-blue text-white shadow-md shadow-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                     >
                       {pageNum}
                     </button>
                   );
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors ${currentPage === totalPages ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {language === 'ar' ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showPreviewModal && selectedVehicleForPreview && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 no-print backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-lg p-0 overflow-hidden shadow-2xl"
            >
              <div className={`p-6 border-b flex justify-between items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <h3 className="text-xl font-bold text-gray-800">{t('vehicles.numberPlate')}: <span className="text-primary-blue">{selectedVehicleForPreview.vehicleNumber}</span></h3>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors" onClick={() => setShowPreviewModal(false)}><X size={20} /></button>
              </div>
              <div className="p-6">
                <div className="bg-gray-900 rounded-xl overflow-hidden mb-6 aspect-video border-[6px] border-gray-100 shadow-inner">
                  <img src={selectedVehicleForPreview.plateImage} alt="Plate" className="w-full h-full object-cover" />
                </div>
                <div className={`grid grid-cols-2 gap-6 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('vehicles.vehicleNumber')}</p>
                    <p className="font-black text-gray-800 text-lg">{selectedVehicleForPreview.vehicleNumber}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('vehicles.type')}</p>
                    <div className="mt-1">{getTypeBadge(selectedVehicleForPreview.type)}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm col-span-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('vehicles.entryTime')}</p>
                    <div className={`flex items-center gap-2 text-gray-800 font-bold ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                      <Clock size={16} className="text-premium-gold" />
                      <span>{formatDateTimeForDisplay(selectedVehicleForPreview.entryTime)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50/80 flex justify-center border-t border-gray-100">
                <button className="ripple-button px-10 py-3 bg-white border border-gray-200 text-gray-800 font-black rounded-xl hover:bg-gray-50 hover:shadow-md transition-all active:scale-95 shadow-sm" onClick={() => setShowPreviewModal(false)}>{t('common.close')}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showAddFormModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 no-print backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md p-0 overflow-hidden shadow-2xl"
          >
            <div className={`p-6 border-b flex justify-between items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-xl font-bold text-gray-800">{t('vehicles.addNewVehicle')}</h3>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors" onClick={() => setShowAddFormModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddNewVehicleSubmit} className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('vehicles.vehicleNumber')}</label>
                  <input 
                    type="text" 
                    className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue bg-gray-50 focus:bg-white transition-all font-bold ${language === 'ar' ? 'text-right' : 'text-left'}`} 
                    value={addFormState.vehicleNumber} 
                    onChange={(e) => setAddFormState({ ...addFormState, vehicleNumber: e.target.value })} 
                    required 
                    placeholder="ABC 1234" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('vehicles.type')}</label>
                  <select 
                    className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/50 bg-white font-bold cursor-pointer ${language === 'ar' ? 'text-right' : 'text-left'}`} 
                    value={addFormState.type} 
                    onChange={(e) => setAddFormState({ ...addFormState, type: e.target.value })}
                  >
                    <option value="Visitor">{t('dashboard.visitor')}</option>
                    <option value="Staff">{t('dashboard.staff')}</option>
                  </select>
                </div>
                <div className="bg-premium-gold/5 p-4 rounded-xl border border-premium-gold/20 shadow-sm">
                  <label className="block text-[10px] font-black text-premium-gold uppercase tracking-widest mb-1">{t('vehicles.entryTime')}</label>
                  <div className={`flex items-center gap-2 font-mono font-bold text-gray-700 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <Clock size={14} className="text-premium-gold" />
                    <span>{formatDateTimeForDisplay(addFormState.entryTime)}</span>
                  </div>
                  <p className="mt-2 text-[10px] text-gray-500 leading-tight italic">{t('vehicles.entryTimeAutoSet')}</p>
                </div>
              </div>
              <div className={`mt-8 flex gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <button type="button" className="ripple-button flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-all shadow-sm" onClick={() => setShowAddFormModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="ripple-button flex-1 px-4 py-3 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-black/20 active:scale-95 transition-all">{t('vehicles.addVehicle')}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showScanModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 no-print backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
          >
            <div className={`p-6 border-b flex justify-between items-center bg-gray-50 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                {paymentStep === 'initial' && t('vehicles.scanTicket')}
                {paymentStep === 'methodOrWaiverSelection' && t('vehicles.processExit')}
                {paymentStep === 'paymentMethodSelection' && t('vehicles.selectPaymentMethod')}
                {paymentStep === 'waiverReasonInput' && t('vehicles.applyWaiver')}
                {paymentStep === 'receipt' && (scannedVehicleData?.paymentMethod === 'Waiver' ? t('vehicles.waiverConfirmation') : t('vehicles.paymentReceipt'))}
              </h3>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-colors shadow-sm" onClick={() => { setShowScanModal(false); setScannedVehicleData(null); setPaymentStep('initial'); setWaiverRemarks(''); }}> <X size={20} /> </button>
            </div>

            <div className="p-8">
              {paymentStep === 'initial' && (
                <div className="flex flex-col items-center py-4 text-center"> 
                  <div className="w-56 h-56 bg-premium-black rounded-2xl flex items-center justify-center mb-8 relative border-[6px] border-white shadow-xl shadow-premium-gold/20">
                    <QrCode size={120} className="text-white opacity-20" />
                    <div className="absolute inset-4 border-2 border-premium-gold rounded-lg"></div>
                    <div className="absolute top-4 left-4 right-4 h-1 bg-premium-gold/80 animate-scan-line shadow-glow"></div>
                  </div> 
                  <h4 className="text-xl font-bold text-gray-800 mb-2">{t('vehicles.scanning')}</h4>
                  <p className="text-gray-400 text-sm">{t('vehicles.scanHint')}</p> 
                </div>
              )}

              {paymentStep === 'methodOrWaiverSelection' && scannedVehicleData && (
                <div className={`space-y-6 ${language === 'ar' ? 'text-right' : 'text-left'}`}> 
                   <div className={`bg-premium-gold/5 p-4 rounded-xl border border-premium-gold/20 flex items-center gap-4 shadow-sm ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <div className="bg-gradient-gold rounded-full p-3 text-white shadow-lg shadow-premium-gold/30">
                      <Car size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 text-lg leading-tight tracking-tight">{scannedVehicleData.vehicleNumber}</h4>
                      <p className="text-xs font-bold text-premium-gold uppercase tracking-widest">{t(`dashboard.${scannedVehicleData.type.toLowerCase()}`) || scannedVehicleData.type}</p>
                    </div>
                  </div>

                  <div className={`grid grid-cols-2 gap-4 ${language === 'ar' ? 'rtl' : 'ltr'}`}> 
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('vehicles.entryTime')}</p>
                      <p className="text-xs font-bold text-gray-800">{formatDateTimeForDisplay(scannedVehicleData.entryTime)}</p>
                    </div> 
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('vehicles.duration')}</p>
                      <p className="text-xs font-bold text-gray-800">{computeDuration(scannedVehicleData.entryTime, null)}</p>
                    </div> 
                  </div> 

                  <div className="bg-white p-6 rounded-2xl border-2 border-premium-gold/30 text-center relative overflow-hidden shadow-[0_0_20px_rgba(212,175,55,0.1)]">
                    <div className="absolute top-0 right-0 p-2 opacity-5">
                      <DollarSign size={80} className="text-premium-gold" />
                    </div>
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1">{t('vehicles.parkingFeeDue')}</span>
                    <span className="text-4xl font-black text-gradient-gold drop-shadow-sm">{t('dashboard.omr')} {scannedVehicleData.calculatedFee}</span>
                  </div> 

                  <div className="flex flex-col gap-3 pt-2"> 
                    <button className="ripple-button w-full px-4 py-4 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl font-black text-lg hover:shadow-lg hover:shadow-black/20 active:scale-95 transition-all" onClick={() => handleSelectPaymentOrWaiver('payment')}>{t('vehicles.processPayment')}</button> 
                    <button className="ripple-button w-full px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 shadow-sm active:scale-95 transition-all" onClick={() => handleSelectPaymentOrWaiver('waiver')}>{t('vehicles.applyWaiver')}</button> 
                  </div> 
                </div>
              )}

              {paymentStep === 'paymentMethodSelection' && scannedVehicleData && (
                <div className={`space-y-6 ${language === 'ar' ? 'text-right' : 'text-left'}`}> 
                  <div className="bg-white p-6 rounded-2xl border-2 border-premium-gold/30 text-center shadow-[0_0_20px_rgba(212,175,55,0.1)]">
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1">{t('vehicles.parkingFeeDue')}</span>
                    <span className="text-3xl font-black text-gradient-gold">{t('dashboard.omr')} {scannedVehicleData.calculatedFee}</span>
                  </div> 

                  <h4 className="font-black text-gray-800 uppercase text-sm tracking-widest">{t('vehicles.selectPaymentMethod')}</h4> 
                  <div className="grid grid-cols-2 gap-4"> 
                    <button className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${paymentMethod === 'Cash' ? 'border-premium-gold bg-premium-gold/5 shadow-md scale-105' : 'border-gray-100 hover:border-gray-300 bg-white'}`} onClick={() => setPaymentMethod('Cash')}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${paymentMethod === 'Cash' ? 'bg-gradient-gold text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
                        <DollarSign size={24} />
                      </div>
                      <div className="text-center">
                        <div className="font-black text-gray-800">{t('paymentReport.cash')}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{t('vehicles.collectCash')}</div>
                      </div>
                    </button> 
                    <button className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${paymentMethod === 'Card' ? 'border-premium-gold bg-premium-gold/5 shadow-md scale-105' : 'border-gray-100 hover:border-gray-300 bg-white'}`} onClick={() => setPaymentMethod('Card')}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${paymentMethod === 'Card' ? 'bg-gradient-gold text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
                        <CreditCard size={24} />
                      </div>
                      <div className="text-center">
                        <div className="font-black text-gray-800">{t('paymentReport.card')}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{t('vehicles.processCard')}</div>
                      </div>
                    </button> 
                  </div> 

                  <button className="ripple-button w-full px-4 py-4 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl font-black text-lg hover:shadow-lg hover:shadow-black/20 active:scale-95 transition-all mt-6" onClick={handleProcessPayment}>
                    {t('vehicles.completePayment')}
                  </button> 
                </div>
              )}

              {paymentStep === 'waiverReasonInput' && scannedVehicleData && (
                <div className={`space-y-6 ${language === 'ar' ? 'text-right' : 'text-left'}`}> 
                  <div>
                    <h4 className="font-black text-gray-800 uppercase text-xs tracking-widest mb-2">{t('vehicles.waiverReason')}</h4> 
                    <textarea 
                      value={waiverRemarks} 
                      onChange={(e) => setWaiverRemarks(e.target.value)} 
                      className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/50 bg-gray-50 focus:bg-white transition-all font-medium ${language === 'ar' ? 'text-right' : 'text-left'}`} 
                      rows="4" 
                      placeholder={t('vehicles.enterWaiverReason')} 
                    /> 
                  </div>
                  <button className="ripple-button w-full px-4 py-4 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl font-black text-lg hover:shadow-lg hover:shadow-black/20 active:scale-95 transition-all" onClick={handleConfirmWaiver}>{t('vehicles.confirmWaiver')}</button> 
                </div>
              )}

              {paymentStep === 'receipt' && scannedVehicleData && (
                <div className="py-2"> 
                  <div className={`w-full p-5 rounded-2xl mb-6 flex items-center gap-4 ${scannedVehicleData.paymentMethod === 'Waiver' ? 'bg-gray-50 border border-gray-200' : 'bg-premium-gold/5 border border-premium-gold/20'} ${language === 'ar' ? 'flex-row-reverse text-right' : 'text-left'}`}> 
                    <div className={`rounded-full p-3 text-white shadow-lg ${scannedVehicleData.paymentMethod === 'Waiver' ? 'bg-gray-800 shadow-gray-200' : 'bg-gradient-gold shadow-premium-gold/30'}`}>
                      <Check size={24} />
                    </div> 
                    <div>
                      <h4 className={`font-black text-lg ${scannedVehicleData.paymentMethod === 'Waiver' ? 'text-gray-900' : 'text-premium-gold'}`}>{scannedVehicleData.paymentMethod === 'Waiver' ? t('vehicles.waiverAppliedSuccess') : t('vehicles.paymentSuccess')}</h4>
                      <p className={`text-sm font-bold ${scannedVehicleData.paymentMethod === 'Waiver' ? 'text-gray-500' : 'text-premium-gold/70'}`}>{t('vehicles.receiptGenerated')}</p>
                    </div> 
                  </div> 

                  <div ref={receiptRef} className={`border-2 border-gray-100 p-8 rounded-2xl bg-white shadow-inner ${language === 'ar' ? 'text-right' : 'text-left'}`}> 
                    <div className="text-center mb-8 border-b border-gray-100 pb-6"> 
                      <img src="https://img-wrapper.vercel.app/image?url=https://i.ibb.co/K9fK5dK/Life-Line-Logo.png" alt="Logo" className="w-16 h-auto mx-auto mb-4" /> 
                      <h3 className="text-lg font-black text-gray-800 uppercase tracking-widest">{scannedVehicleData.paymentMethod === 'Waiver' ? t('vehicles.waiverConfirmation') : t('vehicles.paymentReceipt')}</h3> 
                      <p className="text-[10px] font-black text-gray-300 mt-2 uppercase tracking-widest font-mono">NO: {scannedVehicleData.paymentMethod === 'Waiver' ? 'WAIV-' : 'RCPT-'}{Date.now().toString().slice(-8)}</p> 
                    </div> 
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm mb-6 font-medium text-gray-600"> 
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{t('vehicles.vehicleNumber')}</span>
                        <span className="text-gray-800 font-bold">{scannedVehicleData.vehicleNumber}</span>
                      </div> 
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{t('paymentReports.paymentMode')}</span>
                        <span className="text-gray-800 font-bold uppercase">{t(`paymentReports.mode.${scannedVehicleData.paymentMethod?.toLowerCase()}`) || scannedVehicleData.paymentMethod}</span>
                      </div> 
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{t('vehicles.entryTime')}</span>
                        <span className="text-gray-800 font-bold">{formatDateTimeForDisplay(scannedVehicleData.entryTime)}</span>
                      </div> 
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{t('vehicles.exitTime')}</span>
                        <span className="text-gray-800 font-bold">{formatDateTimeForDisplay(scannedVehicleData.exitTime)}</span>
                      </div> 
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{t('vehicles.duration')}</span>
                        <span className="text-gray-800 font-bold">{computeDuration(scannedVehicleData.entryTime, scannedVehicleData.exitTime)}</span>
                      </div> 
                    </div> 
                    {scannedVehicleData.paymentMethod === 'Waiver' && scannedVehicleData.waiverReason && (
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{t('vehicles.waiverReason')}</span>
                        <p className="text-sm text-gray-700 italic">"{scannedVehicleData.waiverReason}"</p>
                      </div>
                    )} 
                    <div className="border-t-4 border-double border-gray-100 pt-6 mt-6"> 
                      <div className={`flex justify-between items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}> 
                        <span className="text-sm font-black text-gray-400 uppercase tracking-widest">{scannedVehicleData.paymentMethod === 'Waiver' ? t('vehicles.feeWaived') : t('vehicles.totalAmountPaid')}</span> 
                        <span className="text-3xl font-black text-primary-red">{t('dashboard.omr')} {scannedVehicleData.paymentAmount}</span> 
                      </div> 
                    </div> 
                    <div className="mt-10 text-center">
                      <div className="w-48 h-12 bg-gray-100 mx-auto rounded flex items-center justify-center text-gray-300 font-mono text-xs tracking-[1em] overflow-hidden">||||||||||||||||||||</div>
                      <p className="text-[10px] font-black text-gray-400 mt-6 uppercase tracking-widest px-4 leading-relaxed">{t('vehicles.thankYou')}</p> 
                    </div>
                  </div> 

                  <div className={`mt-8 flex gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}> 
                     <button className="ripple-button flex-1 px-4 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 flex items-center justify-center transition-all shadow-sm" onClick={handlePrintReceipt}>
                        <Printer size={18} className={language === 'ar' ? 'ml-2' : 'mr-2'} />
                        {t('pricing.print')}
                     </button> 
                    <button className="ripple-button flex-1 px-4 py-3.5 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-black/20 active:scale-95 transition-all" onClick={() => { setShowScanModal(false); setScannedVehicleData(null); setPaymentStep('initial'); setWaiverRemarks(''); }}>{t('common.close')}</button> 
                  </div> 
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Sample Entry Ticket Modal */}
      <AnimatePresence>
        {showSampleEntryTicketModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 no-print backdrop-blur-sm"
            onClick={() => setShowSampleEntryTicketModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-0 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`p-5 border-b flex justify-between items-center bg-gray-50 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <h3 className="text-md font-black text-gray-800 uppercase tracking-tight">{t('vehicles.sampleParkingTicket')}</h3>
                <button
                  onClick={() => setShowSampleEntryTicketModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-colors shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 flex justify-center bg-gray-100/50" ref={entryTicketRef}>
                <SampleEntryTicketContent />
              </div>
              <div className={`p-4 bg-white border-t flex gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={handlePrintEntryTicket}
                  className="ripple-button flex-1 py-3 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-black/20 flex items-center justify-center transition-all active:scale-95"
                >
                  <Printer size={18} className={language === 'ar' ? 'ml-2' : 'mr-2'} /> {t('paymentReport.print')}
                </button>
                <button
                  onClick={() => setShowSampleEntryTicketModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  {t('common.close')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VehicleDetails;
