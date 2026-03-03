import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-invert prose-sm sm:prose-base max-w-none break-words">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          code({node, inline, className, children, ...props}: any) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <div className="relative group">
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                    {match[1]}
                  </div>
                </div>
                <pre className="bg-gray-950/50 p-4 rounded-lg overflow-x-auto border border-gray-800">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            ) : (
              <code className="bg-gray-800/50 px-1.5 py-0.5 rounded text-pink-300 font-mono text-sm" {...props}>
                {children}
              </code>
            )
          },
          a: ({node, ...props}) => (
            <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-400 underline decoration-primary-500/30 hover:decoration-primary-400" />
          ),
          ul: ({node, ...props}) => (
            <ul {...props} className="list-disc pl-6 space-y-1 my-2" />
          ),
          ol: ({node, ...props}) => (
            <ol {...props} className="list-decimal pl-6 space-y-1 my-2" />
          ),
          blockquote: ({node, ...props}) => (
            <blockquote {...props} className="border-l-4 border-primary-500/50 pl-4 italic text-gray-400 my-4" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};