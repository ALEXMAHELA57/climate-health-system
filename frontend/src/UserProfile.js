import React, { useState, useEffect } from 'react';

const API = 'https://climate-health-system-backend.onrender.com';

const TRANSLATIONS = {
  en: {
    profile: 'My Profile',
    district: 'My Region',
    language: 'Language',
    notifications: 'Notifications',
    alertTypes: 'Alert Types',
    saveSettings: 'Save Settings',
    saved: 'Settings saved!',
    symptomHistory: 'My Symptom History',
    noHistory: 'No symptom checks yet.',
    clearHistory: 'Clear History',
    smsAlerts: 'SMS Alerts',
    phone: 'Phone Number',
    subscribed: 'Subscribed',
    notSubscribed: 'Not subscribed',
    subscribe: 'Subscribe',
    unsubscribe: 'Unsubscribe',
    adminLogin: 'Admin Login',
    about: 'About AfyaHewa',
    version: 'Version 1.0.0 — Climate Health System Tanzania',
    english: 'English',
    swahili: 'Kiswahili',
    malaria: 'Malaria',
    flood: 'Flood',
    cholera: 'Cholera',
    heat: 'Heat',
    outbreak: 'Outbreak',
  },
  sw: {
    profile: 'Wasifu Wangu',
    district: 'Mkoa Wangu',
    language: 'Lugha',
    notifications: 'Arifa',
    alertTypes: 'Aina za Taarifa',
    saveSettings: 'Hifadhi Mipangilio',
    saved: 'Mipangilio imehifadhiwa!',
    symptomHistory: 'Historia ya Dalili',
    noHistory: 'Hakuna ukaguzi wa dalili bado.',
    clearHistory: 'Futa Historia',
    smsAlerts: 'Taarifa za SMS',
    phone: 'Nambari ya Simu',
    subscribed: 'Umejiandikisha',
    notSubscribed: 'Hujajisajili',
    subscribe: 'Jisajili',
    unsubscribe: 'Jiondoe',
    adminLogin: 'Ingia kwa Msimamizi',
    about: 'Kuhusu AfyaHewa',
    version: 'Toleo 1.0.0 — Mfumo wa Afya wa Hali ya Hewa Tanzania',
    english: 'English',
    swahili: 'Kiswahili',
    malaria: 'Malaria',
    flood: 'Mafuriko',
    cholera: 'Kipindupindu',
    heat: 'Joto',
    outbreak: 'Mlipuko',
  }
};

const DISTRICTS = [
  'Arusha','Dar es Salaam','Dodoma','Geita','Iringa','Kagera','Katavi',
  'Kigoma','Kilimanjaro','Lindi','Manyara','Mara','Mbeya','Morogoro',
  'Mtwara','Mwanza','Njombe','Pwani','Rukwa','Ruvuma','Shinyanga',
  'Simiyu','Singida','Songea','Tabora','Tanga',
  'Zanzibar North','Zanzibar South','Zanzibar West','Pemba North','Pemba South'
];

