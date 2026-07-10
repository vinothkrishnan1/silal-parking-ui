import React, { useState } from 'react';
import { Search, Plus, Edit, Trash, Download, Printer, Calendar, Car } from 'lucide-react';
import { mockDoctorData } from '../data/mockData';

const DoctorRegistration = () => {
  const [doctors, setDoctors] = useState(mockDoctorData);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    vehicleNumber: '',
    vehicleType: 'Car',
    validFrom: '',
    validUntil: ''
  });

  const filteredDoctors = doctors.filter(doctor => 
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddDoctor = () => {
    setSelectedDoctor(null);
    setFormData({
      name: '',
      department: '',
      vehicleNumber: '',
      vehicleType: 'Car',
      validFrom: '',
      validUntil: ''
    });
    setShowForm(true);
  };

  const handleEditDoctor = (doctor) => {
    setSelectedDoctor(doctor);
    setFormData({
      name: doctor.name,
      department: doctor.department,
      vehicleNumber: doctor.vehicleNumber,
      vehicleType: doctor.vehicleType,
      validFrom: doctor.validFrom,
      validUntil: doctor.validUntil
    });
    setShowForm(true);
  };

  const handleDeleteDoctor = (doctorId) => {
    setDoctors(doctors.filter(doctor => doctor.id !== doctorId));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (selectedDoctor) {
      // Edit existing doctor
      setDoctors(doctors.map(doctor => 
        doctor.id === selectedDoctor.id ? { ...doctor, ...formData } : doctor
      ));
    } else {
      // Add new doctor
      const newDoctor = {
        id: Date.now().toString(),
        ...formData,
        status: 'active'
      };
      setDoctors([...doctors, newDoctor]);
    }
    
    setShowForm(false);
  };

  const getStatusBadge = (validUntil) => {
    const today = new Date();
    const expiryDate = new Date(validUntil);
    
    if (expiryDate < today) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Expired</span>;
    }
    
    const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 7) {
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Expiring Soon</span>;
    }
    
    return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Active</span>;
  };

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

  const viewPass = (doctor) => {
    setSelectedDoctor(doctor);
    setActiveTab('passes');
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Doctor Vehicle Registration</h1>
          <p className="text-gray-600">Manage doctor vehicle registrations and parking passes</p>
        </div>
        <div className="flex space-x-2">
          <button
            className={`px-4 py-2 rounded-md ${activeTab === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setActiveTab('list')}
          >
            Registration List
          </button>
          <button
            className={`px-4 py-2 rounded-md ${activeTab === 'passes' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setActiveTab('passes')}
          >
            Parking Passes
          </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <>
          {showForm ? (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {selectedDoctor ? 'Edit Doctor Vehicle' : 'Register New Doctor Vehicle'}
                </h3>
                <button 
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setShowForm(false)}
                >
                  &times;
                </button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Name</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.vehicleNumber}
                      onChange={(e) => setFormData({...formData, vehicleNumber: e.target.value})}
                      required
                      placeholder="e.g. AB12 XYZ"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.vehicleType}
                      onChange={(e) => setFormData({...formData, vehicleType: e.target.value})}
                    >
                      <option value="Car">Car</option>
                      <option value="Bike">Bike</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.validFrom}
                      onChange={(e) => setFormData({...formData, validFrom: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({...formData, validUntil: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
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
                    {selectedDoctor ? 'Update' : 'Register'} Vehicle
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <div className="relative w-full md:w-1/2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search by doctor name, vehicle number or department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                  onClick={handleAddDoctor}
                >
                  <Plus size={18} className="mr-2" />
                  Add Doctor Vehicle
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Doctor Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vehicle Details
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Validity
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDoctors.map((doctor) => (
                      <tr key={doctor.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{doctor.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-500">{doctor.department}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900">{doctor.vehicleNumber}</div>
                          <div className="text-gray-500 text-sm">{doctor.vehicleType}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900">{doctor.validFrom}</div>
                          <div className="text-gray-500 text-sm">to {doctor.validUntil}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(doctor.validUntil)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            onClick={() => viewPass(doctor)}
                            title="View Pass"
                          >
                            <Car size={16} />
                          </button>
                          <button
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            onClick={() => handleEditDoctor(doctor)}
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={() => handleDeleteDoctor(doctor.id)}
                            title="Delete"
                          >
                            <Trash size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredDoctors.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No doctor vehicles found matching your search criteria.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
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
                          src="https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/120x120/333/white?text=QR+Code" 
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
      )}
    </div>
  );
};

export default DoctorRegistration;
