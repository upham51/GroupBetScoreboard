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
