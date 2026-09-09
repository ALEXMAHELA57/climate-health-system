import React, { useState, useEffect } from 'react';
import { Store, Package, ShoppingBag, Wallet, LogOut, Plus, Trash2 } from 'lucide-react';
import { API } from './constants';

function authHeaders(token) {
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export default function VendorPortal() {
  const [token, setToken] = useState(() => localStorage.getItem('afya_vendor_token'));
  const [vendor, setVendor] = useState(() => JSON.parse(localStorage.getItem('afya_vendor') || 'null'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [view, setView] = useState('products'); // products | orders | payouts
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', category: '', description: '', price: '', stock: '' });

  useEffect(() => {
    if (token) {
      loadCategories();
      loadView();
    }
  }, [token, view]);

  async function login() {
    setError('');
    try {
      const res = await fetch(`${API}/api/shop/vendor/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('afya_vendor_token', data.token);
        localStorage.setItem('afya_vendor', JSON.stringify(data.vendor));
        setToken(data.token); setVendor(data.vendor);
      } else setError(data.error || 'Login failed');
    } catch { setError('Connection error'); }
  }

  function logout() {
    localStorage.removeItem('afya_vendor_token'); localStorage.removeItem('afya_vendor');
    setToken(null); setVendor(null);
  }

  async function loadCategories() {
    try {
      const res = await fetch(`${API}/api/shop/categories`);
      setCategories((await res.json()).categories || []);
    } catch {}
  }

  async function loadView() {
    try {
      if (view === 'products') {
        const res = await fetch(`${API}/api/shop/vendor/products`, { headers: authHeaders(token) });
        setProducts((await res.json()).products || []);
      } else if (view === 'orders') {
        const res = await fetch(`${API}/api/shop/vendor/orders`, { headers: authHeaders(token) });
        setOrders((await res.json()).orders || []);
      } else if (view === 'payouts') {
        const res = await fetch(`${API}/api/shop/vendor/payouts`, { headers: authHeaders(token) });
        setPayouts((await res.json()).payouts || []);
      }
    } catch {}
  }

  async function addProduct() {
    if (!productForm.name.trim() || !productForm.category || !productForm.price) return;
    try {
      await fetch(`${API}/api/shop/vendor/products`, {
        method: 'POST', headers: authHeaders(token),
        body: JSON.stringify({ ...productForm, price: parseFloat(productForm.price), stock: parseInt(productForm.stock || 0) }),
      });
      setShowAddProduct(false);
      setProductForm({ name: '', category: '', description: '', price: '', stock: '' });
      loadView();
    } catch {}
  }

  async function removeProduct(id) {
    await fetch(`${API}/api/shop/vendor/products/${id}`, { method: 'DELETE', headers: authHeaders(token) }).catch(() => {});
    loadView();
  }

  async function updateOrderStatus(subOrderId, status) {
    await fetch(`${API}/api/shop/vendor/orders/${subOrderId}/status`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ status }) }).catch(() => {});
    loadView();
  }

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 24, maxWidth: 380, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Store size={32} color="#2563eb" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 20, fontWeight: 700 }}>AfyaHewa Vendor Portal</div>
        </div>
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}
          style={{ padding: 12, marginBottom: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()}
          style={{ padding: 12, marginBottom: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }} />
        {!!error && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{error}</p>}
        <button onClick={login} style={{ padding: 13, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Log In</button>
      </div>
    );
  }

  const orderStatusColor = { pending: '#d97706', processing: '#2563eb', shipped: '#7c3aed', delivered: '#166534' };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ background: '#2563eb', color: '#fff', padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{vendor?.name}</div>
        <button onClick={logout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 8, padding: 8, cursor: 'pointer' }}><LogOut size={16} /></button>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: 16 }}>
        <button onClick={() => setView('products')} style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: view === 'products' ? '#2563eb' : '#fff', color: view === 'products' ? '#fff' : '#6b7280' }}>
          <Package size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Products
        </button>
        <button onClick={() => setView('orders')} style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: view === 'orders' ? '#2563eb' : '#fff', color: view === 'orders' ? '#fff' : '#6b7280' }}>
          <ShoppingBag size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Orders
        </button>
        <button onClick={() => setView('payouts')} style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: view === 'payouts' ? '#2563eb' : '#fff', color: view === 'payouts' ? '#fff' : '#6b7280' }}>
          <Wallet size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Payouts
        </button>
      </div>

      {view === 'products' && (
        <div style={{ padding: '0 16px' }}>
          <button onClick={() => setShowAddProduct(s => !s)}
            style={{ width: '100%', padding: 10, marginBottom: 14, background: showAddProduct ? '#fff' : '#f0fdf4', border: `1px solid ${showAddProduct ? '#e5e7eb' : '#bbf7d0'}`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: showAddProduct ? '#6b7280' : '#166534' }}>
            <Plus size={14} /> {showAddProduct ? 'Cancel' : 'Add Product'}
          </button>

          {showAddProduct && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 14 }}>
              <input value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} placeholder="Product name"
                style={{ width: '100%', padding: 9, marginBottom: 8, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
              <select value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                style={{ width: '100%', padding: 9, marginBottom: 8, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.en}</option>)}
              </select>
              <input value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} placeholder="Price (TZS)" type="number"
                style={{ width: '100%', padding: 9, marginBottom: 8, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
              <input value={productForm.stock} onChange={e => setProductForm({ ...productForm, stock: e.target.value })} placeholder="Stock quantity" type="number"
                style={{ width: '100%', padding: 9, marginBottom: 8, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
              <button onClick={addProduct} style={{ width: '100%', padding: 10, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save Product</button>
            </div>
          )}

          {products.length === 0 && <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 20 }}>No products yet</p>}
          {products.map(p => (
            <div key={p.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>TZS {p.price.toLocaleString()} · Stock: {p.stock}</div>
              </div>
              <button onClick={() => removeProduct(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={14} color="#ef4444" /></button>
            </div>
          ))}
        </div>
      )}

      {view === 'orders' && (
        <div style={{ padding: '0 16px' }}>
          {orders.length === 0 && <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 20 }}>No orders yet</p>}
          {orders.map(o => (
            <div key={o.sub_order_id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{o.order_id}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: orderStatusColor[o.status] }}>{o.status}</span>
              </div>
              <div style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>{o.items.map(i => `${i.name} ×${i.qty}`).join(', ')}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>TZS {o.subtotal.toLocaleString()} · {o.delivery_name} · {o.delivery_phone} · {o.delivery_address}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['processing', 'shipped', 'delivered'].map(s => (
                  <button key={s} onClick={() => updateOrderStatus(o.sub_order_id, s)}
                    style={{ flex: 1, padding: 7, background: o.status === s ? '#2563eb' : '#f3f4f6', color: o.status === s ? '#fff' : '#374151', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', textTransform: 'capitalize' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'payouts' && (
        <div style={{ padding: '0 16px' }}>
          {payouts.length === 0 && <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 20 }}>No payouts yet</p>}
          {payouts.map((p, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>TZS {p.amount.toLocaleString()}</span>
              <span style={{ fontSize: 11, color: p.status === 'sent' ? '#166534' : '#991b1b' }}>{p.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
