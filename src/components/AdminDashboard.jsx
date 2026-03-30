import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, updateDoc, doc, orderBy, deleteDoc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { 
  ShoppingBag, 
  User, 
  LogOut, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  ChefHat, 
  CheckCircle2, 
  LayoutDashboard, 
  Settings, 
  Save, 
  X, 
  UtensilsCrossed, 
  Search 
} from 'lucide-react';

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab ] = useState('orders'); // 'orders', 'tables', 'menu'
  
  // Menu Form State
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [menuForm, setMenuForm] = useState({ name: '', price: '', category: 'Makanan', image: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersData);
    });

    const qTables = query(collection(db, 'tables'));
    const unsubscribeTables = onSnapshot(qTables, (snapshot) => {
      const tablesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTables(tablesData);
    });

    const qMenu = query(collection(db, 'menu'), orderBy('name', 'asc'));
    const unsubscribeMenu = onSnapshot(qMenu, (snapshot) => {
      const menuData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMenu(menuData);
      setLoading(false);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeTables();
      unsubscribeMenu();
    };
  }, []);

  // --- Menu Management Logic ---
  const handleSaveMenu = async (e) => {
    e.preventDefault();
    try {
      const itemData = {
        ...menuForm,
        price: Number(menuForm.price)
      };

      if (editingItem) {
        await updateDoc(doc(db, 'menu', editingItem.id), itemData);
      } else {
        await addDoc(collection(db, 'menu'), itemData);
      }
      
      setIsMenuModalOpen(false);
      setEditingItem(null);
      setMenuForm({ name: '', price: '', category: 'Makanan', image: '' });
    } catch (error) {
      console.error("Error saving menu: ", error);
      alert("Gagal menyimpan menu.");
    }
  };

  const deleteMenuItem = async (id) => {
    if (window.confirm('Hapus menu ini?')) {
      await deleteDoc(doc(db, 'menu', id));
    }
  };

  // --- Table Logic ---
  const resetTable = async (tableId) => {
    if (window.confirm(`Yakin ingin mengosongkan Meja/Ruangan ini?`)) {
      try {
        await updateDoc(doc(db, 'tables', tableId), {
          status: 'available'
        });
      } catch (error) {
        console.error("Error resetting table: ", error);
      }
    }
  };

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
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Manajemen Restoran</h1>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setActiveTab('orders')}
            className={activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.6rem 1.2rem' }}
          >
            <UtensilsCrossed size={18} /> Pesanan
          </button>
          <button 
            onClick={() => setActiveTab('tables_status')}
            className={activeTab === 'tables_status' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.6rem 1.2rem' }}
          >
            <LayoutDashboard size={18} /> Status Meja
          </button>
          <button 
            onClick={() => setActiveTab('tables_config')}
            className={activeTab === 'tables_config' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.6rem 1.2rem' }}
          >
            <Settings size={18} /> Pengaturan Meja
          </button>
          <button 
            onClick={() => setActiveTab('menu')}
            className={activeTab === 'menu' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.6rem 1.2rem' }}
          >
            <ShoppingBag size={18} /> Daftar Menu
          </button>
        </div>
      </header>

      {activeTab === 'orders' && (
        <div style={{ marginBottom: '2rem' }}>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1.2rem' }}>
            <Search size={20} style={{ color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Cari Barcode (Angka)..." 
              className="input-field" 
              style={{ border: 'none', padding: 0, background: 'transparent' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      {loading ? (
        <p>Memuat data...</p>
      ) : activeTab === 'orders' ? (
        /* ORDERS TAB */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {orders.filter(o => o.numericId?.includes(searchTerm) || o.tableId?.includes(searchTerm)).length === 0 && (
            <div className="glass-card" style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center' }}>
               <UtensilsCrossed size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
               <p style={{ color: 'var(--text-muted)' }}>Tidak ada pesanan yang sesuai.</p>
            </div>
          )}
          
          {orders.filter(o => o.numericId?.includes(searchTerm) || o.tableId?.includes(searchTerm)).map(order => (
            <div key={order.id} className="glass-card" style={{ padding: '1.5rem', borderLeft: `6px solid ${getStatusColor(order.status)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <div style={{ padding: '0.2rem 0.5rem', background: 'var(--primary)', color: 'white', borderRadius: '0.3rem', fontSize: '0.8rem', fontWeight: 'bold', display: 'inline-block', marginBottom: '0.5rem' }}>
                    ID: {order.numericId}
                  </div>
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
      ) : activeTab === 'tables_status' ? (
        /* TABLES STATUS TAB */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {tables.sort((a,b) => (a.name || '').localeCompare(b.name || '', undefined, {numeric: true})).map(table => {
            const isOccupied = table.status === 'occupied';

            return (
              <div key={table.id} className="glass-card" style={{ padding: '1.5rem', borderTop: `6px solid ${isOccupied ? '#ef4444' : '#10b981'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{table.name}</h3>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.85rem', color: isOccupied ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                    {isOccupied ? 'TERISI / SEDANG MEMESAN' : 'KOSONG / SIAP'}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {isOccupied ? (
                    <button 
                      onClick={() => resetTable(table.id)}
                      className="btn-secondary"
                      style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444' }}
                    >
                      Reset Meja
                    </button>
                  ) : (
                    <div style={{ flex: 1, textAlign: 'center', padding: '0.8rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      Tersedia
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : activeTab === 'tables_config' ? (
        /* TABLES CONFIG TAB */
        <div className="animate-fade">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem' }}>Pengaturan Meja & Ruangan</h2>
            <button 
              onClick={async () => {
                const name = prompt("Masukkan Nama Meja/Ruangan (misal: VIP 1):");
                if (name) {
                  const id = name.toLowerCase().replace(/\s+/g, '-');
                  await setDoc(doc(db, 'tables', id), { name, status: 'available' });
                }
              }}
              className="btn-primary"
            >
              <Plus size={18} /> Tambah Meja
            </button>
          </div>

          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '1.2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '1.2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>NAMA MEJA</th>
                  <th style={{ textAlign: 'left', padding: '1.2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((table) => (
                  <tr key={table.id} style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '1.2rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{table.id}</td>
                    <td style={{ padding: '1.2rem', fontWeight: 'bold' }}>{table.name}</td>
                    <td style={{ padding: '1.2rem' }}>
                      <div style={{ display: 'flex', gap: '0.8rem' }}>
                        <button 
                          onClick={async () => {
                            const newName = prompt("Ubah Nama Meja:", table.name);
                            if (newName && newName !== table.name) {
                              await setDoc(doc(db, 'tables', table.id), { name: newName }, { merge: true });
                            }
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm(`Hapus meja ${table.name}?`)) {
                              await deleteDoc(doc(db, 'tables', table.id));
                            }
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MENU MANAGEMENT TAB */
        <div className="animate-fade">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem' }}>Daftar Menu Makanan & Minuman</h2>
            <button 
              onClick={() => {
                setEditingItem(null);
                setMenuForm({ name: '', price: '', category: 'Makanan', image: '' });
                setIsMenuModalOpen(true);
              }}
              className="btn-primary"
            >
              <Plus size={18} /> Tambah Menu
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {menu.map(item => (
              <div key={item.id} className="glass-card" style={{ overflow: 'hidden' }}>
                <img src={item.image || 'https://images.unsplash.com/photo-1495195129352-aeb325a55b65?w=300'} alt={item.name} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                <div style={{ padding: '1.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontWeight: 'bold' }}>{item.name}</h4>
                    <span style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 'bold' }}>Rp {item.price.toLocaleString()}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{item.category}</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => {
                        setEditingItem(item);
                        setMenuForm(item);
                        setIsMenuModalOpen(true);
                      }}
                      className="btn-secondary" 
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                    <button 
                      onClick={() => deleteMenuItem(item.id)}
                      className="btn-secondary" 
                      style={{ padding: '0.5rem', color: '#ef4444' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ADD/EDIT MENU MODAL */}
          {isMenuModalOpen && (
            <div className="modal-overlay">
              <div className="glass-card animate-fade" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.5rem' }}>{editingItem ? 'Edit Menu' : 'Tambah Menu Baru'}</h3>
                  <button onClick={() => setIsMenuModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
                </div>

                <form onSubmit={handleSaveMenu} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Nama Menu</label>
                    <input 
                      type="text" 
                      required
                      className="input-field" 
                      value={menuForm.name}
                      onChange={(e) => setMenuForm({...menuForm, name: e.target.value})}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Harga (Rp)</label>
                      <input 
                        type="number" 
                        required
                        className="input-field" 
                        value={menuForm.price}
                        onChange={(e) => setMenuForm({...menuForm, price: e.target.value})}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Kategori</label>
                      <select 
                        className="input-field" 
                        value={menuForm.category}
                        onChange={(e) => setMenuForm({...menuForm, category: e.target.value})}
                      >
                        <option value="Makanan">Makanan</option>
                        <option value="Minuman">Minuman</option>
                        <option value="Cemilan">Cemilan</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>URL Foto (Kosongkan untuk default)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={menuForm.image}
                      onChange={(e) => setMenuForm({...menuForm, image: e.target.value})}
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
                    <Save size={18} /> Simpan Menu
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
