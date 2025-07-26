// src/components/App.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/events')
      .then(response => setEvents(response.data))
      .catch(error => console.error(error));
  }, []);

  return (
    <div className="App">
      <header className="header">EventSphere</header>
      <h2>Upcoming Events</h2>
      <div className="event-list">
        {events.map(event => (
          <div className="event-card" key={event._id}>
            <h3>{event.name}</h3>
            <p>{event.date}</p>
            <p>{event.location}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
