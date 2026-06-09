import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db, isFirebaseEnabled } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Compass, Mail, Lock, ArrowLeft, ShieldAlert } from 'lucide-react';
import { Spinner } from '../../components/shared/Loader';
import toast from 'react-hot-toast';

export const DriverLogin = () => {
  const { login } = useAuth();
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Device frame mock container */}
      <div className="w-full max-w-[400px] bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white flex flex-col relative">
        
        {/* Back Link */}
        <Link 
          to="/login"
          className="absolute top-5 left-5 text-slate-400 hover:text-white flex items-center gap-1 text-xs font-semibold"
        >
          <ArrowLeft size={14} /> Back
        </Link>

        {/* Heading Header */}
        <div className="flex flex-col items-center text-center mt-6 mb-6">
          <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-full mb-3 shadow-inner">
            <Compass size={32} className="stroke-[2.5] animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Driver Portal</h1>
          <p className="text-xs text-slate-400 mt-1">Hyderabad Transit Dispatch Desk</p>
        </div>

        {/* Form */}
        <form onSubmit={handleDriverLogin} className="space-y-4 text-xs font-semibold">
          <div className="space-y-1.5">
            <label className="text-slate-400 uppercase tracking-wider text-[9px] font-bold">Government Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Mail size={16} />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. driver1@citybus.gov.in"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-4 focus:border-emerald-500 focus:outline-none transition text-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-400 uppercase tracking-wider text-[9px] font-bold">Operator Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock size={16} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-4 focus:border-emerald-500 focus:outline-none transition text-white"
              />
            </div>
            <p className="text-[9px] text-slate-500 mt-1">Driver logins are created by the fleet administrator.</p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
          >
            {submitting ? <Spinner size="sm" color="secondary" /> : <span>Start Duty Login</span>}
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-slate-800">
          <Link
            to="/login"
            className="text-xs text-slate-400 hover:text-white transition font-semibold"
          >
            ← Back to Passenger App
          </Link>
        </div>

      </div>
    </div>
  );
};

export default DriverLogin;
