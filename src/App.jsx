import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { io } from 'socket.io-client';
import Sidebar from './components/Sidebar';
import User1Header from './components/User1Header';
import Dashboard from './pages/Dashboard';
import VehicleDetails from './pages/VehicleDetails';
import CameraConfig from './pages/CameraConfig';
import Passes from './pages/Passes';
import Settings from './pages/Settings';
import Pricing from './pages/Pricing';
import SlotManagement from './pages/SlotManagement';
import Reports from './pages/Reports';
import PaymentReport from './pages/PaymentReport';
import LoginPage from './pages/LoginPage';
import User1LoginPage from './pages/User1LoginPage';
import AddUser from './pages/AddUser';
import KioskManagement from './pages/KioskManagement';
import LedDisplayManagement from './pages/LedDisplayManagement';
import BoomBarrierControl from './pages/BoomBarrierControl';
import TenantVehicles from './pages/TenantVehicles';
import TenantSubscriptionHistory from './pages/TenantSubscriptionHistory';
import TenantMaster from './pages/TenantMaster';
import LocationMaster from './pages/LocationMaster';
import VisitorSubscriptions from './pages/VisitorSubscriptions';
import LedDashboard from './pages/LedDashboard';
import HospitalKioskApp from './pages/HospitalKioskApp';
import { parseBackendDate } from './utils/dateTime';
import { API_BASE_URL } from './utils/api';

const TENANT_MASTER_UPDATED_EVENT = 'tenant-master-updated';

const normalizeStaffPassDate = (value) => {
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

const normalizeStaffPassVehicles = (vehicles = []) =>
  (vehicles || []).map((vehicle) => ({
    number: vehicle?.number || vehicle?.plateNumber || '',
    type: vehicle?.type || 'Car'
  }));

const normalizeStaffPass = (pass = {}, fallback = {}) => ({
  ...fallback,
  ...pass,
  id: pass?.id != null ? pass.id.toString() : fallback.id || '',
  passId: pass?.passId || fallback.passId || '',
  status: pass?.status || fallback.status || 'active',
  staffName: pass?.staffName || fallback.staffName || '',
  department: pass?.department || fallback.department || '',
  designation: pass?.designation || fallback.designation || 'Staff',
  mobileNumber: pass?.mobileNumber || fallback.mobileNumber || '',
  validFrom: normalizeStaffPassDate(pass?.validFrom ?? fallback.validFrom),
  validUntil: normalizeStaffPassDate(pass?.validUntil ?? fallback.validUntil),
  vehicles: normalizeStaffPassVehicles(pass?.vehicles ?? fallback.vehicles)
});

const readStoredStaffPasses = () => {
  if (typeof window === 'undefined') return [];

  try {
    const savedStaffPasses = JSON.parse(localStorage.getItem('appStaffPasses') || '[]');
    return Array.isArray(savedStaffPasses) ? savedStaffPasses : [];
  } catch (error) {
    console.error('Failed to read saved staff passes:', error);
    return [];
  }
};

const AdminLayout = ({ onLogout, vehiclesData, updateVehiclesData, staffPasses, updateStaffPasses, notifications, onMarkNotificationAsRead, onMarkAllNotificationsAsRead, onClearAllNotifications, features }) => (
  <div className="flex h-screen bg-gray-100">
    <Sidebar
      onLogout={onLogout}
      notifications={notifications}
      onMarkAsRead={onMarkNotificationAsRead}
      onMarkAllAsRead={onMarkAllNotificationsAsRead}
      onClearAll={onClearAllNotifications}
      features={features}
    />
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto">
        <Outlet context={{ vehiclesData, updateVehiclesData, staffPasses, updateStaffPasses, features }} />
      </div>
    </div>
  </div>
);

const User1Layout = ({ onLogout, vehiclesData, updateVehiclesData }) => (
  <div className="flex flex-col h-screen bg-gray-100">
    <User1Header onLogout={onLogout} />
    <div className="flex-1 overflow-auto">
      <Outlet context={{ vehiclesData, updateVehiclesData }} />
    </div>
  </div>
);

const ProtectedRoute = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const User1ProtectedRoute = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) return <Navigate to="/user1" replace />;
  return children;
};

