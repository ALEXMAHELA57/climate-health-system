import React, { useState, useEffect } from 'react';
import { DISTRICTS, DISTRICT_COORDS, getRisk, riskColor, riskBg, findNearestDistrict } from './constants';

export default function Weather({ t, lang, district, onDistrictChange }) {
  const [selectedDistrict, setSelectedDistrict] = useState(district);
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [forecastDays, setForecastDays] = useState(7);
  const [selectedDay, setSelectedDay]   = useState(null);
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const sw = lang === 'sw';

  async function fetchWeather(d) {
    setLoading(true);
    const c = DISTRICT_COORDS[d];
    if (!c) { setLoading(false); return; }
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}`
      + `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation`
      + `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code`
      + `&timezone=Africa/Dar_es_Salaam&forecast_days=${forecastDays}`;
    try {
      const res = await fetch(url);
      setData(await res.json());
    } catch { alert(sw?'Imeshindwa kupata data ya hali ya hewa':'Could not fetch weather data'); }
    setLoading(false);
  }

  useEffect(() => { fetchWeather(selectedDistrict); }, [forecastDays]);

  function handleSearch() { onDistrictChange(selectedDistrict); fetchWeather(selectedDistrict); }

  function locateGps() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async pos => {
      const d = findNearestDistrict(pos.coords.latitude, pos.coords.longitude);
      setSelectedDistrict(d); onDistrictChange(d); fetchWeather(d);
    }, ()=>{}, { enableHighAccuracy:true });
  }

  const curr   = data?.current;
  const daily  = data?.daily;
  const rain7  = daily?.precipitation_sum?.reduce((a,b)=>a+b,0) || 0;
  const maxTemp  = daily ? Math.max(...(daily.temperature_2m_max||[0])) : 0;
  const maxDaily = daily ? Math.max(...(daily.precipitation_sum||[0])) : 0;
  const hasStorm = daily?.weather_code?.some(c=>c>=95) || false;
  const risk   = curr ? getRisk(rain7,maxTemp,hasStorm,maxDaily) : 'low';

  function getAlerts() {
    if (!daily) return [];
    const alerts = [];
    const heavyDays = daily.precipitation_sum.map((r,i)=>({r,i,code:daily.weather_code[i]})).filter(x=>x.r>25);
    if (heavyDays.length>0) alerts.push({ icon:'🦟', label:sw?'Hatari ya Malaria — mvua nzito':`Malaria risk — heavy rain ${heavyDays.map(x=>days[new Date(daily.time[x.i]).getDay()]).join(', ')}`, level:'high' });
    if (rain7>60)   alerts.push({ icon:'💧', label:sw?'Hatari ya kipindupindu — maji mengi':'Cholera risk — high rainfall', level:'high' });
    if (maxTemp>36) alerts.push({ icon:'🌡️', label:sw?'Hatari ya joto kali':'Heat illness risk', level:'medium' });
    if (hasStorm)   alerts.push({ icon:'⛈️', label:sw?'Dhoruba inatarajiwa':'Storm expected — flood risk', level:'high' });
    return alerts;
  }

  return (
    <div style={{ padding:16 }}>
      <div style={{ fontSize:16, fontWeight:700, marginBottom:12 }}>🌤️ {t.weather}</div>

      <div style={{ display:'flex', gap:8, marginBottom:10 }}>
        <select value={selectedDistrict} onChange={e=>setSelectedDistrict(e.target.value)}
          style={{ flex:1, padding:'9px 12px', borderRadius:10, border:'1px solid #e5e7eb', fontSize:14, background:'#fff' }}>
          {DISTRICTS.map(d=><option key={d}>{d}</option>)}
        </select>
        <button onClick={locateGps} style={{ padding:'9px 12px', background:'#f3f4f6', border:'1px solid #e5e7eb', borderRadius:10, fontSize:16, cursor:'pointer' }}>📍</button>
        <button onClick={handleSearch} disabled={loading}
          style={{ padding:'9px 14px', background:'#2563eb', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:14, fontWeight:500 }}>
          {loading?'...':t.search}
        </button>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:12 }}>
        {[7,15].map(n=>(
          <button key={n} onClick={()=>setForecastDays(n)}
            style={{ flex:1, padding:'7px', borderRadius:8, border:'none', background:forecastDays===n?'#2563eb':'#f3f4f6', color:forecastDays===n?'#fff':'#374151', fontSize:12, fontWeight:500, cursor:'pointer' }}>
            {n===7?t.weekForecast:t.dayForecast}
          </button>
        ))}
      </div>

      {curr && (
        <>
          {/* Today rain banner */}
          {(() => {
            const todayRain = daily?.precipitation_sum?.[0]||0;
            const todayCode = daily?.weather_code?.[0]||0;
            const icon = todayRain===0?'☀️':todayRain<5?'🌦️':todayRain<20?'🌧️':'⛈️';
            const color = todayRain===0?'#166534':todayRain<5?'#1d4ed8':todayRain<20?'#d97706':'#ef4444';
            const bg = todayRain===0?'#f0fdf4':todayRain<5?'#eff6ff':todayRain<20?'#fffbeb':'#fef2f2';
            const label = todayRain===0?(sw?'Hakuna mvua leo':'No rain today'):
              todayRain<5?(sw?`Mvua kidogo leo (${todayRain.toFixed(1)}mm)`:`Light rain today (${todayRain.toFixed(1)}mm)`):
              todayRain<20?(sw?`Mvua ya wastani (${todayRain.toFixed(1)}mm)`:`Moderate rain (${todayRain.toFixed(1)}mm)`):
              (sw?`Mvua nzito leo (${todayRain.toFixed(1)}mm)`:`Heavy rain today (${todayRain.toFixed(1)}mm)`);
            return (
              <div style={{ background:bg, border:`1px solid ${color}30`, borderRadius:10, padding:'9px 12px', marginBottom:10, display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:22 }}>{icon}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color }}>{sw?'Leo':'Today'}</div>
                  <div style={{ fontSize:12, color, opacity:0.85 }}>{label}</div>
                  {todayCode>=95&&<div style={{ fontSize:11, color:'#ef4444', marginTop:1, fontWeight:600 }}>{sw?'⚡ Dhoruba inatarajiwa':'⚡ Thunderstorm expected'}</div>}
                </div>
              </div>
            );
          })()}

          {/* Risk banner */}
          <div style={{ background:riskBg(risk), border:`1px solid ${riskColor(risk)}30`, borderRadius:10, padding:'9px 12px', marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:13, fontWeight:600, color:riskColor(risk) }}>{t.riskThisWeek}</div>
            <div style={{ background:riskColor(risk), color:'#fff', padding:'2px 12px', borderRadius:99, fontSize:12, fontWeight:600 }}>{risk.toUpperCase()}</div>
          </div>

          {/* Metrics */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
            {[
              { label:t.temperature, value:`${Math.round(curr.temperature_2m)}°C`, sub:`Feels ${Math.round(curr.apparent_temperature)}°C` },
              { label:t.humidity,    value:`${curr.relative_humidity_2m}%`, sub:`Rain now: ${curr.precipitation}mm` },
              { label:t.wind,        value:`${Math.round(curr.wind_speed_10m)} km/h`, sub:'Current' },
              { label:t.rain7,       value:`${rain7.toFixed(0)}mm`, sub:sw?'Jumla ya utabiri':'Total forecast' },
            ].map((m,i)=>(
              <div key={i} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, padding:'10px 12px' }}>
                <div style={{ fontSize:11, color:'#9ca3af', marginBottom:2 }}>{m.label}</div>
                <div style={{ fontSize:20, fontWeight:700 }}>{m.value}</div>
                <div style={{ fontSize:11, color:'#6b7280' }}>{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Forecast strip */}
          <div style={{ fontSize:12, fontWeight:600, marginBottom:8 }}>{forecastDays===7?t.weekForecast:t.dayForecast}</div>
          <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4, marginBottom:12 }}>
            {(daily.temperature_2m_max||[]).map((temp,i)=>{
              const rain = daily.precipitation_sum[i]||0;
              const code = daily.weather_code[i]||0;
              const dr   = getRisk(rain*2,temp,code>=95,rain);
              return (
                <button key={i} onClick={()=>setSelectedDay(selectedDay===i?null:i)}
                  style={{ flex:'0 0 58px', background:selectedDay===i?riskBg(dr):'#fff', border:`1px solid ${selectedDay===i?riskColor(dr):'#e5e7eb'}`, borderRadius:10, padding:'8px 4px', textAlign:'center', cursor:'pointer', borderBottom:`3px solid ${riskColor(dr)}` }}>
                  <div style={{ fontSize:10, color:'#9ca3af', marginBottom:2 }}>{i===0?(sw?'Leo':'Today'):days[new Date(daily.time[i]).getDay()]}</div>
                  <div style={{ fontSize:14, marginBottom:2 }}>{rain>20?'🌧️':rain>5?'🌦️':code>=95?'⛈️':'☀️'}</div>
                  <div style={{ fontSize:12, fontWeight:600 }}>{Math.round(temp)}°</div>
                  <div style={{ fontSize:10, color:'#6b7280' }}>{rain.toFixed(0)}mm</div>
                </button>
              );
            })}
          </div>

          {selectedDay!==null&&(
            <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, padding:12, marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>
                {days[new Date(daily.time[selectedDay]).getDay()]} — {new Date(daily.time[selectedDay]).toLocaleDateString()}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, fontSize:12 }}>
                <div><div style={{ color:'#9ca3af' }}>Max</div><div style={{ fontWeight:600 }}>{Math.round(daily.temperature_2m_max[selectedDay])}°C</div></div>
                <div><div style={{ color:'#9ca3af' }}>Min</div><div style={{ fontWeight:600 }}>{Math.round(daily.temperature_2m_min[selectedDay])}°C</div></div>
                <div><div style={{ color:'#9ca3af' }}>Rain</div><div style={{ fontWeight:600 }}>{(daily.precipitation_sum[selectedDay]||0).toFixed(1)}mm</div></div>
              </div>
            </div>
          )}

          {getAlerts().map((a,i)=>(
            <div key={i} style={{ background:riskBg(a.level), border:`1px solid ${riskColor(a.level)}30`, borderRadius:10, padding:'9px 12px', marginBottom:6, display:'flex', gap:8, alignItems:'flex-start' }}>
              <span style={{ fontSize:16 }}>{a.icon}</span>
              <div style={{ fontSize:12, color:riskColor(a.level), fontWeight:500 }}>{a.label}</div>
            </div>
          ))}
        </>
      )}

      {!curr&&!loading&&(
        <div style={{ textAlign:'center', padding:'2rem', color:'#9ca3af', fontSize:13 }}>
          {sw?'Chagua mkoa na ubonyeze Tafuta':'Select a region and tap Search'}
        </div>
      )}
    </div>
  );
}
