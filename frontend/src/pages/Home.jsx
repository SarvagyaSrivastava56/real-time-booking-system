import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await api.get('/events');
        setEvents(data);
      } catch (err) {
        setError('Could not load events. Make sure the backend service is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div className="app-container animated-fade">
      <div style={{ textAlign: 'center', margin: '3rem 0 4rem 0' }}>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem', background: 'linear-gradient(135deg, #fff, hsl(var(--text-secondary)))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Live Event Ticketing
        </h1>
        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
          Reserve seats instantly, locked in real-time. Experience lightning fast booking backed by Redis.
        </p>
      </div>

      <h2 style={{ fontSize: '1.8rem', borderBottom: '1px solid hsl(var(--border-subtle))', paddingBottom: '0.8rem', marginBottom: '1.5rem' }}>
        Upcoming Events
      </h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'hsl(var(--text-muted))' }}>Loading events...</div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'hsl(var(--text-muted))' }}>No upcoming events scheduled yet. Check back soon!</div>
      ) : (
        <div className="events-grid">
          {events.map((event) => (
            <div key={event.id} className="glass-panel event-card">
              <h3>{event.title}</h3>
              <div className="meta">
                <span>📍 {event.venue}</span>
                <span>📅 {event.date}</span>
              </div>
              <p className="desc">{event.description}</p>
              <div className="footer">
                <span className="badge badge-info">
                  🎟️ {event.availableSeats} / {event.totalSeats} seats left
                </span>
                <Link to={`/events/${event.id}`} className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}>
                  Book Tickets
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
