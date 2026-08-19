import React, { useState } from 'react';
import PublicNavbar from '../../components/PublicNavbar';
import { toast } from 'react-toastify';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      toast.success('Your message has been sent successfully.');
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
      <PublicNavbar />
      <div className="flex-1 max-w-6xl mx-auto w-full p-8 md:p-12 mt-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase mb-4 tracking-tight">Contact Support</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">Reach out to the Somali National Digital Notary & Property Registry System.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-registryBlue dark:text-blue-400 mb-4"><MapPin size={28} /></div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Headquarters</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Mogadishu, Somalia</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-registryBlue dark:text-blue-400 mb-4"><Mail size={28} /></div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Email Us</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">support@sndnprs.gov.so</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-registryBlue dark:text-blue-400 mb-4"><Phone size={28} /></div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Call Us</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">+252 61 000 0000</p>
            </div>
          </div>

          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Send us a Message</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-base font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Full Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-registryBlue dark:text-white outline-none" placeholder="Ali Mohamed" />
                </div>
                <div>
                  <label className="block text-base font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Email Address</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-registryBlue dark:text-white outline-none" placeholder="ali@example.com" />
                </div>
              </div>
              <div>
                <label className="block text-base font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Subject</label>
                <input required type="text" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-registryBlue dark:text-white outline-none" placeholder="Inquiry about Registration" />
              </div>
              <div>
                <label className="block text-base font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Your Message</label>
                <textarea required rows="6" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-registryBlue dark:text-white outline-none" placeholder="How can we help you?"></textarea>
              </div>
              <button disabled={loading} type="submit" className="w-full bg-registryBlue hover:bg-blue-800 text-white font-bold uppercase tracking-widest py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2">
                {loading ? 'Sending...' : <><Send size={18} /> Send Message</>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
