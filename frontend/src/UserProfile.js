import React from 'react';

const AGE_GROUPS = [
  { value: 'under5', label: '👶 Under 5',  label_sw: '👶 Chini ya miaka 5' },
  { value: '5to17',  label: '🧒 5 – 17',   label_sw: '🧒 Miaka 5 – 17'    },
  { value: '18to35', label: '🧑 18 – 35',  label_sw: '🧑 Miaka 18 – 35'   },
  { value: '36to59', label: '👨 36 – 59',  label_sw: '👨 Miaka 36 – 59'   },
  { value: '60plus', label: '👴 60+',       label_sw: '👴 Miaka 60+'       },
];

export default function UserProfile({ lang, setLang, API }) {
  const t = lang === 'sw';

  const [region, setRegion]     = React.useState(localStorage.getItem('selectedDistrict') || '');
  const [language, setLanguage] = React.useState(lang || 'en');
  const [ageGroup, setAgeGroup] = React.useState(localStorage.getItem('ageGroup') || '');
  const [phone, setPhone]       = React.useState(localStorage.getItem('smsPhone') || '');
  const [subscribed, setSubscribed] = React.useState(!!localStorage.getItem('smsSubscribed'));
  const [saved, setSaved]       = React.useState(false);
  const [subscribing, setSubscribing] = React.useState(false);
  const [subMsg, setSubMsg]     = React.useState('');

  const REGIONS = [
    'Arusha','Dar es Salaam','Dodoma','Geita','Iringa','Kagera','Katavi',
    'Kigoma','Kilimanjaro','Lindi','Manyara','Mara','Mbeya','Morogoro',
    'Mtwara','Mwanza','Njombe','Pemba North','Pemba South','Pwani','Rukwa',
    'Ruvuma','Shinyanga','Simiyu','Singida','Songwe','Tabora','Tanga',
    'Unguja North','Unguja South','Unguja West',
  ];

  const saveProfile = () => {
    localStorage.setItem('selectedDistrict', region);
    localStorage.setItem('appLanguage', language);
    localStorage.setItem('ageGroup', ageGroup);
    if (setLang) setLang(language);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSubscribe = async () => {
    if (!phone || !region) {
      setSubMsg(t ? 'Jaza namba ya simu na mkoa kwanza' : 'Enter phone number and region first');
      return;
    }
    setSubscribing(true);
    setSubMsg('');
    try {
      const res = await fetch(`${API}/api/sms/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, region, language }),
      });
      const data = await res.json();
      if (data.subscribed) {
        localStorage.setItem('smsSubscribed', '1');
        localStorage.setItem('smsPhone', phone);
        setSubscribed(true);
        setSubMsg(t
          ? '✓ Umejisajili! Utapokea tahadhari za AfyaHewa'
          : '✓ Subscribed! You will receive AfyaHewa alerts');
      } else {
        setSubMsg(data.error || (t ? 'Imeshindwa kujisajili' : 'Subscription failed'));
      }
    } catch {
      setSubMsg(t ? 'Hitilafu ya mtandao' : 'Network error — try again');
    }
    setSubscribing(false);
  };

  const handleUnsubscribe = async () => {
    if (!window.confirm(t ? 'Una uhakika unataka kuacha?' : 'Are you sure you want to unsubscribe?')) return;
    try {
      await fetch(`${API}/api/sms/unsubscribe?phone=${encodeURIComponent(phone)}`, { method: 'POST' });
    } catch {}
    localStorage.removeItem('smsSubscribed');
    setSubscribed(false);
    setSubMsg(t ? 'Umefutwa usajili' : 'Unsubscribed successfully');
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb',
    borderRadius: 10, fontSize: 15, boxSizing: 'border-box',
    background: '#fafafa', outline: 'none',
  };

  const labelStyle = {
    display: 'block', fontWeight: 600, marginBottom: 7, fontSize: 15, color: '#1f2937',
  };

  return (
    <div style={{ padding: '0 16px 100px', maxWidth: 480, margin: '0 auto' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '20px 0 6px' }}>
        {t ? '👤 Wasifu Wangu' : '👤 My Profile'}
      </h2>
      <p style={{ color: '#6b7280', fontSize: 14, marginTop: 0, marginBottom: 24 }}>
        {t
          ? 'Mipangilio yako inasaidia AfyaHewa kutoa taarifa sahihi zaidi'
          : 'Your settings help AfyaHewa give you more accurate health information'}
      </p>

      {/* Region */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>🌍 {t ? 'Mkoa Wako' : 'Your Region'}</label>
        <select value={region} onChange={e => setRegion(e.target.value)} style={inputStyle}>
          <option value="">{t ? '-- Chagua Mkoa --' : '-- Select Region --'}</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Language */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>🌐 {t ? 'Lugha' : 'Language'}</label>
        <div style={{ display: 'flex', gap: 10 }}>
          {[['en', '🇬🇧 English'], ['sw', '🇹🇿 Kiswahili']].map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setLanguage(val)}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 10,
                border: language === val ? '2px solid #2563eb' : '2px solid #e5e7eb',
                background: language === val ? '#eff6ff' : '#fff',
                color: language === val ? '#2563eb' : '#374151',
                fontWeight: language === val ? 700 : 400,
                cursor: 'pointer', fontSize: 15,
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Age Group */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>👤 {t ? 'Kundi la Umri' : 'Age Group'}</label>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 0, marginBottom: 12 }}>
          {t
            ? 'Afya atatoa ushauri unaofaa kwa umri wako'
            : 'Afya will tailor health advice to your age group'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          {AGE_GROUPS.map(g => (
            <button
              key={g.value}
              onClick={() => setAgeGroup(g.value)}
              style={{
                padding: '13px 10px',
                borderRadius: 10,
                border: ageGroup === g.value ? '2px solid #2563eb' : '2px solid #e5e7eb',
                background: ageGroup === g.value ? '#eff6ff' : '#fff',
                color: ageGroup === g.value ? '#2563eb' : '#374151',
                fontWeight: ageGroup === g.value ? 700 : 400,
                cursor: 'pointer', fontSize: 14, textAlign: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {t ? g.label_sw : g.label}
              {ageGroup === g.value && <span style={{ fontSize: 12 }}>✓</span>}
            </button>
          ))}
        </div>
        {!ageGroup && (
          <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 8 }}>
            ⚠️ {t
              ? 'Chagua kundi lako la umri kwa ushauri bora zaidi'
              : 'Select your age group for more accurate health advice'}
          </p>
        )}
      </div>

      {/* Save button */}
      <button
        onClick={saveProfile}
        style={{
          width: '100%', padding: 14, borderRadius: 12, border: 'none',
          background: saved ? '#16a34a' : '#2563eb',
          color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer',
          marginBottom: 28, transition: 'background 0.2s',
        }}
      >
        {saved
          ? (t ? '✓ Imehifadhiwa!' : '✓ Saved!')
          : (t ? '💾 Hifadhi Mipangilio' : '💾 Save Settings')}
      </button>

      {/* SMS Subscription */}
      <div style={{ background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: 18, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>
          📱 {t ? 'Tahadhari za SMS' : 'SMS Alerts'}
        </h3>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 14px' }}>
          {t
            ? 'Pokea tahadhari za hali ya hewa na afya moja kwa moja kwenye simu yako'
            : 'Receive weather and health alerts directly to your phone'}
        </p>

        {!subscribed ? (
          <>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder={t ? 'Namba ya simu e.g. 0712345678' : 'Phone number e.g. 0712345678'}
              style={{ ...inputStyle, marginBottom: 10 }}
            />
            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              style={{
                width: '100%', padding: 12, borderRadius: 10, border: 'none',
                background: subscribing ? '#9ca3af' : '#16a34a',
                color: '#fff', fontWeight: 600, fontSize: 15, cursor: subscribing ? 'wait' : 'pointer',
              }}
            >
              {subscribing ? '⟳ ...' : (t ? '🔔 Jisajili kwa SMS' : '🔔 Subscribe to SMS Alerts')}
            </button>
          </>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {t ? 'Umejisajili' : 'Subscribed'}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{phone}</div>
              </div>
            </div>
            <button
              onClick={handleUnsubscribe}
              style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
                background: '#fff', color: '#dc2626', fontSize: 13, cursor: 'pointer',
              }}
            >
              {t ? 'Acha kupokea ujumbe' : 'Unsubscribe'}
            </button>
          </div>
        )}

        {subMsg && (
          <p style={{ fontSize: 13, color: subMsg.startsWith('✓') ? '#16a34a' : '#dc2626', marginTop: 10 }}>
            {subMsg}
          </p>
        )}
      </div>
    </div>
  );
}
