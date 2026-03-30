import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, setDoc, doc } from 'firebase/firestore';
import { LayoutDashboard } from 'lucide-react';

export default function LandingPage() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
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

    return () => unsubscribe();
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
    navigate(`/table/${tableId}`);
  };

  return (
    <div className="container animate-fade" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ textAlign: 'center', marginBottom: '3rem', marginTop: '4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.8rem', background: 'rgba(255, 107, 107, 0.1)', borderRadius: '1rem' }}>
            <LayoutDashboard size={32} style={{ color: 'var(--primary)' }} />
          </div>
          <span className="logo" style={{ fontSize: '2.2rem' }}>RestoModern</span>
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
              <div className="table-number" style={{ fontSize: '2rem', fontWeight: '900', color: table.status === 'occupied' ? '#ef4444' : 'var(--primary)', marginBottom: '0.5rem' }}>
                {table.name ? (table.name.replace(/^\D+/g, '') || table.name[0]) : table.id}
              </div>
              <div className="table-label" style={{ letterSpacing: '0.2rem', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                {table.name ? table.name.split(' ')[0] : 'MEJA'}
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
    </div>
  );
}
