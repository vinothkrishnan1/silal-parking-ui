import React, { useState, useEffect, useRef } from "react";
import { Plus, Edit, AlertTriangle, XCircle } from "lucide-react";
import addDevice from "../data/AddDevice";
import getDevices from "../data/GetDevice";
import editDevice from "../data/EditDevice";
import checkDeviceStatus from "../data/CheckDeviceStatus";

const CameraConfig = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [apiErrorMessage, setApiErrorMessage] = useState(null);
  const [isFetchingDevices, setIsFetchingDevices] = useState(true);
  const [formData, setFormData] = useState({
    device_type: "ENTRY CAMERA",
    device_name: "",
    gate_name: "",
    ip_address: "",
    mac_address: "",
    port: "",
  });

  const intervalRef = useRef(null);
  const ACCESS_DENIED_ERROR_MESSAGE = "Access denied to module: Camera Config";
  const HISTORY_BUFFER_SIZE = 4;

  const mapUiToApiDeviceType = (uiDevice) => {
    switch (uiDevice) {
      case "ENTRY CAMERA":
        return "ENTRY CAMERA";
      case "EXIT CAMERA":
        return "EXIT CAMERA";
      case "CONTROLLER":
        return "CONTROLLER";
      default:
        return "UNKNOWN";
    }
  };

  const mapApiToUiDeviceType = (apiDeviceType) => {
    switch (apiDeviceType) {
      case "ENTRY CAMERA":
        return "ENTRY CAMERA";
      case "EXIT CAMERA":
        return "EXIT CAMERA";
      case "CONTROLLER":
        return "CONTROLLER";
      default:
        return "";
    }
  };

  const performDeviceStatusChecks = async (currentDevices) => {
    if (currentDevices.length === 0) return;

    const updatedDevices = await Promise.allSettled(
      currentDevices.map(async (device) => {
        const newDevice = { ...device };

        try {
          const result = await checkDeviceStatus(
            newDevice.ip_address,
            newDevice.port
          );
          const actualPingStatus =
            result.success && result.isActive ? "Active" : "Inactive";

          if (!newDevice._pingHistory) {
            newDevice._pingHistory = [];
          }

          newDevice._pingHistory.push(actualPingStatus);
          if (newDevice._pingHistory.length > HISTORY_BUFFER_SIZE) {
            newDevice._pingHistory.shift();
          }

          if (newDevice._pingHistory.length === HISTORY_BUFFER_SIZE) {
            const isHistoryConsistent = newDevice._pingHistory.every(
              (statusInHistory) => statusInHistory === actualPingStatus
            );

            if (isHistoryConsistent && actualPingStatus !== newDevice.status) {
              newDevice.status = actualPingStatus;
            }
          }
        } catch (error) {
          console.error(
            `Failed to check status for ${newDevice.ip_address}:`,
            error
          );
          const actualPingStatus = "Inactive";

          if (!newDevice._pingHistory) {
            newDevice._pingHistory = [];
          }
          newDevice._pingHistory.push(actualPingStatus);
          if (newDevice._pingHistory.length > HISTORY_BUFFER_SIZE) {
            newDevice._pingHistory.shift();
          }

          if (newDevice._pingHistory.length === HISTORY_BUFFER_SIZE) {
            const isHistoryConsistent = newDevice._pingHistory.every(
              (statusInHistory) => statusInHistory === actualPingStatus
            );
            if (isHistoryConsistent && actualPingStatus !== newDevice.status) {
              newDevice.status = actualPingStatus;
            }
          }
        }
        return newDevice;
      })
    );

    const fulfilledDevices = updatedDevices
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    const hasAnyStateChange = fulfilledDevices.some((newDev) => {
      const oldDev = currentDevices.find((d) => d.id === newDev.id);
      if (!oldDev) return true;

      return (
        newDev.status !== oldDev.status ||
        JSON.stringify(newDev._pingHistory) !==
          JSON.stringify(oldDev._pingHistory)
      );
    });

    if (hasAnyStateChange) {
      setDevices(fulfilledDevices);
    }
  };

  useEffect(() => {
    const fetchInitialDevices = async () => {
      setIsFetchingDevices(true);
      setErrorMessage("");
      setApiErrorMessage(null);

      try {
        const result = await getDevices();

        if (result.success) {
          const devicesWithInitialState = result.data.map((device) => ({
            ...device,
            status: "Checking...",
            _pingHistory: [],
          }));
          setDevices(devicesWithInitialState);
          performDeviceStatusChecks(devicesWithInitialState);
        } else if (
          result.message &&
          result.message.includes(ACCESS_DENIED_ERROR_MESSAGE)
        ) {
          setApiErrorMessage(ACCESS_DENIED_ERROR_MESSAGE);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        } else {
          setErrorMessage(result.message || "Failed to load devices.");
        }
      } catch (error) {
        setErrorMessage("An unexpected error occurred while loading devices.");
        console.error("Error fetching initial devices:", error);
      } finally {
        setIsFetchingDevices(false);
      }
    };

    fetchInitialDevices();
  }, []);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (apiErrorMessage === null && devices.length > 0) {
      intervalRef.current = setInterval(() => {
        performDeviceStatusChecks([...devices]);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [devices, apiErrorMessage]);

  const handleAddDevice = () => {
    setSelectedDevice(null);
    setFormData({
      device_type: "ENTRY CAMERA",
      device_name: "",
      gate_name: "",
      ip_address: "",
      mac_address: "",
      port: "",
    });
    setErrorMessage("");
    setShowModal(true);
  };

  const handleEditDevice = (device) => {
    setSelectedDevice(device);
    setFormData({
      device_type: mapApiToUiDeviceType(device.device_type),
      device_name: device.device_name || "",
      gate_name: device.gate_name || "",
      ip_address: device.ip_address,
      mac_address: device.mac_address,
      port: String(device.port ?? ""),
    });
    setErrorMessage("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    const apiPayload = {
      device_type: mapUiToApiDeviceType(formData.device_type),
      device_name: formData.device_name,
      gate_name: formData.gate_name,
      ip_address: formData.ip_address,
      mac_address: formData.mac_address,
      port: parseInt(formData.port, 10),
    };

    try {
      if (selectedDevice) {
        const result = await editDevice(selectedDevice.id, apiPayload);

        if (result.success) {
          const updatedDevice = {
            ...selectedDevice,
            device_name: formData.device_name,
            gate_name: formData.gate_name,
            ip_address: formData.ip_address,
            mac_address: formData.mac_address,
            port: parseInt(formData.port, 10),
            device_type: apiPayload.device_type,
            status: "Checking...",
            _pingHistory: [],
          };
          setDevices(
            devices.map((device) =>
              device.id === selectedDevice.id ? updatedDevice : device
            )
          );
          setShowModal(false);
          window.dispatchEvent(new CustomEvent("device-config-updated"));
          performDeviceStatusChecks([updatedDevice]);
        } else {
          setErrorMessage(result.message);
        }
      } else {
        const result = await addDevice(apiPayload);

        if (result.success) {
          const createdDevice = result.data?.data || result.data || {};
          const newDeviceWithId = {
            ...formData,
            id:
              createdDevice.id ||
              Date.now().toString() + Math.random().toString(),
            device_type: createdDevice.device_type || apiPayload.device_type,
            device_name: createdDevice.device_name || formData.device_name,
            gate_name: createdDevice.gate_name || formData.gate_name,
            ip_address: createdDevice.ip_address || formData.ip_address,
            mac_address: createdDevice.mac_address || formData.mac_address,
            port: createdDevice.port || parseInt(formData.port, 10),
            status: "Checking...",
            _pingHistory: [],
          };
          setDevices((prevDevices) => [...prevDevices, newDeviceWithId]);
          setShowModal(false);
          window.dispatchEvent(new CustomEvent("device-config-updated"));
          performDeviceStatusChecks([newDeviceWithId]);
        } else {
          setErrorMessage(result.message);
        }
      }
    } catch (error) {
      setErrorMessage("An error occurred during device operation.");
      console.error("Error submitting device:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasEntranceCamera = devices.some(
    (device) => device.device_type === "ENTRY CAMERA"
  );
  const hasExitCamera = devices.some(
    (device) => device.device_type === "EXIT CAMERA"
  );
  const totalCameras = devices.filter(
    (device) => device.device_type === "ENTRY CAMERA" || device.device_type === "EXIT CAMERA"
  ).length;
  const totalControllers = devices.filter((device) => device.device_type === "CONTROLLER").length;
  const getDisplayTitle = (device, index) => device.device_name || `${device.device_type} ${index + 1}`;

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
      {apiErrorMessage === ACCESS_DENIED_ERROR_MESSAGE ? (
        <div className="mb-6 p-4 rounded-md flex items-start bg-red-50 border border-red-200">
          <XCircle size={20} className="text-red-600 mr-3 flex-shrink-0 mt-0.5" />
          <p className="text-sm mt-1 text-red-700">{apiErrorMessage}</p>
        </div>
      ) : isFetchingDevices ? null : (
        <>
          <div className="mb-6 flex justify-between items-center gap-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-wide">
                Device Configuration
              </h1>
              <p className="text-gray-500 mt-1 font-medium">
                Manage ANPR devices for Boulevard Pro Parking
              </p>
            </div>
            <button
              className="px-5 py-3 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg active:scale-95 flex items-center transition-all font-bold text-sm focus:outline-none"
              onClick={handleAddDevice}
              disabled={isLoading}
            >
              <Plus size={18} className="mr-2" />
              Add Device
            </button>
          </div>

          {errorMessage && !showModal && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertTriangle size={20} className="text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
            </div>
          )}

          {(!hasEntranceCamera || !hasExitCamera) && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md flex items-start">
              <AlertTriangle size={20} className="text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800">
                  Device Configuration Warning
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  {!hasEntranceCamera && !hasExitCamera
                    ? "Add at least one entrance or exit camera."
                    : !hasEntranceCamera
                    ? "An entrance camera is required."
                    : "An exit camera is required."}
                </p>
              </div>
            </div>
          )}

          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="text-xs uppercase tracking-widest text-gray-400 font-bold">Total Devices</div>
              <div className="text-2xl font-black text-gray-900 mt-2">{devices.length}</div>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="text-xs uppercase tracking-widest text-gray-400 font-bold">Cameras</div>
              <div className="text-2xl font-black text-gray-900 mt-2">{totalCameras}</div>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="text-xs uppercase tracking-widest text-gray-400 font-bold">Controllers</div>
              <div className="text-2xl font-black text-gray-900 mt-2">{totalControllers}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.length === 0 ? (
              <div className="md:col-span-3 text-center py-8 text-gray-500 premium-card">
                No devices configured yet. Add one to get started!
              </div>
            ) : (
              devices.map((device, index) => (
                <div key={device.id} className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-gray-100/80 overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-900">{getDisplayTitle(device, index)}</h3>
                    <div
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        device.status === "Active"
                          ? "bg-green-50 text-green-700 border border-green-100"
                          : device.status === "Inactive"
                          ? "bg-red-50 text-red-700 border border-red-100"
                          : "bg-gray-100 text-gray-700 border border-gray-200"
                      }`}
                    >
                      {device.status}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="mt-1 text-sm text-gray-600 font-medium">
                      <p className="mb-2"><span className="font-bold text-gray-700">Type:</span> {device.device_type}</p>
                      <p className="mb-2"><span className="font-bold text-gray-700">Gate:</span> {device.gate_name || "Not set"}</p>
                      <p className="mb-2"><span className="font-bold text-gray-700">IP Address:</span> {device.ip_address}</p>
                      <p className="mb-2"><span className="font-bold text-gray-700">MAC Address:</span> {device.mac_address}</p>
                      <p className="mb-2"><span className="font-bold text-gray-700">Port:</span> {device.port}</p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-50 flex justify-end gap-2">
                      <button
                        className="p-2 text-gray-400 hover:text-premium-black hover:bg-gray-50 rounded-lg transition-colors focus:outline-none"
                        title="Edit Device"
                        onClick={() => handleEditDevice(device)}
                        disabled={isLoading}
                      >
                        <Edit size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedDevice ? "Edit Device" : "Add New Device"}
              </h3>
              <button
                className="text-gray-400 hover:text-premium-black focus:outline-none transition-colors"
                onClick={() => setShowModal(false)}
                disabled={isLoading}
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            {errorMessage && (
              <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
                <AlertTriangle size={20} className="text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Device Type</label>
                <select
                  className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-premium-black focus:border-premium-black focus:bg-white transition-all text-sm font-medium text-gray-900 shadow-sm"
                  value={formData.device_type}
                  onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                  disabled={isLoading}
                >
                  <option value="ENTRY CAMERA">Entry Camera</option>
                  <option value="EXIT CAMERA">Exit Camera</option>
                  <option value="CONTROLLER">Controller</option>
                </select>
              </div>
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Device Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-premium-black focus:border-premium-black focus:bg-white transition-all text-sm font-medium text-gray-900 shadow-sm"
                  value={formData.device_name}
                  onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                  required
                  disabled={isLoading}
                  placeholder="e.g. Main Entrance Camera 1"
                />
              </div>
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Gate Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-premium-black focus:border-premium-black focus:bg-white transition-all text-sm font-medium text-gray-900 shadow-sm"
                  value={formData.gate_name}
                  onChange={(e) => setFormData({ ...formData, gate_name: e.target.value })}
                  disabled={isLoading}
                  placeholder="e.g. Main Entrance"
                />
              </div>
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">IP Address</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-premium-black focus:border-premium-black focus:bg-white transition-all text-sm font-medium text-gray-900 shadow-sm"
                  value={formData.ip_address}
                  onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">MAC Address</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-premium-black focus:border-premium-black focus:bg-white transition-all text-sm font-medium text-gray-900 shadow-sm"
                  value={formData.mac_address}
                  onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Port</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-premium-black focus:border-premium-black focus:bg-white transition-all text-sm font-medium text-gray-900 shadow-sm"
                  value={formData.port}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setFormData({ ...formData, port: val });
                  }}
                  required
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-all shadow-sm focus:outline-none"
                  onClick={() => setShowModal(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg font-semibold text-sm transition-all focus:outline-none"
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : `${selectedDevice ? "Update" : "Add"} Device`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraConfig;
