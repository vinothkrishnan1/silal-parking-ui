import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Car, LogIn } from 'lucide-react';

const User1Header = ({ onLogout }) => {
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    }
    navigate('/user1'); // Redirect to User1 login page after logout
  };

  // Renamed for clarity and updated logic
  const handleGoToUser1LoginAndLogout = () => {
    // First, log the user out
    if (onLogout) {
      onLogout(); 
    }
    // Then, navigate to the User1 login page
    navigate('/user1'); 
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side: Logo and Module Name */}
          <div className="flex items-center">
            <img 
              src="https://img-wrapper.vercel.app/image?url=https://i.ibb.co/K9fK5dK/Life-Line-Logo.png" 
              alt="Life Line Hospital Logo" 
              className="w-8 h-auto mr-3" 
            />
            <div className="flex items-center text-primary-blue">
              <Car size={20} className="mr-2" />
              <span className="font-semibold text-lg">Live Parking</span>
            </div>
          </div>

          {/* Right side: Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleGoToUser1LoginAndLogout} // Updated onClick handler
              className="flex items-center px-3 py-1.5 bg-blue-50 text-primary-blue rounded-md hover:bg-blue-100 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-blue text-sm font-medium"
              title="Go to User Login"
            >
              <LogIn size={16} className="mr-1.5" />
              User Login
            </button>
            <button
              onClick={handleLogoutClick}
              className="flex items-center px-3 py-1.5 bg-red-50 text-primary-red rounded-md hover:bg-red-100 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-red text-sm font-medium"
            >
              <LogOut size={16} className="mr-1.5" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default User1Header;
