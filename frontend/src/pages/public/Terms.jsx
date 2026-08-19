import React from 'react';
import PublicNavbar from '../../components/PublicNavbar';

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
      <PublicNavbar />
      <div className="flex-1 max-w-4xl mx-auto w-full p-8 md:p-12 mt-8">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase mb-6 border-b-4 border-registryGold pb-4 inline-block">Terms & Conditions</h1>
        <div className="prose prose-lg dark:prose-invert">
          <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
            By using the SNDNPRS system, you agree to be bound by the laws of the Somali Federal Government regarding digital property registration.
          </p>
          <h3 className="text-2xl font-bold text-registryBlue dark:text-blue-400 mb-4">1. Use of Registry Services</h3>
          <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
            The SNDNPRS acts as the official public ledger and facilitator of property transactions. All transactions must be verified by licensed Notaries and Government Officers.
          </p>
          <h3 className="text-2xl font-bold text-registryBlue dark:text-blue-400 mb-4">2. Ownership Responsibilities</h3>
          <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
            Citizens are responsible for maintaining the accuracy of their registered assets and promptly responding to transfer requests.
          </p>
          <h3 className="text-2xl font-bold text-registryBlue dark:text-blue-400 mb-4">3. Verification Usage</h3>
          <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
            Public verification tools are provided for institutional trust. Automated scraping or misuse of the verification endpoint is strictly prohibited.
          </p>
          <h3 className="text-2xl font-bold text-registryBlue dark:text-blue-400 mb-4">4. Digital Signatures</h3>
          <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
            Your cryptographic digital signature holds the exact same legal weight as a physical signature on paper documents. You are legally bound by any contract you sign via the portal.
          </p>
          <h3 className="text-2xl font-bold text-registryBlue dark:text-blue-400 mb-4">5. Registry Limitations & Legal Compliance</h3>
          <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
            The registry guarantees cryptographic integrity but relies on physical officers to verify real-world disputes. Fraudulent submissions are subject to severe legal penalties under Somali federal law.
          </p>
        </div>
      </div>
    </div>
  );
}
