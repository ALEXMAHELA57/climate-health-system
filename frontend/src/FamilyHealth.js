import React, { useState, useEffect } from 'react';
import { Baby, UserPlus, Trash2, Link2, Check, X, AlertCircle } from 'lucide-react';
import { API } from './constants';
import { useTheme } from './ThemeContext';

const RELATIONSHIPS = [
  { id: 'child', en: 'Child', sw: 'Mtoto' },
  { id: 'parent', en: 'Parent', sw: 'Mzazi' },
  { id: 'spouse', en: 'Spouse', sw: 'Mwenzi' },
  { id: 'dependent', en: 'Dependent', sw: 'Mtegemezi' },
  { id: 'other', en: 'Other', sw: 'Nyingine' },
];

function authHeaders() {
  const token = localStorage.getItem('afya_token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export default function FamilyHealth({ lang }) {
  const { theme } = useTheme();
  const sw = lang === 'sw';

  const [profiles, setProfiles] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(null); // null | 'managed' | 'link'
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ relationship_type: 'child', name: '', date_of_birth: '', gender: '', phone: '', consent_confirmed: false });
  const [linkForm, setLinkForm] = useState({ relationship_type: 'spouse', target_phone: '', target_email: '' });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [pRes, iRes] = await Promise.all([
        fetch(`${API}/api/family/profiles`, { headers: authHeaders() }),
        fetch(`${API}/api/family/link-requests/incoming`, { headers: authHeaders() }),
      ]);
      const pData = await pRes.json();
      const iData = await iRes.json();
      setProfiles(pData.profiles || []);
      setIncoming(iData.requests || []);
    } catch { /* silent - shows empty state */ }
    setLoading(false);
  }

  function calcAge(dob) {
    if (!dob) return null;
    const d = new Date(dob), t = new Date();
    let age = t.getFullYear() - d.getFullYear();
    if (t.getMonth() < d.getMonth() || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) age--;
    return age;
  }

  const isAdultBeingAdded = form.date_of_birth && calcAge(form.date_of_birth) >= 18;

  async function submitManaged() {
    if (!form.name.trim() || !form.date_of_birth || !form.relationship_type) {
      setError(sw ? 'Tafadhali jaza sehemu zote muhimu' : 'Please fill in all required fields'); return;
    }
    if (isAdultBeingAdded && !form.consent_confirmed) {
      setError(sw ? 'Tafadhali thibitisha idhini' : 'Please confirm consent for this adult'); return;
    }
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API}/api/family/profiles`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) });
      const data = await res.json();
      if (!data.success) { setError(data.error || (sw ? 'Hitilafu' : 'Something went wrong')); setSubmitting(false); return; }
      setMode(null);
      setForm({ relationship_type: 'child', name: '', date_of_birth: '', gender: '', phone: '', consent_confirmed: false });
      loadAll();
    } catch { setError(sw ? 'Hitilafu ya muunganisho' : 'Connection error'); }
    setSubmitting(false);
  }

  async function submitLinkRequest() {
    if (!linkForm.target_phone.trim() && !linkForm.target_email.trim()) {
      setError(sw ? 'Weka nambari ya simu au barua pepe' : 'Enter a phone number or email'); return;
    }
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API}/api/family/link-requests`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(linkForm) });
      const data = await res.json();
      if (!data.success) { setError(data.error || (sw ? 'Hitilafu' : 'Something went wrong')); setSubmitting(false); return; }
      setMode(null);
      setLinkForm({ relationship_type: 'spouse', target_phone: '', target_email: '' });
    } catch { setError(sw ? 'Hitilafu ya muunganisho' : 'Connection error'); }
    setSubmitting(false);
  }

  async function removeProfile(id) {
    await fetch(`${API}/api/family/profiles/${id}`, { method: 'DELETE', headers: authHeaders() }).catch(() => {});
    loadAll();
  }

  async function respondRequest(requestId, accept) {
    await fetch(`${API}/api/family/link-requests/${requestId}/respond`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ accept }) }).catch(() => {});
    loadAll();
  }

  const inputStyle = { width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 14 };
  const btnStyle = { width: '100%', padding: 11, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' };

  return (
    <div style={{ padding: 16 }}>
      {incoming.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 8 }}>{sw ? 'MIALIKO INAYOSUBIRI' : 'PENDING INVITATIONS'}</p>
          {incoming.map(r => (
            <div key={r.request_id} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 12, marginBottom: 8 }}>
              <p style={{ fontSize: 13, color: '#1d4ed8', marginBottom: 8 }}>
                {sw ? `${r.requested_by_name} anakualika kama ${r.relationship_type}` : `${r.requested_by_name} invited you as their ${r.relationship_type}`}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => respondRequest(r.request_id, true)} style={{ flex: 1, padding: 8, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Check size={13} /> {sw ? 'Kubali' : 'Accept'}
                </button>
                <button onClick={() => respondRequest(r.request_id, false)} style={{ flex: 1, padding: 8, background: theme.card, color: theme.textMuted, border: `1px solid ${theme.border}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <X size={13} /> {sw ? 'Kataa' : 'Decline'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!mode && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => { setMode('managed'); setError(''); }}
            style={{ flex: 1, padding: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Baby size={20} color="#16a34a" />
            <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{sw ? 'Ongeza Mtoto/Mtegemezi' : 'Add Child/Dependent'}</span>
          </button>
          <button onClick={() => { setMode('link'); setError(''); }}
            style={{ flex: 1, padding: 12, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Link2 size={20} color="#2563eb" />
            <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{sw ? 'Alika Mtu Mzima' : 'Invite an Adult'}</span>
          </button>
        </div>
      )}

      {mode === 'managed' && (
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 10 }}>{sw ? 'Ongeza Mtoto au Mtegemezi' : 'Add a Child or Dependent'}</p>
          <select value={form.relationship_type} onChange={e => setForm({ ...form, relationship_type: e.target.value })} style={inputStyle}>
            {RELATIONSHIPS.map(r => <option key={r.id} value={r.id}>{sw ? r.sw : r.en}</option>)}
          </select>
          <input placeholder={sw ? 'Jina kamili' : 'Full name'} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
          <input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} style={inputStyle} />
          <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} style={inputStyle}>
            <option value="">{sw ? 'Jinsia (si lazima)' : 'Gender (optional)'}</option>
            <option value="male">{sw ? 'Mwanaume' : 'Male'}</option>
            <option value="female">{sw ? 'Mwanamke' : 'Female'}</option>
            <option value="other">{sw ? 'Nyingine' : 'Other'}</option>
          </select>
          <input placeholder={sw ? 'Nambari ya simu (si lazima)' : 'Phone number (optional)'} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} />

          {isAdultBeingAdded && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 10, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
                <AlertCircle size={14} color="#92400e" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 11, color: '#92400e' }}>
                  {sw ? 'Huyu ni mtu mzima. Tafadhali thibitisha wamekubali profaili yao isimamiwe hapa.' : "This is an adult. Please confirm they've agreed to have their profile managed here."}
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#92400e', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.consent_confirmed} onChange={e => setForm({ ...form, consent_confirmed: e.target.checked })} />
                {sw ? `Ninathibitisha ${form.name || 'mtu huyu'} amekubali` : `I confirm ${form.name || 'this person'} has agreed`}
              </label>
            </div>
          )}

          {!!error && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setMode(null)} style={{ flex: 1, padding: 11, background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>{sw ? 'Ghairi' : 'Cancel'}</button>
            <button onClick={submitManaged} disabled={submitting} style={{ ...btnStyle, flex: 1 }}>{submitting ? (sw ? 'Inahifadhi...' : 'Saving...') : (sw ? 'Ongeza' : 'Add')}</button>
          </div>
        </div>
      )}

      {mode === 'link' && (
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 6 }}>{sw ? 'Alika Mtu Mzima' : 'Invite an Adult'}</p>
          <p style={{ fontSize: 12, color: theme.textMuted, marginBottom: 10 }}>
            {sw ? 'Watabaki na akaunti yao huru. Wataona mwaliko huu wakiingia.' : "They'll keep their own independent account. They'll see this invitation when they log in."}
          </p>
          <select value={linkForm.relationship_type} onChange={e => setLinkForm({ ...linkForm, relationship_type: e.target.value })} style={inputStyle}>
            {RELATIONSHIPS.map(r => <option key={r.id} value={r.id}>{sw ? r.sw : r.en}</option>)}
          </select>
          <input placeholder={sw ? 'Nambari yao ya simu' : 'Their phone number'} value={linkForm.target_phone} onChange={e => setLinkForm({ ...linkForm, target_phone: e.target.value })} style={inputStyle} />
          <input placeholder={sw ? 'AU barua pepe yao' : 'OR their email'} value={linkForm.target_email} onChange={e => setLinkForm({ ...linkForm, target_email: e.target.value })} style={inputStyle} />
          {!!error && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setMode(null)} style={{ flex: 1, padding: 11, background: theme.bg, color: theme.textMuted, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>{sw ? 'Ghairi' : 'Cancel'}</button>
            <button onClick={submitLinkRequest} disabled={submitting} style={{ ...btnStyle, flex: 1 }}>{submitting ? (sw ? 'Inatuma...' : 'Sending...') : (sw ? 'Tuma Mwaliko' : 'Send Invitation')}</button>
          </div>
        </div>
      )}

      {loading && <p style={{ textAlign: 'center', color: theme.textFaint, fontSize: 13 }}>{sw ? 'Inapakia...' : 'Loading...'}</p>}
      {!loading && profiles.length === 0 && !mode && (
        <p style={{ textAlign: 'center', color: theme.textFaint, fontSize: 13, padding: 20 }}>{sw ? 'Hakuna wanafamilia bado' : 'No family members added yet'}</p>
      )}
      {profiles.map(p => (
        <div key={p.id} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{p.name}</span>
              {p.is_linked && <Link2 size={12} color="#2563eb" />}
            </div>
            <p style={{ fontSize: 12, color: theme.textMuted }}>
              {RELATIONSHIPS.find(r => r.id === p.relationship_type)?.[sw ? 'sw' : 'en'] || p.relationship_type}
              {p.age !== null ? ` · ${p.age} ${sw ? 'miaka' : 'yrs'}` : ''}
              {p.is_linked ? (sw ? ' · Akaunti huru' : ' · Independent account') : ''}
            </p>
          </div>
          {!p.is_linked && (
            <button onClick={() => removeProfile(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <Trash2 size={15} color="#ef4444" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
