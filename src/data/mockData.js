// Mock data for dashboard
export const mockDashboardData = {
  currentVehicles: 127,
  enteredToday: 243,
  exitedToday: 116,
  availableSlots: 73,
  vehicleFlow: {
    entries: [5, 8, 3, 2, 1, 4, 12, 25, 32, 18, 15, 10, 14, 18, 22, 19, 12, 8, 5, 4, 2, 1, 2, 1],
    exits: [1, 2, 1, 0, 0, 1, 3, 8, 15, 12, 10, 8, 12, 15, 10, 8, 5, 3, 2, 1, 0, 0, 0, 0]
  },
  parkingZones: [
    { id: '1', name: 'Main Parking Zone', total: 200, occupied: 127, isFull: false }
  ]
};

// Mock data for vehicle details
export const mockVehicleData = [
  { 
    id: '1', 
    vehicleNumber: 'AB12 XYZ', 
    entryTime: '2025-05-10 08:15:22', 
    exitTime: '2025-05-10 16:45:10', 
    type: 'Staff',
    plateImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/300x100/333/white?text=AB12+XYZ',
    vehicleImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x300/333/white?text=Vehicle+Image',
    paymentMethod: 'Waiver', 
    paymentAmount: '0.000',
    waiverReason: 'Senior Staff Exemption'
  },
  { 
    id: '2', 
    vehicleNumber: 'DEMO 002', 
    entryTime: '2025-05-10 08:30:45', 
    exitTime: null, 
    type: 'Staff',
    plateImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/300x100/333/white?text=CD34+WXY',
    vehicleImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x300/333/white?text=Vehicle+Image'
  },
  { 
    id: '3', 
    vehicleNumber: 'EF56 VUT', 
    entryTime: '2025-05-10 09:12:33', 
    exitTime: '2025-05-10 11:20:15', 
    type: 'Visitor',
    plateImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/300x100/333/white?text=EF56+VUT',
    vehicleImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x300/333/white?text=Vehicle+Image',
    paymentMethod: 'Cash',
    paymentAmount: '1.000'
  },
  {
    id: '4',
    vehicleNumber: 'GH78 SRQ',
    entryTime: '2025-05-11 10:00:00',
    exitTime: null,
    type: 'Visitor',
    plateImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/300x100/333/white?text=GH78+SRQ',
    vehicleImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x300/333/white?text=Vehicle+Image'
  },
  {
    id: '5',
    vehicleNumber: 'IJ90 PON',
    entryTime: '2025-05-11 11:30:00',
    exitTime: '2025-05-11 14:00:00',
    type: 'Staff',
    plateImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/300x100/333/white?text=IJ90+PON',
    vehicleImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x300/333/white?text=Vehicle+Image',
    paymentMethod: 'Waiver',
    paymentAmount: '0.000',
    waiverReason: 'Official Duty'
  },
  {
    id: '6',
    vehicleNumber: 'KL12 MLK',
    entryTime: '2025-05-11 12:15:00',
    exitTime: null,
    type: 'Visitor',
    plateImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/300x100/333/white?text=KL12+MLK',
    vehicleImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x300/333/white?text=Vehicle+Image'
  },
  {
    id: '7',
    vehicleNumber: 'MN34 JIH',
    entryTime: '2025-05-12 07:50:00',
    exitTime: '2025-05-12 09:55:00',
    type: 'Visitor',
    plateImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/300x100/333/white?text=MN34+JIH',
    vehicleImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x300/333/white?text=Vehicle+Image',
    paymentMethod: 'Card',
    paymentAmount: '1.500'
  },
  {
    id: '8',
    vehicleNumber: 'OP56 GFE',
    entryTime: '2025-05-12 09:05:00',
    exitTime: null,
    type: 'Staff',
    plateImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/300x100/333/white?text=OP56+GFE',
    vehicleImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x300/333/white?text=Vehicle+Image'
  },
  {
    id: '9',
    vehicleNumber: 'QR78 DCB',
    entryTime: '2025-05-12 13:20:00',
    exitTime: '2025-05-12 13:50:00',
    type: 'Visitor',
    plateImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/300x100/333/white?text=QR78+DCB',
    vehicleImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x300/333/white?text=Vehicle+Image',
    paymentMethod: 'Waiver',
    paymentAmount: '0.000',
    waiverReason: 'Quick Drop-off'
  },
  { 
    id: '10', 
    vehicleNumber: 'ST90 AZY', 
    entryTime: '2025-05-10 15:25:42', 
    exitTime: null, 
    type: 'Visitor', 
    plateImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/300x100/333/white?text=ST90+AZY',
    vehicleImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x300/333/white?text=Vehicle+Image'
  },
  { 
    id: '11', 
    vehicleNumber: 'UV12 CBA', 
    entryTime: '2025-05-13 09:00:00', 
    exitTime: null, 
    type: 'Staff',
    plateImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/300x100/333/white?text=UV12+CBA',
    vehicleImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x300/333/white?text=Vehicle+Image'
  },
  { 
    id: '12', 
    vehicleNumber: 'WX34 DEF', 
    entryTime: '2025-05-13 10:30:00', 
    exitTime: '2025-05-13 18:00:00', 
    type: 'Visitor',
    plateImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/300x100/333/white?text=WX34+DEF',
    vehicleImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x300/333/white?text=Vehicle+Image',
    paymentMethod: 'Card',
    paymentAmount: '3.500'
  },
  { 
    id: '13', 
    vehicleNumber: 'YZ56 GHI', 
    entryTime: '2025-05-13 11:15:00', 
    exitTime: null, 
    type: 'Visitor',
    plateImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/300x100/333/white?text=YZ56+GHI',
    vehicleImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x300/333/white?text=Vehicle+Image'
  },
  { 
    id: '14', 
    vehicleNumber: 'AA78 JKL', 
    entryTime: '2025-05-14 08:45:00', 
    exitTime: '2025-05-14 12:30:00', 
    type: 'Staff',
    plateImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/300x100/333/white?text=AA78+JKL',
    vehicleImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x300/333/white?text=Vehicle+Image',
    paymentMethod: 'Waiver',
    paymentAmount: '0.000',
    waiverReason: 'Hospital Business'
  },
  { 
    id: '15', 
    vehicleNumber: 'BB90 MNO', 
    entryTime: '2025-05-14 14:00:00', 
    exitTime: null, 
    type: 'Visitor',
    plateImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/300x100/333/white?text=BB90+MNO',
    vehicleImage: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/400x300/333/white?text=Vehicle+Image'
  }
];

