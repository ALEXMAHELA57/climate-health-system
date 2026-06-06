import React, { useState, useEffect, useRef } from 'react';
import UserProfile from './UserProfile';
import CommunityReport from './CommunityReport';
import AdminDashboard from './AdminDashboard';

const API = 'https://climate-health-system-backend.onrender.com';

const DISTRICTS = [
  'Arusha','Dar es Salaam','Dodoma','Geita','Iringa','Kagera','Katavi',
  'Kigoma','Kilimanjaro','Lindi','Manyara','Mara','Mbeya','Morogoro',
  'Mtwara','Mwanza','Njombe','Pwani','Rukwa','Ruvuma','Shinyanga',
  'Simiyu','Singida','Songea','Tabora','Tanga',
  'Zanzibar North','Zanzibar South','Zanzibar West','Pemba North','Pemba South'
];

const CLINICS_DATA = {
  'Iringa': [
    { name: 'Iringa Regional Referral Hospital', type: 'hospital', phone: '+255262702285', hours: '24/7', address: 'Iringa Town' },
    { name: 'Tosamaganga Hospital', type: 'hospital', phone: '+255262702100', hours: '24/7', address: 'Tosamaganga' },
    { name: 'Iringa Urban Health Centre', type: 'clinic', phone: '+255262702300', hours: '7am–9pm', address: 'Iringa Town' },
    { name: 'Kilolo District Hospital', type: 'hospital', phone: '+255262920100', hours: '24/7', address: 'Kilolo' },
  ],
  'Dar es Salaam': [
    { name: 'Muhimbili National Hospital', type: 'hospital', phone: '+255222150610', hours: '24/7', address: 'Upanga' },
    { name: 'Amana Regional Hospital', type: 'hospital', phone: '+255222861810', hours: '24/7', address: 'Ilala' },
    { name: 'Mwananyamala Regional Hospital', type: 'hospital', phone: '+255222700056', hours: '24/7', address: 'Kinondoni' },
    { name: 'Temeke District Hospital', type: 'hospital', phone: '+255222852017', hours: '24/7', address: 'Temeke' },
  ],
  'Dodoma': [
    { name: 'Benjamin Mkapa Hospital', type: 'hospital', phone: '+255262321666', hours: '24/7', address: 'Dodoma' },
    { name: 'Dodoma Regional Hospital', type: 'hospital', phone: '+255262321234', hours: '24/7', address: 'Dodoma' },
  ],
  'Mwanza': [
    { name: 'Bugando Medical Centre', type: 'hospital', phone: '+255282500611', hours: '24/7', address: 'Bugando Hill' },
    { name: 'Mwanza Regional Hospital', type: 'hospital', phone: '+255282500100', hours: '24/7', address: 'Mwanza' },
  ],
  'Arusha': [
    { name: 'Mount Meru Regional Hospital', type: 'hospital', phone: '+255272508321', hours: '24/7', address: 'Arusha' },
    { name: 'Lutheran Hospital Arusha', type: 'hospital', phone: '+255272507398', hours: '24/7', address: 'Arusha' },
    { name: 'Selian Lutheran Hospital', type: 'hospital', phone: '+255272553000', hours: '24/7', address: 'Selian' },
  ],
  'Mbeya': [
    { name: 'Mbeya Zonal Referral Hospital', type: 'hospital', phone: '+255252503567', hours: '24/7', address: 'Mbeya' },
    { name: 'Mbeya Regional Hospital', type: 'hospital', phone: '+255252503200', hours: '24/7', address: 'Mbeya' },
  ],
  'Morogoro': [
    { name: 'Morogoro Regional Hospital', type: 'hospital', phone: '+255232600320', hours: '24/7', address: 'Morogoro' },
    { name: 'Kilosa District Hospital', type: 'hospital', phone: '+255232401100', hours: '24/7', address: 'Kilosa' },
  ],
  'Tanga': [
    { name: 'Bombo Regional Hospital', type: 'hospital', phone: '+255272643640', hours: '24/7', address: 'Tanga' },
    { name: 'Muheza District Hospital', type: 'hospital', phone: '+255272644100', hours: '24/7', address: 'Muheza' },
  ],
  'Kilimanjaro': [
    { name: 'KCMC (Kilimanjaro Christian Medical Centre)', type: 'hospital', phone: '+255272754377', hours: '24/7', address: 'Moshi' },
    { name: 'Moshi District Hospital', type: 'hospital', phone: '+255272752324', hours: '24/7', address: 'Moshi' },
  ],
  'Tabora': [
    { name: 'Tabora Regional Referral Hospital', type: 'hospital', phone: '+255262604255', hours: '24/7', address: 'Tabora' },
    { name: 'Igunga District Hospital', type: 'hospital', phone: '+255262662100', hours: '24/7', address: 'Igunga' },
    { name: 'Nzega District Hospital', type: 'hospital', phone: '+255262663100', hours: '24/7', address: 'Nzega' },
  ],
  'Kigoma': [
    { name: 'Maweni Regional Hospital', type: 'hospital', phone: '+255282780360', hours: '24/7', address: 'Kigoma' },
    { name: 'Kibondo District Hospital', type: 'hospital', phone: '+255282842100', hours: '24/7', address: 'Kibondo' },
  ],
  'Lindi': [
    { name: 'Lindi Regional Referral Hospital', type: 'hospital', phone: '+255232202500', hours: '24/7', address: 'Lindi' },
    { name: 'Liwale District Hospital', type: 'hospital', phone: '+255232403100', hours: '24/7', address: 'Liwale' },
  ],
  'Mtwara': [
    { name: 'Mtwara Regional Hospital', type: 'hospital', phone: '+255232333500', hours: '24/7', address: 'Mtwara' },
    { name: 'Masasi District Hospital', type: 'hospital', phone: '+255232510100', hours: '24/7', address: 'Masasi' },
    { name: 'Newala District Hospital', type: 'hospital', phone: '+255232520100', hours: '24/7', address: 'Newala' },
  ],
  'Ruvuma': [
    { name: 'Songea Regional Hospital', type: 'hospital', phone: '+255252602500', hours: '24/7', address: 'Songea' },
    { name: 'Mbinga District Hospital', type: 'hospital', phone: '+255252640100', hours: '24/7', address: 'Mbinga' },
  ],
  'Shinyanga': [
    { name: 'Shinyanga Regional Hospital', type: 'hospital', phone: '+255276003100', hours: '24/7', address: 'Shinyanga' },
    { name: 'Kahama District Hospital', type: 'hospital', phone: '+255276003400', hours: '24/7', address: 'Kahama' },
  ],
  'Singida': [
    { name: 'Singida Regional Hospital', type: 'hospital', phone: '+255262502600', hours: '24/7', address: 'Singida' },
    { name: 'Manyoni District Hospital', type: 'hospital', phone: '+255262532100', hours: '24/7', address: 'Manyoni' },
  ],
  'Rukwa': [
    { name: 'Sumbawanga Regional Hospital', type: 'hospital', phone: '+255282802500', hours: '24/7', address: 'Sumbawanga' },
    { name: 'Nkasi District Hospital', type: 'hospital', phone: '+255282804100', hours: '24/7', address: 'Nkasi' },
  ],
  'Kagera': [
    { name: 'Kagera Regional Hospital', type: 'hospital', phone: '+255282222500', hours: '24/7', address: 'Bukoba' },
    { name: 'Biharamulo District Hospital', type: 'hospital', phone: '+255282310100', hours: '24/7', address: 'Biharamulo' },
  ],
  'Katavi': [
    { name: 'Mpanda Regional Hospital', type: 'hospital', phone: '+255282602500', hours: '24/7', address: 'Mpanda' },
  ],
  'Manyara': [
    { name: 'Babati District Hospital', type: 'hospital', phone: '+255272553200', hours: '24/7', address: 'Babati' },
    { name: 'Hanang District Hospital', type: 'hospital', phone: '+255272554100', hours: '24/7', address: 'Hanang' },
  ],
  'Mara': [
    { name: 'Musoma Regional Hospital', type: 'hospital', phone: '+255282622500', hours: '24/7', address: 'Musoma' },
    { name: 'Tarime District Hospital', type: 'hospital', phone: '+255282640100', hours: '24/7', address: 'Tarime' },
  ],
  'Geita': [
    { name: 'Geita District Hospital', type: 'hospital', phone: '+255282320100', hours: '24/7', address: 'Geita' },
  ],
  'Njombe': [
    { name: 'Njombe Regional Hospital', type: 'hospital', phone: '+255262702900', hours: '24/7', address: 'Njombe' },
    { name: 'Makete District Hospital', type: 'hospital', phone: '+255262703100', hours: '24/7', address: 'Makete' },
  ],
  'Pwani': [
    { name: 'Coast Regional Hospital', type: 'hospital', phone: '+255232402500', hours: '24/7', address: 'Kibaha' },
    { name: 'Rufiji District Hospital', type: 'hospital', phone: '+255232403100', hours: '24/7', address: 'Utete' },
  ],
  'Simiyu': [
    { name: 'Bariadi District Hospital', type: 'hospital', phone: '+255282752100', hours: '24/7', address: 'Bariadi' },
  ],
  'Songea': [
    { name: 'Songea Regional Hospital', type: 'hospital', phone: '+255252602500', hours: '24/7', address: 'Songea' },
  ],
  'Zanzibar West': [
    { name: 'Mnazi Mmoja Hospital', type: 'hospital', phone: '+255242230114', hours: '24/7', address: 'Stone Town' },
    { name: 'Kidongo Chekundu Health Centre', type: 'clinic', phone: '+255242230500', hours: '24/7', address: 'Zanzibar Town' },
  ],
  'Zanzibar North': [
    { name: 'Kivunge District Hospital', type: 'hospital', phone: '+255242234100', hours: '24/7', address: 'Kivunge' },
  ],
  'Zanzibar South': [
    { name: 'Makunduchi District Hospital', type: 'hospital', phone: '+255242235100', hours: '24/7', address: 'Makunduchi' },
  ],
  'Pemba North': [
    { name: 'Chake Chake Regional Hospital', type: 'hospital', phone: '+255242452500', hours: '24/7', address: 'Chake Chake' },
  ],
  'Pemba South': [
    { name: 'Mkoani District Hospital', type: 'hospital', phone: '+255242453100', hours: '24/7', address: 'Mkoani' },
  ],
};

