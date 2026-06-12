import React from 'react';

// Reusable skeleton loading blocks — shimmer effect via CSS animation
export function SkeletonBlock({ width = '100%', height = 16, radius = 8, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s ease-in-out infinite',
      ...style,
    }} />
  );
}

// Card-shaped skeleton — used for clinic cards, district rows etc.
export function SkeletonCard() {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 13, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ flex: 1, marginRight: 10 }}>
          <SkeletonBlock width="70%" height={14} style={{ marginBottom: 6 }} />
          <SkeletonBlock width="40%" height={10} style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 5 }}>
            <SkeletonBlock width={50} height={16} radius={99} />
            <SkeletonBlock width={50} height={16} radius={99} />
          </div>
        </div>
        <SkeletonBlock width={70} height={28} radius={10} />
      </div>
    </div>
  );
}

// Compact row skeleton — used for risk map district list
export function SkeletonRow() {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
      <SkeletonBlock width="40%" height={13} />
      <SkeletonBlock width={60} height={18} radius={99} />
    </div>
  );
}

// Weather card skeleton — used on Home/Weather while loading
export function SkeletonWeatherCard() {
  return (
    <div style={{ background: '#e5e7eb', borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <SkeletonBlock width={70} height={10} style={{ marginBottom: 6, background: 'rgba(255,255,255,0.4)' }} />
          <SkeletonBlock width={60} height={32} style={{ marginBottom: 4, background: 'rgba(255,255,255,0.4)' }} />
          <SkeletonBlock width={100} height={10} style={{ background: 'rgba(255,255,255,0.4)' }} />
        </div>
        <SkeletonBlock width={50} height={50} radius={10} style={{ background: 'rgba(255,255,255,0.4)' }} />
      </div>
    </div>
  );
}

// Inject shimmer keyframes once
export function SkeletonStyles() {
  return <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>;
}