// Mock data for camera configuration
export const mockCameraData = [
  { 
    id: '1', 
    name: 'Entrance Camera', 
    location: 'Main Entrance',
    status: 'active'
  },
  { 
    id: '2', 
    name: 'Exit Camera', 
    location: 'Main Exit',
    status: 'active'
  }
];

// Mock data for staff passes
export const mockStaffPassData = [
  {
    id: '1',
    staffName: 'Mr. Ahmed Al Balushi', 
    department: 'Administration', 
    vehicles: [ 
      { number: 'AA11 BBB', type: 'Car' },
      { number: 'CC22 DDD', type: 'Bike' }
    ],
    validFrom: '2025-01-01',
    validUntil: '2025-12-31',
    status: 'active',
    mobileNumber: '+968 9123 4567'
  },
  {
    id: '2',
    staffName: 'Ms. Fatima Al Harthy', 
    department: 'Nursing', 
    vehicles: [
      { number: 'EE33 FFF', type: 'Car' }
    ],
    validFrom: '2025-01-01',
    validUntil: '2025-05-15',
    status: 'expiring',
    mobileNumber: '+968 9234 5678'
  },
  {
    id: '3',
    staffName: 'Mr. Khalid Al Said', 
    department: 'Maintenance', 
    vehicles: [
      { number: 'GG44 HHH', type: 'Bike' }
    ],
    validFrom: '2025-01-01',
    validUntil: '2025-04-30',
    status: 'expired',
    mobileNumber: '+968 9345 6789'
  },
  {
    id: '4',
    staffName: 'Mrs. Aisha Al Jabri', 
    department: 'IT Support', 
    vehicles: [
      { number: 'II55 JJJ', type: 'Car' },
      { number: 'XV12 ZZZ', type: 'Car' }, 
      { number: 'BC90 YYY', type: 'Bike' }  
    ],
    validFrom: '2025-01-01',
    validUntil: '2026-01-01',
    status: 'active',
    mobileNumber: '+968 9456 7890'
  },
  {
    id: '5',
    staffName: 'Mr. Salim Al Maskari', 
    department: 'Security', 
    vehicles: [
      { number: 'KK66 LLL', type: 'Car' }
    ],
    validFrom: '2025-01-01',
    validUntil: '2025-12-31',
    status: 'active',
    mobileNumber: '+968 9567 8901'
  }
];

