import { created, parseBody, route } from '@/lib/api/route'
import { createTemplate, listTemplates, templateCreateSchema } from '@/lib/content/service'

export const GET = route(async ({ query }) => ({
  data: await listTemplates({ category: query.get('category') || undefined, q: query.get('q') || undefined }),
}))

export const POST = route(async ({ request }) => {
  const input = await parseBody(request, templateCreateSchema)
  return created({ data: await createTemplate(input) })
})
