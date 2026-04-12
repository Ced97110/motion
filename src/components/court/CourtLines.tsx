export default function CourtLines() {
  return (
    <>
      <g stroke="#fff" strokeWidth="0.3" fill="none" strokeLinecap="square">
        <line x1="-25" y1="0" x2="25" y2="0" />
        <line x1="-25" y1="0" x2="-25" y2="47" />
        <line x1="25" y1="0" x2="25" y2="47" />
        <path d="M-6 0L-6 19L6 19L6 0" />
        <path d="M-6 19A6 6 0 0 0 6 19" />
        <path d="M-21.65 0L-21.65 9.95A22.15 22.15 0 0 0 21.65 9.95L21.65 0" />
        <path d="M6 47A6 6 0 0 0-6 47" />
        <path d="M-4 5.25A4 4 0 0 0 4 5.25" />
        <line x1="-6" y1="18" x2="-6.5" y2="18" />
        <line x1="-6" y1="15" x2="-6.5" y2="15" />
        <line x1="-6" y1="12" x2="-6.5" y2="12" />
        <line x1="6" y1="18" x2="6.5" y2="18" />
        <line x1="6" y1="15" x2="6.5" y2="15" />
        <line x1="6" y1="12" x2="6.5" y2="12" />
        <path d="M-25 47L25 47" />
      </g>
      {/* Lane blocks */}
      <rect x="-6.5" y="8" width="0.5" height="1" stroke="#fff" strokeWidth="0.3" fill="#fff" />
      <rect x="6" y="8" width="0.5" height="1" stroke="#fff" strokeWidth="0.3" fill="#fff" />
      {/* Backboard */}
      <path d="M-3 4L3 4" fill="none" stroke="#fff" strokeWidth="0.3" />
      {/* Rim */}
      <circle cx="0" cy="5.25" r="0.75" fill="none" stroke="#fff" strokeWidth="0.3" />
    </>
  );
}
