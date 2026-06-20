import React, { useState, useEffect } from 'react';
import { API } from './constants';

const RISK_CONFIG = {
  emergency: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'Emergency', labelSw: 'Dharura' },
  high:      { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: 'High',      labelSw: 'Juu'     },
  medium:    { color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', label: 'Medium',    labelSw: 'Wastani' },
  low:       { color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', label: 'Low',       labelSw: 'Chini'   },
};

export default function OutbreakTracker({ lang = 'en' }) {
  const [summary, setSummary]     = useState(null);
  const [selected, setSelected]   = useState(null);
  const [detail, setDetail]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const sw = lang === 'sw';

  useEffect(() => { fetchSummary(); }, []);

  async function fetchSummary() {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/outbreak/summary`);
      const data = await res.json();
      setSummary(data);
    } catch { setSummary(null); }
    setLoading(false);
  }

  async function fetchDetail(region) {
    if (selected === region) { setSelected(null); setDetail(null); return; }
    setSelected(region);
    setLoadingDetail(true);
    try {
      const res  = await fetch(`${API}/api/outbreak/region/${encodeURIComponent(region)}`);
      const data = await res.json();
      setDetail(data);
    } catch { setDetail(null); }
    setLoadingDetail(false);
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🦠 {sw ? 'Kufuatilia Milipuko' : 'Outbreak Tracker'}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
        {sw
          ? 'Mfumo huu unagundua magonjwa yanayowezekana kutokana na ripoti za dalili za jamii.'
          : 'Detects potential disease outbreaks from community symptom reports in real time.'}
      </div>

      {/* Stats row */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{sw ? 'Ripoti wiki hii' : 'Reports this week'}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#111' }}>{summary.total_reports_7day || 0}</div>
          </div>
          <div style={{ background: summary.regions_with_alerts > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${summary.regions_with_alerts > 0 ? '#fecaca' : '#bbf7d0'}`, borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{sw ? 'Mikoa yenye tahadhari' : 'Regions with alerts'}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: summary.regions_with_alerts > 0 ? '#ef4444' : '#22c55e' }}>
              {summary.regions_with_alerts || 0}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
          <div style={{ width: 24, height: 24, border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 8px' }} />
          <div style={{ fontSize: 13 }}>{sw ? 'Inachambua data...' : 'Analysing symptom data...'}</div>
        </div>
      )}

      {!loading && summary && summary.districts.length === 0 && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#166534', marginBottom: 4 }}>
            {sw ? 'Hakuna Milipuko Inayoshukiwa' : 'No Outbreaks Detected'}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {sw ? 'Hakuna mfumo wa ugonjwa unaoonekana wiki hii.' : 'No unusual disease patterns detected this week.'}
          </div>
        </div>
      )}

      {/* Region outbreak cards */}
      {summary && summary.districts.map((d, i) => {
        const rc = RISK_CONFIG[d.risk] || RISK_CONFIG.low;
        const isOpen = selected === d.district;

        return (
          <div key={i} style={{ marginBottom: 10 }}>
            <button onClick={() => fetchDetail(d.district)}
              style={{ width: '100%', background: rc.bg, border: `1px solid ${rc.border}`, borderRadius: 12, padding: '12px 14px', textAlign: 'left', cursor: 'pointer', borderLeft: `4px solid ${rc.color}` }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{d.district}</div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: rc.color, color: '#fff' }}>
                  {sw ? rc.labelSw : rc.label}
                </span>
              </div>

              {/* Disease tags */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
                {d.diseases.map((dis, j) => (
                  <span key={j} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(0,0,0,0.08)', color: '#374151' }}>
                    {dis.icon} {sw ? dis.disease_sw : dis.disease}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280' }}>
                <span>📊 {d.report_count} {sw ? 'ripoti wiki hii' : 'reports this week'}</span>
                <span>{isOpen ? '▲ ' : '▼ '}{sw ? 'Maelezo' : 'Details'}</span>
              </div>
            </button>

            {/* Detail panel */}
            {isOpen && (
              <div style={{ background: '#fff', border: `1px solid ${rc.border}`, borderTop: 'none', borderRadius: '0 0 12px 12px', padding: 14 }}>
                {loadingDetail ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af', fontSize: 13 }}>
                    {sw ? 'Inapakia...' : 'Loading...'}
                  </div>
                ) : detail ? (
                  <>
                    {/* Disease breakdown */}
                    {detail.diseases.map((dis, j) => {
                      const drc = RISK_CONFIG[dis.risk] || RISK_CONFIG.low;
                      return (
                        <div key={j} style={{ background: drc.bg, border: `1px solid ${drc.border}`, borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{dis.icon} {sw ? dis.disease_sw : dis.disease}</div>
                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: drc.color, color: '#fff', fontWeight: 600 }}>
                              {sw ? drc.labelSw : drc.label}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>
                            {dis.reports_3day} {sw ? 'ripoti siku 3' : 'reports (3 days)'} · {dis.reports_7day} {sw ? 'ripoti siku 7' : 'reports (7 days)'}
                            · {sw ? 'Uwezekano' : 'Confidence'}: {Math.round(dis.confidence * 100)}%
                          </div>
                        </div>
                      );
                    })}

                    {/* Top symptoms */}
                    {detail.top_symptoms.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 5 }}>
                          {sw ? 'Dalili zinazojitokeza zaidi:' : 'Most reported symptoms:'}
                        </div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {detail.top_symptoms.map((s, k) => (
                            <span key={k} style={{ fontSize: 11, background: '#f3f4f6', border: '1px solid #e5e7eb', padding: '2px 8px', borderRadius: 99, color: '#374151' }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 14-day trend chart */}
                    {detail.daily_trend && (
                      <div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                          {sw ? 'Ripoti za siku 14 zilizopita:' : '14-day trend:'}
                        </div>
                        <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 40 }}>
                          {detail.daily_trend.slice(-14).map((day, k) => {
                            const maxCount = Math.max(...detail.daily_trend.map(d => d.count), 1);
                            const height = Math.max(2, (day.count / maxCount) * 36);
                            const isToday = k === detail.daily_trend.slice(-14).length - 1;
                            return (
                              <div key={k} title={`${day.date}: ${day.count}`}
                                style={{ flex: 1, height, background: isToday ? '#2563eb' : rc.color, borderRadius: 2, opacity: day.count > 0 ? 1 : 0.2 }} />
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#9ca3af', marginTop: 2 }}>
                          <span>{sw ? '14 siku zilizopita' : '14 days ago'}</span>
                          <span>{sw ? 'Leo' : 'Today'}</span>
                        </div>
                      </div>
                    )}

                    {/* Warning */}
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px', marginTop: 10, fontSize: 11, color: '#92400e' }}>
                      ⚠️ {sw
                        ? 'Hii ni tahadhari ya mfumo. Tafadhali wasiliana na mamlaka ya afya kwa uthibitisho.'
                        : 'This is a system-generated alert. Please contact health authorities for confirmation.'}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: 12 }}>
                    {sw ? 'Imeshindwa kupakia maelezo' : 'Could not load details'}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>
        {sw
          ? 'Data inasasishwa kila wakati mtumiaji anaripoti dalili. Alama zinatokana na ripoti za jamii.'
          : 'Data updates each time a user reports symptoms. Alerts are based on community reports only.'}
      </div>
    </div>
  );
}
