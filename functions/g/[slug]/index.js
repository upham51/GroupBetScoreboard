// GET /g/:slug -> the board.

import { serveShell } from '../../_lib/shell.js'

export const onRequestGet = (context) => serveShell(context, { view: 'board' })
