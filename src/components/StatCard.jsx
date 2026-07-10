import React from 'react';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon, color, isAlert }) => {
  return (
    <motion.div 
      className={`premium-card p-6 h-full flex flex-col justify-center relative overflow-hidden group ${isAlert ? 'border-l-4 border-l-red-500' : ''}`}
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"></div>
      
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-sm text-gray-500 mb-1 font-semibold tracking-wide">{title}</p>
          <h3 className={`${title === 'Available Parking Slots' ? 'text-4xl' : 'text-3xl'} font-black text-gray-900 tracking-tight`}>{value}</h3>
        </div>
        <div className={`p-4 rounded-2xl shadow-sm ${color} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
          {icon}
        </div>
      </div>
      {isAlert && (
        <div className="mt-4 text-sm text-red-600 font-bold bg-red-50 py-2 px-3 rounded-lg border border-red-100 flex items-center">
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          Attention required!
        </div>
      )}
    </motion.div>
  );
};

export default StatCard;
