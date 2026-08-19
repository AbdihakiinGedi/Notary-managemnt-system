import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, ShieldCheck } from 'lucide-react';

export default function QRGenerator({ value, title, subtitle }) {
  const downloadQR = () => {
    const svg = document.getElementById("sovereign-qr");
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR-${title.replace(/\s+/g, '-')}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-10 rounded-[32px] border border-[#DEE2E6] dark:border-slate-800 flex flex-col items-center shadow-2xl animate-in zoom-in-95 duration-500">
      <div className="mb-8 text-center">
         <h3 className="text-2xl font-black text-[#1A1A1A] dark:text-white uppercase tracking-tighter">{title}</h3>
         <p className="text-sm font-bold text-[#6C757D] dark:text-slate-400 uppercase tracking-widest mt-1">{subtitle}</p>
      </div>

      <div className="p-6 bg-[#F8F9FA] rounded-[24px] border-2 border-[#DEE2E6] dark:border-slate-800 relative group">
         <QRCodeSVG 
            id="sovereign-qr"
            value={value} 
            size={200}
            level="H"
            includeMargin={true}
            className="rounded-lg transition-transform group-hover:scale-105 duration-500"
         />
         <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-white dark:bg-slate-900/80 backdrop-blur-sm rounded-[22px]">
            <span className="text-sm font-black uppercase text-[#0056D2] dark:text-blue-400 tracking-widest flex items-center gap-2">
              <ShieldCheck size={14}/> Secure Proof
            </span>
         </div>
      </div>

      <div className="mt-10 flex gap-4 w-full">
         <button onClick={downloadQR} className="flex-1 bg-[#1A1A1A] text-white py-4 rounded-[16px] font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 hover:bg-[#0056D2] dark:bg-slate-800 dark:hover:bg-blue-600 transition-all shadow-xl">
            <Download size={16}/> Export PNG
         </button>
         <button onClick={() => window.print()} className="flex-1 bg-white dark:bg-slate-900 border-2 border-[#1A1A1A] text-[#1A1A1A] dark:text-white py-4 rounded-[16px] font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 hover:bg-[#F8F9FA] transition-all">
            <Printer size={16}/> Print Card
         </button>
      </div>

      <div className="mt-8 pt-6 border-t border-[#F1F1F1] w-full text-center">
         <p className="text-[10px] italic text-[#6C757D] dark:text-slate-400 uppercase font-bold tracking-widest">
           Sovereign Verification ID: {value.split('/').pop()}
         </p>
      </div>
    </div>
  );
}
