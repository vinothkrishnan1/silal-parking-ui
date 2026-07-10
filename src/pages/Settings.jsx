import React, { useState } from 'react';
import { Save, User, Mail, Phone, Building, Lock, LogOut as LogOutIcon, LogIn as LogInIcon, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAppTimeZone, setAppTimeZone, TIMEZONE_OPTIONS, useAppTimeZone } from '../utils/dateTime';
import { isEightDigitPhoneNumber, sanitizeDigits } from '../utils/inputValidation';
import { useLanguage } from '../context/LanguageContext';

const Settings = ({ onLogout, onUser1Login }) => { // Added onUser1Login prop
  const navigate = useNavigate();
  const { language, content, t } = useLanguage();
  const currentTimeZone = useAppTimeZone();
  const [accountData, setAccountData] = useState(() => {
    const savedData = localStorage.getItem('appAccountDetails');
    if (savedData) {
      try {
        return JSON.parse(savedData);
      } catch (e) {
        console.error('Failed to parse saved account details:', e);
      }
    }
    return {
      name: 'Life Line Admin',
      email: 'admin@lifeline.com',
      phone: '91234567',
      organization: 'Pro Parking',
      position: 'Parking Administrator'
    };
  });
  const [changePassword, setChangePassword] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [timeZone, setTimeZoneState] = useState(getAppTimeZone());
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const handleAccountChange = (e) => {
    const { name, value } = e.target;
    const finalValue = name === 'phone' ? sanitizeDigits(value, 8) : value;
    setAccountData({ ...accountData, [name]: finalValue });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setChangePassword({ ...changePassword, [name]: value });
  };

  const handleSaveAccount = (e) => {
    e.preventDefault();
    if (!isEightDigitPhoneNumber(accountData.phone)) {
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'يجب أن يتكون رقم الهاتف من 8 أرقام بالضبط.' : 'Phone number must be exactly 8 digits.'
      });
      setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
      return;
    }
    localStorage.setItem('appAccountDetails', JSON.stringify(accountData));
    setAppTimeZone(timeZone);
    setFeedback({
      type: 'success',
      message: language === 'ar' ? 'تم حفظ تفاصيل الحساب بنجاح.' : 'Account details saved successfully.'
    });
    setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
  };

  const handleSavePassword = (e) => {
    e.preventDefault();
    if (changePassword.newPassword !== changePassword.confirmPassword) {
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'كلمات المرور الجديدة غير متطابقة.' : 'New passwords do not match.'
      });
      setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
      return;
    }

    // Dynamic Password Change Logic
    const APP_USERS_KEY = "appUsers";
    const savedUsers = localStorage.getItem(APP_USERS_KEY);
    let users = savedUsers ? JSON.parse(savedUsers) : [];

    // Find or create admin user
    let adminUserIndex = users.findIndex(u => (u.userName || "").trim().toLowerCase() === "admin");

    if (adminUserIndex >= 0) {
      // Verify current password if it exists
      if (users[adminUserIndex].password && users[adminUserIndex].password !== changePassword.currentPassword) {
        setFeedback({
          type: 'error',
          message: language === 'ar' ? 'كلمة المرور الحالية غير صحيحة.' : 'Current password is incorrect.'
        });
        setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
        return;
      }
      users[adminUserIndex].password = changePassword.newPassword;
    } else {
      // Default fallback verification for first-time password change
      const validFallbacks = ["password", "", "lifelineproparking@2025", "P@ssw0rd@123"];
      if (!validFallbacks.includes(changePassword.currentPassword)) {
        setFeedback({
          type: 'error',
          message: language === 'ar' ? 'كلمة المرور الحالية غير صحيحة.' : 'Current password is incorrect.'
        });
        setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
        return;
      }
      // Create admin user record in local storage
      users.push({
        id: Date.now(),
        userName: "admin",
        password: changePassword.newPassword,
        role: "admin"
      });
    }

    localStorage.setItem(APP_USERS_KEY, JSON.stringify(users));

    setFeedback({
      type: 'success',
      message: language === 'ar' ? 'تم تغيير كلمة المرور بنجاح.' : 'Password changed successfully.'
    });
    setChangePassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
  };

  const handleSettingsPageLogoutClick = () => {
    if (onLogout) {
      onLogout();
    }
    navigate('/login');
  };

  const handleGoToUser1View = () => { // Renamed for clarity
    if (onLogout) { // Log out admin first
      onLogout();
    }
    if (onUser1Login) { // Log in User1
      onUser1Login();
    }
    navigate('/user1/live-parking'); // Navigate directly to User1's live parking page
  };

  return (
    <div className={`p-6 md:p-8 max-w-[1600px] mx-auto ${language === 'ar' ? 'rtl' : 'ltr'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className={`mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <div className={language === 'ar' ? 'text-right' : 'text-left'}>
          <h1 className="font-logo text-3xl font-black text-gray-900 tracking-wide">{content[language].settings.title}</h1>
          <p className="text-gray-500 mt-1 font-medium">{content[language].settings.subtitle}</p>
        </div>
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <button
            onClick={handleGoToUser1View}
            className="ripple-button px-5 py-3 bg-white border border-gray-100 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 flex items-center transition-all shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-premium-black/20"
            title={language === 'ar' ? 'التبديل إلى عرض المستخدم 1 (المواقف المباشرة)' : 'Switch to User1 View (Live Parking)'}
          >
            <LogInIcon size={18} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} text-premium-gold`} />
            {t('settings.user1View')}
          </button>
          <button
            onClick={handleSettingsPageLogoutClick}
            className="ripple-button px-5 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 shadow-md active:scale-95 flex items-center transition-all font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
          >
            <LogOutIcon size={18} className={`${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
            {t('sidebar.logout')}
          </button>
        </div>
      </div>

      {feedback.message && (
        <div className={`mb-8 rounded-xl border p-4 text-sm font-medium shadow-sm flex items-center ${feedback.type === 'success'
            ? 'border-green-100 bg-green-50 text-green-800'
            : 'border-red-100 bg-red-50 text-red-800'
          }`}>
          {feedback.message}
        </div>
      )}

      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <div className={`premium-card p-6 md:p-8 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
          <h3 className="text-xl font-black text-gray-900 tracking-tight mb-6">{t('settings.accountDetails')}</h3>
          <form onSubmit={handleSaveAccount}>
            <div className="space-y-6">
              {[
                { label: t('settings.fullName'), name: 'name', type: 'text', icon: <User size={18} className="text-gray-400 group-focus-within:text-premium-gold transition-colors" /> },
                { label: t('settings.email'), name: 'email', type: 'email', icon: <Mail size={18} className="text-gray-400 group-focus-within:text-premium-gold transition-colors" /> },
                { label: t('settings.phone'), name: 'phone', type: 'text', icon: <Phone size={18} className="text-gray-400 group-focus-within:text-premium-gold transition-colors" /> },
                { label: t('settings.organization'), name: 'organization', type: 'text', icon: <Building size={18} className="text-gray-400 group-focus-within:text-premium-gold transition-colors" /> },
                { label: t('settings.position'), name: 'position', type: 'text', icon: <User size={18} className="text-gray-400 group-focus-within:text-premium-gold transition-colors" /> }
              ].map(field => (
                <div key={field.name}>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{field.label}</label>
                  <div className="relative group">
                    <div className={`absolute inset-y-0 ${language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>{field.icon}</div>
                    <input type={field.type} name={field.name} inputMode={field.name === 'phone' ? 'numeric' : undefined} maxLength={field.name === 'phone' ? 8 : undefined} pattern={field.name === 'phone' ? '\\d{8}' : undefined} title={field.name === 'phone' ? (language === 'ar' ? 'أدخل 8 أرقام بالضبط' : 'Enter exactly 8 digits') : undefined} className={`block w-full py-3.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold focus:bg-white transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`} value={accountData[field.name]} onChange={handleAccountChange} />
                  </div>
                </div>
              ))}
            </div>
            <div className={`mt-10 flex ${language === 'ar' ? 'justify-start' : 'justify-end'}`}>
              <button type="submit" className="ripple-button px-8 py-3.5 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white font-bold text-sm rounded-xl hover:shadow-lg hover:shadow-black/20 active:scale-95 flex items-center transition-all focus:outline-none group">
                <Save size={18} className={`text-premium-gold transition-transform duration-300 group-hover:scale-110 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                <span className="tracking-wide">{t('common.save')}</span>
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className={`premium-card p-6 md:p-8 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
            <h3 className="text-xl font-black text-gray-900 tracking-tight mb-6">{t('settings.timezoneSettings')}</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('settings.displayTimezone')}</label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 ${language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
                    <Globe size={18} className="text-gray-400 group-focus-within:text-premium-gold transition-colors" />
                  </div>
                  <select
                    name="timezone"
                    className={`block w-full py-3.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold focus:bg-white transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`}
                    value={timeZone}
                    onChange={(e) => setTimeZoneState(e.target.value)}
                  >
                    {TIMEZONE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({option.value})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-premium-gold/20 bg-premium-gold/5 p-4 text-sm text-gray-800 shadow-inner">
                {t('settings.activeTimezone')}: <span className="font-black text-premium-gold tracking-tight ml-1">{currentTimeZone}</span>
              </div>

              <p className="text-sm text-gray-500 font-bold">
                {t('settings.timezoneHelp')}
              </p>
            </div>
          </div>

          <div className={`premium-card p-6 md:p-8 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
            <h3 className="text-xl font-black text-gray-900 tracking-tight mb-6">{t('settings.changePassword')}</h3>
            <form onSubmit={handleSavePassword}>
              <div className="space-y-6">
                {[
                  { label: t('settings.currentPassword'), name: 'currentPassword', type: 'password' },
                  { label: t('settings.newPassword'), name: 'newPassword', type: 'password' },
                  { label: t('settings.confirmPassword'), name: 'confirmPassword', type: 'password' }
                ].map(field => (
                  <div key={field.name}>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{field.label}</label>
                    <div className="relative group">
                      <div className={`absolute inset-y-0 ${language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}><Lock size={18} className="text-gray-400 group-focus-within:text-premium-gold transition-colors" /></div>
                      <input type={field.type} name={field.name} className={`block w-full py-3.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold focus:bg-white transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`} value={changePassword[field.name]} onChange={handlePasswordChange} required minLength={field.name === 'newPassword' ? 8 : undefined} />
                    </div>
                    {field.name === 'newPassword' && <p className="mt-2 text-xs text-gray-500 font-bold">{t('settings.passwordHelp')}</p>}
                  </div>
                ))}
              </div>
              <div className={`mt-10 flex ${language === 'ar' ? 'justify-start' : 'justify-end'}`}>
                <button type="submit" className="ripple-button px-8 py-3.5 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-premium-black/20">
                  {t('settings.changePassword')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
