import React from 'react';

// Static emergency info — always available even with zero connectivity
// This component renders entirely from hardcoded data, no API calls
export default function OfflineEmergency({ lang = 'en', onClose }) {
  const sw = lang === 'sw';

  const emergencyNumbers = [
    { label: sw ? 'Dharura ya Taifa' : 'National Emergency', number: '112', icon: '🚨' },
    { label: sw ? 'Polisi' : 'Police', number: '999', icon: '👮' },
    { label: sw ? 'Zimamoto' : 'Fire & Rescue', number: '114', icon: '🚒' },
    { label: sw ? 'Ambulensi' : 'Ambulance', number: '115', icon: '🚑' },
  ];

  const goNow = sw
    ? ['Maumivu ya kifua', 'Ugumu wa kupumua', 'Kutoweza kuamka', 'Damu nyingi inayotoka', 'Mshtuko wa moyo (kifafa)', 'Kuzimia ghafla']
    : ['Chest pain', 'Difficulty breathing', 'Unconsciousness', 'Heavy uncontrolled bleeding', 'Seizures', 'Sudden collapse'];

  const within24 = sw
    ? ['Homa kali zaidi ya 39°C', 'Kutapika kusikoacha', 'Dalili za malaria (homa, baridi, maumivu ya viungo)', 'Kuharisha kwa muda mrefu', 'Maumivu makali ya tumbo']
    : ['High fever above 39°C', 'Persistent vomiting', 'Malaria symptoms (fever, chills, joint pain)', 'Prolonged diarrhoea', 'Severe abdominal pain'];

  const firstAid = sw ? [
    { title: 'Kutokwa na damu', steps: ['Bonyeza moja kwa moja kwenye jeraha kwa kitambaa safi', 'Inua sehemu iliyojeruhiwa juu ya moyo ikiwezekana', 'Usiache kubonyeza hadi msaada ufike'] },
    { title: 'Kuzimia', steps: ['Laza mtu chini, miguu juu kidogo', 'Hakikisha hewa inapita vizuri', 'Usimpe chochote cha kunywa hadi apate fahamu kamili'] },
    { title: 'Joto kali / Kiungulia jua', steps: ['Mhamishie mahali penye kivuli', 'Mpe maji baridi kidogo kidogo', 'Loweka kitambaa kwa maji baridi na uweke shingo, kwapani'] },
    { title: 'Kuumwa na mbu / dalili za malaria', steps: ['Pima joto la mwili', 'Mpe maji ya kunywa mengi', 'Mpeleke kliniki haraka kwa kipimo cha malaria'] },
  ] : [
    { title: 'Bleeding', steps: ['Apply direct pressure with a clean cloth', 'Raise the injured area above heart level if possible', 'Keep pressure on until help arrives'] },
    { title: 'Fainting / Unconscious', steps: ['Lay the person down, raise legs slightly', 'Make sure airway is clear', "Don't give anything to drink until fully conscious"] },
    { title: 'Heat exhaustion / Sunstroke', steps: ['Move to shade immediately', 'Give small sips of cool water', 'Apply a cool damp cloth to neck and armpits'] },
    { title: 'Suspected malaria symptoms', steps: ['Check body temperature', 'Give plenty of water to drink', 'Get to a clinic quickly for a malaria test'] },
  ];

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      {/* Offline banner */}
      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>📡</span>
        {sw
          ? 'Hii ni taarifa ya msingi inayofanya kazi bila intaneti.'
          : 'This is essential info that works without internet.'}
      </div>

      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
        🚨 {sw ? 'Taarifa za Dharura' : 'Emergency Information'}
      </div>

      {/* Emergency numbers — big tap targets */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {emergencyNumbers.map((e, i) => (
          <a key={i} href={`tel:${e.number}`}
            style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 12px', textDecoration: 'none', display: 'block' }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{e.icon}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{e.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{e.number}</div>
          </a>
        ))}
      </div>

      {/* When to go to hospital */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>⏰ {sw ? 'Wakati wa Kwenda Hospitali' : 'When to Go to Hospital'}</div>

        <div style={{ background: '#fef2f2', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>
            {sw ? 'NENDA SASA — usisubiri' : 'GO NOW — do not wait'}
          </div>
          {goNow.map((item, i) => <div key={i} style={{ fontSize: 12, color: '#374151', marginBottom: 2 }}>• {item}</div>)}
        </div>

        <div style={{ background: '#fffbeb', borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', marginBottom: 4 }}>
            {sw ? 'NDANI YA MASAA 24' : 'WITHIN 24 HOURS'}
          </div>
          {within24.map((item, i) => <div key={i} style={{ fontSize: 12, color: '#374151', marginBottom: 2 }}>• {item}</div>)}
        </div>
      </div>

      {/* First aid guide */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🩹 {sw ? 'Msaada wa Kwanza' : 'Basic First Aid'}</div>
        {firstAid.map((fa, i) => (
          <div key={i} style={{ marginBottom: i < firstAid.length - 1 ? 10 : 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8', marginBottom: 3 }}>{fa.title}</div>
            {fa.steps.map((s, j) => <div key={j} style={{ fontSize: 12, color: '#374151', marginBottom: 1 }}>{j+1}. {s}</div>)}
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: 1.5, padding: '0 8px' }}>
        {sw
          ? 'Hii si mbadala wa ushauri wa daktari. Kwa hali mbaya, piga 112 mara moja.'
          : 'This is not a substitute for professional medical advice. For serious situations, call 112 immediately.'}
      </div>
    </div>
  );
}
