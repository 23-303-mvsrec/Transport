import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, isFirebaseEnabled } from '../../services/firebase';
import { Bus, Mail, ArrowLeft, Send } from 'lucide-react';
import { Spinner } from '../../components/shared/Loader';
import toast from 'react-hot-toast';

export const ForgotPassword = () => {
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-slate-950/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl text-slate-100 flex flex-col relative">
        
        {/* Back Link */}
        <Link 
          to="/login"
          className="absolute top-5 left-5 text-slate-400 hover:text-white flex items-center gap-1 text-xs font-semibold"
        >
          <ArrowLeft size={14} /> Back
        </Link>

        {/* Branding header */}
        <div className="flex flex-col items-center text-center mt-6 mb-6">
          <div className="bg-primary p-3.5 rounded-2xl text-white mb-2 shadow-lg">
            <Bus size={28} className="stroke-[2.5]" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Reset Password</h1>
          <p className="text-xs text-slate-400 mt-1">Hyderabad CityBus Account</p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-2xl p-4 text-xs font-semibold">
              <p>
                A password reset hyperlink has been dispatched to <span className="text-white font-bold">{email}</span>. 
                Please inspect your inbox folders.
              </p>
            </div>
            <Link
              to="/login"
              className="w-full bg-slate-900 hover:bg-slate-850 py-3 rounded-xl text-xs font-bold text-slate-200 hover:text-white transition block"
            >
              Return to Login Screen
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4 text-xs font-semibold">
            <div className="space-y-1">
              <label className="text-slate-400">Account Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. name@domain.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 focus:border-primary focus:outline-none transition text-white"
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
