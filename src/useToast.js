import { useCallback, useEffect, useRef, useState } from 'react'

// A line that says what just happened and then gets out of the way. Used for
// things that are already visible on the board a moment later: a link copied, a
// name taken off, a bet restored. Never for errors, which stay on screen until
// they are dealt with.
export function useToast(duration = 2600) {
  const [message, setMessage] = useState(null)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const flash = useCallback(
    (text) => {
      clearTimeout(timer.current)
      setMessage(text)
      timer.current = setTimeout(() => setMessage(null), duration)
    },
    [duration],
  )

  return { message, flash }
}
