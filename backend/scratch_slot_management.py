import re

with open(r'g:\silal_market_pro_parking\src\pages\SlotManagement.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add new states
new_states = """  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('all');
"""
content = re.sub(r'(const \[formData, setFormData\] = useState\(\{[^\}]+\}\);)', r'\1\n' + new_states, content)

# Modify fetchSlotDetails
old_fetch = """  const fetchSlotDetails = async () => {
    try {
      const response = await fetch(apiUrl('/api/slot/list-slot-details'));"""
new_fetch = """  const fetchLocations = async () => {
    try {
      const response = await fetch(apiUrl('/api/locations/'));
      if (response.ok) {
        const data = await response.json();
        setLocations(data.filter(loc => loc.is_active));
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
    }
  };

  const fetchSlotDetails = async () => {
    try {
      const url = selectedLocation === 'all' 
        ? apiUrl('/api/slot/list-slot-details?location_id=all')
        : apiUrl(`/api/slot/list-slot-details?location_id=${selectedLocation}`);
      const response = await fetch(url);"""
content = content.replace(old_fetch, new_fetch)

# Update useEffect
old_use_effect = """  useEffect(() => {
    fetchSlotDetails();
    const interval = setInterval(fetchSlotDetails, 5000);
    return () => clearInterval(interval);
  }, []);"""
new_use_effect = """  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchSlotDetails();
    const interval = setInterval(fetchSlotDetails, 5000);
    return () => clearInterval(interval);
  }, [selectedLocation]);"""
content = content.replace(old_use_effect, new_use_effect)

# Update handleSubmit
old_submit = """      const response = await fetch(apiUrl('/api/slot/update-settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });"""
new_submit = """      const response = await fetch(apiUrl('/api/slot/update-settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, location_id: selectedLocation })
      });"""
content = content.replace(old_submit, new_submit)

# Update UI with tabs
ui_header_old = """      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="font-logo text-3xl font-black text-gray-900 tracking-wide">{t('slotManagement.title')}</h1>
          <p className="text-gray-500 mt-1 font-medium">{t('slotManagement.subtitle')}</p>
        </div>
        <button
          className="ripple-button px-6 py-3.5 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg hover:shadow-black/20 active:scale-95 flex items-center focus:outline-none group transition-all"
          onClick={handleEditSlots}
        >
          <Edit size={18} className={`text-premium-gold transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
          <span className="font-bold text-sm tracking-wide">{t('slotManagement.updateAllocation')}</span>
        </button>
      </div>"""
ui_header_new = """      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="font-logo text-3xl font-black text-gray-900 tracking-wide">{t('slotManagement.title')}</h1>
          <p className="text-gray-500 mt-1 font-medium">{t('slotManagement.subtitle')}</p>
        </div>
        {selectedLocation !== 'all' && (
          <button
            className="ripple-button px-6 py-3.5 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg hover:shadow-black/20 active:scale-95 flex items-center focus:outline-none group transition-all"
            onClick={handleEditSlots}
          >
            <Edit size={18} className={`text-premium-gold transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
            <span className="font-bold text-sm tracking-wide">{t('slotManagement.updateAllocation')}</span>
          </button>
        )}
      </div>
      
      {/* Location Tabs */}
      <div className="mb-10 w-full overflow-x-auto custom-scrollbar pb-2">
        <div className={`flex gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''} min-w-max px-1`}>
          <button
            onClick={() => setSelectedLocation('all')}
            className={`px-6 py-3.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 shadow-sm
              ${selectedLocation === 'all' 
                ? 'bg-gradient-to-r from-premium-gold to-yellow-600 text-white shadow-premium-gold/30' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100 hover:border-premium-gold/30'}`}
          >
            {t('dashboard.allLocations') || 'All Locations'}
          </button>
          
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setSelectedLocation(loc.id)}
              className={`px-6 py-3.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 shadow-sm
                ${selectedLocation === loc.id 
                  ? 'bg-gradient-to-r from-premium-gold to-yellow-600 text-white shadow-premium-gold/30' 
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100 hover:border-premium-gold/30'}`}
            >
              {loc.location_name}
            </button>
          ))}
        </div>
      </div>"""
content = content.replace(ui_header_old, ui_header_new)

with open(r'g:\silal_market_pro_parking\src\pages\SlotManagement.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
