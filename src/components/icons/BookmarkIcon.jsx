/**
 * Icône marque-page (sauvegarde)
 */
export default function BookmarkIcon({ size = 24, color = 'currentColor', filled = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

