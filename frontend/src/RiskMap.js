import React, { useState, useEffect } from 'react';
import { DISTRICT_COORDS, getRisk, riskColor, riskBg, findNearestDistrict } from './constants';
import { SkeletonRow } from './Skeleton';
import OutbreakTracker from './OutbreakTracker';

export default function RiskMap({ t, lang }) {
  const [layer, setLayer]               = useState('overall');
  const [districtRisks, setDistrictRisks] = useState({});
  const [selected, setSelected]         = useState(null);
  const [loading, setLoading]           = useState(false);
  const sw = lang === 'sw';
  const districtList = Object.keys(DISTRICT_COORDS);

  useEffect(() => {
    if (layer !== 'outbreak') loadRiskData();
  }, [layer]);

  async function loadRiskData() {
    setLoading(true);
    const all = Object.keys(DISTRICT_COORDS);
    const batchSize = 6;
    for (let i = 0; i < all.length; i += batchSize) {
      const batch = all.slice(i, i + batchSize);
      await Promise.all(batch.map(async d => {
        try {
          const c = DISTRICT_COORDS[d];
          const res  = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&daily=temperature_2m_max,precipitation_sum,weather_code&timezone=Africa/Dar_es_Salaam&forecast_days=7`);
          const data = await res.json();
          const rain7    = (data.daily?.precipitation_sum||[]).reduce((a,b)=>a+b,0);
          const maxTemp  = Math.max(...(data.daily?.temperature_2m_max||[0]));
          const maxDaily = Math.max(...(data.daily?.precipitation_sum||[0]));
          const todayRain = data.daily?.precipitation_sum?.[0]||0;
          const hasStorm = (data.daily?.weather_code||[]).some(c=>c>=95);
          let risk = getRisk(rain7,maxTemp,hasStorm,maxDaily);
          if (layer==='malaria') risk = rain7>60?'emergency':rain7>30?'high':rain7>10?'medium':'low';
          if (layer==='flood')   risk = (hasStorm&&maxDaily>50)?'emergency':maxDaily>25?'high':maxDaily>10?'medium':'low';
          if (layer==='drought') risk = rain7<2?'high':rain7<10?'medium':'low';
          setDistrictRisks(prev=>({ ...prev, [d]:{ risk, rain7, maxTemp, hasStorm, maxDaily, todayRain } }));
        } catch { setDistrictRisks(prev=>({ ...prev, [d]:{ risk:'unknown' } })); }
      }));
    }
    setLoading(false);
  }

  const layers = [
    { id:'overall', label:t.overallRisk, icon:'🌡️' },
    { id:'malaria', label:t.malaria,     icon:'🦟' },
    { id:'flood',   label:t.flood,       icon:'🌊' },
    { id:'drought', label:t.drought,     icon:'🏜️' },
    { id:'outbreak',label:t.outbreak,    icon:'🦠' },
  ];

  return (
    <div style={{ padding: layer==='outbreak' ? 0 : 16 }}>
      {layer !== 'outbreak' && (
        <div style={{ fontSize:16, fontWeight:700, marginBottom:10 }}>🗺️ {t.riskMap}</div>
      )}

      <div style={{ display:'flex', gap:6, marginBottom:layer==='outbreak'?0:12, flexWrap:'wrap', padding: layer==='outbreak' ? '16px 16px 0' : 0 }}>
        {layers.map(l=>(
          <button key={l.id} onClick={()=>setLayer(l.id)}
            style={{ flex:'0 0 auto', padding:'6px 11px', borderRadius:8, border:'none', background:layer===l.id?'#2563eb':'#f3f4f6', color:layer===l.id?'#fff':'#374151', fontSize:12, fontWeight:500, cursor:'pointer' }}>
            {l.icon} {l.label}
          </button>
        ))}
      </div>

      {/* Outbreak layer — real community symptom data, not weather */}
      {layer === 'outbreak' && (
        <OutbreakTracker lang={lang} />
      )}

      {/* Weather-based layers */}
      {layer !== 'outbreak' && (
        <>
          {loading && <div style={{ fontSize:12, color:'#9ca3af', marginBottom:8 }}>⟳ {sw?'Inapakia data...':'Loading risk data...'}</div>}

          <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
            {[['low','🟢 Low'],['medium','🟡 Medium'],['high','🟠 High'],['emergency','🔴 Emergency']].map(([r,label])=>(
              <div key={r} style={{ fontSize:11, background:riskBg(r), border:`1px solid ${riskColor(r)}40`, borderRadius:99, padding:'2px 9px', color:riskColor(r), fontWeight:500 }}>{label}</div>
            ))}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {districtList.map(d=>{
              const info = districtRisks[d];
              if (!info) return <SkeletonRow key={d} />;
              if (info.risk==='unknown') return (
                <div key={d} style={{ background:'#fff', border:'1px solid #fde68a', borderRadius:10, padding:'9px 12px', display:'flex', justifyContent:'space-between' }}>
                  <div style={{ fontSize:13 }}>{d}</div>
                  <span style={{ fontSize:11, color:'#d97706' }}>⚠ no data</span>
                </div>
              );
              return (
                <button key={d} onClick={()=>setSelected(selected===d?null:d)}
                  style={{ background:selected===d?riskBg(info.risk):'#fff', border:`1px solid ${selected===d?riskColor(info.risk):'#e5e7eb'}`, borderRadius:10, padding:'9px 12px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', textAlign:'left', width:'100%' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500 }}>{d}</div>
                    {selected===d && info.rain7!==undefined && (
                      <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>
                        🌧️ {info.rain7?.toFixed(0)}mm · 🌡️ {Math.round(info.maxTemp||0)}°C{info.hasStorm?' · ⛈️ Storm':''}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, padding:'2px 10px', borderRadius:99, background:riskBg(info.risk), color:riskColor(info.risk), border:`1px solid ${riskColor(info.risk)}30` }}>
                    {info.risk?.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