// Mock data for settings
export const mockSettingsData = {
  parking: {
    gates: [
      {
        id: '1',
        name: 'Main Entrance',
        totalSlots: 200,
        staffAllocation: 60,
        visitorAllocation: 80,
        emergencyAllocation: 20
      }
    ]
  }
};

// Mock data for tiered pricing module
export const mockTieredPricingData = [
  {
    id: '1',
    vehicleType: '4-Wheeler',
    name: 'Standard Car Parking',
    description: 'Regular pricing for visitor cars with progressive rates',
    isActive: true,
    tiers: [
      { id: '1-1', duration: 1, unit: 'hour', priceOMR: '0.500' },
      { id: '1-2', duration: 2, unit: 'hour', priceOMR: '0.300' }, 
      { id: '1-3', duration: 4, unit: 'hour', priceOMR: '0.200' }, 
      { id: '1-4', duration: 1, unit: 'day', priceOMR: '3.000' }  
    ]
  },
  {
    id: '2',
    vehicleType: '2-Wheeler',
    name: 'Motorcycle Parking',
    description: 'Discounted rates for motorcycles and scooters',
    isActive: true,
    tiers: [
      { id: '2-1', duration: 1, unit: 'hour', priceOMR: '0.200' },
      { id: '2-2', duration: 3, unit: 'hour', priceOMR: '0.100' },
      { id: '2-3', duration: 1, unit: 'day', priceOMR: '1.000' }
    ]
  },
];

// Mock data for slot management
export const mockSlotData = {
  id: '1',
  name: 'Main Parking Zone',
  totalSlots: 200,
  availableSlots: 73,
  reservedSlots: 50,
  occupiedSlots: 77,
  status: 'active',
  isNearlyFull: false
};

// List of available modules for permissions
export const availableAppModules = [
  'Dashboard', 
  'Live Parking', 
  'Slot Management', 
  'Reports', 
  'Payment Reports', 
  'Pricing', 
  'Passes', 
  'Tenant subscriptions',
  'Tenant Master',
  'Device Config', 
  'Add User',
  'Kiosk Management',
  'Boom Barrier Control', // Added Boom Barrier Control
  'Settings'
];

// Mock data for user accounts (Settings Page - might not be directly used if settings is static)
export const mockSystemUsers = [
  {
    id: '1',
    name: 'Admin User',
    username: 'admin',
    email: 'admin@lifeline.com', 
    role: 'admin',
    isActive: true,
    lastLogin: '2025-05-09 14:30:22'
  },
];

// Mock data for Boom Barriers
export const mockBarrierData = [
  { id: 'barrier_entry_1', name: 'Main Entrance Barrier', location: 'North Gate', status: 'closed' },
  { id: 'barrier_exit_1', name: 'Main Exit Barrier', location: 'North Gate', status: 'closed' },
  { id: 'barrier_staff_entry', name: 'Staff Parking Entry Barrier', location: 'Staff Zone A', status: 'closed' },
];
