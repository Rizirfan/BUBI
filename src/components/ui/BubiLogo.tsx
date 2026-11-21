export function BubiLogo({
  size = 40,
  className = '',
}: {
  size?: number
  className?: string
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
        <linearGradient id="bubiOrange" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF8A34" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>

      {/* Rounded squircle tile */}
      <rect width="100" height="100" rx="26" fill="url(#bubiOrange)" />

      {/* Friendly Messenger Bubble */}
      <path
        d="M26 36C26 27.163 33.163 20 42 20H58C66.837 20 74 27.163 74 36V44C74 52.837 66.837 60 58 60H46L34 70V60H32C28.686 60 26 57.314 26 54V36Z"
        fill="#FFFFFF"
      />

      {/* Eyes */}
      <circle cx="42" cy="40" r="4.5" fill="#EA580C" />
      <circle cx="58" cy="40" r="4.5" fill="#EA580C" />

      {/* Smile arc */}
      <path
        d="M44 47C46 50 54 50 56 47"
        stroke="#EA580C"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function BubiBrand({
  size = 36,
  showTagline = false,
}: {
  size?: number
  showTagline?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <BubiLogo size={size} className="shadow-xs" />
      <div className="flex flex-col">
        <span className="font-extrabold tracking-tight text-[var(--text)] text-lg leading-none">
          BUBI
        </span>
        {showTagline && (
          <span className="text-[10px] text-[var(--text-muted)] tracking-wider uppercase font-semibold mt-0.5">
            Messenger
          </span>
        )}
      </div>
    </div>
  )
}
