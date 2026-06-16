import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Bus, Mail, Lock, User, Phone, ArrowRight, ShieldCheck, HelpCircle, Sun, Moon } from 'lucide-react';
import { Spinner } from '../../components/shared/Loader';
import toast from 'react-hot-toast';

export const Login = () => {
  const { login, signup, signInWithGoogle, isLoading, theme, toggleTheme } = useAuth();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // Form Fields
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Map errors
  const mapErrorToMessage = (error) => {
    const code = error.code || '';
    if (code.includes('wrong-password') || code.includes('invalid-credential')) {
      return "Incorrect password";
    }
    if (code.includes('user-not-found')) {
      return "No account found with this email";
    }
    if (code.includes('too-many-requests')) {
      return "Too many attempts. Try again in a few minutes";
    }
    return error.message || "Authentication failed. Try again.";
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!emailOrPhone || !password) {
      toast.error('Please enter your credentials');
      return;
    }

    // Process email or phone input
    let email = emailOrPhone.trim();
    const isPhoneNum = /^\d{10}$/.test(email);
    if (isPhoneNum) {
      email = `${email}@citybus.phone`;
    }

    setLoadingSubmit(true);
    try {
      if (isSignUp) {
        if (!name.trim()) {
          toast.error('Please enter your name');
          setLoadingSubmit(false);
          return;
        }
        if (password !== confirmPassword) {
          toast.error('Passwords do not match');
          setLoadingSubmit(false);
          return;
        }
        if (!termsAccepted) {
          toast.error('You must accept the terms and conditions');
          setLoadingSubmit(false);
          return;
        }
        const phoneField = isPhoneNum ? emailOrPhone : '';
        await signup(email, password, name, phoneField);
      } else {
        await login(email, password);
      }
    } catch (err) {
      const msg = mapErrorToMessage(err);
      toast.error(msg);
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      // already toasted
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      
      {/* Floating Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={toggleTheme}
          className={`p-3 rounded-full shadow-lg border transition-all duration-300 hover:scale-110 flex items-center justify-center ${
            isDark 
              ? 'bg-slate-900 border-slate-800 text-yellow-400 hover:bg-slate-800' 
              : 'bg-white border-slate-200 text-amber-600 hover:bg-slate-50 shadow-md'
          }`}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Container */}
      <div className={`w-full max-w-[420px] border rounded-3xl overflow-hidden shadow-2xl transition-colors duration-300 ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      } flex flex-col relative`}>
        
        {/* Blue Header Accent */}
        <div className="bg-primary px-6 py-6 text-center flex flex-col items-center gap-2 relative">
          <div className="bg-white/10 p-3 rounded-2xl text-white shadow-inner">
            <Bus size={32} className="stroke-[2.5]" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Track Your Bus</h2>
          <p className="text-[10px] text-primary-light uppercase tracking-widest font-bold">Hyderabad Passenger Services</p>
        </div>

        {/* Form area */}
        <div className="p-6 space-y-5">
          {/* Custom Navigation Tabs */}
          <div className={`grid grid-cols-2 p-1.5 rounded-2xl border transition-colors duration-300 ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => {
                setIsSignUp(false);
                resetFormState();
              }}
              className={`py-2 text-xs font-bold rounded-xl transition ${
                !isSignUp 
                  ? 'bg-primary text-white shadow-md' 
                  : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`py-2 text-xs font-bold rounded-xl transition ${
                isSignUp 
                  ? 'bg-primary text-white shadow-md' 
                  : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4 text-xs font-semibold">
            {isSignUp && (
              <div className="space-y-1">
                <label className={isDark ? 'text-slate-400' : 'text-slate-600'}>Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jaspreet Singh"
                    className={`w-full border rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-primary transition ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className={isDark ? 'text-slate-400' : 'text-slate-600'}>Email Address or 10-Digit Phone</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  {/^\d+$/.test(emailOrPhone) ? <Phone size={16} /> : <Mail size={16} />}
                </span>
                <input
                  type="text"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="e.g. name@domain.com or 9876543210"
                  className={`w-full border rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-primary transition ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className={isDark ? 'text-slate-400' : 'text-slate-600'}>Password</label>
                {!isSignUp && (
                  <Link to="/forgot-password" className="text-[10px] text-primary hover:underline font-bold">
                    Forgot Password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full border rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-primary transition ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>

            {isSignUp && (
              <>
                <div className="space-y-1">
                  <label className={isDark ? 'text-slate-400' : 'text-slate-600'}>Confirm Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                      <Lock size={16} />
                    </span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full border rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-primary transition ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className={`accent-primary h-4 w-4 rounded mt-0.5 cursor-pointer ${
                      isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-300 bg-white'
                    }`}
                  />
                  <label htmlFor="terms" className={`text-[10px] leading-normal cursor-pointer select-none ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    I agree to the CityBus Terms of Service and Privacy Policy for GPS mapping and tracking services.
                  </label>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loadingSubmit}
              className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition duration-300 disabled:opacity-50 mt-4"
            >
              {loadingSubmit ? (
                <Spinner size="sm" color="white" />
              ) : (
                <>
                  <span>{isSignUp ? 'Create Passenger Account' : 'Sign In'}</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Google SSO */}
          <div className="flex items-center my-4">
            <div className={`flex-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}></div>
            <span className={`px-3 text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Or continue with</span>
            <div className={`flex-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}></div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className={`w-full border py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm ${
              isDark 
                ? 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-200 hover:text-white' 
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.642 1.091 14.99 0 12 0 7.354 0 3.307 2.661 1.341 6.549l3.925 3.216z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.275c0-.825-.075-1.62-.215-2.385H12v4.51h6.446c-.28 1.47-1.109 2.715-2.355 3.55l3.66 2.84c2.14-1.975 3.739-4.88 3.739-8.515z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.97-1.075 7.965-2.91l-3.66-2.84c-1.015.68-2.315 1.085-4.305 1.085-3.87 0-7.14-2.618-8.31-6.14l-3.96 3.07C2.015 20.375 6.634 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M3.69 13.205A7.143 7.143 0 0 1 3.273 12c0-.42.04-.83.116-1.235l-3.96-3.07A11.947 11.947 0 0 0 0 12c0 1.545.295 3.02.825 4.385l2.865-2.22-.001-.96z"
              />
            </svg>
            <span>Google Single Sign-On</span>
          </button>

          {/* Quick instructions / driver path */}
          <div className={`text-center pt-4 border-t mt-4 flex flex-col gap-3 ${
            isDark ? 'border-slate-800' : 'border-slate-100'
          }`}>
            <Link
              to="/driver/login"
              className={`text-xs hover:underline font-bold inline-flex items-center justify-center gap-1 ${
                isDark ? 'text-emerald-400' : 'text-emerald-600'
              }`}
            >
              <ShieldCheck size={13} />
              Driver Console Login →
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

const resetFormState = () => {};

export default Login;
