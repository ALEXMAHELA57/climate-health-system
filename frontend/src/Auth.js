import React, { useState } from 'react';
import { Mail, ArrowLeft, Users, HeartPulse } from 'lucide-react';
import { API, validateName, validateEmail, validatePassword } from './constants';
import { useTheme } from './ThemeContext';
import PasswordInput from './PasswordInput';

const GENDERS = [
  { id: 'male', en: 'Male', sw: 'Mwanaume' },
  { id: 'female', en: 'Female', sw: 'Mwanamke' },
  { id: 'other', en: 'Other', sw: 'Nyingine' },
];

const BACK_STEP = {
  'email-check-inbox': 'auth',
  profile: 'auth',
  'minor-blocked': 'auth',
};

export default function Auth({ lang, onLangChange, onAuthenticated, startAtEmailLogin }) {
  const { theme } = useTheme();
  const sw = lang === 'sw';

  const lastMethod = localStorage.getItem('afya_last_method');
  const [step, setStep] = useState('auth');
  const [authMode, setAuthMode] = useState(startAtEmailLogin ? 'login' : (lastMethod ? 'login' : 'create')); // create | login
  const [email, setEmail] = useState(() => localStorage.getItem('afya_last_email') || '');
  const [password, setPassword] = useState('');
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
    localStorage.setItem('afya_last_method', 'email');
    if (email) localStorage.setItem('afya_last_email', email);
    onAuthenticated(data.user);
  }

  async function submitEmailRegister() {
    const emailErr = validateEmail(email, { sw });
    if (emailErr) { setError(emailErr); return; }
    const pwErr = validatePassword(password, { sw });
    if (pwErr) { setError(pwErr); return; }
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
      if (data.needs_profile) { setStep('profile'); setLoading(false); return; }
      finishLogin(data);
    } catch { setError(t('Connection error', 'Hitilafu ya muunganisho')); }
    setLoading(false);
  }

  async function submitProfile() {
    const nameErr = validateName(name, { sw });
    if (nameErr) { setError(nameErr); return; }
    if (!dob) { setError(t('Please select your date of birth', 'Tafadhali chagua tarehe ya kuzaliwa')); return; }
    if (!gender) { setError(t('Please select your gender', 'Tafadhali chagua jinsia')); return; }
    setLoading(true); setError('');
    try {
      const data = await api('/email/complete-profile', { email, name, date_of_birth: dob, gender, language: lang });
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <HeartPulse size={16} color="#fff" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>AfyaHewa</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onLangChange('en')} style={{ padding: '3px 10px', borderRadius: 99, border: `1px solid ${!sw ? '#2563eb' : theme.border}`, background: !sw ? '#2563eb' : 'none', color: !sw ? '#fff' : theme.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>EN</button>
          <button onClick={() => onLangChange('sw')} style={{ padding: '3px 10px', borderRadius: 99, border: `1px solid ${sw ? '#2563eb' : theme.border}`, background: sw ? '#2563eb' : 'none', color: sw ? '#fff' : theme.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>SW</button>
        </div>
      </div>

      {step !== 'auth' && (
        <button onClick={() => { setStep(BACK_STEP[step] || 'auth'); setError(''); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={14} /> {t('Back', 'Rudi')}
        </button>
      )}

      {step === 'auth' && (
        <>
          <div style={{ fontSize: 26, fontWeight: 700, color: theme.text, marginBottom: 4 }}>
            {authMode === 'login' ? t('Welcome back', 'Karibu tena') : t('Create your account', 'Fungua akaunti yako')}
          </div>
          <div style={{ fontSize: 14, color: theme.textMuted, marginBottom: 24 }}>
            {authMode === 'login' ? t('Please enter your details', 'Tafadhali weka taarifa zako') : t("Let's get you set up", 'Hebu tukuandae')}
          </div>

          <label style={{ fontSize: 13, fontWeight: 600, color: theme.text, display: 'block', marginBottom: 6 }}>{t('Email address', 'Barua pepe')}</label>
          <input value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />

          <label style={{ fontSize: 13, fontWeight: 600, color: theme.text, display: 'block', marginBottom: 6 }}>{t('Password', 'Nenosiri')}</label>
          <PasswordInput value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (authMode === 'login' ? submitEmailLogin() : submitEmailRegister())}
            style={inputStyle} />

          {!!error && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{error}</p>}

          <button onClick={authMode === 'login' ? submitEmailLogin : submitEmailRegister} disabled={loading} style={{ ...btnStyle, marginTop: 4, marginBottom: 16 }}>
            {loading
              ? (authMode === 'login' ? t('Signing in...', 'Inaingia...') : t('Creating...', 'Inaunda...'))
              : (authMode === 'login' ? t('Sign In', 'Ingia') : t('Create Account', 'Unda Akaunti'))}
          </button>

          <div style={{ textAlign: 'center', fontSize: 13, color: theme.textMuted }}>
            {authMode === 'login' ? t("Don't have an account? ", 'Huna akaunti? ') : t('Already have an account? ', 'Una akaunti tayari? ')}
            <button onClick={() => { setAuthMode(authMode === 'login' ? 'create' : 'login'); setError(''); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
              {authMode === 'login' ? t('Sign up', 'Jisajili') : t('Log in', 'Ingia')}
            </button>
          </div>
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
          <label style={{ fontSize: 12, color: theme.textMuted, display: 'block', marginBottom: 6 }}>{t('Preferred language', 'Lugha unayopendelea')}</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button onClick={() => onLangChange('en')}
              style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${!sw ? '#2563eb' : theme.border}`, background: !sw ? '#eff6ff' : theme.card, color: !sw ? '#2563eb' : theme.text, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              English
            </button>
            <button onClick={() => onLangChange('sw')}
              style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${sw ? '#2563eb' : theme.border}`, background: sw ? '#eff6ff' : theme.card, color: sw ? '#2563eb' : theme.text, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              Kiswahili
            </button>
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
