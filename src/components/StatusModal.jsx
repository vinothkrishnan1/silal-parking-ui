import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

const StatusModal = ({ isOpen, onClose, type, title, message }) => {
  const { t } = useLanguage();
  const isSuccess = type === 'success';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[2000] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 text-center">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>

              <div className={`mx-auto flex items-center justify-center h-20 w-20 rounded-full mb-6 ${isSuccess ? 'bg-green-50' : 'bg-red-50'}`}>
                {isSuccess ? (
                  <CheckCircle className="h-10 w-10 text-green-600" />
                ) : (
                  <AlertCircle className="h-10 w-10 text-red-600" />
                )}
              </div>

              <h3 className={`text-2xl font-bold mb-2 ${isSuccess ? 'text-gray-900' : 'text-red-900'}`}>
                {title}
              </h3>
              
              <p className="text-gray-600 mb-8 leading-relaxed">
                {message}
              </p>

              <button
                onClick={onClose}
                className={`w-full px-6 py-3 font-semibold rounded-xl transition-all active:scale-[0.98] ${
                  isSuccess 
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-200' 
                    : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200'
                }`}
              >
                {t('common.continue')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StatusModal;
