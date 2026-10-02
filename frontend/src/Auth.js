import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, ArrowLeft, ArrowRight, Users, Check } from 'lucide-react';
import { API, GOOGLE_CLIENT_ID, validateName, validateEmail, validatePassword } from './constants';
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

// ── Brand mark: a heart carrying a little world + a heartbeat pulse ─────────
// (climate + health, in one shape) — drawn once here so it always matches
// wherever it's used, instead of a photo that can go stale or break layout.
function Logo({ size = 108 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="afyaLogoGrad" x1="6" y1="6" x2="94" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <path
        d="M50 90C50 90 8 62 8 33C8 16 21 6 36 6C42 6 47 9.5 50 16C53 9.5 58 6 64 6C79 6 92 16 92 33C92 62 50 90 50 90Z"
        fill="url(#afyaLogoGrad)"
      />
      <g opacity="0.22" fill="#fff">
        <ellipse cx="36" cy="28" rx="8" ry="6" />
        <ellipse cx="60" cy="24" rx="10" ry="7" />
        <ellipse cx="50" cy="40" rx="7" ry="5" />
      </g>
      <path d="M18 48H36L42 34L50 60L57 42L63 48H82" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

// ── Faint skyline + hills along the bottom, and a soft blob up top — purely
// decorative, sits behind everything, never intercepts clicks. ─────────────
function BackgroundArt({ dark }) {
  const line = dark ? 'rgba(96,165,250,0.18)' : '#bfdbfe';
  const line2 = dark ? 'rgba(96,165,250,0.1)' : '#dbeafe';
  return (
    <>
      <div style={{
        position: 'fixed', top: -120, left: -120, width: 340, height: 340, borderRadius: '50%',
        background: dark ? 'radial-gradient(circle, rgba(37,99,235,0.25), transparent 70%)' : 'radial-gradient(circle, #dbeafe, transparent 70%)',
        filter: 'blur(10px)', zIndex: 0, pointerEvents: 'none',
      }} />
      <svg
        viewBox="0 0 1024 220" preserveAspectRatio="none"
        style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', height: 180, zIndex: 0, pointerEvents: 'none' }}
      >
        <path d="M0 160 Q 90 110 190 150 T 380 140 L 380 220 L 0 220 Z" fill={line2} />
        <circle cx="90" cy="118" r="20" fill={line2} />
        <rect x="86" y="136" width="8" height="34" fill={line2} />
        <path d="M560 180 Q 680 130 820 170 T 1024 150 L 1024 220 L 560 220 Z" fill={line} />
        <g fill={line}>
          <rect x="640" y="130" width="34" height="90" />
          <rect x="684" y="100" width="30" height="120" />
          <rect x="724" y="140" width="26" height="80" />
          <rect x="900" y="118" width="32" height="102" />
          <rect x="944" y="150" width="28" height="70" />
        </g>
      </svg>
    </>
  );
}

// Small left-aligned icon wrapped around an input (or PasswordInput), so
// every field in this form gets the same mail/lock icon treatment seen in
// the design, without duplicating positioning code per field.
function IconField({ icon: Icon, children }) {
  return (
    <div style={{ position: 'relative', marginBottom: 14 }}>
      <Icon size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', zIndex: 1 }} />
      {children}
    </div>
  );
}

export default function Auth({ lang, onLangChange, onAuthenticated, startAtEmailLogin }) {
  const { theme, isDark } = useTheme();
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
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotNotice, setForgotNotice] = useState(false);
  const googleBtnRef = useRef(null);

  const t = (en, swText) => (sw ? swText : en);

  async function api(path, body) {
    const res = await fetch(`${API}/api/auth${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return res.json();
  }

  function finishLogin(data, method = 'email') {
    localStorage.setItem('afya_token', data.token);
    localStorage.setItem('afya_user', JSON.stringify(data.user));
    localStorage.setItem('afya_last_method', method);
    if (data.user?.email) localStorage.setItem('afya_last_email', data.user.email);
    onAuthenticated(data.user);
  }

  async function handleGoogleCredential(response) {
    setLoading(true); setError('');
    try {
      const data = await api('/google', { credential: response.credential, language: lang });
      if (!data.success) { setError(data.error || t('Google sign-in failed', 'Imeshindwa kuingia na Google')); setLoading(false); return; }
      if (data.needs_profile) {
        setEmail(data.email || '');
        if (data.suggested_name) setName(data.suggested_name);
        setStep('profile');
        setLoading(false);
        return;
      }
      finishLogin(data, 'google');
    } catch { setError(t('Connection error', 'Hitilafu ya muunganisho')); setLoading(false); }
  }

  // Load the Google Identity Services script once, then render the button
  // into googleBtnRef whenever the 'auth' step is showing.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    function renderButton() {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: isDark ? 'filled_black' : 'outline', size: 'large', width: 360, text: 'continue_with', shape: 'pill',
      });
    }
    if (window.google?.accounts?.id) { renderButton(); return; }
    const existing = document.getElementById('google-identity-script');
    if (existing) { existing.addEventListener('load', renderButton); return; }
    const script = document.createElement('script');
    script.id = 'google-identity-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true; script.defer = true;
    script.onload = renderButton;
    document.body.appendChild(script);
    // eslint-disable-next-line
  }, [step, isDark]);

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

  const cardBg = theme.card;
  const pageBg = isDark
    ? 'linear-gradient(180deg, #0b1020 0%, #0f1115 100%)'
    : 'linear-gradient(180deg, #eef4ff 0%, #f7faff 55%, #eef4ff 100%)';

  const fieldStyle = {
    width: '100%', padding: '13px 14px 13px 42px', borderRadius: 12,
    border: `1.5px solid ${theme.border}`, background: theme.card, color: theme.text,
    fontSize: 15, boxSizing: 'border-box', outline: 'none',
  };
  const primaryBtnStyle = {
    width: '100%', padding: 15, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff',
    border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    boxShadow: '0 8px 20px -6px rgba(37,99,235,0.55)',
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: pageBg, overflow: 'hidden' }}>
      <BackgroundArt dark={isDark} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto', padding: '24px 24px 48px', display: 'flex', flexDirection: 'column', minHeight: '100vh', boxSizing: 'border-box' }}>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <div style={{ display: 'flex', background: theme.card, borderRadius: 99, padding: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <button onClick={() => onLangChange('en')} style={{ padding: '6px 16px', borderRadius: 99, border: 'none', background: !sw ? '#2563eb' : 'transparent', color: !sw ? '#fff' : theme.textMuted, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>EN</button>
            <button onClick={() => onLangChange('sw')} style={{ padding: '6px 16px', borderRadius: 99, border: 'none', background: sw ? '#2563eb' : 'transparent', color: sw ? '#fff' : theme.textMuted, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>SW</button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 22 }}>
          <Logo />
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 10, letterSpacing: -0.5 }}>
            <span style={{ color: isDark ? '#dbeafe' : '#1e3a8a' }}>Afya</span><span style={{ color: '#2563eb' }}>Hewa</span>
          </div>
          <div style={{ fontSize: 14, color: theme.textMuted, marginTop: 2 }}>
            {t('Climate Health System · Tanzania', 'Mfumo wa Afya ya Tabianchi · Tanzania')}
          </div>
        </div>

        <div style={{ background: cardBg, borderRadius: 22, padding: '28px 24px', boxShadow: isDark ? '0 20px 40px -20px rgba(0,0,0,0.6)' : '0 20px 40px -20px rgba(30,64,175,0.25)', flex: step === 'auth' ? 'none' : undefined }}>

          {step !== 'auth' && (
            <button onClick={() => { setStep(BACK_STEP[step] || 'auth'); setError(''); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowLeft size={14} /> {t('Back', 'Rudi')}
            </button>
          )}

          {step === 'auth' && (
            <>
              <div style={{ fontSize: 24, fontWeight: 800, color: theme.text, marginBottom: 4 }}>
                {authMode === 'login' ? t('Welcome Back', 'Karibu tena') : t('Create your account', 'Fungua akaunti yako')}
              </div>
              <div style={{ fontSize: 14, color: theme.textMuted, marginBottom: 22 }}>
                {authMode === 'login' ? t('Log in to access your account', 'Ingia ili kufikia akaunti yako') : t("Let's get you set up", 'Hebu tukuandae')}
              </div>

              <IconField icon={Mail}>
                <input placeholder={t('Email address', 'Barua pepe')} value={email} onChange={e => setEmail(e.target.value)} style={fieldStyle} />
              </IconField>

              <IconField icon={Lock}>
                <PasswordInput placeholder={t('Password', 'Nenosiri')} value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (authMode === 'login' ? submitEmailLogin() : submitEmailRegister())}
                  style={{ ...fieldStyle, marginBottom: 0 }} />
              </IconField>

              {authMode === 'login' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, marginTop: -2 }}>
                  <button onClick={() => setRememberMe(r => !r)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${rememberMe ? '#2563eb' : theme.border}`, background: rememberMe ? '#2563eb' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {rememberMe && <Check size={13} color="#fff" strokeWidth={3} />}
                    </span>
                    <span style={{ fontSize: 13, color: theme.text }}>{t('Remember me', 'Nikumbuke')}</span>
                  </button>
                  <button onClick={() => setForgotNotice(true)} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                    {t('Forgot password?', 'Umesahau nenosiri?')}
                  </button>
                </div>
              )}

              {forgotNotice && authMode === 'login' && (
                <p style={{ fontSize: 12, color: theme.textMuted, marginTop: -10, marginBottom: 14, background: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6', padding: '8px 10px', borderRadius: 8 }}>
                  {t('Password reset isn’t available yet — please contact support for help getting back into your account.', 'Kuweka upya nenosiri bado hakipatikani — tafadhali wasiliana na huduma kwa usaidizi wa kuingia kwenye akaunti yako.')}
                </p>
              )}

              {!!error && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{error}</p>}

              <button onClick={authMode === 'login' ? submitEmailLogin : submitEmailRegister} disabled={loading} style={{ ...primaryBtnStyle, marginBottom: 18, opacity: loading ? 0.75 : 1 }}>
                {loading
                  ? (authMode === 'login' ? t('Signing in...', 'Inaingia...') : t('Creating...', 'Inaunda...'))
                  : (authMode === 'login' ? t('Log In', 'Ingia') : t('Create Account', 'Unda Akaunti'))}
                {!loading && <ArrowRight size={18} />}
              </button>

              {!!GOOGLE_CLIENT_ID && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px' }}>
                    <div style={{ flex: 1, height: 1, background: theme.border }} />
                    <span style={{ fontSize: 12, color: theme.textFaint }}>{t('or', 'au')}</span>
                    <div style={{ flex: 1, height: 1, background: theme.border }} />
                  </div>
                  <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }} />
                </>
              )}
            </>
          )}

          {step === 'email-check-inbox' && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <Mail size={40} color="#2563eb" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, color: theme.text, marginBottom: 8 }}>{t('Check your inbox', 'Angalia barua pepe yako')}</p>
              <p style={{ fontSize: 13, color: theme.textMuted }}>{t('We sent a verification link to your email. After verifying, come back and log in.', 'Tumetuma kiungo cha uthibitisho kwenye barua pepe yako. Baada ya kuthibitisha, rudi uingie.')}</p>
            </div>
          )}

          {step === 'profile' && (
            <>
              <IconField icon={Users}>
                <input placeholder={t('Full name', 'Jina kamili')} value={name} onChange={e => setName(e.target.value)} style={fieldStyle} />
              </IconField>
              <input type="date" placeholder={t('Date of birth', 'Tarehe ya kuzaliwa')} value={dob} onChange={e => setDob(e.target.value)} style={{ ...fieldStyle, paddingLeft: 14, marginBottom: 14 }} />
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {GENDERS.map(g => (
                  <button key={g.id} onClick={() => setGender(g.id)}
                    style={{ flex: 1, padding: 10, borderRadius: 10, border: `1.5px solid ${gender === g.id ? '#2563eb' : theme.border}`, background: gender === g.id ? '#eff6ff' : theme.card, color: gender === g.id ? '#2563eb' : theme.text, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                    {sw ? g.sw : g.en}
                  </button>
                ))}
              </div>
              <label style={{ fontSize: 12, color: theme.textMuted, display: 'block', marginBottom: 6 }}>{t('Preferred language', 'Lugha unayopendelea')}</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button onClick={() => onLangChange('en')}
                  style={{ flex: 1, padding: 10, borderRadius: 10, border: `1.5px solid ${!sw ? '#2563eb' : theme.border}`, background: !sw ? '#eff6ff' : theme.card, color: !sw ? '#2563eb' : theme.text, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  English
                </button>
                <button onClick={() => onLangChange('sw')}
                  style={{ flex: 1, padding: 10, borderRadius: 10, border: `1.5px solid ${sw ? '#2563eb' : theme.border}`, background: sw ? '#eff6ff' : theme.card, color: sw ? '#2563eb' : theme.text, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  Kiswahili
                </button>
              </div>
              {!!error && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{error}</p>}
              <button onClick={submitProfile} disabled={loading} style={primaryBtnStyle}>
                {loading ? t('Saving...', 'Inahifadhi...') : t('Finish', 'Maliza')}
                {!loading && <ArrowRight size={18} />}
              </button>
            </>
          )}

          {step === 'minor-blocked' && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <Users size={40} color="#d97706" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: theme.text, marginBottom: 8 }}>{t('Independent accounts are for users 18 and older', 'Akaunti huru ni kwa watumiaji wenye miaka 18 na zaidi')}</p>
              <p style={{ fontSize: 13, color: theme.textMuted }}>{t('Please have a parent or guardian add this person under Family Health instead.', 'Tafadhali mzazi au mlezi aongeze mtu huyu chini ya Afya ya Familia.')}</p>
            </div>
          )}
        </div>

        {step === 'auth' && (
          <div style={{ textAlign: 'center', fontSize: 13, color: theme.textMuted, marginTop: 22 }}>
            {authMode === 'login' ? t("Don't have an account? ", 'Huna akaunti? ') : t('Already have an account? ', 'Una akaunti tayari? ')}
            <button onClick={() => { setAuthMode(authMode === 'login' ? 'create' : 'login'); setError(''); setForgotNotice(false); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              {authMode === 'login' ? t('Create Account', 'Jisajili') : t('Log in', 'Ingia')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
