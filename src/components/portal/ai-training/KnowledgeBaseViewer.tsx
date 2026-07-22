'use client';
// Knowledge Base Viewer — displays markdown reference docs with search.
// Ported from interboost-agent-training, restyled with gig-solutions palette.

import React, { useState } from 'react';
import { Search, FileText, ListOrdered } from 'lucide-react';
import Markdown from 'react-markdown';

interface Props {
  content: string;
  script?: string;
  hideTabs?: boolean;
  title?: string;
  icon?: 'file' | 'script';
}

export default function KnowledgeBaseViewer({
  content,
  script,
  hideTabs,
  title,
  icon = 'file',
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'kb' | 'script'>('kb');

  const textToRender = hideTabs
    ? content
    : activeTab === 'kb'
      ? content
      : script || '';

  const highlightText = (text: string) => {
    if (!searchQuery.trim() || typeof text !== 'string') return text;
    const regex = new RegExp(
      `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'gi',
    );
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-[#16A34A]/30 text-white rounded px-0.5">
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  };

  const renderWithHighlight = (props: any) => {
    const { children } = props;
    if (typeof children === 'string') {
      return <>{highlightText(children)}</>;
    }
    if (Array.isArray(children)) {
      return (
        <>
          {children.map((child, i) => {
            if (typeof child === 'string') {
              return (
                <React.Fragment key={i}>{highlightText(child)}</React.Fragment>
              );
            }
            return child;
          })}
        </>
      );
    }
    return <>{children}</>;
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-8 flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          {hideTabs ? (
            icon === 'script' ? (
              <ListOrdered className="w-5 h-5 sm:w-6 sm:h-6 text-[#16A34A]" />
            ) : (
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#16A34A]" />
            )
          ) : activeTab === 'kb' ? (
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#16A34A]" />
          ) : (
            <ListOrdered className="w-5 h-5 sm:w-6 sm:h-6 text-[#16A34A]" />
          )}
          <h3 className="text-lg sm:text-xl font-bold text-white">
            {hideTabs
              ? title || 'Reference Document'
              : activeTab === 'kb'
                ? 'Reference Document'
                : 'Agent Script'}
          </h3>
        </div>
        {!hideTabs && script && (
          <div className="flex bg-[#0B1A2E] rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setActiveTab('kb')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                activeTab === 'kb'
                  ? 'bg-[#16A34A]/20 text-[#16A34A]'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Knowledge Base
            </button>
            <button
              onClick={() => setActiveTab('script')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                activeTab === 'script'
                  ? 'bg-[#16A34A]/20 text-[#16A34A]'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Script
            </button>
          </div>
        )}
      </div>

      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-xl leading-5 bg-[#0B1A2E] text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] sm:text-sm transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto bg-[#0B1A2E] rounded-xl p-4 sm:p-6 border border-white/5">
        <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-headings:text-white prose-a:text-[#16A34A] prose-strong:text-white prose-code:text-[#16A34A] prose-code:bg-[#16A34A]/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
          <Markdown
            components={{
              p: ({ node, ...props }) => (
                <p {...props}>{renderWithHighlight(props)}</p>
              ),
              li: ({ node, ...props }) => (
                <li {...props}>{renderWithHighlight(props)}</li>
              ),
              h1: ({ node, ...props }) => (
                <h1 {...props}>{renderWithHighlight(props)}</h1>
              ),
              h2: ({ node, ...props }) => (
                <h2 {...props}>{renderWithHighlight(props)}</h2>
              ),
              h3: ({ node, ...props }) => (
                <h3 {...props}>{renderWithHighlight(props)}</h3>
              ),
              h4: ({ node, ...props }) => (
                <h4 {...props}>{renderWithHighlight(props)}</h4>
              ),
              strong: ({ node, ...props }) => (
                <strong {...props}>{renderWithHighlight(props)}</strong>
              ),
              em: ({ node, ...props }) => (
                <em {...props}>{renderWithHighlight(props)}</em>
              ),
            }}
          >
            {textToRender}
          </Markdown>
        </div>
      </div>
    </div>
  );
}
