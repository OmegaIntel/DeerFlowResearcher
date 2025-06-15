// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import ReactMarkdown, {
  type Options as ReactMarkdownOptions,
} from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";

import { Button } from "~/components/ui/button";
import { rehypeSplitWordsIntoSpans } from "~/core/rehype";
import { autoFixMarkdown } from "~/core/utils/markdown";
import { cn } from "~/lib/utils";

import Image from "./image";
import { Tooltip } from "./tooltip";

export function Markdown({
  className,
  children,
  style,
  enableCopy,
  animated = false,
  onLinkClick,
  ...props
}: ReactMarkdownOptions & {
  className?: string;
  enableCopy?: boolean;
  style?: React.CSSProperties;
  animated?: boolean;
  onLinkClick?: (href: string) => void;
}) {
  const rehypePlugins = useMemo(() => {
    if (animated) {
      return [rehypeKatex, rehypeSplitWordsIntoSpans];
    }
    return [rehypeKatex];
  }, [animated]);
  return (
    <div
      className={cn(
        className,
        "prose dark:prose-invert prose-p:my-0 prose-img:mt-0 flex flex-col gap-4",
      )}
      style={style}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={rehypePlugins}
        components={{
          a: ({ href, children }) => {
            // Check if this is a citation link (starts with /document-viewer/)
            if (href && href.startsWith('/document-viewer/')) {
              // Extract document ID from the URL
              const documentId = href.replace('/document-viewer/', '');
              console.log('[Markdown] Citation link clicked:', { href, documentId });
              
              // Handle citation click inline
              return (
                <a
                  href="#"
                  onClick={async (e) => {
                    e.preventDefault();
                    console.log('[Markdown] Citation click handler triggered for:', documentId);
                    
                    try {
                      // Import the necessary functions
                      const { getDocumentDownloadUrl } = await import('~/core/api/documents');
                      const { toast } = await import('sonner');
                      
                      const response = await getDocumentDownloadUrl(documentId);
                      console.log('[Markdown] Download URL response:', response);
                      
                      if (response && response.download_url) {
                        window.open(response.download_url, '_blank', 'noopener,noreferrer');
                        toast.success(`Opening document`);
                      } else {
                        throw new Error('No download URL received');
                      }
                    } catch (error) {
                      console.error('[Markdown] Citation error:', error);
                      const { toast } = await import('sonner');
                      toast.error('Failed to open citation');
                    }
                  }}
                  style={{ cursor: 'pointer', color: 'inherit', textDecoration: 'underline' }}
                >
                  {children}
                </a>
              );
            }
            
            // For regular links, keep the existing behavior
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          img: ({ src, alt }) => (
            <a href={src as string} target="_blank" rel="noopener noreferrer">
              <Image className="rounded" src={src as string} alt={alt ?? ""} />
            </a>
          ),
        }}
        {...props}
      >
        {(() => {
          let content = autoFixMarkdown(
            dropMarkdownQuote(processKatexInMarkdown(children ?? "")) ?? "",
          );
          
          // Remove any document-viewer links that might have slipped through
          // Pattern: [text](/document-viewer/id) or [text](document-viewer/id)
          content = content.replace(
            /\[([^\]]+)\]\(\/?document-viewer\/[^)]+\)/g,
            '[$1]'
          );
          
          // Also remove links with document IDs that look like citations
          content = content.replace(
            /\[(\d+)\]\([^)]*[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}[^)]*\)/g,
            '[$1]'
          );
          
          console.log('[Markdown] Content after cleanup:', content.substring(0, 200));
          return content;
        })()}
      </ReactMarkdown>
      {enableCopy && typeof children === "string" && (
        <div className="flex">
          <CopyButton content={children} />
        </div>
      )}
    </div>
  );
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip title="Copy">
      <Button
        variant="outline"
        size="sm"
        className="rounded-full"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => {
              setCopied(false);
            }, 1000);
          } catch (error) {
            console.error(error);
          }
        }}
      >
        {copied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}{" "}
      </Button>
    </Tooltip>
  );
}

function processKatexInMarkdown(markdown?: string | null) {
  if (!markdown) return markdown;

  const markdownWithKatexSyntax = markdown
    .replace(/\\\\\[/g, "$$$$") // Replace '\\[' with '$$'
    .replace(/\\\\\]/g, "$$$$") // Replace '\\]' with '$$'
    .replace(/\\\\\(/g, "$$$$") // Replace '\\(' with '$$'
    .replace(/\\\\\)/g, "$$$$") // Replace '\\)' with '$$'
    .replace(/\\\[/g, "$$$$") // Replace '\[' with '$$'
    .replace(/\\\]/g, "$$$$") // Replace '\]' with '$$'
    .replace(/\\\(/g, "$$$$") // Replace '\(' with '$$'
    .replace(/\\\)/g, "$$$$"); // Replace '\)' with '$$';
  return markdownWithKatexSyntax;
}

function dropMarkdownQuote(markdown?: string | null) {
  if (!markdown) return markdown;
  return markdown
    .replace(/^```markdown\n/gm, "")
    .replace(/^```text\n/gm, "")
    .replace(/^```\n/gm, "")
    .replace(/\n```$/gm, "");
}
