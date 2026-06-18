import React, { useState, useEffect, lazy, Suspense } from 'react';
import { API, T } from './constants';
import UserProfile from './UserProfile';
import CommunityReport from './CommunityReport';
import Onboarding from './Onboarding';
import OfflineEmergency from './OfflineEmergency';

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

function EmergencyPage({ lang, setPage }) {
  const sw = lang === 'sw';
  return (
    <div>
      <div style={{ padding:'12px 16px 0' }}>
        <button onClick={()=>setPage('home')}
          style={{ background:'none', border:'none', color:'#2563eb', fontSize:13, cursor:'pointer', padding:0, fontWeight:500 }}>
          ‹ {sw?'Rudi Nyumbani':'Back to Home'}
        </button>
      </div>
      <OfflineEmergency lang={lang} />
    </div>
  );
}

export default function App() {
  const [page, setPage]         = useState('home');
  const [lang, setLang]         = useState(()=>localStorage.getItem('afya_lang')||'en');
  const [district, setDistrict] = useState(()=>localStorage.getItem('afya_district')||'Dar es Salaam');
  const [showAdmin, setShowAdmin] = useState(()=>window.location.hash==='#admin');
  const [showOnboarding, setShowOnboarding] = useState(()=>!localStorage.getItem('afya_onboarded'));
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [updateReady, setUpdateReady] = useState(false);
  const t = T[lang] || T.en;

  useEffect(()=>{
    function onHash(){ setShowAdmin(window.location.hash==='#admin'); }
    window.addEventListener('hashchange', onHash);
    // Wake up backend immediately
    fetch(`${API}/`).catch(()=>{});
    // Keep Render warm — ping every 10 minutes to prevent cold starts
    // Render free tier sleeps after 15min of inactivity
    const keepAlive = setInterval(()=>{
      fetch(`${API}/`).catch(()=>{});
    }, 10 * 60 * 1000); // every 10 minutes
    return ()=>{
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(keepAlive);
    };

    function goOnline(){ setIsOnline(true); }
    function goOffline(){ setIsOnline(false); }
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Listen for service worker update messages
    function onSwMessage(e) {
      if (e.data && e.data.type === 'SW_UPDATED') setUpdateReady(true);
    }
    navigator.serviceWorker?.addEventListener('message', onSwMessage);

    // Check if a new SW is waiting on load
    navigator.serviceWorker?.ready.then(reg => {
      if (reg.waiting) setUpdateReady(true);
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateReady(true);
          }
        });
      });
    });


  },[]);

  function handleLangChange(l){ setLang(l); localStorage.setItem('afya_lang',l); }
  function handleDistrictChange(d){ setDistrict(d); localStorage.setItem('afya_district',d); }

  if (showAdmin) return (
    <Suspense fallback={<Loader />}>
      <AdminDashboard lang={lang} onClose={()=>{ window.location.hash=''; setShowAdmin(false); }} />
    </Suspense>
  );

  if (showOnboarding) {
    return <Onboarding lang={lang} onFinish={()=>setShowOnboarding(false)} />;
  }

  // Pages that require network — show offline emergency fallback instead
  const onlineRequiredPages = ['weather', 'symptoms', 'map', 'clinics', 'report', 'profile'];
  const showOfflineFallback = !isOnline && onlineRequiredPages.includes(page);

  const tabs = [
    { id:'home',     icon:'🏠', label:t.home     },
    { id:'weather',  icon:'🌤️', label:t.weather  },
    { id:'symptoms', icon:'🤒', label:t.symptoms },
    { id:'clinics',  icon:'🏥', label:t.clinics  },
    { id:'report',   icon:'📢', label:lang==='sw'?'Ripoti':'Report' },
    { id:'profile',  icon:'👤', label:t.profile  },
  ];

  return (
    <div style={{ maxWidth:480, margin:'0 auto', minHeight:'100vh', display:'flex', flexDirection:'column', background:'#f3f4f6' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        * { box-sizing: border-box; }
        select, input, textarea, button { font-family: inherit; }
      `}</style>

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
          <div title={isOnline ? (lang==='sw'?'Mtandaoni':'Online') : (lang==='sw'?'Nje ya mtandao':'Offline')}
            style={{ fontSize:11, background:'rgba(255,255,255,0.2)', padding:'3px 8px', borderRadius:99 }}>
            {isOnline ? '🟢' : '🔴'}
          </div>
        </div>
      </div>

      {/* Update available banner */}
      {updateReady && (
        <div style={{ background:'#2563eb', padding:'7px 16px', fontSize:12, color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>🆕 {lang==='sw'?'Toleo jipya linapatikana':'New version available'}</span>
          <button onClick={()=>{ window.location.reload(); }}
            style={{ background:'#fff', color:'#2563eb', border:'none', borderRadius:6, padding:'3px 10px', fontSize:12, fontWeight:700, cursor:'pointer' }}>
            {lang==='sw'?'Sasisha':'Update'}
          </button>
        </div>
      )}

      {/* Offline banner */}
      {!isOnline && (
        <div style={{ background:'#fef3c7', borderBottom:'1px solid #fde68a', padding:'7px 16px', fontSize:12, color:'#92400e', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:14 }}>📡</span>
          {lang==='sw' ? 'Hauna intaneti. Taarifa za msingi zinaonyeshwa.' : "You're offline. Showing essential info only."}
        </div>
      )}

      {/* Page content */}
      <div style={{ flex:1, overflowY:'auto', paddingBottom:68 }}>
        {showOfflineFallback ? (
          <OfflineEmergency lang={lang} />
        ) : (
          <Suspense fallback={<Loader />}>
            {page==='home'      && <Home     t={t} lang={lang} district={district} onDistrictChange={handleDistrictChange} setPage={setPage} />}
            {page==='weather'   && <Weather  t={t} lang={lang} district={district} onDistrictChange={handleDistrictChange} />}
            {page==='symptoms'  && <Symptoms t={t} lang={lang} district={district} setPage={setPage} />}
            {page==='clinics'   && <Clinics  t={t} lang={lang} district={district} onDistrictChange={handleDistrictChange} />}
            {page==='map'       && <RiskMap  t={t} lang={lang} />}
            {page==='profile'   && <UserProfile lang={lang} onLangChange={handleLangChange} onDistrictChange={handleDistrictChange} />}
            {page==='report'    && <CommunityReport lang={lang} />}
            {page==='emergency' && <EmergencyPage lang={lang} setPage={setPage} />}
          </Suspense>
        )}
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
