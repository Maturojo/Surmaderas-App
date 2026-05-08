import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Conversations from './pages/Conversations';
import FAQs from './pages/FAQs';
import Stats from './pages/Stats';
import Settings from './pages/Settings';

const navStyle = ({ isActive }) => ({
  padding: '10px 20px',
  background: isActive ? '#25D366' : 'transparent',
  color: isActive ? '#fff' : '#333',
  textDecoration: 'none',
  borderRadius: 6,
  fontWeight: 600,
});

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f5f5f5' }}>
        {/* Header */}
        <header style={{ background: '#fff', padding: '12px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 32 }}>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#25D366' }}>🪵 Sur Maderas · WhatsApp Panel</span>
          <nav style={{ display: 'flex', gap: 8 }}>
            <NavLink to="/" end style={navStyle}>Conversaciones</NavLink>
            <NavLink to="/faqs" style={navStyle}>FAQs</NavLink>
            <NavLink to="/stats" style={navStyle}>Estadísticas</NavLink>
            <NavLink to="/settings" style={navStyle}>⚙️ Configuración</NavLink>
          </nav>
        </header>

        {/* Content */}
        <main style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
          <Routes>
            <Route path="/" element={<Conversations />} />
            <Route path="/faqs" element={<FAQs />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
