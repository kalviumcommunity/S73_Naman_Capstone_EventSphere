export default function EventDetails({ event }) {
  if (!event) {
    return <p>No event data available.</p>;
  }

  return (
    <div>
      <h2>{event.name}</h2>
      <p>{event.date}</p>
      <p>{event.location}</p>
      <p>{event.description}</p>
    </div>
  );
}
