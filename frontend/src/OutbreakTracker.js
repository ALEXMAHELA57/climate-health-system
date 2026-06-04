import React, { useState, useEffect } from 'react';

const API = 'https://climate-health-system-backend.onrender.com';

const RISK_COLORS = {
  low:       { bg:'#f0fdf4', border:'#bbf7d0', text:'#166534', dot:'#22c55e' },
  medium:    { bg:'#fffbeb', border:'#fde68a', text:'#92400e', dot:'#f59e0b' },
  high:      { bg:'#fef2f2', border:'#fecaca', text:'#991b1b', dot:'#ef4444' },
  emergency: { bg:'#fef2f2', border:'#f87171', text:'#7f1d1d', dot:'#7f1d1d' },
  loading:   { bg:'#f9fafb', border:'#e5e7eb', text:'#9ca3af', dot:'#d1d5db' },
};

function RiskPill({ risk, label }) {
  const c = RISK_COLORS[risk] || RISK_COLORS.loading;
  return (
    <span style={{ background:c.bg, color:c.text,
      border:`1px solid ${c.border}`,
      padding:'2px 9px', borderRadius:99, fontSize:11, fontWeight:600 }}>
      {label}
    </span>
  );
}

export default function OutbreakTracker({ t, lang }) {
  const [summary, setSummary]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [totalReports, setTotalReports] = useState(0);
  const [lastUpdated, setLastUpdated]   = useState(null);

  const rl = {
    en: { low:'Low', medium:'Medium', high:'High', emergency:'Emergency' },
    sw: { low:'Chini', medium:'Kati', high:'Juu', emergency:'Dharura' },
  }[lang] || { low:'Low', medium:'Medium', high:'High', emergency:'Emergency' };

  const T = {
    en: {
      title: '🦠 Disease Outbreak Tracker',
      sub: 'Anonymous symptom reports from your community',
      loading: 'Loading community health data...',
      noData: 'No symptom reports yet this week. Data builds up as people use the symptom checker.',
      totalReports: 'Total reports this week',
      topSymptoms: 'Top reported symptoms',
      weeklyReports: 'Weekly reports',
      alerts: 'Outbreak alerts',
      noAlerts: 'No outbreak alerts for this district',
      howItWorks: 'How it works',
      howText: 'Every time someone uses the Symptom Checker, their symptoms are anonymously recorded. If many people in the same district report similar symptoms, the system flags a potential outbreak.',
      thresholds: 'Alert thresholds',
      thresh1: '5+ fever reports in 7 days → High malaria/flu alert',
      thresh2: '5+ diarrhoea reports → Possible cholera alert',
      thresh3: '20+ total reports → Unusual activity alert',
      updated: 'Updated',
      reports: 'reports',
      thisWeek: 'this week',
      districtDetails: 'District details',
      back: '← Back',
    },
    sw: {
      title: '🦠 Ufuatiliaji wa Mlipuko wa Magonjwa',
      sub: 'Ripoti za dalili zisizo na jina kutoka kwa jamii yako',
      loading: 'Inapakia data ya afya ya jamii...',
      noData: 'Hakuna ripoti za dalili wiki hii. Data inakua watu wanapotumia ukaguzi wa dalili.',
      totalReports: 'Jumla ya ripoti wiki hii',
      topSymptoms: 'Dalili zinazoripotiwa zaidi',
      weeklyReports: 'Ripoti za kila wiki',
      alerts: 'Tahadhari za mlipuko',
      noAlerts: 'Hakuna tahadhari za mlipuko kwa wilaya hii',
      howItWorks: 'Jinsi inavyofanya kazi',
      howText: 'Kila wakati mtu anatumia Ukaguzi wa Dalili, dalili zao zinarekodiwa bila jina. Ikiwa watu wengi katika wilaya moja wanaripoti dalili sawa, mfumo unaonya mlipuko unaowezekana.',
      thresholds: 'Viwango vya tahadhari',
      thresh1: 'Ripoti 5+ za homa kwa siku 7 → Tahadhari ya malaria/homa',
      thresh2: 'Ripoti 5+ za kuharisha → Tahadhari ya kipindupindu',
      thresh3: 'Ripoti 20+ zote → Tahadhari ya shughuli isiyo ya kawaida',
      updated: 'Imesasishwa',
      reports: 'ripoti',
      thisWeek: 'wiki hii',
      districtDetails: 'Maelezo ya wilaya',
      back: '← Rudi',
    },
  }[lang] || {};

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/outbreak/summary`);
      const data = await res.json();
      setSummary(data.summary || []);
      setTotalReports(data.total_reports || 0);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch(e) {
      setSummary([]);
    }
    setLoading(false);
  }

  if (selected) {
    return <DistrictDetail district={selected} onBack={()=>setSelected(null)} T={T} rl={rl} lang={lang}/>;
  }

  return (
    <div style={{ padding:16 }}>
      <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>{T.title}</div>
      <div style={{ fontSize:12, color:'#6b7280', marginBottom:2 }}>{T.sub}</div>
      {lastUpdated && (
        <div style={{ fontSize:11, color:'#9ca3af', marginBottom:12 }}>
          🔄 {T.updated}: {lastUpdated}
        </div>
      )}

      {/* Total reports card */}
      <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe',
        borderRadius:12, padding:'12px 14px', marginBottom:14,
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'#1d4ed8' }}>{T.totalReports}</div>
          <div style={{ fontSize:28, fontWeight:700, color:'#1d4ed8' }}>{totalReports}</div>
        </div>
        <div style={{ fontSize:40 }}>📊</div>
      </div>

      {loading && (
        <div style={{ textAlign:'center', padding:'2rem', color:'#9ca3af', fontSize:14 }}>
          <div style={{ width:24, height:24, border:'2px solid #e5e7eb',
            borderTopColor:'#2563eb', borderRadius:'50%',
            animation:'spin 0.7s linear infinite', margin:'0 auto 10px' }}/>
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
          {T.loading}
        </div>
      )}

      {!loading && summary.length === 0 && (
        <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb',
          borderRadius:12, padding:'1.5rem', textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🏥</div>
          <div style={{ fontSize:13, color:'#6b7280', lineHeight:1.6 }}>{T.noData}</div>
        </div>
      )}

      {!loading && summary.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {summary.map((item, i) => (
            <button key={i} onClick={()=>setSelected(item.district)}
              style={{ background:'#fff', border:`1px solid ${
                item.risk==='low'?'#e5e7eb':RISK_COLORS[item.risk].border}`,
                borderRadius:12, padding:'12px 14px', cursor:'pointer',
                textAlign:'left',
                borderLeft:`4px solid ${RISK_COLORS[item.risk]?.dot||'#e5e7eb'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between',
                alignItems:'center', marginBottom:6 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#111' }}>
                  {item.district}
                </div>
                <RiskPill risk={item.risk} label={rl[item.risk]}/>
              </div>
              <div style={{ fontSize:12, color:'#6b7280', marginBottom:6 }}>
                📋 {item.total_reports} {T.reports} {T.thisWeek}
              </div>
              {item.top_symptoms?.length > 0 && (
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {item.top_symptoms.slice(0,3).map(([sym, count], j) => (
                    <span key={j} style={{ background:'#f3f4f6', color:'#374151',
                      padding:'2px 8px', borderRadius:99, fontSize:11 }}>
                      {sym} ({count})
                    </span>
                  ))}
                </div>
              )}
              {item.alerts?.length > 0 && (
                <div style={{ marginTop:6 }}>
                  {item.alerts.slice(0,1).map((alert, j) => (
                    <div key={j} style={{ fontSize:11,
                      color:RISK_COLORS[item.risk]?.text||'#374151',
                      background:RISK_COLORS[item.risk]?.bg||'#f9fafb',
                      padding:'3px 8px', borderRadius:6, marginTop:3 }}>
                      ⚠️ {alert}
                    </div>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* How it works */}
      <div style={{ background:'#f9fafb', border:'1px solid #f3f4f6',
        borderRadius:12, padding:14, marginTop:16 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:8 }}>
          ℹ️ {T.howItWorks}
        </div>
        <div style={{ fontSize:12, color:'#6b7280', lineHeight:1.6, marginBottom:10 }}>
          {T.howText}
        </div>
        <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:6 }}>
          {T.thresholds}:
        </div>
        {[T.thresh1, T.thresh2, T.thresh3].map((th, i) => (
          <div key={i} style={{ fontSize:12, color:'#6b7280',
            marginBottom:4, display:'flex', gap:6 }}>
            <span style={{ color:'#ef4444', flexShrink:0 }}>•</span>{th}
          </div>
        ))}
      </div>
    </div>
  );
}

function DistrictDetail({ district, onBack, T, rl, lang }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res  = await fetch(
          `https://climate-health-system-backend.onrender.com/api/outbreak/district/${encodeURIComponent(district)}`
        );
        const json = await res.json();
        setData(json);
      } catch(e) {}
      setLoading(false);
    }
    load();
  }, [district]);

  return (
    <div style={{ padding:16 }}>
      <button onClick={onBack}
        style={{ background:'none', border:'none', color:'#2563eb',
          fontSize:14, cursor:'pointer', padding:0, marginBottom:14,
          fontWeight:500, minHeight:'auto' }}>
        {T.back}
      </button>

      <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>{district}</div>
      <div style={{ fontSize:12, color:'#6b7280', marginBottom:14 }}>{T.districtDetails}</div>

      {loading && (
        <div style={{ textAlign:'center', padding:'2rem', color:'#9ca3af' }}>
          <div style={{ width:24, height:24, border:'2px solid #e5e7eb',
            borderTopColor:'#2563eb', borderRadius:'50%',
            animation:'spin 0.7s linear infinite', margin:'0 auto 10px' }}/>
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
          {T.loading}
        </div>
      )}

      {data && !loading && (
        <>
          <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe',
            borderRadius:12, padding:'12px 14px', marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#1d4ed8', marginBottom:2 }}>
              {lang==='en'?'Last 30 days':'Siku 30 zilizopita'}
            </div>
            <div style={{ fontSize:28, fontWeight:700, color:'#1d4ed8' }}>
              {data.last_30_days} {T.reports}
            </div>
          </div>

          {Object.keys(data.weekly_trend || {}).length > 0 && (
            <div style={{ background:'#fff', border:'1px solid #e5e7eb',
              borderRadius:12, padding:14, marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:10 }}>
                📅 {T.weeklyReports}
              </div>
              {Object.entries(data.weekly_trend).slice(-4).reverse().map(([week, wdata], i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', padding:'8px 0',
                  borderBottom: i < 3 ? '1px solid #f3f4f6' : 'none' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:'#111' }}>{week}</div>
                    <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>
                      {Object.entries(wdata.symptoms).slice(0,3)
                        .map(([s,c])=>`${s}(${c})`).join(' · ')}
                    </div>
                  </div>
                  <div style={{ fontSize:20, fontWeight:700, color:'#2563eb' }}>
                    {wdata.count}
                  </div>
                </div>
              ))}
            </div>
          )}

          {Object.keys(data.weekly_trend || {}).length === 0 && (
            <div style={{ textAlign:'center', padding:'1.5rem',
              color:'#9ca3af', fontSize:13 }}>
              {T.noData}
            </div>
          )}
        </>
      )}
    </div>
  );
}
