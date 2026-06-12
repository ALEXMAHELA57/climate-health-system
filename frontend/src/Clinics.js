import React, { useState } from 'react';
import { DISTRICTS, API, haversineDistance, findNearestDistrict, formatTime } from './constants';

export default function Clinics({ t, lang, district, onDistrictChange }) {
  const [selectedDistrict, setSelectedDistrict] = useState(district);
  const [clinics, setClinics]   = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [routeInfo, setRouteInfo]       = useState({});
  const [loadingClinics, setLoadingClinics]   = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [loadingRoutes, setLoadingRoutes]     = useState(false);
  const sw = lang === 'sw';

  async function search() {
    onDistrictChange(selectedDistrict);
    setLoadingClinics(true);
    setRouteInfo({});
    try {
      const res  = await fetch(`${API}/api/clinics/${selectedDistrict}`);
      const data = await res.json();
      const list = data.clinics || [];
      setClinics(list);
      if (list.length > 0) getUserLocation(list);
    } catch { setClinics([]); }
    setLoadingClinics(false);
  }

  function calcInstant(lat, lon, list) {
    const routes = {};
    list.forEach((c,i) => {
      if (c.lat && c.lon) {
        const roadDist = haversineDistance(lat, lon, c.lat, c.lon) * 1.3;
        const km = roadDist / 1000;
        routes[i] = {
          meters:   Math.round(roadDist),
          driveKm:  km.toFixed(1),
          driveMin: Math.max(1, Math.ceil(km/35*60)),
          walkKm:   km.toFixed(1),
          walkMin:  Math.max(1, Math.ceil(km/5*60)),
          isEstimate: true,
        };
      }
    });
    return routes;
  }

  function getUserLocation(list) {
    if (!navigator.geolocation) return;
    setGettingLocation(true);
    const watcher = navigator.geolocation.watchPosition(
      async pos => {
        navigator.geolocation.clearWatch(watcher);
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat:latitude, lon:longitude });
        setGettingLocation(false);
        const instant = calcInstant(latitude, longitude, list);
        setRouteInfo({ ...instant });
        setLoadingRoutes(true);
        try {
          const better = { ...instant };
          const fetchT = (url, ms) => new Promise((res,rej) => {
            const t = setTimeout(()=>rej(new Error('timeout')), ms);
            fetch(url).then(r=>{ clearTimeout(t); res(r); }).catch(e=>{ clearTimeout(t); rej(e); });
          });
          await Promise.all(list.map(async (c,i) => {
            if (!c.lat||!c.lon) return;
            try {
              const url  = `https://router.project-osrm.org/route/v1/driving/${longitude},${latitude};${c.lon},${c.lat}?overview=false`;
              const res  = await fetchT(url, 7000);
              const data = await res.json();
              const dist = data.routes?.[0]?.distance;
              const time = data.routes?.[0]?.duration;
              if (dist && time) {
                const km = dist/1000;
                better[i] = { meters:Math.round(dist), driveKm:km.toFixed(1), driveMin:Math.max(1,Math.ceil(time/60)), walkKm:km.toFixed(1), walkMin:Math.max(1,Math.ceil(km/5*60)), isEstimate:false };
              }
            } catch {}
          }));
          setRouteInfo({ ...better });
        } catch {}
        setLoadingRoutes(false);
      },
      ()=>setGettingLocation(false),
      { enableHighAccuracy:false, timeout:15000, maximumAge:60000 }
    );
    setTimeout(()=>{ navigator.geolocation.clearWatch(watcher); setGettingLocation(false); }, 16000);
  }

  function openDirections(c) {
    if (userLocation) window.open(`https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lon}/${c.lat},${c.lon}`,'_blank');
    else window.open(`https://www.google.com/maps/search/${encodeURIComponent(c.name+' '+c.address)}`,'_blank');
  }

  return (
    <div style={{ padding:16 }}>
      <div style={{ fontSize:16, fontWeight:700, marginBottom:10 }}>🏥 {t.clinics}</div>

      {/* Emergency */}
      <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'10px 14px', marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'#991b1b' }}>🚨 {t.emergency}</div>
          <div style={{ fontSize:11, color:'#6b7280' }}>Ambulance · Police · Fire</div>
        </div>
        <a href="tel:112" style={{ background:'#ef4444', color:'#fff', padding:'7px 14px', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none' }}>{t.callEmergency}</a>
      </div>

      {/* Search */}
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <select value={selectedDistrict} onChange={e=>setSelectedDistrict(e.target.value)}
          style={{ flex:1, padding:'9px 12px', borderRadius:10, border:'1px solid #e5e7eb', fontSize:14, background:'#fff' }}>
          {DISTRICTS.map(d=><option key={d}>{d}</option>)}
        </select>
        <button onClick={search} disabled={loadingClinics}
          style={{ padding:'9px 16px', background:'#2563eb', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:14, fontWeight:500 }}>
          {loadingClinics?'...':t.search}
        </button>
      </div>

      {/* Location status */}
      {clinics && (
        <div style={{ marginBottom:10 }}>
          {gettingLocation && <div style={{ fontSize:12, color:'#1d4ed8', background:'#eff6ff', borderRadius:8, padding:'6px 12px' }}>⟳ {sw?'Inapata eneo lako...':'Getting your location...'}</div>}
          {loadingRoutes && !gettingLocation && <div style={{ fontSize:12, color:'#1d4ed8', background:'#eff6ff', borderRadius:8, padding:'6px 12px' }}>⟳ {sw?'Inakokotoa umbali...':'Calculating distances...'}</div>}
          {userLocation && !gettingLocation && Object.keys(routeInfo).length > 0 && (() => {
            const first = routeInfo[0];
            const isFar = first && first.meters > 50000;
            return isFar ? (
              <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'9px 12px' }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#92400e', marginBottom:2 }}>⚠️ {sw?'Uko mbali na mkoa huu':'You are far from this region'}</div>
                <div style={{ fontSize:11, color:'#92400e', marginBottom:6 }}>{sw?`Umbali wa km ${first.driveKm} kutoka kwako`:`You are ${first.driveKm}km away`}</div>
                <button onClick={()=>{ const n=findNearestDistrict(userLocation.lat,userLocation.lon); setSelectedDistrict(n); onDistrictChange(n); setClinics(null); setRouteInfo({}); }}
                  style={{ fontSize:11, color:'#1d4ed8', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:6, padding:'4px 12px', cursor:'pointer' }}>
                  📍 {sw?'Nionyeshe kliniki karibu nami':'Show clinics near me'}
                </button>
              </div>
            ) : (
              <div style={{ fontSize:12, color:'#166534', background:'#f0fdf4', borderRadius:8, padding:'6px 12px' }}>
                📍 {sw?'Umbali kutoka kwako':'Distances from your location'}
              </div>
            );
          })()}
          {!userLocation && !gettingLocation && (
            <button onClick={()=>getUserLocation(clinics)} style={{ width:'100%', padding:'8px', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, fontSize:12, color:'#374151', cursor:'pointer' }}>
              📍 {sw?'Pata umbali kutoka kwako':'Get distance from my location'}
            </button>
          )}
        </div>
      )}

      {/* When to go */}
      <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:'10px 12px', marginBottom:12 }}>
        <div style={{ fontSize:12, fontWeight:600, marginBottom:7 }}>⏰ {t.whenToGo}</div>
        {[
          { title:sw?'Nenda SASA ukiwa na':'Go NOW if you have', items:sw?['Maumivu ya kifua','Ugumu wa kupumua','Kutoweza kuamka','Damu nyingi','Mshtuko wa moyo']:['Chest pain','Difficulty breathing','Unconsciousness','Heavy bleeding','Seizures'], color:'#ef4444', bg:'#fef2f2' },
          { title:sw?'Nenda ndani ya masaa 24':'Go within 24 hrs for', items:sw?['Homa kali >39°C','Kutapika muda mrefu','Dalili za malaria','Kuharisha muda mrefu']:['High fever >39°C','Persistent vomiting','Malaria symptoms','Prolonged diarrhoea'], color:'#f59e0b', bg:'#fffbeb' },
        ].map((g,i)=>(
          <div key={i} style={{ background:g.bg, borderRadius:8, padding:'7px 10px', marginBottom:5 }}>
            <div style={{ fontSize:11, fontWeight:600, color:g.color, marginBottom:3 }}>{g.title}</div>
            {g.items.map((item,j)=><div key={j} style={{ fontSize:11, color:'#374151', marginBottom:1 }}>• {item}</div>)}
          </div>
        ))}
      </div>

      {/* Clinic cards */}
      {clinics && clinics.map((c,i)=>{
        const route = routeInfo[i];
        const isNear = route && route.meters < 2000;
        return (
          <div key={i} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:13, marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:7 }}>
              <div style={{ flex:1, marginRight:8 }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#111', marginBottom:2 }}>{c.name}</div>
                <div style={{ fontSize:11, color:'#6b7280', marginBottom:5 }}>{c.address}</div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  <span style={{ fontSize:11, background:'#eff6ff', color:'#1d4ed8', padding:'2px 8px', borderRadius:99 }}>{c.type}</span>
                  <span style={{ fontSize:11, background:'#f0fdf4', color:'#166534', padding:'2px 8px', borderRadius:99 }}>{c.hours}</span>
                </div>
              </div>
              <a href={`tel:${c.phone}`} style={{ background:'#dcfce7', color:'#166534', padding:'7px 10px', borderRadius:10, fontSize:11, fontWeight:600, textDecoration:'none', whiteSpace:'nowrap' }}>
                📞 {c.phone}
              </a>
            </div>

            {route && (
              <div style={{ background:isNear?'#f0fdf4':'#f9fafb', border:`1px solid ${isNear?'#bbf7d0':'#e5e7eb'}`, borderRadius:8, padding:'7px 10px', marginBottom:7 }}>
                <div style={{ display:'flex', gap:14, flexWrap:'wrap', alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ fontSize:15 }}>🚶</span>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700 }}>{route.meters<1000?`${route.meters}m`:route.walkKm+'km'} · {formatTime(route.walkMin)}</div>
                      <div style={{ fontSize:10, color:'#9ca3af' }}>{sw?'Kutembea':'Walking'}</div>
                    </div>
                  </div>
                  <div style={{ width:1, height:26, background:'#e5e7eb' }} />
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ fontSize:15 }}>🚗</span>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700 }}>{route.driveKm}km · {formatTime(route.driveMin)}</div>
                      <div style={{ fontSize:10, color:'#9ca3af' }}>{sw?'Gari':'Driving'}</div>
                    </div>
                  </div>
                  {isNear && <span style={{ fontSize:11, color:'#166534', fontWeight:600, background:'#dcfce7', padding:'2px 8px', borderRadius:99 }}>✓ {sw?'Karibu':'Nearby'}</span>}
                  {route.isEstimate && <span style={{ fontSize:10, color:'#9ca3af', marginLeft:'auto' }}>~{sw?'Kadirio':'est.'}</span>}
                </div>
              </div>
            )}

            {c.lat && (
              <button onClick={()=>openDirections(c)}
                style={{ width:'100%', padding:'7px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, fontSize:12, color:'#1d4ed8', cursor:'pointer', fontWeight:500 }}>
                🗺️ {sw?'Ona Njia kwenye Ramani':'Get Directions on Map'}
              </button>
            )}
          </div>
        );
      })}

      {!clinics && !loadingClinics && (
        <div style={{ textAlign:'center', padding:'2rem', color:'#9ca3af', fontSize:13 }}>
          {sw?'Chagua mkoa na ubonyeze Tafuta':'Select a region and tap Search'}
        </div>
      )}
    </div>
  );
}
