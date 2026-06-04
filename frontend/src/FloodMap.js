import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ─── FLOOD ZONE BASE DATA ─────────────────────────────────────────
// baseRisk = historical/terrain risk before weather adjustment
const FLOOD_ZONES = [
  // Dar es Salaam
  { id:'dsm_msimbazi', name:'Msimbazi River Basin', district:'Dar es Salaam',
    baseRisk:'high', districtCoords:{lat:-6.7924,lon:39.2083},
    description:'Low-lying area prone to flash floods. Msimbazi River overflows regularly during heavy rain.',
    affected:'~50,000 residents',
    coordinates:[[-6.82,39.27],[-6.85,39.28],[-6.86,39.25],[-6.83,39.24]] },
  { id:'dsm_jangwani', name:'Jangwani Low-lying Area', district:'Dar es Salaam',
    baseRisk:'emergency', districtCoords:{lat:-6.7924,lon:39.2083},
    description:'Extremely flood-prone. Floods almost every rainy season. Avoid during heavy rain.',
    affected:'~20,000 residents',
    coordinates:[[-6.80,39.26],[-6.82,39.27],[-6.83,39.25],[-6.81,39.24]] },
  { id:'dsm_temeke', name:'Temeke Coastal Zone', district:'Dar es Salaam',
    baseRisk:'medium', districtCoords:{lat:-6.7924,lon:39.2083},
    description:'Coastal flooding risk during high tides combined with heavy rainfall.',
    affected:'~30,000 residents',
    coordinates:[[-6.87,39.30],[-6.90,39.32],[-6.92,39.30],[-6.89,39.28]] },
  // Morogoro
  { id:'morogoro_kilombero', name:'Kilombero Valley', district:'Morogoro',
    baseRisk:'high', districtCoords:{lat:-6.8218,lon:37.6619},
    description:'Major flood plain. Kilombero River regularly floods vast agricultural areas.',
    affected:'~100,000 residents',
    coordinates:[[-8.10,36.30],[-8.20,36.50],[-8.30,36.40],[-8.15,36.20]] },
  { id:'morogoro_rufiji', name:'Rufiji River Basin', district:'Morogoro',
    baseRisk:'high', districtCoords:{lat:-6.8218,lon:37.6619},
    description:'Rufiji River basin floods during long rains. Major risk to downstream communities.',
    affected:'~80,000 residents',
    coordinates:[[-7.80,37.20],[-7.90,37.40],[-8.00,37.30],[-7.85,37.10]] },
  // Pwani
  { id:'pwani_rufiji_delta', name:'Rufiji River Delta', district:'Pwani',
    baseRisk:'emergency', districtCoords:{lat:-7.0,lon:38.5},
    description:'Delta area floods severely every year. Communities at extreme risk during cyclones.',
    affected:'~60,000 residents',
    coordinates:[[-7.90,39.20],[-8.00,39.40],[-8.10,39.30],[-7.95,39.10]] },
  { id:'pwani_kibiti', name:'Kibiti Flood Plain', district:'Pwani',
    baseRisk:'high', districtCoords:{lat:-7.0,lon:38.5},
    description:'Low-lying coastal plain prone to flooding from both rivers and sea.',
    affected:'~25,000 residents',
    coordinates:[[-7.70,38.90],[-7.80,39.00],[-7.85,38.95],[-7.75,38.85]] },
  // Iringa
  { id:'iringa_ruaha', name:'Ruaha River Banks', district:'Iringa',
    baseRisk:'high', districtCoords:{lat:-7.77,lon:35.69},
    description:'Great Ruaha River floods downstream communities and farmland during heavy rains.',
    affected:'~40,000 residents',
    coordinates:[[-7.60,35.50],[-7.70,35.70],[-7.80,35.60],[-7.65,35.40]] },
  { id:'iringa_mtera', name:'Mtera Dam Area', district:'Iringa',
    baseRisk:'medium', districtCoords:{lat:-7.77,lon:35.69},
    description:'Communities downstream of Mtera Dam at risk during dam overflow or controlled releases.',
    affected:'~15,000 residents',
    coordinates:[[-7.10,35.80],[-7.20,35.90],[-7.25,35.85],[-7.15,35.75]] },
  // Tanga
  { id:'tanga_pangani', name:'Pangani River Delta', district:'Tanga',
    baseRisk:'high', districtCoords:{lat:-5.0688,lon:39.0987},
    description:'Pangani River delta floods coastal communities during Indian Ocean high tides.',
    affected:'~35,000 residents',
    coordinates:[[-5.40,38.95],[-5.50,39.05],[-5.55,39.00],[-5.45,38.90]] },
  // Mwanza
  { id:'mwanza_victoria', name:'Lake Victoria Shoreline', district:'Mwanza',
    baseRisk:'medium', districtCoords:{lat:-2.5164,lon:32.9175},
    description:'Rising Lake Victoria levels flood shoreline communities and fishing villages.',
    affected:'~45,000 residents',
    coordinates:[[-2.40,32.85],[-2.50,32.95],[-2.55,32.90],[-2.45,32.80]] },
  // Kigoma
  { id:'kigoma_tanganyika', name:'Lake Tanganyika Shoreline', district:'Kigoma',
    baseRisk:'medium', districtCoords:{lat:-4.8833,lon:29.6333},
    description:'Lake Tanganyika shoreline flooding affects fishing communities and port areas.',
    affected:'~20,000 residents',
    coordinates:[[-4.85,29.55],[-4.95,29.65],[-5.00,29.60],[-4.90,29.50]] },
  // Lindi
  { id:'lindi_lukuledi', name:'Lukuledi River Basin', district:'Lindi',
    baseRisk:'high', districtCoords:{lat:-9.9989,lon:39.7144},
    description:'Lukuledi River floods agricultural land and villages during long rains.',
    affected:'~30,000 residents',
    coordinates:[[-10.00,39.60],[-10.10,39.70],[-10.15,39.65],[-10.05,39.55]] },
  // Mtwara
  { id:'mtwara_coastal', name:'Mtwara Coastal Lowlands', district:'Mtwara',
    baseRisk:'medium', districtCoords:{lat:-10.2667,lon:40.1833},
    description:'Low-lying coastal areas flood during heavy rain combined with high tides.',
    affected:'~25,000 residents',
    coordinates:[[-10.25,40.15],[-10.35,40.25],[-10.40,40.20],[-10.30,40.10]] },
  // Dodoma
  { id:'dodoma_valley', name:'Dodoma Central Valley', district:'Dodoma',
    baseRisk:'low', districtCoords:{lat:-6.1722,lon:35.7395},
    description:'Occasional flash flooding in valley areas during intense short rains.',
    affected:'~10,000 residents',
    coordinates:[[-6.15,35.70],[-6.20,35.80],[-6.25,35.75],[-6.18,35.65]] },
  // Kagera
  { id:'kagera_river', name:'Kagera River Basin', district:'Kagera',
    baseRisk:'high', districtCoords:{lat:-1.4967,lon:31.3701},
    description:'Kagera River regularly floods border communities. Risk increases with Lake Victoria levels.',
    affected:'~55,000 residents',
    coordinates:[[-1.40,31.20],[-1.50,31.40],[-1.60,31.30],[-1.45,31.10]] },
  // Songea
  { id:'songea_ruvuma', name:'Ruvuma River Basin', district:'Songea',
    baseRisk:'high', districtCoords:{lat:-10.6833,lon:35.65},
    description:'Ruvuma River floods affect communities on both Tanzania and Mozambique banks.',
    affected:'~40,000 residents',
    coordinates:[[-10.80,35.50],[-10.90,35.70],[-11.00,35.60],[-10.85,35.40]] },
];

