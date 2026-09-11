import React, { useState } from 'react';
import { Phone, Mail, ArrowLeft, User, Calendar, Users, HeartPulse } from 'lucide-react';
import { API } from './constants';
import { useTheme } from './ThemeContext';

const GENDERS = [
  { id: 'male', en: 'Male', sw: 'Mwanaume' },
  { id: 'female', en: 'Female', sw: 'Mwanamke' },
  { id: 'other', en: 'Other', sw: 'Nyingine' },
];

export default function Auth({ lang, onLangChange, onAuthenticated, startAtEmailLogin }) {
  const { theme } = useTheme();
  const sw = lang === 'sw';

  const [step, setStep] = useState(startAtEmailLogin ? 'email-login' : 'language'); // language | method | phone-entry | phone-verify | email-entry | email-login | profile | minor-blocked
  const [method, setMethod] = useState(startAtEmailLogin ? 'email' : 'phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);

  const t = (en, swText) => (sw ? swText : en);

  async function api(path, body) {
    const res = await fetch(`${API}/api/auth${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return res.json();
  }

  function finishLogin(data) {
    localStorage.setItem('afya_token', data.token);
    localStorage.setItem('afya_user', JSON.stringify(data.user));
    onAuthenticated(data.user);
  }

  async function submitPhoneStart() {
    if (!phone.trim()) { setError(t('Enter your phone number', 'Weka nambari yako ya simu')); return; }
    setLoading(true); setError('');
    try {
      const data = await api('/phone/start', { phone });
      if (data.success) setStep('phone-verify');
      else setError(data.error || t('Something went wrong', 'Hitilafu imetokea'));
    } catch { setError(t('Connection error', 'Hitilafu ya muunganisho')); }
    setLoading(false);
  }

  async function submitPhoneVerify() {
    if (!otp.trim()) { setError(t('Enter the code sent to your phone', 'Weka msimbo uliotumwa kwenye simu yako')); return; }
    setLoading(true); setError('');
    try {
      const data = await api('/phone/verify', { phone, code: otp });
      if (!data.success) { setError(data.error || t('Invalid code', 'Msimbo si sahihi')); setLoading(false); return; }
      if (data.existing_user) { finishLogin(data); return; }
      setStep('profile');
    } catch { setError(t('Connection error', 'Hitilafu ya muunganisho')); }
    setLoading(false);
  }

  async function submitEmailRegister() {
    if (!email.trim() || !password.trim()) { setError(t('Enter email and password', 'Weka barua pepe na nenosiri')); return; }
    setLoading(true); setError('');
    try {
      const data = await api('/email/register', { email, password, language: lang });
      if (!data.success) { setError(data.error || t('Something went wrong', 'Hitilafu imetokea')); setLoading(false); return; }
      setPendingUserId(data.user_id);
      setStep('email-check-inbox');
    } catch { setError(t('Connection error', 'Hitilafu ya muunganisho')); }
    setLoading(false);
  }

  async function submitEmailLogin() {
    if (!email.trim() || !password.trim()) { setError(t('Enter email and password', 'Weka barua pepe na nenosiri')); return; }
    setLoading(true); setError('');
    try {
      const data = await api('/email/login', { email, password });
      if (!data.success) { setError(data.error || t('Login failed', 'Imeshindwa kuingia')); setLoading(false); return; }
      if (data.needs_profile) { setMethod('email'); setStep('profile'); setLoading(false); return; }
      finishLogin(data);
    } catch { setError(t('Connection error', 'Hitilafu ya muunganisho')); }
    setLoading(false);
  }

  async function submitProfile() {
    if (!name.trim() || !dob || !gender) { setError(t('Please fill in all fields', 'Tafadhali jaza sehemu zote')); return; }
    setLoading(true); setError('');
    try {
      const path = method === 'phone' ? '/phone/complete-profile' : '/email/complete-profile';
      const body = method === 'phone'
        ? { phone, name, date_of_birth: dob, gender, language: lang }
        : { email, name, date_of_birth: dob, gender, language: lang };
      const data = await api(path, body);
      if (data.minor) { setStep('minor-blocked'); setLoading(false); return; }
      if (!data.success) { setError(data.error || t('Something went wrong', 'Hitilafu imetokea')); setLoading(false); return; }
      finishLogin(data);
    } catch { setError(t('Connection error', 'Hitilafu ya muunganisho')); }
    setLoading(false);
  }

  const inputStyle = { width: '100%', padding: 12, marginBottom: 10, borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 15 };
  const btnStyle = { width: '100%', padding: 13, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 24, background: theme.bg, maxWidth: 480, margin: '0 auto', boxSizing: 'border-box' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#0ea5e9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
          boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
        }}>
          <HeartPulse size={30} color="#fff" />
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: theme.text }}>AfyaHewa</div>
        <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 4 }}>{t('Climate & health guidance for Tanzania', 'Mwongozo wa afya na hali ya hewa Tanzania')}</div>
      </div>

      {step !== 'language' && (
        <button onClick={() => { setStep('method'); setError(''); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={14} /> {t('Back', 'Rudi')}
        </button>
      )}

      {step === 'language' && (
        <>
          <p style={{ textAlign: 'center', fontSize: 13, color: theme.textMuted, marginBottom: 16 }}>
            {lang === 'sw' ? 'Chagua lugha unayopendelea' : 'Choose your preferred language'}
          </p>
          <button onClick={() => { onLangChange('en'); setStep('method'); }} style={{ ...btnStyle, marginBottom: 10 }}>
            English
          </button>
          <button onClick={() => { onLangChange('sw'); setStep('method'); }} style={{ ...btnStyle, background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }}>
            Kiswahili
          </button>
        </>
      )}

      {step === 'method' && (
        <>
          <button onClick={() => { setMethod('phone'); setStep('phone-entry'); }} style={{ ...btnStyle, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Phone size={16} /> {t('Continue with Phone', 'Endelea na Simu')}
          </button>
          <button onClick={() => { setMethod('email'); setStep('email-entry'); }} style={{ ...btnStyle, background: theme.card, color: theme.text, border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Mail size={16} /> {t('Continue with Email', 'Endelea na Barua Pepe')}
          </button>
        </>
      )}

      {step === 'phone-entry' && (
        <>
          <input placeholder={t('Phone number (e.g. +255712345678)', 'Nambari ya simu')} value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
          {!!error && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{error}</p>}
          <button onClick={submitPhoneStart} disabled={loading} style={btnStyle}>{loading ? t('Sending...', 'Inatuma...') : t('Send Code', 'Tuma Msimbo')}</button>
        </>
      )}

      {step === 'phone-verify' && (
        <>
          <p style={{ fontSize: 13, color: theme.textMuted, marginBottom: 10 }}>{t(`Enter the code sent to ${phone}`, `Weka msimbo uliotumwa ${phone}`)}</p>
          <input placeholder={t('6-digit code', 'Msimbo wa tarakimu 6')} value={otp} onChange={e => setOtp(e.target.value)} style={inputStyle} />
          {!!error && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{error}</p>}
          <button onClick={submitPhoneVerify} disabled={loading} style={btnStyle}>{loading ? t('Verifying...', 'Inathibitisha...') : t('Verify', 'Thibitisha')}</button>
        </>
      )}

      {step === 'email-entry' && (
        <>
          <input placeholder={t('Email', 'Barua pepe')} value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          <input type="password" placeholder={t('Password', 'Nenosiri')} value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
          {!!error && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{error}</p>}
          <button onClick={submitEmailRegister} disabled={loading} style={{ ...btnStyle, marginBottom: 8 }}>{loading ? t('Creating...', 'Inaunda...') : t('Create Account', 'Unda Akaunti')}</button>
          <button onClick={() => { setStep('email-login'); setError(''); }} style={{ background: 'none', border: 'none', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>{t('Already have an account? Log in', 'Una akaunti tayari? Ingia')}</button>
        </>
      )}

      {step === 'email-login' && (
        <>
          <input placeholder={t('Email', 'Barua pepe')} value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          <input type="password" placeholder={t('Password', 'Nenosiri')} value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
          {!!error && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{error}</p>}
          <button onClick={submitEmailLogin} disabled={loading} style={btnStyle}>{loading ? t('Logging in...', 'Inaingia...') : t('Log In', 'Ingia')}</button>
        </>
      )}

      {step === 'email-check-inbox' && (
        <div style={{ textAlign: 'center' }}>
          <Mail size={40} color="#2563eb" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: theme.text, marginBottom: 8 }}>{t('Check your inbox', 'Angalia barua pepe yako')}</p>
          <p style={{ fontSize: 13, color: theme.textMuted }}>{t('We sent a verification link to your email. After verifying, come back and log in.', 'Tumetuma kiungo cha uthibitisho kwenye barua pepe yako. Baada ya kuthibitisha, rudi uingie.')}</p>
        </div>
      )}

      {step === 'profile' && (
        <>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input placeholder={t('Full name', 'Jina kamili')} value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </div>
          <input type="date" placeholder={t('Date of birth', 'Tarehe ya kuzaliwa')} value={dob} onChange={e => setDob(e.target.value)} style={inputStyle} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {GENDERS.map(g => (
              <button key={g.id} onClick={() => setGender(g.id)}
                style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${gender === g.id ? '#2563eb' : theme.border}`, background: gender === g.id ? '#eff6ff' : theme.card, color: gender === g.id ? '#2563eb' : theme.text, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                {sw ? g.sw : g.en}
              </button>
            ))}
          </div>
          {!!error && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{error}</p>}
          <button onClick={submitProfile} disabled={loading} style={btnStyle}>{loading ? t('Saving...', 'Inahifadhi...') : t('Finish', 'Maliza')}</button>
        </>
      )}

      {step === 'minor-blocked' && (
        <div style={{ textAlign: 'center' }}>
          <Users size={40} color="#d97706" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: theme.text, marginBottom: 8 }}>{t('Independent accounts are for users 18 and older', 'Akaunti huru ni kwa watumiaji wenye miaka 18 na zaidi')}</p>
          <p style={{ fontSize: 13, color: theme.textMuted }}>{t('Please have a parent or guardian add this person under Family Health instead.', 'Tafadhali mzazi au mlezi aongeze mtu huyu chini ya Afya ya Familia.')}</p>
        </div>
      )}
    </div>
  );
}
