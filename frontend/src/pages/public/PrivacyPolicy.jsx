import React from 'react';
import PublicNavbar from '../../components/PublicNavbar';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
      <PublicNavbar />
      <div className="flex-1 max-w-4xl mx-auto w-full p-8 md:p-12 mt-8">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase mb-6 border-b-4 border-registryGold pb-4 inline-block">Privacy Policy</h1>
        <div className="prose prose-lg dark:prose-invert">
          <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
            The Somali National Digital Notary & Property Registry (SNDNPRS) is committed to protecting your privacy. This Privacy Policy details the information we collect, how it is used, and the cryptographic security measures we employ.
          </p>
          <h3 className="text-2xl font-bold text-registryBlue dark:text-blue-400 mb-4">1. Data Collection</h3>
          <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
            We collect personal identification data, property records, and digital signature metadata to facilitate secure transactions on the national ledger.
          </p>
          <h3 className="text-2xl font-bold text-registryBlue dark:text-blue-400 mb-4">2. How Data is Used</h3>
          <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
            Your data is strictly used to authenticate ownership, process property transfers, and maintain a historical audit trail of transactions within the SNDNPRS infrastructure.
          </p>
          <h3 className="text-2xl font-bold text-registryBlue dark:text-blue-400 mb-4">3. Certificate Verification</h3>
          <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
            Public verification of certificates exposes limited non-sensitive data (e.g., status, public hashes) to ensure transparency without compromising personal privacy. Private properties are entirely concealed.
          </p>
          <h3 className="text-2xl font-bold text-registryBlue dark:text-blue-400 mb-4">4. Data Protection & Security Measures</h3>
          <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
            All data is secured using SHA-256 cryptographic hashing, zero-trust architecture, and strict Role-Based Access Control (RBAC). Data integrity is maintained via immutable event ledgers.
          </p>
          <h3 className="text-2xl font-bold text-registryBlue dark:text-blue-400 mb-4">5. User Responsibilities</h3>
          <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
            Users are responsible for safeguarding their login credentials and digital signatures. The registry is not liable for actions taken under compromised but legally authenticated accounts.
          </p>
        </div>
      </div>
    </div>
  );
}
