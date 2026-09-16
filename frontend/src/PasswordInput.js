import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Drop-in replacement for <input type="password" style={{...}} .../> - accepts
// the same props, just adds a show/hide eye toggle. The passed style's
// marginBottom (if any) moves to the wrapper so spacing between fields
// still looks right; everything else stays on the input itself.
export default function PasswordInput({ style = {}, ...props }) {
  const [show, setShow] = useState(false);
  const { marginBottom, ...inputStyle } = style;

  return (
    <div style={{ position: 'relative', marginBottom, width: inputStyle.width || '100%' }}>
      <input
        {...props}
        type={show ? 'text' : 'password'}
        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', paddingRight: 38 }}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow(s => !s)}
        style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          display: 'flex', alignItems: 'center', color: '#9ca3af',
        }}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
