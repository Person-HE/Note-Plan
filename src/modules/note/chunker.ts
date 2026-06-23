import { generateId, toISODateTimeString } from '@/shared'
import type { DocChunkRecord, DocLinkRecord } from '@/core/database'
import type { DocLinkType } from './types'

interface RawSection {
  headingLevel: number
  headingText: string
  content: string
}

export function parseHTMLToSections(html: string): RawSection[] {
  if (!html || html.trim() === '') {
    return []
  }

  const container = document.createElement('div')
  container.innerHTML = html

  const sections: RawSection[] = []
  let currentSection: RawSection | null = null
  let currentContent: string[] = []

  const flushSection = () => {
    if (currentSection) {
      currentSection.content = currentContent.join('')
      sections.push(currentSection)
    }
  }

  for (const node of Array.from(container.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      const tagName = el.tagName.toLowerCase()
      const headingMatch = tagName.match(/^h([1-6])$/)

      if (headingMatch) {
        flushSection()
        currentSection = {
          headingLevel: parseInt(headingMatch[1]),
          headingText: el.textContent || '',
          content: '',
        }
        currentContent = [el.outerHTML]
      } else {
        if (!currentSection) {
          currentSection = { headingLevel: 0, headingText: '', content: '' }
          currentContent = []
        }
        currentContent.push(el.outerHTML)
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent
      if (text && text.trim()) {
        if (!currentSection) {
          currentSection = { headingLevel: 0, headingText: '', content: '' }
          currentContent = []
        }
        currentContent.push(text)
      }
    }
  }

  flushSection()
  return sections
}

export function extractWikiLinks(html: string): string[] {
  const links: string[] = []
  const regex = /\[\[([^\]]+)\]\]/g
  let match
  while ((match = regex.exec(html)) !== null) {
    links.push(match[1].trim())
  }
  return [...new Set(links)]
}

export function extractTagsFromContent(html: string): string[] {
  const tags: string[] = []
  const regex = /#([a-zA-Z\u4e00-\u9fff][\w\u4e00-\u9fff]*)/g
  let match
  while ((match = regex.exec(html)) !== null) {
    tags.push(match[1])
  }
  return [...new Set(tags)]
}

export function sectionsToChunkRecords(
  docId: string,
  sections: RawSection[],
  now: string
): DocChunkRecord[] {
  const records: DocChunkRecord[] = []
  const stack: { id: string; level: number }[] = []

  sections.forEach((section, index) => {
    const id = generateId()
    let parentId: string | null = null

    while (stack.length > 0 && stack[stack.length - 1].level >= section.headingLevel) {
      stack.pop()
    }

    if (stack.length > 0) {
      parentId = stack[stack.length - 1].id
    }

    if (section.headingLevel > 0) {
      stack.push({ id, level: section.headingLevel })
    }

    const wikiLinks = extractWikiLinks(section.content)
    const tags = extractTagsFromContent(section.content)

    records.push({
      id,
      docId,
      parentId,
      headingLevel: section.headingLevel,
      headingText: section.headingText,
      content: section.content,
      outgoingLinks: wikiLinks,
      tags,
      order: index,
      createdAt: now,
      updatedAt: now,
    })
  })

  return records
}

export function resolveDocLinks(
  sourceDocId: string,
  chunkRecords: DocChunkRecord[],
  docTitleToIdMap: Map<string, string>
): DocLinkRecord[] {
  const links: DocLinkRecord[] = []
  const now = toISODateTimeString(new Date())
  const seen = new Set<string>()

  for (const chunk of chunkRecords) {
    for (const linkTitle of chunk.outgoingLinks) {
      const targetDocId = docTitleToIdMap.get(linkTitle.toLowerCase())
      if (targetDocId && targetDocId !== sourceDocId) {
        const key = `${sourceDocId}->${targetDocId}`
        if (!seen.has(key)) {
          seen.add(key)
          links.push({
            id: generateId(),
            sourceDocId,
            targetDocId,
            type: 'reference',
            description: '',
            createdAt: now,
          })
        }
      }
    }
  }

  return links
}

export function htmlToChunkRecords(html: string, docId: string): DocChunkRecord[] {
  const now = toISODateTimeString(new Date())
  const sections = parseHTMLToSections(html)
  if (sections.length === 0) return []
  return sectionsToChunkRecords(docId, sections, now)
}

export function buildGraphData(
  docs: { id: string; title: string; tags: string[] }[],
  chunks: DocChunkRecord[],
  links: DocLinkRecord[]
): { nodes: { id: string; label: string; type: 'doc' | 'chunk'; tags: string[]; linkCount: number }[]; edges: { source: string; target: string; type: DocLinkType | 'contains'; label?: string }[] } {
  const nodes: { id: string; label: string; type: 'doc' | 'chunk'; tags: string[]; linkCount: number }[] = []
  const edges: { source: string; target: string; type: DocLinkType | 'contains'; label?: string }[] = []

  const docLinkCounts = new Map<string, number>()
  for (const link of links) {
    docLinkCounts.set(link.sourceDocId, (docLinkCounts.get(link.sourceDocId) || 0) + 1)
    docLinkCounts.set(link.targetDocId, (docLinkCounts.get(link.targetDocId) || 0) + 1)
  }

  for (const doc of docs) {
    nodes.push({
      id: doc.id,
      label: doc.title || '无标题',
      type: 'doc',
      tags: doc.tags,
      linkCount: docLinkCounts.get(doc.id) || 0,
    })
  }

  for (const link of links) {
    edges.push({
      source: link.sourceDocId,
      target: link.targetDocId,
      type: link.type as DocLinkType,
      label: link.type,
    })
  }

  return { nodes, edges }
}
