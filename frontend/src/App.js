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
    { name: 'Iringa Regional Referral Hospital', type: 'hospital', phone: '+255262702285', hours: '24/7', address: 'Iringa Town', lat: -7.7701, lon: 35.6937 },
    { name: 'Tosamaganga Hospital', type: 'hospital', phone: '+255262702100', hours: '24/7', address: 'Tosamaganga', lat: -7.8023, lon: 35.6521 },
    { name: 'Iringa Urban Health Centre', type: 'clinic', phone: '+255262702300', hours: '7am–9pm', address: 'Iringa Town', lat: -7.7680, lon: 35.6920 },
    { name: 'Kilolo District Hospital', type: 'hospital', phone: '+255262920100', hours: '24/7', address: 'Kilolo', lat: -7.9167, lon: 36.9833 },
  ],
  'Dar es Salaam': [
    { name: 'Muhimbili National Hospital', type: 'hospital', phone: '+255222150610', hours: '24/7', address: 'Upanga', lat: -6.8005, lon: 39.2730 },
    { name: 'Amana Regional Hospital', type: 'hospital', phone: '+255222861810', hours: '24/7', address: 'Ilala', lat: -6.8235, lon: 39.2695 },
    { name: 'Mwananyamala Regional Hospital', type: 'hospital', phone: '+255222700056', hours: '24/7', address: 'Kinondoni', lat: -6.7726, lon: 39.2368 },
    { name: 'Temeke District Hospital', type: 'hospital', phone: '+255222852017', hours: '24/7', address: 'Temeke', lat: -6.8710, lon: 39.2627 },
  ],
  'Dodoma': [
    { name: 'Benjamin Mkapa Hospital', type: 'hospital', phone: '+255262321666', hours: '24/7', address: 'Dodoma', lat: -6.1731, lon: 35.7394 },
    { name: 'Dodoma Regional Hospital', type: 'hospital', phone: '+255262321234', hours: '24/7', address: 'Dodoma', lat: -6.1800, lon: 35.7450 },
  ],
  'Mwanza': [
    { name: 'Bugando Medical Centre', type: 'hospital', phone: '+255282500611', hours: '24/7', address: 'Bugando Hill', lat: -2.5133, lon: 32.8997 },
    { name: 'Mwanza Regional Hospital', type: 'hospital', phone: '+255282500100', hours: '24/7', address: 'Mwanza', lat: -2.5167, lon: 32.9000 },
  ],
  'Arusha': [
    { name: 'Mount Meru Regional Hospital', type: 'hospital', phone: '+255272508321', hours: '24/7', address: 'Arusha', lat: -3.3667, lon: 36.6833 },
    { name: 'Lutheran Hospital Arusha', type: 'hospital', phone: '+255272507398', hours: '24/7', address: 'Arusha', lat: -3.3700, lon: 36.6900 },
    { name: 'Selian Lutheran Hospital', type: 'hospital', phone: '+255272553000', hours: '24/7', address: 'Selian', lat: -3.3200, lon: 36.6500 },
  ],
  'Mbeya': [
    { name: 'Mbeya Zonal Referral Hospital', type: 'hospital', phone: '+255252503567', hours: '24/7', address: 'Mbeya', lat: -8.9094, lon: 33.4607 },
    { name: 'Mbeya Regional Hospital', type: 'hospital', phone: '+255252503200', hours: '24/7', address: 'Mbeya', lat: -8.9150, lon: 33.4650 },
  ],
  'Morogoro': [
    { name: 'Morogoro Regional Hospital', type: 'hospital', phone: '+255232600320', hours: '24/7', address: 'Morogoro', lat: -6.8218, lon: 37.6619 },
    { name: 'Kilosa District Hospital', type: 'hospital', phone: '+255232401100', hours: '24/7', address: 'Kilosa', lat: -6.8333, lon: 36.9833 },
  ],
  'Tanga': [
    { name: 'Bombo Regional Hospital', type: 'hospital', phone: '+255272643640', hours: '24/7', address: 'Tanga', lat: -5.0688, lon: 39.0987 },
    { name: 'Muheza District Hospital', type: 'hospital', phone: '+255272644100', hours: '24/7', address: 'Muheza', lat: -4.9833, lon: 38.7833 },
  ],
  'Kilimanjaro': [
    { name: 'KCMC (Kilimanjaro Christian Medical Centre)', type: 'hospital', phone: '+255272754377', hours: '24/7', address: 'Moshi', lat: -3.3500, lon: 37.3333 },
    { name: 'Moshi District Hospital', type: 'hospital', phone: '+255272752324', hours: '24/7', address: 'Moshi', lat: -3.3533, lon: 37.3400 },
  ],
  'Tabora': [
    { name: 'Tabora Regional Referral Hospital', type: 'hospital', phone: '+255262604255', hours: '24/7', address: 'Tabora', lat: -5.0167, lon: 32.8000 },
    { name: 'Igunga District Hospital', type: 'hospital', phone: '+255262662100', hours: '24/7', address: 'Igunga', lat: -4.2833, lon: 33.3167 },
    { name: 'Nzega District Hospital', type: 'hospital', phone: '+255262663100', hours: '24/7', address: 'Nzega', lat: -4.2167, lon: 33.1833 },
  ],
  'Kigoma': [
    { name: 'Maweni Regional Hospital', type: 'hospital', phone: '+255282780360', hours: '24/7', address: 'Kigoma', lat: -4.8833, lon: 29.6333 },
    { name: 'Kibondo District Hospital', type: 'hospital', phone: '+255282842100', hours: '24/7', address: 'Kibondo', lat: -3.5833, lon: 30.6833 },
  ],
  'Lindi': [
    { name: 'Lindi Regional Referral Hospital', type: 'hospital', phone: '+255232202500', hours: '24/7', address: 'Lindi', lat: -9.9989, lon: 39.7144 },
    { name: 'Liwale District Hospital', type: 'hospital', phone: '+255232403100', hours: '24/7', address: 'Liwale', lat: -9.7667, lon: 37.9167 },
  ],
  'Mtwara': [
    { name: 'Mtwara Regional Hospital', type: 'hospital', phone: '+255232333500', hours: '24/7', address: 'Mtwara', lat: -10.2667, lon: 40.1833 },
    { name: 'Masasi District Hospital', type: 'hospital', phone: '+255232510100', hours: '24/7', address: 'Masasi', lat: -10.7167, lon: 38.8000 },
    { name: 'Newala District Hospital', type: 'hospital', phone: '+255232520100', hours: '24/7', address: 'Newala', lat: -10.9333, lon: 39.2833 },
  ],
  'Ruvuma': [
    { name: 'Songea Regional Hospital', type: 'hospital', phone: '+255252602500', hours: '24/7', address: 'Songea', lat: -10.6833, lon: 35.6500 },
    { name: 'Mbinga District Hospital', type: 'hospital', phone: '+255252640100', hours: '24/7', address: 'Mbinga', lat: -10.9167, lon: 35.0167 },
  ],
  'Shinyanga': [
    { name: 'Shinyanga Regional Hospital', type: 'hospital', phone: '+255276003100', hours: '24/7', address: 'Shinyanga', lat: -3.6636, lon: 33.4230 },
    { name: 'Kahama District Hospital', type: 'hospital', phone: '+255276003400', hours: '24/7', address: 'Kahama', lat: -3.8333, lon: 32.6000 },
  ],
  'Singida': [
    { name: 'Singida Regional Hospital', type: 'hospital', phone: '+255262502600', hours: '24/7', address: 'Singida', lat: -4.8189, lon: 34.7484 },
    { name: 'Manyoni District Hospital', type: 'hospital', phone: '+255262532100', hours: '24/7', address: 'Manyoni', lat: -5.7500, lon: 34.8333 },
  ],
  'Rukwa': [
    { name: 'Sumbawanga Regional Hospital', type: 'hospital', phone: '+255282802500', hours: '24/7', address: 'Sumbawanga', lat: -7.9667, lon: 31.6167 },
    { name: 'Nkasi District Hospital', type: 'hospital', phone: '+255282804100', hours: '24/7', address: 'Nkasi', lat: -7.3833, lon: 30.6167 },
  ],
  'Kagera': [
    { name: 'Kagera Regional Hospital', type: 'hospital', phone: '+255282222500', hours: '24/7', address: 'Bukoba', lat: -1.3322, lon: 31.8197 },
    { name: 'Biharamulo District Hospital', type: 'hospital', phone: '+255282310100', hours: '24/7', address: 'Biharamulo', lat: -2.6333, lon: 31.3000 },
  ],
  'Katavi': [
    { name: 'Mpanda Regional Hospital', type: 'hospital', phone: '+255282602500', hours: '24/7', address: 'Mpanda', lat: -6.3500, lon: 31.0667 },
  ],
  'Manyara': [
    { name: 'Babati District Hospital', type: 'hospital', phone: '+255272553200', hours: '24/7', address: 'Babati', lat: -3.7833, lon: 35.7500 },
    { name: 'Hanang District Hospital', type: 'hospital', phone: '+255272554100', hours: '24/7', address: 'Hanang', lat: -4.4333, lon: 35.4000 },
  ],
  'Mara': [
    { name: 'Musoma Regional Hospital', type: 'hospital', phone: '+255282622500', hours: '24/7', address: 'Musoma', lat: -1.5000, lon: 33.8000 },
    { name: 'Tarime District Hospital', type: 'hospital', phone: '+255282640100', hours: '24/7', address: 'Tarime', lat: -1.3500, lon: 34.1667 },
  ],
  'Geita': [
    { name: 'Geita District Hospital', type: 'hospital', phone: '+255282320100', hours: '24/7', address: 'Geita', lat: -2.8667, lon: 32.2333 },
  ],
  'Njombe': [
    { name: 'Njombe Regional Hospital', type: 'hospital', phone: '+255262702900', hours: '24/7', address: 'Njombe', lat: -9.3333, lon: 34.7667 },
    { name: 'Makete District Hospital', type: 'hospital', phone: '+255262703100', hours: '24/7', address: 'Makete', lat: -9.0167, lon: 34.0333 },
  ],
  'Pwani': [
    { name: 'Coast Regional Hospital', type: 'hospital', phone: '+255232402500', hours: '24/7', address: 'Kibaha', lat: -6.7667, lon: 38.9167 },
    { name: 'Rufiji District Hospital', type: 'hospital', phone: '+255232403100', hours: '24/7', address: 'Utete', lat: -7.9833, lon: 38.7667 },
  ],
  'Simiyu': [
    { name: 'Bariadi District Hospital', type: 'hospital', phone: '+255282752100', hours: '24/7', address: 'Bariadi', lat: -2.8000, lon: 34.0667 },
  ],
  'Songea': [
    { name: 'Songea Regional Hospital', type: 'hospital', phone: '+255252602500', hours: '24/7', address: 'Songea', lat: -10.6833, lon: 35.6500 },
  ],
  'Zanzibar West': [
    { name: 'Mnazi Mmoja Hospital', type: 'hospital', phone: '+255242230114', hours: '24/7', address: 'Stone Town', lat: -6.1659, lon: 39.1897 },
    { name: 'Kidongo Chekundu Health Centre', type: 'clinic', phone: '+255242230500', hours: '24/7', address: 'Zanzibar Town', lat: -6.1600, lon: 39.1950 },
  ],
  'Zanzibar North': [
    { name: 'Kivunge District Hospital', type: 'hospital', phone: '+255242234100', hours: '24/7', address: 'Kivunge', lat: -5.7167, lon: 39.2500 },
  ],
  'Zanzibar South': [
    { name: 'Makunduchi District Hospital', type: 'hospital', phone: '+255242235100', hours: '24/7', address: 'Makunduchi', lat: -6.3833, lon: 39.5333 },
  ],
  'Pemba North': [
    { name: 'Chake Chake Regional Hospital', type: 'hospital', phone: '+255242452500', hours: '24/7', address: 'Chake Chake', lat: -5.0333, lon: 39.7667 },
  ],
  'Pemba South': [
    { name: 'Mkoani District Hospital', type: 'hospital', phone: '+255242453100', hours: '24/7', address: 'Mkoani', lat: -5.3667, lon: 39.6500 },
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

// Reverse geocoding — converts GPS coordinates to region/district/street
async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'AfyaHewa/1.0' } }
    );
    const data = await res.json();
    const addr = data.address || {};
    return {
      region:   addr.state || addr.region || addr.county || '',
      district: addr.county || addr.city_district || addr.suburb || addr.town || addr.city || '',
      street:   addr.road || addr.neighbourhood || addr.village || addr.hamlet || '',
      display:  data.display_name || ''
    };
  } catch {
    return { region: '', district: '', street: '', display: '' };
  }
}

