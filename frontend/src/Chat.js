import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { API } from './constants';
import { useTheme } from './ThemeContext';

function wsUrl() {
  return API.replace('https://', 'wss://').replace('http://', 'ws://');
}

export default function Chat({ lang, appointmentId, token, senderType }) {
  const { theme } = useTheme();
  const sw = lang === 'sw';
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    loadHistory();
    connect();
    return () => wsRef.current?.close();
  }, [appointmentId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function loadHistory() {
    try {
      const res = await fetch(`${API}/api/chat/${appointmentId}/messages?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch { /* silent */ }
  }

  function connect() {
    const ws = new WebSocket(`${wsUrl()}/api/chat/ws/${appointmentId}?token=${encodeURIComponent(token)}`);
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      setMessages(prev => [...prev, msg]);
    };
    wsRef.current = ws;
  }

  function send() {
    if (!text.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ text: text.trim() }));
    setText('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '60vh', border: `1px solid ${theme.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', background: theme.card, borderBottom: `1px solid ${theme.border}`, fontSize: 11, color: connected ? '#16a34a' : '#d97706' }}>
        {connected ? (sw ? '● Mtandaoni' : '● Connected') : (sw ? '○ Inaunganisha...' : '○ Connecting...')}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, background: theme.bg }}>
        {messages.length === 0 && <p style={{ textAlign: 'center', color: theme.textFaint, fontSize: 12, marginTop: 20 }}>{sw ? 'Hakuna ujumbe bado' : 'No messages yet'}</p>}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.sender_type === senderType ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
            <div style={{
              maxWidth: '75%', padding: '8px 12px', borderRadius: 12, fontSize: 13,
              background: m.sender_type === senderType ? '#2563eb' : theme.card,
              color: m.sender_type === senderType ? '#fff' : theme.text,
              border: m.sender_type === senderType ? 'none' : `1px solid ${theme.border}`,
            }}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, padding: 10, background: theme.card, borderTop: `1px solid ${theme.border}` }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={sw ? 'Andika ujumbe...' : 'Type a message...'}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 14 }} />
        <button onClick={send} style={{ padding: '0 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
