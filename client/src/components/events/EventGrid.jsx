import EventCard from "./EventCard";
import { Skeleton } from "../ui";

export function EventCardSkeleton() {
  return (
    <div className="card-skeleton">
      <Skeleton className="card-skeleton__media" height="auto" style={{ aspectRatio: "16 / 9" }} radius="0" />
      <div className="card-skeleton__body">
        <Skeleton width="35%" height="18px" radius="6px" />
        <Skeleton width="88%" height="20px" radius="6px" />
        <Skeleton width="60%" height="14px" radius="6px" />
        <Skeleton width="100%" height="30px" radius="6px" />
      </div>
    </div>
  );
}

export function EventGridSkeleton({ count = 8, compact }) {
  return (
    <div className={`event-grid${compact ? " event-grid--compact" : ""}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function EventGrid({ events, compact, onToggleBookmark, renderExtra }) {
  return (
    <div className={`event-grid${compact ? " event-grid--compact" : ""}`}>
      {events.map((event, index) => (
        <EventCard
          key={event._id}
          event={event}
          index={index}
          onToggleBookmark={onToggleBookmark}
          showOwnerBar={Boolean(renderExtra)}
        >
          {renderExtra ? renderExtra(event) : null}
        </EventCard>
      ))}
    </div>
  );
}
