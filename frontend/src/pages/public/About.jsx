import React from 'react';
import PublicNavbar from '../../components/PublicNavbar';
import { ShieldCheck, Users, Landmark, FileSignature, FileText, CheckCircle } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
      <PublicNavbar />
      <div className="flex-1 max-w-5xl mx-auto w-full p-8 md:p-12 mt-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase mb-4 tracking-tight">About SNDNPRS</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            The Somali National Digital Notary & Property Registry System (SNDNPRS) is the premier institutional framework 
            designed to digitize, secure, and streamline real estate and ownership records across the nation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-2xl font-bold text-registryBlue dark:text-blue-400 mb-6 flex items-center gap-3">
              <Landmark size={28} /> Our Mission
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
              By leveraging state-of-the-art cryptographic ledgers and multi-tier verification workflows, 
              the registry eradicates fraudulent claims, ensures transparent transfers, and secures the future of property ownership.
              Every digital certificate is mathematically sealed to prevent tampering, providing absolute assurance to buyers, sellers, and the state.
            </p>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              We provide a unified infrastructure for property registration, ownership transfers, and public verifiability. 
              Our vision is to build a trustless, transparent, and robust economic foundation for Somalia.
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">System Roles</h3>
            <ul className="space-y-6">
              <li className="flex items-start gap-4">
                <div className="p-2 bg-blue-50 dark:bg-slate-800 rounded-lg text-registryBlue dark:text-blue-400"><Users size={20} /></div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Citizens</h4>
                  <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Initiate property registrations, request ownership transfers, and manage personal asset portfolios securely.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="p-2 bg-blue-50 dark:bg-slate-800 rounded-lg text-registryBlue dark:text-blue-400"><FileSignature size={20} /></div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Notaries</h4>
                  <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Legally verify citizen identities, review contracts, and digitally sign transfer agreements as impartial witnesses.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="p-2 bg-blue-50 dark:bg-slate-800 rounded-lg text-registryBlue dark:text-blue-400"><ShieldCheck size={20} /></div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Registry Officers</h4>
                  <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Provide final government approval, enforce regulatory compliance, and permanently commit records to the national ledger.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-registryBlue text-white rounded-2xl p-10 shadow-lg">
          <h2 className="text-2xl font-bold mb-8 text-center">Core Mechanisms</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white dark:bg-slate-900/10 rounded-full mb-4">
                <FileText size={32} />
              </div>
              <h4 className="font-bold text-lg mb-2">Digital Certificates</h4>
              <p className="text-base text-blue-100 leading-relaxed">
                Official documents generated instantly upon approval, featuring unique QR codes, verification hashes, and cryptographic signatures that prove authenticity.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white dark:bg-slate-900/10 rounded-full mb-4">
                <FileSignature size={32} />
              </div>
              <h4 className="font-bold text-lg mb-2">Digital Signatures</h4>
              <p className="text-base text-blue-100 leading-relaxed">
                Legally binding cryptographic signatures applied by Notaries and Officers. These signatures cannot be forged and permanently lock the document state.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white dark:bg-slate-900/10 rounded-full mb-4">
                <CheckCircle size={32} />
              </div>
              <h4 className="font-bold text-lg mb-2">Public Verification</h4>
              <p className="text-base text-blue-100 leading-relaxed">
                An open portal allowing anyone to instantly verify a certificate's integrity using its unique Verification Code, ensuring market confidence and trust.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
