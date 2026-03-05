type Props = {
  size?: "sm" | "md"
  delayMs?: number
}

export default function BumaCheck({ size = "md", delayMs = 120 }: Props) {
  const box = size === "sm" ? "h-14 w-14" : "h-16 w-16 sm:h-20 sm:w-20"
  const svgSize = size === "sm" ? 44 : 60
  const strokeW = size === "sm" ? 6.5 : 8

  return (
    <div className={`grid ${box} place-items-center text-buma-green`}>
      <svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 52 52"
        className="block"
        style={{ animation: "buma-pop 220ms ease-out both" }}
      >
        <path
          d="M14 27 L22 35 L39 18"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 80,
            strokeDashoffset: 80,
            animation: `buma-check-draw 520ms ease-out forwards ${delayMs}ms`,
          }}
        />
      </svg>

      <style>{`
        @keyframes buma-check-draw { to { stroke-dashoffset: 0; } }
        @keyframes buma-pop {
          0% { transform: scale(.92); opacity: .65; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}