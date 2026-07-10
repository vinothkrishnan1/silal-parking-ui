import React, { useState } from 'react';
import { Search, Plus, Edit, Trash, Shield, Smartphone, User, Lock } from 'lucide-react';
import { mockUserData } from '../data/mockData';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { useLanguage } from '../context/LanguageContext';

const UserManagement = () => {
  const { language, t } = useLanguage();
  const [users, setUsers] = useState(mockUserData);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    role: 'operator',
    deviceId: '',
    deviceName: '',
    isActive: true,
    gateAssignment: 'all'
  });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddUser = () => {
    setSelectedUser(null);
    setFormData({
      name: '',
      username: '',
      email: '',
      role: 'operator',
      deviceId: '',
      deviceName: '',
      isActive: true,
      gateAssignment: 'all'
    });
    setShowForm(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      deviceId: user.deviceId || '',
      deviceName: user.deviceName || '',
      isActive: user.isActive,
      gateAssignment: user.gateAssignment || 'all'
    });
    setShowForm(true);
  };

  const handleDeleteUser = (user) => {
    setDeleteModal({ isOpen: true, id: user.id, name: user.name });
  };

  const confirmDeleteUser = () => {
    setUsers(users.filter(user => user.id !== deleteModal.id));
    setDeleteModal({ isOpen: false, id: null, name: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (selectedUser) {
      // Edit existing user
      setUsers(users.map(user =>
        user.id === selectedUser.id ? { ...user, ...formData } : user
      ));
    } else {
      // Add new user
      const newUser = {
        id: Date.now().toString(),
        ...formData,
        lastLogin: null
      };
      setUsers([...users, newUser]);
    }

    setShowForm(false);
  };

  const toggleStatus = (userId) => {
    setUsers(users.map(user =>
      user.id === userId ? { ...user, isActive: !user.isActive } : user
    ));
  };

  const getRoleBadge = (role) => {
    const colors = {
      'admin': 'bg-purple-100 text-purple-800',
      'manager': 'bg-blue-100 text-blue-800',
      'operator': 'bg-green-100 text-green-800',
      'security': 'bg-yellow-100 text-yellow-800'
    };

    const roleLabels = {
      'admin': t('users.admin'),
      'manager': t('users.manager'),
      'operator': t('users.operator'),
      'security': t('users.security')
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[role] || 'bg-gray-100 text-gray-800'}`}>
        {roleLabels[role] || role}
      </span>
    );
  };

  return (
    <div className={`p-6 md:p-8 max-w-[1600px] mx-auto ${language === 'ar' ? 'rtl' : 'ltr'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className={`mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <div className={language === 'ar' ? 'text-right' : 'text-left'}>
          <h1 className="font-logo text-3xl font-black text-gray-900 tracking-wide">{t('users.title')}</h1>
          <p className="text-gray-500 mt-1 flex items-center font-medium">
            <User size={16} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} text-premium-gold`} />
            {t('users.subtitle')}
          </p>
        </div>
        <button
          className="ripple-button px-5 py-3 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg hover:shadow-black/20 active:scale-95 flex items-center transition-all font-bold text-sm focus:outline-none group"
          onClick={handleAddUser}
        >
          <Plus size={18} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} text-premium-gold transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90`} />
          <span className="tracking-wide">{t('users.addUser')}</span>
        </button>
      </div>

      {showForm ? (
        <div className="premium-card p-6 md:p-8 mb-6 border border-gray-100">
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">
              {selectedUser ? t('users.editUser') : t('users.addNewUser')}
            </h3>
            <button
              className="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-2 rounded-xl transition-all focus:outline-none"
              onClick={() => setShowForm(false)}
            >
              <Trash size={20} className="hidden" /> {/* Placeholder for visual alignment if needed */}
              <span className="text-2xl leading-none">&times;</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="bg-gray-50/30 p-6 rounded-2xl">
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('users.fullName')}</label>
                <input
                  type="text"
                  className={`w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('users.username')}</label>
                <input
                  type="text"
                  className={`w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('users.email')}</label>
                <input
                  type="email"
                  className={`w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('users.role')}</label>
                <select
                  className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="admin">{t('users.admin')}</option>
                  <option value="manager">{t('users.manager')}</option>
                  <option value="operator">{t('users.operator')}</option>
                  <option value="security">{t('users.security')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('users.deviceId')}</label>
                <input
                  type="text"
                  className={`w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}
                  value={formData.deviceId}
                  onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                  placeholder="e.g. 123456789"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('users.deviceName')}</label>
                <input
                  type="text"
                  className={`w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}
                  value={formData.deviceName}
                  onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                  placeholder="e.g. Samsung Galaxy S21"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('users.gateAssignment')}</label>
                <select
                  className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm"
                  value={formData.gateAssignment}
                  onChange={(e) => setFormData({ ...formData, gateAssignment: e.target.value })}
                >
                  <option value="all">{t('users.allGates')}</option>
                  <option value="entrance">{t('users.entranceGate')}</option>
                  <option value="exit">{t('users.exitGate')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('users.status')}</label>
                <select
                  className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm"
                  value={formData.isActive ? "active" : "inactive"}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "active" })}
                >
                  <option value="active">{t('users.active')}</option>
                  <option value="inactive">{t('users.inactive')}</option>
                </select>
              </div>

              {!selectedUser && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('users.password')}</label>
                  <input
                    type="password"
                    className={`w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}
                    placeholder={t('users.passwordPlaceholder')}
                    required={!selectedUser}
                  />
                  <p className="mt-2 text-sm font-bold text-gray-500 tracking-wide">
                    {t('users.passwordHelp')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-6 border-t border-gray-100 mt-4">
              <button
                type="button"
                className="ripple-button px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all shadow-sm focus:outline-none"
                onClick={() => setShowForm(false)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="ripple-button px-8 py-3 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg hover:shadow-black/20 active:scale-95 font-bold text-sm transition-all focus:outline-none group"
              >
                <span className="tracking-wide">{selectedUser ? t('common.save') : t('users.addUser')}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="premium-card overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-100 bg-white">
            <div className={`relative w-full md:w-1/2 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
              <div className={`absolute inset-y-0 ${language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
                <Search size={18} className="text-premium-gold" />
              </div>
              <input
                type="text"
                className={`block w-full py-4 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 placeholder-gray-400 shadow-sm ${language === 'ar' ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left'}`}
                placeholder={t('users.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/80">
                <tr className={language === 'ar' ? 'flex-row-reverse' : ''}>
                  <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>
                    {t('users.user')}
                  </th>
                  <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>
                    {t('users.role')}
                  </th>
                  <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>
                    {t('users.device')}
                  </th>
                  <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>
                    {t('users.gateAssignment')}
                  </th>
                  <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-right' : 'text-left'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>
                    {t('users.status')}
                  </th>
                  <th scope="col" className={`px-6 py-5 ${language === 'ar' ? 'text-left' : 'text-right'} text-[11px] font-black text-gray-400 uppercase tracking-widest`}>
                    {t('users.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={`hover:bg-gray-50/50 transition-colors group ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <div className="h-10 w-10 rounded-xl bg-premium-gold/10 flex items-center justify-center text-premium-gold font-black shadow-sm group-hover:scale-105 transition-transform">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={`${language === 'ar' ? 'mr-4 text-right' : 'ml-4 text-left'}`}>
                          <div className="font-black text-gray-900 text-sm tracking-tight">{user.name}</div>
                          <div className="text-gray-500 text-xs font-bold mt-1 tracking-wide">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-right' : ''}`}>
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {user.deviceId ? (
                        <div className={`flex items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                          <Smartphone size={16} className={`text-premium-gold ${language === 'ar' ? 'ml-3' : 'mr-3'}`} />
                          <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                            <div className="text-sm font-bold text-gray-900">{user.deviceName}</div>
                            <div className="text-xs text-gray-400 font-bold tracking-wide mt-1 uppercase">ID: {user.deviceId}</div>
                          </div>
                        </div>
                      ) : (
                        <span className={`text-gray-400 text-sm font-bold ${language === 'ar' ? 'block text-right' : ''}`}>{t('users.noDevice')}</span>
                      )}
                    </td>
                    <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-right' : ''}`}>
                      <span className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg bg-gray-100 text-gray-600 shadow-sm">
                        {user.gateAssignment === 'all' ? t('users.allGates') :
                          user.gateAssignment === 'entrance' ? t('users.entranceGate') :
                            user.gateAssignment === 'exit' ? t('users.exitGate') : user.gateAssignment}
                      </span>
                    </td>
                    <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-right' : ''}`}>
                      <button
                        onClick={() => toggleStatus(user.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-black transition-all shadow-sm ${user.isActive
                            ? 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100'
                            : 'bg-red-50 text-red-500 border border-red-100 hover:bg-red-100'
                          }`}
                      >
                        {user.isActive ? t('users.active') : t('users.inactive')}
                      </button>
                    </td>
                    <td className={`px-6 py-5 whitespace-nowrap ${language === 'ar' ? 'text-left' : 'text-right'} text-sm font-medium`}>
                      <button
                        className={`text-gray-400 hover:text-premium-black bg-gray-50 hover:bg-gray-100 p-2 rounded-lg transition-all focus:outline-none shadow-sm ${language === 'ar' ? 'ml-2' : 'mr-2'}`}
                        onClick={() => handleEditUser(user)}
                        title={t('users.editUser')}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className={`text-gray-400 hover:text-premium-gold bg-gray-50 hover:bg-gray-100 p-2 rounded-lg transition-all focus:outline-none shadow-sm ${language === 'ar' ? 'ml-2' : 'mr-2'}`}
                        onClick={() => alert('Reset password functionality would be implemented here')}
                        title={t('users.resetPassword')}
                      >
                        <Lock size={16} />
                      </button>
                      <button
                        className="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-2 rounded-lg transition-all focus:outline-none shadow-sm"
                        onClick={() => handleDeleteUser(user)}
                        title={t('users.deleteUser')}
                      >
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-gray-400 flex flex-col items-center">
                <User size={48} className="text-gray-200 mb-4" />
                <span className="text-lg font-bold text-gray-500 tracking-wide">{t('users.noUsersFound')}</span>
              </div>
            )}
          </div>
        </div>
      )}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={confirmDeleteUser}
        title={t('users.deleteUser')}
        message={t('users.deleteConfirm')}
        itemName={deleteModal.name}
      />
    </div>
  );
};

export default UserManagement;
