import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, updateDoc, doc, orderBy, deleteDoc } from 'firebase/firestore';
import { Check, Clock, ChefHat, CheckCircle2, Trash2, LayoutDashboard, UtensilsCrossed } from 'lucide-react';

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus
      });
    } catch (error) {
      console.error("Error updating status: ", error);
    }
  };

  const deleteOrder = async (orderId) => {
    if (window.confirm('Hapus pesanan ini dari riwayat?')) {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
      } catch (error) {
        console.error("Error deleting order: ", error);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'confirmed': return '#3b82f6';
      case 'cooking': return '#8b5cf6';
      case 'served': return '#10b981';
      default: return '#94a3b8';
    }
  };

  return (
    <div className="container animate-fade">
      <nav>
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <LayoutDashboard size={28} style={{ color: 'var(--primary)' }} />
          Admin Panel
        </div>
        <div className="glass-card" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
          {orders.filter(o => o.status !== 'served').length} Pesanan Aktif
        </div>
      </nav>

      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Manajemen Pesanan</h1>
        <p style={{ color: 'var(--text-muted)' }}>Pantau dan kelola pesanan pelanggan dari semua meja.</p>
      </header>

      {loading ? (
        <p>Memuat data...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {orders.length === 0 && (
            <div className="glass-card" style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center' }}>
               <UtensilsCrossed size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
               <p style={{ color: 'var(--text-muted)' }}>Belum ada pesanan masuk.</p>
            </div>
          )}
          
          {orders.map(order => (
            <div key={order.id} className="glass-card" style={{ padding: '1.5rem', borderLeft: `6px solid ${getStatusColor(order.status)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Meja #{order.tableId}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {order.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div style={{ padding: '0.3rem 0.8rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 'bold', background: `${getStatusColor(order.status)}22`, color: getStatusColor(order.status), textTransform: 'uppercase', height: 'fit-content' }}>
                  {order.status}
                </div>
              </div>

              <div style={{ margin: '1rem 0', padding: '1rem 0', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)' }}>
                {order.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    <span>{item.name} <span style={{ color: 'var(--text-muted)' }}>x{item.qty}</span></span>
                    <span style={{ fontWeight: '500' }}>Rp {(item.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
                <div style={{ marginTop: '0.8rem', display: 'flex', justifyContent: 'space-between', fontWeight: '800' }}>
                  <span>TOTAL</span>
                  <span style={{ color: 'var(--primary)' }}>Rp {order.total.toLocaleString()}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {order.status === 'pending' && (
                  <button onClick={() => updateStatus(order.id, 'confirmed')} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', background: '#3b82f6' }}>
                    <Check size={16} /> Konfirmasi
                  </button>
                )}
                {order.status === 'confirmed' && (
                  <button onClick={() => updateStatus(order.id, 'cooking')} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', background: '#8b5cf6' }}>
                    <ChefHat size={16} /> Mulai Masak
                  </button>
                )}
                {order.status === 'cooking' && (
                  <button onClick={() => updateStatus(order.id, 'served')} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', background: '#10b981' }}>
                    <CheckCircle2 size={16} /> Sajikan
                  </button>
                )}
                <button onClick={() => deleteOrder(order.id)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem' }}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
