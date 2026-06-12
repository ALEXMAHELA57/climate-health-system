import React, { useState, useEffect, lazy, Suspense } from 'react';
import { API, T } from './constants';
import UserProfile from './UserProfile';
import CommunityReport from './CommunityReport';

const Home     = lazy(() => import('./Home'));
const Weather  = lazy(() => import('./Weather'));
const Symptoms = lazy(() => import('./Symptoms'));
const Clinics  = lazy(() => import('./Clinics'));
const RiskMap  = lazy(() => import('./RiskMap'));
const AdminDashboard = lazy(() => import('./AdminDashboard'));

function Loader() {
  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', padding:'3rem', color:'#9ca3af' }}>
      <div style={{ width:24, height:24, border:'3px solid #e5e7eb', borderTopColor:'#2563eb', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
    </div>
  );
}

export default function App() {
  const [page, setPage]         = useState('home');
  const [lang, setLang]         = useState(()=>localStorage.getItem('afya_lang')||'en');
  const [district, setDistrict] = useState(()=>localStorage.getItem('afya_district')||'Dar es Salaam');
  const [showAdmin, setShowAdmin] = useState(()=>window.location.hash==='#admin');
  const t = T[lang] || T.en;

  useEffect(()=>{
    function onHash(){ setShowAdmin(window.location.hash==='#admin'); }
    window.addEventListener('hashchange', onHash);
    fetch(`${API}/`).catch(()=>{});
    return ()=>window.removeEventListener('hashchange', onHash);
  },[]);

  function handleLangChange(l){ setLang(l); localStorage.setItem('afya_lang',l); }
  function handleDistrictChange(d){ setDistrict(d); localStorage.setItem('afya_district',d); }

  if (showAdmin) return (
    <Suspense fallback={<Loader />}>
      <AdminDashboard lang={lang} onClose={()=>{ window.location.hash=''; setShowAdmin(false); }} />
    </Suspense>
  );

  const tabs = [
    { id:'home',     icon:'🏠', label:t.home     },
    { id:'weather',  icon:'🌤️', label:t.weather  },
    { id:'symptoms', icon:'🤒', label:t.symptoms },
    { id:'map',      icon:'🗺️', label:'Risk Map' },
    { id:'clinics',  icon:'🏥', label:t.clinics  },
    { id:'profile',  icon:'👤', label:t.profile  },
  ];

  return (
    <div style={{ maxWidth:480, margin:'0 auto', minHeight:'100vh', display:'flex', flexDirection:'column', background:'#f3f4f6' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; } select, input, textarea, button { font-family: inherit; }`}</style>

      {/* Header */}
      <div style={{ background:'#2563eb', color:'#fff', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div>
          <div style={{ fontSize:17, fontWeight:700 }}>🌍 AfyaHewa</div>
          <div style={{ fontSize:11, opacity:0.8 }}>📍 {district}</div>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <button onClick={()=>handleLangChange(lang==='en'?'sw':'en')}
            style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', borderRadius:99, padding:'4px 10px', fontSize:12, cursor:'pointer', fontWeight:600 }}>
            {lang==='en'?'SW':'EN'}
          </button>
          <div style={{ fontSize:11, background:'rgba(255,255,255,0.2)', padding:'3px 8px', borderRadius:99 }}>🟢</div>
        </div>
      </div>

      {/* Page content */}
      <div style={{ flex:1, overflowY:'auto', paddingBottom:68 }}>
        <Suspense fallback={<Loader />}>
          {page==='home'     && <Home     t={t} lang={lang} district={district} onDistrictChange={handleDistrictChange} setPage={setPage} />}
          {page==='weather'  && <Weather  t={t} lang={lang} district={district} onDistrictChange={handleDistrictChange} />}
          {page==='symptoms' && <Symptoms t={t} lang={lang} district={district} />}
          {page==='clinics'  && <Clinics  t={t} lang={lang} district={district} onDistrictChange={handleDistrictChange} />}
          {page==='map'      && <RiskMap  t={t} lang={lang} />}
          {page==='profile'  && <UserProfile lang={lang} onLangChange={handleLangChange} onDistrictChange={handleDistrictChange} />}
          {page==='report'   && <CommunityReport lang={lang} />}
        </Suspense>
      </div>

      {/* Bottom nav */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, background:'#fff', borderTop:'1px solid #e5e7eb', display:'flex', zIndex:100 }}>
        {tabs.map(tab=>(
          <button key={tab.id} onClick={()=>setPage(tab.id)}
            style={{ flex:1, padding:'8px 2px', border:'none', background:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:2,
              borderTop:page===tab.id?'2px solid #2563eb':'2px solid transparent' }}>
            <span style={{ fontSize:17 }}>{tab.icon}</span>
            <span style={{ fontSize:9, fontWeight:500, color:page===tab.id?'#2563eb':'#9ca3af' }}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
