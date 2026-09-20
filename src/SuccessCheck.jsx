// The confirmation the log-result modal shows before it closes.
//
// Both shapes are strokes with no fill, drawn in with stroke-dasharray so the
// circle draws itself and the check follows a beat later. This marks a one-time
// event rather than routine feedback, so it is exempt from the 150ms
// interaction timing used everywhere else; under prefers-reduced-motion the
// stylesheet collapses both animations and the mark simply appears.

export default function SuccessCheck({ label }) {
  return (
    <div className="success" role="status">
      <svg
        className="success-mark"
        width="44"
        height="44"
        viewBox="0 0 44 44"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle className="success-circle" cx="22" cy="22" r="19" />
        <path className="success-tick" d="M13.5 22.5l5.5 5.5 11-11.5" />
      </svg>
      <span className="success-label">{label}</span>
    </div>
  )
}
