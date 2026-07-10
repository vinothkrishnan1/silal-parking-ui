import React, { useEffect, useRef, useState } from 'react';
import { Plus, Edit, Trash, UserCircle, KeyRound, Camera, X, Save, Lock, Shield, UserPlus, Mail, AlertCircle, CheckCircle, User } from 'lucide-react';
import { availableAppModules } from '../data/mockData';
import { APP_USERS_EVENT, getStoredUsers, setStoredUsers } from '../utils/appStorage';
import { useLanguage } from '../context/LanguageContext';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

const normalizePermissions = (permissions = []) =>
  permissions.map((permission) =>
    permission === 'Camera Config' ? 'Device Config' : permission
  );

const AddUser = () => {
  const { t, language } = useLanguage();
  const initialUsers = [
    {
      id: 'sample1',
      userName: 'Operator Kiosk',
      email: 'operator@example.com',
      role: 'Operator',
      status: 'Active',
      imagePreview: 'https://img-wrapper.vercel.app/image?url=https://placehold.co/64x64/004EA8/white?text=OK',
      permissions: normalizePermissions(['Kiosk Management', 'Live Parking']),
    },
    {
      id: 'sample2',
      userName: 'Reporting Staff',
      email: 'staff@example.com',
      role: 'Staff',
      status: 'Active',
      imagePreview: 'https://img-wrapper.vercel.app/image?url=https://placehold.co/64x64/EC1B22/white?text=RS',
      permissions: normalizePermissions(['Reports', 'Payment Reports'])
    },
    {
      id: 'sample3',
      userName: 'Parking Supervisor',
      email: 'admin@example.com',
      role: 'Admin',
      status: 'Active',
      imagePreview: 'https://img-wrapper.vercel.app/image?url=https://placehold.co/64x64/333333/white?text=PS',
      permissions: normalizePermissions(['Dashboard', 'Live Parking', 'Slot Management', 'Add User'])
    },
  ];

  const [users, setUsers] = useState(() => getStoredUsers(initialUsers));
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    userName: '',
    password: '',
    confirm_password: '',
    email: '',
    role: 'Admin',
    status: 'Active',
    image: null,
    imagePreview: null,
    permissions: [],
  });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setStoredUsers(users);
  }, [users]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError(t('addUser.fileTooLarge'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: file, imagePreview: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePermissionChange = (moduleName) => {
    setFormData(prev => {
      const currentPermissions = prev.permissions || [];
      return {
        ...prev,
        permissions: currentPermissions.includes(moduleName)
          ? currentPermissions.filter(p => p !== moduleName)
          : [...currentPermissions, moduleName]
      };
    });
  };

  const triggerImageUpload = () => fileInputRef.current?.click();

  const getModuleLabel = (moduleName) => {
    const mapping = {
      'Dashboard': 'dashboard',
      'Live Parking': 'liveParking',
      'Slot Management': 'slotManagement',
      'Reports': 'reports',
      'Payment Reports': 'paymentReports',
      'Pricing': 'pricing',
      'Passes': 'passes',
      'Tenant subscriptions': 'tenantSubscriptions',
      'Tenant Master': 'tenantMaster',
      'Device Config': 'deviceConfig',
      'Add User': 'addUser',
      'Kiosk Management': 'kioskManagement',
      'Boom Barrier Control': 'boomBarrier',
      'Settings': 'settings'
    };
    const key = mapping[moduleName];
    return key ? t(`sidebar.${key}`) : moduleName;
  };

  const resetForm = () => {
    setFormData({ userName: '', password: '', confirm_password: '', email: '', role: 'Admin', status: 'Active', image: null, imagePreview: null, permissions: [] });
    setIsEditing(false);
    setCurrentUser(null);
    setError('');
    setSuccess('');
  };

  const handleOpenFormModal = (userToEdit = null) => {
    resetForm();
    if (userToEdit) {
      setIsEditing(true);
      setCurrentUser(userToEdit);
      setFormData({
        userName: userToEdit.userName || '',
        password: '',
        confirm_password: '',
        email: userToEdit.email || '',
        role: userToEdit.role || 'Admin',
        status: userToEdit.status || 'Active',
        image: userToEdit.image || null,
        imagePreview: userToEdit.imagePreview || null,
        permissions: normalizePermissions(userToEdit.permissions || []),
      });
    }
    setShowFormModal(true);
  };

  const handleCloseFormModal = () => setShowFormModal(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) {
      setError(t('addUser.passwordMismatch'));
      return;
    }

    const updatedUser = {
      ...currentUser,
      id: currentUser?.id || Date.now().toString(),
      userName: formData.userName,
      email: formData.email,
      role: formData.role,
      status: formData.status,
      image: formData.image,
      imagePreview: formData.imagePreview,
      permissions: normalizePermissions(formData.permissions),
    };

    if (isEditing) {
      setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
    } else {
      setUsers([...users, updatedUser]);
    }
    setSuccess(isEditing ? t('common.updateSuccess') : t('addUser.createSuccess'));
    setTimeout(handleCloseFormModal, 1500);
  };

  const handleDeleteUser = (user) => {
    setDeleteModal({ isOpen: true, id: user.id, name: user.userName });
  };

  const confirmDeleteUser = () => {
    setUsers(users.filter(user => user.id !== deleteModal.id));
    setDeleteModal({ isOpen: false, id: null, name: '' });
  };

  return (
    <div className={`p-6 md:p-8 max-w-[1600px] mx-auto ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      {/* Header Section */}
      <div className={`mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <div className={language === 'ar' ? 'text-right' : 'text-left'}>
          <h1 className="font-logo text-3xl font-black text-gray-900 tracking-wide">{t('addUser.title')}</h1>
          <p className="text-gray-500 mt-1 font-medium">{t('addUser.subtitle')}</p>
        </div>
        <button
          className="ripple-button px-5 py-3 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg hover:shadow-black/20 active:scale-95 flex items-center transition-all font-bold text-sm focus:outline-none group"
          onClick={() => handleOpenFormModal()}
        >
          <Plus size={18} className={`${language === 'ar' ? 'ml-2' : 'mr-2'} text-premium-gold transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90`} />
          <span className="tracking-wide">{t('addUser.addTitle')}</span>
        </button>
      </div>

      {/* Users Card Table */}
      <div className="premium-card overflow-hidden">
        {users.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <UserCircle size={64} className="mx-auto mb-4 text-gray-200" />
            <p className="text-lg font-bold tracking-wide text-gray-500">{t('addUser.noUsers')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/80">
                <tr>
                  <th scope="col" className={`px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t('addUser.image')}</th>
                  <th scope="col" className={`px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t('addUser.userName')}</th>
                  <th scope="col" className={`px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t('addUser.role')}</th>
                  <th scope="col" className={`px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t('addUser.permissionsLabel')}</th>
                  <th scope="col" className={`px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest ${language === 'ar' ? 'text-left' : 'text-right'}`}>{t('addUser.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex-shrink-0 h-10 w-10 relative">
                        {user.imagePreview ? (
                          <img className="h-10 w-10 rounded-full object-cover border border-gray-100 shadow-sm group-hover:scale-105 transition-transform" src={user.imagePreview} alt={user.userName || t('addUser.user')} />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-premium-gold/10 flex items-center justify-center border border-premium-gold/20 group-hover:scale-105 transition-transform">
                            <User size={18} className="text-premium-gold" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className={`text-sm font-black text-gray-900 tracking-tight ${language === 'ar' ? 'text-right' : ''}`}>{user.userName || '-'}</div>
                      <div className={`text-xs text-gray-500 font-bold tracking-wide mt-1 ${language === 'ar' ? 'text-right' : ''}`}>{user.email || ''}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm">
                      <span className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-black shadow-sm ${user.role === 'Admin'
                          ? 'bg-purple-50 text-purple-600 border border-purple-100'
                          : user.role === 'Staff'
                            ? 'bg-blue-50 text-blue-600 border border-blue-100'
                            : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                        {user.role === 'Admin' ? t('addUser.roles.admin') : user.role === 'Staff' ? t('addUser.roles.staff') : t('addUser.roles.operator')}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500">
                      <div className={`max-w-xs overflow-hidden text-ellipsis font-bold text-gray-600 ${language === 'ar' ? 'text-right' : ''}`}>
                        {user.permissions && user.permissions.length > 0 ? user.permissions.map(p => getModuleLabel(p)).join(', ') : t('addUser.noPermissions')}
                      </div>
                    </td>
                    <td className={`px-6 py-5 whitespace-nowrap text-sm font-medium ${language === 'ar' ? 'text-left' : 'text-right'}`}>
                      <div className={`flex justify-end gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <button
                          onClick={() => handleOpenFormModal(user)}
                          className="p-2 text-gray-400 hover:text-premium-black bg-gray-50 hover:bg-gray-100 rounded-lg transition-all focus:outline-none shadow-sm"
                          title={t('common.edit')}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-lg transition-all focus:outline-none shadow-sm"
                          title={t('common.delete')}
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showFormModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col transform transition-all ${language === 'ar' ? 'text-right' : ''}`}>
            {/* Modal Header */}
            <div className={`flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">{isEditing ? t('addUser.editTitle') : t('addUser.addTitle')}</h3>
              <button
                onClick={handleCloseFormModal}
                className="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-2 rounded-xl transition-all focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-grow bg-gray-50/30">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-2.5 text-sm font-bold shadow-sm">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="p-4 bg-green-50 border border-green-100 text-green-600 rounded-xl flex items-center gap-2.5 text-sm font-bold shadow-sm">
                  <CheckCircle size={18} className="flex-shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <form id="addUserForm" onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('addUser.userName')}</label>
                  <div className="relative">
                    <div className={`absolute inset-y-0 flex items-center pointer-events-none ${language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'}`}>
                      <User size={18} className="text-premium-gold" />
                    </div>
                    <input
                      type="text"
                      name="userName"
                      value={formData.userName}
                      onChange={handleChange}
                      className={`w-full py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4'}`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('addUser.email')}</label>
                  <div className="relative">
                    <div className={`absolute inset-y-0 flex items-center pointer-events-none ${language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'}`}>
                      <Mail size={18} className="text-premium-gold" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4'}`}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('addUser.password')}</label>
                    <div className="relative">
                      <div className={`absolute inset-y-0 flex items-center pointer-events-none ${language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'}`}>
                        <Lock size={18} className="text-premium-gold" />
                      </div>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`w-full py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4'}`}
                        required={!isEditing}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('addUser.confirmPassword')}</label>
                    <div className="relative">
                      <div className={`absolute inset-y-0 flex items-center pointer-events-none ${language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'}`}>
                        <Shield size={18} className="text-premium-gold" />
                      </div>
                      <input
                        type="password"
                        name="confirm_password"
                        value={formData.confirm_password}
                        onChange={handleChange}
                        className={`w-full py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4'}`}
                        required={!isEditing}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('addUser.userRole')}</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className={`w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : ''}`}
                    >
                      <option value="Admin">{t('addUser.roles.admin')}</option>
                      <option value="Staff">{t('addUser.roles.staff')}</option>
                      <option value="Operator">{t('addUser.roles.operator')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('addUser.status')}</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className={`w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold transition-all text-sm font-bold text-gray-900 shadow-sm ${language === 'ar' ? 'text-right' : ''}`}
                    >
                      <option value="Active">{t('addUser.statusOptions.active')}</option>
                      <option value="Inactive">{t('addUser.statusOptions.inactive')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('addUser.image')}</label>
                  <div className={`flex items-center gap-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <div className="h-16 w-16 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
                      {formData.imagePreview ? <img src={formData.imagePreview} alt="Preview" className="h-full w-full object-cover" /> : <Camera size={24} className="text-premium-gold/50" />}
                    </div>
                    <button
                      type="button"
                      onClick={triggerImageUpload}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-all focus:outline-none"
                    >
                      {t('addUser.uploadButton')}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">{t('addUser.permissionsLabel')}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white border border-gray-200 rounded-xl max-h-48 overflow-y-auto shadow-inner">
                    {availableAppModules.map(moduleName => (
                      <div key={moduleName} className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <input
                          type="checkbox"
                          id={`perm-${moduleName}`}
                          checked={formData.permissions.includes(moduleName)}
                          onChange={() => handlePermissionChange(moduleName)}
                          className="h-4 w-4 text-premium-gold border-gray-300 rounded focus:ring-premium-gold/50 accent-premium-gold cursor-pointer"
                        />
                        <label htmlFor={`perm-${moduleName}`} className="text-xs font-bold text-gray-700 cursor-pointer select-none flex-grow tracking-wide">{getModuleLabel(moduleName)}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className={`p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <button
                type="button"
                onClick={handleCloseFormModal}
                className="ripple-button px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all shadow-sm focus:outline-none"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                form="addUserForm"
                className="ripple-button px-8 py-3 bg-gradient-to-r from-premium-black to-[#1a1a1a] text-white rounded-xl hover:shadow-lg hover:shadow-black/20 active:scale-95 flex items-center gap-2 font-bold text-sm transition-all focus:outline-none group"
              >
                <Save size={16} className="text-premium-gold" />
                <span className="tracking-wide">{isEditing ? t('common.save') : t('addUser.addTitle')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={confirmDeleteUser}
        title={t('common.delete')}
        message={t('common.deleteConfirmation')}
        itemName={deleteModal.name}
      />
    </div>
  );
};

export default AddUser;
