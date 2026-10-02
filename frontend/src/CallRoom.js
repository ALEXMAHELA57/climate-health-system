import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, User, Maximize, Minimize } from 'lucide-react';
import { API } from './constants';

function wsUrl() {
  return API.replace('https://', 'wss://').replace('http://', 'ws://');
}

// Full-screen video/voice call - built directly on Daily.co's low-level
// "call object" API (no Daily Prebuilt iframe), so the UI is just ours:
// one video tile, a small self-preview, and three buttons - mute, camera,
// hang up. No device-check screen, no conferencing toolbar, no "More"
// menu - closer to a phone/WhatsApp call than a meeting app.
//
// Used by both the patient app (Consultation.js) and the Doctor Portal.
// For a 'voice' consultation, camera is never requested or shown at all -
// voice and video are billed at different prices, so paying for voice
// must not get you a video call.
export default function CallRoom({ roomUrl, token, consultationType, onLeave, appointmentId, authToken, role }) {
  const containerRef = useRef(null);
  const callRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const timerRef = useRef(null);
  const isVoice = consultationType === 'voice';

  const [scriptReady, setScriptReady] = useState(!!window.DailyIframe);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [remoteName, setRemoteName] = useState('');
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(!isVoice);
  const [voiceOnlyNotice, setVoiceOnlyNotice] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [declined, setDeclined] = useState(false);
  const remoteJoinedRef = useRef(false);
  remoteJoinedRef.current = remoteJoined;

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
    if (!scriptReady || callRef.current) return;
    let call;
    try {
      call = window.DailyIframe.createCallObject({
        audioSource: true,
        videoSource: !isVoice,
      });
      callRef.current = call;

      call.on('joined-meeting', () => setJoined(true));

      call.on('track-started', (e) => {
        const p = e?.participant;
        const track = e?.track;
        if (!p || !track) return;
        if (p.local) {
          if (track.kind === 'video' && localVideoRef.current) {
            localVideoRef.current.srcObject = new MediaStream([track]);
          }
          return;
        }
        setRemoteJoined(true);
        setRemoteName(p.user_name || '');
        if (track.kind === 'video') {
          setRemoteHasVideo(true);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = new MediaStream([track]);
        } else if (track.kind === 'audio' && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = new MediaStream([track]);
        }
      });

      call.on('track-stopped', (e) => {
        const p = e?.participant;
        if (p && !p.local && e?.track?.kind === 'video') setRemoteHasVideo(false);
      });

      call.on('participant-left', (e) => {
        if (!e?.participant?.local) { setRemoteJoined(false); setRemoteHasVideo(false); }
      });

      call.on('participant-updated', (e) => {
        const p = e?.participant;
        if (!p) return;
        if (isVoice && p.local && p.video) {
          // Enforce voice-only for the whole call, not just at join: if the
          // camera track ever comes on (local toggle, device auto-resume,
          // etc.) turn it straight back off.
          call.setLocalVideo(false);
          setVoiceOnlyNotice(true);
          setTimeout(() => setVoiceOnlyNotice(false), 3000);
        }
      });

      call.on('left-meeting', () => onLeave && onLeave());
      // Daily fires 'error' for plenty of non-fatal hiccups mid-call (a
      // brief network blip, a camera glitch, etc.) that it recovers from on
      // its own - so this only shows a passing banner, never a page that
      // kicks out the controls (hang-up must always stay reachable).
      call.on('error', (e) => {
        setError((e && (e.errorMsg || e.error)) || 'Call error - please try again.');
        setTimeout(() => setError(''), 6000);
      });

      call.join({ url: roomUrl, token }).then(() => {
        // AI noise cancellation (Krisp) - filters out background noise
        // (traffic, fans, crowds, etc.) so only the speaker's voice comes
        // through. Not supported on every Daily plan, so fail silently if
        // it's unavailable rather than breaking the call.
        call.updateInputSettings({ audio: { processor: { type: 'noise-cancellation' } } }).catch(() => {});
      }).catch(() => setError('Could not join the call. Please try again.'));
    } catch {
      setError('Could not start the call on this device.');
    }
    return () => {
      if (callRef.current) { callRef.current.destroy(); callRef.current = null; }
    };
    // eslint-disable-next-line
  }, [scriptReady, roomUrl, token]);

  // While we're the one calling (nobody's joined yet), listen for the other
  // side declining, so "Ringing..." doesn't just hang forever if they tap
  // Decline on their Incoming Call screen.
  useEffect(() => {
    if (!appointmentId || !authToken) return;
    let stopped = false;
    const onDeclined = () => {
      if (stopped || remoteJoinedRef.current) return;
      stopped = true;
      setDeclined(true);
      setTimeout(() => { onLeave && onLeave(); }, 2000);
    };

    const ws = new WebSocket(`${wsUrl()}/api/calls/ws?token=${encodeURIComponent(authToken)}`);
    ws.onmessage = (evt) => {
      let msg;
      try { msg = JSON.parse(evt.data); } catch { return; }
      if (msg.type === 'call_declined' && msg.appointment_id === appointmentId) onDeclined();
    };

    // Fallback: this socket is brand new the instant a call starts, and on
    // a slow connection (or a backend that just cold-started) it can still
    // be mid-handshake the moment the other side taps Decline, so the push
    // above has nothing to deliver to. Poll the same signal as a safety
    // net - worst case the "Ringing..." screen takes an extra couple of
    // seconds to notice, instead of hanging forever.
    const poll = setInterval(async () => {
      if (stopped || remoteJoinedRef.current) return;
      try {
        const res = await fetch(`${API}/api/calls/${appointmentId}/status`);
        const data = await res.json();
        if (data.declined) onDeclined();
      } catch { /* best-effort */ }
    }, 2000);

    return () => { stopped = true; ws.close(); clearInterval(poll); };
    // eslint-disable-next-line
  }, [appointmentId, authToken]);

  // Call duration timer, starts once the other person actually joins.
  useEffect(() => {
    if (remoteJoined && !timerRef.current) {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [remoteJoined]);

  function formatDuration(total) {
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function toggleMic() {
    if (!callRef.current) return;
    const next = !micOn;
    callRef.current.setLocalAudio(next);
    setMicOn(next);
  }

  function toggleCam() {
    if (isVoice || !callRef.current) return;
    const next = !camOn;
    callRef.current.setLocalVideo(next);
    setCamOn(next);
  }

  function hangUp() {
    // If nobody answered yet, let the other side know the call is off so
    // their Incoming Call screen dismisses instead of ringing until it
    // times out on its own.
    if (!remoteJoinedRef.current && appointmentId && authToken && role) {
      const endpoint = role === 'doctor' ? '/api/doctor/appointments' : '/api/consultation/appointments';
      fetch(`${API}${endpoint}/${appointmentId}/call/cancel`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      }).catch(() => {});
    }
    if (callRef.current) callRef.current.leave().catch(() => {});
    onLeave && onLeave();
  }

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  const statusLabel = declined ? 'Call declined' : !joined ? 'Connecting...' : remoteJoined ? formatDuration(seconds) : 'Ringing...';
  const showRemoteVideo = !isVoice && remoteJoined && remoteHasVideo;
  const showLocalPreview = !isVoice && camOn;

  return (
    <div ref={containerRef} style={{ position: 'fixed', inset: 0, background: '#111827', zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* A passing problem (network blip, camera glitch, etc.) shows as a
          banner, never as a takeover - the call controls below, above all
          hang-up, must always stay reachable so the person is never stuck
          on a screen with no way to leave. */}
      {!!error && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1002,
          background: 'rgba(220,38,38,0.95)', color: '#fff', fontSize: 13, fontWeight: 500,
          padding: '10px 16px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      <>
          <div style={{ flex: 1, position: 'relative' }}>
            {/* Always mounted (even when hidden) so the video element exists
                the instant a remote track arrives - a track that starts
                while this tag is unmounted has nowhere to attach to. */}
            <video ref={remoteVideoRef} autoPlay playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000',
                display: showRemoteVideo ? 'block' : 'none' }} />
            {!showRemoteVideo && (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, position: 'absolute', inset: 0 }}>
                <div style={{
                  width: 108, height: 108, borderRadius: '50%', background: '#374151',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: !remoteJoined ? '0 0 0 0 rgba(255,255,255,0.25)' : 'none',
                  animation: !remoteJoined ? 'callroom-pulse 1.8s ease-out infinite' : 'none',
                }}>
                  <User size={48} color="#9ca3af" />
                </div>
                <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{remoteName || (isVoice ? 'Voice Call' : 'Video Call')}</div>
              </div>
            )}

            {/* Always-visible status bar at the top */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 16px 40px', textAlign: 'center',
              background: showRemoteVideo ? 'linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0))' : 'none' }}>
              {showRemoteVideo && <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{remoteName}</div>}
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500 }}>{statusLabel}</div>
            </div>

            <button onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              style={{ position: 'absolute', top: 16, left: 16, width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'rgba(0,0,0,0.4)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
            </button>

            {!isVoice && (
              <video ref={localVideoRef} autoPlay playsInline muted
                style={{ position: 'absolute', top: 16, right: 16, width: 96, height: 128, borderRadius: 12, objectFit: 'cover',
                  background: '#000', border: '2px solid rgba(255,255,255,0.2)',
                  display: showLocalPreview ? 'block' : 'none' }} />
            )}

            {voiceOnlyNotice && (
              <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 1001,
                background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: 12, padding: '8px 14px', borderRadius: 8, maxWidth: '80%', textAlign: 'center' }}>
                This is a voice call - video isn't included. Book a video consultation to enable your camera.
              </div>
            )}
          </div>

          {/* Bottom control bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '20px 16px 36px' }}>
            <button onClick={toggleMic}
              style={{ width: 54, height: 54, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: micOn ? 'rgba(255,255,255,0.15)' : '#fff', color: micOn ? '#fff' : '#111827',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {micOn ? <Mic size={22} /> : <MicOff size={22} />}
            </button>

            <button onClick={hangUp}
              style={{ width: 64, height: 64, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PhoneOff size={26} />
            </button>

            {!isVoice && (
              <button onClick={toggleCam}
                style={{ width: 54, height: 54, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: camOn ? 'rgba(255,255,255,0.15)' : '#fff', color: camOn ? '#fff' : '#111827',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {camOn ? <Video size={22} /> : <VideoOff size={22} />}
              </button>
            )}
          </div>
      </>

      <style>{`
        @keyframes callroom-pulse {
          0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.25); }
          70% { box-shadow: 0 0 0 22px rgba(255,255,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }
      `}</style>
    </div>
  );
}
