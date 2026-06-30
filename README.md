# TicketPulse — Real-Time Event Ticket Booking System

TicketPulse is a high-concurrency, real-time event ticket booking platform built with Spring Boot, React, MongoDB, and Redis. It solves critical challenges in distributed state synchronization and double-booking prevention under peak concurrent loads (e.g., ticket drops).

---

## 🚀 Key Architectural Features

### 1. Concurrency Control via Redis Distributed Leases
*   **Preventing Double Bookings**: Leverages Redis-backed optimistic locks (`SETNX`) to ensure that two users cannot hold or book the exact same seat at the same instant.
*   **5-Minute TTL Leases**: When a user selects a seat, it is temporarily locked in Redis for 5 minutes. If checkout isn't completed before the lease expires, the seat automatically becomes `AVAILABLE` again.
*   **Immediate Hold Releases**: Deselecting a seat immediately calls the `/seats/release` endpoint to clear the Redis key and broadcast the state change in real-time.

### 2. Live WebSocket Push Notifications
*   **No Polling**: Short-polling is completely eliminated. Active clients establish a persistent, bi-directional WebSocket connection mapped directly to event channels:
    `ws://localhost:8080/ws/events/{eventId}`
*   **Sub-Second Synchronization**: Whenever a seat state changes (held, released, or booked), the change is instantly broadcast to all clients viewing that event.

### 3. Horizontal Scaling with Redis Pub/Sub
*   **Clustered Synchronization**: To support horizontal scalability behind a load balancer, instances do not rely on local shared memory. 
*   **Pub/Sub Bridge**: When a seat update occurs on any server node, it is published to a shared Redis channel (`channel:seat-updates`). All server instances subscribed to the channel receive the message and broadcast it locally to their connected WebSocket sessions.

### 4. API Security & Rate Limiting
*   **JWT Authentication**: Stateless, role-based JWT authentication with distinct `ADMIN` and `USER` access privileges.
*   **Redis-Backed Rate Limiting**: A custom filter throttles clients to a maximum of 100 requests per minute to prevent scraping bots and brute-force reservation abuse.

---

## 🛠️ Tech Stack

*   **Backend**: Spring Boot 3.3.4 (Java 21), Spring Security, Redis, MongoDB, Spring WebSockets
*   **Frontend**: React 18, Vite, HSL-variable Midnight Navy/Indigo Theme
*   **Database**: 
    *   *MongoDB*: For persistent entities (`Events`, `Users`, and final `Bookings`).
    *   *Redis*: For high-speed, transient lock states (`Seat Holds` and `Rate Limit` counters).

---

## 📁 Project Structure

```
├── backend/                  # Spring Boot backend maven project
│   ├── src/main/java/        # Java source code
│   │   └── com/event/booking/
│   │       ├── config/       # Redis, WebSocket, Security configurations
│   │       ├── controller/   # REST Controllers (Auth, Event, Booking, Seat)
│   │       ├── model/        # MongoDB models (User, Event, Booking, Seat)
│   │       ├── security/     # JWT Provider, Auth Filters, Rate Limiting
│   │       └── websocket/    # WebSocket handlers and RedisSubscriber
│   └── pom.xml               # Backend dependencies (Spring Starter, Redis, WebSockets)
│
└── frontend/                 # Vite + React frontend project
    ├── src/
    │   ├── pages/            # Home, Login, Register, Admin, EventDetails, MyBookings
    │   ├── services/         # API connection layer (Axios wrapper with JWT headers)
    │   └── index.css         # Styling system (Midnight Navy solid slate reskin)
    └── package.json          # Frontend dependencies
```

---

## 🚦 Getting Started

### Prerequisites
*   Java 21 (JDK 21)
*   Node.js (v18+)
*   MongoDB (running on port `27017`)
*   Redis (running on port `6379`)

### 1. Run the Backend (WSL / Linux / Windows)
Navigate to the `backend/` directory:
```bash
# Build and run the Spring Boot project
./mvnw clean compile spring-boot:run
```
The server will start on port `8080`.

### 2. Run the Frontend
Navigate to the `frontend/` directory:
```bash
# Install dependencies
npm install

# Run the local development server
npm run dev
```
The application will be accessible at `http://localhost:5173`.

---

## 📡 Core API Endpoints

### Authentication
*   `POST /auth/register` - Create a new user account.
*   `POST /auth/login` - Authenticate user and receive JWT.

### Seats
*   `GET /seats/event/{eventId}` - Fetch seat layout and real-time state for an event.
*   `POST /seats/hold` - Acquire a temporary 5-minute lease lock on a seat.
*   `POST /seats/release` - Release a temporary hold early.

### Bookings
*   `POST /bookings/confirm` - Finalize reservation and write permanent booking record.
*   `GET /bookings/my` - Fetch booking history for the logged-in user.
