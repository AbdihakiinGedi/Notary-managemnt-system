import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  Landmark, 
  MapPin, 
  FileUp, 
  ShieldCheck, 
  ChevronLeft, 
  ArrowRight,
  Info,
  Car,
  Bike,
  Briefcase,
  Globe,
  Layers,
  UploadCloud,
  FileText
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function AddProperty() {
  const [formData, setFormData] = useState({ title: '', description: '', district: '', address: '', type: 'land', latitude: '', longitude: '', visibility: 'public' });
  const [metadata, setMetadata] = useState({});
  const [files, setFiles] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    if (Object.keys(metadata).length > 0) {
      data.append('metadata', JSON.stringify(metadata));
    }
    files.forEach(file => data.append('documents', file));
    images.forEach(img => data.append('image', img));

    try {
      const res = await api.post('/properties', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.error) {
        toast.error(res.data.error);
        return;
      }
      toast.success('Success: Registry request submitted for review.');
      navigate('/properties');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed. Please check your documents.');
    } finally {
      setLoading(false);
    }
  };

  const renderDynamicFields = () => {
    const inputClass = "inst-input";
    const labelClass = "registry-label mb-1.5";

    switch (formData.type) {
      case 'car':
      case 'motorcycle':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="md:col-span-2 flex items-center gap-2 mb-2">
               <Car size={18} className="text-registryBlue dark:text-blue-400" />
               <p className="text-base font-bold text-slate-900 dark:text-white">Vehicle Specifications</p>
            </div>
            {formData.type === 'car' ? (
              <div className="space-y-1">
                <label className={labelClass}>VIN Number</label>
                <input required className={inputClass}
                  value={metadata.vin || ''}
                  onChange={e => setMetadata({...metadata, vin: e.target.value})} placeholder="ENTER VIN..." />
              </div>
            ) : (
              <div className="space-y-1">
                <label className={labelClass}>Engine Block Number</label>
                <input required className={inputClass}
                  value={metadata.engine_number || ''}
                  onChange={e => setMetadata({...metadata, engine_number: e.target.value})} placeholder="ENTER ENGINE ID..." />
              </div>
            )}
            <div className="space-y-1">
              <label className={labelClass}>Plate Identification</label>
              <input required className={inputClass}
                value={metadata.plate_number || ''}
                onChange={e => setMetadata({...metadata, plate_number: e.target.value})} placeholder="ENTER PLATE..." />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Manufacturer / Model</label>
              <div className="flex gap-2">
                <input required className={inputClass}
                  value={metadata.manufacturer || ''}
                  onChange={e => setMetadata({...metadata, manufacturer: e.target.value})} placeholder="MAKER" />
                <input required className={inputClass}
                  value={metadata.model || ''}
                  onChange={e => setMetadata({...metadata, model: e.target.value})} placeholder="MODEL" />
              </div>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Manufacturing Year</label>
              <input required type="number" className={inputClass}
                value={metadata.year || ''}
                onChange={e => setMetadata({...metadata, year: e.target.value})} placeholder="YYYY" />
            </div>
          </div>
        );
      case 'business_share':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="md:col-span-2 flex items-center gap-2 mb-2">
               <Briefcase size={18} className="text-registryBlue dark:text-blue-400" />
               <p className="text-base font-bold text-slate-900 dark:text-white">Business Details</p>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Legal Entity Name</label>
              <input required className={inputClass}
                value={metadata.company_name || ''}
                onChange={e => setMetadata({...metadata, company_name: e.target.value})} placeholder="ENTER COMPANY..." />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Corporate Reg Number</label>
              <input required className={inputClass}
                value={metadata.registration_number || ''}
                onChange={e => setMetadata({...metadata, registration_number: e.target.value})} placeholder="REG-ID..." />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Ownership Interest (%)</label>
              <input required type="number" step="any" min="0" max="100" className={inputClass}
                value={metadata.ownership_percentage || ''}
                onChange={e => setMetadata({...metadata, ownership_percentage: e.target.value})} placeholder="0.00" />
            </div>
          </div>
        );
      case 'digital_asset':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="md:col-span-2 flex items-center gap-2 mb-2">
               <Globe size={18} className="text-registryBlue dark:text-blue-400" />
               <p className="text-base font-bold text-slate-900 dark:text-white">Digital Asset Details</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className={labelClass}>Wallet / Contract Address</label>
              <input required className={inputClass}
                value={metadata.wallet_address || ''}
                onChange={e => setMetadata({...metadata, wallet_address: e.target.value})} placeholder="0x..." />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Blockchain Protocol</label>
              <input required className={inputClass}
                value={metadata.blockchain_network || ''}
                onChange={e => setMetadata({...metadata, blockchain_network: e.target.value})} placeholder="e.g. ETHEREUM" />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Asset Symbol</label>
              <input required className={inputClass}
                value={metadata.asset_symbol || ''}
                onChange={e => setMetadata({...metadata, asset_symbol: e.target.value})} placeholder="TICKER" />
            </div>
          </div>
        );
      case 'land':
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="md:col-span-2 flex items-center gap-2 mb-2">
               <Landmark size={18} className="text-registryBlue dark:text-blue-400" />
               <p className="text-base font-bold text-slate-900 dark:text-white">Land Registry Details</p>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Title Number</label>
              <input required className={inputClass}
                value={metadata.title_number || ''}
                onChange={e => setMetadata({...metadata, title_number: e.target.value})} placeholder="ENTER DEED REF..." />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Plot Area (SQM)</label>
              <input required type="number" className={inputClass}
                value={metadata.plot_size || ''}
                onChange={e => setMetadata({...metadata, plot_size: e.target.value})} placeholder="0.00" />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className={labelClass}>GPS Coordinates (Lat, Long)</label>
              <div className="flex gap-4">
                <input required placeholder="LATITUDE" type="number" step="any" className={inputClass}
                  value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} />
                <input required placeholder="LONGITUDE" type="number" step="any" className={inputClass}
                  value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-20">
      <div className="mb-10 flex items-center justify-between px-4">
         <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors font-semibold text-base">
            <ChevronLeft size={18} /> Back
         </button>

      </div>

      <div className="inst-card p-0 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-10 py-10">
          <div className="flex items-center gap-5 mb-4">
             <div className="p-3 bg-registryBlue text-white rounded-xl shadow-sm">
                <Landmark size={28} />
             </div>
             <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Register Asset</h2>
                <p className="text-slate-500 dark:text-slate-400 text-base font-medium mt-1">Please provide asset details below.</p>
             </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-1">
              <label className="inst-label mb-1.5">Asset Title</label>
              <input 
                required placeholder="e.g. Garden Estate Block 4..."
                className="inst-input font-medium"
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="inst-label mb-1.5">Asset Category</label>
              <select 
                className="inst-input font-medium bg-white dark:bg-slate-900 cursor-pointer"
                value={formData.type} onChange={e => {
                  setFormData({...formData, type: e.target.value});
                  setMetadata({});
                }}
              >
                <option value="land">LAND / REAL ESTATE</option>
                <option value="car">MOTOR VEHICLE (CAR)</option>
                <option value="motorcycle">MOTORCYCLE</option>
                <option value="business_share">BUSINESS SHARE</option>
                <option value="digital_asset">DIGITAL ASSET</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="inst-label mb-1.5 flex items-center gap-2">Visibility <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-1">(Public Search)</span></label>
              <select 
                className="inst-input font-medium bg-white dark:bg-slate-900 cursor-pointer"
                value={formData.visibility} onChange={e => setFormData({...formData, visibility: e.target.value})}
              >
                <option value="public">PUBLIC (Visible to all)</option>
                <option value="private">PRIVATE (Visible only to you and officials)</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="inst-label mb-1.5">Address</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" />
                <input 
                  required placeholder="Enter full physical address..."
                  className="inst-input pl-12"
                  value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              {renderDynamicFields()}
            </div>

            <div className="space-y-1">
              <label className="inst-label mb-1.5">District</label>
              <input 
                required placeholder="Enter district..."
                className="inst-input font-medium"
                value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})}
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="inst-label mb-1.5">Description</label>
              <textarea 
                required rows="4" placeholder="Provide a detailed description of the asset..."
                className="inst-input resize-none py-4 font-medium"
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="inst-label mb-1.5">Photo</label>
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-200 dark:border-slate-800 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-950 hover:bg-white dark:hover:bg-slate-800 transition-all relative overflow-hidden group">
                  {images.length > 0 ? (
                    <div className="absolute inset-0 grid grid-cols-2 gap-1 p-1 opacity-40 group-hover:opacity-60 transition-opacity">
                       {images.slice(0, 4).map((img, idx) => (
                         <img key={idx} src={URL.createObjectURL(img)} alt="Preview" className="object-cover w-full h-full rounded" />
                       ))}
                    </div>
                  ) : null}
                  <div className="flex flex-col items-center justify-center relative z-10 text-center px-4">
                    <UploadCloud size={32} className="text-registryBlue dark:text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                      {images.length > 0 ? `${images.length} Photos Selected` : 'Upload Photos'}
                    </p>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">PNG, JPG UP TO 10MB</p>
                  </div>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={e => setImages(Array.from(e.target.files))} />
                </label>
              </div>

              <div className="space-y-2">
                <label className="inst-label mb-1.5">Documents (PDF)</label>
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-200 dark:border-slate-800 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-950 hover:bg-white dark:hover:bg-slate-800 transition-all group">
                  <div className="flex flex-col items-center justify-center text-center px-4">
                    <FileText size={32} className="text-registryBlue dark:text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                      {files.length > 0 ? `${files.length} Files Selected` : 'Attach Documents'}
                    </p>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">PDF, DOC, XLS, TXT SUPPORTED</p>
                  </div>
                  <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt" className="hidden" onChange={e => setFiles(Array.from(e.target.files))} />
                </label>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex gap-4 items-start shadow-sm">
            <div className="p-2 bg-white dark:bg-slate-900 rounded shadow-sm border border-slate-200 dark:border-slate-800"><Info size={18} className="text-registryBlue dark:text-blue-400" /></div>
            <div className="text-base text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              <span className="text-slate-900 dark:text-white font-bold">Important:</span> All registration applications are subject to verification. Providing false information may lead to legal action.
            </div>
          </div>

          <div className="flex gap-6 pt-4">
              <button 
                type="button" onClick={() => navigate(-1)}
                className="flex-1 px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-semibold text-base hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit" disabled={loading}
                className="flex-[2] btn btn-primary py-4 text-base font-semibold shadow-md flex items-center justify-center gap-3"
              >
                {loading ? (
                   <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <><ShieldCheck size={20}/> Submit Registration</>
                )}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
}
