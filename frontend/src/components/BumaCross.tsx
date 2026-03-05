type Props = {
  size?: "sm" | "md"
  delayMs?: number
}

export default function BumaCross({ size = "md", delayMs = 120 }: Props) {
  const box = size === "sm" ? "h-14 w-14" : "h-16 w-16 sm:h-20 sm:w-20"
  const svgSize = size === "sm" ? 44 : 60
  const strokeW = size === "sm" ? 6.5 : 8

  return (
    <div className={`grid ${box} place-items-center text-red-600`}>
      <svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 52 52"
        className="block"
        style={{ animation: "buma-pop 220ms ease-out both" }}
      >
        {/* garis 1 */}
        <path
          d="M16 16 L36 36"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 80,
            strokeDashoffset: 80,
            animation: `buma-x-draw 420ms ease-out forwards ${delayMs}ms`,
          }}
        />
        {/* garis 2 (delay dikit biar berasa animasi) */}
        <path
          d="M36 16 L16 36"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 80,
            strokeDashoffset: 80,
            animation: `buma-x-draw 420ms ease-out forwards ${delayMs + 120}ms`,
          }}
        />
      </svg>

      <style>{`
        @keyframes buma-x-draw { to { stroke-dashoffset: 0; } }
        @keyframes buma-pop {
          0% { transform: scale(.92); opacity: .65; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}