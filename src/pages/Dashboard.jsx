import React, { useMemo, useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Car, LogIn, LogOut, ParkingCircle, DollarSign, Clock, AlertTriangle, X, Users } from 'lucide-react';
import StatCard from '../components/StatCard';
import VehicleFlowChart from '../components/VehicleFlowChart';
import { motion } from 'framer-motion';
import { apiUrl } from '../utils/api';
import { parseBackendDate } from '../utils/dateTime';
import { useLanguage } from '../context/LanguageContext';

const Dashboard = () => {
  const { vehiclesData = [], features } = useOutletContext();
  const { language, content, t } = useLanguage();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOverdueAlertModal, setShowOverdueAlertModal] = useState(false);
  const [error, setError] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('all');

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch(apiUrl('/api/locations/'));
        if (response.ok) {
          const data = await response.json();
          setLocations(data);
        }
      } catch (err) {
        console.error('Error fetching locations:', err);
      }
    };
    fetchLocations();
  }, []);

  const overdueVehicles = useMemo(() => {
    const now = new Date();

    return vehiclesData
      .map((vehicle) => {
        const paymentTime = parseBackendDate(vehicle.paymentProcessedTime);
        if (!paymentTime || Number.isNaN(paymentTime.getTime()) || vehicle.exitTime) {
          return null;
        }

        const overdueMinutes = Math.floor((now - paymentTime) / (1000 * 60) - 30);
        if (overdueMinutes <= 0) {
          return null;
        }

        return {
          ...vehicle,
          overdueMinutes
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.overdueMinutes - a.overdueMinutes);
  }, [vehiclesData, dashboardData]);

  const latestOverdueVehicle = overdueVehicles[0] || null;

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(apiUrl(`/api/vehicles/dashboard?location_id=${selectedLocation}`));
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setDashboardData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, [selectedLocation]);

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500 p-6 text-center">
        <AlertTriangle size={48} className="mb-4" />
        <p className="text-xl font-bold mb-2">Failed to Load Dashboard</p>
        <p className="text-sm opacity-80 mb-6">{error}. Please ensure the backend is running.</p>
        <button
          onClick={() => { setLoading(true); fetchDashboardData(); }}
          className="px-6 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  // Safety values
  const visitorAvailable = dashboardData?.visitor?.available || 0;
  const tenantAvailable = dashboardData?.tenant?.available || 0;
  const typeDist = dashboardData?.typeDistribution || { tenant: 0, staff: 0, visitor: 0 };
  const enableTenantSubscription = features?.enable_tenant_subscription !== false;

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-logo text-3xl font-black text-gray-900 tracking-wide">{content[language].dashboard.title}</h1>
          <p className="text-gray-500 mt-1 font-medium">{content[language].dashboard.overview}</p>
        </div>
        <div className="hidden sm:block relative">
          <div className="absolute inset-0 bg-premium-gold/30 blur-xl rounded-full"></div>
          <div className="h-1.5 w-24 bg-gradient-gold rounded-full relative z-10"></div>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 mb-8 pb-2 scrollbar-premium">
        <button
          onClick={() => { setSelectedLocation('all'); setDashboardData(null); setLoading(true); }}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-300 ${
            selectedLocation === 'all'
              ? 'bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white shadow-lg shadow-black/20 scale-105'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          {t('common.all') || 'All Locations'}
        </button>
        {locations.map((loc) => (
          <button
            key={loc.id}
            onClick={() => { setSelectedLocation(loc.id.toString()); setDashboardData(null); setLoading(true); }}
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

      <div className={`grid grid-cols-1 md:grid-cols-2 ${enableTenantSubscription ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6 mb-8`}>
        <div className="transform transition-transform hover:-translate-y-1 duration-300">
          <StatCard
            title={t('dashboard.visitorStaff')}
            value={visitorAvailable}
            icon={<ParkingCircle size={32} className="text-premium-gold" />}
            color="bg-gradient-to-br from-premium-black to-[#1a1a1a] border border-white/10 shadow-lg shadow-black/20"
            isAlert={visitorAvailable < 5}
          />
        </div>
        {enableTenantSubscription && (
          <div className="transform transition-transform hover:-translate-y-1 duration-300">
            <StatCard
              title={t('dashboard.tenantSlots')}
              value={tenantAvailable}
              icon={<Users size={28} className="text-white" />}
              color="bg-gradient-gold shadow-lg shadow-premium-gold/30"
              isAlert={tenantAvailable < 5}
            />
          </div>
        )}
        <div className="transform transition-transform hover:-translate-y-1 duration-300">
          <StatCard
            title={t('dashboard.enteredToday')}
            value={dashboardData?.enteredToday || 0}
            icon={<LogIn size={28} className="text-green-600 drop-shadow-sm" />}
            color="bg-gradient-to-br from-green-50/80 to-white shadow-lg shadow-green-100/50 border border-green-200/60"
          />
        </div>
        <div className="transform transition-transform hover:-translate-y-1 duration-300">
          <StatCard
            title={t('dashboard.exitedToday')}
            value={dashboardData?.exitedToday || 0}
            icon={<LogOut size={28} className="text-red-500 drop-shadow-sm" />}
            color="bg-gradient-to-br from-red-50/80 to-white shadow-lg shadow-red-100/50 border border-red-200/60"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="premium-card p-6 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-premium-gold/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-lg font-black text-gray-900 tracking-tight">{t('dashboard.vehicleFlowToday')}</h3>
          </div>
          <VehicleFlowChart data={dashboardData?.vehicleFlow || []} />
        </div>

        <div className="premium-card p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-6 relative z-10">
            <h3 className="text-lg font-black text-gray-900 tracking-tight">{t('dashboard.occupancySummary')}</h3>
            <div className="h-1.5 w-12 bg-gradient-gold rounded-full"></div>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-${enableTenantSubscription ? '3' : '2'} gap-3 relative z-10`}>
            <div className="bg-gray-50/50 border border-gray-100 p-3 xl:p-4 rounded-xl hover:shadow-md transition-all duration-300 group hover:bg-white hover:border-premium-gold/20">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 group-hover:text-premium-gold transition-colors">{t('dashboard.visitorRevenue')}</p>
              <p className="text-base sm:text-lg xl:text-2xl font-black text-gradient-gold drop-shadow-sm whitespace-nowrap">
                <span className="text-[10px] xl:text-xs font-bold mr-1">OMR</span>
                {dashboardData?.visitorRevenueToday?.toFixed(3) || "0.000"}
              </p>
            </div>

            {enableTenantSubscription && (
              <div className="bg-gray-50/50 border border-gray-100 p-3 xl:p-4 rounded-xl hover:shadow-md transition-all duration-300 group hover:bg-white hover:border-premium-gold/20">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 group-hover:text-premium-gold transition-colors">{t('dashboard.tenantRevenue')}</p>
                <p className="text-base sm:text-lg xl:text-2xl font-black text-gradient-gold drop-shadow-sm whitespace-nowrap">
                  <span className="text-[10px] xl:text-xs font-bold mr-1">OMR</span>
                  {dashboardData?.tenantRevenueToday?.toFixed(3) || "0.000"}
                </p>
              </div>
            )}

            <div className="bg-gray-50/50 border border-gray-100 p-3 xl:p-4 rounded-xl hover:shadow-md transition-all duration-300 group hover:bg-white hover:border-premium-gold/20">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 group-hover:text-gray-600 transition-colors">{t('dashboard.activeTime')}</p>
              <p className="text-[12px] sm:text-sm xl:text-lg font-black text-gray-900 tracking-tight whitespace-nowrap mt-1">{dashboardData?.mostActiveTime || "N/A"}</p>
            </div>

            <div className="bg-gray-50/50 border border-gray-100 p-5 rounded-xl col-span-1 md:col-span-3 hover:shadow-md transition-all duration-300 hover:bg-white">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5">{t('dashboard.currentOccupancy')}</p>
              <div className="space-y-5">
                {enableTenantSubscription && (
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center flex-1">
                      <div className="w-32 bg-gray-200 rounded-full h-3 mr-4 overflow-hidden shadow-inner">
                        <div className="bg-premium-black h-full rounded-full transition-all duration-1000 relative" style={{ width: `${typeDist.tenant || 0}%` }}>
                          <div className="absolute inset-0 bg-white/20 w-full h-full animate-shimmer"></div>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900 transition-colors">{t('dashboard.tenant')}</span>
                    </div>
                    <span className="text-sm font-black text-gray-900 bg-gray-100 px-3 py-1 rounded-lg border border-gray-200 shadow-sm">{typeDist.tenant_count || 0}</span>
                  </div>
                )}

                <div className="flex items-center justify-between group">
                  <div className="flex items-center flex-1">
                    <div className="w-32 bg-gray-200 rounded-full h-3 mr-4 overflow-hidden shadow-inner">
                      <div className="bg-gradient-gold h-full rounded-full transition-all duration-1000 relative" style={{ width: `${typeDist.staff || 0}%` }}>
                        <div className="absolute inset-0 bg-white/20 w-full h-full animate-shimmer" style={{ animationDelay: '0.5s' }}></div>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900 transition-colors">{t('dashboard.staff')}</span>
                  </div>
                  <span className="text-sm font-black text-gray-900 bg-gray-100 px-3 py-1 rounded-lg border border-gray-200 shadow-sm">{typeDist.staff_count || 0}</span>
                </div>

                <div className="flex items-center justify-between group">
                  <div className="flex items-center flex-1">
                    <div className="w-32 bg-gray-200 rounded-full h-3 mr-4 overflow-hidden shadow-inner">
                      <div className="bg-gray-400 h-full rounded-full transition-all duration-1000" style={{ width: `${typeDist.visitor || 0}%` }}></div>
                    </div>
                    <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900 transition-colors">{t('dashboard.visitor')}</span>
                  </div>
                  <span className="text-sm font-black text-gray-900 bg-gray-100 px-3 py-1 rounded-lg border border-gray-200 shadow-sm">{typeDist.visitor_count || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50/50 border border-gray-100 p-5 rounded-xl col-span-1 md:col-span-3 hover:shadow-md transition-all duration-300 hover:bg-white">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t('dashboard.recentActivity')}</p>
              <div className="text-sm space-y-3 max-h-36 overflow-y-auto pr-2 scrollbar-premium" style={{ scrollbarWidth: 'thin' }}>
                {dashboardData?.recentActivity?.length > 0 ? (
                  dashboardData.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start text-xs border-b border-gray-100 pb-3 last:border-0 last:pb-0 group">
                      <div className="mt-0.5 bg-premium-gold/10 p-1.5 rounded-xl mr-3 flex-shrink-0 group-hover:bg-premium-gold/20 transition-colors">
                        <Clock size={12} className="text-premium-gold" />
                      </div>
                      <div>
                        <span className="text-gray-800 font-bold block mb-0.5">{activity.message}</span>
                        <span className="text-gray-400 text-[10px] font-bold tracking-wide uppercase">{activity.ago}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-xs font-medium py-2">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pb-4">
        <button
          onClick={() => setShowOverdueAlertModal(true)}
          className="ripple-button px-6 py-3 bg-white border border-red-100 text-red-600 rounded-xl shadow-sm hover:bg-red-50 hover:border-red-200 hover:shadow-md flex items-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 group"
        >
          <AlertTriangle size={18} className={`transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
          <span className="font-bold text-sm tracking-wide">{t('dashboard.showOverdue')}{overdueVehicles.length > 0 ? ` (${overdueVehicles.length})` : ''}</span>
        </button>
      </div>

      {showOverdueAlertModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center p-6 z-[100]"
          onClick={() => setShowOverdueAlertModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-red-50/50">
              <h3 className="text-lg font-bold text-red-600 flex items-center">
                <AlertTriangle size={20} className={`${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                {t('dashboard.overdueAlert')}
              </h3>
              <button
                onClick={() => setShowOverdueAlertModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <div className="text-gray-700">
                <p className="text-center text-[15px] leading-relaxed">
                  {latestOverdueVehicle
                    ? (language === 'ar'
                      ? `المركبة ${latestOverdueVehicle.vehicleNumber} لا تزال في منطقة المواقف بعد ${latestOverdueVehicle.overdueMinutes} دقيقة من الدفع.`
                      : `Vehicle ${latestOverdueVehicle.vehicleNumber} is still in the parking area ${latestOverdueVehicle.overdueMinutes} minute${latestOverdueVehicle.overdueMinutes === 1 ? '' : 's'} after payment.`)
                    : t('dashboard.noOverdue')}
                </p>
              </div>
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setShowOverdueAlertModal(false)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default Dashboard;
