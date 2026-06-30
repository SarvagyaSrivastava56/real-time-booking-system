import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create event form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [totalSeats, setTotalSeats] = useState(100);
  const [formLoading, setFormLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const statsData = await api.get('/admin/stats');
      setStats(statsData);
      const eventsData = await api.get('/events');
      setEvents(eventsData);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch admin stats. Ensure you are logged in as an Admin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setError('');
    setFormLoading(true);
    try {
      const newEvent = {
        title,
        description,
        venue,
        date,
        totalSeats: parseInt(totalSeats, 10),
      };
      await api.post('/events', newEvent);
      
      // Reset form fields
      setTitle('');
      setDescription('');
      setVenue('');
      setDate('');
      setTotalSeats(100);

      // Refresh stats & list
      await fetchDashboardData();
    } catch (err) {
      setError(err.message || 'Failed to create event');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event? All seats and bookings for this event will be deleted.')) {
      return;
    }
    setError('');
    try {
      await api.delete(`/events/${id}`);
      await fetchDashboardData();
    } catch (err) {
      setError(err.message || 'Failed to delete event');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '8rem', color: 'hsl(var(--text-muted))' }}>Loading system metrics...</div>;
  }

  return (
    <div className="app-container animated-fade">
      <h2 style={{ fontSize: '2rem', marginBottom: '2rem', borderBottom: '1px solid hsl(var(--border-subtle))', paddingBottom: '0.8rem' }}>
        Admin Dashboard
      </h2>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Analytics Cards */}
      {stats && (
        <div className="stats-container">
          <div className="stat-card">
            <div className="label">Total Events</div>
            <div className="value">{stats.events}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Bookings</div>
            <div className="value">{stats.bookings}</div>
          </div>
          <div className="stat-card">
            <div className="label">Registered Users</div>
            <div className="value">{stats.users}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Revenue</div>
            <div className="value" style={{ color: 'hsl(var(--status-available))' }}>
              ${stats.revenue.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Side by Side layout for Event Creation and Event Listing */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }} className="admin-layout-responsive">
        
        {/* Event Creation Form */}
        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))', paddingBottom: '0.5rem' }}>
            Schedule New Event
          </h3>
          <form onSubmit={handleCreateEvent}>
            <div className="form-group">
              <label className="form-label">Event Title</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Annual Tech Fest"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Venue</label>
              <input
                type="text"
                className="form-input"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Main Auditorium"
                required
              />
            </div>
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="form-label">Total Seats</label>
                <input
                  type="number"
                  className="form-input"
                  value={totalSeats}
                  onChange={(e) => setTotalSeats(e.target.value)}
                  min="10"
                  max="500"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief details about the event..."
                style={{ height: '100px', resize: 'vertical' }}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={formLoading}>
              {formLoading ? 'Creating Event...' : 'Create Event'}
            </button>
          </form>
        </div>

        {/* Event List Management Table */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))', paddingBottom: '0.5rem' }}>
            Manage Events
          </h3>
          {events.length === 0 ? (
            <p style={{ color: 'hsl(var(--text-muted))', textAlign: 'center', padding: '2rem' }}>No events scheduled.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Date & Venue</th>
                    <th>Capacity</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td style={{ fontWeight: '600' }}>{event.title}</td>
                      <td>
                        <span style={{ display: 'block', fontSize: '0.9rem' }}>📅 {event.date}</span>
                        <span style={{ display: 'block', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>📍 {event.venue}</span>
                      </td>
                      <td>
                        <span className="badge badge-info">
                          🎟️ {event.availableSeats} / {event.totalSeats}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (min-width: 950px) {
          .admin-layout-responsive {
            grid-template-columns: 1fr 1.6fr !important;
          }
        }
      `}</style>
    </div>
  );
}
