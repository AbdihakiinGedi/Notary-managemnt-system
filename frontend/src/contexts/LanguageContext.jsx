import React, { createContext, useState, useEffect } from 'react';

export const LanguageContext = createContext();

const translations = {
  en: {
    dashboard: 'Dashboard',
    properties: 'Properties',
    transfers: 'Transfers',
    certificates: 'Certificates',
    reports: 'Reports',
    notifications: 'Notifications',
    profile: 'Profile',
    verifications: 'Verifications',
    approvals: 'Approvals',
    registry: 'Registry',
    audit_logs: 'Audit Logs',
    users: 'Users',
    settings: 'Settings',
    all_properties: 'All Properties',
    property_control: 'Property Control',
    transfers_review: 'Transfers Review',
    light_mode: 'Light',
    dark_mode: 'Dark',
    search: 'Search...',
    login: 'Login',
    logout: 'Logout',
    session_expired: 'Session expired. Please login again.',
    active: 'Active',
    locked: 'Locked',
    total_users: 'Total Users',
    total_properties: 'Total Properties',
    total_certificates: 'Total Certificates',
    total_transfers: 'Total Transfers',
    submit: 'Submit',
    cancel: 'Cancel',
    search_placeholder: 'Search...',
    no_record_found: 'No record found'
  },
  so: {
    dashboard: 'Eegida Guud',
    properties: 'Hantida',
    transfers: 'Wareejinta',
    certificates: 'Shahaadooyinka',
    reports: 'Warbixinnada',
    notifications: 'Ogeysiisyada',
    profile: 'Macluumaadka',
    verifications: 'Xaqiijinta',
    approvals: 'Ansixinta',
    registry: 'Diiwaanka',
    audit_logs: 'Diiwaanka Hubinta',
    users: 'Isticmaalayaasha',
    settings: 'Settings',
    all_properties: 'Dhammaan Hantida',
    property_control: 'Maamulka Hantida',
    transfers_review: 'Dib-u-eegista Wareejinta',
    light_mode: 'Iftiin',
    dark_mode: 'Gudcur',
    search: 'Raadi...',
    login: 'Gal',
    logout: 'Ka Bixida',
    session_expired: 'Fadhigaagu wuu dhacay. Fadlan markale gal.',
    active: 'Firfircoon',
    locked: 'Xiran',
    total_users: 'Tirada Isticmaalayaasha',
    total_properties: 'Tirada Hantida',
    total_certificates: 'Tirada Shahaadooyinka',
    total_transfers: 'Tirada Wareejinta',
    submit: 'Gudbi',
    cancel: 'Jooji',
    search_placeholder: 'Raadi...',
    no_record_found: 'Lama helin'
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key) => {
    return translations[language][key] || key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'so' : 'en'));
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
