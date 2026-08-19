import React, { useRef, useState, useEffect, useContext } from 'react';
import { X, ShieldAlert, Check } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';

export default function DigitalSignatureModal({ isOpen, onClose, onConfirm, roleLabel }) {
  const { user } = useContext(AuthContext);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  // Setup drawing context
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#1E3A8A'; // Elegant Deep Blue ink
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      clearCanvas();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setError('');
  };

  const checkCanvasEmpty = () => {
    if (!canvasRef.current) return true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const buffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
    return !buffer.some(color => color !== 0xFFFFFFFF); // check if there is any pixel different from white
  };

  const handleConfirmSubmit = () => {
    if (!confirmed) {
      setError('Please check the confirmation box below to proceed.');
      return;
    }

    if (checkCanvasEmpty()) {
      setError('Please draw your official signature on the canvas first.');
      return;
    }

    // Save as image
    const signatureImage = canvasRef.current.toDataURL('image/png');
    onConfirm(signatureImage);
    clearCanvas();
    setConfirmed(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        
        {/* Header Section */}
        <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-registryBlue uppercase tracking-widest">Confirm Digital Signature</h3>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">SNDNPRS Official Legal Workflow</p>
          </div>
          <button onClick={() => { clearCanvas(); onClose(); }} className="text-slate-400 hover:text-slate-600 dark:text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Form and Sign Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3.5 bg-red-50 text-red-700 text-sm font-bold uppercase tracking-wider rounded-lg border border-red-100">
              <ShieldAlert size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* User Information */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <label className="block text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Full Name</label>
              <p className="text-base font-bold text-slate-900 dark:text-white capitalize">{user?.full_name || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Email</label>
              <p className="text-base font-bold text-slate-900 dark:text-white">{user?.email || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">National ID / Reference</label>
              <p className="text-base font-bold text-slate-900 dark:text-white uppercase">{user?.national_id || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Signature Date</label>
              <p className="text-base font-bold text-slate-900 dark:text-white">{new Date().toLocaleString()}</p>
            </div>
            {user?.role && (
              <div className="col-span-2 pt-3 border-t border-slate-200 dark:border-slate-800 mt-1">
                <label className="block text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Registry Role</label>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                  {user.role} {roleLabel ? `- ${roleLabel}` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Canvas Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-semibold text-slate-500 dark:text-slate-400">Draw Official Signature</label>
              <button 
                type="button" 
                onClick={clearCanvas} 
                className="text-sm font-bold text-registryBlue dark:text-blue-400 dark:hover:text-blue-300"
              >
                Clear Ink
              </button>
            </div>
            
            <div className="border border-slate-300 rounded-lg overflow-hidden shadow-sm">
              <canvas
                ref={canvasRef}
                width={460}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-40 bg-white dark:bg-slate-900 cursor-crosshair touch-none"
              />
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={confirmed} 
              onChange={(e) => setConfirmed(e.target.checked)} 
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-registryBlue focus:ring-registryBlue" 
            />
            <span className="text-base font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
              I solemnly confirm that this digital signature is legally mine and is voluntarily applied to execute this official property transfer agreement.
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={() => { clearCanvas(); onClose(); }} 
            className="btn btn-secondary px-6 py-2.5 text-base font-semibold shadow-sm"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleConfirmSubmit} 
            className="btn btn-primary px-8 py-2.5 text-base font-semibold shadow-md flex items-center gap-2"
          >
            <Check size={16} className="inline-block mb-0.5" /> Confirm Signature
          </button>
        </div>

      </div>
    </div>
  );
}
