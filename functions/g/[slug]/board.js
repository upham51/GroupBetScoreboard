// GET /g/:slug/board -> the chrome-free standings, sized for a screenshot.

import { serveShell } from '../../_lib/shell.js'

export const onRequestGet = (context) => serveShell(context, { view: 'screenshot' })
