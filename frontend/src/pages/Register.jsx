import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Landmark, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    verification_type: 'national_id',
    verification_number: ''
  });
  const [file, setFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) {
      return toast.error("Passwords do not match");
    }
    if (!file) {
      return toast.error("Please upload an ID document");
    }
    
    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      data.append('verification_document', file);

      await api.post('/auth/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Account created successfully');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-200 p-6">
      <div className="w-full max-w-[520px] animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Top Logo */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="p-4 bg-blue-600 rounded-2xl text-white mb-6 shadow-xl border border-blue-500">
            <Landmark size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Create Account</h1>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-[0.3em]">Somali National Digital Registry</p>
        </div>

        {/* Center Card */}
        <div className="inst-card bg-white dark:bg-slate-900 border border-[#DCE6F2] dark:border-[#334155] rounded shadow-2xl p-10 md:p-12">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="inst-label">Full Name</label>
              <input
                type="text"
                required
                placeholder="Enter your full name"
                className="inst-input py-3.5 font-bold uppercase text-[11px]"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="inst-label">Email Address</label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                className="inst-input py-3.5 font-bold uppercase text-[11px]"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2 col-span-2">
                <label className="inst-label">National ID <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1234567890"
                  className="inst-input py-3.5 font-bold uppercase text-[11px]"
                  value={formData.verification_number}
                  onChange={(e) => setFormData({ ...formData, verification_number: e.target.value, verification_type: 'national_id' })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="inst-label">Upload ID Document (JPG, PNG, PDF)</label>
              <input
                type="file"
                required
                accept=".jpg,.jpeg,.png,.pdf"
                className="inst-input py-2 font-bold text-[11px]"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="inst-label">Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="+252 ..."
                  className="inst-input py-3.5 font-bold uppercase text-[11px]"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="inst-label">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="inst-input py-3.5 font-bold text-[11px]"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="inst-label">Confirm Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="inst-input py-3.5 font-bold text-[11px]"
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-4 text-sm font-bold uppercase tracking-[0.2em] shadow-xl disabled:opacity-50 mt-4 flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Create Account"}
            </button>
          </form>

          {/* Bottom */}
          <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
              Already have an account? <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Sign In</Link>
            </p>
          </div>
        </div>

        <div className="mt-12 text-center space-y-4">
           <p className="text-[9px] font-bold text-slate-400 dark:text-slate-600 dark:text-slate-400 uppercase tracking-[0.2em] leading-relaxed max-w-sm mx-auto">
             Please ensure all information provided is accurate. This account will be used to manage your property records.
           </p>
        </div>
      </div>
    </div>
  );
}
