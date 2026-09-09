import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Package, CheckCircle2 } from 'lucide-react';
import { API } from './constants';
import { useTheme } from './ThemeContext';

function authHeaders() {
  const token = localStorage.getItem('afya_token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export default function HealthShop({ lang }) {
  const { theme } = useTheme();
  const sw = lang === 'sw';
  const user = JSON.parse(localStorage.getItem('afya_user') || 'null');

  const [view, setView] = useState('browse'); // browse | products | cart | checkout | confirmed | orders
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ delivery_name: user?.name || '', delivery_phone: user?.phone || '', delivery_address: '', payment_provider: 'Mpesa' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/shop/categories`).then(r => r.json()).then(d => setCategories(d.categories || [])).catch(() => {});
  }, []);

  async function openCategory(catId) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/shop/products?category=${catId}`);
      const data = await res.json();
      setProducts(data.products || []);
      setView('products');
    } catch { setProducts([]); }
    setLoading(false);
  }

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  }

  function updateQty(productId, delta) {
    setCart(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i).filter(i => i.quantity > 0));
  }

  function removeFromCart(productId) {
    setCart(prev => prev.filter(i => i.product_id !== productId));
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  async function submitCheckout() {
    if (!form.delivery_name.trim() || !form.delivery_phone.trim() || !form.delivery_address.trim()) {
      setError(sw ? 'Tafadhali jaza sehemu zote' : 'Please fill in all fields'); return;
    }
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API}/api/shop/checkout`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })), ...form }),
      });
      const data = await res.json();
      if (data.success) {
        setConfirmedOrder(data);
        setCart([]);
        setView('confirmed');
      } else setError(data.error || (sw ? 'Imeshindwa' : 'Checkout failed'));
    } catch { setError(sw ? 'Hitilafu ya muunganisho' : 'Connection error'); }
    setSubmitting(false);
  }

  async function loadOrders() {
    setLoading(true); setView('orders');
    try {
      const res = await fetch(`${API}/api/shop/orders/mine`, { headers: authHeaders() });
      const data = await res.json();
      setOrders(data.orders || []);
    } catch { setOrders([]); }
    setLoading(false);
  }

  const inputStyle = { width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 14 };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={() => setView('browse')}
          style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: (view === 'browse' || view === 'products') ? '#2563eb' : theme.card, color: (view === 'browse' || view === 'products') ? '#fff' : theme.textMuted }}>
          {sw ? 'Duka' : 'Shop'}
        </button>
        <button onClick={() => setView('cart')}
          style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, position: 'relative',
            background: view === 'cart' ? '#2563eb' : theme.card, color: view === 'cart' ? '#fff' : theme.textMuted }}>
          <ShoppingCart size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{sw ? 'Kikapu' : 'Cart'} {cartCount > 0 && `(${cartCount})`}
        </button>
        <button onClick={loadOrders}
          style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: view === 'orders' ? '#2563eb' : theme.card, color: view === 'orders' ? '#fff' : theme.textMuted }}>
          {sw ? 'Maagizo' : 'Orders'}
        </button>
      </div>

      {view === 'browse' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {categories.map(c => (
            <button key={c.id} onClick={() => openCategory(c.id)}
              style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, textAlign: 'left', cursor: 'pointer' }}>
              <Package size={20} color="#2563eb" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{sw ? c.sw : c.en}</div>
            </button>
          ))}
        </div>
      )}

      {view === 'products' && (
        <div>
          <button onClick={() => setView('browse')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12 }}>‹ {sw ? 'Rudi' : 'Back'}</button>
          {loading && <p style={{ textAlign: 'center', color: theme.textFaint, fontSize: 13 }}>{sw ? 'Inapakia...' : 'Loading...'}</p>}
          {!loading && products.length === 0 && <p style={{ textAlign: 'center', color: theme.textFaint, fontSize: 13, padding: 20 }}>{sw ? 'Hakuna bidhaa' : 'No products in this category yet'}</p>}
          {products.map(p => (
            <div key={p.id} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{p.name}</div>
                <div style={{ fontSize: 12, color: theme.textMuted }}>TZS {p.price.toLocaleString()}</div>
              </div>
              <button onClick={() => addToCart(p)} style={{ padding: '7px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {sw ? 'Ongeza' : 'Add'}
              </button>
            </div>
          ))}
        </div>
      )}

      {view === 'cart' && (
        <div>
          {cart.length === 0 && <p style={{ textAlign: 'center', color: theme.textFaint, fontSize: 13, padding: 30 }}>{sw ? 'Kikapu ni tupu' : 'Your cart is empty'}</p>}
          {cart.map(item => (
            <div key={item.product_id} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: theme.textMuted }}>TZS {item.price.toLocaleString()} × {item.quantity}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => updateQty(item.product_id, -1)} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.bg, cursor: 'pointer' }}><Minus size={12} /></button>
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 16, textAlign: 'center' }}>{item.quantity}</span>
                  <button onClick={() => updateQty(item.product_id, 1)} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.bg, cursor: 'pointer' }}><Plus size={12} /></button>
                  <button onClick={() => removeFromCart(item.product_id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={14} color="#ef4444" /></button>
                </div>
              </div>
            </div>
          ))}
          {cart.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 14, fontWeight: 700, color: theme.text }}>
                <span>{sw ? 'Jumla' : 'Total'}</span><span>TZS {cartTotal.toLocaleString()}</span>
              </div>
              <button onClick={() => setView('checkout')} style={{ width: '100%', padding: 12, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {sw ? 'Endelea Kulipa' : 'Proceed to Checkout'}
              </button>
            </>
          )}
        </div>
      )}

      {view === 'checkout' && (
        <div>
          <button onClick={() => setView('cart')} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12 }}>‹ {sw ? 'Rudi' : 'Back'}</button>
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{sw ? 'Jumla' : 'Total'}: TZS {cartTotal.toLocaleString()}</div>
          </div>
          <input placeholder={sw ? 'Jina la mpokeaji' : 'Recipient name'} value={form.delivery_name} onChange={e => setForm({ ...form, delivery_name: e.target.value })} style={inputStyle} />
          <input placeholder={sw ? 'Nambari ya simu' : 'Phone number'} value={form.delivery_phone} onChange={e => setForm({ ...form, delivery_phone: e.target.value })} style={inputStyle} />
          <input placeholder={sw ? 'Anwani ya kutuma' : 'Delivery address'} value={form.delivery_address} onChange={e => setForm({ ...form, delivery_address: e.target.value })} style={inputStyle} />
          <select value={form.payment_provider} onChange={e => setForm({ ...form, payment_provider: e.target.value })} style={inputStyle}>
            <option value="Mpesa">M-Pesa</option>
            <option value="Tigo">Tigo Pesa</option>
            <option value="Airtel">Airtel Money</option>
            <option value="Halopesa">HaloPesa</option>
            <option value="Azampesa">AzamPesa</option>
          </select>
          {!!error && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{error}</p>}
          <button onClick={submitCheckout} disabled={submitting} style={{ width: '100%', padding: 12, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {submitting ? (sw ? 'Inatuma...' : 'Processing...') : (sw ? 'Lipa Sasa' : 'Pay Now')}
          </button>
        </div>
      )}

      {view === 'confirmed' && confirmedOrder && (
        <div style={{ textAlign: 'center', padding: 30 }}>
          <CheckCircle2 size={40} color="#16a34a" style={{ margin: '0 auto 10px' }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 6 }}>{sw ? 'Agizo limewekwa!' : 'Order placed!'}</div>
          <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 8 }}>{sw ? 'Namba ya agizo' : 'Order ID'}: <b>{confirmedOrder.order_id}</b></div>
          <p style={{ fontSize: 12, color: theme.textMuted, marginBottom: 16 }}>{confirmedOrder.message}</p>
          <button onClick={loadOrders} style={{ padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {sw ? 'Ona Maagizo Yangu' : 'View My Orders'}
          </button>
        </div>
      )}

      {view === 'orders' && (
        <div>
          {loading && <p style={{ textAlign: 'center', color: theme.textFaint, fontSize: 13 }}>{sw ? 'Inapakia...' : 'Loading...'}</p>}
          {orders && orders.length === 0 && <p style={{ textAlign: 'center', color: theme.textFaint, fontSize: 13, padding: 20 }}>{sw ? 'Hakuna maagizo bado' : 'No orders yet'}</p>}
          {orders && orders.map(o => (
            <div key={o.order_id} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{o.order_id}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: o.payment_status === 'paid' ? '#166534' : '#d97706' }}>{o.payment_status}</span>
              </div>
              <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 6 }}>TZS {o.total_amount.toLocaleString()}</div>
              {o.sub_orders.map((s, i) => (
                <div key={i} style={{ fontSize: 11, color: theme.textFaint }}>
                  {s.items.map(it => `${it.name} ×${it.qty}`).join(', ')} — {s.status}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
