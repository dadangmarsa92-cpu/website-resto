import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, Send, Utensils, CheckCircle, Lock, AlertTriangle } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useLocation } from 'react-router-dom';

// MENU_ITEMS is now fetched from Firestore

export default function CustomerPage() {
  const { tableId } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const urlToken = queryParams.get('token');

  const [cart, setCart] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [orderId, setOrderId] = useState(localStorage.getItem('my_order_id') || null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackInput, setTrackInput] = useState('');

  // Fetch Menu from Firestore
  useEffect(() => {
    const q = query(collection(db, 'menu'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMenuItems(items);
    });

    return () => unsubscribe();
  }, []);

  // Listen for order status updates
  useEffect(() => {
    if (!orderId) return;
    
    const q = query(
      collection(db, 'orders'), 
      where('numericId', '==', orderId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (orders.length === 0) {
        setActiveOrder(null);
        return;
      }
      setActiveOrder(orders[0]);
    });

    return () => unsubscribe();
  }, [orderId]);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty - 1) } : i).filter(i => i.qty > 0));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setIsOrdering(true);
    
    const numericId = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      await addDoc(collection(db, 'orders'), {
        tableId,
        numericId, // The "Barcode" ID
        items: cart,
        total,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setOrderId(numericId);
      localStorage.setItem('my_order_id', numericId);
      setCart([]);
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Gagal mengirim pesanan. Silakan coba lagi.");
    } finally {
      setIsOrdering(false);
    }
  };

  const handleTrackOrder = () => {
    if (trackInput.length === 6) {
      setOrderId(trackInput);
      localStorage.setItem('my_order_id', trackInput);
      setIsTrackingModalOpen(false);
    }
  };

  return (
    <div className="container animate-fade">
      <nav>
        <div className="logo" onClick={() => window.location.href='/'} style={{ cursor: 'pointer' }}>RestoModern</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => setIsTrackingModalOpen(true)}
            className="glass-card" 
            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', borderRadius: '1rem' }}
          >
            Cek Pesanan
          </button>
          <div className="table-badge glass-card" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
            Meja #{tableId}
          </div>
        </div>
      </nav>

      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Selamat Datang!</h1>
        <p style={{ color: 'var(--text-muted)' }}>Silakan pilih menu favorit Anda hari ini.</p>
      </header>

      {activeOrder && (
        <div className="glass-card animate-fade" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', padding: '1.5rem', marginBottom: '2.5rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'var(--primary)', color: 'white', borderRadius: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '1rem' }}>
            {activeOrder.numericId}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Gunakan ID di atas untuk mengecek status pesanan atau bayar di kasir.</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
            <Utensils size={24} style={{ color: '#10b981' }} />
            <p style={{ fontWeight: '600' }}>Status: <span style={{ textTransform: 'uppercase', color: '#10b981' }}>{activeOrder.status}</span></p>
          </div>
        </div>
      )}

      <div className="grid-menu">
        {menuItems.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center' }}>
            <AlertTriangle size={48} style={{ color: 'var(--accent)', marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ color: 'var(--text-muted)' }}>Menu belum tersedia. Silakan hubungi pelayan.</p>
          </div>
        ) : menuItems.map(item => (
          <div key={item.id} className="glass-card" style={{ overflow: 'hidden' }}>
            <img src={item.image || 'https://images.unsplash.com/photo-1495195129352-aeb325a55b65?w=300'} alt={item.name} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
            <div style={{ padding: '1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem' }}>{item.name}</h3>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Rp {item.price.toLocaleString()}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{item.category}</p>
              <button 
                onClick={() => addToCart(item)}
                className="btn-primary" 
                style={{ width: '100%', padding: '0.6rem' }}
              >
                <Plus size={18} /> Tambah
              </button>
            </div>
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <div className="glass-card" style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '500px', padding: '1.5rem', zIndex: 100 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Pesanan</p>
              <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Rp {total.toLocaleString()}</p>
            </div>
            <button 
              onClick={handlePlaceOrder}
              disabled={isOrdering}
              className="btn-primary"
            >
              {isOrdering ? 'Memproses...' : (
                <>
                  <Send size={18} /> Pesan Sekarang
                </>
              )}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {cart.map(item => (
              <div key={item.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', padding: '0.3rem 0.6rem', whiteSpace: 'nowrap', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {item.name} x{item.qty}
                <Plus size={14} style={{ cursor: 'pointer' }} onClick={() => addToCart(item)} />
                <Minus size={14} style={{ cursor: 'pointer' }} onClick={() => removeFromCart(item.id)} />
              </div>
            ))}
          </div>
        </div>
      )}
      {/* TRACKING MODAL */}
      {isTrackingModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card animate-fade" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
             <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Masukkan ID Pesanan</h3>
             <input 
              type="text" 
              maxLength="6"
              placeholder="000000"
              className="input-field"
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', marginBottom: '1.5rem' }}
              value={trackInput}
              onChange={(e) => setTrackInput(e.target.value.replace(/\D/g, ''))}
             />
             <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setIsTrackingModalOpen(false)} className="btn-secondary" style={{ flex: 1 }}>Batal</button>
                <button onClick={handleTrackOrder} disabled={trackInput.length !== 6} className="btn-primary" style={{ flex: 1 }}>Cari</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
