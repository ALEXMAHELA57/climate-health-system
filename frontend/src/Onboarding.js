import React, { useState } from 'react';

export default function Onboarding({ lang = 'en', onFinish }) {
  const [step, setStep] = useState(0);
  const sw = lang === 'sw';

  const slides = [
    {
      icon: '🌍',
      title: sw ? 'Karibu AfyaHewa' : 'Welcome to AfyaHewa',
      text: sw
        ? 'Mfumo wa tahadhari wa mapema kuhusu hali ya hewa na afya kwa Tanzania. Tunakusaidia kujiandaa kabla hatari zinatokea.'
        : "Tanzania's early warning system for climate and health risks. We help you prepare before danger arrives.",
      color: '#2563eb',
    },
    {
      icon: '🌤️',
      title: sw ? 'Hali ya Hewa na Taarifa za Afya' : 'Weather & Health Alerts',
      text: sw
        ? 'Tazama hali ya hewa ya sasa, utabiri wa siku 15, na taarifa za hatari za malaria, kipindupindu na zaidi — kulingana na mkoa wako.'
        : 'See current weather, 15-day forecasts, and alerts for malaria, cholera, and other climate-related health risks — tailored to your region.',
      color: '#0ea5e9',
    },
    {
      icon: '🤒',
      title: sw ? 'Zungumza na Afya' : 'Chat with Afya',
      text: sw
        ? 'Afya ni msaidizi wa AI anayeweza kukusaidia kuelewa dalili zako na kukushauri hatua za kuchukua, kwa Kiswahili au Kiingereza.'
        : 'Afya is an AI assistant that helps you understand your symptoms and what to do next, in English or Swahili.',
      color: '#f59e0b',
    },
    {
      icon: '📢',
      title: sw ? 'Ripoti na Kliniki' : 'Report & Find Clinics',
      text: sw
        ? 'Ripoti matatizo kama mafuriko au magonjwa katika eneo lako, na pata kliniki za karibu pamoja na umbali na muda wa kufika.'
        : 'Report problems like flooding or illness in your area, and find nearby clinics with real distance and travel time.',
      color: '#22c55e',
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
