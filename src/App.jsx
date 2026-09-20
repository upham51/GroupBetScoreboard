import Landing from './pages/Landing.jsx'
import NewGroup from './pages/NewGroup.jsx'
import Board from './pages/Board.jsx'
import Screenshot from './pages/Screenshot.jsx'
import Unknown from './pages/Unknown.jsx'
import { useRoute } from './router.jsx'

export default function App() {
  const route = useRoute()

  if (route.name === 'landing') return <Landing />
  if (route.name === 'new') return <NewGroup />
  if (route.name === 'board') return <Board key={route.slug} slug={route.slug} />
  if (route.name === 'screenshot') return <Screenshot key={route.slug} slug={route.slug} />
  return <Unknown />
}
