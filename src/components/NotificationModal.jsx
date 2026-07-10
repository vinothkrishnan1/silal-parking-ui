import React from 'react';
import { X, AlertTriangle, Check, Bell as BellIcon, Trash2 } from 'lucide-react'; // Removed Info, CheckCircle
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationModal = ({ isOpen, onClose, notifications, onMarkAsRead, onMarkAllAsRead, onClearAll }) => {
  if (!isOpen) return null;

  // Simplified: all notifications are now 'overdue_exit' type
  const getIconAndColorForOverdue = () => {
    return { icon: <AlertTriangle className="h-5 w-5 text-primary-red" />, color: 'text-primary-red' };
  };

  const sortedNotifications = [...notifications].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4"
      onClick={onClose} 
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-blue"
          >
            <X size={20} />
          </button>
        </div>

        {sortedNotifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500 flex flex-col items-center justify-center h-48">
            <BellIcon size={32} className="mx-auto mb-3 text-gray-400" />
            No overdue vehicle notifications.
          </div>
        ) : (
          <div className="p-4 space-y-3 overflow-y-auto flex-grow">
            <AnimatePresence>
              {sortedNotifications.map(notification => {
                const { icon, color } = getIconAndColorForOverdue(); // Always use overdue style
                return (
                  <motion.div
                    key={notification.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                    className={`flex items-start p-3 rounded-md border ${
                      notification.read ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-primary-red shadow-sm' // Adjusted for overdue emphasis
                    }`}
                  >
                    <div className={`flex-shrink-0 pt-1 mr-3 ${color}`}>
                      {icon}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${notification.read ? 'text-gray-600' : 'text-gray-800 font-medium'}`}>
                        {notification.message}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.read && (
                      <button
                        onClick={() => onMarkAsRead(notification.id)}
                        className="ml-2 p-1 text-xs text-primary-blue hover:text-blue-700 rounded-full focus:outline-none focus:bg-blue-100"
                        title="Mark as read"
                      >
                        <Check size={16} />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {sortedNotifications.length > 0 && (
          <div className="p-3 border-t border-gray-200 flex justify-end space-x-2 sticky bottom-0 bg-white z-10">
            <button
              onClick={onMarkAllAsRead}
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-blue"
            >
              Mark all as read
            </button>
            <button
              onClick={onClearAll}
              className="px-3 py-1.5 text-xs bg-red-50 text-primary-red rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-primary-red flex items-center"
            >
              <Trash2 size={14} className="mr-1" /> Clear Read & Resolved
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default NotificationModal;
