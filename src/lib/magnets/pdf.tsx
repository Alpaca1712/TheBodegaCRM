import * as React from 'react'
import { Document, Link, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer'
import { marked, type Token, type Tokens } from 'marked'
import type { Lead, LeadMagnet } from '@/types'
import { leadTemplateVars, renderTemplate } from '@/lib/sequences/templating'

const styles = StyleSheet.create({
  page: { padding: 56, fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.5, color: '#111111' },
  h1: { fontSize: 24, fontFamily: 'Helvetica-Bold', marginBottom: 14, marginTop: 6 },
  h2: { fontSize: 17, fontFamily: 'Helvetica-Bold', marginBottom: 8, marginTop: 16 },
  h3: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 6, marginTop: 12 },
  paragraph: { marginBottom: 8 },
  listItem: { flexDirection: 'row', marginBottom: 4, paddingLeft: 8 },
  bullet: { width: 14 },
  listText: { flex: 1 },
  quote: { borderLeftWidth: 2, borderLeftColor: '#999999', paddingLeft: 10, marginBottom: 8, color: '#444444' },
  code: { fontFamily: 'Courier', fontSize: 9.5, backgroundColor: '#f4f4f4', padding: 8, marginBottom: 8 },
  hr: { borderBottomWidth: 1, borderBottomColor: '#dddddd', marginVertical: 12 },
  bold: { fontFamily: 'Helvetica-Bold' },
  italic: { fontFamily: 'Helvetica-Oblique' },
  mono: { fontFamily: 'Courier' },
  link: { color: '#1d4ed8', textDecoration: 'underline' },
  footer: { position: 'absolute', bottom: 28, left: 56, right: 56, fontSize: 8, color: '#888888', textAlign: 'center' },
})

function renderInline(tokens: Token[] | undefined, keyPrefix: string): React.ReactNode[] {
  if (!tokens) return []
  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`
    switch (token.type) {
      case 'strong':
        return <Text key={key} style={styles.bold}>{renderInline((token as Tokens.Strong).tokens, key)}</Text>
      case 'em':
        return <Text key={key} style={styles.italic}>{renderInline((token as Tokens.Em).tokens, key)}</Text>
      case 'codespan':
        return <Text key={key} style={styles.mono}>{(token as Tokens.Codespan).text}</Text>
      case 'link': {
        const link = token as Tokens.Link
        return <Link key={key} src={link.href} style={styles.link}>{renderInline(link.tokens, key)}</Link>
      }
      case 'br':
        return <Text key={key}>{'\n'}</Text>
      case 'del':
        return <Text key={key}>{renderInline((token as Tokens.Del).tokens, key)}</Text>
      case 'escape':
      case 'text':
        return <Text key={key}>{(token as Tokens.Text).text}</Text>
      default:
        return <Text key={key}>{'raw' in token ? token.raw : ''}</Text>
    }
  })
}

function renderBlock(token: Token, key: string): React.ReactNode {
  switch (token.type) {
    case 'heading': {
      const heading = token as Tokens.Heading
      const style = heading.depth === 1 ? styles.h1 : heading.depth === 2 ? styles.h2 : styles.h3
      return <Text key={key} style={style}>{renderInline(heading.tokens, key)}</Text>
    }
    case 'paragraph':
      return <Text key={key} style={styles.paragraph}>{renderInline((token as Tokens.Paragraph).tokens, key)}</Text>
    case 'list': {
      const list = token as Tokens.List
      return (
        <View key={key} style={{ marginBottom: 8 }}>
          {list.items.map((item, index) => (
            <View key={`${key}-${index}`} style={styles.listItem}>
              <Text style={styles.bullet}>{list.ordered ? `${Number(list.start || 1) + index}.` : '•'}</Text>
              <Text style={styles.listText}>
                {item.tokens.map((child, childIndex) =>
                  child.type === 'text'
                    ? renderInline((child as Tokens.Text).tokens || [child], `${key}-${index}-${childIndex}`)
                    : renderBlock(child, `${key}-${index}-${childIndex}`),
                )}
              </Text>
            </View>
          ))}
        </View>
      )
    }
    case 'blockquote':
      return <View key={key} style={styles.quote}>{(token as Tokens.Blockquote).tokens.map((child, index) => renderBlock(child, `${key}-${index}`))}</View>
    case 'code':
      return <Text key={key} style={styles.code}>{(token as Tokens.Code).text}</Text>
    case 'hr':
      return <View key={key} style={styles.hr} />
    case 'space':
      return null
    case 'text':
      return <Text key={key} style={styles.paragraph}>{renderInline((token as Tokens.Text).tokens || [token], key)}</Text>
    default:
      return <Text key={key} style={styles.paragraph}>{'raw' in token ? token.raw : ''}</Text>
  }
}

export function renderMagnetMarkdown(magnet: LeadMagnet, lead: Lead) {
  return renderTemplate(magnet.body_markdown, leadTemplateVars(lead, { magnet_name: magnet.name }))
}

export function magnetFilename(magnet: LeadMagnet, lead: Lead) {
  const rendered = renderTemplate(magnet.filename_template || '{{name}}.pdf', leadTemplateVars(lead, { name: magnet.name }))
  const safe = rendered.replace(/[^a-zA-Z0-9 ._-]+/g, '').replace(/\s+/g, ' ').trim() || 'lead-magnet.pdf'
  return safe.toLowerCase().endsWith('.pdf') ? safe : `${safe}.pdf`
}

export async function renderLeadMagnetPdf(magnet: LeadMagnet, lead: Lead): Promise<{ filename: string; content: Buffer }> {
  const markdown = renderMagnetMarkdown(magnet, lead)
  const tokens = marked.lexer(markdown, { gfm: true })
  const document = (
    <Document title={magnet.name} author="Pigeon Labs">
      <Page size="LETTER" style={styles.page}>
        {tokens.map((token, index) => renderBlock(token, `b-${index}`))}
        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `${magnet.name} · ${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  )
  const content = await renderToBuffer(document)
  return { filename: magnetFilename(magnet, lead), content: Buffer.from(content) }
}
