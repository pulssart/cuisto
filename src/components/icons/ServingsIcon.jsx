/**
 * Icône couverts (personnes/portions)
 */
export default function ServingsIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Fourchette */}
      <path
        d="M6 3v6c0 1.1.9 2 2 2h.5v10h1V11H10c1.1 0 2-.9 2-2V3h-1v5c0 .55-.45 1-1 1s-1-.45-1-1V3H8v5c0 .55-.45 1-1 1s-1-.45-1-1V3H6z"
        fill={color}
      />
      {/* Couteau */}
      <path
        d="M18 3c-1.1 0-2 .9-2 2v7h1v9h2v-9h1V5c0-1.1-.9-2-2-2zm0 7V5c.55 0 1 .45 1 1v4h-1z"
        fill={color}
      />
    </svg>
  );
}

