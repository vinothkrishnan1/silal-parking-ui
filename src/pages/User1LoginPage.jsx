import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ParkingCircle } from "lucide-react"; // Using ParkingCircle as relevant icon

const User1LoginPage = ({ onUser1Login }) => {
  const [username, setUsername] = useState("user1"); // Default User1 username
  const [password, setPassword] = useState("password"); // Default User1 password (use secure ones in real app!)
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Basic validation for User1 (replace with actual authentication)
    if (username === "user1" && password === "password") {
      console.log("User1 logged in successfully!");
      onUser1Login(); // Call the specific login handler for User1
      navigate("on_exit_system"); // Navigate to User1's allowed page
      console.log("Navigating to On Exit System page.");
    } else {
      setError("Invalid username or password.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 font-sans">
      <div className="w-full max-w-md p-8 space-y-8 bg-black text-premium-gold shadow-[inset_4px_0_0_0_#D4AF37] border-r border-premium-gold/20 rounded-lg font-sans">
        <div className="flex flex-col items-center">
           <img
              src="/images/pro-parking-.png"
              alt="Pro Parking Logo"
              className="w-32 h-auto mb-6 object-contain brightness-0 invert" 
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
         
          <p className="mt-2 text-sm text-center text-premium-gold font-logo font-semibold tracking-wide">
            Live Parking Access - Sign In
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="user1-username" className="sr-only">
                Username
              </label>
              <input
                id="user1-username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-blue focus:border-primary-blue focus:z-10 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="user1-password" className="sr-only">
                Password
              </label>
              <input
                id="user1-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-blue focus:border-primary-blue focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-center text-red-600">{error}</p>}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-red hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-red transition duration-150 ease-in-out"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <ParkingCircle
                  className="h-5 w-5 text-red-300 group-hover:text-red-200"
                  aria-hidden="true"
                />
              </span>
              Sign in
            </button>
          </div>
        </form>
        <p className="mt-4 text-xs text-center text-premium-gold font-logo font-medium tracking-wide">
          &copy; {new Date().getFullYear()} Life Line Hospital. All rights
          reserved.
        </p>
      </div>
    </div>
  );
};

export default User1LoginPage;
