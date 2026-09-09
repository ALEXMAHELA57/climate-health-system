import React, { useState } from 'react';

export default function Onboarding({ lang = 'en', onFinish }) {
  const [step, setStep] = useState(0);
  const sw = lang === 'sw';

  const slides = [
    {
      icon: '🌍',
      title: sw ? 'Karibu AfyaHewa' : 'Welcome to AfyaHewa',
      text: sw
        ? 'Mfumo unaounganisha hali ya hewa, afya, na huduma za kiafya kwa Tanzania — wote mahali pamoja.'
        : "Tanzania's connected platform for climate, health guidance, and care — all in one place.",
      color: '#2563eb',
    },
    {
      icon: '🏠',
      title: sw ? 'Nyumbani' : 'Home',
      text: sw
        ? 'Ona hali ya hewa, ubora wa hewa, taarifa za afya, na tahadhari za mapema — kila kitu kikiwa maalum kwa mkoa wako.'
        : 'See weather, air quality, health alerts, and early warnings — all tailored to your district.',
      color: '#0ea5e9',
    },
    {
      icon: '🌤️',
      title: sw ? 'Hali ya Hewa' : 'Climate',
      text: sw
        ? 'Utabiri wa siku 15, Ramani ya Hatari kwa kila mkoa, na uwezo wa kuripoti matatizo kama mafuriko au maji machafu.'
        : '15-day forecasts, a Risk Map for every region, and the ability to report hazards like flooding or unsafe water.',
      color: '#8b5cf6',
    },
    {
      icon: '🩺',
      title: sw ? 'Afya' : 'Health',
      text: sw
        ? 'Chagua eneo — Afya ya Akili, Uzazi, Moyo, na zaidi. Ongea na Afya AI, chukua tathmini, au tafuta daktari, kliniki, na maabara.'
        : 'Choose an area — Mental Health, Reproductive Health, Cardiology, and more. Chat with Afya AI, take a screening, or find a doctor, clinic, or lab.',
      color: '#0d9488',
    },
    {
      icon: '💊',
      title: sw ? 'Afya Yangu na Familia' : 'My Health & Family',
      text: sw
        ? 'Weka ukumbusho wa dawa na vipimo, fuatilia historia yako ya afya, na simamia afya ya familia yako yote — kutoka Wasifu.'
        : 'Set medicine and measurement reminders, track your health history, and manage your whole family\u2019s care — all from Profile.',
      color: '#7c3aed',
    },
    {
      icon: '🛒',
      title: sw ? 'Duka la Afya' : 'Health Shop',
      text: sw
        ? 'Nunua vifaa vya tiba, huduma ya kwanza, na bidhaa nyingine za afya, zikiletwa moja kwa moja kwako.'
        : 'Order medical supplies, first-aid items, and other health products, delivered straight to you.',
      color: '#db2777',
    },
    {
      icon: '🚨',
      title: sw ? 'Dharura' : 'Emergency',
      text: sw
        ? 'Piga 112 kwa mguso mmoja, wakati wowote. Ongeza watu wa dharura ili wajulishwe eneo lako ukiwa na tatizo.'
        : 'Call 112 with one tap, anytime. Add emergency contacts who get notified with your location if you ever need help.',
      color: '#ef4444',
    },
  ];

  const isLast = step === slides.length - 1;
  const slide = slides[step];

  function finish() {
    localStorage.setItem('afya_onboarded', 'true');
    onFinish();
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%', background: `${slide.color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, marginBottom: 24
        }}>
          {slide.icon}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 10 }}>{slide.title}</div>
        <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, maxWidth: 320 }}>{slide.text}</div>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
        {slides.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 20 : 6, height: 6, borderRadius: 99,
            background: i === step ? slide.color : '#e5e7eb',
            transition: 'all 0.2s'
          }} />
        ))}
      </div>

      {/* Actions */}
      <div style={{ padding: '0 20px 24px', display: 'flex', gap: 10 }}>
        {!isLast && (
          <button onClick={finish}
            style={{ flex: 1, padding: '13px', background: '#f3f4f6', border: 'none', borderRadius: 12, fontSize: 14, color: '#6b7280', cursor: 'pointer', fontWeight: 500 }}>
            {sw ? 'Ruka' : 'Skip'}
          </button>
        )}
        <button onClick={() => isLast ? finish() : setStep(step + 1)}
          style={{ flex: isLast ? 1 : 2, padding: '13px', background: slide.color, border: 'none', borderRadius: 12, fontSize: 14, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
          {isLast ? (sw ? 'Anza' : 'Get Started') : (sw ? 'Endelea' : 'Next')}
        </button>
      </div>
    </div>
  );
}
