export const API = 'https://climate-health-system-backend.onrender.com';

export const DISTRICTS = [
  'Arusha','Dar es Salaam','Dodoma','Geita','Iringa','Kagera','Katavi',
  'Kigoma','Kilimanjaro','Lindi','Manyara','Mara','Mbeya','Morogoro',
  'Mtwara','Mwanza','Njombe','Pwani','Rukwa','Ruvuma','Shinyanga',
  'Simiyu','Singida','Songea','Tabora','Tanga',
  'Zanzibar North','Zanzibar South','Zanzibar West','Pemba North','Pemba South'
];

export const DISTRICT_COORDS = {
  'Iringa':        { lat: -7.77,   lon: 35.69  },
  'Dar es Salaam': { lat: -6.79,   lon: 39.21  },
  'Dodoma':        { lat: -6.17,   lon: 35.74  },
  'Mwanza':        { lat: -2.52,   lon: 32.92  },
  'Arusha':        { lat: -3.39,   lon: 36.68  },
  'Mbeya':         { lat: -8.91,   lon: 33.46  },
  'Morogoro':      { lat: -6.82,   lon: 37.66  },
  'Tanga':         { lat: -5.07,   lon: 39.10  },
  'Zanzibar West': { lat: -6.17,   lon: 39.20  },
  'Kilimanjaro':   { lat: -3.35,   lon: 37.33  },
  'Tabora':        { lat: -5.02,   lon: 32.80  },
  'Kigoma':        { lat: -4.88,   lon: 29.63  },
  'Lindi':         { lat: -9.99,   lon: 39.71  },
  'Mtwara':        { lat: -10.27,  lon: 40.18  },
  'Ruvuma':        { lat: -10.68,  lon: 35.65  },
  'Shinyanga':     { lat: -3.66,   lon: 33.42  },
  'Singida':       { lat: -4.82,   lon: 34.75  },
  'Rukwa':         { lat: -7.98,   lon: 32.03  },
  'Kagera':        { lat: -1.33,   lon: 31.82  },
  'Mara':          { lat: -1.77,   lon: 34.00  },
  'Geita':         { lat: -2.87,   lon: 32.23  },
  'Simiyu':        { lat: -2.63,   lon: 34.22  },
  'Njombe':        { lat: -9.33,   lon: 34.77  },
  'Pwani':         { lat: -7.07,   lon: 38.67  },
  'Manyara':       { lat: -3.70,   lon: 35.88  },
  'Katavi':        { lat: -6.33,   lon: 31.08  },
  'Songea':        { lat: -10.68,  lon: 35.65  },
  'Pemba North':   { lat: -5.03,   lon: 39.77  },
  'Pemba South':   { lat: -5.32,   lon: 39.72  },
  'Zanzibar North':{ lat: -5.72,   lon: 39.25  },
  'Zanzibar South':{ lat: -6.38,   lon: 39.52  },
};