// ─── RISK CALCULATION ─────────────────────────────────────────────
function calculateDynamicRisk(baseRisk, weatherData) {
  if (!weatherData) return baseRisk;

  const dailyRain  = weatherData.daily.precipitation_sum[0] || 0;
  const totalRain  = weatherData.daily.precipitation_sum.reduce((a,b)=>a+b,0);
  const maxDaily   = Math.max(...weatherData.daily.precipitation_sum);
  const hasStorm   = weatherData.daily.weather_code.some(c=>c>=95);
  const consecDays = weatherData.daily.precipitation_sum.filter(r=>r>10).length;

  const scoreMap   = { low:1, medium:2, high:3, emergency:4 };
  let score        = scoreMap[baseRisk] || 1;

  // Increase risk based on current weather
  if (hasStorm && maxDaily > 50)   score = Math.min(score + 2, 4);
  else if (hasStorm && dailyRain > 25) score = Math.min(score + 2, 4);
  else if (maxDaily > 50)          score = Math.min(score + 2, 4);
  else if (dailyRain > 25)         score = Math.min(score + 1, 4);
  else if (totalRain > 80)         score = Math.min(score + 1, 4);
  else if (consecDays >= 4)        score = Math.min(score + 1, 4);

  // Decrease risk if very dry
  if (totalRain < 5 && !hasStorm)  score = Math.max(score - 1, 1);

  return ['low','medium','high','emergency'][score - 1];
}

