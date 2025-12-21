/**
 * Icône casserole (temps de cuisson)
 */
export default function CookTimeIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Casserole */}
      <path
        d="M4 11h16v6c0 2.21-1.79 4-4 4H8c-2.21 0-4-1.79-4-4v-6z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Manche */}
      <path
        d="M20 13h2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Vapeur */}
      <path
        d="M8 7c0-1 .5-2 1.5-2S11 6 11 7"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M13 5c0-1 .5-2 1.5-2S16 4 16 5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

