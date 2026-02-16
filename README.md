# ✦ EventSphere — Local Event Discovery Platform

> Discover, explore, and bookmark local events based on your interests and location.

🔗 **Live Demo:** [https://s73-naman-capstone-eventsphere.onrender.com](https://s73-naman-capstone-eventsphere.onrender.com)

---

## 🎯 Problem Statement

Many individuals miss out on local events due to a lack of awareness. EventSphere is a web-based platform that enables users to discover, explore, and bookmark local events — all in one place.

## ⚡ Key Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | Secure sign-up, login & logout with JWT |
| 📋 **Event Listing** | Browse events with category & location filters |
| 🔍 **Search & Filter** | Search by keyword, category, date, or location |
| 📌 **Bookmarking** | Save events for future reference |
| 📄 **Event Details** | View comprehensive info about each event |
| ➕ **Create Events** | Authenticated users can create & manage events |
| 🗑 **Delete Events** | Creator-only event deletion |

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 · Vite 7 · React Router |
| **Backend** | Node.js · Express.js |
| **Database** | MongoDB Atlas (Mongoose ODM) |
| **Auth** | JWT (JSON Web Tokens) |
| **Styling** | Vanilla CSS (Dark glassmorphic theme) |
| **Deployment** | Render (unified full-stack) |

## 📸 Screenshots

The app features a modern dark UI with:
- Glassmorphic cards with gradient accent borders
- Animated staggered event grid
- Color-coded category badges
- Responsive mobile design with hamburger menu

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas URI (or local MongoDB)

### Installation

```bash
# Clone the repository
git clone https://github.com/kalviumcommunity/S73_Naman_Capstone_EventSphere.git
cd S73_Naman_Capstone_EventSphere

# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..
```

### Environment Variables

Create `backend/.env`:
```env
PORT=1369
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

Create `client/.env` (for local dev only):
```env
VITE_API_URL=http://localhost:1369
```

### Run Locally

```bash
# Terminal 1 — Backend
cd backend && node server.js

# Terminal 2 — Frontend
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Seed Sample Data

```bash
cd backend && node seed.js
```
This creates 12 sample events and a demo account:
- **Email:** `demo@eventsphere.com`
- **Password:** `demo123456`

## 📁 Project Structure

```
├── backend/
│   ├── config/          # Database connection
│   ├── middleware/       # JWT auth middleware
│   ├── models/          # Mongoose schemas (User, Event)
│   ├── routes/          # API routes (auth, events, users, upload)
│   ├── seed.js          # Database seeder
│   └── server.js        # Express server + SPA serving
├── client/
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── context/     # Auth context provider
│   │   ├── pages/       # Route page components
│   │   ├── App.jsx      # Router setup
│   │   └── index.css    # Design system
│   └── index.html
├── package.json         # Root config with unified build/start
└── README.md
```

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login & receive JWT |

### Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | List all events (supports `?keyword`, `?category`, `?date`, `?location`) |
| GET | `/api/events/:id` | Get event details |
| POST | `/api/events` | Create event 🔒 |
| PUT | `/api/events/:id` | Update event 🔒 |
| DELETE | `/api/events/:id` | Delete event 🔒 |

### Bookmarks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:userId/bookmarks` | Get bookmarks 🔒 |
| POST | `/api/users/:userId/bookmark/:eventId` | Bookmark event 🔒 |
| DELETE | `/api/users/:userId/bookmark/:eventId` | Remove bookmark 🔒 |

> 🔒 = Requires `Authorization: Bearer <token>` header

## 🗺 Development Roadmap

- [x] **Phase 1:** Requirement analysis & project setup
- [x] **Phase 2:** System design — wireframes & database schema
- [x] **Phase 3:** Backend — Express server, JWT auth, CRUD, search/filter
- [x] **Phase 4:** Frontend — React UI, routing, auth context, all pages
- [x] **Phase 5:** Testing & bug fixes
- [x] **Phase 6:** Deployment on Render

## 👤 Author

**Naman** — [GitHub](https://github.com/kalviumcommunity/S73_Naman_Capstone_EventSphere)

---

<p align="center">Built with ❤️ for Kalvium Capstone</p>