import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { LayoutDashboard } from 'lucide-react';

export default function LandingPage() {
  const [tables, setTables] = useState([]);
  const [settings, setSettings] = useState({
    restaurantName: 'RestoModern',
    logoUrl: ''
  });
  const [loading, setLoading] = useState(true);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'tables'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tableData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // If no tables exist, auto-create initial 6 as a starting point
      if (tableData.length === 0 && loading) {
        initDefaultTables();
      } else {
        setTables(tableData.sort((a,b) => (a.name || '').localeCompare(b.name || '', undefined, {numeric: true})));
        setLoading(false);
      }
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'restaurant'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      }
    });

    return () => {
      unsubscribe();
      unsubscribeSettings();
    };
  }, []);

  const initDefaultTables = async () => {
    for (let i = 1; i <= 6; i++) {
      await setDoc(doc(db, 'tables', i.toString()), {
        name: `Meja ${i}`,
        status: 'available'
      });
    }
  };

  const handleTableClick = (tableId) => {
    const table = tables.find(t => t.id === tableId);
    if (table && table.status === 'occupied') {
      // If occupied, just go to the menu (maybe they want to add an order)
      navigate(`/table/${tableId}`);
    } else {
      setSelectedTableId(tableId);
      setIsCustomerModalOpen(true);
    }
  };

  const handleSubmitCustomer = async (e) => {
    e.preventDefault();
    try {
      // Update table status in Firestore
      const tableRef = doc(db, 'tables', selectedTableId);
      await setDoc(tableRef, {
        status: 'occupied',
        customerName: customerForm.name,
        customerPhone: customerForm.phone,
        occupiedAt: serverTimestamp()
      }, { merge: true });

      // Save to localStorage for CustomerPage
      localStorage.setItem('customer_name', customerForm.name);
      localStorage.setItem('customer_phone', customerForm.phone);
      // Clear old order ID when starting a fresh session
      localStorage.removeItem('my_order_id');

      setIsCustomerModalOpen(false);
      navigate(`/table/${selectedTableId}`);
    } catch (error) {
      console.error("Error updating table status: ", error);
      alert("Gagal memproses. Silakan coba lagi.");
    }
  };

  return (
    <div className="container animate-fade" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ textAlign: 'center', marginBottom: '3rem', marginTop: '4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.4rem', background: 'rgba(255, 107, 107, 0.05)', borderRadius: '1rem' }}>
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" style={{ height: '50px', borderRadius: '0.5rem' }} />
            ) : (
              <LayoutDashboard size={32} style={{ color: 'var(--primary)' }} />
            )}
          </div>
          <span className="logo" style={{ fontSize: '2.2rem' }}>{settings.restaurantName}</span>
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.8rem', fontWeight: '800' }}>
          Selamat Datang
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Pilih meja atau ruangan Anda untuk mulai memesan</p>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="animate-pulse" style={{ color: 'var(--primary)' }}>Memuat pengaturan meja...</div>
        </div>
      ) : (
        <div className="grid-tables" style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.2rem' }}>
          {tables.map((table) => (
            <div 
              key={table.id} 
              className="glass-card table-card"
              onClick={() => handleTableClick(table.id)}
              style={{ 
                cursor: 'pointer', 
                padding: '2rem 1.5rem', 
                textAlign: 'center',
                transition: 'all 0.3s ease',
                border: table.status === 'occupied' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--glass-border)'
              }}
            >
              <div className="table-number" style={{ fontSize: '1.5rem', fontWeight: '900', color: table.status === 'occupied' ? '#ef4444' : 'var(--primary)', marginBottom: '0.5rem', wordBreak: 'break-word' }}>
                {table.name || table.id}
              </div>
              <div className="table-label" style={{ letterSpacing: '0.1rem', fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.7 }}>
                STATUS
              </div>
              {table.status === 'occupied' && (
                <div style={{ marginTop: '0.8rem', fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '0.5rem', display: 'inline-block' }}>
                  TERISI
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <footer style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', opacity: 0.6 }}>
        &copy; 2026 RestoModern. Sistem Pemesanan Pintar.
      </footer>

      {/* Customer Info Modal */}
      {isCustomerModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card animate-fade" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>Data Pelanggan</h2>
            <form onSubmit={handleSubmitCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Nama Anda</label>
                <input 
                  type="text" 
                  required
                  className="input-field" 
                  placeholder="Contoh: Budi Santoso"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Nomor Telepon/WhatsApp</label>
                <input 
                  type="tel" 
                  required
                  className="input-field"
                  placeholder="0812..."
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="btn-secondary" style={{ flex: 1 }}>Batal</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Mulai Pesan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
