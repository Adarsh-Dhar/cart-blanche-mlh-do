import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownProductCardsProps {
  children: string;
}

export default function MarkdownProductCards({ children }: MarkdownProductCardsProps) {
  return (
    <div>
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p style={{ margin: "0 0 8px", lineHeight: 1.7, color: "#94a3b8", fontSize: 14 }}>{children}</p>
          ),
          strong: ({ children }) => (
            <strong style={{ color: "#e2e8f0", fontWeight: 600 }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em style={{ color: "#64748b", fontStyle: "italic" }}>{children}</em>
          ),
          ul: ({ children }) => (
            <ul style={{ margin: "4px 0 8px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 3 }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol style={{ margin: "4px 0 8px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 3 }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
              <span style={{ color: "#334155", marginTop: 6, fontSize: 6, flexShrink: 0 }}>●</span>
              <span>{children}</span>
            </li>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "none" }}>
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code style={{ fontFamily: "monospace", fontSize: 11, background: "#0f172a", color: "#67e8f9", padding: "1px 6px", borderRadius: 4 }}>
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote style={{ borderLeft: "2px solid #334155", paddingLeft: 12, margin: "6px 0", color: "#64748b" }}>
              {children}
            </blockquote>
          ),
          h1: ({ children }) => <h1 style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", margin: "0 0 8px" }}>{children}</h1>,
          h2: ({ children }) => <h2 style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0", margin: "0 0 6px" }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ fontSize: 14, fontWeight: 600, color: "#cbd5e1", margin: "0 0 4px" }}>{children}</h3>,
          hr: () => <hr style={{ border: "none", borderTop: "1px solid #1e293b", margin: "10px 0" }} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}