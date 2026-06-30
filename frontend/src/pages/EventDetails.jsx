import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  });

  // local holds state: map of seatNumber -> remaining seconds (e.g. { "A12": 300 })
  const [myHolds, setMyHolds] = useState({});
  const myHoldsRef = useRef(myHolds);

  useEffect(() => {
    myHoldsRef.current = myHolds;
  }, [myHolds]);

  // Fetch event details and seat statuses
  const fetchSeats = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const seatsData = await api.get(`/seats/event/${id}`);
      setSeats(seatsData);

      // Sync active holds on page load/refreshes
      if (currentUser) {
        const activeUserHolds = {};
        
        seatsData.forEach(seat => {
          if (seat.status === 'HELD' && seat.heldBy === currentUser.id && seat.holdTimeRemaining > 0) {
            activeUserHolds[seat.seatNumber] = seat.holdTimeRemaining;
          }
        });

        // Sync local holds with the server's truth (resolves cross-tab session issues and clears expired/released holds)
        setMyHolds(activeUserHolds);
      }
    } catch (err) {
      console.error('Failed to load seats', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const eventData = await api.get(`/events/${id}`);
        setEvent(eventData);
        await fetchSeats(true);
      } catch (err) {
        setError('Failed to load event details.');
        setLoading(false);
      }
    };

    fetchEventData();

    // Establish WebSocket connection for real-time seat updates
    let ws = null;
    let reconnectTimeout = null;

    const connectWebSocket = () => {
      const wsUrl = `ws://localhost:8080/ws/events/${id}`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connection established for event:', id);
      };

      ws.onmessage = (messageEvent) => {
        try {
          const data = JSON.parse(messageEvent.data);
          if (data.type === 'SEAT_UPDATE') {
            console.log('Real-time seat update received via WebSocket');
            fetchSeats(false);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onclose = (closeEvent) => {
        console.log('WebSocket closed. Reconnecting in 3 seconds...', closeEvent.reason);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error encountered:', err);
        ws.close();
      };
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [id]);

  // Local Countdown Timer logic for held seats
  useEffect(() => {
    const timer = setInterval(() => {
      const activeHolds = { ...myHoldsRef.current };
      let changed = false;

      Object.keys(activeHolds).forEach((seatNumber) => {
        if (activeHolds[seatNumber] > 0) {
          activeHolds[seatNumber] -= 1;
          changed = true;
          
          if (activeHolds[seatNumber] === 0) {
            delete activeHolds[seatNumber];
          }
        }
      });

      if (changed) {
        setMyHolds(activeHolds);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle holding a seat
  const handleSeatClick = async (seat) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const seatNum = seat.seatNumber;
    setError('');

    // If already held by current user, release it on the backend
    if (myHolds[seatNum]) {
      try {
        await api.post('/seats/release', { eventId: id, seatId: seatNum });
        setMyHolds(prev => {
          const next = { ...prev };
          delete next[seatNum];
          return next;
        });
      } catch (err) {
        setError(err.message || 'Failed to release seat hold.');
      }
      return;
    }

    if (seat.status === 'BOOKED' || (seat.status === 'HELD' && seat.heldBy !== currentUser.id)) {
      return; // Seat not clickable
    }

    try {
      // Trigger API to acquire lock and hold seat for 5 mins
      await api.post('/seats/hold', { eventId: id, seatId: seatNum });
      
      // Successfully held seat: add to local timer state
      setMyHolds(prev => ({
        ...prev,
        [seatNum]: 300 // 5 minutes in seconds
      }));

      // Trigger a silent refetch to update seat visual layout
      fetchSeats(false);
    } catch (err) {
      setError(err.message || 'Seat could not be reserved. Another user might be booking it.');
      fetchSeats(false);
    }
  };

  // Confirm Booking / Checkout
  const handleCheckout = async () => {
    const seatNumbers = Object.keys(myHolds);
    if (seatNumbers.length === 0) return;

    setError('');
    setSubmitting(true);
    try {
      await api.post('/bookings/confirm', { eventId: id, seatNumbers });
      setMyHolds({});
      setSuccess(true);
      // Evict cache and reload
      fetchSeats(false);
    } catch (err) {
      setError(err.message || 'Booking confirmation failed. Your hold may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '8rem', color: 'hsl(var(--text-muted))' }}>Loading event details...</div>;
  }

  if (!event) {
    return (
      <div className="app-container">
        <div className="alert alert-danger">Event not found.</div>
      </div>
    );
  }

  const heldSeatNumbers = Object.keys(myHolds);
  const minTimeRemaining = heldSeatNumbers.length > 0 ? Math.min(...heldSeatNumbers.map(n => myHolds[n])) : 0;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="app-container animated-fade">
      {success ? (
        <div className="glass-panel" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'hsl(var(--status-available))' }}>Booking Confirmed!</h2>
          <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '2rem' }}>
            Your seats have been booked successfully. Thank you for using our service!
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => navigate('/bookings/my')}>View My Bookings</button>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>Home</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }} className="details-layout-responsive">
          {/* Main Booking Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Event Info Card */}
            <div className="glass-panel">
              <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{event.title}</h2>
              <div className="meta" style={{ display: 'flex', gap: '1.5rem', color: 'hsl(var(--text-muted))', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                <span>📍 {event.venue}</span>
                <span>📅 {event.date}</span>
                <span className="badge badge-info">🎟️ {event.availableSeats} Seats Available</span>
              </div>
              <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '1.1rem' }}>{event.description}</p>
            </div>

            {/* Seat Map Selector Card */}
            <div className="glass-panel">
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>Select Your Seats</h3>
              
              {error && <div className="alert alert-danger">{error}</div>}
              
              <div className="seat-grid-container">
                <div className="screen-indicator">Auditorium Stage / Screen</div>
                
                <div className="seats-layout">
                  {seats.map((seat) => {
                    const isHeldByMe = !!myHolds[seat.seatNumber];
                    let seatClass = 'seat-available';
                    
                    if (seat.status === 'BOOKED') {
                      seatClass = 'seat-booked';
                    } else if (isHeldByMe) {
                      seatClass = 'seat-held-user';
                    } else if (seat.status === 'HELD') {
                      seatClass = 'seat-held-other';
                    }

                    return (
                      <button
                        key={seat.id}
                        className={`seat ${seatClass}`}
                        onClick={() => handleSeatClick(seat)}
                        disabled={seat.status === 'BOOKED' || (seat.status === 'HELD' && !isHeldByMe)}
                        title={`Seat ${seat.seatNumber}`}
                      >
                        {seat.seatNumber}
                      </button>
                    );
                  })}
                </div>

                <div className="legend">
                  <div className="legend-item">
                    <div className="legend-box seat-available" style={{ width: '16px', height: '16px' }}></div>
                    <span>Available ($50)</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-box seat-held-user" style={{ width: '16px', height: '16px' }}></div>
                    <span>Selected (Leased)</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-box seat-held-other" style={{ width: '16px', height: '16px' }}></div>
                    <span>Held (Other)</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-box seat-booked" style={{ width: '16px', height: '16px' }}></div>
                    <span>Booked</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Checkout Panel Column */}
          {heldSeatNumbers.length > 0 && (
            <div className="glass-panel animated-fade" style={{ maxHeight: 'fit-content' }}>
              <div className="checkout-panel">
                <div>
                  <h3 style={{ fontSize: '1.6rem', marginBottom: '1rem', borderBottom: '1px solid hsl(var(--border-subtle))', paddingBottom: '0.5rem' }}>
                    Checkout Order
                  </h3>

                  <div className="timer">
                    ⏱️ Lease Timer: {formatTime(minTimeRemaining)}
                  </div>

                  <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))', marginBottom: '1.5rem' }}>
                    These seats are locked in Redis for 5 minutes. Complete your checkout before the timer expires.
                  </p>

                  <div style={{ marginBottom: '2rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.5rem' }}>Selected Seats</span>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {heldSeatNumbers.map(seatNum => (
                        <span key={seatNum} className="badge badge-info" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                          Seat {seatNum}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid hsl(var(--border-subtle))', paddingTop: '1.5rem' }}>
                  <div className="checkout-row" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                    <span>Ticket Subtotal</span>
                    <span>${heldSeatNumbers.length * 50}.00</span>
                  </div>
                  <div className="checkout-row" style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))', marginBottom: '1.5rem' }}>
                    <span>Processing Fees</span>
                    <span>$0.00</span>
                  </div>
                  <div className="checkout-row" style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '2rem' }}>
                    <span>Total Due</span>
                    <span style={{ color: 'hsl(var(--accent-neon))' }}>${heldSeatNumbers.length * 50}.00</span>
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
                    onClick={handleCheckout}
                    disabled={submitting}
                  >
                    {submitting ? 'Confirming Ticket...' : 'Confirm & Book Now'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Embedded CSS grid rule for side-by-side details layout */}
      <style>{`
        @media (min-width: 900px) {
          .details-layout-responsive {
            grid-template-columns: ${heldSeatNumbers.length > 0 ? '1.8fr 1fr' : '1fr'} !important;
          }
        }
      `}</style>
    </div>
  );
}
