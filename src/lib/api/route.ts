import { NextResponse, type NextRequest } from 'next/server'
import { ZodError, type ZodType } from 'zod'
import { ApiError, errorMessage } from './errors'
import { requireActor, type Actor } from '@/lib/auth/authenticate'

export interface RouteContext<P extends Record<string, string> = Record<string, string>> {
  request: NextRequest
  params: P
  actor: Actor
  query: URLSearchParams
}

type Handler<P extends Record<string, string>> = (ctx: RouteContext<P>) => Promise<Response | unknown>

interface RouteOptions {
  auth?: 'any' | 'session' | 'none'
}

export function toErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, ...(error.details !== undefined ? { details: error.details } : {}) },
      { status: error.status },
    )
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Validation failed', details: error.issues },
      { status: 400 },
    )
  }
  const pg = error as { code?: string; message?: string; details?: string }
  if (pg?.code === '23505') {
    return NextResponse.json({ error: 'Already exists', details: pg.details || pg.message }, { status: 409 })
  }
  if (pg?.code === '23503') {
    return NextResponse.json({ error: 'Referenced record does not exist', details: pg.details || pg.message }, { status: 422 })
  }
  console.error('[api] unhandled error', error)
  return NextResponse.json({ error: errorMessage(error) }, { status: 500 })
}

/**
 * Wraps a Next.js route handler with authentication, param resolution, and
 * uniform error handling. Return a plain object to send JSON, or a Response.
 */
export function route<P extends Record<string, string> = Record<string, string>>(
  handler: Handler<P>,
  options: RouteOptions = {},
) {
  return async (request: NextRequest, context: { params: Promise<P> }) => {
    try {
      const params = (await context?.params) ?? ({} as P)
      const auth = options.auth ?? 'any'
      const actor: Actor = auth === 'none'
        ? { type: 'api_key', id: 'anonymous', name: 'anonymous' }
        : await requireActor(request, { sessionOnly: auth === 'session' })

      const result = await handler({ request, params, actor, query: request.nextUrl.searchParams })
      if (result instanceof Response) return result
      if (result === undefined || result === null) return new NextResponse(null, { status: 204 })
      return NextResponse.json(result)
    } catch (error) {
      return toErrorResponse(error)
    }
  }
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    throw ApiError.badRequest('Request body must be valid JSON')
  }
  return schema.parse(raw)
}

export function parseQuery<T>(query: URLSearchParams, schema: ZodType<T>): T {
  const object: Record<string, string | string[]> = {}
  for (const [key, value] of query.entries()) {
    const existing = object[key]
    if (existing === undefined) object[key] = value
    else object[key] = Array.isArray(existing) ? [...existing, value] : [existing, value]
  }
  return schema.parse(object)
}

export function created(data: unknown) {
  return NextResponse.json(data, { status: 201 })
}
