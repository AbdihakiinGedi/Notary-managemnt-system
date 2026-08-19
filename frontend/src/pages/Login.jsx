import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Landmark, Loader2, Mail, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const expirationMessage = queryParams.get('message');
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(formData.email, formData.password);
      toast.success('Login successful');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-4">
           <div className="inline-flex items-center justify-center w-20 h-20 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-[#DCE6F2] dark:border-[#334155] mb-4">
              <Landmark size={40} className="text-blue-600" />
           </div>
           <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Sign In</h1>
           <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Somali National Digital Registry</p>
        </div>

        <div className="inst-card p-10 border-[#DCE6F2] dark:border-[#334155] shadow-2xl bg-white dark:bg-slate-900">
          {expirationMessage && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
              <p className="text-base font-semibold text-red-800 dark:text-red-300">{expirationMessage}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="inst-label">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email" required className="inst-input pl-12 py-4"
                  placeholder="name@example.com"
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="inst-label">Password</label>
              </div>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password" required className="inst-input pl-12 py-4"
                  placeholder="••••••••"
                  value={formData.password} 
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="btn btn-primary w-full py-4 text-[11px] font-bold uppercase tracking-[0.2em] shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? (
                 <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-10 pt-10 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              No account? <button onClick={() => navigate('/register')} className="text-blue-600 dark:text-blue-400 hover:underline">Create Account</button>
            </p>
          </div>
        </div>

        <div className="text-center">
           <div className="inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-900/50 rounded-full border border-slate-200 dark:border-slate-800">
              <ShieldCheck size={12} className="text-blue-600" />
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Secure Portal</span>
           </div>
        </div>
      </div>
    </div>
  );
}
