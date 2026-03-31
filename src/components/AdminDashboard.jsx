import React from 'react';
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, updateDoc, doc, orderBy, deleteDoc, setDoc, serverTimestamp, addDoc, deleteField } from 'firebase/firestore';
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
  Search,
  BarChart3,
  FileText,
  Printer,
  TrendingUp,
  Users
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab ] = useState('orders'); // 'orders', 'tables_status', 'tables_config', 'menu', 'reports', 'settings'
  const [settings, setSettings] = useState({
    restaurantName: 'RestoModern',
    address: 'Jl. Raya No. 123',
    logoUrl: '',
    printSize: '58x40',
    printOrientation: 'portrait'
  });
  
  // Reports State
  const [reportStats, setReportStats] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0,
    yearly: 0,
    popularItems: [],
    chartData: []
  });
  const [graphType, setGraphType] = useState('bar'); // 'bar', 'line', 'area'
  const [reportFilter, setReportFilter] = useState('daily'); // 'daily', 'monthly'
  
  // Menu Form State
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [menuForm, setMenuForm] = useState({ name: '', price: '', category: 'Makanan', image: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [orderDateFilter, setOrderDateFilter] = useState('all'); // 'all', 'today', 'week', 'month', 'year', 'custom'
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  // Category State
  const [categories, setCategories] = useState([]);

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
    });

    const qCategories = query(collection(db, 'categories'), orderBy('name', 'asc'));
    const unsubscribeCategories = onSnapshot(qCategories, (snapshot) => {
      const categoriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(categoriesData);
      setLoading(false);
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'restaurant'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(prev => ({ ...prev, ...docSnap.data() }));
      }
    });

    return () => {
      unsubscribeOrders();
      unsubscribeTables();
      unsubscribeMenu();
      unsubscribeCategories();
      unsubscribeSettings();
    };
  }, []);

  const [printingOrderId, setPrintingOrderId] = useState(null);

  // Update Statistics whenever orders change
  useEffect(() => {
    if (orders.length === 0) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    let daily = 0, weekly = 0, monthly = 0, yearly = 0;
    const popularCount = {};

    orders.forEach(order => {
      const orderDate = order.createdAt?.toDate() || new Date();
      const orderTotal = order.total || 0;

      if (orderDate >= today) daily += orderTotal;
      if (orderDate >= last7Days) weekly += orderTotal;
      if (orderDate >= last30Days) monthly += orderTotal;
      if (orderDate >= lastYear) yearly += orderTotal;

      // Popular items
      if (order.items) {
        order.items.forEach(item => {
          popularCount[item.name] = (popularCount[item.name] || 0) + item.qty;
        });
      }
    });

    const popularSorted = Object.entries(popularCount)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a,b) => b.qty - a.qty);

    // Process Chart Data based on filter
    const chartMap = {};
    orders.forEach(order => {
      const date = order.createdAt?.toDate() || new Date();
      let key;
      if (reportFilter === 'daily') {
        key = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      } else {
        key = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      }
      
      if (!chartMap[key]) chartMap[key] = { name: key, omzet: 0, pengunjung: new Set() };
      chartMap[key].omzet += order.total || 0;
      chartMap[key].pengunjung.add(order.customerPhone || order.id);
    });

    const chartData = Object.values(chartMap).map(item => ({
      ...item,
      pengunjung: item.pengunjung.size
    })).slice(-10); // Last 10 points

    setReportStats({
      daily,
      weekly,
      monthly,
      yearly,
      popularItems: popularSorted,
      chartData
    });
  }, [orders, reportFilter]);

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'restaurant'), settings);
      alert("Pengaturan disimpan!");
    } catch (error) {
      console.error("Error updating settings: ", error);
      alert("Gagal menyimpan pengaturan.");
    }
  };

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
          status: 'available',
          customerName: deleteField(),
          customerPhone: deleteField(),
          occupiedAt: deleteField()
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

  const seedDummyData = async () => {
    if (!confirm('Ini akan menambahkan 10 item per kategori ke menu. Lanjutkan?')) return;
    
    // Default categories if none exist
    if (categories.length === 0) {
      const cats = ['Makanan', 'Minuman', 'Cemilan'];
      for (const catName of cats) {
        await addDoc(collection(db, 'categories'), { name: catName });
      }
    }

    const dummyItems = [
      // Makanan (10)
      { name: 'Nasi Goreng Spesial', price: 25000, category: 'Makanan', image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500' },
      { name: 'Mie Ayam Jamur', price: 18000, category: 'Makanan', image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=500' },
      { name: 'Sate Ayam Madura', price: 22000, category: 'Makanan', image: 'https://images.unsplash.com/photo-1517427294546-5aa121fb68e8?w=500' },
      { name: 'Bakso Urat Granite', price: 15000, category: 'Makanan', image: 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=500' },
      { name: 'Ayam Bakar Taliwang', price: 35000, category: 'Makanan', image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500' },
      { name: 'Rendang Daging Sapi', price: 40000, category: 'Makanan', image: 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=500' },
      { name: 'Gado-Gado Betawi', price: 15000, category: 'Makanan', image: 'https://images.unsplash.com/photo-1546039907-7fa05f864c02?w=500' },
      { name: 'Soto Betawi', price: 25000, category: 'Makanan', image: 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=500' },
      { name: 'Ikan Bakar Gurame', price: 55000, category: 'Makanan', image: 'https://images.unsplash.com/photo-1560717845-968823efbee1?w=500' },
      { name: 'Nasi Kuning Komplit', price: 20000, category: 'Makanan', image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500' },
      
      // Minuman (10)
      { name: 'Es Teh Manis', price: 5000, category: 'Minuman', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500' },
      { name: 'Es Jeruk Peras', price: 8000, category: 'Minuman', image: 'https://images.unsplash.com/photo-1543254006-25916301cc9f?w=500' },
      { name: 'Alpukat Kocok', price: 15000, category: 'Minuman', image: 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=500' },
      { name: 'Kopi Susu Gula Aren', price: 18000, category: 'Minuman', image: 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?w=500' },
      { name: 'Jus Mangga Segar', price: 12000, category: 'Minuman', image: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=500' },
      { name: 'Soda Gembira', price: 15000, category: 'Minuman', image: 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=500' },
      { name: 'Thai Tea Ice', price: 12000, category: 'Minuman', image: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=500' },
      { name: 'Matcha Latte', price: 20000, category: 'Minuman', image: 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=500' },
      { name: 'Lemon Tea Hot', price: 10000, category: 'Minuman', image: 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?w=500' },
      { name: 'Air Mineral Dingin', price: 4000, category: 'Minuman', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500' },

      // Cemilan (10)
      { name: 'Kentang Goreng', price: 12000, category: 'Cemilan', image: 'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?w=500' },
      { name: 'Pisang Bakar Coklat', price: 15000, category: 'Cemilan', image: 'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?w=500' },
      { name: 'Cireng Bumbu Rujak', price: 10000, category: 'Cemilan', image: 'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?w=500' },
      { name: 'Tahu Bakso Goreng', price: 15000, category: 'Cemilan', image: 'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?w=500' },
      { name: 'Dimsum Ayam', price: 20000, category: 'Cemilan', image: 'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?w=500' },
      { name: 'Tempe Mendoan', price: 8000, category: 'Cemilan', image: 'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?w=500' },
      { name: 'Singkong Keju', price: 12000, category: 'Cemilan', image: 'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?w=500' },
      { name: 'Otak-Otak Bakar', price: 15000, category: 'Cemilan', image: 'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?w=500' },
      { name: 'Bakwan Sayur Krispi', price: 8000, category: 'Cemilan', image: 'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?w=500' },
      { name: 'Roti Bakar Bandung', price: 20000, category: 'Cemilan', image: 'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?w=500' }
    ];

    for (const item of dummyItems) {
      await addDoc(collection(db, 'menu'), item);
    }

    // Init 6 tables as well
    for (let i = 1; i <= 6; i++) {
        const tableId = `meja-${i}`;
        await setDoc(doc(db, 'tables', tableId), { name: `Meja ${i}`, status: 'available' });
    }

    alert('Data Berhasil Ditambahkan!');
  };

  const filteredOrders = orders.filter(order => {
    const term = searchTerm.toLowerCase();
    const searchMatch = order.numericId?.includes(term) || order.tableId?.toLowerCase().includes(term);
    if (!searchMatch) return false;

    if (orderDateFilter === 'all') return true;
    
    const time = order.createdAt?.toDate() || new Date();
    const now = new Date();
    
    switch (orderDateFilter) {
      case 'today':
        return time.toDateString() === now.toDateString();
      case 'week': {
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return time >= last7Days;
      }
      case 'month':
        return time.getMonth() === now.getMonth() && time.getFullYear() === now.getFullYear();
      case 'year':
        return time.getFullYear() === now.getFullYear();
      case 'custom': {
        if (!customRange.start || !customRange.end) return true;
        const start = new Date(customRange.start);
        const end = new Date(customRange.end);
        end.setHours(23, 59, 59, 999);
        return time >= start && time <= end;
      }
      default: return true;
    }
  });

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
        <div className="flex-tabs">
          <button 
            onClick={() => setActiveTab('orders')}
            className={activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.6rem 1.2rem', whiteSpace: 'nowrap' }}
          >
            <UtensilsCrossed size={18} /> Pesanan
          </button>
          <button 
            onClick={() => setActiveTab('tables_status')}
            className={activeTab === 'tables_status' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.6rem 1.2rem', whiteSpace: 'nowrap' }}
          >
            <LayoutDashboard size={18} /> Status Meja
          </button>
          <button 
            onClick={() => setActiveTab('tables_config')}
            className={activeTab === 'tables_config' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.6rem 1.2rem', whiteSpace: 'nowrap' }}
          >
            <Settings size={18} /> Pengaturan Meja
          </button>
          <button 
            onClick={() => setActiveTab('menu')}
            className={activeTab === 'menu' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.6rem 1.2rem', whiteSpace: 'nowrap' }}
          >
            <ShoppingBag size={18} /> Daftar Menu
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={activeTab === 'reports' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.6rem 1.2rem', whiteSpace: 'nowrap' }}
          >
            <BarChart3 size={18} /> Laporan
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.6rem 1.2rem', whiteSpace: 'nowrap' }}
          >
            <Settings size={18} /> Pengaturan Toko
          </button>
        </div>
      </header>

      {activeTab === 'orders' && (
        <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="flex-tabs" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.4rem', borderRadius: '1rem' }}>
             {['all', 'today', 'week', 'month', 'year', 'custom'].map(f => (
               <button 
                key={f}
                onClick={() => setOrderDateFilter(f)}
                className={orderDateFilter === f ? 'btn-primary' : 'btn-secondary'}
                style={{ fontSize: '0.75rem', padding: '0.4rem 1rem', flex: 1, whiteSpace: 'nowrap' }}
               >
                 {f === 'all' ? 'Semua' : 
                  f === 'today' ? 'Hari Ini' : 
                  f === 'week' ? 'Minggu Ini' : 
                  f === 'month' ? 'Bulan Ini' : 
                  f === 'year' ? 'Tahun Ini' : 'Rentang'}
               </button>
             ))}
          </div>

          {orderDateFilter === 'custom' && (
            <div className="glass-card animate-fade" style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
               <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-muted)' }}>Mulai</label>
                  <input type="date" value={customRange.start} onChange={(e) => setCustomRange({...customRange, start: e.target.value})} className="input-field" style={{ padding: '0.4rem' }} />
               </div>
               <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-muted)' }}>Sampai</label>
                  <input type="date" value={customRange.end} onChange={(e) => setCustomRange({...customRange, end: e.target.value})} className="input-field" style={{ padding: '0.4rem' }} />
               </div>
            </div>
          )}

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
          {filteredOrders.length === 0 && (
            <div className="glass-card" style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center' }}>
               <UtensilsCrossed size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
               <p style={{ color: 'var(--text-muted)' }}>Tidak ada pesanan yang sesuai.</p>
            </div>
          )}
          
          {filteredOrders.map(order => (
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
                <button 
                  onClick={() => {
                    setPrintingOrderId(order.id);
                    setTimeout(() => window.print(), 100);
                  }} 
                  className="btn-secondary" 
                  style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                >
                  <Printer size={16} /> Struk
                </button>
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

                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.85rem', color: isOccupied ? '#ef4444' : '#10b981', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    {isOccupied ? 'TERISI / SEDANG MEMESAN' : 'KOSONG / SIAP'}
                  </p>
                  {isOccupied && (
                    <div style={{ fontSize: '0.8rem', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                          <User size={14} style={{ color: 'var(--text-muted)' }} />
                          <span>{table.customerName || 'Anonim'}</span>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                          <span>{table.customerPhone || '-'}</span>
                       </div>
                    </div>
                  )}
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
      ) : activeTab === 'menu' ? (
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
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                        {categories.length === 0 && (
                          <>
                            <option value="Makanan">Makanan</option>
                            <option value="Minuman">Minuman</option>
                            <option value="Cemilan">Cemilan</option>
                          </>
                        )}
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
      ) : activeTab === 'reports' ? (
        /* REPORTS TAB */
        <div className="animate-fade">
           <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Laporan Keuangan & Produk</h2>
           
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
              <div className="glass-card stat-card">
                 <span className="stat-label">Omzet Hari Ini</span>
                 <span className="stat-value">Rp {reportStats.daily.toLocaleString()}</span>
              </div>
              <div className="glass-card stat-card">
                 <span className="stat-label">Omzet Minggu Ini</span>
                 <span className="stat-value">Rp {reportStats.weekly.toLocaleString()}</span>
              </div>
              <div className="glass-card stat-card">
                 <span className="stat-label">Omzet Bulan Ini</span>
                 <span className="stat-value">Rp {reportStats.monthly.toLocaleString()}</span>
              </div>
              <div className="glass-card stat-card">
                 <span className="stat-label">Omzet Tahun Ini</span>
                 <span className="stat-value">Rp {reportStats.yearly.toLocaleString()}</span>
              </div>
           </div>

           <div className="glass-card" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                 <div>
                    <h3 style={{ marginBottom: '0.5rem' }}>Grafik Kunjungan & Omzet</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Melihat tren transaksi di restoran Anda</p>
                 </div>
                 <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <select 
                       className="input-field" 
                       style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: 'auto' }}
                       value={reportFilter}
                       onChange={(e) => setReportFilter(e.target.value)}
                    >
                       <option value="daily">Harian</option>
                       <option value="monthly">Bulanan</option>
                    </select>
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '0.6rem', padding: '0.2rem', display: 'flex', gap: '0.2rem' }}>
                       <button 
                          onClick={() => setGraphType('bar')}
                          className={graphType === 'bar' ? 'btn-primary' : ''}
                          style={{ padding: '0.3rem 0.8rem', borderRadius: '0.4rem', fontSize: '0.75rem', background: graphType === 'bar' ? '' : 'transparent' }}
                       >Batang</button>
                       <button 
                          onClick={() => setGraphType('line')}
                          className={graphType === 'line' ? 'btn-primary' : ''}
                          style={{ padding: '0.3rem 0.8rem', borderRadius: '0.4rem', fontSize: '0.75rem', background: graphType === 'line' ? '' : 'transparent' }}
                       >Garis</button>
                    </div>
                 </div>
              </div>

              <div style={{ width: '100%', height: 300 }}>
                 <ResponsiveContainer>
                    {graphType === 'bar' ? (
                       <BarChart data={reportStats.chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                          <YAxis stroke="var(--text-muted)" fontSize={12} />
                          <Tooltip 
                             contentStyle={{ background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', borderRadius: '1rem' }}
                             itemStyle={{ fontSize: '0.85rem' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '0.85rem', paddingTop: '1rem' }} />
                          <Bar name="Omzet (Rp)" dataKey="omzet" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                          <Bar name="Pengunjung" dataKey="pengunjung" fill="var(--secondary)" radius={[4, 4, 0, 0]} />
                       </BarChart>
                    ) : (
                       <LineChart data={reportStats.chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                          <YAxis stroke="var(--text-muted)" fontSize={12} />
                          <Tooltip 
                             contentStyle={{ background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', borderRadius: '1rem' }}
                             itemStyle={{ fontSize: '0.85rem' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '0.85rem', paddingTop: '1rem' }} />
                          <Line name="Omzet (Rp)" type="monotone" dataKey="omzet" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          <Line name="Pengunjung" type="monotone" dataKey="pengunjung" stroke="var(--secondary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                       </LineChart>
                    )}
                 </ResponsiveContainer>
              </div>
           </div>

           <div className="glass-card" style={{ padding: '2rem' }}>

              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                 <UtensilsCrossed size={20} /> Menu Paling Laris
              </h3>
              <div style={{ overflowX: 'auto' }}>
                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ borderBottom: '1px solid var(--glass-border)' }}>
                       <tr>
                          <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-muted)' }}>Nama Menu</th>
                          <th style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>Jumlah Terjual</th>
                       </tr>
                    </thead>
                    <tbody>
                       {reportStats.popularItems.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                             <td style={{ padding: '1rem', fontWeight: '600' }}>{item.name}</td>
                             <td style={{ padding: '1rem', textAlign: 'center' }}>{item.qty} Porsi</td>
                          </tr>
                       ))}
                       {reportStats.popularItems.length === 0 && (
                         <tr><td colSpan="2" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data penjualan.</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      ) : (
        /* SETTINGS TAB */
        <div className="animate-fade">
           <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Pengaturan Toko & Printer</h2>
           
           <form onSubmit={handleUpdateSettings} className="glass-card" style={{ padding: '2rem', maxWidth: '800px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Profil Restoran</h3>
                    <div>
                       <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Nama Restoran</label>
                       <input 
                          type="text" 
                          className="input-field" 
                          value={settings.restaurantName}
                          onChange={(e) => setSettings({...settings, restaurantName: e.target.value})}
                       />
                    </div>
                    <div>
                       <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Alamat</label>
                       <textarea 
                          className="input-field" 
                          rows="3"
                          value={settings.address}
                          onChange={(e) => setSettings({...settings, address: e.target.value})}
                       ></textarea>
                    </div>
                    <div>
                       <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>WhatsApp Admin (Gunakan format 62..., misal: 6281234567890)</label>
                       <input 
                          type="text" 
                          className="input-field" 
                          placeholder="628..."
                          value={settings.adminPhone || ''}
                          onChange={(e) => setSettings({...settings, adminPhone: e.target.value})}
                       />
                    </div>
                 </div>

                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Konfigurasi Printer Thermal</h3>
                    <div>
                       <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Ukuran Kertas (mm)</label>
                       <select 
                          className="input-field"
                          value={settings.printSize}
                          onChange={(e) => setSettings({...settings, printSize: e.target.value})}
                       >
                          <option value="57mm">57mm (Standard)</option>
                          <option value="58mm">58mm (Standard)</option>
                          <option value="80mm">80mm (Besar)</option>
                          <optgroup label="Spesifik (W x L)">
                            <option value="57x30">57x30</option>
                            <option value="57x37">57x37</option>
                            <option value="57x38">57x38</option>
                            <option value="57x40">57x40</option>
                            <option value="58x40">58x40</option>
                            <option value="58x50">58x50</option>
                            <option value="80x60">80x60</option>
                            <option value="80x80">80x80</option>
                            <option value="80x180">80x180</option>
                          </optgroup>
                       </select>
                    </div>
                    <div>
                       <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Orientasi Cetak</label>
                       <div style={{ display: 'flex', gap: '1rem' }}>
                          <button 
                             type="button"
                             onClick={() => setSettings({...settings, printOrientation: 'portrait'})}
                             className={settings.printOrientation === 'portrait' ? 'btn-primary' : 'btn-secondary'}
                             style={{ flex: 1, padding: '0.5rem' }}
                          >Portrait</button>
                          <button 
                             type="button"
                             onClick={() => setSettings({...settings, printOrientation: 'landscape'})}
                             className={settings.printOrientation === 'landscape' ? 'btn-primary' : 'btn-secondary'}
                             style={{ flex: 1, padding: '0.5rem' }}
                          >Landscape</button>
                       </div>
                    </div>
                 </div>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '2.5rem', width: '100%', maxWidth: '300px' }}>
                 <Save size={18} /> Simpan Semua Pengaturan
              </button>
           </form>

           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '3rem' }}>
              {/* CATEGORY MANAGEMENT */}
              <div className="glass-card" style={{ padding: '2rem' }}>
                 <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Kelola Kategori</h3>
                 <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <input 
                     type="text" 
                     placeholder="Nama Kategori Baru"
                     className="input-field"
                     id="new-category-input"
                    />
                    <button 
                     onClick={async () => {
                       const input = document.getElementById('new-category-input');
                       if (input && input.value) {
                         await addDoc(collection(db, 'categories'), { name: input.value });
                         input.value = '';
                       }
                     }}
                     className="btn-primary" 
                     style={{ padding: '0.5rem 1rem' }}
                    >
                       <Plus size={18} />
                    </button>
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {categories.map(cat => (
                      <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.8rem' }}>
                         <span>{cat.name}</span>
                         <button 
                           onClick={async () => {
                             if (confirm(`Hapus kategori ${cat.name}?`)) {
                               await deleteDoc(doc(db, 'categories', cat.id));
                             }
                           }}
                           style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                         >
                            <Trash2 size={16} />
                         </button>
                      </div>
                    ))}
                 </div>
              </div>

              {/* SEED DATA */}
              <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                 <TrendingUp size={48} style={{ color: 'var(--primary)', marginBottom: '1.5rem', opacity: 0.5 }} />
                 <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Inisialisasi Data Cepat</h3>
                 <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
                   Gunakan fitur ini untuk mengisi menu dan meja dengan data contoh (Dummy Data) berkualitas tinggi secara instan.
                 </p>
                 <button onClick={seedDummyData} className="btn-secondary" style={{ width: '100%', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                   <Plus size={18} /> Isi Data Contoh Sekarang
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Hidden Print Section */}
      <div id="print-section">
          {orders.filter(o => o.id === printingOrderId).map(order => (
             <div key={order.id} className={`print-order-content receipt-${settings.printSize.split('x')[0]}mm ${settings.printOrientation === 'landscape' ? 'receipt-landscape' : ''}`}>
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                   {settings.logoUrl && <img src={settings.logoUrl} alt="Logo" style={{ width: '40px', marginBottom: '5px' }} />}
                   <h2 style={{ margin: 0, fontSize: '16px' }}>{settings.restaurantName}</h2>
                   <p style={{ margin: 0, fontSize: '10px' }}>{settings.address}</p>
                </div>
                <div style={{ borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc', padding: '10px 0', marginBottom: '10px' }}>
                   <p style={{ margin: 0 }}>No: {order.numericId}</p>
                   <p style={{ margin: 0 }}>Meja: {tables.find(t => t.id === order.tableId)?.name || order.tableId}</p>
                   <p style={{ margin: 0 }}>Tgl: {order.createdAt?.toDate().toLocaleString()}</p>
                </div>
                <div style={{ marginBottom: '10px' }}>
                   {order.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                         <span>{item.name} x{item.qty}</span>
                         <span>{(item.price * item.qty).toLocaleString()}</span>
                      </div>
                   ))}
                </div>
                <div style={{ borderTop: '1px solid #000', paddingTop: '5px', textAlign: 'right', fontWeight: 'bold' }}>
                   TOTAL: Rp {order.total.toLocaleString()}
                </div>
                <div style={{ marginTop: '20px', textAlign: 'center', fontStyle: 'italic', fontSize: '10px' }}>
                   Terima Kasih Atas Kunjungan Anda
                </div>
             </div>
          ))}
      </div>
    </div>
  );
}