const DISTRICT_COORDS = {
  'Iringa': { lat: -7.77, lon: 35.69 }, 'Dar es Salaam': { lat: -6.79, lon: 39.21 },
  'Dodoma': { lat: -6.17, lon: 35.74 }, 'Mwanza': { lat: -2.52, lon: 32.92 },
  'Arusha': { lat: -3.39, lon: 36.68 }, 'Mbeya': { lat: -8.91, lon: 33.46 },
  'Morogoro': { lat: -6.82, lon: 37.66 }, 'Tanga': { lat: -5.07, lon: 39.10 },
  'Zanzibar West': { lat: -6.17, lon: 39.20 }, 'Kilimanjaro': { lat: -3.35, lon: 37.33 },
  'Tabora': { lat: -5.02, lon: 32.80 }, 'Kigoma': { lat: -4.88, lon: 29.63 },
  'Lindi': { lat: -9.99, lon: 39.71 }, 'Mtwara': { lat: -10.27, lon: 40.18 },
  'Ruvuma': { lat: -10.68, lon: 35.65 }, 'Shinyanga': { lat: -3.66, lon: 33.42 },
  'Singida': { lat: -4.82, lon: 34.75 }, 'Rukwa': { lat: -7.98, lon: 32.03 },
  'Kagera': { lat: -1.33, lon: 31.82 }, 'Mara': { lat: -1.77, lon: 34.00 },
  'Geita': { lat: -2.87, lon: 32.23 }, 'Simiyu': { lat: -2.63, lon: 34.22 },
  'Njombe': { lat: -9.33, lon: 34.77 }, 'Pwani': { lat: -7.07, lon: 38.67 },
  'Manyara': { lat: -3.70, lon: 35.88 }, 'Katavi': { lat: -6.33, lon: 31.08 },
  'Songea': { lat: -10.68, lon: 35.65 }, 'Pemba North': { lat: -5.03, lon: 39.77 },
  'Pemba South': { lat: -5.32, lon: 39.72 }, 'Zanzibar North': { lat: -5.72, lon: 39.25 },
  'Zanzibar South': { lat: -6.38, lon: 39.52 },
};

