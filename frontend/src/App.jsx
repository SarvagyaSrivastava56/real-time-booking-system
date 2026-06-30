import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import EventDetails from './pages/EventDetails';
import MyBookings from './pages/MyBookings';
import AdminDashboard from './pages/AdminDashboard';

function Navigation({ user, handleLogout }) {
  const location = useLocation();
  
  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">🎫 TicketPulse</Link>
      <ul className="nav-links">
        <li>
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Events</Link>
        </li>
        
        {user ? (
          <>
            {user.role === 'ADMIN' && (
              <li>
                <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>Admin Dashboard</Link>
              </li>
            )}
            <li>
              <Link to="/bookings/my" className={`nav-link ${location.pathname === '/bookings/my' ? 'active' : ''}`}>My Bookings</Link>
            </li>
            <li style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem', marginLeft: '1rem' }}>
              Hi, {user.name} ({user.role})
            </li>
            <li>
              <button 
                onClick={handleLogout} 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
              >
                Sign Out
              </button>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link to="/login" className={`nav-link ${location.pathname === '/login' ? 'active' : ''}`}>Sign In</Link>
            </li>
            <li>
              <Link to="/register" className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem' }}>Register</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  const loadUser = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    loadUser();
    // Listen to custom 'auth-change' events to update state instantly across pages
    window.addEventListener('auth-change', loadUser);
    return () => window.removeEventListener('auth-change', loadUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
    window.location.href = '/login';
  };

  return (
    <BrowserRouter>
      <Navigation user={user} handleLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="/events/:id" element={<EventDetails />} />
        
        {/* Protected Routes */}
        <Route 
          path="/bookings/my" 
          element={user ? <MyBookings /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/admin" 
          element={user && user.role === 'ADMIN' ? <AdminDashboard /> : <Navigate to="/" />} 
        />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
