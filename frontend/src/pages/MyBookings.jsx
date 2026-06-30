import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const data = await api.get('/bookings/my');
        data.sort((a, b) => new Date(b.bookingTime) - new Date(a.bookingTime));
        setBookings(data);
      } catch (err) {
        setError(err.message || 'Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  return (
    <div className="app-container animated-fade" style={{ maxWidth: '800px' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '2rem', borderBottom: '1px solid hsl(var(--border-subtle))', paddingBottom: '0.8rem' }}>
        My Bookings
      </h2>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'hsl(var(--text-muted))' }}>Loading booking history...</div>
      ) : bookings.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
            You haven't booked any tickets yet.
          </p>
          <a href="/" className="btn btn-primary">Browse Events</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {bookings.map((booking) => (
            <div key={booking.bookingId} className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid hsl(var(--border-subtle))', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{booking.eventTitle}</h3>
                  <div style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))', display: 'flex', gap: '1rem' }}>
                    <span>📍 {booking.venue}</span>
                    <span>📅 {booking.date}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', display: 'block' }}>Booking ID</span>
                  <span style={{ fontSize: '0.9rem', fontFamily: 'monospace', color: 'hsl(var(--text-secondary))' }}>
                    {booking.bookingId.substring(0, 8)}...
                  </span>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.25rem' }}>
                    Booked Seats ({booking.seatNumbers.length})
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {booking.seatNumbers.map((seatNum) => (
                      <span key={seatNum} className="badge badge-info" style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
                        💺 {seatNum}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', display: 'block' }}>Amount Paid</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: '700', color: 'hsl(var(--accent-neon))' }}>
                    ${(booking.seatNumbers.length * 50).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
