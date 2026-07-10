import React, { useState, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Plus, Edit, Trash, Printer, Calendar, User, XCircle, Car as CarIcon } from 'lucide-react';
import { apiUrl } from '../utils/api';
import { isEightDigitPhoneNumber, sanitizeDigits } from '../utils/inputValidation';
import { useLanguage } from '../context/LanguageContext';

const initialVehicle = () => ({ number: '', type: 'Car' });

const createEmptyFormData = () => ({
  staffName: '',
  department: '',
  vehicles: [initialVehicle()],
  validFrom: '',
  validUntil: '',
  mobileNumber: ''
});

const normalizeDateValue = (value) => {
  if (!value) return '';

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];

    const dmyMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return '';

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateOnly = (value) => {
  const normalized = normalizeDateValue(value);
  if (!normalized) return null;

  const [year, month, day] = normalized.split('-').map(Number);
  const parsedDate = new Date(year, month - 1, day);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const getTodayDateValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeVehicles = (vehicles = []) => {
  const normalizedVehicles = (vehicles || []).map((vehicle) => ({
    number: vehicle?.number || vehicle?.plateNumber || '',
    type: vehicle?.type || 'Car'
  }));

  return normalizedVehicles.length > 0 ? normalizedVehicles : [initialVehicle()];
};

const buildStaffPassRecord = (pass, formData, vehicles) => ({
  ...pass,
  staffName: formData.staffName,
  department: formData.department,
  mobileNumber: sanitizeDigits(formData.mobileNumber, 8),
  validFrom: normalizeDateValue(formData.validFrom),
  validUntil: normalizeDateValue(formData.validUntil),
  vehicles: vehicles.map((vehicle) => ({
    number: vehicle.number || vehicle.plateNumber || '',
    type: vehicle.type || 'Car'
  }))
});

const Passes = () => {
  const { t, language } = useLanguage();
  const { staffPasses, updateStaffPasses } = useOutletContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedStaffPass, setSelectedStaffPass] = useState(null);
  const passDetailsRef = useRef(null);
  const [formData, setFormData] = useState(createEmptyFormData());

  const filteredStaffPasses = staffPasses.filter(pass =>
    pass.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pass.vehicles && pass.vehicles.some(v => v.number.toLowerCase().includes(searchTerm.toLowerCase()))) ||
    pass.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddVehicleToForm = () => {
    if (formData.vehicles.length < 3) {
      setFormData(prev => ({
        ...prev,
        vehicles: [...prev.vehicles, initialVehicle()]
      }));
    }
  };

  const handleRemoveVehicleFromForm = (index) => {
    if (formData.vehicles.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      vehicles: prev.vehicles.filter((_, i) => i !== index)
    }));
  };

  const handleVehicleInputChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      vehicles: prev.vehicles.map((vehicle, i) =>
        i === index ? { ...vehicle, [field]: value } : vehicle
      )
    }));
  };

  const handleAddPass = () => {
    setSelectedStaffPass(null);
    setFormData(createEmptyFormData());
    setShowForm(true);
  };

  const handleEditPass = (pass) => {
    setSelectedStaffPass(pass);
    setFormData({
      staffName: pass.staffName,
      department: pass.department,
      vehicles: normalizeVehicles(pass.vehicles),
      validFrom: normalizeDateValue(pass.validFrom),
      validUntil: normalizeDateValue(pass.validUntil),
      mobileNumber: sanitizeDigits(pass.mobileNumber || '', 8)
    });
    setShowForm(true);
  };

  const handleDeletePass = async (passId) => {
    try {
      const response = await fetch(apiUrl(`/api/staff-passes/${passId}`), {
        method: 'DELETE'
      });
      if (response.ok) {
        updateStaffPasses(staffPasses.filter(pass => pass.id !== passId));
        if (selectedStaffPass && selectedStaffPass.id === passId) {
          setSelectedStaffPass(null);
        }
      } else {
        alert(t('passes.deleteError'));
      }
    } catch (err) {
      console.error(err);
      alert(t('passes.deleteError'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const filledVehicles = formData.vehicles.filter(v => v.number.trim() !== '');
    if (filledVehicles.length === 0) {
      alert(t('passes.noVehicles'));
      return;
    }

    const mobileNumber = sanitizeDigits(formData.mobileNumber, 8);
    if (!isEightDigitPhoneNumber(mobileNumber)) {
      alert(t('common.phoneNote'));
      return;
    }

    const apiData = {
      staffName: formData.staffName,
      department: formData.department,
      mobileNumber,
      validFrom: normalizeDateValue(formData.validFrom),
      validUntil: normalizeDateValue(formData.validUntil),
      designation: 'Staff',
      passId: `PASS-${Date.now()}`,
      vehicles: filledVehicles.map(v => ({ plateNumber: v.number }))
    };

    try {
      if (selectedStaffPass) {
        const response = await fetch(apiUrl(`/api/staff-passes/${selectedStaffPass.id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...apiData, passId: selectedStaffPass.passId })
        });
        if (response.ok) {
          const updatedPass = buildStaffPassRecord(selectedStaffPass, { ...formData, mobileNumber }, filledVehicles);
          updateStaffPasses(staffPasses.map(pass =>
            pass.id === selectedStaffPass.id ? updatedPass : pass
          ));
          setSelectedStaffPass(updatedPass);
          setShowForm(false);
        } else {
          alert(t('passes.saveError'));
        }
      } else {
        const response = await fetch(apiUrl('/api/staff-passes/'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiData)
        });
        if (response.ok) {
          const resData = await response.json();
          const newPass = buildStaffPassRecord({
            id: resData.id ? resData.id.toString() : Date.now().toString(),
            passId: apiData.passId,
            status: 'active'
          }, { ...formData, mobileNumber }, filledVehicles);
          updateStaffPasses([...staffPasses, newPass]);
          setShowForm(false);
          setSelectedStaffPass(newPass);
        } else {
          alert(t('passes.saveError'));
        }
      }
    } catch (err) {
      console.error(err);
      alert(t('passes.saveError'));
    }
  };

  const getStatusClass = (validUntil) => {
    const today = parseDateOnly(getTodayDateValue());
    const expiryDate = parseDateOnly(validUntil);

    if (!expiryDate || !today) return "text-gray-600 border-gray-200 bg-gray-50";
    if (expiryDate < today) return "text-red-700 border-red-200 bg-red-50";

    const daysLeft = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7) return "text-amber-700 border-amber-200 bg-amber-50";
    return "text-green-700 border-green-200 bg-green-50";
  };

  const getStatusText = (validUntil) => {
    const today = parseDateOnly(getTodayDateValue());
    const expiryDate = parseDateOnly(validUntil);
    if (!expiryDate || !today) return t('passes.validityNotSet');
    if (expiryDate < today) return t('passes.expired');
    const daysLeft = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7) return t(daysLeft === 1 ? 'passes.expiresIn' : 'passes.expiresInPlural', { days: daysLeft });
    return t('passes.active');
  };

  const handlePrintPass = () => {
    const printContent = passDetailsRef.current;
    if (printContent) {
      const originalContents = document.body.innerHTML;
      const printableArea = printContent.innerHTML;
      document.body.innerHTML = `<div class="print-container">${printableArea}</div>`;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  const viewPassDetails = (pass) => { setSelectedStaffPass(pass); };

  return (
    <div className={`p-6 md:p-8 max-w-[1600px] mx-auto ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className={`mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 no-print ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <div className={language === 'ar' ? 'text-right' : 'text-left'}>
          <h1 className="font-logo text-3xl font-black text-gray-900 tracking-wide">{t('passes.title')}</h1>
          <p className="text-gray-500 mt-1 flex items-center font-medium">
            <Plus size={16} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} text-premium-gold`} />
            {t('passes.subtitle')}
          </p>
        </div>
        <button
          className="ripple-button px-5 py-3 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg hover:shadow-black/20 active:scale-95 flex items-center transition-all font-bold text-sm focus:outline-none group"
          onClick={handleAddPass}
        >
          <Plus size={18} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} group-hover:rotate-90 transition-transform text-premium-gold`} />
          <span className="tracking-wide">{t('passes.addNew')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        <div className="lg:col-span-1 premium-card p-6 flex flex-col gap-4 border border-gray-100">
          <div className="relative group">
            <div className={`absolute inset-y-0 ${language === 'ar' ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center pointer-events-none`}>
              <Search size={18} className="text-gray-400 group-focus-within:text-premium-gold transition-colors" />
            </div>
            <input
              type="text"
              className={`block w-full py-4 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold focus:bg-white transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left'}`}
              placeholder={t('passes.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1 mt-2">
            {filteredStaffPasses.map((pass) => (
              <div
                key={pass.id}
                className={`p-4 border rounded-2xl cursor-pointer transition-all ${
                  selectedStaffPass?.id === pass.id
                    ? 'border-premium-gold bg-premium-gold/5 shadow-md shadow-premium-gold/10'
                    : 'border-gray-100 hover:border-premium-gold/30 hover:bg-gray-50/50'
                } ${language === 'ar' ? 'text-right' : 'text-left'}`}
                onClick={() => viewPassDetails(pass)}
              >
                <div className="font-black text-gray-900 text-sm tracking-tight">{pass.staffName}</div>
                <div className="text-xs text-gray-500 font-bold mt-1 tracking-wide">
                  {pass.vehicles && pass.vehicles.length > 0 ? pass.vehicles.map(v => v.number).join(', ') : t('passes.noVehicle')} • {pass.department}
                </div>
                <div className={`text-[10px] font-black uppercase tracking-widest mt-2 inline-flex items-center px-2.5 py-1 rounded-lg border shadow-sm ${getStatusClass(pass.validUntil)}`}>
                  {getStatusText(pass.validUntil)}
                </div>
              </div>
            ))}
            {filteredStaffPasses.length === 0 && (
              <div className="text-center py-12 text-gray-400 font-bold tracking-wide">{t('passes.noPasses')}</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 premium-card p-6 border border-gray-100">
          {selectedStaffPass ? (
            <div ref={passDetailsRef} className={language === 'ar' ? 'text-right' : 'text-left'}>
              <div className={`flex justify-between items-center mb-8 no-print pb-4 border-b border-gray-100 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">{t('passes.details')}</h3>
                <button
                  className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 flex items-center transition-all shadow-sm active:scale-95 focus:outline-none"
                  onClick={handlePrintPass}
                >
                  <Printer size={16} className={`text-premium-gold ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                  <span>{t('passes.print')}</span>
                </button>
              </div>

              <div className="border-2 border-premium-gold/30 rounded-2xl p-6 bg-gradient-to-b from-white to-gray-50/50 shadow-md relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-premium-gold to-yellow-600" />
                
                <div className={`flex flex-col md:flex-row items-center gap-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <div className="flex-shrink-0">
                    <div className="bg-white p-3.5 border border-gray-200 rounded-2xl shadow-sm flex items-center justify-center bg-gradient-to-br from-white to-gray-50">
                      <img src="https://img-wrapper.vercel.app/image?url=https://placehold.co/120x120/121212/c6a87c?text=QR" alt="QR Code" className="w-28 h-28 rounded-lg" />
                    </div>
                  </div>
                  
                  <div className="flex-grow w-full">
                    <div className={`text-center mb-5 ${language === 'ar' ? 'md:text-right' : 'md:text-left'}`}>
                      <div className={`flex items-center justify-center mb-2 gap-3 ${language === 'ar' ? 'md:flex-row-reverse' : 'md:justify-start'}`}>
                        <img src="https://img-wrapper.vercel.app/image?url=https://i.ibb.co/K9fK5dK/Life-Line-Logo.png" alt="Hospital Logo" className="w-10 h-auto" />
                        <h2 className="text-xl font-black text-premium-black tracking-widest uppercase">{t('passes.passTitle')}</h2>
                      </div>
                      <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${getStatusClass(selectedStaffPass.validUntil)}`}>
                        {getStatusText(selectedStaffPass.validUntil)}
                      </span>
                    </div>

                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 border-t border-gray-100 pt-5 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('passes.staffName')}</p>
                        <p className="font-bold text-gray-900 text-sm mt-1">{selectedStaffPass.staffName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('passes.department')}</p>
                        <p className="font-bold text-gray-900 text-sm mt-1">{selectedStaffPass.department}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('passes.mobileNumber')}</p>
                        <p className="font-bold text-gray-900 text-sm mt-1">{selectedStaffPass.mobileNumber || t('common.notProvided')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('passes.validUntil')}</p>
                        <p className="font-bold text-gray-900 text-sm mt-1">{normalizeDateValue(selectedStaffPass.validUntil) || t('common.notProvided')}</p>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-gray-100 pt-5">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{t('passes.registeredVehicles')} ({selectedStaffPass.vehicles?.length || 0}/3)</p>
                      {selectedStaffPass.vehicles && selectedStaffPass.vehicles.length > 0 ? (
                        <div className={`flex flex-wrap gap-2 ${language === 'ar' ? 'justify-end' : ''}`}>
                          {selectedStaffPass.vehicles.map((v, i) => (
                            <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-900 font-mono text-xs font-bold shadow-sm">
                              <CarIcon size={12} className="mr-1.5 text-premium-gold" />
                              {v.number} <span className="text-[10px] text-gray-400 ml-1.5 font-sans font-bold">({t(`passes.${v.type.toLowerCase()}`)})</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="font-bold text-gray-400 text-sm tracking-wide">{t('passes.noVehicles')}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200/80">
                  <div className={`flex flex-col md:flex-row justify-between items-center gap-3 ${language === 'ar' ? 'md:flex-row-reverse' : ''}`}>
                    <div className="flex items-center text-premium-gold font-black text-xs uppercase tracking-widest"><User size={16} className={language === 'ar' ? 'ml-2' : 'mr-2'} /><span>{t('passes.permitType')}</span></div>
                    <div className="flex items-center text-gray-500 font-bold text-xs tracking-wide"><Calendar size={14} className={language === 'ar' ? 'ml-1.5' : 'mr-1.5'} /><span>{t('passes.issueDate')}: {normalizeDateValue(selectedStaffPass.validFrom) || t('common.notProvided')}</span></div>
                  </div>
                  <div className="mt-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <p>{t('passes.authorizedOnly')}</p>
                    <p className="mt-1 text-gray-500">{t('passes.passId')}: {selectedStaffPass.id}</p>
                  </div>
                </div>
              </div>

              <div className={`mt-8 flex justify-end gap-3 no-print ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <button
                  className="px-5 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-100 flex items-center transition-all shadow-sm active:scale-95 focus:outline-none"
                  onClick={() => handleEditPass(selectedStaffPass)}
                >
                  <Edit size={14} className={language === 'ar' ? 'ml-1.5' : 'mr-1.5'} />
                  {t('common.edit')}
                </button>
                <button
                  className="px-5 py-2.5 bg-red-50 border border-red-100 text-red-600 font-bold text-xs rounded-xl hover:bg-red-100 flex items-center transition-all shadow-sm active:scale-95 focus:outline-none"
                  onClick={() => handleDeletePass(selectedStaffPass.id)}
                >
                  <Trash size={14} className={language === 'ar' ? 'ml-1.5' : 'mr-1.5'} />
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400 text-center">
              <User size={64} className="text-gray-200 mb-4" />
              <p className="font-bold text-lg tracking-wide text-gray-500">{t('passes.selectToView')}</p>
              <p className="my-3 text-xs font-black uppercase tracking-widest text-gray-400">{t('common.or')}</p>
              <button
                className="ripple-button px-6 py-3 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white font-bold text-sm rounded-xl flex items-center transition-all shadow-lg hover:shadow-black/20 focus:outline-none group"
                onClick={handleAddPass}
              >
                <Plus size={16} className={`${language === 'ar' ? 'ml-1.5' : 'mr-1.5'} text-premium-gold group-hover:scale-110 transition-transform`} />
                <span className="tracking-wide">{t('passes.addNew')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
          <div className={`bg-white rounded-3xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl ${language === 'ar' ? 'text-right' : 'text-left'}`}>
            <div className={`flex justify-between items-center mb-8 pb-4 border-b border-gray-100 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">{selectedStaffPass ? t('passes.editTitle') : t('passes.createTitle')}</h3>
              <button
                className="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-2 rounded-xl transition-all focus:outline-none"
                onClick={() => setShowForm(false)}
              >
                <XCircle size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-6 bg-gray-50/30 rounded-2xl border border-gray-100">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('passes.staffName')}</label>
                  <input
                    type="text"
                    className={`w-full py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : ''}`}
                    value={formData.staffName}
                    onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('passes.department')}</label>
                  <input
                    type="text"
                    className={`w-full py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : ''}`}
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('passes.mobileNumber')}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    pattern="\d{8}"
                    title={t('common.phoneNote')}
                    className={`w-full py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : ''}`}
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: sanitizeDigits(e.target.value, 8) })}
                    placeholder={t('common.phonePlaceholder')}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('passes.validFrom')}</label>
                  <input
                    type="date"
                    className={`w-full py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : ''}`}
                    value={formData.validFrom}
                    min={selectedStaffPass ? undefined : getTodayDateValue()}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value, validUntil: formData.validUntil && formData.validUntil < e.target.value ? '' : formData.validUntil })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('passes.validUntil')}</label>
                  <input
                    type="date"
                    className={`w-full py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : ''}`}
                    value={formData.validUntil}
                    min={formData.validFrom || (!selectedStaffPass ? getTodayDateValue() : undefined)}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">{t('passes.registeredVehicles')} ({formData.vehicles.length}/3)</label>
                <div className="space-y-3">
                  {formData.vehicles.map((vehicle, index) => (
                    <div key={index} className={`flex items-center gap-3 p-4 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                      <div className="flex-shrink-0 font-black text-sm text-premium-gold">{index + 1}.</div>
                      <div className="relative flex-grow">
                        <CarIcon className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} size={16} />
                        <input
                          type="text"
                          className={`w-full py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm uppercase tracking-wider ${language === 'ar' ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3 text-left'}`}
                          value={vehicle.number}
                          onChange={(e) => handleVehicleInputChange(index, 'number', e.target.value)}
                          placeholder={t('passes.vehiclePlaceholder')}
                          required={index === 0 || vehicle.number.trim() !== ''}
                        />
                      </div>
                      <select
                        className={`px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : ''}`}
                        value={vehicle.type}
                        onChange={(e) => handleVehicleInputChange(index, 'type', e.target.value)}
                      >
                        <option value="Car">{t('passes.car')}</option>
                        <option value="Bike">{t('passes.bike')}</option>
                      </select>
                      {formData.vehicles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVehicleFromForm(index)}
                          className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl focus:outline-none transition-colors"
                          title="Remove Vehicle"
                        >
                          <XCircle size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {formData.vehicles.length < 3 && (
                  <button
                    type="button"
                    onClick={handleAddVehicleToForm}
                    className={`mt-4 w-full py-3 border-2 border-dashed border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 hover:border-premium-gold hover:text-premium-gold flex items-center justify-center text-sm font-bold transition-all focus:outline-none group ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                  >
                    <Plus size={16} className={`group-hover:scale-110 transition-transform ${language === 'ar' ? 'ml-1.5' : 'mr-1.5'}`} /> {t('passes.addAnotherVehicle')}
                  </button>
                )}
              </div>

              <div className={`flex justify-end gap-3 pt-6 border-t border-gray-100 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <button
                  type="button"
                  className="ripple-button px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all shadow-sm focus:outline-none"
                  onClick={() => setShowForm(false)}
                >
                  {t('passes.cancel')}
                </button>
                <button
                  type="submit"
                  className="ripple-button px-8 py-3 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg hover:shadow-black/20 active:scale-95 font-bold text-sm transition-all focus:outline-none"
                >
                  <span className="tracking-wide">{selectedStaffPass ? t('passes.update') : t('passes.create')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Passes;