function App() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => localStorage.getItem('isAdminAuthenticated') === 'true');
  const [isUser1Authenticated, setIsUser1Authenticated] = useState(() => localStorage.getItem('isUser1Authenticated') === 'true');

  const [notifications, setNotifications] = useState([]);

  const [features, setFeatures] = useState({ enable_tenant_subscription: true });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/config/features`)
      .then(res => res.json())
      .then(data => setFeatures(data))
      .catch(err => console.error("Failed to fetch features:", err));
  }, []);

  const [vehiclesData, setVehiclesData] = useState([]);

  const [staffPasses, setStaffPasses] = useState(() =>
    readStoredStaffPasses().map((pass) => normalizeStaffPass(pass))
  );

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/staff-passes/`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const storedPasses = readStoredStaffPasses();
          const storedById = new Map(storedPasses.map((pass) => [String(pass.id), pass]));
          const storedByPassId = new Map(
            storedPasses
              .filter((pass) => pass?.passId)
              .map((pass) => [pass.passId, pass])
          );

          const normalized = data.map((pass) => {
            const fallback = storedById.get(String(pass.id)) || storedByPassId.get(pass.passId) || {};
            return normalizeStaffPass(pass, fallback);
          });

          setStaffPasses(normalized);
        }
      })
      .catch(err => console.error("Failed to fetch staff passes:", err));
  }, []);

  const [tenants, setTenants] = useState([]);

  // Memoized Plate Resolution Data
  const staffPlateSet = useMemo(() => {
    const plates = new Set();
    staffPasses.forEach(pass => {
      if (pass.vehicles) {
        pass.vehicles.forEach(v => {
          if (v.number) plates.add(v.number.replace(/\s+/g, '').toUpperCase());
        });
      }
    });
    return plates;
  }, [staffPasses]);

  const tenantPlateMap = useMemo(() => {
    const plateMap = new Map();
    tenants.forEach(tenant => {
      if (tenant.vehicles) {
        tenant.vehicles.forEach(v => {
          if (v) plateMap.set(v.replace(/\s+/g, '').toUpperCase(), tenant.tenant_type || 'Tenant');
        });
      }
    });
    return plateMap;
  }, [tenants]);

  const resolveVehicleType = useCallback((plateNumber, backendType) => {
    // If backend provides a specific category (Tenant, Staff, Visitor), trust it completely
    if (backendType && backendType !== 'Unknown') return backendType;
    
    if (!plateNumber) return 'Visitor';
    const normalized = plateNumber.replace(/\s+/g, '').toUpperCase();
    
    // Fallback: only check local maps if backend says Unknown or is missing
    if (staffPlateSet.has(normalized)) return 'Staff';
    if (tenantPlateMap.has(normalized)) return tenantPlateMap.get(normalized);
    
    return 'Visitor';
  }, [staffPlateSet, tenantPlateMap]);

  useEffect(() => { localStorage.setItem('isAdminAuthenticated', isAdminAuthenticated); }, [isAdminAuthenticated]);
  useEffect(() => { localStorage.setItem('isUser1Authenticated', isUser1Authenticated); }, [isUser1Authenticated]);
  useEffect(() => { localStorage.setItem('appStaffPasses', JSON.stringify(staffPasses)); }, [staffPasses]);

  // Initial Data Fetch
  const fetchTenants = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tenants/`);
      if (response.ok) setTenants(await response.json());
    } catch (error) { console.error('Error fetching tenants:', error); }
  }, []);

  useEffect(() => {
    const fetchInitialVehicles = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/vehicles/current`);
        if (response.ok) {
          const data = await response.json();
          const resolved = Array.isArray(data)
            ? data.map(v => ({
                ...v,
                vehicleNumber: v.license_plate,
                type: resolveVehicleType(v.license_plate, v.vehicle_category || v.tenant_type)
              }))
            : [];
          setVehiclesData(resolved);
        }
      } catch (error) {
        console.error('Error fetching initial vehicles:', error);
        setVehiclesData([]);
      }
    };
    
    fetchTenants();
    fetchInitialVehicles();
  }, [fetchTenants]);

  useEffect(() => {
    const handleTenantMasterUpdate = () => {
      fetchTenants();
    };

    window.addEventListener(TENANT_MASTER_UPDATED_EVENT, handleTenantMasterUpdate);
    return () => window.removeEventListener(TENANT_MASTER_UPDATED_EVENT, handleTenantMasterUpdate);
  }, [fetchTenants]);

  // WebSocket Integration (Replacing global polling)
  useEffect(() => {
    const socket = io(API_BASE_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
    });

    socket.on("vehicle_event", (event) => {
      const { type, data: latest } = event;
      console.log('[DEBUG] Vehicle event received via WebSocket:', event);

      if (type === 'entry') {
        setVehiclesData(prev => {
          const alreadyExists = prev.some(v =>
            v.vehicleNumber === latest.license_plate && v.entryTime === latest.entry_time
          );

          if (!alreadyExists) {
            const resolvedType = resolveVehicleType(latest.license_plate, latest.vehicle_category);
            const newEntry = {
              id: Date.now().toString(),
              vehicleNumber: latest.license_plate,
              entryTime: latest.entry_time,
              type: resolvedType,
              plateImage: 'https://placehold.co/300x100/333/white?text=' + latest.license_plate,
              exitTime: null,
              paymentProcessedTime: null
            };
            return [newEntry, ...prev];
          }
          return prev;
        });
      } else if (type === 'exit') {
        setVehiclesData(prev => prev.map(v => 
          v.vehicleNumber === latest.license_plate ? { ...v, exitTime: latest.exit_time } : v
        ));
      }
    });

    return () => socket.disconnect();
  }, [resolveVehicleType]);

  const updateGlobalVehiclesData = useCallback((newVehiclesData) => {
    setVehiclesData(newVehiclesData);
  }, []);

  const markNotificationAsRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    const syncOverdueNotifications = () => {
      const now = new Date();
      const nextNotifications = vehiclesData.flatMap(vehicle => {
        if (vehicle.paymentProcessedTime && !vehicle.exitTime) {
          const paymentTime = parseBackendDate(vehicle.paymentProcessedTime);
          if (!paymentTime || Number.isNaN(paymentTime.getTime())) return [];

          const diffMinutes = (now - paymentTime) / (1000 * 60);
          if (diffMinutes > 30) {
            const overdueMinutes = Math.floor(diffMinutes - 30);
            return [{
              id: `overdue_${vehicle.id}`,
              message: `Vehicle ${vehicle.vehicleNumber} is ${overdueMinutes} min overdue for exit.`,
              timestamp: paymentTime.toISOString(),
              read: false,
              type: 'overdue_exit',
              vehicleId: vehicle.id,
              resolved: false
            }];
          }
        }
        return [];
      });

      setNotifications(prev => {
        const previousById = new Map(prev.map(notification => [notification.id, notification]));
        return nextNotifications
          .map(notification => ({
            ...notification,
            read: previousById.get(notification.id)?.read ?? false
          }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      });
    };

    syncOverdueNotifications();
    const intervalId = setInterval(syncOverdueNotifications, 60000);
    return () => clearInterval(intervalId);
  }, [vehiclesData]);

  const handleAdminLogin = () => { setIsAdminAuthenticated(true); setIsUser1Authenticated(false); localStorage.removeItem('isUser1Authenticated'); };
  const handleAdminLogout = () => { setIsAdminAuthenticated(false); localStorage.removeItem('isAdminAuthenticated'); };
  const handleUser1Login = () => { setIsUser1Authenticated(true); setIsAdminAuthenticated(false); localStorage.removeItem('isAdminAuthenticated'); };
  const handleUser1Logout = () => { setIsUser1Authenticated(false); localStorage.removeItem('isUser1Authenticated'); };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!isAdminAuthenticated ? <LoginPage onLogin={handleAdminLogin} /> : <Navigate to="/" replace />} />
        <Route path="/user1" element={!isUser1Authenticated ? <User1LoginPage onUser1Login={handleUser1Login} /> : <Navigate to="/user1/live-parking" replace />} />
        <Route path="/led-dashboard" element={<LedDashboard />} />
        <Route path="/kiosk-app" element={<HospitalKioskApp />} />

        <Route
          element={
            <ProtectedRoute isAuthenticated={isAdminAuthenticated}>
              <AdminLayout
                onLogout={handleAdminLogout}
                vehiclesData={vehiclesData}
                updateVehiclesData={updateGlobalVehiclesData}
                staffPasses={staffPasses}
                updateStaffPasses={setStaffPasses}
                notifications={notifications}
                onMarkNotificationAsRead={markNotificationAsRead}
                onMarkAllNotificationsAsRead={markAllNotificationsAsRead}
                onClearAllNotifications={clearAllNotifications}
                features={features}
              />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/vehicles" element={<VehicleDetails />} />
          <Route path="/cameras" element={<CameraConfig />} />
          <Route path="/passes" element={<Passes />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/slots" element={<SlotManagement />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/payment-report" element={<PaymentReport />} />
          <Route path="/add-user" element={<AddUser />} />
          <Route path="/location-master" element={<LocationMaster />} />
          <Route path="/visitor-subscriptions" element={<VisitorSubscriptions />} />
          <Route path="/kiosk-management" element={<KioskManagement />} />
          <Route path="/led-display-management" element={<LedDisplayManagement />} />
          <Route path="/boom-barrier-control" element={<BoomBarrierControl />} />
          {features.enable_tenant_subscription && (
            <>
              <Route path="/tenant-vehicles" element={<TenantVehicles />} />
              <Route path="/tenant-subscription-history" element={<TenantSubscriptionHistory />} />
              <Route path="/tenant-master" element={<TenantMaster />} />
            </>
          )}
          <Route path="/settings" element={<Settings onLogout={handleAdminLogout} onUser1Login={handleUser1Login} />} />
          <Route path="/user1/live-parking" element={<Navigate to="/" replace />} />
          <Route path="/user1/*" element={<Navigate to="/" replace />} />
        </Route>

        <Route
          element={
            <User1ProtectedRoute isAuthenticated={isUser1Authenticated}>
              <User1Layout onLogout={handleUser1Logout} vehiclesData={vehiclesData} updateVehiclesData={updateGlobalVehiclesData} />
            </User1ProtectedRoute>
          }
        >
          <Route path="/user1/live-parking" element={<VehicleDetails />} />
          <Route path="/" element={<Navigate to="/user1/live-parking" replace />} />
          <Route path="/*" element={<Navigate to="/user1/live-parking" replace />} />
        </Route>

        <Route path="/*" element={
          isAdminAuthenticated ? <Navigate to="/" replace /> :
            isUser1Authenticated ? <Navigate to="/user1/live-parking" replace /> :
              <Navigate to="/login" replace />
        } />
      </Routes>
    </Router>
  );
}

export default App;

