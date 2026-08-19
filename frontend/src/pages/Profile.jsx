import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { 
  User, 
  Save, 
  Shield, 
  Mail, 
  Phone, 
  ShieldCheck, 
  CheckCircle2,
  Lock,
  Loader2,
  Settings,
  Camera,
  X,
  Upload
} from 'lucide-react';
import { toast } from 'react-toastify';
import UserActivityTimeline from '../components/UserActivityTimeline';

export default function Profile() {
  const { updateUser } = React.useContext(AuthContext);
  const [profile, setProfile] = useState({ full_name: '', email: '', phone: '', role_name: '', profile_photo: null });
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);



  useEffect(() => {
    api.get('/users/profile').then(res => {
      setProfile(res.data);
    }).catch(console.error);


  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch('/users/profile', profile);
      toast.success('Profile updated successfully');
    } catch(err) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) return;
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('photo', photoFile);
    try {
      const res = await api.post('/users/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile({ ...profile, profile_photo: res.data.profile_photo });
      if (updateUser) updateUser({ profile_photo: res.data.profile_photo });
      setPhotoFile(null);
      toast.success('Profile photo updated successfully.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };



  const handlePhotoRemove = async () => {
    try {
      await api.delete('/users/profile/photo');
      setProfile({ ...profile, profile_photo: null });
      if (updateUser) updateUser({ profile_photo: null });
      setPhotoPreview(null);
      setPhotoFile(null);
      toast.success('Profile photo removed.');
    } catch (err) {
      toast.error('Failed to remove photo');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Profile</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage your account information and settings.</p>
        </div>
      </div>
      
      <form onSubmit={handleUpdate} className="inst-card p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        {/* Profile Header */}
        <div className="bg-slate-50 dark:bg-slate-950 p-8 md:p-12 border-b border-slate-200 dark:border-slate-800 relative">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-3xl shadow-md flex items-center justify-center text-registryBlue dark:text-blue-400 text-4xl font-bold border border-slate-200 dark:border-slate-800 overflow-hidden relative group">
              {(photoPreview || profile.profile_photo) ? (
                <img src={photoPreview || `http://localhost:5001${profile.profile_photo}`} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                profile.full_name ? profile.full_name[0].toUpperCase() : 'U'
              )}
              
              <label className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer text-white transition-opacity">
                <Camera size={24} />
                <input type="file" className="hidden" accept="image/jpeg, image/png, image/webp" onChange={handlePhotoSelect} />
              </label>
            </div>
            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white capitalize tracking-tight">{profile.full_name || 'User'}</h2>
              <div className="mt-3 flex flex-wrap justify-center md:justify-start gap-3">
                <span className="badge badge-blue px-4 py-1.5 flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                   <Shield size={14}/> {profile.role_name?.replace('_', ' ').toUpperCase()}
                </span>

              </div>
            </div>
            
            <div className="flex flex-col gap-2 mt-4 md:mt-0">
              {photoFile && (
                <button 
                  type="button" 
                  onClick={handlePhotoUpload} 
                  disabled={uploadingPhoto}
                  className="btn btn-primary px-4 py-2 text-sm font-bold flex items-center gap-2"
                >
                  {uploadingPhoto ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />} Save Photo
                </button>
              )}
              {(profile.profile_photo || photoFile) && (
                <button 
                  type="button" 
                  onClick={() => {
                    if (photoFile) { setPhotoFile(null); setPhotoPreview(null); }
                    else { handlePhotoRemove(); }
                  }} 
                  className="btn bg-white dark:bg-slate-900 text-red-600 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 text-sm font-bold flex items-center gap-2"
                >
                  <X size={14} /> {photoFile ? 'Cancel' : 'Remove Photo'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-8 md:p-12 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-2">
              <label className="inst-label text-sm font-semibold">Full Name</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  className="inst-input pl-12 py-3.5 font-semibold text-base capitalize" 
                  value={profile.full_name} 
                  onChange={e => setProfile({...profile, full_name: e.target.value})} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="inst-label text-sm font-semibold">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="email" 
                  className="inst-input pl-12 py-3.5 font-semibold text-base lowercase" 
                  value={profile.email} 
                  onChange={e => setProfile({...profile, email: e.target.value})} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="inst-label text-sm font-semibold">Phone Number</label>
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="tel" 
                  className="inst-input pl-12 py-3.5 font-semibold text-base" 
                  value={profile.phone || ''} 
                  onChange={e => setProfile({...profile, phone: e.target.value})} 
                  placeholder="+252 ..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="inst-label text-sm font-semibold">Account Role</label>
              <div className="inst-input bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 flex items-center justify-between cursor-not-allowed capitalize font-semibold py-3.5 text-base">
                {profile.role_name?.replace('_', ' ')}
                <Lock size={16} />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">
                Contact administrator to change your role.
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="inst-label text-sm font-semibold">National ID</label>
              <div className="inst-input bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 flex items-center justify-between cursor-not-allowed font-semibold py-3.5 text-base">
                {profile.national_id || 'Not Set'}
                <Lock size={16} />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">
                Verified by government registry.
              </p>
            </div>
          </div>

          <div className="pt-10 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-4 max-w-md">
               <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
                 <ShieldCheck size={20} className="text-registryBlue dark:text-blue-400" />
               </div>
               <p className="text-base text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                 Your personal information is stored securely in our registry.
               </p>
            </div>
            <button 
              type="submit" 
              disabled={loading} 
              className="btn btn-primary w-full md:w-64 py-4 text-base font-semibold shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                 <Loader2 className="animate-spin" size={18} />
              ) : (
                <><Save size={18} /> Save Changes</>
              )}
            </button>
          </div>
        </div>
      </form>

      <div className="inst-card p-8 md:p-12 border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 mt-8">
        <UserActivityTimeline />
      </div>

    </div>
  );
}