export const T = {
  en: {
    home:'Home', weather:'Weather', symptoms:'Symptoms', clinics:'Clinics',
    map:'Risk Map', profile:'Profile', report:'Report',
    welcome:'Welcome', detect:'Detecting your location...',
    locationOk:'Region detected', locationDenied:'GPS unavailable. Please select your region above manually.',
    useGps:'Use GPS', riskThisWeek:'Health risk this week',
    weekForecast:'7-day forecast', dayForecast:'15-day forecast',
    currentConditions:'Current conditions', temperature:'Temperature',
    humidity:'Humidity', wind:'Wind Speed', rain7:'7-day Rain',
    healthAlerts:'Health Alerts', search:'Search',
    emergency:'Emergency', callEmergency:'Call 112',
    findClinics:'Find Clinics', whenToGo:'When to go to hospital',
    afyaGreet:"Hello! I'm Afya, your health assistant. How are you feeling today?",
    typeSymptoms:'Describe your symptoms...', typing:'Afya is typing...',
    symptomTags:['Fever','Headache','Cough','Dizziness','Nausea','Vomiting',
      'Diarrhoea','Body Aches','Chills','Rash','Sore Throat','Fatigue'],
    riskMap:'Climate Risk Map', overallRisk:'Overall', malaria:'Malaria',
    flood:'Flood', drought:'Drought', outbreak:'Outbreak',
    communityReport:'Community Report', news:'Health News',
    en:'EN', sw:'SW',
  },
  sw: {
    home:'Nyumbani', weather:'Hali ya Hewa', symptoms:'Dalili',
    clinics:'Kliniki', map:'Ramani ya Hatari', profile:'Wasifu', report:'Ripoti',
    welcome:'Karibu', detect:'Inagundua mahali pako...',
    locationOk:'Mkoa umegunduliwa', locationDenied:'GPS haikufanya kazi. Tafadhali chagua mkoa wako hapa chini.',
    useGps:'Tumia GPS', riskThisWeek:'Hatari ya afya wiki hii',
    weekForecast:'Utabiri wa siku 7', dayForecast:'Utabiri wa siku 15',
    currentConditions:'Hali ya sasa', temperature:'Joto',
    humidity:'Unyevu', wind:'Kasi ya Upepo', rain7:'Mvua siku 7',
    healthAlerts:'Taarifa za Afya', search:'Tafuta',
    emergency:'Dharura', callEmergency:'Piga simu 112',
    findClinics:'Tafuta Kliniki', whenToGo:'Kwenda hospitali lini',
    afyaGreet:'Habari! Mimi ni Afya, msaidizi wako wa afya. Unajisikiaje leo?',
    typeSymptoms:'Elezea dalili zako...', typing:'Afya anaandika...',
    symptomTags:['Homa','Maumivu ya kichwa','Kikohozi','Kizunguzungu',
      'Kichefuchefu','Kutapika','Kuharisha','Maumivu ya mwili',
      'Baridi','Upele','Koo kuwaka','Uchovu'],
    riskMap:'Ramani ya Hatari ya Hali ya Hewa', overallRisk:'Jumla',
    malaria:'Malaria', flood:'Mafuriko', drought:'Ukame', outbreak:'Mlipuko',
    communityReport:'Ripoti ya Jamii', news:'Habari za Afya',
    en:'EN', sw:'SW',
  }
};

export function getRisk(rain7, maxTemp, hasStorm, maxDaily) {
  if (hasStorm && maxDaily > 50) return 'emergency';
  if (rain7 > 60 || (hasStorm && maxDaily > 25)) return 'high';
  if (rain7 > 25 || maxTemp > 36) return 'medium';
  return 'low';
}
export function riskColor(r) {
  return { emergency:'#ef4444', high:'#f59e0b', medium:'#3b82f6', low:'#22c55e' }[r] || '#9ca3af';
}
export function riskBg(r) {
  return { emergency:'#fef2f2', high:'#fffbeb', medium:'#eff6ff', low:'#f0fdf4' }[r] || '#f9fafb';
}
export function stripMarkdown(text) {
  return text.replace(/\*\*(.*?)\*\*/g,'$1').replace(/\*(.*?)\*/g,'$1')
    .replace(/#{1,6}\s/g,'').replace(/\^\^(.*?)\^\^/g,'$1')
    .replace(/`(.*?)`/g,'$1').trim();
}
export function findNearestDistrict(lat, lon) {
  let best = 'Dar es Salaam', bestDist = Infinity;
  for (const [name, c] of Object.entries(DISTRICT_COORDS)) {
    const d = Math.hypot(c.lat - lat, c.lon - lon);
    if (d < bestDist) { bestDist = d; best = name; }
  }
  return best;
}
export async function reverseGeocode(lat, lon) {
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
    };
  } catch { return { region:'', district:'', street:'' }; }
}
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
export function formatTime(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes/60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
