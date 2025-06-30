export default function BookmarkButton({ isBookmarked, onToggle }) {
  return (
    <button onClick={onToggle}>
      {isBookmarked ? "Remove Bookmark" : "Bookmark"}
    </button>
  );
}
