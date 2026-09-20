// A four-route router. react-router would be more than this app needs, and the
// whole point is to keep the bundle small.

import { useEffect, useState } from 'react'

export function parseRoute(pathname) {
  if (pathname === '/' || pathname === '') return { name: 'landing' }
  if (pathname === '/new' || pathname === '/new/') return { name: 'new' }

  const screenshot = pathname.match(/^\/g\/([^/]+)\/board\/?$/)
  if (screenshot) return { name: 'screenshot', slug: decodeURIComponent(screenshot[1]) }

  const board = pathname.match(/^\/g\/([^/]+)\/?$/)
  if (board) return { name: 'board', slug: decodeURIComponent(board[1]) }

  return { name: 'unknown' }
}

export function navigate(to) {
  if (to === window.location.pathname) return
  window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname))
  useEffect(() => {
    const sync = () => {
      setRoute(parseRoute(window.location.pathname))
      window.scrollTo(0, 0)
    }
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])
  return route
}

// A real anchor, so opening in a new tab still works, that stays on the page for
// an ordinary click.
export function Link({ to, children, ...rest }) {
  return (
    <a
      href={to}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
        event.preventDefault()
        navigate(to)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
