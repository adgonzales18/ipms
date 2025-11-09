import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/Personal-Logo.png';
import { LogIn, Eye, EyeOff } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotStatus, setForgotStatus] = useState('');

    const navigate = useNavigate();

    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
            const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
                email,
                password
            });

            if (response.data.success) {
                login(response.data.user, response.data.token);
                setFadeOut(true);
                setTimeout(() => {
                    // Navigate based on user role
                    if (response.data.user.role === 'admin') {
                        navigate('/admin');
                    } else {
                        navigate('/user');
                    }
                }, 700);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section
            className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-300 via-blue-400 to-blue-500 px-4 transition-opacity duration-700 ${
            fadeOut ? "opacity-0" : "opacity-100"
          }`}>

            {/* Demo Credentials Sticky Note */}
            <div className="fixed top-6 right-6 bg-yellow-200 p-4 rounded-lg shadow-lg border-l-4 border-yellow-500 max-w-xs z-50 transform rotate-1 hover:rotate-0 transition-transform">
              <div className="flex items-start gap-2">
                <div className="text-yellow-700 font-bold text-lg">📌</div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm mb-2">Demo Credentials</h3>
                  <div className="text-xs text-gray-700 space-y-2">
                    <div>
                      <p className="font-semibold text-blue-700">Admin Account:</p>
                      <p className="font-mono">admin@example.com</p>
                      <p className="font-mono">admin12345</p>
                    </div>
                    <div className="border-t border-yellow-400 pt-2">
                      <p className="font-semibold text-green-700">Viewer Account:</p>
                      <p className="font-mono">user@example.com</p>
                      <p className="font-mono">user12345</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all hover:shadow-3xl duration-300">
                {/* Left Panel */}
                <div className="w-full md:w-1/2 p-10 flex flex-col justify-center relative">
                    <div className="absolute top-6 left-6 text-gray-400 text-sm tracking-wide uppercase">
                        <span className="font-semibold text-blue-700">Inventory & Procurement Management System</span>
                </div>
                <h2 className="text-3xl py-3 font-extrabold mb-6 text-gray-800 flex items-center gap-2">
                    <LogIn className="text-blue-600" size={28} /> Sign In
                </h2>
                <p className="text-gray-500 mb-8 text-sm">
                    Please sign in to continue to your dashboard.
                 </p>
                    {error && (
                    <div className="bg-red-100 text-red-700 p-3 mb-5 rounded-lg border border-red-300 text-sm">
                        {error}
                    </div>
                    )}
                <form className="space-y-5" onSubmit={handleSubmit}>
                {/* Email */}
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                </label>
                <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-700 focus:bg-white outline-none transition"
                    required
                />
                </div>

                {/* Password */}
                <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                </label>
                <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-700 focus:bg-white outline-none transition pr-10"
                    required
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 transition"
                >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                </div>

                {/* Forgot password */}
                <div className="flex justify-between items-center text-sm mt-1">
                <div />
                <a
                    href="#"
                    onClick={(e) => {
                    e.preventDefault();
                    setShowForgot(true);
                    }}
                    className="text-blue-700 hover:text-blue-800 hover:underline transition"
                >
                    Forgot password?
                </a>
                </div>

                {/* Submit Button */}
                <button
                type="submit"
                className={`w-full bg-blue-800 hover:bg-blue-900 text-white py-3.5 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg ${
                    loading ? "opacity-80 cursor-not-allowed" : ""
                }`}
                disabled={loading}
                >
                {loading ? (
                    <span className="animate-pulse">Signing in...</span>
                ) : (
                    <>
                    <LogIn size={18} /> Sign In
                    </>
                )}
                </button>
            </form>

            <div className="text-center text-[11px] text-gray-400 mt-6 select-none">
                Powered by <span className="text-blue-800 font-medium">Agile DevGrit, Inc.</span>
            </div>
            </div>

            {/* Right Panel */}
            <div className="hidden md:flex w-1/2 bg-white items-center justify-center overflow-hidden">
            <img
                src={logo}
                alt="AVES Logo"
                className="object-cover w-full h-full opacity-90 transform scale-75 hover:scale-85 transition-transform duration-700"
            />
            </div>
        </div>
      {showForgot && (
  <div className="fixed inset-0 flex items-center justify-center backdrop-blur-3xl bg-opacity-50 z-50">
    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative">
      <h2 className="text-lg font-semibold mb-3">Forgot Password</h2>
      <p className="text-sm text-gray-600 mb-4">
        Enter your registered email and we’ll send a temporary password.
      </p>

      <input
        type="email"
        placeholder="name@company.com"
        value={forgotEmail}
        onChange={(e) => setForgotEmail(e.target.value)}
        className="w-full border p-2 rounded mb-3"
      />
        {forgotStatus && (
          <p className="text-sm text-gray-600 mb-2">{forgotStatus}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setShowForgot(false)}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              try {
                const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
                const res = await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, {
                  email: forgotEmail,
                });
                setForgotStatus(res.data.message);
              } catch (err) {
                setForgotStatus(
                  err.response?.data?.message || "Failed to send reset email"
                );
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
     )}
    </section>

    )
}

export default Login;