function getRiskReason(baseRisk, dynamicRisk, weatherData, lang) {
  if (!weatherData) return '';
  const dailyRain = weatherData.daily.precipitation_sum[0] || 0;
  const totalRain = weatherData.daily.precipitation_sum.reduce((a,b)=>a+b,0);
  const hasStorm  = weatherData.daily.weather_code.some(c=>c>=95);

  if (dynamicRisk === baseRisk) {
    return lang==='en'
      ? 'Risk based on historical flood data for this area.'
      : 'Hatari inategemea data ya kihistoria ya mafuriko kwa eneo hili.';
  }

  const scoreMap = {low:1,medium:2,high:3,emergency:4};
  if (scoreMap[dynamicRisk] > scoreMap[baseRisk]) {
    if (hasStorm) return lang==='en'
      ? `Risk elevated: Thunderstorms + ${dailyRain.toFixed(0)}mm rain today.`
      : `Hatari imeongezeka: Radi + mvua ya ${dailyRain.toFixed(0)}mm leo.`;
    if (dailyRain > 25) return lang==='en'
      ? `Risk elevated: Heavy rain today (${dailyRain.toFixed(0)}mm).`
      : `Hatari imeongezeka: Mvua nzito leo (${dailyRain.toFixed(0)}mm).`;
    return lang==='en'
      ? `Risk elevated: ${totalRain.toFixed(0)}mm total rain this week.`
      : `Hatari imeongezeka: Mvua ya ${totalRain.toFixed(0)}mm wiki hii.`;
  }

  return lang==='en'
    ? 'Risk reduced: Dry conditions this week.'
    : 'Hatari imepungua: Hali kavu wiki hii.';
}

// ─── COLORS ──────────────────────────────────────────────────────
const RISK_STYLE = {
  low:       { color:'#16a34a', fillColor:'#22c55e', fillOpacity:0.25, weight:1.5 },
  medium:    { color:'#d97706', fillColor:'#f59e0b', fillOpacity:0.30, weight:1.5 },
  high:      { color:'#dc2626', fillColor:'#ef4444', fillOpacity:0.35, weight:2   },
  emergency: { color:'#7f1d1d', fillColor:'#991b1b', fillOpacity:0.45, weight:2.5 },
};

const PILL = {
  low:       { bg:'#dcfce7', color:'#166534' },
  medium:    { bg:'#fef9c3', color:'#854d0e' },
  high:      { bg:'#fee2e2', color:'#991b1b' },
  emergency: { bg:'#fca5a5', color:'#7f1d1d' },
};

function riskPill(risk, label) {
  const s = PILL[risk] || PILL.low;
  return (
    <span style={{ background:s.bg, color:s.color,
      padding:'2px 9px', borderRadius:99, fontSize:11, fontWeight:600 }}>
      {label}
    </span>
  );
}

