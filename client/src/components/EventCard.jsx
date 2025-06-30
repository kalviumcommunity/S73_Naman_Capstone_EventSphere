export default function EventCard({ event }) {
  return (
    <div style={{ border: "1px solid #ddd", padding: "1rem", marginBottom: "1rem" }}>
      <h3>{event.name}</h3>
      <p>{event.date}</p>
      <p>{event.location}</p>
    </div>
  );
}
