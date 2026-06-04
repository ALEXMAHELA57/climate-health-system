import React, { useState, useEffect } from 'react';

const API = 'https://climate-health-system-backend.onrender.com';

const REPORT_TYPES = [
  { id: 'flooding', icon: '🌊', label: 'Flooding', labelSw: 'Mafuriko', color: '#1d4ed8', bg: '#eff6ff' },
  { id: 'sick_people', icon: '🤒', label: 'Many Sick People', labelSw: 'Watu Wagonjwa Wengi', color: '#b45309', bg: '#fffbeb' },
  { id: 'contaminated_water', icon: '💧', label: 'Dirty/Unsafe Water', labelSw: 'Maji Machafu', color: '#0e7490', bg: '#ecfeff' },
  { id: 'drought', icon: '🏜️', label: 'Drought/No Water', labelSw: 'Ukame/Kukosa Maji', color: '#92400e', bg: '#fef3c7' },
  { id: 'dead_animals', icon: '🐄', label: 'Dead Animals', labelSw: 'Wanyama Waliokufa', color: '#7c3aed', bg: '#f5f3ff' },
  { id: 'road_blocked', icon: '🚧', label: 'Road Blocked', labelSw: 'Barabara Imezuiwa', color: '#b91c1c', bg: '#fef2f2' },
];

const DISTRICTS = [
  'Arusha','Dar es Salaam','Dodoma','Geita','Iringa','Kagera','Katavi',
  'Kigoma','Kilimanjaro','Lindi','Manyara','Mara','Mbeya','Morogoro',
  'Mtwara','Mwanza','Njombe','Pwani','Rukwa','Ruvuma','Shinyanga',
  'Simiyu','Singida','Songea','Tabora','Tanga',
  'Zanzibar North','Zanzibar South','Zanzibar West','Pemba North','Pemba South'
];

export default function CommunityReport({ lang = 'en' }) {
  const sw = lang === 'sw';
  const [selected, setSelected] = useState(null);
  const [district, setDistrict] = useState(() => localStorage.getItem('afya_district') || 'Dar es Salaam');
  const [details, setDetails] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [recentReports, setRecentReports] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => { fetchReports(); }, []);

  async function fetchReports() {
    try {
      const res = await fetch(`${API}/api/community/reports?limit=10`);
      const data = await res.json();
      setRecentReports(data.reports || []);
    } catch { /* offline */ }
  }

  async function submit() {
    if (!selected) { setError(sw ? 'Chagua aina ya ripoti' : 'Please select a report type'); return; }
    setError('');
    setSubmitting(true);
    try {
      await fetch(`${API}/api/community/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selected, district, details, severity, language: lang, timestamp: new Date().toISOString() })
      });
      // Save locally even if API fails
      const local = JSON.parse(localStorage.getItem('afya_my_reports') || '[]');
      local.push({ type: selected, district, details, severity, date: new Date().toISOString() });
      localStorage.setItem('afya_my_reports', JSON.stringify(local.slice(-10)));
      setSubmitted(true);
      setTimeout(() => { setSubmitted(false); setSelected(null); setDetails(''); setSeverity('medium'); fetchReports(); }, 3000);
    } catch {
      // Still save locally
      const local = JSON.parse(localStorage.getItem('afya_my_reports') || '[]');
      local.push({ type: selected, district, details, severity, date: new Date().toISOString() });
      localStorage.setItem('afya_my_reports', JSON.stringify(local.slice(-10)));
      setSubmitted(true);
      setTimeout(() => { setSubmitted(false); setSelected(null); setDetails(''); setSeverity('medium'); }, 3000);
    }
    setSubmitting(false);
  }

  if (submitted) return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#166534', marginBottom: 6 }}>
        {sw ? 'Ripoti Imetumwa!' : 'Report Submitted!'}
      </div>
      <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
        {sw ? 'Asante. Ripoti yako itasaidia jamii.' : 'Thank you. Your report helps protect the community.'}
      </div>
    </div>
  );

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>📢 {sw ? 'Ripoti ya Jamii' : 'Community Report'}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
        {sw ? 'Ripoti tatizo linaloweza kuathiri afya au usalama' : 'Report something that may affect health or safety in your area'}
      </div>

      {/* Report type selection */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {REPORT_TYPES.map(rt => (
          <button key={rt.id} onClick={() => setSelected(rt.id)}
            style={{ background: selected === rt.id ? rt.bg : '#fff', border: `2px solid ${selected === rt.id ? rt.color : '#e5e7eb'}`, borderRadius: 10, padding: '10px 8px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{rt.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: selected === rt.id ? rt.color : '#374151' }}>
              {sw ? rt.labelSw : rt.label}
            </div>
          </button>
        ))}
      </div>

      {/* District */}
      <label style={labelStyle}>{sw ? 'Wilaya' : 'District'}</label>
      <select value={district} onChange={e => setDistrict(e.target.value)} style={inputStyle}>
        {DISTRICTS.map(d => <option key={d}>{d}</option>)}
      </select>

      {/* Severity */}
      <label style={{ ...labelStyle, marginTop: 10 }}>{sw ? 'Ukubwa wa tatizo' : 'Severity'}</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {[
          { val: 'low', label: sw ? 'Ndogo' : 'Minor', color: '#22c55e', bg: '#f0fdf4' },
          { val: 'medium', label: sw ? 'Wastani' : 'Moderate', color: '#f59e0b', bg: '#fffbeb' },
          { val: 'high', label: sw ? 'Kubwa' : 'Severe', color: '#ef4444', bg: '#fef2f2' },
        ].map(s => (
          <button key={s.val} onClick={() => setSeverity(s.val)}
            style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `2px solid ${severity === s.val ? s.color : '#e5e7eb'}`, background: severity === s.val ? s.bg : '#fff', color: severity === s.val ? s.color : '#6b7280', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Details */}
      <label style={labelStyle}>{sw ? 'Maelezo zaidi (hiari)' : 'Additional details (optional)'}</label>
      <textarea value={details} onChange={e => setDetails(e.target.value)}
        placeholder={sw ? 'Elezea zaidi hali unayoona...' : 'Describe what you are seeing...'}
        rows={3}
        style={{ ...inputStyle, resize: 'none' }} />

      {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 8 }}>{error}</div>}

      <button onClick={submit} disabled={submitting}
        style={{ width: '100%', padding: 12, background: submitting ? '#9ca3af' : '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: submitting ? 'default' : 'pointer', marginTop: 4 }}>
        {submitting ? (sw ? 'Inatuma...' : 'Submitting...') : (sw ? '📢 Tuma Ripoti' : '📢 Submit Report')}
      </button>

      {/* Recent community reports */}
      {recentReports.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
            🕐 {sw ? 'Ripoti za Hivi Karibuni' : 'Recent Community Reports'}
          </div>
          {recentReports.map((r, i) => {
            const rt = REPORT_TYPES.find(t => t.id === r.type) || REPORT_TYPES[0];
            return (
              <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{rt.icon} {sw ? rt.labelSw : rt.label}</div>
                  <span style={{ fontSize: 10, background: r.severity === 'high' ? '#fef2f2' : r.severity === 'medium' ? '#fffbeb' : '#f0fdf4', color: r.severity === 'high' ? '#ef4444' : r.severity === 'medium' ? '#f59e0b' : '#22c55e', padding: '2px 8px', borderRadius: 99 }}>
                    {r.severity}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{r.district} · {new Date(r.timestamp || r.date).toLocaleDateString()}</div>
                {r.details && <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>{r.details}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box', background: '#fff', marginBottom: 0 };
