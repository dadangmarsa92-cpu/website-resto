import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, Send, Utensils, CheckCircle } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';

const MENU_ITEMS = [
  { id: 1, name: 'Nasi Goreng Spesial', price: 25000, category: 'Makanan', image: 'https://images.unsplash.com/photo-1512058560366-cd2427ff1101?auto=format&fit=crop&w=300&q=80' },
  { id: 2, name: 'Mie Ayam Jamur', price: 18000, category: 'Makanan', image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=300&q=80' },
  { id: 3, name: 'Sate Ayam Madura', price: 22000, category: 'Makanan', image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=300&q=80' },
  { id: 4, name: 'Es Teh Manis', price: 5000, category: 'Minuman', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=300&q=80' },
  { id: 5, name: 'Es Jeruk Segar', price: 7000, category: 'Minuman', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=300&q=80' },
];

export default function CustomerPage() {
  const { tableId } = useParams();
  const [cart, setCart] = useState([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);

  // Listen for order status updates
  useEffect(() => {
    if (!tableId) return;
    
    const q = query(
      collection(db, 'orders'), 
      where('tableId', '==', tableId),
      where('status', 'in', ['pending', 'confirmed', 'cooking', 'served'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by creation time to get latest
      const latest = orders.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      })[0];
      setActiveOrder(latest);
    });

    return () => unsubscribe();
  }, [tableId]);

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
    
    try {
      await addDoc(collection(db, 'orders'), {
        tableId,
        items: cart,
        total,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setCart([]);
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Gagal mengirim pesanan. Silakan coba lagi.");
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <div className="container animate-fade">
      <nav>
        <div className="logo">RestoModern</div>
        <div className="table-badge glass-card" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
          Meja #{tableId}
        </div>
      </nav>

      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Selamat Datang!</h1>
        <p style={{ color: 'var(--text-muted)' }}>Silakan pilih menu favorit Anda hari ini.</p>
      </header>

      {activeOrder && (
        <div className="glass-card animate-fade" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', padding: '1.5rem', marginBottom: '2.5rem', textAlign: 'center' }}>
          <Utensils size={24} style={{ color: '#10b981', marginBottom: '0.5rem' }} />
          <p style={{ fontWeight: '600' }}>Status Pesanan: <span style={{ textTransform: 'uppercase', color: '#10b981', marginLeft: '0.5rem' }}>{activeOrder.status}</span></p>
          <div style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {activeOrder.items.map((it, idx) => (
              <span key={idx}>{it.name} ({it.qty}){idx < activeOrder.items.length - 1 ? ', ' : ''}</span>
            ))}
          </div>
        </div>
      )}

      <div className="grid-menu">
        {MENU_ITEMS.map(item => (
          <div key={item.id} className="glass-card" style={{ overflow: 'hidden' }}>
            <img src={item.image} alt={item.name} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
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
    </div>
  );
}
