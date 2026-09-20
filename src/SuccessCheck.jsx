// The confirmation a sheet shows before it closes.
//
// The circle and the check are strokes with no fill, drawn in with
// stroke-dasharray so the circle draws itself and the check follows a beat
// later; the confetti throws itself outward once behind them. This marks a
// one-time event rather than routine feedback, so it is exempt from the
// interaction timing used everywhere else, and under prefers-reduced-motion the
// stylesheet collapses all of it and the mark simply appears.

const CONFETTI = [
  { w: 10, h: 10, r: '2px', bg: '#FF6B35', cx: '-120px', cy: '-90px', cr: '220deg', dur: '0.9s', delay: '0.3s' },
  { w: 8, h: 8, r: '50%', bg: '#9B7BF0', cx: '110px', cy: '-104px', cr: '-180deg', dur: '1s', delay: '0.32s' },
  { w: 12, h: 6, r: '2px', bg: '#FFC46B', cx: '-140px', cy: '40px', cr: '140deg', dur: '0.95s', delay: '0.34s' },
  { w: 9, h: 9, r: '2px', bg: '#C9A227', cx: '132px', cy: '52px', cr: '-260deg', dur: '1.05s', delay: '0.3s' },
  { w: 7, h: 7, r: '50%', bg: '#FF8A3D', cx: '-40px', cy: '-136px', cr: '200deg', dur: '0.9s', delay: '0.38s' },
  { w: 10, h: 5, r: '2px', bg: '#B57BE8', cx: '56px', cy: '126px', cr: '-160deg', dur: '1s', delay: '0.36s' },
  { w: 8, h: 8, r: '2px', bg: '#2E2140', cx: '-96px', cy: '120px', cr: '180deg', dur: '1.1s', delay: '0.33s' },
  { w: 11, h: 11, r: '50%', bg: '#FFD97A', cx: '148px', cy: '-20px', cr: '-200deg', dur: '0.98s', delay: '0.35s' },
]

export default function SuccessCheck({ label, sub }) {
  return (
    <div className="modal-done" role="status">
      <div className="success-mark">
        <svg
          width="92"
          height="92"
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
        {CONFETTI.map((bit, i) => (
          <span
            key={i}
            className="confetti"
            aria-hidden="true"
            style={{
              width: bit.w,
              height: bit.h,
              margin: `${-bit.h / 2}px 0 0 ${-bit.w / 2}px`,
              borderRadius: bit.r,
              background: bit.bg,
              animationDuration: bit.dur,
              animationDelay: bit.delay,
              '--cx': bit.cx,
              '--cy': bit.cy,
              '--cr': bit.cr,
            }}
          />
        ))}
      </div>
      <span className="success-label">{label}</span>
      {sub ? <span className="success-sub">{sub}</span> : null}
    </div>
  )
}
