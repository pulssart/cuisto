/**
 * Icône toque de chef
 */
export default function ChefHatIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 13.5V19h12v-5.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 8.5a4.5 4.5 0 10-4 4.472V13H11v-.028A4.5 4.5 0 107 8.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 8.5c0 2.485 2.015 4.5 4.5 4.5h1c2.485 0 4.5-2.015 4.5-4.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

