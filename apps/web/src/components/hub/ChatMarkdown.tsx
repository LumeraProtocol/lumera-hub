'use client'

/*
 * Markdown for chat replies.
 *
 * Models answer in GitHub-flavoured Markdown — bold, lists, tables, fenced
 * code — and a plain text bubble showed the raw asterisks and pipes. This
 * renders it with react-markdown + remark-gfm, styled with the hub's own
 * tokens. Raw HTML in a reply is not rendered (react-markdown's default), so a
 * model cannot inject markup; links open in a new tab.
 *
 * A reply that is still streaming is usually mid-construct (an unclosed `**`,
 * half a table); that renders as far as it parses and settles as the rest
 * arrives.
 */

import React from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

/*
 * Models often break lines inside a table cell with a raw `<br>` — a real
 * newline would end the row. Raw HTML is not rendered (so a reply cannot
 * inject markup), which silently dropped those breaks and ran the cell's items
 * together. This turns exactly `<br>` / `<br/>` into a Markdown hard break;
 * every other HTML tag stays unrendered.
 */
type MdNode = { type: string; value?: string; children?: MdNode[] }
const RAW_BR = /^<br\s*\/?>$/i
function remarkHtmlBreaks() {
  const walk = (node: MdNode) => {
    if (!node.children) return
    node.children = node.children.map((child) =>
      child.type === 'html' && RAW_BR.test((child.value ?? '').trim()) ? { type: 'break' } : child,
    )
    node.children.forEach(walk)
  }
  return walk
}

type Intrinsic = keyof React.JSX.IntrinsicElements

/**
 * An element with fixed classes. react-markdown hands every override its hast
 * `node`; it is dropped here so it never reaches the DOM as an attribute.
 */
const styled = <T extends Intrinsic>(Tag: T, className: string) => {
  function MarkdownElement(props: React.ComponentProps<T> & { node?: unknown }) {
    const { node, ...rest } = props
    void node
    return React.createElement(Tag, { ...(rest as object), className })
  }
  MarkdownElement.displayName = `Markdown(${Tag})`
  return MarkdownElement
}

const components: Components = {
  p: styled('p', 'my-2 first:mt-0 last:mb-0'),
  strong: styled('strong', 'font-semibold text-text-primary'),
  em: styled('em', 'italic'),
  del: styled('del', 'line-through opacity-80'),
  h1: styled('h1', 'mt-4 mb-2 text-[17px] leading-snug font-semibold text-text-primary first:mt-0'),
  h2: styled('h2', 'mt-4 mb-2 text-base leading-snug font-semibold text-text-primary first:mt-0'),
  h3: styled('h3', 'mt-3 mb-1.5 text-base font-semibold text-text-primary first:mt-0'),
  h4: styled('h4', 'mt-3 mb-1.5 text-base font-medium text-text-primary first:mt-0'),
  h5: styled('h5', 'mt-3 mb-1.5 text-small font-semibold text-text-primary first:mt-0'),
  h6: styled('h6', 'mt-3 mb-1.5 text-small font-semibold text-text-tertiary first:mt-0'),
  ul: styled('ul', 'my-2 list-disc space-y-1 pl-5 first:mt-0 last:mb-0'),
  ol: styled('ol', 'my-2 list-decimal space-y-1 pl-5 first:mt-0 last:mb-0'),
  li: styled('li', 'pl-0.5 marker:text-text-tertiary'),
  blockquote: styled('blockquote', 'my-2 border-l-2 border-line-accent pl-3 text-text-tertiary'),
  hr: styled('hr', 'my-3 border-0 border-t border-line-edge'),
  // Inline code; inside a fenced block the `pre` below resets these.
  code: styled('code', 'rounded-[4px] bg-ink-800 px-1 py-px font-mono text-[0.9em] text-text-primary'),
  pre: styled(
    'pre',
    'my-2 overflow-x-auto rounded-control border border-line-edge bg-ink-900 p-3 font-mono text-small leading-[1.55] first:mt-0 last:mb-0 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-[1em] [&>code]:text-text-secondary',
  ),
  thead: styled('thead', 'bg-ink-700'),
  th: styled('th', 'border-b border-line-edge px-3 py-2 text-left font-semibold whitespace-nowrap text-text-primary'),
  td: styled('td', 'border-t border-line-hairline px-3 py-2 align-top'),
  input: styled('input', 'mr-1.5 align-middle accent-lumera-green'),
  // A wide table scrolls inside the bubble instead of stretching it.
  table: ({ node, ...props }) => {
    void node
    return (
      <div className="my-2 max-w-full overflow-x-auto rounded-control border border-line-edge first:mt-0 last:mb-0">
        <table {...props} className="w-full border-collapse text-small" />
      </div>
    )
  },
  a: ({ node, ...props }) => {
    void node
    return (
      <a
        {...props}
        target="_blank"
        rel="noopener noreferrer"
        className="break-words text-lumera-green underline underline-offset-2 hover:brightness-110"
      />
    )
  },
}

/*
 * While a reply streams, a caret trails its last element — inline at the end
 * of a paragraph, the common case — and disappears when the reply settles.
 */
const STREAMING_CARET =
  "[&>*:last-child]:after:ml-0.5 [&>*:last-child]:after:animate-pulse [&>*:last-child]:after:text-lumera-green [&>*:last-child]:after:content-['▍']"

export function ChatMarkdown({ children, streaming = false }: { children: string; streaming?: boolean }) {
  return (
    <div
      className={streaming ? `min-w-0 break-words ${STREAMING_CARET}` : 'min-w-0 break-words'}
      data-streaming={streaming ? 'true' : undefined}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkHtmlBreaks]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

export default ChatMarkdown
