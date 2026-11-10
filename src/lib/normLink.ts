// YouTube video IDs are case-sensitive, so this must run on the ORIGINAL
// (non-lowercased) link — unlike normLink(), which lowercases everything
// and is only safe for same-video deduplication, never for API/CSV lookups.
export function extractYoutubeId(link: string): string | null {
  if (!link) return null;
  const s = String(link).trim();
  const m =
    s.match(/[?&]v=([a-zA-Z0-9_-]{6,})/) ||
    s.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/i) ||
    s.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/i) ||
    s.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{6,})/i);
  return m ? m[1] : null;
}

export function normLink(link: string): string {
  if (!link) return '';
  const l = String(link).trim().toLowerCase();
  let m: RegExpMatchArray | null;
  m = l.match(/instagram\.com\/(?:reel|p|tv)\/([a-z0-9_-]+)/i); if (m) return `ig:${m[1]}`;
  m = l.match(/facebook\.com\/reel\/(\d+)/i) || l.match(/fb\.watch\/(\d+)/i) || l.match(/facebook\.com\/watch\/\?v=(\d+)/i) || l.match(/\/videos\/(\d+)/i); if (m) return `fbvid:${m[1]}`;
  m = l.match(/pfbid([a-z0-9]+)/i); if (m) return `fbpost:${m[1]}`;
  m = l.match(/[?&]fbid=(\d+)/i); if (m) return `fbphoto:${m[1]}`;
  const yt = l.match(/[?&]v=([a-z0-9_-]{6,})/i) || l.match(/youtu\.be\/([a-z0-9_-]{6,})/i) || l.match(/youtube\.com\/shorts\/([a-z0-9_-]{6,})/i) || l.match(/youtube\.com\/live\/([a-z0-9_-]{6,})/i); if (yt) return `youtube:${yt[1]}`;
  m = l.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i); if (m) return `tiktok:${m[1]}`;
  return l.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '').split('?')[0];
}
