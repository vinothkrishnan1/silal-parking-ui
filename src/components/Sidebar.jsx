import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Car,
  Camera,
  CreditCard,
  Settings as SettingsIcon,
  DollarSign,
  ParkingSquare,
  FileText,
  Receipt,
  UserPlus,
  LogOut,
  MonitorPlay,
  Bell,
  ChevronsUpDown,
  History,
  Languages
} from 'lucide-react';
import NotificationModal from './NotificationModal';
import { useLanguage } from '../context/LanguageContext';

const Sidebar = ({ onLogout, notifications, onMarkAsRead, onMarkAllAsRead, onClearAll }) => {
  const navigate = useNavigate();
  const { language, toggleLanguage, t } = useLanguage();
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  const navItems = [
    { path: '/', icon: <Home size={20} />, label: t('sidebar.dashboard') },
    { path: '/vehicles', icon: <Car size={20} />, label: t('sidebar.liveParking') },
    { path: '/slots', icon: <ParkingSquare size={20} />, label: t('sidebar.slotManagement') },
    { path: '/reports', icon: <FileText size={20} />, label: t('sidebar.reports') },
    { path: '/payment-report', icon: <Receipt size={20} />, label: t('sidebar.paymentReports') },
    { path: '/pricing', icon: <DollarSign size={20} />, label: t('sidebar.pricing') },
    { path: '/passes', icon: <CreditCard size={20} />, label: t('sidebar.passes') },
    { path: '/tenant-vehicles', icon: <Car size={20} />, label: t('sidebar.tenantSubscriptions') },
    { path: '/tenant-subscription-history', icon: <History size={20} />, label: t('sidebar.tenantHistory') },
    { path: '/tenant-master', icon: <UserPlus size={20} />, label: t('sidebar.tenantMaster') },
    { path: '/cameras', icon: <Camera size={20} />, label: t('sidebar.deviceConfig') },
    { path: '/kiosk-management', icon: <MonitorPlay size={20} />, label: t('sidebar.kioskManagement') },
    { path: '/boom-barrier-control', icon: <ChevronsUpDown size={20} />, label: t('sidebar.boomBarrier') },
    { path: '/add-user', icon: <UserPlus size={20} />, label: t('sidebar.addUser') },
    { path: '/settings', icon: <SettingsIcon size={20} />, label: t('sidebar.settings') }
  ];

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    }
    navigate('/login');
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read && !n.resolved).length;

  return (
    <>
      <div className={`w-64 bg-premium-black shadow-2xl h-full flex flex-col relative z-20 ${language === 'ar' ? 'border-l border-white/5' : 'border-r border-white/5'}`}>
        {/* Header Section */}
        <div className="px-6 py-6 border-b border-white/5 flex items-center justify-center relative backdrop-blur-sm">
          <div className="flex items-center justify-center">
            <img
              src="/images/pro-parking-.png"
              alt="Pro Parking Logo"
              className="h-16 w-32 object-contain brightness-0 invert" 
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
            <span style={{ display: 'none' }} className="text-[#c6a87c] font-logo font-bold text-2xl tracking-widest">BOULEVARD</span>
          </div>
          
          <button
            onClick={() => setShowNotificationModal(true)}
            className="absolute right-4 p-2 rounded-xl text-gray-400 hover:bg-[#c6a87c]/10 hover:text-[#c6a87c] transition-all duration-300 focus:outline-none"
            title="View Notifications"
          >
            <Bell size={20} className="transition-transform duration-300 hover:scale-110" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c6a87c] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#c6a87c]"></span>
              </span>
            )}
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="mt-6 px-4 flex-grow overflow-y-auto scrollbar-premium" style={{ scrollbarWidth: 'thin' }}>
          <ul className="space-y-1 pb-4">
            {navItems.map((item, index) => (
              <li key={index}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `group flex items-center px-4 py-3.5 mb-1.5 rounded-xl transition-all duration-300 ease-in-out ripple-button ${
                      isActive
                        ? 'bg-gradient-to-r from-premium-gold/10 to-transparent text-premium-gold shadow-[inset_4px_0_0_0_#D4AF37] border-r border-premium-gold/20'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white hover:translate-x-1'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={`${language === 'ar' ? 'ml-3' : 'mr-3'} transition-transform duration-300 ${isActive ? 'scale-110 text-premium-gold drop-shadow-glow' : 'group-hover:scale-110 group-hover:text-premium-gold'}`}>
                        {item.icon}
                      </span>
                      <span className="text-[13px] tracking-wide">{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer Section */}
        <div className="p-5 mt-auto border-t border-white/5 bg-premium-black/50 backdrop-blur-md flex flex-col gap-3">
          <button
            onClick={toggleLanguage}
            className="ripple-button group w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 text-gray-300 rounded-xl border border-white/10 hover:border-premium-gold/40 hover:bg-premium-gold/10 hover:text-premium-gold transition-all duration-300 shadow-sm focus:outline-none"
            title={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
          >
            <Languages size={18} className="transition-transform duration-300 group-hover:rotate-12" />
            <span className="font-semibold text-sm tracking-wide">
              {language === 'en' ? 'العربية' : 'English'}
            </span>
          </button>
          
          <button
            onClick={handleLogoutClick}
            className="ripple-button group w-full flex items-center justify-center px-4 py-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all duration-300 focus:outline-none"
          >
            <LogOut size={18} className={`transition-transform duration-300 group-hover:-translate-x-1 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
            <span className="font-medium text-sm tracking-wide">{t('sidebar.logout')}</span>
          </button>
          
          <p className="mt-2 text-[10px] font-medium text-gray-500 text-center uppercase tracking-wider">
            &copy; {new Date().getFullYear()} Pro Parking
          </p>
        </div>
      </div>

      <NotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        notifications={notifications}
        onMarkAsRead={onMarkAsRead}
        onMarkAllAsRead={onMarkAllAsRead}
        onClearAll={onClearAll}
      />
    </>
  );
};

export default Sidebar;
