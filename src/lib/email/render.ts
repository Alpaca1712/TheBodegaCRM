import { marked } from 'marked'
import type { BodyFormat } from '@/types'

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function textToHtml(text: string) {
  const paragraphs = text.trim().split(/\n{2,}/)
  const body = paragraphs
    .map((paragraph) => `<p style="margin:0 0 1em 0;">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('\n')
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#111;">${body}</div>`
}

export function htmlToText(html: string) {
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function markdownToText(markdown: string) {
  return markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/^[ \t]*[-*][ \t]+/gm, '- ')
    .trim()
}

export interface RenderedBody {
  text: string
  html: string
}

export function renderBody(body: string, format: BodyFormat): RenderedBody {
  if (format === 'html') return { html: body, text: htmlToText(body) }
  if (format === 'markdown') {
    const html = marked.parse(body, { async: false, gfm: true, breaks: true }) as string
    return { html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#111;">${html}</div>`, text: markdownToText(body) }
  }
  return { text: body.trim(), html: textToHtml(body) }
}

export function appendSignature(rendered: RenderedBody, signature: string | null | undefined): RenderedBody {
  const sig = signature?.trim()
  if (!sig) return rendered
  return {
    text: `${rendered.text}\n\n${sig}`,
    html: rendered.html.replace(/<\/div>\s*$/, `<p style="margin:1.5em 0 0 0;white-space:pre-line;">${escapeHtml(sig)}</p></div>`),
  }
}

export function replySubject(subject: string) {
  return /^\s*re:/i.test(subject) ? subject : `Re: ${subject}`
}
