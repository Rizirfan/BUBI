export function BubiLogo({
  size = 40,
  className = '',
  monochrome = false,
}: {
  size?: number
  className?: string
  monochrome?: boolean
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        <linearGradient id="bubiOrangeGrad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF7A18" />
          <stop offset="50%" stopColor="#F96810" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient id="bubbleGrad" x1="0" y1="20" x2="0" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FFF4EC" />
        </linearGradient>
      </defs>

      {/* Rounded Squircle Tile */}
      <rect
        width="100"
        height="100"
        rx="26"
        fill={monochrome ? '#18181B' : 'url(#bubiOrangeGrad)'}
      />

      {/* Perfect Speech Bubble matching Brand Asset */}
      <path
        d="M38 21 H62 C72 21 78 27 78 37 V52 C78 62 72 68 62 68 H44 L31 81 L31 66 C25 65 21 60 21 52 V37 C21 27 27 21 38 21 Z"
        fill={monochrome ? '#FFFFFF' : 'url(#bubbleGrad)'}
      />

      {/* Eyes */}
      <circle cx="42" cy="44" r="6.4" fill={monochrome ? '#18181B' : '#EA580C'} />
      <circle cx="59" cy="44" r="6.4" fill={monochrome ? '#18181B' : '#EA580C'} />

      {/* Friendly Smile Arc */}
      <path
        d="M43 53 Q50.5 59.5 58 53"
        stroke={monochrome ? '#18181B' : '#EA580C'}
        strokeWidth="4.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function BubiWordmark({
  height = 32,
  className = '',
  monochrome = false,
}: {
  height?: number
  className?: string
  monochrome?: boolean
}) {
  const color = monochrome ? '#18181B' : '#EA580C'

  return (
    <svg
      height={height}
      viewBox="0 0 108 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
    >
      <text
        x="1"
        y="33"
        fill={color}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'Segoe UI', Roboto, sans-serif"
        fontWeight="900"
        fontSize="40"
        letterSpacing="-1.5"
      >
        bubi
      </text>
    </svg>
  )
}

export function BubiBrand({
  size = 36,
  className = '',
  monochrome = false,
  showTagline = false,
}: {
  size?: number
  className?: string
  monochrome?: boolean
  showTagline?: boolean
}) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <BubiLogo size={size} monochrome={monochrome} className="shadow-xs" />
      <div className="flex flex-col justify-center">
        <BubiWordmark height={size * 0.82} monochrome={monochrome} />
        {showTagline && (
          <span className="text-[10px] text-[var(--text-muted)] tracking-wider uppercase font-semibold -mt-0.5 ml-0.5">
            Messenger
          </span>
        )}
      </div>
    </div>
  )
}
