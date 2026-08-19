import React from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldCheck, Cpu, Lock, HelpCircle, FileText, Share2, Activity } from 'lucide-react';

const CONFIG = {
  shared:     { title: 'Shared Ownerships',   icon: Share2,      desc: 'Co-managed assets and joint property titles registered in the national ledger.' },
  agreements: { title: 'Signed Agreements',   icon: FileText,    desc: 'Legally binding digital contracts and notarized deeds under sovereign authority.' },
  help:       { title: 'Help Center',         icon: HelpCircle,  desc: 'National Registry support, procedural guidance, and escalation protocols.' },
  security:   { title: 'Security Settings',   icon: Lock,        desc: 'Biometric identity locks, MFA configuration, and sovereign access control.' },
};

export default function CitizenFeatureView() {
  const location = useLocation();
  const path = location.pathname.split('/')[1];
  const feature = CONFIG[path] || { title: 'Registry Module', icon: Cpu, desc: 'Connecting to sovereign infrastructure node...' };

  return (
    <div className="flex flex-col items-center justify-center py-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Icon */}
      <div className="w-28 h-28 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[32px] flex items-center justify-center mb-8 shadow-sm relative group overflow-hidden">
        <div className="absolute inset-0 bg-[#1E3A5F] opacity-0 group-hover:opacity-5 transition-opacity" />
        <feature.icon className="text-[#1E3A5F] relative z-10" size={52} />
      </div>

      {/* Title */}
      <div className="text-center mb-12">
        <div className="w-12 h-1.5 bg-[#0F172A] rounded-full mx-auto mb-6" />
        <h1 className="text-4xl font-black text-[#0F172A] tracking-tight uppercase">{feature.title}</h1>
        <p className="text-sm font-black text-[#64748B] uppercase tracking-[0.3em] mt-3">{feature.desc}</p>
      </div>

      {/* Status Card */}
      <div className="inst-card border-dashed border-2 p-14 max-w-lg w-full text-center bg-[#F8FAFC]/50">
        <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center justify-center mx-auto mb-6">
          <ShieldCheck size={32} className="text-[#CBD5E1]" />
        </div>
        <p className="text-[11px] font-black text-[#0F172A] uppercase tracking-[0.2em] mb-3">Forensic Sync Required</p>
        <p className="text-sm text-[#64748B] font-bold leading-relaxed max-w-sm mx-auto">
          This module is being synchronized with the national ledger. Ensure your session identity is active and wait for the next registry heartbeat to complete initialization.
        </p>

        <div className="mt-10 pt-8 border-t border-[#F1F5F9]">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Activity size={14} className="text-[#1E3A5F] animate-pulse" />
            <span className="text-sm font-black text-[#1E3A5F] uppercase tracking-widest">Awaiting Heartbeat</span>
          </div>
          <div className="flex justify-center gap-2">
            <span className="w-2 h-2 bg-[#1E3A5F] rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-[#1E3A5F] rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-[#1E3A5F] rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-[9px] font-black text-[#94A3B8] uppercase tracking-[0.2em] mt-10 text-center max-w-sm leading-relaxed">
        Access to this module is governed by National Trust Protocol 7-D. Activation pending security clearance verification.
      </p>
    </div>
  );
}
