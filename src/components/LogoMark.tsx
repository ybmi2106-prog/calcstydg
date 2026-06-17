export function LogoMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Calcsty logo">
      <rect x="5" y="5" width="54" height="54" rx="18" fill="url(#logoShell)" />
      <path d="M32 13a19 19 0 1 0 18.3 24.1h-8.2A11.2 11.2 0 1 1 32 20.8V13Z" fill="url(#logoDonut)" />
      <path d="M35 13.4a19 19 0 0 1 15.4 16.8H35V13.4Z" fill="#0f766e" />
      <rect x="20" y="36" width="4.8" height="9" rx="2.4" fill="#042f2e" />
      <rect x="29.4" y="31" width="4.8" height="14" rx="2.4" fill="#0f766e" />
      <rect x="38.8" y="26" width="4.8" height="19" rx="2.4" fill="#14b8a6" />
      <defs>
        <linearGradient id="logoShell" x1="5" y1="5" x2="59" y2="59" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#CCFBF1" />
        </linearGradient>
        <linearGradient id="logoDonut" x1="13" y1="13" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0F766E" />
          <stop offset="1" stopColor="#5EEAD4" />
        </linearGradient>
      </defs>
    </svg>
  );
}
