import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X } from 'lucide-react';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, itemName }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 text-center">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>

              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-50 mb-6">
                <Trash2 className="h-10 w-10 text-primary-red" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {title || 'Confirm Deletion'}
              </h3>
              
              <p className="text-gray-600 mb-8 leading-relaxed">
                {message || 'Are you sure you want to delete this item? This action cannot be undone.'}
                {itemName && (
                  <span className="block mt-2 font-semibold text-gray-900 break-words px-4">
                    "{itemName}"
                  </span>
                )}
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-gray-300 active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                  }}
                  className="flex-1 px-6 py-3 bg-primary-red text-white font-semibold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 active:scale-[0.98]"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DeleteConfirmationModal;
