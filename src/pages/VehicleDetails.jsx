import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Filter, Calendar, Clock, Car, X, Eye, Plus, QrCode, Check, Printer, CreditCard, DollarSign, FileText, Ticket, Users, ChevronLeft, ChevronRight, MapPin, Smartphone, Globe, ShoppingBag, Star, Wifi, Shield, Download, Mail, MessageSquare } from 'lucide-react';
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
  const { vehiclesData, updateVehiclesData, features } = useOutletContext();
  const enableTenantSubscription = features?.enable_tenant_subscription !== false;
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
  const [addFormState, setAddFormState] = useState({ vehicleNumber: '', entryTime: '', type: 'Visitor', location_id: '', plateImage: 'https://placehold.co/300x100/333/white?text=NEW+PLATE' });
  const [slotData, setSlotData] = useState(null);
  const [tick, setTick] = useState(0);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [showExitVehicleModal, setShowExitVehicleModal] = useState(false);
  const [exitVehicleNumber, setExitVehicleNumber] = useState('');
  const [exitVehicleError, setExitVehicleError] = useState('');
  // QR Payment Simulation state
  const [scanVehicleInput, setScanVehicleInput] = useState('');
  const [scanVehicleError, setScanVehicleError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [paymentGatewayData, setPaymentGatewayData] = useState({ cardNumber: '', expiry: '', cvv: '', name: '' });
  const [paymentGatewayError, setPaymentGatewayError] = useState('');
  const [qrPaymentType, setQrPaymentType] = useState('onDemand'); // 'onDemand' | 'monthlyPass'
  const [pricingPlans, setPricingPlans] = useState([]);
  const [pricingLoading, setPricingLoading] = useState(false);

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

  // Fetch pricing plans from /api/pricing/ for Monthly Pass slot grid
  useEffect(() => {
    const fetchPricingPlans = async () => {
      setPricingLoading(true);
      try {
        const response = await fetch(apiUrl('/api/pricing/'));
        if (response.ok) {
          const data = await response.json();
          setPricingPlans(data.filter(p => p.is_active));
        }
      } catch (err) {
        console.error('Error fetching pricing plans:', err);
      } finally {
        setPricingLoading(false);
      }
    };
    fetchPricingPlans();
  }, []);

  useEffect(() => {
    if (locations && locations.length > 0 && !addFormState.location_id) {
      setAddFormState(prev => ({ ...prev, location_id: locations[0].id.toString() }));
    }
  }, [locations]);

  const fetchSlotData = async () => {
    try {
      const url = selectedLocation === 'all' 
        ? apiUrl('/api/vehicles/dashboard') 
        : apiUrl(`/api/vehicles/dashboard?location_id=${selectedLocation}`);
      const response = await fetch(url);
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
  }, [selectedLocation]);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const receiptRef = useRef(null);
  const [showSampleEntryTicketModal, setShowSampleEntryTicketModal] = useState(false);
  const entryTicketRef = useRef(null);

  const vehiclesInsideParking = vehiclesData.filter(vehicle => !vehicle.exitTime);

  const filteredVehiclesToDisplay = vehiclesInsideParking.filter(vehicle => {
    if (selectedLocation !== 'all' && vehicle.location_id?.toString() !== selectedLocation) return false;
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
      location_id: locations.length > 0 ? locations[0].id.toString() : '',
      plateImage: 'https://placehold.co/300x100/333/white?text=NEW+PLATE'
    });
    setShowAddFormModal(true);
  };

  const handleOpenExitVehicleModal = () => {
    setExitVehicleNumber('');
    setExitVehicleError('');
    setShowExitVehicleModal(true);
  };

  const handleVerifyExitVehicle = () => {
    if (!exitVehicleNumber.trim()) {
      setExitVehicleError(t('common.error') || 'Please enter a vehicle number');
      return;
    }
    
    const insideVehicles = vehiclesData.filter(v => !v.exitTime);
    const matchedVehicle = insideVehicles.find(v => v.vehicleNumber.toLowerCase() === exitVehicleNumber.trim().toLowerCase());
    
    if (matchedVehicle) {
      setExitVehicleError('');
      setShowExitVehicleModal(false);
      setShowScanModal(true);
      setPaymentStep('methodOrWaiverSelection');
      setScannedVehicleData({
        ...matchedVehicle,
        calculatedFee: calculateParkingFee(matchedVehicle),
        paymentTime: new Date().toISOString()
      });
    } else {
      setExitVehicleError(t('vehicles.noVehiclesFound'));
    }
  };

  const handleScanTicket = () => {
    setShowScanModal(true);
    setPaymentStep('initial');
    setScannedVehicleData(null);
    setWaiverRemarks('');
    setScanVehicleInput('');
    setScanVehicleError('');
    setSelectedSlot(null);
    setPaymentGatewayData({ cardNumber: '', expiry: '', cvv: '', name: '' });
    setPaymentGatewayError('');
  };

  const handleQrScanSimulate = () => {
    // Simulate QR scan auto-detecting a vehicle
    const insideVehicles = vehiclesData.filter(v => !v.exitTime);
    if (insideVehicles.length > 0) {
      const randomVehicle = insideVehicles[Math.floor(Math.random() * insideVehicles.length)];
      setScannedVehicleData({
        ...randomVehicle,
        calculatedFee: calculateParkingFee(randomVehicle),
        paymentTime: new Date().toISOString()
      });
      setScanVehicleInput(randomVehicle.vehicleNumber);
      setPaymentStep('qrLanding');
    } else {
      setScanVehicleError('No vehicles currently inside parking.');
    }
  };

  const handleScanVehicleLookup = () => {
    if (!scanVehicleInput.trim()) {
      setScanVehicleError('Please enter a vehicle number.');
      return;
    }
    const insideVehicles = vehiclesData.filter(v => !v.exitTime);
    const matched = insideVehicles.find(v => v.vehicleNumber.toLowerCase() === scanVehicleInput.trim().toLowerCase());
    if (matched) {
      setScanVehicleError('');
      setScannedVehicleData({
        ...matched,
        calculatedFee: calculateParkingFee(matched),
        paymentTime: new Date().toISOString()
      });
      setPaymentStep('qrLanding');
    } else {
      setScanVehicleError('Vehicle not found inside parking. Check the number and try again.');
    }
  };

  const handleOpenScanWithVehicle = (vehicle) => {
    setShowPreviewModal(false);
    setShowScanModal(true);
    setScanVehicleInput(vehicle.vehicleNumber);
    setScanVehicleError('');
    setSelectedSlot(null);
    setPaymentGatewayData({ cardNumber: '', expiry: '', cvv: '', name: '' });
    setPaymentGatewayError('');
    setWaiverRemarks('');
    setScannedVehicleData({
      ...vehicle,
      calculatedFee: calculateParkingFee(vehicle),
      paymentTime: new Date().toISOString()
    });
    setPaymentStep('qrLanding');
  };

  const handleGatewayPayment = (nextStep) => {
    if (!paymentGatewayData.name.trim()) { setPaymentGatewayError('Please enter cardholder name.'); return; }
    const rawCard = paymentGatewayData.cardNumber.replace(/\s/g, '');
    if (rawCard.length < 12) { setPaymentGatewayError('Please enter a valid card number.'); return; }
    if (!paymentGatewayData.expiry.trim()) { setPaymentGatewayError('Please enter card expiry.'); return; }
    if (paymentGatewayData.cvv.length < 3) { setPaymentGatewayError('Please enter a valid CVV.'); return; }
    setPaymentGatewayError('');
    setPaymentStep(nextStep);
  };

  // Slot colors palette cycling by index
  const SLOT_COLORS = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-amber-500 to-orange-500',
    'from-green-500 to-emerald-600',
    'from-rose-500 to-pink-600',
    'from-cyan-500 to-sky-600',
  ];

  // Derive monthly pass slot cards from live API pricing data
  const MONTHLY_PASS_SLOTS = pricingPlans.length > 0
    ? pricingPlans.map((plan, idx) => {
        // Build duration label: Tenant Subscription plans use start_date/end_date or price directly
        // Visitor Parking plans use their tiers
        let durationLabel = 'Plan';
        let priceDisplay = '0.000';
        let featuresArr = [plan.pricing_type, plan.vehicle_type || '4-Wheeler', 'Digital Receipt'];

        // Subscription-type plans (Tenant Subscription, Visitor Subscription, etc.)
        // use the flat plan.price field. Visitor Parking plans use tiers.
        const isSubscriptionPlan = plan.pricing_type?.toLowerCase().includes('subscription') || (plan.price > 0 && (!plan.tiers || plan.tiers.length === 0));

        if (isSubscriptionPlan) {
          priceDisplay = plan.price != null ? parseFloat(plan.price).toFixed(3) : '0.000';
          durationLabel = 'Subscription';
          if (plan.start_date && plan.end_date) {
            const from = new Date(plan.start_date);
            const to = new Date(plan.end_date);
            const diffDays = Math.round((to - from) / (1000 * 60 * 60 * 24));
            durationLabel = diffDays > 0 ? `${diffDays} Days` : 'Fixed Period';
            featuresArr = [plan.vehicle_type || '4-Wheeler', `Valid ${from.toLocaleDateString('en-GB')} \u2013 ${to.toLocaleDateString('en-GB')}`, 'Unlimited Entries', 'Digital Receipt'];
          } else {
            featuresArr = [plan.vehicle_type || '4-Wheeler', plan.pricing_type, 'Unlimited Entries', 'Digital Receipt'];
          }
        } else if (plan.tiers && plan.tiers.length > 0) {
          // Visitor Parking tier-based plan: use first tier price, show all tiers as features
          priceDisplay = parseFloat(plan.tiers[0].price_omr).toFixed(3);
          durationLabel = `${plan.tiers[0].duration} ${plan.tiers[0].unit}${plan.tiers[0].duration > 1 ? 's' : ''}`;
          featuresArr = [
            plan.vehicle_type || '4-Wheeler',
            ...plan.tiers.map(t => `${t.duration} ${t.unit} \u2014 OMR ${parseFloat(t.price_omr).toFixed(3)}`),
            'Digital Receipt'
          ];
        } else if (plan.price > 0) {
          // Fallback: any plan with a flat price but unrecognised type
          priceDisplay = parseFloat(plan.price).toFixed(3);
          featuresArr = [plan.vehicle_type || '4-Wheeler', plan.pricing_type, 'Digital Receipt'];
        }

        return {
          id: plan.id,
          apiId: plan.id,
          label: plan.name,
          duration: durationLabel,
          price: priceDisplay,
          features: featuresArr,
          color: SLOT_COLORS[idx % SLOT_COLORS.length],
          popular: idx === 1, // mark second plan as popular
          pricingType: plan.pricing_type,
          rawPlan: plan,
        };
      })
    : [
        // Fallback hardcoded slots if API hasn't loaded yet
        { id: 'daily', label: 'Daily Pass', duration: '1 Day', price: '1.500', features: ['24hr Access', 'Single Entry/Exit', 'Digital Receipt'], color: 'from-blue-500 to-blue-600' },
        { id: 'weekly', label: 'Weekly Pass', duration: '7 Days', price: '8.000', features: ['7-Day Access', 'Unlimited Entries', 'Priority Slot', 'Digital Receipt'], color: 'from-purple-500 to-purple-600', popular: true },
        { id: 'monthly', label: 'Monthly Pass', duration: '30 Days', price: '25.000', features: ['30-Day Access', 'Unlimited Entries', 'Reserved Slot', 'SMS Alerts', 'Digital Receipt'], color: 'from-amber-500 to-orange-500' },
      ];


  const calculateParkingFee = (vehicle) => {
    if (!vehicle || !vehicle.entryTime || vehicle.type === 'Staff' || vehicle.paymentStatus === 'waived' || vehicle.hasActiveSubscription) return '0.000';
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

  const handleProcessPayment = async (overrideMethod) => {
    if (!scannedVehicleData) return;
    const exitTime = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const method = typeof overrideMethod === 'string' ? overrideMethod : paymentMethod;
    const paymentData = {
      exitTime: exitTime,
      paymentMethod: method,
      paymentAmount: scannedVehicleData.calculatedFee,
      paymentTime: new Date().toISOString(),
      waiverReason: null
    };

    try {
      if (method.toLowerCase() === 'card') {
        const response = await fetch(apiUrl('/api/payment/process'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            license_plate: scannedVehicleData.vehicleNumber,
            amount: scannedVehicleData.calculatedFee
          })
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
          alert(`Card payment failed: ${data.message || 'Unknown error'}`);
          return; // Stop if payment fails
        }
      } else {
        await fetch(apiUrl('/payment_status'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            license_plate: scannedVehicleData.vehicleNumber,
            payment_status: 'paid',
            payment_mode: method.toLowerCase(),
            payable_amount: scannedVehicleData.calculatedFee
          })
        });
      }
    } catch (error) {
      console.error("Failed to notify backend of payment:", error);
      alert("Payment processing encountered an error.");
      return;
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
          payment_mode: 'waiver',
          payable_amount: 0
        })
      });
    } catch (error) {
      console.error("Failed to notify backend of waiver:", error);
    }

    setScannedVehicleData(prev => ({ ...prev, ...waiverData }));
    processVehicleExitAndUpdateGlobal(scannedVehicleData.id, waiverData);
  };

  const handleAddNewVehicleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(apiUrl('/api/vehicles/add'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleNumber: addFormState.vehicleNumber,
          type: addFormState.type,
          location_id: addFormState.location_id
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        const newVehicleEntry = {
          id: data.id ? data.id.toString() : Date.now().toString(),
          ...addFormState,
          vehicleImage: 'https://placehold.co/400x300/333/white?text=Vehicle+Image',
          exitTime: null,
          paymentProcessedTime: null,
          entryTime: new Date().toISOString()
        };
        updateVehiclesData([...vehiclesData, newVehicleEntry]);
        setShowAddFormModal(false);
      } else {
        alert(data.message || 'Failed to add vehicle');
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      alert('Failed to connect to backend.');
    }
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
          <button className="ripple-button px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-xl hover:shadow-lg hover:shadow-orange-200 flex items-center transition-all active:scale-95 focus:outline-none group font-bold" onClick={handleOpenExitVehicleModal}>
            <Car size={18} className={`transition-transform duration-300 group-hover:translate-x-1 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
            <span className="text-sm">{t('vehicles.processExit') || 'Exit Vehicle'}</span>
          </button>
          <button className="ripple-button px-5 py-2.5 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg hover:shadow-black/20 flex items-center transition-all active:scale-95 focus:outline-none group font-bold" onClick={handleOpenAddVehicleForm}>
            <Plus size={18} className={`transition-transform duration-300 group-hover:rotate-90 ${language === 'ar' ? 'ml-2 text-premium-gold' : 'mr-2 text-premium-gold'}`} />
            <span className="text-sm">{t('vehicles.addVehicle')}</span>
          </button>
        </div>
      </div>

      <div className={`flex overflow-x-auto gap-2 mb-8 pb-2 scrollbar-premium ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <button
          onClick={() => { setSelectedLocation('all'); setSlotData(null); }}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-300 ${
            selectedLocation === 'all'
              ? 'bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white shadow-lg shadow-black/20 scale-105'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          {t('common.all') === 'common.all' ? 'All Locations' : (t('common.all') || 'All Locations')}
        </button>
        {locations.map((loc) => (
          <button
            key={loc.id}
            onClick={() => { setSelectedLocation(loc.id.toString()); setSlotData(null); }}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-300 ${
              selectedLocation === loc.id.toString()
                ? 'bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white shadow-lg shadow-black/20 scale-105'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {loc.location_name}
          </button>
        ))}
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
          <div className={`grid grid-cols-1 md:grid-cols-${enableTenantSubscription ? '2' : '1'} gap-6 relative z-10 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
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

            {enableTenantSubscription && (
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
            )}
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
                <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>{t('common.location') === 'common.location' ? 'Location' : (t('common.location') || 'Location')}</th>
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
                    <div className={`flex items-center gap-2 text-sm font-bold text-gray-700 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                      <MapPin size={15} className="text-gray-400 group-hover:text-premium-gold transition-colors" />
                      <span>{locations.find(loc => loc.id.toString() === vehicle.location_id?.toString())?.location_name || '-'}</span>
                    </div>
                  </td>
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
              <div className={`p-4 bg-gray-50/80 flex gap-3 border-t border-gray-100 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <button className="ripple-button flex-1 px-6 py-3 bg-white border border-gray-200 text-gray-800 font-black rounded-xl hover:bg-gray-50 hover:shadow-md transition-all active:scale-95 shadow-sm" onClick={() => setShowPreviewModal(false)}>{t('common.close')}</button>
                <button
                  className="ripple-button flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black rounded-xl hover:shadow-lg hover:shadow-green-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  onClick={() => handleOpenScanWithVehicle(selectedVehicleForPreview)}
                >
                  <CreditCard size={16} /> Process Payment
                </button>
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
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('common.location') === 'common.location' ? 'Location' : (t('common.location') || 'Location')}</label>
                  <select 
                    className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/50 bg-white font-bold cursor-pointer ${language === 'ar' ? 'text-right' : 'text-left'}`} 
                    value={addFormState.location_id} 
                    onChange={(e) => setAddFormState({ ...addFormState, location_id: e.target.value })}
                    required
                  >
                    <option value="">{t('common.all') === 'common.all' ? 'Select Location' : 'Select Location'}</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.location_name}</option>
                    ))}
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
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className={`p-6 border-b flex justify-between items-center bg-gray-50 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                {paymentStep === 'initial' && t('vehicles.scanTicket')}
                {paymentStep === 'qrLanding' && 'Pro Parking Payment'}
                {paymentStep === 'onDemandDetails' && 'Parking Session Details'}
                {paymentStep === 'onDemandPaymentGateway' && 'Secure Payment'}
                {paymentStep === 'onDemandPaymentProcessing' && 'Processing Payment'}
                {paymentStep === 'purchaseParkingSlots' && 'Purchase Parking Pass'}
                {paymentStep === 'purchaseSlotPaymentGateway' && 'Secure Payment'}
                {paymentStep === 'purchaseProcessing' && 'Activating Pass'}
                {paymentStep === 'slotPurchaseReceipt' && 'Pass Activated!'}
                {paymentStep === 'methodOrWaiverSelection' && t('vehicles.processExit')}
                {paymentStep === 'paymentMethodSelection' && t('vehicles.selectPaymentMethod')}
                {paymentStep === 'waiverReasonInput' && t('vehicles.applyWaiver')}
                {paymentStep === 'receipt' && (scannedVehicleData?.paymentMethod === 'Waiver' ? t('vehicles.waiverConfirmation') : t('vehicles.paymentReceipt'))}
              </h3>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-colors shadow-sm" onClick={() => { setShowScanModal(false); setScannedVehicleData(null); setPaymentStep('initial'); setWaiverRemarks(''); setScanVehicleInput(''); setScanVehicleError(''); setSelectedSlot(null); setPaymentGatewayData({ cardNumber: '', expiry: '', cvv: '', name: '' }); setPaymentGatewayError(''); }}> <X size={20} /> </button>
            </div>

            <div className="p-8">
              {paymentStep === 'initial' && (
                <div className="flex flex-col items-center py-2 text-center">
                  {/* QR Scanner Animation */}
                  <div
                    className="w-48 h-48 bg-premium-black rounded-2xl flex items-center justify-center mb-6 relative border-[6px] border-white shadow-xl shadow-premium-gold/20 cursor-pointer group hover:shadow-2xl hover:shadow-premium-gold/30 transition-all"
                    onClick={handleQrScanSimulate}
                    title="Click to simulate QR scan"
                  >
                    <QrCode size={100} className="text-white opacity-20 group-hover:opacity-30 transition-opacity" />
                    <div className="absolute inset-4 border-2 border-premium-gold rounded-lg"></div>
                    <div className="absolute top-4 left-4 right-4 h-1 bg-premium-gold/80 animate-scan-line shadow-glow"></div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-xl">
                      <span className="text-white text-xs font-bold uppercase tracking-wider">Tap to Scan</span>
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-gray-800 mb-1">{t('vehicles.scanning')}</h4>
                  <p className="text-gray-400 text-xs mb-6">Tap the QR code above to simulate a scan</p>

                  {/* Divider */}
                  <div className="w-full flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-gray-200"></div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">or enter manually</span>
                    <div className="flex-1 h-px bg-gray-200"></div>
                  </div>

                  {/* Vehicle Number Input */}
                  <div className="w-full space-y-3">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest text-left">Vehicle Number</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Car size={16} className="text-gray-400" />
                        </div>
                        <input
                          type="text"
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all bg-gray-50 focus:bg-white text-sm font-bold uppercase placeholder:normal-case placeholder:font-normal"
                          placeholder="e.g. ABC 1234"
                          value={scanVehicleInput}
                          onChange={(e) => { setScanVehicleInput(e.target.value.toUpperCase()); setScanVehicleError(''); }}
                          onKeyDown={(e) => e.key === 'Enter' && handleScanVehicleLookup()}
                        />
                      </div>
                      <button
                        className="px-5 py-3 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-black/20 active:scale-95 transition-all whitespace-nowrap"
                        onClick={handleScanVehicleLookup}
                      >
                        Find
                      </button>
                    </div>
                    {scanVehicleError && (
                      <p className="text-red-500 text-xs font-bold text-left flex items-center gap-1.5">
                        <X size={12} /> {scanVehicleError}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* QR Landing Page */}
              {paymentStep === 'qrLanding' && (
                <div className="space-y-5">
                  {/* Simulated phone/browser landing page */}
                  <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-premium-gold/10 rounded-full blur-3xl"></div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-premium-gold/20 p-2 rounded-lg">
                        <Globe size={18} className="text-premium-gold" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Pro Parking · Silal Market</p>
                        <p className="text-xs font-bold text-gray-200">proparking.silalmarket.com</p>
                      </div>
                      <div className="ml-auto flex items-center gap-1">
                        <Wifi size={12} className="text-green-400" />
                        <Shield size={12} className="text-green-400" />
                      </div>
                    </div>
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-xs text-gray-400 mb-1">Vehicle Detected</p>
                      <h4 className="text-2xl font-black tracking-widest text-white">
                        {scannedVehicleData?.vehicleNumber || scanVehicleInput}
                      </h4>
                      <p className="text-xs text-premium-gold font-bold mt-1 uppercase tracking-wider">
                        {scannedVehicleData?.type || 'Visitor'} · Session Active
                      </p>
                    </div>
                  </div>

                  <p className="text-center text-sm font-bold text-gray-600">What would you like to do?</p>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      className="p-5 rounded-2xl border-2 border-gray-100 hover:border-premium-gold hover:bg-premium-gold/5 transition-all flex flex-col items-center gap-3 group active:scale-95"
                      onClick={() => { setQrPaymentType('onDemand'); setPaymentStep('onDemandDetails'); }}
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform">
                        <CreditCard size={22} />
                      </div>
                      <div className="text-center">
                        <div className="font-black text-gray-800 text-sm">Pay Now</div>
                        <div className="text-[10px] font-bold text-gray-400 mt-0.5">On-Demand Payment</div>
                      </div>
                    </button>
                    <button
                      className="p-5 rounded-2xl border-2 border-gray-100 hover:border-premium-gold hover:bg-premium-gold/5 transition-all flex flex-col items-center gap-3 group active:scale-95"
                      onClick={() => { setQrPaymentType('monthlyPass'); setPaymentStep('purchaseParkingSlots'); }}
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                        <ShoppingBag size={22} />
                      </div>
                      <div className="text-center">
                        <div className="font-black text-gray-800 text-sm">Purchase Parking</div>
                        <div className="text-[10px] font-bold text-gray-400 mt-0.5">Monthly Pass</div>
                      </div>
                    </button>
                  </div>

                  <p className="text-center text-[10px] text-gray-400">
                    🔒 Secured by Pro Parking · SSL Encrypted
                  </p>
                </div>
              )}

              {/* On-Demand Details */}
              {paymentStep === 'onDemandDetails' && scannedVehicleData && (
                <div className="space-y-5">
                  <div className={`bg-premium-gold/5 p-4 rounded-xl border border-premium-gold/20 flex items-center gap-4 shadow-sm ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <div className="bg-gradient-gold rounded-full p-3 text-white shadow-lg shadow-premium-gold/30">
                      <Car size={22} />
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 text-lg">{scannedVehicleData.vehicleNumber}</h4>
                      <p className="text-xs font-bold text-premium-gold uppercase tracking-widest">{scannedVehicleData.type}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Entry Time</p>
                      <p className="text-xs font-bold text-gray-800">{formatDateTimeForDisplay(scannedVehicleData.entryTime)}</p>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Time</p>
                      <p className="text-xs font-bold text-gray-800">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Duration</p>
                      <p className="text-xs font-bold text-gray-800">{computeDuration(scannedVehicleData.entryTime, null)}</p>
                    </div>
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                      <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg">Pending Payment</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border-2 border-premium-gold/30 text-center relative overflow-hidden shadow-[0_0_20px_rgba(212,175,55,0.1)]">
                    <div className="absolute top-0 right-0 p-2 opacity-5"><DollarSign size={80} className="text-premium-gold" /></div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Amount Due</span>
                    <span className="text-4xl font-black text-gradient-gold drop-shadow-sm">{t('dashboard.omr')} {scannedVehicleData.calculatedFee}</span>
                    <p className="text-[10px] text-gray-400 mt-2">Based on configured time slab pricing</p>
                  </div>

                  <button
                    className="ripple-button w-full px-4 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-black text-base hover:shadow-lg hover:shadow-green-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                    onClick={() => setPaymentStep('onDemandPaymentGateway')}
                  >
                    <CreditCard size={18} /> Proceed to Payment
                  </button>
                  <button className="w-full py-2.5 text-sm text-gray-400 font-bold hover:text-gray-600 transition-colors" onClick={() => setPaymentStep('qrLanding')}>← Back</button>
                </div>
              )}

              {/* Online Payment Gateway Simulation - On Demand */}
              {paymentStep === 'onDemandPaymentGateway' && scannedVehicleData && (
                <div className="space-y-5">
                  {/* Gateway Header */}
                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-green-400" />
                      <span className="text-green-400 text-xs font-bold">Secure Payment</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-black text-lg">{t('dashboard.omr')} {scannedVehicleData.calculatedFee}</p>
                      <p className="text-gray-400 text-[10px]">Parking Fee · {scannedVehicleData.vehicleNumber}</p>
                    </div>
                  </div>

                  {/* Card Visual */}
                  <div className="relative h-36 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-5 overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8"></div>
                    <div className="flex justify-between items-start mb-4">
                      <Wifi size={24} className="text-white/70 rotate-90" />
                      <div className="flex gap-1">
                        <div className="w-8 h-8 bg-yellow-400 rounded-full opacity-90"></div>
                        <div className="w-8 h-8 bg-red-500 rounded-full opacity-80 -ml-3"></div>
                      </div>
                    </div>
                    <p className="text-white font-mono text-sm tracking-widest">
                      {paymentGatewayData.cardNumber ? paymentGatewayData.cardNumber.replace(/(.{4})/g,'$1 ').trim() : '**** **** **** ****'}
                    </p>
                    <div className="flex justify-between items-end mt-2">
                      <p className="text-white/70 text-xs font-bold">{paymentGatewayData.name || 'CARDHOLDER NAME'}</p>
                      <p className="text-white/70 text-xs font-mono">{paymentGatewayData.expiry || 'MM/YY'}</p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Cardholder Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-gray-50 focus:bg-white text-sm font-bold transition-all"
                        placeholder="As on card"
                        value={paymentGatewayData.name}
                        onChange={(e) => { setPaymentGatewayData(p => ({ ...p, name: e.target.value })); setPaymentGatewayError(''); }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Card Number</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-gray-50 focus:bg-white text-sm font-bold font-mono tracking-wider transition-all"
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        value={paymentGatewayData.cardNumber}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                          const formatted = v.replace(/(.{4})/g, '$1 ').trim();
                          setPaymentGatewayData(p => ({ ...p, cardNumber: formatted }));
                          setPaymentGatewayError('');
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Expiry</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-gray-50 focus:bg-white text-sm font-bold font-mono transition-all"
                          placeholder="MM/YY"
                          maxLength={5}
                          value={paymentGatewayData.expiry}
                          onChange={(e) => {
                            let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                            if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2);
                            setPaymentGatewayData(p => ({ ...p, expiry: v }));
                            setPaymentGatewayError('');
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">CVV</label>
                        <input
                          type="password"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-gray-50 focus:bg-white text-sm font-bold font-mono transition-all"
                          placeholder="•••"
                          maxLength={4}
                          value={paymentGatewayData.cvv}
                          onChange={(e) => { setPaymentGatewayData(p => ({ ...p, cvv: e.target.value.replace(/\D/g,'').slice(0,4) })); setPaymentGatewayError(''); }}
                        />
                      </div>
                    </div>
                  </div>

                  {paymentGatewayError && (
                    <p className="text-red-500 text-xs font-bold flex items-center gap-1.5"><X size={12} />{paymentGatewayError}</p>
                  )}

                  <button
                    className="ripple-button w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-black text-base hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                    onClick={() => handleGatewayPayment('onDemandPaymentProcessing')}
                  >
                    <Shield size={18} /> Pay {t('dashboard.omr')} {scannedVehicleData.calculatedFee} Securely
                  </button>
                  <p className="text-center text-[10px] text-gray-400">🔒 256-bit SSL Encrypted · PCI DSS Compliant</p>
                  <button className="w-full py-2 text-sm text-gray-400 font-bold hover:text-gray-600 transition-colors" onClick={() => setPaymentStep('onDemandDetails')}>← Back</button>
                </div>
              )}

              {/* Payment Processing */}
              {paymentStep === 'onDemandPaymentProcessing' && (() => {
                setTimeout(() => {
                  const exitTime = new Date().toISOString().slice(0, 16).replace('T', ' ');
                  const paymentData = { exitTime, paymentMethod: 'Card', paymentAmount: scannedVehicleData?.calculatedFee, paymentTime: new Date().toISOString(), waiverReason: null };
                  setScannedVehicleData(prev => ({ ...prev, ...paymentData }));
                  processVehicleExitAndUpdateGlobal(scannedVehicleData?.id, paymentData);
                  fetch(apiUrl('/payment_status'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ license_plate: scannedVehicleData?.vehicleNumber, payment_status: 'paid', payment_mode: 'card', payable_amount: scannedVehicleData?.calculatedFee }) }).catch(() => {});
                }, 2500);
                return (
                  <div className="flex flex-col items-center py-10 gap-6">
                    <div className="relative w-24 h-24">
                      <div className="absolute inset-0 rounded-full border-4 border-gray-100"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 border-r-indigo-600 border-b-transparent border-l-transparent animate-spin"></div>
                      <div className="absolute inset-3 rounded-full bg-indigo-50 flex items-center justify-center">
                        <Shield size={24} className="text-indigo-600" />
                      </div>
                    </div>
                    <div className="text-center">
                      <h4 className="font-black text-gray-800 text-lg">Verifying Payment…</h4>
                      <p className="text-gray-400 text-sm mt-1">Please wait. Do not close this window.</p>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      Communicating with bank…
                    </div>
                  </div>
                );
              })()}

              {/* Purchase Parking Slots */}
              {paymentStep === 'purchaseParkingSlots' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-black text-gray-800 text-base">Choose Your Parking Pass</h4>
                    <p className="text-gray-400 text-xs mt-1">Select a plan that suits your needs</p>
                  </div>

                  <div className="space-y-3">
                    {pricingLoading ? (
                      <div className="flex flex-col items-center py-8 gap-3">
                        <div className="w-10 h-10 rounded-full border-4 border-t-purple-600 border-r-purple-600 border-b-transparent border-l-transparent animate-spin"></div>
                        <p className="text-sm text-gray-400 font-bold">Loading plans from server…</p>
                      </div>
                    ) : MONTHLY_PASS_SLOTS.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-400 text-sm font-bold">No active pricing plans found.</p>
                        <p className="text-gray-300 text-xs mt-1">Please configure pricing plans in the Pricing section.</p>
                      </div>
                    ) : (
                    MONTHLY_PASS_SLOTS.map(slot => (
                      <button
                        key={slot.id}
                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${
                          selectedSlot?.id === slot.id
                            ? 'border-premium-gold bg-premium-gold/5 shadow-md'
                            : 'border-gray-100 hover:border-gray-300 bg-white'
                        }`}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        {slot.popular && (
                          <span className="absolute top-3 right-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                            Most Popular
                          </span>
                        )}
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 bg-gradient-to-br ${slot.color} rounded-xl flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform`}>
                            <ShoppingBag size={20} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h5 className="font-black text-gray-800">{slot.label}</h5>
                              <span className="font-black text-gray-900">{t('dashboard.omr')} {slot.price}</span>
                            </div>
                            <p className="text-xs text-gray-400 font-bold mt-0.5">{slot.duration}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {slot.features.map(f => (
                                <span key={f} className="text-[9px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{f}</span>
                              ))}
                            </div>
                          </div>
                          {selectedSlot?.id === slot.id && (
                            <div className="w-6 h-6 bg-premium-gold rounded-full flex items-center justify-center">
                              <Check size={14} className="text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    )))}
                  </div>

                  <button
                    className={`ripple-button w-full py-4 rounded-xl font-black text-base active:scale-95 transition-all flex items-center justify-center gap-2 ${
                      selectedSlot
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-purple-500/30'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={!selectedSlot}
                    onClick={() => selectedSlot && setPaymentStep('purchaseSlotPaymentGateway')}
                  >
                    <ShoppingBag size={18} />
                    {selectedSlot ? `Proceed to Pay ${t('dashboard.omr')} ${selectedSlot.price}` : 'Select a Pass to Continue'}
                  </button>
                  <button className="w-full py-2 text-sm text-gray-400 font-bold hover:text-gray-600 transition-colors" onClick={() => setPaymentStep('qrLanding')}>← Back</button>
                </div>
              )}

              {/* Slot Payment Gateway */}
              {paymentStep === 'purchaseSlotPaymentGateway' && selectedSlot && (
                <div className="space-y-5">
                  {/* Summary */}
                  <div className={`bg-gradient-to-br ${selectedSlot.color} rounded-xl p-4 text-white`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Purchasing</p>
                        <h4 className="font-black text-xl">{selectedSlot.label}</h4>
                        <p className="text-white/80 text-xs">{selectedSlot.duration} access · {scannedVehicleData?.vehicleNumber || scanVehicleInput}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/70 text-xs">Total</p>
                        <p className="font-black text-2xl">{t('dashboard.omr')} {selectedSlot.price}</p>
                      </div>
                    </div>
                  </div>

                  {/* Same card fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Cardholder Name</label>
                      <input type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 bg-gray-50 focus:bg-white text-sm font-bold transition-all" placeholder="As on card" value={paymentGatewayData.name} onChange={(e) => { setPaymentGatewayData(p => ({ ...p, name: e.target.value })); setPaymentGatewayError(''); }} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Card Number</label>
                      <input type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 bg-gray-50 focus:bg-white text-sm font-bold font-mono tracking-wider transition-all" placeholder="1234 5678 9012 3456" maxLength={19} value={paymentGatewayData.cardNumber} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 16); const formatted = v.replace(/(.{4})/g, '$1 ').trim(); setPaymentGatewayData(p => ({ ...p, cardNumber: formatted })); setPaymentGatewayError(''); }} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Expiry</label>
                        <input type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 bg-gray-50 focus:bg-white text-sm font-bold font-mono transition-all" placeholder="MM/YY" maxLength={5} value={paymentGatewayData.expiry} onChange={(e) => { let v = e.target.value.replace(/\D/g, '').slice(0, 4); if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2); setPaymentGatewayData(p => ({ ...p, expiry: v })); setPaymentGatewayError(''); }} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">CVV</label>
                        <input type="password" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 bg-gray-50 focus:bg-white text-sm font-bold font-mono transition-all" placeholder="•••" maxLength={4} value={paymentGatewayData.cvv} onChange={(e) => { setPaymentGatewayData(p => ({ ...p, cvv: e.target.value.replace(/\D/g,'').slice(0,4) })); setPaymentGatewayError(''); }} />
                      </div>
                    </div>
                  </div>

                  {paymentGatewayError && (
                    <p className="text-red-500 text-xs font-bold flex items-center gap-1.5"><X size={12} />{paymentGatewayError}</p>
                  )}

                  <button
                    className="ripple-button w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-black text-base hover:shadow-lg hover:shadow-purple-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                    onClick={() => handleGatewayPayment('purchaseProcessing')}
                  >
                    <Shield size={18} /> Pay {t('dashboard.omr')} {selectedSlot.price} Securely
                  </button>
                  <p className="text-center text-[10px] text-gray-400">🔒 256-bit SSL Encrypted · PCI DSS Compliant</p>
                  <button className="w-full py-2 text-sm text-gray-400 font-bold hover:text-gray-600 transition-colors" onClick={() => setPaymentStep('purchaseParkingSlots')}>← Back</button>
                </div>
              )}

              {/* Purchase Processing */}
              {paymentStep === 'purchaseProcessing' && (() => {
                const validFrom = new Date();
                const validUntil = new Date();
                if (selectedSlot?.id === 'daily') validUntil.setDate(validUntil.getDate() + 1);
                else if (selectedSlot?.id === 'weekly') validUntil.setDate(validUntil.getDate() + 7);
                else validUntil.setDate(validUntil.getDate() + 30);
                setTimeout(() => setPaymentStep('slotPurchaseReceipt'), 2500);
                return (
                  <div className="flex flex-col items-center py-10 gap-6">
                    <div className="relative w-24 h-24">
                      <div className="absolute inset-0 rounded-full border-4 border-gray-100"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-t-purple-600 border-r-purple-600 border-b-transparent border-l-transparent animate-spin"></div>
                      <div className="absolute inset-3 rounded-full bg-purple-50 flex items-center justify-center">
                        <ShoppingBag size={24} className="text-purple-600" />
                      </div>
                    </div>
                    <div className="text-center">
                      <h4 className="font-black text-gray-800 text-lg">Activating Your Pass…</h4>
                      <p className="text-gray-400 text-sm mt-1">Registering vehicle and slot details.</p>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                );
              })()}

              {/* Slot Purchase Receipt */}
              {paymentStep === 'slotPurchaseReceipt' && selectedSlot && (() => {
                const validFrom = new Date();
                const validUntil = new Date();
                if (selectedSlot?.id === 'daily') validUntil.setDate(validUntil.getDate() + 1);
                else if (selectedSlot?.id === 'weekly') validUntil.setDate(validUntil.getDate() + 7);
                else validUntil.setDate(validUntil.getDate() + 30);
                const refNo = 'PSS-' + Date.now().toString().slice(-8);
                return (
                  <div className="py-2">
                    {/* Success Banner */}
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 text-white mb-5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                          <Check size={24} className="text-white" />
                        </div>
                        <div>
                          <h4 className="font-black text-xl">Pass Activated!</h4>
                          <p className="text-green-100 text-xs">Your {selectedSlot.label} is now active</p>
                        </div>
                      </div>
                    </div>

                    {/* Pass Card */}
                    <div ref={receiptRef} className={`bg-gradient-to-br ${selectedSlot.color} rounded-2xl p-5 text-white relative overflow-hidden mb-5`}>
                      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-12 translate-x-12"></div>
                      <div className="mb-4">
                        <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">Silal Market Pro Parking</p>
                        <h4 className="font-black text-2xl mt-1">{selectedSlot.label}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-y-3 text-sm">
                        <div>
                          <p className="text-white/60 text-[10px] font-black uppercase tracking-wider">Vehicle</p>
                          <p className="font-black text-white">{scannedVehicleData?.vehicleNumber || scanVehicleInput}</p>
                        </div>
                        <div>
                          <p className="text-white/60 text-[10px] font-black uppercase tracking-wider">Amount Paid</p>
                          <p className="font-black text-white">{t('dashboard.omr')} {selectedSlot.price}</p>
                        </div>
                        <div>
                          <p className="text-white/60 text-[10px] font-black uppercase tracking-wider">Valid From</p>
                          <p className="font-bold text-white text-xs">{validFrom.toLocaleDateString('en-GB')}</p>
                        </div>
                        <div>
                          <p className="text-white/60 text-[10px] font-black uppercase tracking-wider">Valid Until</p>
                          <p className="font-bold text-white text-xs">{validUntil.toLocaleDateString('en-GB')}</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/20">
                        <p className="text-white/60 text-[10px] font-black uppercase tracking-wider">Reference</p>
                        <p className="font-mono font-black text-white text-sm tracking-widest">{refNo}</p>
                      </div>
                    </div>

                    {/* Download options */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <button className="p-3 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl flex flex-col items-center gap-1 transition-all" onClick={handlePrintReceipt}>
                        <Printer size={16} className="text-gray-600" />
                        <span className="text-[10px] font-bold text-gray-600">Print</span>
                      </button>
                      <button className="p-3 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl flex flex-col items-center gap-1 transition-all">
                        <Download size={16} className="text-gray-600" />
                        <span className="text-[10px] font-bold text-gray-600">Download</span>
                      </button>
                      <button className="p-3 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl flex flex-col items-center gap-1 transition-all">
                        <Mail size={16} className="text-gray-600" />
                        <span className="text-[10px] font-bold text-gray-600">Email</span>
                      </button>
                    </div>

                    <button
                      className="ripple-button w-full py-3.5 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-black/20 active:scale-95 transition-all"
                      onClick={() => { setShowScanModal(false); setScannedVehicleData(null); setPaymentStep('initial'); setSelectedSlot(null); setScanVehicleInput(''); setPaymentGatewayData({ cardNumber: '', expiry: '', cvv: '', name: '' }); }}
                    >
                      Done
                    </button>
                  </div>
                );
              })()}

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
                    {scannedVehicleData.paymentStatus === 'waived' ? (
                      <>
                        <span className="text-xs font-black text-green-500 uppercase tracking-widest block mb-1">{language === 'ar' ? 'اشتراك فعال' : 'Active Subscription'}</span>
                        <span className="text-2xl font-black text-green-600 drop-shadow-sm">{language === 'ar' ? 'لا يوجد رسوم مطلوبة' : 'No Payment Required'}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1">{t('vehicles.parkingFeeDue')}</span>
                        <span className="text-4xl font-black text-gradient-gold drop-shadow-sm">{t('dashboard.omr')} {scannedVehicleData.calculatedFee}</span>
                      </>
                    )}
                  </div> 

                  <div className="flex flex-col gap-3 pt-2"> 
                    {scannedVehicleData.paymentStatus === 'waived' ? (
                      <button className="ripple-button w-full px-4 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-black text-lg hover:shadow-lg hover:shadow-green-500/20 active:scale-95 transition-all" onClick={() => handleProcessPayment('Subscription')}>{language === 'ar' ? 'تسجيل الخروج' : 'Process Exit'}</button>
                    ) : (
                      <>
                        <button className="ripple-button w-full px-4 py-4 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl font-black text-lg hover:shadow-lg hover:shadow-black/20 active:scale-95 transition-all" onClick={() => handleSelectPaymentOrWaiver('payment')}>{t('vehicles.processPayment')}</button> 
                        <button className="ripple-button w-full px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 shadow-sm active:scale-95 transition-all" onClick={() => handleSelectPaymentOrWaiver('waiver')}>{t('vehicles.applyWaiver')}</button> 
                      </>
                    )}
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

      {showExitVehicleModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 no-print backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md p-0 overflow-hidden shadow-2xl"
          >
            <div className={`p-6 border-b flex justify-between items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-xl font-bold text-gray-800">{t('vehicles.processExit') || 'Exit Vehicle'}</h3>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors" onClick={() => setShowExitVehicleModal(false)}><X size={20} /></button>
            </div>
            <div className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('vehicles.vehicleNumber')}</label>
                  <input 
                    type="text" 
                    className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue bg-gray-50 focus:bg-white transition-all font-bold ${language === 'ar' ? 'text-right' : 'text-left'}`} 
                    value={exitVehicleNumber} 
                    onChange={(e) => setExitVehicleNumber(e.target.value)} 
                    placeholder="Enter Vehicle Number (e.g. ABC 1234)" 
                  />
                  {exitVehicleError && <p className="text-red-500 text-xs mt-2 font-bold">{exitVehicleError}</p>}
                </div>
              </div>
              <div className={`mt-8 flex gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <button type="button" className="ripple-button flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-all shadow-sm" onClick={() => setShowExitVehicleModal(false)}>{t('common.cancel')}</button>
                <button type="button" className="ripple-button flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-orange-200 active:scale-95 transition-all" onClick={handleVerifyExitVehicle}>{t('common.continue') || 'Verify'}</button>
              </div>
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
