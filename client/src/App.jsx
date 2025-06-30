import Navbar from "./components/Navbar";
import EventList from "./components/EventList";

const mockEvents = [
  { _id: "1", name: "Event 1", date: "2025-07-01", location: "Mumbai" },
  { _id: "2", name: "Event 2", date: "2025-07-05", location: "Delhi" },
];

function App() {
  return (
    <div>
      <Navbar />
      <h1>Upcoming Events</h1>
      <EventList events={mockEvents} />
    </div>
  );
}

export default App;
