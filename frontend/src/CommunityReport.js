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

const STATUS_CONFIG = {
  under_review: {
    icon: '🔍',
    label: 'Under Review',
    labelSw: 'Inachunguzwa',
    desc: 'Our team has received your report and is reviewing it.',
    descSw: 'Timu yetu imepokea ripoti yako na inaichunguza.',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
  },
  accepted: {
    icon: '✅',
    label: 'Accepted',
    labelSw: 'Imekubaliwa',
    desc: 'Your report has been accepted and action is being taken.',
    descSw: 'Ripoti yako imekubaliwa na hatua zinachukuliwa.',
    color: '#166534',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
  declined: {
    icon: '❌',
    label: 'Declined',
    labelSw: 'Imekataliwa',
    desc: 'Your report could not be confirmed at this time.',
    descSw: 'Ripoti yako haikuweza kuthibitishwa kwa sasa.',
    color: '#991b1b',
    bg: '#fef2f2',
    border: '#fecaca',
  },
};

export default function CommunityReport({ lang = 'en' }) {
  const sw = lang === 'sw';
  const [view, setView] = useState('form'); // form | status
  const [selected, setSelected] = useState(null);
  const [district, setDistrict] = useState(() => localStorage.getItem('afya_district') || 'Dar es Salaam');
  const [details, setDetails] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [submitting, setSubmitting] = useState(false);
  const [myReports, setMyReports] = useState(() => {
    try { return JSON.parse(localStorage.getItem('afya_my_reports') || '[]'); }
    catch { return []; }
  });
  const [checkingStatus, setCheckingStatus] = useState({});
  const [error, setError] = useState('');

  // Refresh statuses when switching to status tab
  useEffect(() => {
    if (view === 'status') refreshAllStatuses();
  }, [view]);

  async function refreshAllStatuses() {
    const reports = JSON.parse(localStorage.getItem('afya_my_reports') || '[]');
    const updated = await Promise.all(reports.map(async (r) => {
      if (!r.id) return r;
      try {
        const res = await fetch(`${API}/api/community/status/${r.id}`);
        const data = await res.json();
        if (data.found) {
          return { ...r, status: data.status, admin_note: data.admin_note, updated_at: data.updated_at };
        }
      } catch {}
      return r;
    }));
    localStorage.setItem('afya_my_reports', JSON.stringify(updated));
    setMyReports(updated);
  }

  async function checkSingleStatus(reportId, index) {
    setCheckingStatus(p => ({ ...p, [index]: true }));
    try {
      const res = await fetch(`${API}/api/community/status/${reportId}`);
      const data = await res.json();
      if (data.found) {
        const updated = myReports.map((r, i) =>
          i === index ? { ...r, status: data.status, admin_note: data.admin_note, updated_at: data.updated_at } : r
        );
        localStorage.setItem('afya_my_reports', JSON.stringify(updated));
        setMyReports(updated);
      }
    } catch {}
    setCheckingStatus(p => ({ ...p, [index]: false }));
  }

  async function submit() {
    if (!selected) { setError(sw ? 'Chagua aina ya ripoti' : 'Please select a report type'); return; }
    setError('');
    setSubmitting(true);

    const newReport = {
      type: selected,
      district,
      details,
      severity,
      date: new Date().toISOString(),
      status: 'under_review',
      admin_note: '',
    };

    try {
      const res = await fetch(`${API}/api/community/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newReport, language: lang, timestamp: newReport.date })
      });
      const data = await res.json();
      if (data.report_id) newReport.id = data.report_id;
    } catch {
      // Save locally even if offline — no ID means can't check status later
    }

    const existing = JSON.parse(localStorage.getItem('afya_my_reports') || '[]');
    const updated = [...existing, newReport].slice(-20);
    localStorage.setItem('afya_my_reports', JSON.stringify(updated));
    setMyReports(updated);

    setSelected(null);
    setDetails('');
    setSeverity('medium');
    setSubmitting(false);
    setView('status'); // go straight to status view
  }

  function getStatusConfig(status) {
    return STATUS_CONFIG[status] || STATUS_CONFIG.under_review;
  }

  function getReportTypeInfo(typeId) {
    return REPORT_TYPES.find(r => r.id === typeId) || REPORT_TYPES[0];
  }

  return (
    <div style={{ padding: 16 }}>
      {/* Header with tabs */}
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>📢 {sw ? 'Ripoti ya Jamii' : 'Community Report'}</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <button onClick={() => setView('form')}
          style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: view === 'form' ? '#2563eb' : '#f3f4f6', color: view === 'form' ? '#fff' : '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          {sw ? '+ Ripoti Mpya' : '+ New Report'}
        </button>
        <button onClick={() => setView('status')}
          style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: view === 'status' ? '#2563eb' : '#f3f4f6', color: view === 'status' ? '#fff' : '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer', position: 'relative' }}>
          {sw ? 'Hali ya Ripoti' : 'My Reports'}
          {myReports.length > 0 && (
            <span style={{ marginLeft: 6, background: view === 'status' ? 'rgba(255,255,255,0.3)' : '#2563eb', color: '#fff', borderRadius: 99, padding: '1px 6px', fontSize: 11 }}>
              {myReports.length}
            </span>
          )}
        </button>
      </div>

      {/* ── FORM VIEW ── */}
      {view === 'form' && (
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
            {sw ? 'Ripoti tatizo linaloweza kuathiri afya au usalama' : 'Report something that may affect health or safety in your area'}
          </div>

          {/* Report type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {REPORT_TYPES.map(rt => (
              <button key={rt.id} onClick={() => setSelected(rt.id)}
                style={{ background: selected === rt.id ? rt.bg : '#fff', border: `2px solid ${selected === rt.id ? rt.color : '#e5e7eb'}`, borderRadius: 10, padding: '10px 8px', textAlign: 'left', cursor: 'pointer' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{rt.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: selected === rt.id ? rt.color : '#374151' }}>
                  {sw ? rt.labelSw : rt.label}
                </div>
              </button>
            ))}
          </div>

          {/* District */}
          <label style={lbl}>{sw ? 'Wilaya' : 'District'}</label>
          <select value={district} onChange={e => setDistrict(e.target.value)} style={inp}>
            {DISTRICTS.map(d => <option key={d}>{d}</option>)}
          </select>

          {/* Severity */}
          <label style={{ ...lbl, marginTop: 10 }}>{sw ? 'Ukubwa wa tatizo' : 'Severity'}</label>
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
          <label style={lbl}>{sw ? 'Maelezo zaidi (hiari)' : 'Additional details (optional)'}</label>
          <textarea value={details} onChange={e => setDetails(e.target.value)}
            placeholder={sw ? 'Elezea zaidi hali unayoona...' : 'Describe what you are seeing...'}
            rows={3} style={{ ...inp, resize: 'none' }} />

          {error && <div style={{ fontSize: 12, color: '#ef4444', margin: '6px 0' }}>{error}</div>}

          <button onClick={submit} disabled={submitting}
            style={{ width: '100%', padding: 12, background: submitting ? '#9ca3af' : '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: submitting ? 'default' : 'pointer', marginTop: 6 }}>
            {submitting ? (sw ? 'Inatuma...' : 'Submitting...') : (sw ? '📢 Tuma Ripoti' : '📢 Submit Report')}
          </button>
        </div>
      )}

      {/* ── STATUS VIEW ── */}
      {view === 'status' && (
        <div>
          {myReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#9ca3af' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
              <div style={{ fontSize: 14 }}>{sw ? 'Bado hujawasilisha ripoti yoyote.' : "You haven't submitted any reports yet."}</div>
              <button onClick={() => setView('form')}
                style={{ marginTop: 14, padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                {sw ? 'Wasilisha Ripoti' : 'Submit a Report'}
              </button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                {sw ? 'Bonyeza "Angalia" kuona hali ya sasa ya ripoti yako.' : 'Tap "Check" to see the latest status of your report.'}
              </div>
              {[...myReports].reverse().map((r, i) => {
                const realIndex = myReports.length - 1 - i;
                const rt = getReportTypeInfo(r.type);
                const sc = getStatusConfig(r.status || 'under_review');
                return (
                  <div key={i} style={{ background: '#fff', border: `1px solid ${sc.border}`, borderRadius: 12, padding: 14, marginBottom: 12, borderLeft: `4px solid ${sc.color}` }}>
                    {/* Report header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 20 }}>{rt.icon}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{sw ? rt.labelSw : rt.label}</div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>{r.district} · {new Date(r.date).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, background: r.severity === 'high' ? '#fef2f2' : r.severity === 'medium' ? '#fffbeb' : '#f0fdf4', color: r.severity === 'high' ? '#ef4444' : r.severity === 'medium' ? '#f59e0b' : '#22c55e', fontWeight: 600 }}>
                        {r.severity}
                      </span>
                    </div>

                    {/* Status banner */}
                    <div style={{ background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 8, padding: '10px 12px', marginBottom: r.admin_note ? 8 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 16 }}>{sc.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: sc.color }}>
                          {sw ? sc.labelSw : sc.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>
                        {sw ? sc.descSw : sc.desc}
                      </div>
                    </div>

                    {/* Admin note */}
                    {r.admin_note && (
                      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{sw ? 'Ujumbe kutoka kwa timu:' : 'Message from our team:'}</div>
                        <div style={{ fontSize: 12, color: '#374151' }}>{r.admin_note}</div>
                      </div>
                    )}

                    {/* Details */}
                    {r.details && (
                      <div style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic', marginBottom: 8 }}>"{r.details}"</div>
                    )}

                    {/* Check status + report ID */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>
                        {r.id ? `ID: ${r.id}` : (sw ? 'Hakuna ID (nje ya mtandao)' : 'No ID (submitted offline)')}
                      </div>
                      {r.id && (
                        <button onClick={() => checkSingleStatus(r.id, realIndex)} disabled={checkingStatus[realIndex]}
                          style={{ fontSize: 11, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                          {checkingStatus[realIndex] ? '...' : (sw ? '🔄 Angalia' : '🔄 Check')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const lbl = { display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 4 };
const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box', background: '#fff', marginBottom: 0 };
