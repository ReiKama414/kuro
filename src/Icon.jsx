export default function Icon({ name, size = 18, ...props }) {
  const paths = {
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    heart: (
      <path d="M20 5a5 5 0 0 0-7 0l-1 1-1-1a5 5 0 0 0-7 7l8 8 8-8a5 5 0 0 0 0-7Z" />
    ),
    jump: <path d="M12 17V4M7 9l5-5 5 5M5 20h14" />,
    moon: <path d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z" />,
    expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    camera: (
      <>
        <path d="M8 6l1.5-3h5L16 6h5v14H3V6Z" />
        <circle cx="12" cy="12.5" r="3.5" />
      </>
    ),
    settings: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="9" cy="7" r="2.5" />
        <circle cx="15" cy="17" r="2.5" />
      </>
    ),
    wander: <path d="M4 8h12l-3-3m3 3-3 3M20 16H8l3 3m-3-3 3-3" />,
    play: <path d="m8 5 11 7-11 7Z" />,
    pause: <path d="M8 5v14M16 5v14" />,
    reset: <path d="M4 10a8 8 0 1 1 1.5 7M4 4v6h6" />,
    check: <path d="m5 12 4 4L19 6" />,
    paw: (
      <>
        <ellipse cx="6" cy="7" rx="2" ry="2.5" />
        <ellipse cx="11" cy="4.5" rx="2" ry="2.5" />
        <ellipse cx="16" cy="6" rx="2" ry="2.5" />
        <ellipse cx="20" cy="10" rx="2" ry="2.5" />
        <path d="M7 14c1-2 2-3 4-3s3 2 5 3c4 4 1 7-2 6l-3-1-3 1c-4 1-5-3-1-6Z" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.arrow}
    </svg>
  );
}
