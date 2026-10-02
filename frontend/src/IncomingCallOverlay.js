import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { API } from './constants';

function wsUrl() {
  return API.replace('https://', 'wss://').replace('http://', 'ws://');
}

// Keeps a background connection open the whole time someone is logged in
// (mounted once, at the top of the app / Doctor Portal - not inside any one
// screen) so an incoming call can interrupt whatever they're doing, the way
// a phone call does, instead of them having to notice a "Join Call" button
// appeared somewhere.
//
// role: 'patient' | 'doctor'
// authToken: that user's own login JWT (not a Daily.co token)
// disabled: true while already in a call, so a second ring can't interrupt it
// onAccept(call): called with { roomUrl, token, consultationType, appointmentId }
export default function IncomingCallOverlay({ role, authToken, disabled, onAccept }) {
  const [incoming, setIncoming] = useState(null); // { appointment_id, consultation_type, caller_name }
  const [working, setWorking] = useState(false);
  const [callError, setCallError] = useState('');
  const wsRef = useRef(null);
  const dismissTimerRef = useRef(null);
  const incomingRef = useRef(null);
  incomingRef.current = incoming;

  const callEndpoint = role === 'doctor' ? '/api/doctor/appointments' : '/api/consultation/appointments';

  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    let retryTimer = null;

    function connect() {
      if (cancelled) return;
      const ws = new WebSocket(`${wsUrl()}/api/calls/ws?token=${encodeURIComponent(authToken)}`);
      wsRef.current = ws;
      ws.onmessage = (evt) => {
        let msg;
        try { msg = JSON.parse(evt.data); } catch { return; }
        if (msg.type === 'incoming_call') {
          if (disabled) return; // already in a call - ignore a second ring
          setCallError('');
          setIncoming({ appointment_id: msg.appointment_id, consultation_type: msg.consultation_type, caller_name: msg.caller_name });
          if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
          dismissTimerRef.current = setTimeout(() => setIncoming(null), 45000); // auto-dismiss if left unanswered
        } else if (msg.type === 'call_declined') {
          // Relevant to the caller's own CallRoom screen, not this overlay -
          // CallRoom listens for this itself while it's open and ringing.
        }
      };
      ws.onclose = () => {
        if (!cancelled) retryTimer = setTimeout(connect, 3000);
      };
      ws.onerror = () => { try { ws.close(); } catch {} };
    }

    connect();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      wsRef.current?.close();
    };
    // eslint-disable-next-line
  }, [authToken]);

  async function accept() {
    if (!incoming || working) return;
    setWorking(true);
    setCallError('');
    try {
      const res = await fetch(`${API}${callEndpoint}/${incoming.appointment_id}/call`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        const appointmentId = incoming.appointment_id;
        setIncoming(null);
        onAccept && onAccept({ roomUrl: data.room_url, token: data.token, consultationType: data.consultation_type, appointmentId });
      } else {
        setCallError(data.error || 'Could not join the call');
      }
    } catch {
      setCallError('Connection error');
    }
    setWorking(false);
  }

  async function decline() {
    if (!incoming) return;
    const appointmentId = incoming.appointment_id;
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setIncoming(null);
    try {
      await fetch(`${API}${callEndpoint}/${appointmentId}/call/decline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      });
    } catch { /* best-effort */ }
  }

  if (!incoming) return null;

  const isVideo = incoming.consultation_type === 'video';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(17,24,39,0.97)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 }}>
      <div style={{
        width: 108, height: 108, borderRadius: '50%', background: '#374151',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'incomingcall-pulse 1.4s ease-out infinite',
      }}>
        {isVideo ? <Video size={42} color="#9ca3af" /> : <Phone size={42} color="#9ca3af" />}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{incoming.caller_name}</div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
          Incoming {isVideo ? 'video' : 'voice'} call...
        </div>
      </div>

      {!!callError && <div style={{ color: '#fca5a5', fontSize: 13 }}>{callError}</div>}

      <div style={{ display: 'flex', gap: 48, marginTop: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <button onClick={decline} disabled={working}
            style={{ width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PhoneOff size={24} />
          </button>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Decline</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <button onClick={accept} disabled={working}
            style={{ width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: working ? 'default' : 'pointer',
              background: working ? '#86efac' : '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Phone size={24} />
          </button>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{working ? 'Joining...' : 'Accept'}</span>
        </div>
      </div>

      <style>{`
        @keyframes incomingcall-pulse {
          0% { box-shadow: 0 0 0 0 rgba(22,163,74,0.5); }
          70% { box-shadow: 0 0 0 24px rgba(22,163,74,0); }
          100% { box-shadow: 0 0 0 0 rgba(22,163,74,0); }
        }
      `}</style>
    </div>
  );
}
