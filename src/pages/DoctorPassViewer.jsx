import React, { useState, useEffect } from 'react';
import { Search, Download, Printer, Calendar, Car } from 'lucide-react';
import { mockDoctorData } from '../data/mockData';

const DoctorPassViewer = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    // In a real app, you would fetch data from an API
    // For now, we'll use mock data
    setDoctors(mockDoctorData);
    // Select the first doctor by default if available
    if (mockDoctorData.length > 0) {
      setSelectedDoctor(mockDoctorData[0]);
    }
  }, []);

  const filteredDoctors = doctors.filter(doctor => 
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusClass = (validUntil) => {
    const today = new Date();
    const expiryDate = new Date(validUntil);
    
    if (expiryDate < today) {
      return "text-red-600 border-red-300 bg-red-50";
    }
    
    const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 7) {
      return "text-yellow-600 border-yellow-300 bg-yellow-50";
    }
    
    return "text-green-600 border-green-300 bg-green-50";
  };

  const getStatusText = (validUntil) => {
    const today = new Date();
    const expiryDate = new Date(validUntil);
    
    if (expiryDate < today) {
      return "Expired";
    }
    
    const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 7) {
      return `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
    }
    
    return "Active";
  };

  const handlePrintPass = () => {
    window.print();
  };

  const handleDownloadPass = () => {
    alert('Pass download functionality would be implemented here');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Doctor Vehicle Pass Viewer</h1>
        <p className="text-gray-600">View and print parking passes for registered doctors</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search by name or vehicle number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
            {filteredDoctors.map((doctor) => (
              <div
                key={doctor.id}
                className={`p-3 border rounded-md cursor-pointer ${
                  selectedDoctor?.id === doctor.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedDoctor(doctor)}
              >
                <div className="font-medium">{doctor.name}</div>
                <div className="text-sm text-gray-500">{doctor.vehicleNumber} • {doctor.department}</div>
                <div className={`text-xs mt-1 inline-block px-2 py-1 rounded-full ${getStatusClass(doctor.validUntil)}`}>
                  {getStatusText(doctor.validUntil)}
                </div>
              </div>
            ))}
            
            {filteredDoctors.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No doctor vehicles found matching your search criteria.
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          {selectedDoctor ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Parking Pass</h3>
                <div className="flex space-x-2">
                  <button 
                    className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 flex items-center"
                    onClick={handlePrintPass}
                  >
                    <Printer size={20} className="text-gray-600 mr-2" />
                    <span>Print</span>
                  </button>
                  <button 
                    className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 flex items-center"
                    onClick={handleDownloadPass}
                  >
                    <Download size={20} className="text-gray-600 mr-2" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                <div className="flex flex-col md:flex-row items-center">
                  <div className="mb-4 md:mb-0 md:mr-6">
                    <div className="bg-white p-3 border border-gray-200 rounded-md">
                      <img 
                        src="https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/120x120/333/white?text=QR+Code" 
                        alt="QR Code" 
                        className="w-28 h-28"
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-center md:text-left mb-4">
                      <h2 className="text-xl font-bold text-blue-800">Hospital Parking Pass</h2>
                      <p className={`text-sm font-medium ${getStatusClass(selectedDoctor.validUntil)}`}>
                        {getStatusText(selectedDoctor.validUntil)}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Doctor Name</p>
                        <p className="font-medium">{selectedDoctor.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Department</p>
                        <p className="font-medium">{selectedDoctor.department}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Vehicle Number</p>
                        <p className="font-medium">{selectedDoctor.vehicleNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Vehicle Type</p>
                        <p className="font-medium">{selectedDoctor.vehicleType}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Valid From</p>
                        <p className="font-medium">{selectedDoctor.validFrom}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Valid Until</p>
                        <p className="font-medium">{selectedDoctor.validUntil}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-blue-800">
                      <Car size={18} className="mr-2" />
                      <span className="font-medium">DOCTOR PARKING PERMIT</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Calendar size={16} className="mr-2" />
                      <span>Issue Date: {selectedDoctor.validFrom}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-center text-xs text-gray-500">
                    <p>This pass must be displayed on the vehicle dashboard at all times when parked in the hospital premises.</p>
                    <p className="mt-1">Pass ID: {selectedDoctor.id}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <p>Select a doctor from the list to view their parking pass</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorPassViewer;
