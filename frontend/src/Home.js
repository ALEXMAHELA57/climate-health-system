import React, { useState, useEffect } from 'react';
import {
  MapPin, Navigation, AlertTriangle, CheckCircle2, Bell,
  Stethoscope, Users, Pill, HeartPulse,
  Ambulance, ChevronRight, Siren, MessageCircle, Wind,
  CloudLightning, CloudRain, CloudDrizzle, Sun as SunIcon,
  Bug, Droplets, Thermometer, Sun, Calendar, Clock,
} from 'lucide-react';
import { DISTRICTS, DISTRICT_COORDS, getRisk, findNearestDistrict, reverseGeocode, API } from './constants';
import { useTheme } from './ThemeContext';

function authHeaders() {
  const token = localStorage.getItem('afya_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export default function Home({ t, lang, district, onDistrictChange, setPage }) {
  const { theme } = useTheme();
  const [weather, setWeather]   = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [earlyWarnings, setEarlyWarnings] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [nextMed, setNextMed] = useState(null);
  const [nextAppt, setNextAppt] = useState(null);
  const sw = lang === 'sw';
  const user = JSON.parse(localStorage.getItem('afya_user') || 'null');

  useEffect(() => {
    if (district) { fetchHomeWeather(district); fetchClimateExtras(district); }
    detectLocation();
    fetchSnapshot();
  }, []);

  useEffect(() => { if (district) { fetchHomeWeather(district); fetchClimateExtras(district); } }, [district]);

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

  async function fetchClimateExtras(d) {
    try {
      const [aqRes, ewRes] = await Promise.all([
        fetch(`${API}/api/weather/${encodeURIComponent(d)}/air-quality`),
        fetch(`${API}/api/weather/${encodeURIComponent(d)}/early-warning`),
      ]);
      setAirQuality(await aqRes.json());
      const ew = await ewRes.json();
      setEarlyWarnings(ew.warnings || []);
    } catch { /* non-critical */ }
  }

  async function fetchSnapshot() {
    if (!user) return;
    try {
      const medRes = await fetch(`${API}/api/medicine/mine/all`, { headers: authHeaders() });
      const medData = await medRes.json();
      const now = new Date();
      const nowHM = now.toTimeString().slice(0, 5);
      let soonest = null;
      (medData.reminders || []).forEach(r => {
        r.times.forEach(time => {
          if (time >= nowHM && (!soonest || time < soonest.time)) soonest = { ...r, time };
        });
      });
      setNextMed(soonest);
    } catch { /* silent */ }

    if (user.phone) {
      try {
        const apptRes = await fetch(`${API}/api/consultation/appointments/${user.phone}`);
        const apptData = await apptRes.json();
        const today = new Date().toISOString().slice(0, 10);
        const upcoming = (apptData.appointments || [])
          .filter(a => a.status !== 'cancelled' && a.status !== 'completed' && a.requested_date >= today)
          .sort((a, b) => (a.requested_date + a.requested_time).localeCompare(b.requested_date + b.requested_time))[0];
        setNextAppt(upcoming || null);
      } catch { /* silent */ }
    }
  }

  function detectLocation() {
    if (!navigator.geolocation) return;
    setGpsStatus('detecting');
    let resolved = false;

    async function applyPosition(pos) {
      const { latitude, longitude, accuracy } = pos.coords;
      const d = findNearestDistrict(latitude, longitude);
      const geo = await reverseGeocode(latitude, longitude);
      let finalDistrict = d;
      if (geo.region) {
        const match = DISTRICTS.find(dist =>
          dist.toLowerCase().includes(geo.region.toLowerCase()) ||
          geo.region.toLowerCase().includes(dist.toLowerCase())
        );
        if (match) finalDistrict = match;
      }
      onDistrictChange(finalDistrict);
      localStorage.setItem('afya_geo_district', geo.district || '');
      localStorage.setItem('afya_geo_street',   geo.street   || '');
      localStorage.setItem('afya_geo_accuracy', String(accuracy || 99999));
      setGpsStatus('ok');
    }

    const watcher = navigator.geolocation.watchPosition(
      pos => {
        const { accuracy } = pos.coords;
        if (accuracy && accuracy <= 1000) {
          if (!resolved) { resolved = true; navigator.geolocation.clearWatch(watcher); applyPosition(pos); }
        }
      },
      () => { if (!resolved) { resolved = true; navigator.geolocation.clearWatch(watcher); setGpsStatus('denied'); } },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        navigator.geolocation.clearWatch(watcher);
        navigator.geolocation.getCurrentPosition(applyPosition, () => setGpsStatus('denied'), { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
      }
    }, 12000);
  }

  const curr   = weather?.current;
  const daily  = weather?.daily;
  const rain7  = daily?.precipitation_sum?.reduce((a,b)=>a+b,0) || 0;
  const maxTemp  = daily ? Math.max(...(daily.temperature_2m_max||[0])) : 0;
  const maxDaily = daily ? Math.max(...(daily.precipitation_sum||[0])) : 0;
  const hasStorm = daily?.weather_code?.some(c=>c>=95) || false;
  const risk   = curr ? getRisk(rain7, maxTemp, hasStorm, maxDaily) : 'low';

  const alerts = [];
  if (curr) {
    const todayRain = daily?.precipitation_sum?.[0] || 0;
    const heavyDays = (daily?.precipitation_sum||[]).filter(r=>r>25).length;
    if (hasStorm)                       alerts.push({ Icon: CloudLightning, color:'#ef4444', bg:'#fef2f2', text: sw?'Dhoruba inatarajiwa':'Storm expected' });
    if (todayRain > 20)                 alerts.push({ Icon: CloudRain, color:'#1d4ed8', bg:'#eff6ff', text: sw?`Mvua nzito leo ${todayRain.toFixed(0)}mm`:`Heavy rain ${todayRain.toFixed(0)}mm` });
    if (rain7>40||heavyDays>=2)         alerts.push({ Icon: Bug, color:'#d97706', bg:'#fffbeb', text: sw?'Hatari ya malaria':'Malaria risk elevated' });
    if (rain7>60)                       alerts.push({ Icon: Droplets, color:'#0e7490', bg:'#ecfeff', text: sw?'Hatari ya kipindupindu':'Cholera risk' });
    if (maxTemp>36)                     alerts.push({ Icon: Thermometer, color:'#dc2626', bg:'#fef2f2', text: sw?`Joto kali ${Math.round(maxTemp)}°C`:`Extreme heat ${Math.round(maxTemp)}°C` });
    if (curr.relative_humidity_2m < 30) alerts.push({ Icon: Sun, color:'#92400e', bg:'#fef3c7', text: sw?'Hewa kavu':'Dry air risk' });
  }

  const todayRainAmt = daily?.precipitation_sum?.[0] || 0;
  const TodayIcon = daily?.weather_code?.[0]>=95 ? CloudLightning
    : todayRainAmt > 10 ? CloudRain
    : todayRainAmt > 0.5 ? CloudDrizzle
    : SunIcon;

  return (
    <div style={{ padding:16 }}>
      {/* Region selector */}
      <div style={{ background:theme.card, border:`1px solid ${theme.border}`, borderRadius:12, padding:'10px 12px', marginBottom:10, display:'flex', gap:8, alignItems:'center' }}>
        <MapPin size={16} color={theme.textMuted} />
        <select value={district} onChange={e=>{ onDistrictChange(e.target.value); setGpsStatus('manual'); }}
          style={{ flex:1, border:'none', fontSize:14, fontWeight:600, color:theme.text, background:'transparent', outline:'none', cursor:'pointer' }}>
          {DISTRICTS.map(d=><option key={d}>{d}</option>)}
        </select>
        <button onClick={detectLocation} title={sw?'Tumia GPS':'Use GPS'}
          style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'5px 10px', fontSize:12, color:'#1d4ed8', cursor:'pointer', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:4 }}>
          <Navigation size={12} className={gpsStatus==='detecting' ? 'spin-icon' : ''} /> GPS
        </button>
      </div>

      {gpsStatus==='detecting' && (
        <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'6px 12px', marginBottom:10, fontSize:12, color:'#1d4ed8', display:'flex', alignItems:'center', gap:6 }}>
          <Navigation size={13} className="spin-icon" />
          {sw?'Inatafuta eneo lako kwa usahihi...':'Finding your precise location...'}
        </div>
      )}
      {gpsStatus==='denied' && (
        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'6px 12px', marginBottom:10, fontSize:12, color:'#92400e', display:'flex', alignItems:'center', gap:6 }}>
          <AlertTriangle size={13} /> {sw?'GPS haikufanya kazi. Chagua mkoa hapo juu.':'GPS unavailable. Select your region above.'}
        </div>
      )}

      {/* Weather card */}
      <div style={{ background:'linear-gradient(135deg,#1d4ed8,#0ea5e9)', borderRadius:14, padding:'12px 14px', color:'#fff', marginBottom:10 }}>
        {loading && !curr ? (
          <div style={{ display:'flex', alignItems:'center', gap:8, opacity:0.9 }}>
            <div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite', flexShrink:0 }} />
            <span style={{ fontSize:12 }}>{sw?'Inapakia...':'Loading weather...'}</span>
          </div>
        ) : curr ? (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:11, opacity:0.8, marginBottom:1, display:'flex', alignItems:'center', gap:3 }}><MapPin size={11} /> {district}</div>
                <div style={{ fontSize:36, fontWeight:700, lineHeight:1 }}>{Math.round(curr.temperature_2m)}°C</div>
                <div style={{ fontSize:11, opacity:0.85, marginTop:3 }}>
                  {sw?'Hisi':'Feels'} {Math.round(curr.apparent_temperature)}°C · {curr.relative_humidity_2m}% · {Math.round(curr.wind_speed_10m)}km/h
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ marginBottom:2, display:'flex', justifyContent:'flex-end' }}><TodayIcon size={28} /></div>
                <div style={{ fontSize:11, opacity:0.85 }}>
                  {daily?.precipitation_sum?.[0]>0.5?`${daily.precipitation_sum[0].toFixed(0)}mm ${sw?'leo':'today'}`:sw?'Kavu leo':'Dry today'}
                </div>
                <div style={{ marginTop:4, background:'rgba(255,255,255,0.25)', padding:'2px 10px', borderRadius:99, fontSize:10, fontWeight:700 }}>
                  {risk.toUpperCase()} {sw?'HATARI':'RISK'}
                </div>
              </div>
            </div>
            {airQuality?.aqi != null && (
              <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid rgba(255,255,255,0.25)', display:'flex', alignItems:'center', gap:5, fontSize:11, opacity:0.9 }}>
                <Wind size={12} /> {sw?'Ubora wa Hewa':'Air Quality'}: AQI {airQuality.aqi} · {sw ? airQuality.label_sw : airQuality.label.replace('_',' ')}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize:12, opacity:0.85, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }} onClick={()=>fetchHomeWeather(district)}>
            <AlertTriangle size={13} /> {sw?'Imeshindwa kupakia — gusa kurudia':'Failed to load — tap to retry'}
          </div>
        )}
      </div>

      {/* Health + Early Warning alerts */}
      {curr && (
        <div style={{ marginBottom:10 }}>
          {alerts.length === 0 && earlyWarnings.length === 0 ? (
            <div style={{ display:'flex', alignItems:'center', gap:6, background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'7px 12px', fontSize:12, color:'#166534' }}>
              <CheckCircle2 size={14} /> {sw?'Hali ya hewa salama leo':'No health alerts today'}
            </div>
          ) : (
            <>
              <div style={{ fontSize:11, fontWeight:600, color:'#6b7280', marginBottom:5, display:'flex', alignItems:'center', gap:4 }}>
                <Bell size={12} /> {sw?'TAARIFA ZA AFYA':'HEALTH ALERTS'}
              </div>
              <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2 }}>
                {alerts.map((a,i)=>(
                  <div key={i} style={{ flex:'0 0 auto', background:a.bg, borderRadius:8, padding:'7px 10px', display:'flex', alignItems:'center', gap:5 }}>
                    <a.Icon size={15} color={a.color} />
                    <span style={{ fontSize:11, color:a.color, fontWeight:600, whiteSpace:'nowrap' }}>{a.text}</span>
                  </div>
                ))}
                {earlyWarnings.slice(0,2).map((w,i)=>(
                  <div key={`ew-${i}`} style={{ flex:'0 0 auto', background:'#fffbeb', borderRadius:8, padding:'7px 10px', display:'flex', alignItems:'center', gap:5 }}>
                    <AlertTriangle size={15} color="#92400e" />
                    <span style={{ fontSize:11, color:'#92400e', fontWeight:600, whiteSpace:'nowrap' }}>{sw?`Siku ${w.days_ahead}: `:`In ${w.days_ahead}d: `}{(sw?w.message_sw:w.message_en).slice(0,40)}...</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* My Health snapshot */}
      {user && (nextMed || nextAppt) && (
        <div style={{ display:'grid', gridTemplateColumns: nextMed && nextAppt ? '1fr 1fr' : '1fr', gap:8, marginBottom:10 }}>
          {nextMed && (
            <button onClick={()=>setPage('medicine')} style={{ background:theme.card, border:`1px solid ${theme.border}`, borderRadius:10, padding:10, textAlign:'left', cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}><Pill size={13} color="#2563eb" /><span style={{ fontSize:10, fontWeight:600, color:theme.textMuted }}>{sw?'DAWA IJAYO':'NEXT DOSE'}</span></div>
              <div style={{ fontSize:12, fontWeight:700, color:theme.text }}>{nextMed.medicine_name}</div>
              <div style={{ fontSize:11, color:theme.textMuted, display:'flex', alignItems:'center', gap:3 }}><Clock size={10} /> {nextMed.time}</div>
            </button>
          )}
          {nextAppt && (
            <button onClick={()=>setPage('care')} style={{ background:theme.card, border:`1px solid ${theme.border}`, borderRadius:10, padding:10, textAlign:'left', cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}><Calendar size={13} color="#7c3aed" /><span style={{ fontSize:10, fontWeight:600, color:theme.textMuted }}>{sw?'MIADI IJAYO':'NEXT APPOINTMENT'}</span></div>
              <div style={{ fontSize:12, fontWeight:700, color:theme.text }}>{nextAppt.doctor_name}</div>
              <div style={{ fontSize:11, color:theme.textMuted }}>{nextAppt.requested_date} · {nextAppt.requested_time}</div>
            </button>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
        {[
          { Icon: Stethoscope, title:sw?'Afya':'Health', sub:sw?'Wataalamu, ushauri, vipimo':'Experts, guidance, tests', page:'health', color:'#eff6ff', border:'#bfdbfe' },
          { Icon: MessageCircle, title:sw?'Uliza Afya AI':'Ask Afya AI', sub:sw?'Zungumza sasa':'Chat now', page:'symptoms', color:'#fffbeb', border:'#fde68a' },
          { Icon: Pill, title:sw?'Ratiba ya Dawa':'Medicine Schedule', sub:sw?'Weka ukumbusho':'Set reminders', page:'medicine', color:'#fff7ed', border:'#fed7aa' },
          { Icon: Users, title:sw?'Afya ya Familia':'Family Health', sub:sw?'Simamia wanafamilia':'Manage family members', page:'family', color:'#f0fdf4', border:'#bbf7d0' },
        ].map((item,i)=>(
          <button key={i} onClick={()=>setPage(item.page)}
            style={{ background:item.color, border:`1px solid ${item.border}`, borderRadius:12, padding:'12px 10px', textAlign:'left', cursor:'pointer' }}>
            <div style={{ marginBottom:4 }}><item.Icon size={22} color="#2563eb" /></div>
            <div style={{ fontSize:13, fontWeight:600, color:'#111' }}>{item.title}</div>
            <div style={{ fontSize:11, color:'#6b7280' }}>{item.sub}</div>
          </button>
        ))}
      </div>

      {/* My Health link */}
      <button onClick={()=>setPage('myhealth')}
        style={{ width:'100%', background:theme.card, border:`1px solid ${theme.border}`, borderRadius:12, padding:'10px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <HeartPulse size={18} color="#2563eb" />
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:13, fontWeight:600, color:theme.text }}>{sw?'Afya Yangu':'My Health'}</div>
            <div style={{ fontSize:10, color:theme.textFaint }}>{sw?'Kumbukumbu, vipimo, ripoti':'Records, measurements, reports'}</div>
          </div>
        </div>
        <ChevronRight size={16} color={theme.textFaint} />
      </button>

      {/* Emergency info link */}
      <button onClick={()=>setPage('emergency')}
        style={{ width:'100%', background:theme.card, border:`1px solid ${theme.border}`, borderRadius:12, padding:'10px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Ambulance size={18} color="#dc2626" />
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:13, fontWeight:600, color:theme.text }}>{sw?'Taarifa za Dharura':'Emergency Info'}</div>
            <div style={{ fontSize:10, color:theme.textFaint }}>{sw?'Inafanya kazi bila intaneti':'Works without internet'}</div>
          </div>
        </div>
        <ChevronRight size={16} color={theme.textFaint} />
      </button>

      {/* Emergency */}
      <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'#991b1b', display:'flex', alignItems:'center', gap:5 }}>
            <Siren size={14} /> {t.emergency}
          </div>
          <div style={{ fontSize:11, color:'#6b7280' }}>Ambulance · Police · Fire</div>
        </div>
        <a href="tel:112" style={{ background:'#ef4444', color:'#fff', padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none' }}>{t.callEmergency}</a>
      </div>
    </div>
  );
}