const T = {
  en: {
    home: 'Home', weather: 'Weather', symptoms: 'Symptoms', clinics: 'Clinics', map: 'Risk Map', profile: 'Profile',
    welcome: 'Welcome', detect: 'Detecting your location...', locationOk: 'Region detected',
    locationDenied: 'Location access denied. Please select your region below.', useGps: 'Use GPS',
    riskThisWeek: 'Health risk this week', weekForecast: '7-day forecast', dayForecast: '15-day forecast',
    currentConditions: 'Current conditions', temperature: 'Temperature', humidity: 'Humidity',
    wind: 'Wind Speed', rain7: '7-day Rain', healthAlerts: 'Health Alerts', whatToDo: 'What to do',
    search: 'Search', emergency: 'Emergency', callEmergency: 'Call 112',
    findClinics: 'Find Clinics', nearbyFacilities: 'Nearby Facilities',
    whenToGo: 'When to go to hospital', goNow: 'Go NOW if you have',
    within24: 'Go within 24 hours if you have', soon: 'Go soon if you have',
    afyaGreet: "Hello! I'm Afya, your health assistant. How are you feeling today?",
    typeSymptoms: 'Describe your symptoms...', typing: 'Afya is typing...',
    symptomTags: ['Fever', 'Headache', 'Cough', 'Dizziness', 'Nausea', 'Vomiting', 'Diarrhoea', 'Body Aches', 'Chills', 'Rash', 'Sore Throat', 'Fatigue'],
    riskMap: 'Climate Risk Map', overallRisk: 'Overall', malaria: 'Malaria', flood: 'Flood', drought: 'Drought', outbreak: 'Outbreak',
    communityReport: 'Community Report', report: 'Report',
    news: 'Health News', noNews: 'No news available.',
    en: 'EN', sw: 'SW',
  },
  sw: {
    home: 'Nyumbani', weather: 'Hali ya Hewa', symptoms: 'Dalili', clinics: 'Kliniki', map: 'Ramani ya Hatari', profile: 'Wasifu',
    welcome: 'Karibu', detect: 'Inagundua mahali pako...', locationOk: 'Mkoa umegunduliwa',
    locationDenied: 'Eneo limekataliwa. Tafadhali chagua mkoa wako hapa chini.', useGps: 'Tumia GPS',
    riskThisWeek: 'Hatari ya afya wiki hii', weekForecast: 'Utabiri wa siku 7', dayForecast: 'Utabiri wa siku 15',
    currentConditions: 'Hali ya sasa', temperature: 'Joto', humidity: 'Unyevu',
    wind: 'Kasi ya Upepo', rain7: 'Mvua siku 7', healthAlerts: 'Taarifa za Afya', whatToDo: 'Nini cha kufanya',
    search: 'Tafuta', emergency: 'Dharura', callEmergency: 'Piga simu 112',
    findClinics: 'Tafuta Kliniki', nearbyFacilities: 'Vituo vya karibu',
    whenToGo: 'Kwenda hospitali lini', goNow: 'Nenda SASA ukiwa na',
    within24: 'Nenda ndani ya masaa 24 ukiwa na', soon: 'Nenda hivi karibuni ukiwa na',
    afyaGreet: 'Habari! Mimi ni Afya, msaidizi wako wa afya. Unajisikiaje leo?',
    typeSymptoms: 'Elezea dalili zako...', typing: 'Afya anaandika...',
    symptomTags: ['Homa', 'Maumivu ya kichwa', 'Kikohozi', 'Kizunguzungu', 'Kichefuchefu', 'Kutapika', 'Kuharisha', 'Maumivu ya mwili', 'Baridi', 'Upele', 'Koo kuwaka', 'Uchovu'],
    riskMap: 'Ramani ya Hatari ya Hali ya Hewa', overallRisk: 'Jumla', malaria: 'Malaria', flood: 'Mafuriko', drought: 'Ukame', outbreak: 'Mlipuko',
    communityReport: 'Ripoti ya Jamii', report: 'Ripoti',
    news: 'Habari za Afya', noNews: 'Hakuna habari.',
    en: 'EN', sw: 'SW',
  }
};

// ─── Utility ─────────────────────────────────────────────────────────────────
function getRisk(rain7, maxTemp, hasStorm, maxDaily) {
  if (hasStorm && maxDaily > 50) return 'emergency';
  if (rain7 > 60 || (hasStorm && maxDaily > 25)) return 'high';
  if (rain7 > 25 || maxTemp > 36) return 'medium';
  return 'low';
}

