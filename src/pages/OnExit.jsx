import React, { useState } from "react";
import {
  Search,
  Filter,
  Calendar,
  Clock,
  Car,
  X,
  Eye,
  Plus,
  QrCode,
  Check,
  AlertTriangle,
} from "lucide-react";
import {
  mockVehicleData,
  mockSlotData,
  mockTieredPricingData,
} from "../data/mockData";
import { apiUrl } from "../utils/api";
// import GoogleQrCode from "./GoogleQrCode";

const VehicleDetails = () => {
  // Filter vehicles to only show those currently inside (no exitTime)
  const initialVehicles = mockVehicleData.filter((vehicle) => vehicle.exitTime);

  const [vehicles, setVehicles] = useState(initialVehicles);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    dateRange: { start: "", end: "" },
    status: "all",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scannedVehicle, setScannedVehicle] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [waiverType, setWaiverType] = useState("staff");
  const [paymentAction, setPaymentAction] = useState(null);
  const [formData, setFormData] = useState({
    vehicleNumber: "",
    entryTime: "",
    exitTime: "",
    type: "Visitor",
    plateImage:
      "https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/300x100/333/white?text=NEW+PLATE",
  });
  const [slotData, setSlotData] = useState(mockSlotData);

  const filteredVehicles = vehicles.filter((vehicle) => {
    // Search filter
    if (
      searchTerm &&
      !vehicle.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }

    // Status filter - not needed anymore since we're only showing vehicles inside

    return true;
  });
  console.log("Filtered Vehicles: ", filteredVehicles);

  const getTypeBadge = (type) => {
    const colors = {
      Staff: "bg-blue-100 text-blue-800",
      Visitor: "bg-yellow-100 text-yellow-800",
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[type]}`}>
        {type}
      </span>
    );
  };
  const getTypeBadgeForPaymentMethod = (type) => {
    const colors = {
      waiver: "bg-gray-100 text-gray-800",
      cash: "bg-green-100 text-green-800",
      card: "bg-green-100 text-green-800",
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[type]}`}>
        {type}
      </span>
    );
  };

  const handlePreview = (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowPreview(true);
  };

  const handleAddVehicle = () => {
    setFormData({
      vehicleNumber: "",
      entryTime: new Date().toISOString().slice(0, 16).replace("T", " "),
      exitTime: "",
      type: "Visitor",
      plateImage:
        "https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/300x100/333/white?text=NEW+PLATE",
    });
    setShowForm(true);
  };

  const handleScanTicket = () => {
    setShowScanModal(true);
    setPaymentAction(null);
    setScannedVehicle(null);
    // Simulate scanning process - in real app this would connect to a scanner
    setTimeout(() => {
      // Get a random vehicle that's still inside (no exit time)
      const insideVehicles = vehicles.filter((v) => v.exitTime);
      if (insideVehicles.length > 0) {
        const randomVehicle =
          insideVehicles[Math.floor(Math.random() * insideVehicles.length)];
        setScannedVehicle(randomVehicle);
      } else {
        alert("No vehicles currently inside to scan.");
        setShowScanModal(false);
      }
    }, 5000);
  };

  const calculateParkingFee = (vehicle) => {
    if (!vehicle || !vehicle.entryTime) return 0;

    // Staff don't pay
    if (vehicle.type === "Staff") return 0;

    // Get applicable pricing tier
    const pricingTier =
      mockTieredPricingData.find(
        (p) =>
          p.isActive &&
          ((vehicle.type === "Staff" && p.name.includes("Staff")) ||
            (vehicle.type === "Visitor" && !p.name.includes("Staff")))
      ) || mockTieredPricingData[0];

    // Calculate duration
    const entryTime = new Date(vehicle.entryTime);
    const currentTime = new Date();
    const durationHours = Math.ceil(
      (currentTime - entryTime) / (1000 * 60 * 60)
    );

    // Calculate fee based on tiers
    let totalFee = 0;
    let remainingHours = durationHours;

    for (const tier of pricingTier.tiers) {
      if (tier.unit === "hour") {
        const hoursToCharge = Math.min(remainingHours, tier.duration);
        totalFee += hoursToCharge * parseFloat(tier.priceOMR);
        remainingHours -= hoursToCharge;
      } else if (tier.unit === "day" && remainingHours >= 24) {
        const daysToCharge = Math.floor(remainingHours / 24);
        totalFee += daysToCharge * parseFloat(tier.priceOMR);
        remainingHours -= daysToCharge * 24;
      }

      if (remainingHours <= 0) break;
    }

    return totalFee.toFixed(3);
  };

  const handleSelectPaymentAction = (action) => {
    setPaymentAction(action);
    if (action === "payment") {
      setPaymentMethod("cash");
    } else if (action === "waiver") {
      setWaiverType("staff");
    }
  };

  const handleProcessPayment = async () => {
    try {
      const response = await fetch(
        apiUrl(`/api/vehicles/${scannedVehicle.id}/exit`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentMethod: paymentMethod,
            paymentAmount: calculateParkingFee(scannedVehicle),
            waiverType: null,
          }),
        }
      );

      if (response.ok) {
        // Update local state and refresh data
        const updatedVehicles = vehicles.filter(
          (v) => v.id !== scannedVehicle.id
        );
        setVehicles(updatedVehicles);

        const slotsResponse = await fetch("/api/slots");
        const slotsData = await slotsResponse.json();
        setSlotData(slotsData);
      }
    } catch (error) {
      console.error("Error processing payment:", error);
    }
  };

  const handleApplyWaiver = () => {
    if (!scannedVehicle) return;

    // Update the vehicle with exit time and waiver info
    const updatedVehicles = vehicles.map((v) =>
      v.id === scannedVehicle.id
        ? {
          ...v,
          exitTime: new Date().toISOString().slice(0, 16).replace("T", " "),
          paymentMethod: "waiver",
          waiverType: waiverType,
          paymentAmount: "0.000",
        }
        : v
    );

    // Remove the vehicle from the list since it has exited
    setVehicles(updatedVehicles.filter((v) => v.exitTime));

    setShowScanModal(false);
    setScannedVehicle(null);
    setPaymentAction(null);

    // Update slot data
    setSlotData({
      ...slotData,
      occupiedSlots: Math.max(0, slotData.occupiedSlots - 1),
      availableSlots: Math.min(
        slotData.totalSlots,
        Math.max(0, slotData.availableSlots + 1)
      ),
    });

    alert(`Waiver applied successfully for ${waiverType}!`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(apiUrl("/api/vehicles"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newVehicle = await response.json();
        setVehicles([newVehicle, ...vehicles]);
        setShowForm(false);

        // Refresh slot data
        const slotsResponse = await fetch("/api/slots");
        const slotsData = await slotsResponse.json();
        setSlotData(slotsData);
      }
    } catch (error) {
      console.error("Error adding vehicle:", error);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">On-Exit Page</h1>
          <p className="text-gray-600">Search and filter vehicle entry logs</p>
        </div>
        <div className="flex space-x-2">
          <button
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
            onClick={handleScanTicket}
          >
            <QrCode size={18} className="mr-2" />
            Scan Ticket
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            onClick={handleAddVehicle}
          >
            <Plus size={18} className="mr-2" />
            Add Vehicle
          </button>
        </div>
      </div>

      {/* Slot Management Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Parking Slot Status</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-500 mb-1">Total Slots</p>
            <p className="text-xl font-bold text-blue-700">
              {slotData.totalSlots}
            </p>
          </div>
          <div className="bg-green-50 p-3 rounded-md">
            <p className="text-sm text-green-500 mb-1">Available</p>
            <p className="text-xl font-bold text-green-700">
              {slotData.availableSlots}
            </p>
          </div>
          <div className="bg-red-50 p-3 rounded-md">
            <p className="text-sm text-red-500 mb-1">Occupied</p>
            <p className="text-xl font-bold text-red-700">
              {slotData.occupiedSlots}
            </p>
          </div>
        </div>

        <div className="mb-2">
          <p className="text-sm text-gray-500 mb-1">Occupancy Rate</p>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full ${slotData.status === "full"
                  ? "bg-red-600"
                  : slotData.isNearlyFull
                    ? "bg-yellow-500"
                    : "bg-green-600"
                }`}
              style={{
                width: `${(slotData.occupiedSlots / slotData.totalSlots) * 100
                  }%`,
              }}
            ></div>
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {slotData.isNearlyFull && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-center">
            <AlertTriangle
              size={16}
              className="text-yellow-500 mr-2 flex-shrink-0"
            />
            <p className="text-sm text-yellow-700">
              Parking is nearly full! Only {slotData.availableSlots} slots
              remain available.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search by vehicle number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} className="mr-2" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-md mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="date"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      value={filters.dateRange.start}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          dateRange: {
                            ...filters.dateRange,
                            start: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <span>to</span>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="date"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      value={filters.dateRange.end}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          dateRange: {
                            ...filters.dateRange,
                            end: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Vehicle Number
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Entry Time
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Payment Method
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Payment Amount
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Type
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  ANPR Image
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Car size={16} className="mr-2 text-gray-500" />
                      <span className="font-medium">
                        {vehicle.vehicleNumber}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Clock size={16} className="mr-2 text-gray-500" />
                      <span>{vehicle.entryTime}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTypeBadgeForPaymentMethod(vehicle.paymentMethod)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-inter text-2xl font-semibold">
                      {"OMR " + vehicle.paymentAmount}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTypeBadge(vehicle.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-32 h-12 bg-gray-100 rounded overflow-hidden">
                      <img
                        src={vehicle.plateImage}
                        alt={`License plate ${vehicle.vehicleNumber}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      className="flex items-center text-blue-600 hover:text-blue-800"
                      onClick={() => handlePreview(vehicle)}
                    >
                      <Eye size={16} className="mr-1" />
                      Preview
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {console.log(
            filteredVehicles.length === 0 ? "no vehicles" : "vehicles"
          )}
          {filteredVehicles.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No vehicles found matching your search criteria.
            </div>
          )}
        </div>
      </div>

      {/* Vehicle Preview Modal - Only showing number plate image */}
      {showPreview && selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Number Plate: {selectedVehicle.vehicleNumber}
              </h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowPreview(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col items-center">
              <div className="bg-gray-100 rounded-lg overflow-hidden mb-6 w-full max-w-md">
                <img
                  src={selectedVehicle.plateImage}
                  alt={`License plate ${selectedVehicle.vehicleNumber}`}
                  className="w-full h-auto"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 w-full">
                <div>
                  <p className="text-sm text-gray-500">Vehicle Number</p>
                  <p className="font-medium">{selectedVehicle.vehicleNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{selectedVehicle.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Entry Time</p>
                  <p className="font-medium">{selectedVehicle.entryTime}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                onClick={() => setShowPreview(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add New Vehicle</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowForm(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.vehicleNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        vehicleNumber: e.target.value,
                      })
                    }
                    required
                    placeholder="e.g. AB12 XYZ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Type
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                  >
                    <option value="Visitor">Visitor</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entry Time
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
                    value={formData.entryTime}
                    readOnly
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Entry time is automatically set to current time
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scan Ticket Modal */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Scan Ticket</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setShowScanModal(false);
                  setScannedVehicle(null);
                  setPaymentAction(null);
                }}
              >
                <X size={20} />
              </button>
            </div>

            {!scannedVehicle ? (
              <div className="flex flex-col items-center py-8">
                <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center mb-4 relative">
                  {/* qr code image */}
                  {/* <GoogleQrCode /> */}
                  <div className="absolute inset-0 border-2 border-blue-500 animate-pulse rounded-lg"></div>
                </div>
                <p className="text-gray-600">Scanning ticket... Please wait.</p>
              </div>
            ) : !paymentAction ? (
              <div className="flex flex-col items-center py-4">
                <div className="w-full bg-green-50 p-4 rounded-lg mb-4 flex items-center">
                  <div className="bg-green-100 rounded-full p-2 mr-3">
                    <Check size={20} className="text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-green-800">
                      Ticket Scanned Successfully
                    </h4>
                    <p className="text-sm text-green-600">
                      Vehicle details retrieved
                    </p>
                  </div>
                </div>

                <div className="w-full">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Vehicle Number</p>
                      <p className="font-medium">
                        {scannedVehicle.vehicleNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Type</p>
                      <p className="font-medium">{scannedVehicle.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Entry Time</p>
                      <p className="font-medium">{scannedVehicle.entryTime}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="font-medium">
                        {(() => {
                          const entryTime = new Date(scannedVehicle.entryTime);
                          const now = new Date();
                          const diffMs = now - entryTime;
                          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                          const diffMins = Math.floor(
                            (diffMs % (1000 * 60 * 60)) / (1000 * 60)
                          );
                          return `${diffHrs}h ${diffMins}m`;
                        })()}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-100 p-4 rounded-lg mb-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Parking Fee:</span>
                      <span className="text-xl font-bold">
                        OMR {calculateParkingFee(scannedVehicle)}
                      </span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-medium text-gray-800 mb-2">
                      Select Payment Option
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50"
                        onClick={() => handleSelectPaymentAction("payment")}
                      >
                        <div className="font-medium mb-1">Process Payment</div>
                        <div className="text-sm text-gray-500">
                          Cash or Card payment
                        </div>
                      </button>
                      <button
                        className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50"
                        onClick={() => handleSelectPaymentAction("waiver")}
                      >
                        <div className="font-medium mb-1">Apply Waiver</div>
                        <div className="text-sm text-gray-500">
                          Staff or Visitor waiver
                        </div>
                      </button>
                    </div>
                  </div>

                  <button
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    onClick={() => {
                      setShowScanModal(false);
                      setScannedVehicle(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : paymentAction === "payment" ? (
              <div className="py-4">
                <div className="mb-6">
                  <h4 className="font-medium text-gray-800 mb-2">
                    Select Payment Method
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className={`p-4 rounded-lg border ${paymentMethod === "cash"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                        }`}
                      onClick={() => setPaymentMethod("cash")}
                    >
                      <div className="font-medium mb-1">Cash</div>
                      <div className="text-sm text-gray-500">
                        Collect cash payment
                      </div>
                    </button>
                    <button
                      className={`p-4 rounded-lg border ${paymentMethod === "card"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                        }`}
                      onClick={() => setPaymentMethod("card")}
                    >
                      <div className="font-medium mb-1">Card</div>
                      <div className="text-sm text-gray-500">
                        Process card payment
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    onClick={() => setPaymentAction(null)}
                  >
                    Back
                  </button>
                  <button
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    onClick={handleProcessPayment}
                  >
                    Complete Payment ({paymentMethod})
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-4">
                <div className="mb-6">
                  <h4 className="font-medium text-gray-800 mb-2">
                    Select Waiver Type
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className={`p-4 rounded-lg border ${waiverType === "staff"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                        }`}
                      onClick={() => setWaiverType("staff")}
                    >
                      <div className="font-medium mb-1">Staff Waiver</div>
                      <div className="text-sm text-gray-500">
                        No fee for staff
                      </div>
                    </button>
                    <button
                      className={`p-4 rounded-lg border ${waiverType === "visitor"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                        }`}
                      onClick={() => setWaiverType("visitor")}
                    >
                      <div className="font-medium mb-1">Visitor Waiver</div>
                      <div className="text-sm text-gray-500">
                        Special visitor exemption
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    onClick={() => setPaymentAction(null)}
                  >
                    Back
                  </button>
                  <button
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    onClick={handleApplyWaiver}
                  >
                    Apply{" "}
                    {waiverType.charAt(0).toUpperCase() + waiverType.slice(1)}{" "}
                    Waiver
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleDetails;
