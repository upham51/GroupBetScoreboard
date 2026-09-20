// Hand-drawn icons. No icon library, no emoji: every glyph is a 14px stroked
// path that inherits the surrounding colour.

const base = {
  width: 14,
  height: 14,
  viewBox: '0 0 14 14',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
}

export function IconPlus(props) {
  return (
    <svg {...base} {...props}>
      <path d="M7 2.4v9.2M2.4 7h9.2" />
    </svg>
  )
}

export function IconTick(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2.4 7.6l3 3 6.2-7" />
    </svg>
  )
}

export function IconClose(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3.2 3.2l7.6 7.6M10.8 3.2l-7.6 7.6" />
    </svg>
  )
}

export function IconLink(props) {
  return (
    <svg {...base} {...props}>
      <path d="M8.1 5.9a2.9 2.9 0 010 4.1l-1.2 1.2a2.9 2.9 0 01-4.1-4.1l.9-.9" />
      <path d="M5.9 8.1a2.9 2.9 0 010-4.1l1.2-1.2a2.9 2.9 0 014.1 4.1l-.9.9" />
    </svg>
  )
}

export function IconFrame(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2.2 4.1a1.4 1.4 0 011.4-1.4h6.8a1.4 1.4 0 011.4 1.4v5.8a1.4 1.4 0 01-1.4 1.4H3.6a1.4 1.4 0 01-1.4-1.4z" />
      <path d="M2.2 5.9h9.6" />
    </svg>
  )
}

export function IconBack(props) {
  return (
    <svg {...base} {...props}>
      <path d="M11.3 7H2.7M6.2 3.5L2.7 7l3.5 3.5" />
    </svg>
  )
}

export function IconChevron(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3.7 5.4L7 8.7l3.3-3.3" />
    </svg>
  )
}

// A streak is a standing state rather than a one-time event, so these two loop
// gently instead of playing once. Both collapse to static under
// prefers-reduced-motion, like everything else that moves in this app.
export function IconFlame(props) {
  return (
    <svg {...base} {...props}>
      <path className="flame-body" d="M7 1.9c.4 1.9-.9 2.6-1.7 3.6-.9 1-1.4 1.9-1.4 3A3.1 3.1 0 007 11.8a3.1 3.1 0 003.1-3.3c0-2.2-1.7-3.3-2.4-4.6-.2-.4-.5-1-.7-2z" />
      <path className="flame-core" d="M7 11.7a1.5 1.5 0 001.5-1.6c0-.9-.8-1.4-1.1-2.1-.4.8-1.4 1.1-1.4 2.1A1.5 1.5 0 007 11.7z" />
    </svg>
  )
}

export function IconFrost(props) {
  return (
    <svg {...base} {...props}>
      <path d="M7 1.8v10.4M2.5 4.4l9 5.2M11.5 4.4l-9 5.2" />
      <path className="frost-tips" d="M5.6 3.2L7 1.8l1.4 1.4M5.6 10.8L7 12.2l1.4-1.4" />
    </svg>
  )
}

export function IconTrash(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2.6 3.9h8.8M5.5 3.9V2.6h3v1.3M4.2 3.9l.5 7.5h4.6l.5-7.5" />
    </svg>
  )
}

export function IconUndo(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2.7 6.3h5.8a3 3 0 010 6H5.8M2.7 6.3l2.4-2.4M2.7 6.3l2.4 2.4" />
    </svg>
  )
}

export function IconScales(props) {
  return (
    <svg {...base} {...props}>
      <path d="M7 2.4v9.2M3.4 11.6h7.2M2.2 5.2h9.6M2.2 5.2L1 8.4h2.4zM11.8 5.2L10.6 8.4H13z" />
    </svg>
  )
}