// Get distance + time from user to clinic using OSRM (free, no API key)
async function getRouteInfo(userLat, userLon, clinicLat, clinicLon) {
  try {
    // Try driving route first
    const driveUrl = `https://router.project-osrm.org/route/v1/driving/${userLon},${userLat};${clinicLon},${clinicLat}?overview=false`;
    const driveRes = await fetch(driveUrl);
    const driveData = await driveRes.json();

    // Also get walking route
    const walkUrl = `https://router.project-osrm.org/route/v1/foot/${userLon},${userLat};${clinicLon},${clinicLat}?overview=false`;
    const walkRes = await fetch(walkUrl);
    const walkData = await walkRes.json();

    const driveDist = driveData.routes?.[0]?.distance || 0; // meters
    const driveTime = driveData.routes?.[0]?.duration || 0; // seconds
    const walkDist  = walkData.routes?.[0]?.distance || driveDist;
    const walkTime  = walkData.routes?.[0]?.duration || 0;

    return {
      driveKm:   (driveDist / 1000).toFixed(1),
      driveMin:  Math.ceil(driveTime / 60),
      walkKm:    (walkDist / 1000).toFixed(1),
      walkMin:   Math.ceil(walkTime / 60),
      meters:    Math.round(driveDist),
    };
  } catch {
    // Fallback: straight-line distance (Haversine)
    const R = 6371000;
    const dLat = (clinicLat - userLat) * Math.PI / 180;
    const dLon = (clinicLon - userLon) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(userLat*Math.PI/180) * Math.cos(clinicLat*Math.PI/180) * Math.sin(dLon/2)**2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return {
      driveKm:  (dist/1000).toFixed(1),
      driveMin: Math.ceil(dist/1000/40*60),
      walkKm:   (dist/1000).toFixed(1),
      walkMin:  Math.ceil(dist/1000/5*60),
      meters:   Math.round(dist),
    };
  }
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
    // Wake up Render backend immediately on app load (free tier sleeps after 15min)
    fetch(`${API}/`).catch(() => {});
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function handleLangChange(l) { setLang(l); localStorage.setItem('afya_lang', l); }
  function handleDistrictChange(d) { setDistrict(d); localStorage.setItem('afya_district', d); }

  if (showAdmin) return <AdminDashboard lang={lang} onClose={() => { window.location.hash = ''; setShowAdmin(false); }} />;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f3f4f6' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

  useEffect(() => {
    // Always load weather on mount using current district
    if (district) fetchWeather(district);
    // Then try GPS to refine
    detectLocation();
  }, []);

  useEffect(() => {
    if (district) fetchWeather(district);
  }, [district]);

  function detectLocation() {
    if (!navigator.geolocation) return;
    setGpsStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords;
        // Find nearest district from our list
        const d = findNearestDistrict(latitude, longitude);
        onDistrictChange(d);
        // Also get detailed address via reverse geocoding
        const geo = await reverseGeocode(latitude, longitude);
        if (geo.region) {
          // Try to match reverse geocoded region to our district list
          const match = DISTRICTS.find(dist =>
            dist.toLowerCase().includes(geo.region.toLowerCase()) ||
            geo.region.toLowerCase().includes(dist.toLowerCase())
          );
          if (match) onDistrictChange(match);
        }
        // Store detailed location for use in community reports
        localStorage.setItem('afya_geo_district', geo.district || '');
        localStorage.setItem('afya_geo_street', geo.street || '');
        localStorage.setItem('afya_geo_display', geo.display || '');
        setGpsStatus('ok');
      },
      () => setGpsStatus('denied'),
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  async function fetchWeather(d) {
    const c = DISTRICT_COORDS[d];
    if (!c) return;
    setLoading(true);
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${c.lat}&longitude=${c.lon}` +
        `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code` +
        `&timezone=Africa/Dar_es_Salaam&forecast_days=7`;
      const res  = await fetch(url);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.9 }}>
            <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 13 }}>{sw ? 'Inapakia hali ya hewa...' : 'Loading weather...'}</span>
          </div>
        ) : curr ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 6 }}>
              <div style={{ fontSize: 42, fontWeight: 700, lineHeight: 1 }}>{Math.round(curr.temperature_2m)}°C</div>
              <div style={{ fontSize: 12, opacity: 0.85, paddingBottom: 4 }}>
                <div>💧 {curr.relative_humidity_2m}% {sw ? 'Unyevu' : 'Humidity'}</div>
                <div>💨 {Math.round(curr.wind_speed_10m)} km/h {sw ? 'Upepo' : 'Wind'}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>
              {sw ? 'Hisi kama' : 'Feels like'} {Math.round(curr.apparent_temperature)}°C · 
              {daily?.precipitation_sum?.[0] > 0.5
                ? ` 🌧️ ${daily.precipitation_sum[0].toFixed(1)}mm ${sw ? 'mvua leo' : 'rain today'}`
                : ` ☀️ ${sw ? 'Hakuna mvua leo' : 'No rain today'}`}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', display: 'inline-block', padding: '4px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
              {risk.toUpperCase()} {sw ? 'HATARI' : 'RISK'}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, opacity: 0.85 }}>📍 {district} — {sw ? 'Data haipatikani' : 'Could not load weather'}</div>
        )}
      </div>

      {/* Health alerts from weather data */}
      {curr && (() => {
        const alerts = [];
        const todayRain = daily?.precipitation_sum?.[0] || 0;
        const rain7     = daily?.precipitation_sum?.reduce((a,b) => a+b, 0) || 0;
        const maxTemp   = daily ? Math.max(...(daily.temperature_2m_max || [0])) : 0;
        const hasStorm  = daily?.weather_code?.some(c => c >= 95) || false;
        const heavyDays = (daily?.precipitation_sum || []).filter(r => r > 25).length;

        if (hasStorm)           alerts.push({ icon: '⛈️', color: '#ef4444', bg: '#fef2f2', border: '#fecaca', text: sw ? 'Dhoruba inatarajiwa — kaa ndani ikiwa inawezekana' : 'Storm expected — stay indoors if possible' });
        if (todayRain > 20)     alerts.push({ icon: '🌧️', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', text: sw ? `Mvua nzito leo (${todayRain.toFixed(0)}mm) — tahadhari mafuriko` : `Heavy rain today (${todayRain.toFixed(0)}mm) — flood risk` });
        if (rain7 > 40 || heavyDays >= 2) alerts.push({ icon: '🦟', color: '#d97706', bg: '#fffbeb', border: '#fde68a', text: sw ? 'Hatari ya malaria imeongezeka wiki hii — lala chini ya neti' : 'Elevated malaria risk this week — sleep under a net' });
        if (rain7 > 60)         alerts.push({ icon: '💧', color: '#0e7490', bg: '#ecfeff', border: '#a5f3fc', text: sw ? 'Hatari ya kipindupindu — tumia maji safi tu' : 'Cholera risk elevated — use clean water only' });
        if (maxTemp > 36)       alerts.push({ icon: '🌡️', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', text: sw ? `Joto kali linatarajiwa (${Math.round(maxTemp)}°C) — kunywa maji mengi` : `Extreme heat expected (${Math.round(maxTemp)}°C) — stay hydrated` });
        if (curr.relative_humidity_2m < 30) alerts.push({ icon: '🏜️', color: '#92400e', bg: '#fef3c7', border: '#fcd34d', text: sw ? 'Hewa kavu — hatari ya matatizo ya kupumua' : 'Dry air — risk of respiratory issues' });

        if (alerts.length === 0) return (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <div style={{ fontSize: 12, color: '#166534', fontWeight: 500 }}>{sw ? 'Hakuna taarifa za afya kwa leo' : 'No health alerts for today'}</div>
          </div>
        );

        return (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              🔔 {sw ? 'Taarifa za Afya' : 'Health Alerts'} · {district}
            </div>
            {alerts.map((a, i) => (
              <div key={i} style={{ background: a.bg, border: `1px solid ${a.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 6, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, lineHeight: 1.2 }}>{a.icon}</span>
                <div style={{ fontSize: 12, color: a.color, fontWeight: 500, lineHeight: 1.4 }}>{a.text}</div>
              </div>
            ))}
          </div>
        );
      })()}

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
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude, longitude } = pos.coords;
      const d = findNearestDistrict(latitude, longitude);
      // Try reverse geocoding for better accuracy
      const geo = await reverseGeocode(latitude, longitude);
      const match = geo.region ? DISTRICTS.find(dist =>
        dist.toLowerCase().includes(geo.region.toLowerCase()) ||
        geo.region.toLowerCase().includes(dist.toLowerCase())
      ) : null;
      const best = match || d;
      setSelectedDistrict(best);
      onDistrictChange(best);
      fetchWeather(best);
    }, () => {}, { enableHighAccuracy: true });
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
  const [userLocation, setUserLocation] = useState(null);
  const [routeInfo, setRouteInfo] = useState({});
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const sw = lang === 'sw';

  function search() {
    onDistrictChange(selectedDistrict);
    const clinics = CLINICS_DATA[selectedDistrict] || [];
    setData(clinics);
    setRouteInfo({});
    getUserLocation(clinics);
  }

  // Straight-line distance fallback (instant, no API needed)
  function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function getUserLocation(clinics) {
    if (!navigator.geolocation) {
      // No GPS support — show manual button
      setGettingLocation(false);
      return;
    }
    setGettingLocation(true);

    // Helper: calculate routes from known coordinates
    function calcRoutes(latitude, longitude, clinicList) {
      const routes = {};
      (clinicList || []).forEach((c, i) => {
        if (c.lat && c.lon) {
          const straightLine = haversineDistance(latitude, longitude, c.lat, c.lon);
          const roadDist = straightLine * 1.3; // road factor
          const driveKm  = roadDist / 1000;
          const walkKm   = roadDist / 1000;
          routes[i] = {
            meters:    Math.round(roadDist),
            driveKm:   driveKm.toFixed(1),
            driveMin:  Math.max(1, Math.ceil(driveKm / 35 * 60)), // 35 km/h driving
            walkKm:    walkKm.toFixed(1),
            walkMin:   Math.max(1, Math.ceil(walkKm / 5 * 60)),   // 5 km/h walking
            isEstimate: true,
          };
        }
      });
      return routes;
    }

    // Use watchPosition for mobile compatibility — gets first fix then stops
    const watcher = navigator.geolocation.watchPosition(
      async pos => {
        navigator.geolocation.clearWatch(watcher);
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lon: longitude });
        setGettingLocation(false);

        // Step 1 — instant straight-line estimates (works on ALL devices)
        const instantRoutes = calcRoutes(latitude, longitude, clinics);
        setRouteInfo({ ...instantRoutes });

        // Step 2 — try OSRM for real road distances (optional upgrade)
        setLoadingRoutes(true);
        try {
          const betterRoutes = { ...instantRoutes };
          const fetchWithTimeout = (url, ms) => {
            return new Promise((resolve, reject) => {
              const timer = setTimeout(() => reject(new Error('timeout')), ms);
              fetch(url)
                .then(r => { clearTimeout(timer); resolve(r); })
                .catch(e => { clearTimeout(timer); reject(e); });
            });
          };

          await Promise.all((clinics || []).map(async (c, i) => {
            if (!c.lat || !c.lon) return;
            try {
              const url = `https://router.project-osrm.org/route/v1/driving/${longitude},${latitude};${c.lon},${c.lat}?overview=false`;
              const res  = await fetchWithTimeout(url, 7000);
              const data = await res.json();
              const dist = data.routes?.[0]?.distance;
              const time = data.routes?.[0]?.duration;
              if (dist && time) {
                const driveKm = dist / 1000;
                betterRoutes[i] = {
                  meters:    Math.round(dist),
                  driveKm:   driveKm.toFixed(1),
                  driveMin:  Math.max(1, Math.ceil(time / 60)),
                  walkKm:    driveKm.toFixed(1),
                  walkMin:   Math.max(1, Math.ceil(driveKm / 5 * 60)),
                  isEstimate: false,
                };
              }
            } catch { /* keep estimate */ }
          }));
          setRouteInfo({ ...betterRoutes });
        } catch { /* keep estimates */ }
        setLoadingRoutes(false);
      },
      (err) => {
        // GPS denied or failed on mobile
        setGettingLocation(false);
        console.warn('GPS error:', err.code, err.message);
      },
      {
        enableHighAccuracy: false, // false = faster on mobile, uses network location
        timeout: 15000,
        maximumAge: 60000,        // accept cached position up to 1 min old
      }
    );

    // Safety timeout — if watchPosition never fires after 15s, stop waiting
    setTimeout(() => {
      navigator.geolocation.clearWatch(watcher);
      setGettingLocation(false);
    }, 16000);
  }

  function formatDistance(info, useWalk = false) {
    if (!info) return null;
    const km = useWalk ? parseFloat(info.walkKm) : parseFloat(info.driveKm);
    const meters = info.meters;
    if (meters < 1000) return `${meters}m`;
    return `${km.toFixed(1)}km`;
  }

  function formatTime(minutes) {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  }

  function openDirections(clinic) {
    if (userLocation) {
      window.open(
        `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lon}/${clinic.lat},${clinic.lon}`,
        '_blank'
      );
    } else {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(clinic.name + ' ' + clinic.address)}`, '_blank');
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>🏥 {t.clinics}</div>

      {/* Emergency banner */}
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#991b1b' }}>🚨 {t.emergency}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Ambulance · Police · Fire</div>
        </div>
        <a href="tel:112" style={{ background: '#ef4444', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>{t.callEmergency}</a>
      </div>

      {/* Search */}
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

      {/* Location status */}
      {data && (
        <div style={{ marginBottom: 12 }}>
          {gettingLocation && (
            <div style={{ fontSize: 12, color: '#1d4ed8', background: '#eff6ff', borderRadius: 8, padding: '8px 12px' }}>
              ⟳ {sw ? 'Inapata eneo lako...' : 'Getting your location...'}
            </div>
          )}
          {loadingRoutes && !gettingLocation && (
            <div style={{ fontSize: 12, color: '#1d4ed8', background: '#eff6ff', borderRadius: 8, padding: '8px 12px' }}>
              ⟳ {sw ? 'Inakokotoa umbali halisi...' : 'Calculating road distances...'}
            </div>
          )}
          {userLocation && Object.keys(routeInfo).length > 0 && (() => {
            // Check if user is far from selected region (first clinic distance)
            const firstRoute = routeInfo[0];
            const isFar = firstRoute && firstRoute.meters > 50000; // more than 50km
            return isFar ? (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 2 }}>
                  ⚠️ {sw ? 'Uko mbali na mkoa huu' : 'You are far from this region'}
                </div>
                <div style={{ fontSize: 11, color: '#92400e' }}>
                  {sw
                    ? `Umbali wa km ${firstRoute.driveKm} kutoka kwako. Je, unatafuta kliniki karibu nawe?`
                    : `You are ${firstRoute.driveKm}km away. Are you looking for clinics near your current location?`}
                </div>
                <button onClick={() => {
                  // Auto-switch to nearest region
                  if (userLocation) {
                    const nearest = findNearestDistrict(userLocation.lat, userLocation.lon);
                    setSelectedDistrict(nearest);
                    onDistrictChange(nearest);
                    const nearClinics = CLINICS_DATA[nearest] || [];
                    setData(nearClinics);
                    setRouteInfo({});
                    getUserLocation(nearClinics);
                  }
                }}
                  style={{ marginTop: 8, fontSize: 11, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>
                  📍 {sw ? 'Nionyeshe kliniki karibu nami' : 'Show clinics near me'}
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#166534', background: '#f0fdf4', borderRadius: 8, padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📍 {sw ? 'Umbali kutoka kwako' : 'Distances from your location'}</span>
                <button onClick={() => getUserLocation(data)}
                  style={{ fontSize: 11, background: 'none', border: 'none', color: '#166534', cursor: 'pointer', textDecoration: 'underline' }}>
                  {sw ? 'Sasisha' : 'Refresh'}
                </button>
              </div>
            );
          })()}
          {!userLocation && !gettingLocation && (
            <button onClick={() => getUserLocation(data)}
              style={{ width: '100%', padding: '9px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#374151', cursor: 'pointer', fontWeight: 500 }}>
              📍 {sw ? 'Pata umbali kutoka kwako' : 'Get distance from my location'}
            </button>
          )}
        </div>
      )}

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

      {/* Clinic cards */}
      {data && data.map((c, i) => {
        const route = routeInfo[i];
        const isNear = route && route.meters < 2000;
        return (
          <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ flex: 1, marginRight: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 2 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>{c.address}</div>
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

            {/* Distance & time info */}
            {route && (
              <div style={{ background: isNear ? '#f0fdf4' : '#f9fafb', border: `1px solid ${isNear ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 16 }}>🚶</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{formatDistance(route, true)} · {formatTime(route.walkMin)}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>{sw ? 'Kutembea' : 'Walking'}</div>
                    </div>
                  </div>
                  <div style={{ width: 1, height: 28, background: '#e5e7eb' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 16 }}>🚗</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{formatDistance(route, false)} · {formatTime(route.driveMin)}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>{sw ? 'Gari' : 'Driving'}</div>
                    </div>
                  </div>
                  {isNear && <span style={{ fontSize: 11, color: '#166534', fontWeight: 600, background: '#dcfce7', padding: '2px 8px', borderRadius: 99 }}>✓ {sw ? 'Karibu' : 'Nearby'}</span>}
                  {route.isEstimate && <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 'auto' }}>~{sw ? 'Kadirio' : 'estimate'}</span>}
                </div>
              </div>
            )}

            {/* Directions button */}
            {c.lat && (
              <button onClick={() => openDirections(c)}
                style={{ width: '100%', padding: '8px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1d4ed8', cursor: 'pointer', fontWeight: 500 }}>
                🗺️ {sw ? 'Ona Njia kwenye Ramani' : 'Get Directions on Map'}
              </button>
            )}
          </div>
        );
      })}

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