function riskColor(r) {
  return { emergency: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#22c55e' }[r] || '#9ca3af';
}
function riskBg(r) {
  return { emergency: '#fef2f2', high: '#fffbeb', medium: '#eff6ff', low: '#f0fdf4' }[r] || '#f9fafb';
}

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/\^\^(.*?)\^\^/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .trim();
}

function findNearestDistrict(lat, lon) {
  let best = 'Dar es Salaam', bestDist = Infinity;
  for (const [name, c] of Object.entries(DISTRICT_COORDS)) {
    const d = Math.hypot(c.lat - lat, c.lon - lon);
    if (d < bestDist) { bestDist = d; best = name; }
  }
  return best;
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState('home');
  const [lang, setLang] = useState(() => localStorage.getItem('afya_lang') || 'en');
  const [district, setDistrict] = useState(() => localStorage.getItem('afya_district') || 'Dar es Salaam');
  const [showAdmin, setShowAdmin] = useState(() => window.location.hash === '#admin');
  const t = T[lang];

  useEffect(() => {
    function onHashChange() { setShowAdmin(window.location.hash === '#admin'); }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function handleLangChange(l) { setLang(l); localStorage.setItem('afya_lang', l); }
  function handleDistrictChange(d) { setDistrict(d); localStorage.setItem('afya_district', d); }

  if (showAdmin) return <AdminDashboard lang={lang} onClose={() => { window.location.hash = ''; setShowAdmin(false); }} />;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f3f4f6' }}>
      {/* Header */}
      <div style={{ background: '#2563eb', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>🌍 AfyaHewa</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>📍 {district}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={() => handleLangChange(lang === 'en' ? 'sw' : 'en')}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 99, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            {lang === 'en' ? t.sw : t.en}
          </button>
          <div style={{ fontSize: 11, background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: 99 }}>🟢</div>
        </div>
      </div>

      {/* Page */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 72 }}>
        {page === 'home'     && <Home t={t} lang={lang} district={district} onDistrictChange={handleDistrictChange} setPage={setPage} />}
        {page === 'weather'  && <Weather t={t} lang={lang} district={district} onDistrictChange={handleDistrictChange} />}
        {page === 'symptoms' && <Symptoms t={t} lang={lang} district={district} />}
        {page === 'clinics'  && <Clinics t={t} lang={lang} district={district} onDistrictChange={handleDistrictChange} />}
        {page === 'map'      && <RiskMap t={t} lang={lang} />}
        {page === 'profile'  && <UserProfile lang={lang} onLangChange={handleLangChange} onDistrictChange={handleDistrictChange} />}
        {page === 'report'   && <CommunityReport lang={lang} />}
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: '#fff', borderTop: '1px solid #e5e7eb', display: 'flex', zIndex: 100 }}>
        {[
          { id: 'home', icon: '🏠', label: t.home },
          { id: 'weather', icon: '🌤️', label: t.weather },
          { id: 'symptoms', icon: '🤒', label: t.symptoms },
          { id: 'map', icon: '🗺️', label: t.map.split(' ')[0] + ' Map' },
          { id: 'clinics', icon: '🏥', label: t.clinics },
          { id: 'profile', icon: '👤', label: t.profile },
        ].map(tab => (
          <button key={tab.id} onClick={() => setPage(tab.id)}
            style={{ flex: 1, padding: '9px 2px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderTop: page === tab.id ? '2px solid #2563eb' : '2px solid transparent' }}>
            <span style={{ fontSize: 18 }}>{tab.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 500, color: page === tab.id ? '#2563eb' : '#9ca3af' }}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function Home({ t, lang, district, onDistrictChange, setPage }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle | detecting | ok | denied

  useEffect(() => { detectLocation(); }, []);
  useEffect(() => { if (district) fetchWeather(district); }, [district]);

  function detectLocation() {
    if (!navigator.geolocation) return;
    setGpsStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const d = findNearestDistrict(pos.coords.latitude, pos.coords.longitude);
        onDistrictChange(d);
        setGpsStatus('ok');
      },
      () => setGpsStatus('denied'),
      { timeout: 8000 }
    );
  }

  async function fetchWeather(d) {
    const c = DISTRICT_COORDS[d];
    if (!c) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/weather/${d}`);
      const data = await res.json();
      setWeather(data);
    } catch { setWeather(null); }
    setLoading(false);
  }

  const curr = weather?.current;
  const daily = weather?.daily;
  const rain7 = daily?.precipitation_sum?.reduce((a, b) => a + b, 0) || 0;
  const maxTemp = daily ? Math.max(...(daily.temperature_2m_max || [0])) : 0;
  const maxDaily = daily ? Math.max(...(daily.precipitation_sum || [0])) : 0;
  const hasStorm = daily?.weather_code?.some(c => c >= 95) || false;
  const risk = curr ? getRisk(rain7, maxTemp, hasStorm, maxDaily) : 'low';

  const sw = lang === 'sw';

  return (
    <div style={{ padding: 16 }}>
      {/* Region selector — always visible */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 12px', marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 16 }}>📍</span>
        <select value={district} onChange={e => { onDistrictChange(e.target.value); setGpsStatus('manual'); }}
          style={{ flex: 1, border: 'none', fontSize: 14, fontWeight: 600, color: '#111', background: 'transparent', outline: 'none', cursor: 'pointer' }}>
          {DISTRICTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <button onClick={detectLocation} title={sw ? 'Tumia GPS' : 'Use GPS'}
          style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '5px 10px', fontSize: 12, color: '#1d4ed8', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {gpsStatus === 'detecting' ? '⟳' : '🛰 GPS'}
        </button>
      </div>

      {/* GPS status messages */}
      {gpsStatus === 'ok' && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 12px', marginBottom: 10, fontSize: 12, color: '#166534' }}>
          ✓ {t.locationOk}: {district}
        </div>
      )}
      {gpsStatus === 'denied' && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '6px 12px', marginBottom: 10, fontSize: 12, color: '#92400e' }}>
          ⚠️ {sw ? 'GPS haikufanya kazi. Umechagua mkoa kwa mkono.' : 'GPS unavailable. You can select your region above manually.'}
        </div>
      )}

      {/* Welcome card */}
      <div style={{ background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', borderRadius: 16, padding: '18px 16px', color: '#fff', marginBottom: 14 }}>
        <div style={{ fontSize: 20, marginBottom: 4 }}>👋 {t.welcome}</div>
        {loading ? (
          <div style={{ fontSize: 12, opacity: 0.8 }}>{t.detect}</div>
        ) : curr ? (
          <div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{Math.round(curr.temperature_2m)}°C</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>💧 {curr.relative_humidity_2m}% · 💨 {Math.round(curr.wind_speed_10m)} km/h</div>
            <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.2)', display: 'inline-block', padding: '3px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
              {risk.toUpperCase()} {lang === 'sw' ? 'HATARI' : 'RISK'}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.8 }}>📍 {district}</div>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { icon: '🌤️', title: t.weather, sub: lang === 'sw' ? 'Utabiri wa hali ya hewa' : '7 & 15 day forecast', page: 'weather', color: '#eff6ff', border: '#bfdbfe' },
          { icon: '🤒', title: t.symptoms, sub: lang === 'sw' ? 'Kagua dalili na Afya' : 'Chat with Afya', page: 'symptoms', color: '#fffbeb', border: '#fde68a' },
          { icon: '🏥', title: t.clinics, sub: lang === 'sw' ? 'Vituo vya karibu nawe' : 'Nearby facilities', page: 'clinics', color: '#f0fdf4', border: '#bbf7d0' },
          { icon: '📢', title: t.report, sub: lang === 'sw' ? 'Ripoti tatizo' : 'Report an issue', page: 'report', color: '#f5f3ff', border: '#ddd6fe' },
        ].map((item, i) => (
          <button key={i} onClick={() => setPage(item.page)}
            style={{ background: item.color, border: `1px solid ${item.border}`, borderRadius: 12, padding: '14px 12px', textAlign: 'left', cursor: 'pointer' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{item.title}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{item.sub}</div>
          </button>
        ))}
      </div>

      {/* Emergency */}
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#991b1b' }}>🚨 {t.emergency}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Ambulance · Police · Fire</div>
        </div>
        <a href="tel:112" style={{ background: '#ef4444', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>{t.callEmergency}</a>
      </div>
    </div>
  );
}

// ─── WEATHER ─────────────────────────────────────────────────────────────────
function Weather({ t, lang, district, onDistrictChange }) {
  const [selectedDistrict, setSelectedDistrict] = useState(district);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [forecastDays, setForecastDays] = useState(7);
  const [selectedDay, setSelectedDay] = useState(null);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  async function fetchWeather(d) {
    setLoading(true);
    try {
      const c = DISTRICT_COORDS[d];
      if (!c) { setLoading(false); return; }
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=Africa/Dar_es_Salaam&forecast_days=${forecastDays}`;
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch { alert('Could not fetch weather data'); }
    setLoading(false);
  }

  useEffect(() => { fetchWeather(selectedDistrict); }, [forecastDays]);

  function handleSearch() { onDistrictChange(selectedDistrict); fetchWeather(selectedDistrict); }

  function locateGps() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const d = findNearestDistrict(pos.coords.latitude, pos.coords.longitude);
      setSelectedDistrict(d);
      onDistrictChange(d);
      fetchWeather(d);
    });
  }

  const curr = data?.current;
  const daily = data?.daily;
  const rain7 = daily?.precipitation_sum?.reduce((a, b) => a + b, 0) || 0;
  const maxTemp = daily ? Math.max(...(daily.temperature_2m_max || [0])) : 0;
  const maxDaily = daily ? Math.max(...(daily.precipitation_sum || [0])) : 0;
  const hasStorm = daily?.weather_code?.some(c => c >= 95) || false;
  const risk = curr ? getRisk(rain7, maxTemp, hasStorm, maxDaily) : 'low';

  function getAlerts() {
    if (!daily) return [];
    const alerts = [];
    const heavyDays = daily.precipitation_sum.map((r, i) => ({ r, i, code: daily.weather_code[i] })).filter(x => x.r > 25);
    if (heavyDays.length > 0) alerts.push({ icon: '🦟', label: lang === 'sw' ? 'Hatari ya Malaria — mvua nzito' : `Malaria risk — heavy rain ${heavyDays.map(x => days[new Date(daily.time[x.i]).getDay()]).join(', ')}`, level: 'high' });
    if (rain7 > 60) alerts.push({ icon: '💧', label: lang === 'sw' ? 'Hatari ya kipindupindu — maji mengi' : 'Cholera risk — high rainfall this week', level: 'high' });
    if (maxTemp > 36) alerts.push({ icon: '🌡️', label: lang === 'sw' ? 'Hatari ya joto kali' : 'Heat illness risk — extreme temperatures', level: 'medium' });
    if (hasStorm) alerts.push({ icon: '⛈️', label: lang === 'sw' ? 'Dhoruba inatarajiwa' : 'Storm expected — risk of flooding', level: 'high' });
    return alerts;
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>🌤️ {t.weather}</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)}
          style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, background: '#fff' }}>
          {DISTRICTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <button onClick={locateGps} style={{ padding: '10px 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 18, cursor: 'pointer' }}>📍</button>
        <button onClick={handleSearch} disabled={loading}
          style={{ padding: '10px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
          {loading ? '...' : t.search}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[7, 15].map(n => (
          <button key={n} onClick={() => setForecastDays(n)}
            style={{ flex: 1, padding: '7px', borderRadius: 8, border: 'none', background: forecastDays === n ? '#2563eb' : '#f3f4f6', color: forecastDays === n ? '#fff' : '#374151', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
            {n === 7 ? t.weekForecast : t.dayForecast}
          </button>
        ))}
      </div>

      {curr && (
        <>
          <div style={{ background: riskBg(risk), border: `1px solid ${riskColor(risk)}30`, borderRadius: 10, padding: '10px 14px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: riskColor(risk) }}>{t.riskThisWeek}</div>
            <div style={{ background: riskColor(risk), color: '#fff', padding: '3px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>{risk.toUpperCase()}</div>
          </div>

          {/* Today's rain forecast banner */}
          {(() => {
            const todayRain = daily?.precipitation_sum?.[0] || 0;
            const todayCode = daily?.weather_code?.[0] || 0;
            const isRainy = todayRain > 0.5 || todayCode >= 51;
            const rainLabel = todayRain === 0 ? (lang === 'sw' ? 'Hakuna mvua inayotarajiwa leo' : 'No rain expected today') :
              todayRain < 5 ? (lang === 'sw' ? `Mvua kidogo inatarajiwa leo (${todayRain.toFixed(1)}mm)` : `Light rain expected today (${todayRain.toFixed(1)}mm)`) :
              todayRain < 20 ? (lang === 'sw' ? `Mvua ya wastani inatarajiwa leo (${todayRain.toFixed(1)}mm)` : `Moderate rain expected today (${todayRain.toFixed(1)}mm)`) :
              (lang === 'sw' ? `Mvua nzito inatarajiwa leo (${todayRain.toFixed(1)}mm)` : `Heavy rain expected today (${todayRain.toFixed(1)}mm)`);
            const rainBg = todayRain === 0 ? '#f0fdf4' : todayRain < 5 ? '#eff6ff' : todayRain < 20 ? '#fffbeb' : '#fef2f2';
            const rainColor = todayRain === 0 ? '#166534' : todayRain < 5 ? '#1d4ed8' : todayRain < 20 ? '#d97706' : '#ef4444';
            const rainIcon = todayRain === 0 ? '☀️' : todayRain < 5 ? '🌦️' : todayRain < 20 ? '🌧️' : '⛈️';
            return (
              <div style={{ background: rainBg, border: `1px solid ${rainColor}30`, borderRadius: 10, padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>{rainIcon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: rainColor }}>{lang === 'sw' ? 'Leo' : 'Today'}</div>
                  <div style={{ fontSize: 12, color: rainColor, opacity: 0.85 }}>{rainLabel}</div>
                  {todayCode >= 95 && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2, fontWeight: 600 }}>{lang === 'sw' ? '⚡ Dhoruba inatarajiwa' : '⚡ Thunderstorm expected'}</div>}
                </div>
              </div>
            );
          })()}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              { label: t.temperature, value: `${Math.round(curr.temperature_2m)}°C`, sub: `Feels ${Math.round(curr.apparent_temperature)}°C` },
              { label: t.humidity, value: `${curr.relative_humidity_2m}%`, sub: `Rain now: ${curr.precipitation}mm` },
              { label: t.wind, value: `${Math.round(curr.wind_speed_10m)} km/h`, sub: 'Current' },
              { label: t.rain7, value: `${rain7.toFixed(0)}mm`, sub: lang === 'sw' ? 'Jumla ya utabiri' : 'Total forecast' },
            ].map((m, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{m.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{m.value}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Forecast strip */}
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{forecastDays === 7 ? t.weekForecast : t.dayForecast}</div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
            {(daily.temperature_2m_max || []).map((temp, i) => {
              const rain = daily.precipitation_sum[i] || 0;
              const code = daily.weather_code[i] || 0;
              const dr = getRisk(rain * 2, temp, code >= 95, rain);
              return (
                <button key={i} onClick={() => setSelectedDay(selectedDay === i ? null : i)}
                  style={{ flex: '0 0 60px', background: selectedDay === i ? riskBg(dr) : '#fff', border: `1px solid ${selectedDay === i ? riskColor(dr) : '#e5e7eb'}`, borderRadius: 10, padding: '8px 4px', textAlign: 'center', cursor: 'pointer', borderBottom: `3px solid ${riskColor(dr)}` }}>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>{i === 0 ? 'Today' : days[new Date(daily.time[i]).getDay()]}</div>
                  <div style={{ fontSize: 15, marginBottom: 2 }}>{rain > 20 ? '🌧️' : rain > 5 ? '🌦️' : code >= 95 ? '⛈️' : '☀️'}</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{Math.round(temp)}°</div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>{rain.toFixed(0)}mm</div>
                </button>
              );
            })}
          </div>

          {/* Day detail */}
          {selectedDay !== null && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                {days[new Date(daily.time[selectedDay]).getDay()]} — {new Date(daily.time[selectedDay]).toLocaleDateString()}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
                <div><div style={{ color: '#9ca3af' }}>Max</div><div style={{ fontWeight: 600 }}>{Math.round(daily.temperature_2m_max[selectedDay])}°C</div></div>
                <div><div style={{ color: '#9ca3af' }}>Min</div><div style={{ fontWeight: 600 }}>{Math.round(daily.temperature_2m_min[selectedDay])}°C</div></div>
                <div><div style={{ color: '#9ca3af' }}>Rain</div><div style={{ fontWeight: 600 }}>{(daily.precipitation_sum[selectedDay] || 0).toFixed(1)}mm</div></div>
              </div>
            </div>
          )}

          {/* Alerts */}
          {getAlerts().map((a, i) => (
            <div key={i} style={{ background: riskBg(a.level), border: `1px solid ${riskColor(a.level)}30`, borderRadius: 10, padding: '10px 12px', marginBottom: 6, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 18 }}>{a.icon}</span>
              <div style={{ fontSize: 12, color: riskColor(a.level), fontWeight: 500 }}>{a.label}</div>
            </div>
          ))}
        </>
      )}

      {!curr && !loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: 13 }}>
          {lang === 'sw' ? 'Chagua mkoa na ubonyeze Tafuta' : 'Select a region and tap Search'}
        </div>
      )}
    </div>
  );
}

// ─── SYMPTOMS ─────────────────────────────────────────────────────────────────
function Symptoms({ t, lang, district }) {
  const [messages, setMessages] = useState([{ role: 'assistant', content: t.afyaGreet }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  function addTag(tag) { setInput(p => p ? `${p}, ${tag}` : tag); }

  async function send() {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Save symptom to local history
    const hist = JSON.parse(localStorage.getItem('afya_symptom_history') || '[]');
    hist.push({ symptoms: input, district, date: new Date().toISOString() });
    localStorage.setItem('afya_symptom_history', JSON.stringify(hist.slice(-20)));

    try {
      const res = await fetch(`${API}/api/symptoms/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });
      const json = await res.json();
      const reply = stripMarkdown(json.reply || '');
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
      if (/emergency|hospital.*now|immediately|go.*now/i.test(reply)) setEmergency(true);
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: lang === 'sw' ? 'Samahani, hakuna muunganisho. Jaribu tena.' : 'Sorry, could not connect. Please try again.' }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)' }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>🤒 {t.symptoms}</div>

      {emergency && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>🚨 {lang === 'sw' ? 'Nenda hospitalini SASA' : 'Go to hospital NOW'}</div>
          <a href="tel:112" style={{ background: '#ef4444', color: '#fff', padding: '5px 12px', borderRadius: 8, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>112</a>
        </div>
      )}

      {/* Tags */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {t.symptomTags.map((tag, i) => (
          <button key={i} onClick={() => addTag(tag)}
            style={{ padding: '5px 10px', borderRadius: 99, background: '#f3f4f6', border: '1px solid #e5e7eb', fontSize: 11, cursor: 'pointer', color: '#374151' }}>
            {tag}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
            <div style={{ maxWidth: '82%', padding: '10px 14px', borderRadius: 16, background: m.role === 'user' ? '#2563eb' : '#fff', color: m.role === 'user' ? '#fff' : '#111', border: m.role === 'user' ? 'none' : '1px solid #e5e7eb', fontSize: 14, lineHeight: 1.5, borderBottomRightRadius: m.role === 'user' ? 4 : 16, borderBottomLeftRadius: m.role === 'assistant' ? 4 : 16 }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, borderBottomLeftRadius: 4, padding: '10px 14px', fontSize: 13, color: '#9ca3af' }}>{t.typing}</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={t.typeSymptoms}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: `1px solid ${input ? '#2563eb' : '#e5e7eb'}`, fontSize: 14, background: '#fff' }} />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{ padding: '10px 16px', background: input.trim() ? '#2563eb' : '#e5e7eb', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 18 }}>➤</button>
      </div>
    </div>
  );
}

// ─── CLINICS ─────────────────────────────────────────────────────────────────
function Clinics({ t, lang, district, onDistrictChange }) {
  const [selectedDistrict, setSelectedDistrict] = useState(district);
  const [data, setData] = useState(null);

  function search() {
    onDistrictChange(selectedDistrict);
    setData(CLINICS_DATA[selectedDistrict] || []);
  }

  const sw = lang === 'sw';

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>🏥 {t.clinics}</div>

      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#991b1b' }}>🚨 {t.emergency}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Ambulance · Police · Fire</div>
        </div>
        <a href="tel:112" style={{ background: '#ef4444', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>{t.callEmergency}</a>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)}
          style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, background: '#fff' }}>
          {DISTRICTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <button onClick={search}
          style={{ padding: '10px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
          {t.search}
        </button>
      </div>

      {/* When to go guide */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>⏰ {t.whenToGo}</div>
        {[
          { title: sw ? 'Nenda SASA ukiwa na' : 'Go NOW if you have', items: sw ? ['Maumivu ya kifua', 'Ugumu wa kupumua', 'Kutoweza kuamka', 'Damu nyingi', 'Mshtuko wa moyo'] : ['Chest pain', 'Difficulty breathing', 'Unconsciousness', 'Heavy bleeding', 'Seizures'], color: '#ef4444', bg: '#fef2f2' },
          { title: sw ? 'Nenda ndani ya masaa 24 ukiwa na' : 'Go within 24 hrs for', items: sw ? ['Homa kali (>39°C)', 'Kutapika kwa muda mrefu', 'Dalili za malaria', 'Kuhara kwa muda mrefu'] : ['High fever >39°C', 'Persistent vomiting', 'Malaria symptoms', 'Prolonged diarrhoea'], color: '#f59e0b', bg: '#fffbeb' },
        ].map((g, i) => (
          <div key={i} style={{ background: g.bg, borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: g.color, marginBottom: 4 }}>{g.title}</div>
            {g.items.map((item, j) => <div key={j} style={{ fontSize: 11, color: '#374151', marginBottom: 2 }}>• {item}</div>)}
          </div>
        ))}
      </div>

      {/* Clinic list */}
      {data && data.map((c, i) => (
        <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, marginRight: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 4 }}>{c.name}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{c.address}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 99 }}>{c.type}</span>
                <span style={{ fontSize: 11, background: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: 99 }}>{c.hours}</span>
              </div>
            </div>
            <a href={`tel:${c.phone}`}
              style={{ background: '#dcfce7', color: '#166534', padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              📞 {c.phone}
            </a>
          </div>
        </div>
      ))}

      {!data && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: 13 }}>
          {sw ? 'Chagua mkoa na ubonyeze Tafuta' : 'Select a region and tap Search'}
        </div>
      )}
    </div>
  );
}

// ─── RISK MAP ─────────────────────────────────────────────────────────────────
function RiskMap({ t, lang }) {
  const [layer, setLayer] = useState('overall');
  const [districtRisks, setDistrictRisks] = useState({});
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [outbreakData, setOutbreakData] = useState({});

  const districtList = Object.keys(DISTRICT_COORDS);

  useEffect(() => { loadRiskData(); }, [layer]);

  async function loadRiskData() {
    setLoading(true);
    const allDistricts = Object.keys(DISTRICT_COORDS);
    const results = {};

    // Load in batches of 6 to avoid rate limiting
    const batchSize = 6;
    for (let i = 0; i < allDistricts.length; i += batchSize) {
      const batch = allDistricts.slice(i, i + batchSize);
      await Promise.all(batch.map(async d => {
        try {
          const c = DISTRICT_COORDS[d];
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}` +
            `&daily=temperature_2m_max,precipitation_sum,weather_code` +
            `&timezone=Africa/Dar_es_Salaam&forecast_days=7`
          );
          const data = await res.json();
          const rain7 = (data.daily?.precipitation_sum || []).reduce((a, b) => a + b, 0);
          const maxTemp = Math.max(...(data.daily?.temperature_2m_max || [0]));
          const maxDaily = Math.max(...(data.daily?.precipitation_sum || [0]));
          const todayRain = data.daily?.precipitation_sum?.[0] || 0;
          const hasStorm = (data.daily?.weather_code || []).some(c => c >= 95);
          let risk = getRisk(rain7, maxTemp, hasStorm, maxDaily);
          if (layer === 'malaria') risk = rain7 > 60 ? 'emergency' : rain7 > 30 ? 'high' : rain7 > 10 ? 'medium' : 'low';
          if (layer === 'flood')   risk = (hasStorm && maxDaily > 50) ? 'emergency' : maxDaily > 25 ? 'high' : maxDaily > 10 ? 'medium' : 'low';
          if (layer === 'drought') risk = rain7 < 2 ? 'high' : rain7 < 10 ? 'medium' : 'low';
          results[d] = { risk, rain7, maxTemp, hasStorm, maxDaily, todayRain };
        } catch { results[d] = { risk: 'unknown' }; }
      }));
      // Update UI progressively after each batch
      setDistrictRisks(prev => ({ ...prev, ...results }));
    }
    setLoading(false);
  }

  const sw = lang === 'sw';

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>🗺️ {t.riskMap}</div>

      {/* Layer switcher */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { id: 'overall', label: t.overallRisk, icon: '🌡️' },
          { id: 'malaria', label: t.malaria, icon: '🦟' },
          { id: 'flood', label: t.flood, icon: '🌊' },
          { id: 'drought', label: t.drought, icon: '🏜️' },
          { id: 'outbreak', label: t.outbreak, icon: '🦠' },
        ].map(l => (
          <button key={l.id} onClick={() => setLayer(l.id)}
            style={{ flex: '0 0 auto', padding: '6px 12px', borderRadius: 8, border: 'none', background: layer === l.id ? '#2563eb' : '#f3f4f6', color: layer === l.id ? '#fff' : '#374151', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
            {l.icon} {l.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', color: '#9ca3af', padding: 12, fontSize: 13 }}>Loading risk data...</div>}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {[['low', '🟢 Low'], ['medium', '🟡 Medium'], ['high', '🟠 High'], ['emergency', '🔴 Emergency']].map(([r, label]) => (
          <div key={r} style={{ fontSize: 11, background: riskBg(r), border: `1px solid ${riskColor(r)}40`, borderRadius: 99, padding: '3px 10px', color: riskColor(r), fontWeight: 500 }}>{label}</div>
        ))}
      </div>

      {/* District risk list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {districtList.map(d => {
          const info = districtRisks[d];
          if (!info) return (
            <div key={d} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.5 }}>
              <div style={{ fontSize: 13, color: '#374151' }}>{d}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>⟳ loading</div>
            </div>
          );
          if (info.risk === 'unknown') return (
            <div key={d} style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: '#374151' }}>{d}</div>
              <span style={{ fontSize: 11, color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: 99 }}>⚠ no data</span>
            </div>
          );
          return (
            <button key={d} onClick={() => setSelected(selected === d ? null : d)}
              style={{ background: selected === d ? riskBg(info.risk) : '#fff', border: `1px solid ${selected === d ? riskColor(info.risk) : '#e5e7eb'}`, borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{d}</div>
                {selected === d && info.rain7 !== undefined && (
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                    🌧️ {info.rain7?.toFixed(0)}mm · 🌡️ {Math.round(info.maxTemp || 0)}°C {info.hasStorm ? '· ⛈️ Storm' : ''}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: riskBg(info.risk), color: riskColor(info.risk), border: `1px solid ${riskColor(info.risk)}30` }}>
                {info.risk?.toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
