// The frame every screen sits in.
//
// On a phone the canvas is the whole viewport and the backdrop never shows. On
// anything wider it becomes a centred column on a lit, grainy field, which is
// the shape the app was designed in. The backdrop is fixed and inert: it is
// behind everything, it scrolls with nothing, and it takes no pointer events.

export default function Canvas({ children }) {
  return (
    <div className="app">
      <div className="backdrop" aria-hidden="true">
        <span className="backdrop-blob backdrop-blob-a" />
        <span className="backdrop-blob backdrop-blob-b" />
        <span className="grain" />
      </div>
      <div className="canvas">{children}</div>
    </div>
  )
}
