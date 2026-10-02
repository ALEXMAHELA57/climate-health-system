import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

// Full-screen video/voice call, embedded via Daily.co's call frame.
// Used by both the patient app (Consultation.js) and the Doctor Portal.
// For a 'voice' consultation, camera is not just off by default - it is
// actively kept off for the whole call (see the participant-updated
// listener below), because voice and video are billed at different
// prices: paying for voice must not get you a video call.
export default function CallRoom({ roomUrl, token, consultationType, onLeave }) {
  const containerRef = useRef(null);
  const callFrameRef = useRef(null);
  const [scriptReady, setScriptReady] = useState(!!window.DailyIframe);
  const [error, setError] = useState('');
  const [voiceOnlyNotice, setVoiceOnlyNotice] = useState(false);

  useEffect(() => {
    if (window.DailyIframe) { setScriptReady(true); return; }
    const existing = document.getElementById('daily-iframe-script');
    if (existing) { existing.addEventListener('load', () => setScriptReady(true)); return; }
    const script = document.createElement('script');
    script.id = 'daily-iframe-script';
    script.src = 'https://unpkg.com/@daily-co/daily-js';
    script.async = true;
    script.onload = () => setScriptReady(true);
    script.onerror = () => setError('Could not load the call. Check your internet connection and try again.');
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!scriptReady || !containerRef.current || callFrameRef.current) return;
    try {
      const frame = window.DailyIframe.createFrame(containerRef.current, {
        iframeStyle: { width: '100%', height: '100%', border: '0' },
        showLeaveButton: true,
        startVideoOff: consultationType === 'voice',
      });
      callFrameRef.current = frame;
      frame.on('left-meeting', () => onLeave && onLeave());
      if (consultationType === 'voice') {
        // Enforce voice-only for the whole call, not just at join: if the
        // camera track ever comes on (local toggle, device auto-resume,
        // etc.) turn it straight back off. This is what actually stops a
        // voice booking from becoming a free video call, not just the
        // startVideoOff default below.
        frame.on('participant-updated', (e) => {
          if (e?.participant?.local && e.participant.video) {
            frame.setLocalVideo(false);
            setVoiceOnlyNotice(true);
            setTimeout(() => setVoiceOnlyNotice(false), 3000);
          }
        });
      }
      frame.join({ url: roomUrl, token }).catch(() => setError('Could not join the call. Please try again.'));
    } catch {
      setError('Could not start the call on this device.');
    }
    return () => {
      if (callFrameRef.current) { callFrameRef.current.destroy(); callFrameRef.current = null; }
    };
    // eslint-disable-next-line
  }, [scriptReady, roomUrl, token]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
      <button onClick={() => onLeave && onLeave()}
        style={{ position: 'absolute', top: 12, right: 12, zIndex: 1001, width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <X size={18} />
      </button>
      {voiceOnlyNotice && (
        <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 1001, background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: 12, padding: '8px 14px', borderRadius: 8, maxWidth: '80%', textAlign: 'center' }}>
          This is a voice call - video isn't included. Book a video consultation to enable your camera.
        </div>
      )}
      {error ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, padding: 24, textAlign: 'center' }}>{error}</div>
      ) : (
        <div ref={containerRef} style={{ flex: 1 }} />
      )}
    </div>
  );
}
