import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ParkingStatus = ({ zones }) => {
  const fullZones = zones.filter(zone => zone.isFull);
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Parking Status</h3>
      
      <div className="grid grid-cols-1 gap-4">
        {zones.map((zone) => (
          <div 
            key={zone.id} 
            className={`p-4 rounded-lg border ${
              zone.isFull ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium">{zone.name}</h4>
                <p className="text-sm">
                  {zone.occupied} / {zone.total} slots occupied
                </p>
              </div>
              {zone.isFull && (
                <div className="text-red-600">
                  <AlertTriangle size={20} />
                </div>
              )}
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  zone.isFull ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${(zone.occupied / zone.total) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      
      {fullZones.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 flex items-center">
          <AlertTriangle size={16} className="mr-2" />
          <span>
            {fullZones.length === 1 
              ? `${fullZones[0].name} is currently full!` 
              : `${fullZones.length} parking zones are currently full!`}
          </span>
        </div>
      )}
    </div>
  );
};

export default ParkingStatus;
