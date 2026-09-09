import React, { useState, useEffect } from 'react';
import { FileText, Activity, ClipboardList, Plus, Trash2, AlertTriangle, CheckCircle2, User } from 'lucide-react';
import { API } from './constants';
import { useTheme } from './ThemeContext';

function authHeaders() {
  const token = localStorage.getItem('afya_token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

const RECORD_TYPES = [
  { id: 'condition', en: 'Condition', sw: 'Hali ya Kiafya' },
  { id: 'diagnosis', en: 'Diagnosis', sw: 'Uchunguzi' },
  { id: 'prescription', en: 'Prescription', sw: 'Dawa Ulizoandikiwa' },
  { id: 'allergy', en: 'Allergy', sw: 'Mzio' },
  { id: 'document', en: 'Other Note', sw: 'Kumbukumbu Nyingine' },
];

const METRICS = [
  { id: 'blood_pressure', en: 'Blood Pressure', sw: 'Shinikizo la Damu', unit: 'mmHg', double: true },
  { id: 'blood_glucose', en: 'Blood Glucose', sw: 'Kiwango cha Sukari', unit: 'mg/dL' },
  { id: 'weight', en: 'Weight', sw: 'Uzito', unit: 'kg' },
  { id: 'heart_rate', en: 'Heart Rate', sw: 'Mapigo ya Moyo', unit: 'bpm' },
  { id: 'temperature', en: 'Temperature', sw: 'Joto la Mwili', unit: '°C' },
  { id: 'spo2', en: 'Oxygen (SpO2)', sw: 'Oksijeni (SpO2)', unit: '%' },
];

export default function MyHealth({ lang }) {
  const { theme } = useTheme();
  const sw = lang === 'sw';

  const [view, setView] = useState('measurements'); // measurements | records | report
  const [familyProfiles, setFamilyProfiles] = useState([]);
  const [forProfile, setForProfile] = useState('');

  const [records, setRecords] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showRecordForm, setShowRecordForm] = useState(false);
  const [recordForm, setRecordForm] = useState({ record_type: 'condition', title: '', description: '', date_recorded: new Date().toISOString().slice(0, 10) });

  const [showMeasureForm, setShowMeasureForm] = useState(false);
  const [measureForm, setMeasureForm] = useState({ metric_type: 'blood_pressure', value_primary: '', value_secondary: '', context: 'morning', note: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadFamily(); }, []);
  useEffect(() => { loadData(); }, [view, forProfile]);

  async function loadFamily() {
    try {
      const res = await fetch(`${API}/api/family/profiles`, { headers: authHeaders() });
      const data = await res.json();
      setFamilyProfiles((data.profiles || []).filter(p => !p.is_linked));
    } catch { /* silent */ }
  }

  async function loadData() {
    setLoading(true);
    const qs = forProfile ? `?family_profile_id=${forProfile}` : '';
    try {
      if (view === 'records') {
        const res = await fetch(`${API}/api/my-health/records${qs}`, { headers: authHeaders() });
        const data = await res.json();
        setRecords(data.records || []);
      } else if (view === 'measurements') {
        const res = await fetch(`${API}/api/my-health/measurements${qs}`, { headers: authHeaders() });
        const data = await res.json();
        setMeasurements(data.measurements || []);
      } else if (view === 'report') {
        const res = await fetch(`${API}/api/my-health/report${qs}`, { headers: authHeaders() });
        const data = await res.json();
        setReport(data);
      }
    } catch { /* silent */ }
    setLoading(false);
  }

  async function submitRecord() {
    if (!recordForm.title.trim()) { setError(sw ? 'Weka jina' : 'Enter a title'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API}/api/my-health/records`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ ...recordForm, family_profile_id: forProfile || null }),
      });
      const data = await res.json();
      if (data.success) { setShowRecordForm(false); setRecordForm({ record_type: 'condition', title: '', description: '', date_recorded: new Date().toISOString().slice(0, 10) }); loadData(); }
      else setError(data.error || (sw ? 'Hitilafu' : 'Something went wrong'));
    } catch { setError(sw ? 'Hitilafu ya muunganisho' : 'Connection error'); }
    setSubmitting(false);
  }

  async function submitMeasurement() {
    if (!measureForm.value_primary) { setError(sw ? 'Weka kipimo' : 'Enter a reading'); return; }
    setSubmitting(true); setError('');
    try {
      const metric = METRICS.find(m => m.id === measureForm.metric_type);
      const res = await fetch(`${API}/api/my-health/measurements`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          ...measureForm, unit: metric.unit, family_profile_id: forProfile || null,
          value_primary: parseFloat(measureForm.value_primary),
          value_secondary: measureForm.value_secondary ? parseFloat(measureForm.value_secondary) : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowMeasureForm(false);
        setMeasureForm({ metric_type: 'blood_pressure', value_primary: '', value_secondary: '', context: 'morning', note: '' });
        loadData();
      } else setError(data.error || (sw ? 'Hitilafu' : 'Something went wrong'));
    } catch { setError(sw ? 'Hitilafu ya muunganisho' : 'Connection error'); }
    setSubmitting(false);
  }

  async function removeRecord(id) {
    await fetch(`${API}/api/my-health/records/${id}`, { method: 'DELETE', headers: authHeaders() }).catch(() => {});
    loadData();
  }

  const inputStyle = { width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 14 };
  const activeMetric = METRICS.find(m => m.id === measureForm.metric_type);

  return (
    <div style={{ padding: 16 }}>
      {familyProfiles.length > 0 && (
        <select value={forProfile} onChange={e => setForProfile(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}>
          <option value="">{sw ? 'Mimi mwenyewe' : 'Myself'}</option>
          {familyProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[{ id: 'measurements', Icon: Activity, en: 'Measurements', sw2: 'Vipimo' },
          { id: 'records', Icon: FileText, en: 'Records', sw2: 'Kumbukumbu' },
          { id: 'report', Icon: ClipboardList, en: 'Report', sw2: 'Ripoti' }].map(tab => (
          <button key={tab.id} onClick={() => setView(tab.id)}
            style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: view === tab.id ? '#2563eb' : theme.card, color: view === tab.id ? '#fff' : theme.textMuted,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <tab.Icon size={13} /> {sw ? tab.sw2 : tab.en}
          </button>
        ))}
      </div>

      {loading && <p style={{ textAlign: 'center', color: theme.textFaint, fontSize: 13 }}>{sw ? 'Inapakia...' : 'Loading...'}</p>}

      {/* MEASUREMENTS */}
      {!loading && view === 'measurements' && (
        <>
          <button onClick={() => setShowMeasureForm(s => !s)}
            style={{ width: '100%', padding: 11, background: showMeasureForm ? theme.card : '#f0fdf4', border: `1px solid ${showMeasureForm ? theme.border : '#bbf7d0'}`, borderRadius: 10, marginBottom: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: showMeasureForm ? theme.textMuted : '#166534' }}>
            <Plus size={15} /> {showMeasureForm ? (sw ? 'Ghairi' : 'Cancel') : (sw ? 'Ongeza Kipimo' : 'Log a Reading')}
          </button>

          {showMeasureForm && (
            <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <select value={measureForm.metric_type} onChange={e => setMeasureForm({ ...measureForm, metric_type: e.target.value })} style={inputStyle}>
                {METRICS.map(m => <option key={m.id} value={m.id}>{sw ? m.sw : m.en}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input type="number" placeholder={activeMetric.double ? (sw ? 'Systolic' : 'Systolic') : `${sw ? 'Kipimo' : 'Reading'} (${activeMetric.unit})`}
                  value={measureForm.value_primary} onChange={e => setMeasureForm({ ...measureForm, value_primary: e.target.value })} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
                {activeMetric.double && (
                  <input type="number" placeholder="Diastolic" value={measureForm.value_secondary} onChange={e => setMeasureForm({ ...measureForm, value_secondary: e.target.value })} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
                )}
              </div>
              <select value={measureForm.context} onChange={e => setMeasureForm({ ...measureForm, context: e.target.value })} style={{ ...inputStyle, marginTop: 8 }}>
                <option value="morning">{sw ? 'Asubuhi' : 'Morning'}</option>
                <option value="evening">{sw ? 'Jioni' : 'Evening'}</option>
                <option value="fasting">{sw ? 'Kabla ya kula' : 'Fasting'}</option>
                <option value="after_meal">{sw ? 'Baada ya kula' : 'After meal'}</option>
                <option value="random">{sw ? 'Muda mwingine' : 'Other time'}</option>
              </select>
              <input placeholder={sw ? 'Maelezo (si lazima)' : 'Note (optional)'} value={measureForm.note} onChange={e => setMeasureForm({ ...measureForm, note: e.target.value })} style={inputStyle} />
              {!!error && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{error}</p>}
              <button onClick={submitMeasurement} disabled={submitting} style={{ width: '100%', padding: 11, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {submitting ? (sw ? 'Inahifadhi...' : 'Saving...') : (sw ? 'Hifadhi' : 'Save')}
              </button>
            </div>
          )}

          {measurements.length === 0 && !showMeasureForm && <p style={{ textAlign: 'center', color: theme.textFaint, fontSize: 13, padding: 20 }}>{sw ? 'Hakuna vipimo bado' : 'No readings logged yet'}</p>}
          {measurements.map(m => {
            const metric = METRICS.find(x => x.id === m.metric_type);
            return (
              <div key={m.id} style={{ background: theme.card, border: `1px solid ${m.flag ? '#fecaca' : theme.border}`, borderRadius: 10, padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>
                    {metric?.double ? `${m.value_primary}/${m.value_secondary}` : m.value_primary} {m.unit}
                    {m.flag && <AlertTriangle size={12} color="#ef4444" style={{ marginLeft: 6, display: 'inline' }} />}
                  </div>
                  <div style={{ fontSize: 11, color: theme.textMuted }}>{sw ? metric?.sw : metric?.en} · {m.context} · {new Date(m.recorded_at).toLocaleDateString()}</div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* RECORDS */}
      {!loading && view === 'records' && (
        <>
          <button onClick={() => setShowRecordForm(s => !s)}
            style={{ width: '100%', padding: 11, background: showRecordForm ? theme.card : '#f0fdf4', border: `1px solid ${showRecordForm ? theme.border : '#bbf7d0'}`, borderRadius: 10, marginBottom: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: showRecordForm ? theme.textMuted : '#166534' }}>
            <Plus size={15} /> {showRecordForm ? (sw ? 'Ghairi' : 'Cancel') : (sw ? 'Ongeza Kumbukumbu' : 'Add a Record')}
          </button>

          {showRecordForm && (
            <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <select value={recordForm.record_type} onChange={e => setRecordForm({ ...recordForm, record_type: e.target.value })} style={inputStyle}>
                {RECORD_TYPES.map(r => <option key={r.id} value={r.id}>{sw ? r.sw : r.en}</option>)}
              </select>
              <input placeholder={sw ? 'Kichwa (mfano: Kisukari Aina ya 2)' : 'Title (e.g. Type 2 Diabetes)'} value={recordForm.title} onChange={e => setRecordForm({ ...recordForm, title: e.target.value })} style={inputStyle} />
              <textarea placeholder={sw ? 'Maelezo zaidi (si lazima)' : 'More details (optional)'} value={recordForm.description} onChange={e => setRecordForm({ ...recordForm, description: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
              <input type="date" value={recordForm.date_recorded} onChange={e => setRecordForm({ ...recordForm, date_recorded: e.target.value })} style={inputStyle} />
              {!!error && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{error}</p>}
              <button onClick={submitRecord} disabled={submitting} style={{ width: '100%', padding: 11, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {submitting ? (sw ? 'Inahifadhi...' : 'Saving...') : (sw ? 'Hifadhi' : 'Save')}
              </button>
            </div>
          )}

          {records.length === 0 && !showRecordForm && <p style={{ textAlign: 'center', color: theme.textFaint, fontSize: 13, padding: 20 }}>{sw ? 'Hakuna kumbukumbu bado' : 'No records yet'}</p>}
          {records.map(r => (
            <div key={r.id} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{r.title}</div>
                  {!!r.description && <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{r.description}</div>}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, marginTop: 6,
                    color: r.source === 'verified_afyahewa' ? '#166534' : '#92400e',
                    background: r.source === 'verified_afyahewa' ? '#f0fdf4' : '#fffbeb', padding: '2px 8px', borderRadius: 99 }}>
                    {r.source === 'verified_afyahewa' ? <CheckCircle2 size={10} /> : <User size={10} />}
                    {r.source === 'verified_afyahewa' ? (sw ? 'Imethibitishwa' : 'Verified via AfyaHewa') : (sw ? 'Umejiripoti' : 'Self-reported')}
                  </span>
                </div>
                <button onClick={() => removeRecord(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={14} color="#ef4444" /></button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* REPORT */}
      {!loading && view === 'report' && report && (
        <div>
          <p style={{ fontSize: 12, color: theme.textMuted, marginBottom: 14 }}>{sw ? `Muhtasari wa siku ${report.period_days} zilizopita` : `Summary of the last ${report.period_days} days`}</p>

          <p style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted, marginBottom: 6 }}>{sw ? 'VIPIMO' : 'MEASUREMENTS'}</p>
          {Object.keys(report.measurements_by_metric || {}).length === 0 && <p style={{ fontSize: 12, color: theme.textFaint, marginBottom: 14 }}>{sw ? 'Hakuna vipimo' : 'None logged'}</p>}
          {Object.entries(report.measurements_by_metric || {}).map(([metric, readings]) => (
            <div key={metric} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: theme.text, marginBottom: 4 }}>{METRICS.find(m => m.id === metric)?.[sw ? 'sw' : 'en'] || metric}</div>
              <div style={{ fontSize: 11, color: theme.textMuted }}>{readings.length} {sw ? 'kipimo' : 'readings'}, {sw ? 'ya mwisho' : 'latest'}: {readings[0].value_primary}{readings[0].value_secondary ? `/${readings[0].value_secondary}` : ''}</div>
            </div>
          ))}

          <p style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted, margin: '14px 0 6px' }}>{sw ? 'DAWA ZINAZOTUMIKA' : 'ACTIVE MEDICATIONS'}</p>
          {(report.active_medications || []).length === 0 && <p style={{ fontSize: 12, color: theme.textFaint, marginBottom: 14 }}>{sw ? 'Hakuna' : 'None'}</p>}
          {(report.active_medications || []).map((m, i) => (
            <div key={i} style={{ fontSize: 12, color: theme.text, marginBottom: 4 }}>• {m.medicine_name} {m.dosage ? `(${m.dosage})` : ''}</div>
          ))}

          <p style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted, margin: '14px 0 6px' }}>{sw ? 'MIADI' : 'APPOINTMENTS'}</p>
          {(report.appointments || []).length === 0 && <p style={{ fontSize: 12, color: theme.textFaint }}>{sw ? 'Hakuna' : 'None'}</p>}
          {(report.appointments || []).map((a, i) => (
            <div key={i} style={{ fontSize: 12, color: theme.text, marginBottom: 4 }}>• {a.specialty} — {a.status} ({a.requested_date})</div>
          ))}
        </div>
      )}
    </div>
  );
}
