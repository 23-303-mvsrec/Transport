import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, isFirebaseEnabled } from '../../services/firebase';
import { Bus, Mail, ArrowLeft, Send, Sun, Moon } from 'lucide-react';
import { Spinner } from '../../components/shared/Loader';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const ForgotPassword = () => {
  const { theme, toggleTheme } = useAuth();
  const isDark = theme === 'dark';
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setSubmitting(true);
    try {
      if (isFirebaseEnabled) {
        await sendPasswordResetEmail(auth, email.trim());
      } else {
        // Mock reset delay
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      setSent(true);
      toast.success('Password reset email dispatched successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to dispatch reset email');
    } finally {
      setSubmitting(false);
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

      <div className={`w-full max-w-[400px] border rounded-3xl p-6 shadow-2xl transition-colors duration-300 ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      } flex flex-col relative`}>
        
        {/* Back Link */}
        <Link 
          to="/login"
          className={`absolute top-5 left-5 flex items-center gap-1 text-xs font-semibold transition ${
            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ArrowLeft size={14} /> Back
        </Link>

        {/* Branding header */}
        <div className="flex flex-col items-center text-center mt-6 mb-6">
          <div className="bg-primary p-3.5 rounded-2xl text-white mb-2 shadow-lg">
            <Bus size={28} className="stroke-[2.5]" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Reset Password</h1>
          <p className={`text-xs mt-1 transition ${isDark ? 'text-slate-400' : 'text-slate-555'}`}>Hyderabad CityBus Account</p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <div className={`border rounded-2xl p-4 text-xs font-semibold ${
              isDark ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <p>
                A password reset hyperlink has been dispatched to <span className={isDark ? 'text-white font-bold' : 'text-slate-900 font-bold'}>{email}</span>. 
                Please inspect your inbox folders.
              </p>
            </div>
            <Link
              to="/login"
              className={`w-full py-3 rounded-xl text-xs font-bold transition block ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
              }`}
            >
              Return to Login Screen
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4 text-xs font-semibold">
            <div className="space-y-1">
              <label className={isDark ? 'text-slate-400' : 'text-slate-650'}>Account Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. name@domain.com"
                  className={`w-full border rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-primary transition ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg transition disabled:opacity-50"
            >
              {submitting ? <Spinner size="sm" color="white" /> : (
                <>
                  <Send size={13} />
                  <span>Send Reset Link</span>
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default ForgotPassword;
