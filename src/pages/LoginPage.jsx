import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react"; // Using a generic icon for login
import { getStoredUsers } from "../utils/appStorage";

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    const normalizedUsername = username.trim().toLowerCase();
    const matchedStoredUser = getStoredUsers([]).find(
      (user) => (user.userName || "").trim().toLowerCase() === normalizedUsername
    );

    if (matchedStoredUser && matchedStoredUser.password === password) {
      setError("");
      onLogin();
      navigate("/");
      return;
    }

    // Accept default admin credentials as fallback
    if (normalizedUsername === "admin" && (password === "password" || password === "" || password === "lifelineproparking@2025" || password === "P@ssw0rd@123")) {
      setError("");
      onLogin(); // Call the onLogin prop passed from App.jsx
      navigate("/"); // Navigate to dashboard after successful login
    } else {
      setError("Invalid username or password.");
    }
  };

  return (
    <div
    className="relative flex items-center justify-center min-h-screen font-sans overflow-hidden"
    style={{
      background: "url('/images/login.png') center center / cover no-repeat",
    }}
  >
    {/* Dark overlay */}
    <div className="absolute inset-0 bg-black/50"></div>
  
    <div className="relative z-10 w-full max-w-md p-8 space-y-8 bg-black/80 text-premium-gold shadow-[inset_4px_0_0_0_#D4AF37] border-r border-premium-gold/20 rounded-lg backdrop-blur-md font-sans">
      <div className="flex flex-col items-center">
           <img
              src="/images/silal-logo.png"
              alt="Silal Logo"
              className="w-32 h-auto mb-6 object-contain brightness-0 invert" 
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
          <p className="mt-2 text-sm text-center text-premium-gold font-logo font-semibold tracking-wide">
            Please sign in to continue
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
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
              <label htmlFor="password-input" className="sr-only">
                {" "}
                {/* Changed id to avoid conflict */}
                Password
              </label>
              <input
                id="password-input"
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
                <ShieldCheck
                  className="h-5 w-5 text-red-300 group-hover:text-red-200"
                  aria-hidden="true"
                />
              </span>
              Sign in
            </button>
          </div>
        </form>
        <p className="mt-4 text-xs text-center text-premium-gold font-logo font-medium tracking-wide">
          &copy; {new Date().getFullYear()} Pro Parking System. All rights
          reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
