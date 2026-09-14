export default function KotoLogo({ height = 28 }: { height?: number }) {
  const scale = height / 44;
  const width = Math.round(160 * scale);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 44"
      fill="none"
      width={width}
      height={height}
      aria-label="Koto"
    >
      <rect x="2" y="4" width="36" height="36" rx="8" fill="#1E293B"/>
      <path
        d="M12 16h16M20 16v14M15 22h10M14 27h12"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="28" cy="12" r="3.5" fill="#E11D48"/>
      <text
        x="48" y="27"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="20"
        fill="#0F172A"
        letterSpacing="-0.5"
      >
        Koto
      </text>
      <text
        x="96" y="27"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="400"
        fontSize="14"
        fill="#94A3B8"
      >
        言
      </text>
    </svg>
  );
}
