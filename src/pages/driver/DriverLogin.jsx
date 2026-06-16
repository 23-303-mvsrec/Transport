import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db, isFirebaseEnabled } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Compass, Mail, Lock, ArrowLeft, ShieldAlert, Sun, Moon } from 'lucide-react';
import { Spinner } from '../../components/shared/Loader';
import toast from 'react-hot-toast';

export const DriverLogin = () => {
  const { login, theme, toggleTheme } = useAuth();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleDriverLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in your credentials');
      return;
    }

    setSubmitting(true);
    try {
      if (isFirebaseEnabled) {
        const loggedInUser = await login(email, password);
        
        try {
          const userDoc = await getDoc(doc(db, 'users', loggedInUser.uid));
          if (!userDoc.exists() || userDoc.data().role !== 'driver') {
            toast.error("This login is for drivers only. Use the passenger app.");
            navigate('/login');
            setSubmitting(false);
            return;
          }
        } catch (fsError) {
          console.warn('Firestore read failed during driver login check:', fsError.message);
          if (!email.match(/^driver\d{1,2}@citybus\.gov\.in$/)) {
            toast.error("This login is for drivers only. Use the passenger app.");
            navigate('/login');
            setSubmitting(false);
            return;
          }
        }
      } else {
        await login(email, password);
      }
      navigate('/driver/dashboard');
    } catch (err) {
      toast.error(err.message || 'Driver authentication failed');
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

      {/* Device frame mock container */}
      <div className={`w-full max-w-[400px] border rounded-3xl p-6 shadow-2xl transition-colors duration-300 ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
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

        {/* Heading Header */}
        <div className="flex flex-col items-center text-center mt-6 mb-6">
          <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-full mb-3 shadow-inner">
            <Compass size={32} className="stroke-[2.5] animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Driver Portal</h1>
          <p className={`text-xs mt-1 transition ${isDark ? 'text-slate-400' : 'text-slate-555'}`}>Hyderabad Transit Dispatch Desk</p>
        </div>

        {/* Form */}
        <form onSubmit={handleDriverLogin} className="space-y-4 text-xs font-semibold">
          <div className="space-y-1.5">
            <label className={`uppercase tracking-wider text-[9px] font-bold transition ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>Government Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Mail size={16} />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. driver1@citybus.gov.in"
                className={`w-full border rounded-xl py-3 pl-11 pr-4 focus:border-emerald-500 focus:outline-none transition ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={`uppercase tracking-wider text-[9px] font-bold transition ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>Operator Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock size={16} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={`w-full border rounded-xl py-3 pl-11 pr-4 focus:border-emerald-500 focus:outline-none transition ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>
            <p className={`text-[9px] mt-1 transition ${isDark ? 'text-slate-500' : 'text-slate-450'}`}>Driver logins are created by the fleet administrator.</p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
          >
            {submitting ? <Spinner size="sm" color="secondary" /> : <span>Start Duty Login</span>}
          </button>
        </form>

        <div className={`text-center mt-6 pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <Link
            to="/login"
            className={`text-xs font-semibold transition ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            ← Back to Passenger App
          </Link>
        </div>

      </div>
    </div>
  );
};

export default DriverLogin;