// ─── FLY TO ───────────────────────────────────────────────────────
function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 1.0 });
  }, [center, zoom, map]);
  return null;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────
export default function FloodMap({ t, lang }) {
  const [weatherCache, setWeatherCache]     = useState({});
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [selectedZone, setSelectedZone]     = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [riskFilter, setRiskFilter]         = useState('all');
  const [userLocation, setUserLocation]     = useState(null);
  const [locating, setLocating]             = useState(false);
  const [mapCenter, setMapCenter]           = useState([-6.3, 35.0]);
  const [mapZoom, setMapZoom]               = useState(6);
  const [lastUpdated, setLastUpdated]       = useState(null);

  const rl = {
    en: { low:'Low', medium:'Medium', high:'High', emergency:'Emergency' },
    sw: { low:'Chini', medium:'Kati', high:'Juu', emergency:'Dharura' },
  }[lang] || { low:'Low', medium:'Medium', high:'High', emergency:'Emergency' };

  // Load weather for all unique districts
  useEffect(() => {
    async function loadAll() {
      setLoadingWeather(true);
      const uniqueDistricts = [...new Set(FLOOD_ZONES.map(z => z.district))];
      const cache = {};
      for (let i = 0; i < uniqueDistricts.length; i += 3) {
        const batch = uniqueDistricts.slice(i, i + 3);
        await Promise.all(batch.map(async (district) => {
          try {
            const zone = FLOOD_ZONES.find(z => z.district === district);
            if (!zone) return;
            const { lat, lon } = zone.districtCoords;
            const url =
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
              `&daily=precipitation_sum,weather_code,temperature_2m_max` +
              `&timezone=Africa%2FDar_es_Salaam&forecast_days=7`;
            const res  = await fetch(url);
            const data = await res.json();
            cache[district] = data;
            setWeatherCache(prev => ({ ...prev, [district]: data }));
          } catch(e) {}
        }));
      }
      setLoadingWeather(false);
      setLastUpdated(new Date().toLocaleTimeString());
    }
    loadAll();
  }, []);

  // Compute dynamic risks
  const zonesWithRisk = FLOOD_ZONES.map(zone => {
    const weather     = weatherCache[zone.district];
    const dynamicRisk = calculateDynamicRisk(zone.baseRisk, weather);
    const reason      = getRiskReason(zone.baseRisk, dynamicRisk, weather, lang);
    const elevated    = weather &&
      ['low','medium','high','emergency'].indexOf(dynamicRisk) >
      ['low','medium','high','emergency'].indexOf(zone.baseRisk);
    return { ...zone, dynamicRisk, reason, elevated, weather };
  });

  // Stats
  const stats = ['emergency','high','medium','low'].reduce((acc, r) => {
    acc[r] = zonesWithRisk.filter(z => z.dynamicRisk === r).length;
    return acc;
  }, {});

  // Filter
  const districts   = ['All', ...new Set(FLOOD_ZONES.map(z => z.district))];
  const visibleZones = zonesWithRisk.filter(z => {
    const d = selectedDistrict === 'All' || z.district === selectedDistrict;
    const r = riskFilter === 'all' || z.dynamicRisk === riskFilter;
    return d && r;
  });

  function focusZone(zone) {
    setSelectedZone(zone);
    const lat = zone.coordinates.reduce((s,c)=>s+c[0],0)/zone.coordinates.length;
    const lon = zone.coordinates.reduce((s,c)=>s+c[1],0)/zone.coordinates.length;
    setMapCenter([lat, lon]);
    setMapZoom(11);
  }

  function focusDistrict(district) {
    setSelectedDistrict(district);
    setSelectedZone(null);
    if (district !== 'All') {
      const zone = FLOOD_ZONES.find(z => z.district === district);
      if (zone) {
        setMapCenter([zone.districtCoords.lat, zone.districtCoords.lon]);
        setMapZoom(9);
      }
    } else {
      setMapCenter([-6.3, 35.0]);
      setMapZoom(6);
    }
  }

  function getMyLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(loc);
        setMapCenter(loc);
        setMapZoom(12);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }

  return (
    <div style={{ padding:16 }}>
      {/* Header */}
      <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>
        🌊 {lang==='en' ? 'Flood Zone Map' : 'Ramani ya Maeneo ya Mafuriko'}
      </div>
      <div style={{ fontSize:12, color:'#6b7280', marginBottom:2 }}>
        {lang==='en'
          ? 'Live risk calculation based on current rainfall'
          : 'Hesabu ya hatari kulingana na mvua ya sasa'}
      </div>
      {lastUpdated && (
        <div style={{ fontSize:11, color:'#9ca3af', marginBottom:10 }}>
          🔄 {lang==='en'?'Updated':'Imesasishwa'}: {lastUpdated}
        </div>
      )}

      {/* Loading indicator */}
      {loadingWeather && (
        <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe',
          borderRadius:10, padding:'8px 14px', marginBottom:10,
          display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:14, height:14, border:'2px solid #bfdbfe',
            borderTopColor:'#2563eb', borderRadius:'50%',
            animation:'spin 0.7s linear infinite', flexShrink:0 }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <span style={{ fontSize:12, color:'#2563eb' }}>
            {lang==='en'
              ? 'Loading live rainfall data for all districts...'
              : 'Inapakia data ya mvua kwa wilaya zote...'}
          </span>
        </div>
      )}

      {/* Stats */}
      <div style={{ display:'flex', gap:5, marginBottom:10, flexWrap:'wrap' }}>
        {[
          { key:'emergency', label:lang==='en'?'Emergency':'Dharura' },
          { key:'high',      label:lang==='en'?'High':'Juu' },
          { key:'medium',    label:lang==='en'?'Medium':'Kati' },
          { key:'low',       label:lang==='en'?'Low':'Chini' },
        ].map(s => (
          <button key={s.key}
            onClick={() => setRiskFilter(riskFilter===s.key?'all':s.key)}
            style={{ background: riskFilter===s.key ? PILL[s.key].bg : '#f3f4f6',
              color: riskFilter===s.key ? PILL[s.key].color : '#6b7280',
              border:`1px solid ${riskFilter===s.key ? PILL[s.key].color+'60' : '#e5e7eb'}`,
              borderRadius:8, padding:'5px 10px', cursor:'pointer',
              fontSize:12, fontWeight:500 }}>
            {s.label} ({stats[s.key] || 0})
          </button>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display:'flex', gap:8, marginBottom:10 }}>
        <select value={selectedDistrict} onChange={e=>focusDistrict(e.target.value)}
          style={{ flex:1, padding:'8px 12px', borderRadius:10,
            border:'1px solid #e5e7eb', fontSize:13, background:'#fff' }}>
          {districts.map(d => <option key={d}>{d}</option>)}
        </select>
        <button onClick={getMyLocation} disabled={locating}
          style={{ padding:'8px 12px', background:'#2563eb', color:'#fff',
            border:'none', borderRadius:10, cursor:'pointer', fontSize:12,
            whiteSpace:'nowrap' }}>
          {locating ? '...' : '📍 ' + (lang==='en'?'My location':'Mahali pangu')}
        </button>
      </div>

      {/* Map */}
      <div style={{ borderRadius:12, overflow:'hidden',
        border:'1px solid #e5e7eb', marginBottom:12, height:340 }}>
        <MapContainer center={mapCenter} zoom={mapZoom}
          style={{ height:'100%', width:'100%' }}
          scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
          <FlyTo center={mapCenter} zoom={mapZoom}/>

          {visibleZones.map(zone => (
            <Polygon key={zone.id}
              positions={zone.coordinates}
              pathOptions={{
                ...RISK_STYLE[zone.dynamicRisk],
                weight: selectedZone?.id===zone.id ? 3 : RISK_STYLE[zone.dynamicRisk].weight,
              }}
              eventHandlers={{ click: () => focusZone(zone) }}>
              <Popup>
                <div style={{ minWidth:200 }}>
                  <div style={{ fontWeight:700, marginBottom:6 }}>{zone.name}</div>
                  <div style={{ marginBottom:6 }}>
                    {riskPill(zone.dynamicRisk, rl[zone.dynamicRisk])}
                    {zone.elevated && (
                      <span style={{ fontSize:10, color:'#ef4444', marginLeft:6 }}>
                        ⬆️ {lang==='en'?'Elevated by rain':'Imeongezeka na mvua'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:12, color:'#374151', lineHeight:1.5, marginBottom:6 }}>
                    {zone.description}
                  </div>
                  {zone.reason && (
                    <div style={{ fontSize:11, color:'#6b7280', fontStyle:'italic', marginBottom:4 }}>
                      📊 {zone.reason}
                    </div>
                  )}
                  <div style={{ fontSize:11, color:'#6b7280' }}>👥 {zone.affected}</div>
                </div>
              </Popup>
            </Polygon>
          ))}

          {userLocation && (
            <CircleMarker center={userLocation} radius={9}
              pathOptions={{ color:'#2563eb', fillColor:'#3b82f6', fillOpacity:0.9, weight:2 }}>
              <Popup>
                <div style={{ fontWeight:600 }}>
                  📍 {lang==='en'?'Your location':'Mahali ulipo'}
                </div>
              </Popup>
            </CircleMarker>
          )}
        </MapContainer>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:12,
        background:'#f9fafb', border:'1px solid #f3f4f6',
        borderRadius:10, padding:'8px 12px' }}>
        {['emergency','high','medium','low'].map(r => (
          <div key={r} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:14, height:14, borderRadius:3,
              background:RISK_STYLE[r].fillColor, opacity:0.85 }}/>
            <span style={{ fontSize:11, color:'#374151' }}>{rl[r]}</span>
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ fontSize:11 }}>⬆️</span>
          <span style={{ fontSize:11, color:'#374151' }}>
            {lang==='en'?'Elevated by current rain':'Imeongezeka na mvua'}
          </span>
        </div>
      </div>

      {/* Selected zone detail */}
      {selectedZone && (
        <div style={{ background:'#fff',
          border:`1.5px solid ${RISK_STYLE[selectedZone.dynamicRisk].color}`,
          borderRadius:12, padding:14, marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between',
            alignItems:'flex-start', marginBottom:8 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#111', marginBottom:4 }}>
                {selectedZone.name}
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                {riskPill(selectedZone.dynamicRisk, rl[selectedZone.dynamicRisk])}
                {selectedZone.elevated && (
                  <span style={{ fontSize:11, color:'#ef4444', fontWeight:500 }}>
                    ⬆️ {lang==='en'?'Rain elevated risk':'Mvua imeongeza hatari'}
                  </span>
                )}
                {selectedZone.dynamicRisk !== selectedZone.baseRisk &&
                 ['low','medium','high','emergency'].indexOf(selectedZone.dynamicRisk) <
                 ['low','medium','high','emergency'].indexOf(selectedZone.baseRisk) && (
                  <span style={{ fontSize:11, color:'#22c55e', fontWeight:500 }}>
                    ⬇️ {lang==='en'?'Dry conditions reduced risk':'Ukame umepunguza hatari'}
                  </span>
                )}
              </div>
            </div>
            <button onClick={()=>setSelectedZone(null)}
              style={{ background:'none', border:'none', cursor:'pointer',
                fontSize:20, color:'#9ca3af', padding:0, minHeight:'auto' }}>×</button>
          </div>

          <div style={{ fontSize:12, color:'#6b7280', marginBottom:6 }}>
            📍 {selectedZone.district}
          </div>
          <div style={{ fontSize:13, color:'#374151', lineHeight:1.6, marginBottom:8 }}>
            {selectedZone.description}
          </div>

          {/* Live weather data for this zone */}
          {selectedZone.weather && (
            <div style={{ background:'#f9fafb', borderRadius:8,
              padding:'10px 12px', marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#374151', marginBottom:6 }}>
                📊 {lang==='en'?'Live weather data driving this risk:':'Data ya hali ya hewa inayoongoza hatari hii:'}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[
                  { label:lang==='en'?'Rain today':'Mvua leo',
                    value:`${(selectedZone.weather.daily.precipitation_sum[0]||0).toFixed(1)}mm` },
                  { label:lang==='en'?'7-day total':'Jumla siku 7',
                    value:`${selectedZone.weather.daily.precipitation_sum.reduce((a,b)=>a+b,0).toFixed(0)}mm` },
                  { label:lang==='en'?'Max daily':'Juu zaidi kwa siku',
                    value:`${Math.max(...selectedZone.weather.daily.precipitation_sum).toFixed(0)}mm` },
                ].map((m,i) => (
                  <div key={i} style={{ background:'#fff', borderRadius:6,
                    padding:'8px', textAlign:'center', border:'1px solid #e5e7eb' }}>
                    <div style={{ fontSize:10, color:'#9ca3af' }}>{m.label}</div>
                    <div style={{ fontSize:14, fontWeight:700, marginTop:2 }}>{m.value}</div>
                  </div>
                ))}
              </div>
              {selectedZone.reason && (
                <div style={{ fontSize:11, color:'#6b7280',
                  fontStyle:'italic', marginTop:8 }}>
                  💡 {selectedZone.reason}
                </div>
              )}
            </div>
          )}

          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:12, background:'#f3f4f6', color:'#374151',
              padding:'3px 10px', borderRadius:99 }}>👥 {selectedZone.affected}</span>
            <span style={{ fontSize:12, background:'#f3f4f6', color:'#374151',
              padding:'3px 10px', borderRadius:99 }}>
              🏠 {lang==='en'?'Base risk':'Hatari ya msingi'}: {rl[selectedZone.baseRisk]}
            </span>
          </div>
        </div>
      )}

      {/* Zone list */}
      <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:8 }}>
        {lang==='en'
          ? `Flood zones (${visibleZones.length})`
          : `Maeneo ya mafuriko (${visibleZones.length})`}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {visibleZones.map(zone => (
          <button key={zone.id} onClick={() => focusZone(zone)}
            style={{ background:'#fff',
              border:`1px solid ${selectedZone?.id===zone.id
                ? RISK_STYLE[zone.dynamicRisk].color : '#e5e7eb'}`,
              borderRadius:10, padding:'10px 14px', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              textAlign:'left',
              boxShadow: selectedZone?.id===zone.id
                ? `0 0 0 2px ${RISK_STYLE[zone.dynamicRisk].fillColor}30` : 'none' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#111' }}>
                {zone.name}
                {zone.elevated && (
                  <span style={{ fontSize:10, color:'#ef4444', marginLeft:6 }}>⬆️</span>
                )}
              </div>
              <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>
                📍 {zone.district} · 👥 {zone.affected}
              </div>
              {zone.weather && (
                <div style={{ fontSize:10, color:'#9ca3af', marginTop:1 }}>
                  🌧️ {(zone.weather.daily.precipitation_sum[0]||0).toFixed(1)}mm {lang==='en'?'today':'leo'} ·
                  {zone.weather.daily.precipitation_sum.reduce((a,b)=>a+b,0).toFixed(0)}mm {lang==='en'?'this week':'wiki hii'}
                </div>
              )}
            </div>
            <div style={{ flexShrink:0, marginLeft:8 }}>
              {riskPill(zone.dynamicRisk, rl[zone.dynamicRisk])}
            </div>
          </button>
        ))}
      </div>

      {visibleZones.length === 0 && (
        <div style={{ textAlign:'center', padding:'2rem', color:'#9ca3af', fontSize:14 }}>
          {lang==='en'
            ? 'No flood zones found for this filter.'
            : 'Hakuna maeneo ya mafuriko kwa kichujio hiki.'}
        </div>
      )}
    </div>
  );
}
