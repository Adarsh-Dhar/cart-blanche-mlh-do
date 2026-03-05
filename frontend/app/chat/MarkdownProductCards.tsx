import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ExternalLink } from 'lucide-react';

interface MarkdownProductCardsProps {
  children: string;
}

export function MarkdownProductCards({ children }: MarkdownProductCardsProps) {
  return (
    <ReactMarkdown
      components={{
        ol: ({ node, ...props }) => (
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 list-none p-0" {...props} />
        ),
        li: ({ node, ...props }) => (
          <li className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative" {...props} />
        ),
        strong: ({ node, ...props }) => (
          <strong className="text-lg font-bold text-gray-900 dark:text-white block mb-3 pb-2 border-b border-gray-100 dark:border-gray-700" {...props} />
        ),
        ul: ({ node, ...props }) => (
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-none p-0 m-0" {...props} />
        ),
        a: ({ node, ...props }) => (
          <a
            className="inline-flex items-center gap-1 mt-3 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 font-medium text-xs rounded-lg transition-colors"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          >
            <ExternalLink className="w-3 h-3" /> {props.children}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
