export default function Toast({ message }) {
  if (!message) return null
  return (
    <div className="toast fixed-to-canvas" role="status">
      {message}
    </div>
  )
}
