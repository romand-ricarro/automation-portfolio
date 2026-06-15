import { useMemo } from "react";

interface DescriptionRendererProps {
  description: string;
}

interface Section {
  header: string;
  content: string;
  isPlaceholder: boolean;
  isSqaOnly: boolean;
}

// Placeholder patterns that should be dimmed
const PLACEHOLDER_PATTERNS = [
  /^\[To be filled by SQA\]$/i,
  /^\[To be determined\]$/i,
  /^\[Not specified\]$/i,
  /^\[No recording provided\]$/i,
  /^\[No link provided\]$/i,
  /^\[No notes provided\]$/i,
  /^\[No links provided\]$/i,
  /^\[Required - please specify\]$/i,
];

/**
 * Convert Jira wiki link syntax [text|url] to clickable links
 */
function renderTextWithLinks(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const linkRegex = /\[([^\]|]+)\|([^\]]+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Add the link
    const [, linkText, url] = match;
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-relay-orange hover:underline break-all"
      >
        {linkText}
      </a>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Parse the description into sections based on *HEADER:* pattern
 */
function parseDescriptionSections(description: string): Section[] {
  const sections: Section[] = [];

  // Remove the "Relay Attachments" section entirely (it's shown separately)
  let cleanedDescription = description.replace(
    /\n*\*?Relay Attachments:\*?\n(?:\[.*?\|.*?\]\n?)*/gi,
    ""
  );

  // Split by section headers (Jira wiki format: *HEADER:*)
  // Match patterns like *ENVIRONMENT:*, *(FOR SQA ONLY) WATCHERS:*, etc.
  const headerRegex = /\*([^*]+):\*/g;
  const matches: { header: string; index: number; length: number }[] = [];

  let match;
  while ((match = headerRegex.exec(cleanedDescription)) !== null) {
    matches.push({
      header: match[1].trim(),
      index: match.index,
      length: match[0].length,
    });
  }

  // Extract sections
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];

    const contentStart = current.index + current.length;
    const contentEnd = next ? next.index : cleanedDescription.length;
    let content = cleanedDescription.slice(contentStart, contentEnd).trim();

    // Check if content is a placeholder
    const isPlaceholder = PLACEHOLDER_PATTERNS.some((pattern) =>
      pattern.test(content)
    );

    // Check if it's an SQA-only section
    const isSqaOnly = current.header.includes("FOR SQA ONLY");

    sections.push({
      header: current.header.replace(/^\(FOR SQA ONLY\)\s*/i, ""),
      content,
      isPlaceholder,
      isSqaOnly,
    });
  }

  // Check if there's content before the first header
  if (matches.length > 0 && matches[0].index > 0) {
    const preContent = cleanedDescription.slice(0, matches[0].index).trim();
    if (preContent) {
      sections.unshift({
        header: "",
        content: preContent,
        isPlaceholder: false,
        isSqaOnly: false,
      });
    }
  }

  // If no sections found, return the whole description as one section
  if (sections.length === 0 && cleanedDescription.trim()) {
    sections.push({
      header: "",
      content: cleanedDescription.trim(),
      isPlaceholder: false,
      isSqaOnly: false,
    });
  }

  return sections;
}

/**
 * Render a single section with proper formatting
 */
function SectionBlock({ section }: { section: Section }) {
  // Hide SQA-only sections that are just placeholders
  if (section.isSqaOnly && section.isPlaceholder) {
    return null;
  }

  // Format header for display (convert SCREAMING_CASE to Title Case)
  const formatHeader = (header: string) => {
    return header
      .split(/[\s_]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Render content with line breaks preserved
  const renderContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, i) => (
      <span key={i}>
        {renderTextWithLinks(line)}
        {i < lines.length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div className="mb-4 last:mb-0">
      {section.header && (
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5 uppercase tracking-wide">
          {formatHeader(section.header)}
        </h3>
      )}
      <div
        className={`text-sm leading-relaxed ${
          section.isPlaceholder
            ? "text-gray-400 dark:text-gray-500 italic"
            : "text-gray-700 dark:text-gray-300"
        }`}
      >
        {renderContent(section.content)}
      </div>
    </div>
  );
}

/**
 * Smart description renderer that parses Jira-style descriptions
 * and renders them with proper visual hierarchy
 */
export function DescriptionRenderer({ description }: DescriptionRendererProps) {
  const sections = useMemo(
    () => parseDescriptionSections(description),
    [description]
  );

  // Group sections for better visual organization
  const { mainSections, userInfoSections } = useMemo(() => {
    const main: Section[] = [];
    const userInfo: Section[] = [];

    let isUserInfo = false;
    for (const section of sections) {
      if (section.header === "USER PROVIDED INFORMATION") {
        isUserInfo = true;
        continue; // Skip this header, we'll render its children differently
      }

      if (isUserInfo) {
        userInfo.push(section);
      } else {
        main.push(section);
      }
    }

    return { mainSections: main, userInfoSections: userInfo };
  }, [sections]);

  return (
    <div className="space-y-6">
      {/* Main sections */}
      {mainSections.length > 0 && (
        <div className="space-y-1">
          {mainSections.map((section, index) => (
            <SectionBlock key={index} section={section} />
          ))}
        </div>
      )}

      {/* Horizontal rule before user info (if we have user info) */}
      {userInfoSections.length > 0 && mainSections.length > 0 && (
        <hr className="border-gray-200 dark:border-gray-700" />
      )}

      {/* User provided information */}
      {userInfoSections.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
            User Provided Information
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-1">
            {userInfoSections.map((section, index) => (
              <SectionBlock key={index} section={section} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