export default function UserProfile({ lang = 'en', onLangChange, onDistrictChange, onAdminClick }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const [district, setDistrict] = useState(() => localStorage.getItem('afya_district') || 'Dar es Salaam');
  const [selectedLang, setSelectedLang] = useState(lang);
  const [alertTypes, setAlertTypes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('afya_alerts') || '["malaria","flood","cholera","heat","outbreak"]'); }
    catch { return ['malaria','flood','cholera','heat','outbreak']; }
  });
  const [phone, setPhone] = useState(() => localStorage.getItem('afya_phone') || '');
  const [subscribed, setSubscribed] = useState(() => localStorage.getItem('afya_subscribed') === 'true');
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('afya_symptom_history') || '[]'); }
    catch { return []; }
  });
  const [saved, setSaved] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  function validatePhone(p) {
    return /^(\+255|0)[67]\d{8}$/.test(p.replace(/\s/g, ''));
  }

  function toggleAlert(type) {
    setAlertTypes(prev =>
      prev.includes(type) ? prev.filter(a => a !== type) : [...prev, type]
    );
  }

  function saveSettings() {
    localStorage.setItem('afya_district', district);
    localStorage.setItem('afya_lang', selectedLang);
    localStorage.setItem('afya_alerts', JSON.stringify(alertTypes));
    if (onLangChange) onLangChange(selectedLang);
    if (onDistrictChange) onDistrictChange(district);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleSubscribe() {
    if (!validatePhone(phone)) { setPhoneError('Please enter a valid Tanzania number (07XX or +255)'); return; }
    setPhoneError('');
    try {
      await fetch(`${API}/api/sms/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, district, language: selectedLang })
      });
      localStorage.setItem('afya_phone', phone);
      localStorage.setItem('afya_subscribed', 'true');
      setSubscribed(true);
    } catch {
      setPhoneError('Could not connect. Try again.');
    }
  }

  function handleUnsubscribe() {
    localStorage.setItem('afya_subscribed', 'false');
    setSubscribed(false);
  }

  function clearHistory() {
    localStorage.removeItem('afya_symptom_history');
    setHistory([]);
  }

  const alertIcons = { malaria: '🦟', flood: '🌊', cholera: '💧', heat: '🌡️', outbreak: '🦠' };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>👤 {t.profile}</div>

      {/* District & Language */}
      <div style={card}>
        <div style={sectionTitle}>⚙️ {t.saveSettings.replace('Save', 'Settings')}</div>

        <label style={label}>{t.district}</label>
        <select value={district} onChange={e => setDistrict(e.target.value)} style={input}>
          {DISTRICTS.map(d => <option key={d}>{d}</option>)}
        </select>

        <label style={{ ...label, marginTop: 12 }}>{t.language}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['en', 'sw'].map(l => (
            <button key={l} onClick={() => setSelectedLang(l)}
              style={{ ...toggleBtn, background: selectedLang === l ? '#2563eb' : '#f3f4f6', color: selectedLang === l ? '#fff' : '#374151' }}>
              {l === 'en' ? t.english : t.swahili}
            </button>
          ))}
        </div>

        <label style={{ ...label, marginTop: 12 }}>{t.alertTypes}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(alertIcons).map(([type, icon]) => (
            <button key={type} onClick={() => toggleAlert(type)}
              style={{ ...toggleBtn, background: alertTypes.includes(type) ? '#dcfce7' : '#f3f4f6', color: alertTypes.includes(type) ? '#166534' : '#6b7280', border: alertTypes.includes(type) ? '1px solid #bbf7d0' : '1px solid #e5e7eb' }}>
              {icon} {t[type]}
            </button>
          ))}
        </div>

        <button onClick={saveSettings} style={{ ...primaryBtn, marginTop: 14 }}>
          {saved ? `✓ ${t.saved}` : t.saveSettings}
        </button>
      </div>

      {/* SMS Subscription */}
      <div style={card}>
        <div style={sectionTitle}>📲 {t.smsAlerts}</div>
        {subscribed ? (
          <div>
            <div style={{ fontSize: 13, color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
              ✓ {t.subscribed} — {phone}
            </div>
            <button onClick={handleUnsubscribe} style={{ ...dangerBtn }}>{t.unsubscribe}</button>
          </div>
        ) : (
          <div>
            <label style={label}>{t.phone}</label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+255712345678 or 0712345678"
              style={{ ...input, borderColor: phoneError ? '#ef4444' : '#e5e7eb' }} />
            {phoneError && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{phoneError}</div>}
            <button onClick={handleSubscribe} style={{ ...primaryBtn, marginTop: 10 }}>{t.subscribe}</button>
          </div>
        )}
      </div>

      {/* Symptom History */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={sectionTitle}>📋 {t.symptomHistory}</div>
          {history.length > 0 && (
            <button onClick={clearHistory} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>{t.clearHistory}</button>
          )}
        </div>
        {history.length === 0 ? (
          <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>{t.noHistory}</div>
        ) : (
          history.slice(-5).reverse().map((h, i) => (
            <div key={i} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 10px', marginBottom: 6, fontSize: 12 }}>
              <div style={{ color: '#374151', fontWeight: 500 }}>{h.symptoms}</div>
              <div style={{ color: '#9ca3af', marginTop: 2 }}>{h.district} · {new Date(h.date).toLocaleDateString()}</div>
            </div>
          ))
        )}
      </div>

      {/* About */}
      <div style={card}>
        <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: 1.5 }}>
          {t.about}<br />{t.version}
        </div>
      </div>
    </div>
  );
}

const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, marginBottom: 12 };
const sectionTitle = { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 };
const label = { display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 4 };
const input = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box', background: '#fff' };
const primaryBtn = { width: '100%', padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' };
const dangerBtn = { width: '100%', padding: '10px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 8, fontSize: 14, cursor: 'pointer' };
const toggleBtn = { padding: '6px 14px', borderRadius: 99, border: '1px solid #e5e7eb', fontSize: 12, cursor: 'pointer' };
