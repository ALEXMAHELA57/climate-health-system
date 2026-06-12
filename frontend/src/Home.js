import React, { useState, useEffect } from 'react';
import { DISTRICTS, DISTRICT_COORDS, getRisk, findNearestDistrict, reverseGeocode, API } from './constants';

export default function Home({ t, lang, district, onDistrictChange, setPage }) {
  const [weather, setWeather]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [gpsStatus, setGpsStatus] = useState('idle');
  const sw = lang === 'sw';

  useEffect(() => {
    if (district) fetchHomeWeather(district);
    detectLocation();
  }, []);

  useEffect(() => { if (district) fetchHomeWeather(district); }, [district]);

  async function fetchHomeWeather(d) {
    const c = DISTRICT_COORDS[d];
    if (!c) return;
    const cacheKey = `wx_${d}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < 30*60*1000) {
          setWeather(data);
          if (Date.now() - ts < 10*60*1000) { setLoading(false); return; }
        }
      } catch {}
    }
    setLoading(true);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}`
      + `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation`
      + `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code`
      + `&timezone=Africa/Dar_es_Salaam&forecast_days=7`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res  = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      const data = await res.json();
      if (data?.current) {
        setWeather(data);
        localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
      }
    } catch { clearTimeout(timer); if (!cached) setWeather(null); }
    setLoading(false);
  }

  function detectLocation() {
    if (!navigator.geolocation) return;
    setGpsStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords;
        const d = findNearestDistrict(latitude, longitude);
        onDistrictChange(d);
        const geo = await reverseGeocode(latitude, longitude);
        if (geo.region) {
          const match = DISTRICTS.find(dist =>
            dist.toLowerCase().includes(geo.region.toLowerCase()) ||
            geo.region.toLowerCase().includes(dist.toLowerCase())
          );
          if (match) onDistrictChange(match);
        }
        localStorage.setItem('afya_geo_district', geo.district || '');
        localStorage.setItem('afya_geo_street',   geo.street   || '');
        setGpsStatus('ok');
      },
      () => setGpsStatus('denied'),
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  const curr   = weather?.current;
  const daily  = weather?.daily;
  const rain7  = daily?.precipitation_sum?.reduce((a,b)=>a+b,0) || 0;
  const maxTemp  = daily ? Math.max(...(daily.temperature_2m_max||[0])) : 0;
  const maxDaily = daily ? Math.max(...(daily.precipitation_sum||[0])) : 0;
  const hasStorm = daily?.weather_code?.some(c=>c>=95) || false;
  const risk   = curr ? getRisk(rain7, maxTemp, hasStorm, maxDaily) : 'low';
  const riskColors = { emergency:'#ef4444', high:'#f59e0b', medium:'#3b82f6', low:'#22c55e' };

  // Build health alerts
  const alerts = [];
  if (curr) {
    const todayRain = daily?.precipitation_sum?.[0] || 0;
    const heavyDays = (daily?.precipitation_sum||[]).filter(r=>r>25).length;
    if (hasStorm)                       alerts.push({ icon:'⛈️', color:'#ef4444', bg:'#fef2f2', text: sw?'Dhoruba inatarajiwa':'Storm expected' });
    if (todayRain > 20)                 alerts.push({ icon:'🌧️', color:'#1d4ed8', bg:'#eff6ff', text: sw?`Mvua nzito leo ${todayRain.toFixed(0)}mm`:`Heavy rain ${todayRain.toFixed(0)}mm` });
    if (rain7>40||heavyDays>=2)         alerts.push({ icon:'🦟', color:'#d97706', bg:'#fffbeb', text: sw?'Hatari ya malaria':'Malaria risk elevated' });
    if (rain7>60)                       alerts.push({ icon:'💧', color:'#0e7490', bg:'#ecfeff', text: sw?'Hatari ya kipindupindu':'Cholera risk' });
    if (maxTemp>36)                     alerts.push({ icon:'🌡️', color:'#dc2626', bg:'#fef2f2', text: sw?`Joto kali ${Math.round(maxTemp)}°C`:`Extreme heat ${Math.round(maxTemp)}°C` });
    if (curr.relative_humidity_2m < 30) alerts.push({ icon:'🏜️', color:'#92400e', bg:'#fef3c7', text: sw?'Hewa kavu':'Dry air risk' });
  }

  return (
    <div style={{ padding:16 }}>
      {/* Region selector */}
      <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:'10px 12px', marginBottom:10, display:'flex', gap:8, alignItems:'center' }}>
        <span style={{ fontSize:16 }}>📍</span>
        <select value={district} onChange={e=>{ onDistrictChange(e.target.value); setGpsStatus('manual'); }}
          style={{ flex:1, border:'none', fontSize:14, fontWeight:600, color:'#111', background:'transparent', outline:'none', cursor:'pointer' }}>
          {DISTRICTS.map(d=><option key={d}>{d}</option>)}
        </select>
        <button onClick={detectLocation} title={sw?'Tumia GPS':'Use GPS'}
          style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'5px 10px', fontSize:12, color:'#1d4ed8', cursor:'pointer', whiteSpace:'nowrap' }}>
          {gpsStatus==='detecting'?'⟳':'🛰 GPS'}
        </button>
      </div>

      {gpsStatus==='denied' && (
        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'6px 12px', marginBottom:10, fontSize:12, color:'#92400e' }}>
          ⚠️ {sw?'GPS haikufanya kazi. Chagua mkoa hapo juu.':'GPS unavailable. Select your region above.'}
        </div>
      )}

      {/* Compact weather card */}
      <div style={{ background:'linear-gradient(135deg,#1d4ed8,#0ea5e9)', borderRadius:14, padding:'12px 14px', color:'#fff', marginBottom:10 }}>
        {loading && !curr ? (
          <div style={{ display:'flex', alignItems:'center', gap:8, opacity:0.9 }}>
            <div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite', flexShrink:0 }} />
            <span style={{ fontSize:12 }}>{sw?'Inapakia...':'Loading weather...'}</span>
          </div>
        ) : curr ? (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:11, opacity:0.8, marginBottom:1 }}>📍 {district}</div>
              <div style={{ fontSize:36, fontWeight:700, lineHeight:1 }}>{Math.round(curr.temperature_2m)}°C</div>
              <div style={{ fontSize:11, opacity:0.85, marginTop:3 }}>
                {sw?'Hisi':'Feels'} {Math.round(curr.apparent_temperature)}°C · 💧{curr.relative_humidity_2m}% · 💨{Math.round(curr.wind_speed_10m)}km/h
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:28, marginBottom:2 }}>
                {daily?.weather_code?.[0]>=95?'⛈️':daily?.precipitation_sum?.[0]>10?'🌧️':daily?.precipitation_sum?.[0]>0.5?'🌦️':'☀️'}
              </div>
              <div style={{ fontSize:11, opacity:0.85 }}>
                {daily?.precipitation_sum?.[0]>0.5?`${daily.precipitation_sum[0].toFixed(0)}mm ${sw?'leo':'today'}`:sw?'Kavu leo':'Dry today'}
              </div>
              <div style={{ marginTop:4, background:'rgba(255,255,255,0.25)', padding:'2px 10px', borderRadius:99, fontSize:10, fontWeight:700 }}>
                {risk.toUpperCase()} {sw?'HATARI':'RISK'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize:12, opacity:0.85, cursor:'pointer' }} onClick={()=>fetchHomeWeather(district)}>
            ⚠️ {sw?'Imeshindwa kupakia — gusa kurudia':'Failed to load — tap to retry'}
          </div>
        )}
      </div>

      {/* Health alerts — horizontal scroll */}
      {curr && (
        <div style={{ marginBottom:10 }}>
          {alerts.length === 0 ? (
            <div style={{ display:'flex', alignItems:'center', gap:6, background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'7px 12px', fontSize:12, color:'#166534' }}>
              ✅ {sw?'Hali ya hewa salama leo':'No health alerts today'}
            </div>
          ) : (
            <>
              <div style={{ fontSize:11, fontWeight:600, color:'#6b7280', marginBottom:5 }}>🔔 {sw?'TAARIFA ZA AFYA':'HEALTH ALERTS'}</div>
              <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2 }}>
                {alerts.map((a,i)=>(
                  <div key={i} style={{ flex:'0 0 auto', background:a.bg, borderRadius:8, padding:'7px 10px', display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ fontSize:15 }}>{a.icon}</span>
                    <span style={{ fontSize:11, color:a.color, fontWeight:600, whiteSpace:'nowrap' }}>{a.text}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
        {[
          { icon:'🌤️', title:t.weather, sub:sw?'Utabiri wa siku 7 & 15':'7 & 15 day forecast', page:'weather', color:'#eff6ff', border:'#bfdbfe' },
          { icon:'🤒', title:t.symptoms, sub:sw?'Zungumza na Afya':'Chat with Afya', page:'symptoms', color:'#fffbeb', border:'#fde68a' },
          { icon:'🏥', title:t.clinics, sub:sw?'Vituo vya karibu':'Nearby facilities', page:'clinics', color:'#f0fdf4', border:'#bbf7d0' },
          { icon:'📢', title:t.report, sub:sw?'Ripoti tatizo':'Report an issue', page:'report', color:'#f5f3ff', border:'#ddd6fe' },
        ].map((item,i)=>(
          <button key={i} onClick={()=>setPage(item.page)}
            style={{ background:item.color, border:`1px solid ${item.border}`, borderRadius:12, padding:'12px 10px', textAlign:'left', cursor:'pointer' }}>
            <div style={{ fontSize:22, marginBottom:4 }}>{item.icon}</div>
            <div style={{ fontSize:13, fontWeight:600, color:'#111' }}>{item.title}</div>
            <div style={{ fontSize:11, color:'#6b7280' }}>{item.sub}</div>
          </button>
        ))}
      </div>

      {/* Emergency */}
      <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'#991b1b' }}>🚨 {t.emergency}</div>
          <div style={{ fontSize:11, color:'#6b7280' }}>Ambulance · Police · Fire</div>
        </div>
        <a href="tel:112" style={{ background:'#ef4444', color:'#fff', padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none' }}>{t.callEmergency}</a>
      </div>
    </div>
  );
}
