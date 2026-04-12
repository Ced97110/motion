"use client";

interface WikiContentProps {
  body: string;
}

function renderMarkdown(md: string): string {
  return md
    // Headers
    .replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;color:#fafafa;margin:20px 0 8px;letter-spacing:-0.3px">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:16px;font-weight:700;color:#fafafa;margin:24px 0 10px;letter-spacing:-0.3px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:6px">$1</h2>')
    .replace(/^# (.+)$/gm, "")
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#fafafa">$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    // Wiki links [[slug]]
    .replace(/\[\[([^\]]+)\]\]/g, '<a href="/plays/$1" style="color:#f97316;text-decoration:underline">$1</a>')
    // Source citations [S1, p.XX]
    .replace(/\[S(\d+)[^\]]*\]/g, '<span style="color:#63636e;font-size:10px">[S$1]</span>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li style="margin:3px 0;padding-left:4px">$1</li>')
    // Ordered lists
    .replace(/^(\d+)\. (.+)$/gm, '<li style="margin:3px 0;padding-left:4px" value="$1">$2</li>')
    // Paragraphs (lines not already tagged)
    .replace(/^(?!<[hl]|<li)(.+)$/gm, (_, text) => {
      if (text.trim() === "") return "";
      if (text.startsWith("<!--")) return "";
      return `<p style="margin:6px 0">${text}</p>`;
    })
    // Wrap consecutive <li> in <ul>
    .replace(/(<li[^>]*>.*?<\/li>\n?)+/g, (match) => `<ul style="list-style:disc;padding-left:18px;margin:6px 0">${match}</ul>`);
}

export default function WikiContent({ body }: WikiContentProps) {
  const html = renderMarkdown(body);

  return (
    <div
      style={{
        fontSize: 13,
        color: "#a1a1aa",
        lineHeight: 1.75,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
