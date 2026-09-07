import { createMcpHandler } from 'mcp-handler'
import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/auth/authenticate'
import { registerBodegaTools, SERVER_INSTRUCTIONS } from '@/lib/mcp/server'

export const maxDuration = 120

const mcp = createMcpHandler(
  (server) => registerBodegaTools(server),
  {
    serverInfo: { name: 'bodega', version: '2.0.0' },
    instructions: SERVER_INSTRUCTIONS,
  },
)

/**
 * Remote MCP endpoint. Authenticate with `Authorization: Bearer bdg_...`
 * (a Bodega API key). Works as a Claude.ai custom connector and with
 * `claude mcp add --transport http bodega <url> --header "Authorization: Bearer ..."`.
 */
async function handler(request: Request) {
  const actor = await authenticate(request)
  if (!actor || actor.type !== 'api_key') {
    return NextResponse.json(
      { error: 'Unauthorized. Send a Bodega API key as Authorization: Bearer bdg_...' },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="bodega"' } },
    )
  }
  return mcp(request)
}

export { handler as GET, handler as POST, handler as DELETE }
