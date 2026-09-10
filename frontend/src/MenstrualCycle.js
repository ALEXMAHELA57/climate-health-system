import React, { useState, useEffect } from 'react';
import { Droplet, Plus, Calendar, AlertCircle, Trash2 } from 'lucide-react';
import { API } from './constants';
import { useTheme } from './ThemeContext';

function authHeaders() {
  const token = localStorage.getItem('afya_token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export default function MenstrualCycle({ lang }) {
  const { theme } = useTheme();
  const sw = lang === 'sw';

  const [summary, setSummary] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogPeriod, setShowLogPeriod] = useState(false);
  const [periodDate, setPeriodDate] = useState(new Date().toISOString().slice(0, 10));
  const [familyProfiles, setFamilyProfiles] = useState([]);
  const [forProfile, setForProfile] = useState('');

  const [showLogSymptom, setShowLogSymptom] = useState(false);
  const [symptomForm, setSymptomForm] = useState({ date: new Date().toISOString().slice(0, 10), flow: '', cramps: '', mood: '', notes: '' });

  useEffect(() => {
    fetch(`${API}/api/family/profiles`, { headers: authHeaders() }).then(r => r.json()).then(d => setFamilyProfiles((d.profiles || []).filter(p => !p.is_linked))).catch(() => {});
  }, []);
  useEffect(() => { loadAll(); }, [forProfile]);

  async function loadAll() {
    setLoading(true);
    const qs = forProfile ? `?family_profile_id=${forProfile}` : '';
    try {
      const [sRes, pRes] = await Promise.all([
        fetch(`${API}/api/menstrual/summary${qs}`, { headers: authHeaders() }),
        fetch(`${API}/api/menstrual/periods${qs}`, { headers: authHeaders() }),
      ]);
      setSummary(await sRes.json());
      setPeriods((await pRes.json()).periods || []);
    } catch { /* silent */ }
    setLoading(false);
  }

  async function logPeriod() {
    try {
      await fetch(`${API}/api/menstrual/periods`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ start_date: periodDate, family_profile_id: forProfile || null }) });
      setShowLogPeriod(false);
      loadAll();
    } catch { /* silent */ }
  }

  async function removePeriod(id) {
    await fetch(`${API}/api/menstrual/periods/${id}`, { method: 'DELETE', headers: authHeaders() }).catch(() => {});
    loadAll();
  }

  async function logSymptom() {
    try {
      await fetch(`${API}/api/menstrual/logs`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ ...symptomForm, family_profile_id: forProfile || null }) });
      setShowLogSymptom(false);
      setSymptomForm({ date: new Date().toISOString().slice(0, 10), flow: '', cramps: '', mood: '', notes: '' });
    } catch { /* silent */ }
  }

  const inputStyle = { width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 14 };

  return (
    <div style={{ padding: 16 }}>
      {familyProfiles.length > 0 && (
        <select value={forProfile} onChange={e => setForProfile(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}>
          <option value="">{sw ? 'Mimi mwenyewe' : 'Myself'}</option>
          {familyProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      {loading && <p style={{ textAlign: 'center', color: theme.textFaint, fontSize: 13 }}>{sw ? 'Inapakia...' : 'Loading...'}</p>}

      {!loading && summary && !summary.has_data && (
        <div style={{ textAlign: 'center', padding: 30, color: theme.textFaint, fontSize: 13 }}>
          {sw ? 'Weka tarehe ya hedhi ya mwisho kuanza' : 'Log your last period to get started'}
        </div>
      )}

      {!loading && summary && summary.has_data && (
        <div style={{ background: 'linear-gradient(135deg,#db2777,#e11d48)', borderRadius: 16, padding: 18, color: '#fff', marginBottom: 16 }}>
          <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>{sw ? 'MZUNGUKO WANGU' : 'MY CYCLE'}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{sw ? `Siku ${summary.cycle_day}` : `Day ${summary.cycle_day}`}</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>{sw ? 'Ya mzunguko' : 'of cycle'}</div>
            </div>
            {summary.is_in_fertile_window && (
              <span style={{ background: 'rgba(255,255,255,0.25)', padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                {sw ? 'Muda wa Kushika Mimba' : 'Fertile Window'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.25)' }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>{sw ? 'Hedhi Ijayo' : 'Next Period'}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{summary.days_until_next_period > 0 ? (sw ? `Siku ${summary.days_until_next_period}` : `In ${summary.days_until_next_period}d`) : (sw ? 'Sasa' : 'Now')}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>{sw ? 'Wastani wa Mzunguko' : 'Avg Cycle'}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{summary.avg_cycle_length} {sw ? 'siku' : 'days'}</div>
            </div>
          </div>
          {summary.irregular_cycles && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <AlertCircle size={13} /> {sw ? 'Mizunguko yako inatofautiana sana - fikiria kuzungumza na daktari' : 'Your cycles vary a lot - consider talking to a doctor'}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={() => setShowLogPeriod(s => !s)}
          style={{ flex: 1, padding: 11, background: showLogPeriod ? theme.card : '#fdf2f8', border: `1px solid ${showLogPeriod ? theme.border : '#fbcfe8'}`, borderRadius: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: showLogPeriod ? theme.textMuted : '#db2777' }}>
          <Droplet size={13} /> {sw ? 'Weka Hedhi' : 'Log Period'}
        </button>
        <button onClick={() => setShowLogSymptom(s => !s)}
          style={{ flex: 1, padding: 11, background: showLogSymptom ? theme.card : '#eff6ff', border: `1px solid ${showLogSymptom ? theme.border : '#bfdbfe'}`, borderRadius: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: showLogSymptom ? theme.textMuted : '#1d4ed8' }}>
          <Plus size={13} /> {sw ? 'Dalili za Leo' : 'Log Symptoms'}
        </button>
      </div>

      {showLogPeriod && (
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8 }}>{sw ? 'Hedhi ilianza lini?' : 'When did your period start?'}</div>
          <input type="date" value={periodDate} onChange={e => setPeriodDate(e.target.value)} style={inputStyle} />
          <button onClick={logPeriod} style={{ width: '100%', padding: 11, background: '#db2777', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {sw ? 'Hifadhi' : 'Save'}
          </button>
        </div>
      )}

      {showLogSymptom && (
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <input type="date" value={symptomForm.date} onChange={e => setSymptomForm({ ...symptomForm, date: e.target.value })} style={inputStyle} />
          <select value={symptomForm.flow} onChange={e => setSymptomForm({ ...symptomForm, flow: e.target.value })} style={inputStyle}>
            <option value="">{sw ? 'Mtiririko (si lazima)' : 'Flow (optional)'}</option>
            <option value="spotting">{sw ? 'Madoa' : 'Spotting'}</option>
            <option value="light">{sw ? 'Kidogo' : 'Light'}</option>
            <option value="medium">{sw ? 'Wastani' : 'Medium'}</option>
            <option value="heavy">{sw ? 'Nzito' : 'Heavy'}</option>
          </select>
          <select value={symptomForm.cramps} onChange={e => setSymptomForm({ ...symptomForm, cramps: e.target.value })} style={inputStyle}>
            <option value="">{sw ? 'Maumivu (si lazima)' : 'Cramps (optional)'}</option>
            <option value="none">{sw ? 'Hakuna' : 'None'}</option>
            <option value="mild">{sw ? 'Kidogo' : 'Mild'}</option>
            <option value="moderate">{sw ? 'Wastani' : 'Moderate'}</option>
            <option value="severe">{sw ? 'Makali' : 'Severe'}</option>
          </select>
          <select value={symptomForm.mood} onChange={e => setSymptomForm({ ...symptomForm, mood: e.target.value })} style={inputStyle}>
            <option value="">{sw ? 'Hisia (si lazima)' : 'Mood (optional)'}</option>
            <option value="good">{sw ? 'Nzuri' : 'Good'}</option>
            <option value="irritable">{sw ? 'Kukasirika' : 'Irritable'}</option>
            <option value="low">{sw ? 'Chini' : 'Low'}</option>
            <option value="anxious">{sw ? 'Wasiwasi' : 'Anxious'}</option>
          </select>
          <button onClick={logSymptom} style={{ width: '100%', padding: 11, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {sw ? 'Hifadhi' : 'Save'}
          </button>
        </div>
      )}

      {periods.length > 0 && (
        <>
          <p style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={12} /> {sw ? 'HISTORIA' : 'HISTORY'}
          </p>
          {periods.map(p => (
            <div key={p.id} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: theme.text }}>{p.start_date}</span>
              <button onClick={() => removePeriod(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={13} color="#ef4444" /></button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
