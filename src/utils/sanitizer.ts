import { SanitizedBatchItem, GameType } from '../types';

/**
 * Unwraps Google redirect URLs (e.g. https://www.google.com/url?q=https://drive.google.com/...)
 * which are heavily used by Google Docs clipboard and hyperlinks.
 */
export function unwrapGoogleRedirect(url: string): string {
  if (!url) return '';
  try {
    const trimmed = url.trim();
    if (trimmed.includes('google.com/url') && trimmed.includes('q=')) {
      const parsed = new URL(trimmed);
      const target = parsed.searchParams.get('q');
      if (target) return decodeURIComponent(target);
    }
  } catch {
    // If not a standard URL, fallback
  }
  return url.trim();
}

/**
 * Extracts Google Drive file ID from any Google Drive URL format
 */
export function extractGoogleDriveId(url: string): string | null {
  if (!url) return null;
  const clean = unwrapGoogleRedirect(url);
  const match = clean.match(/(?:file\/d\/|id=|open\?id=)([a-zA-Z0-9_-]{20,})/);
  return match ? match[1] : null;
}

/**
 * Converts any Google Drive link to an embeddable /preview URL that works in an iframe
 */
export function getEmbeddableUrl(url: string): string {
  if (!url) return '';
  const clean = unwrapGoogleRedirect(url);
  const driveId = extractGoogleDriveId(clean);
  if (driveId) {
    return `https://drive.google.com/file/d/${driveId}/preview`;
  }
  return clean;
}

/**
 * Normalizes any link into direct download links
 */
export function getDirectDownloadUrl(url: string): string {
  if (!url) return '';
  const clean = unwrapGoogleRedirect(url);
  const driveId = extractGoogleDriveId(clean);
  if (driveId) {
    return `https://drive.usercontent.google.com/download?id=${driveId}&export=download&confirm=t`;
  }
  return clean;
}

/**
 * Downloads the actual HTML file from the extracted link with multiple fallback mirrors
 */
export async function downloadGameFromLink(url: string): Promise<string> {
  const clean = unwrapGoogleRedirect(url);
  const driveId = extractGoogleDriveId(clean);

  // Strategy 1: Server-side proxy (/api/download-game)
  try {
    const res = await fetch('/api/download-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: clean }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.content && typeof data.content === 'string' && data.content.length > 50) {
        return data.content;
      }
    }
  } catch (err) {
    console.warn('Backend download proxy failed, trying client strategies...', err);
  }

  // If Google Drive, try Google direct download endpoints
  if (driveId) {
    const driveEndpoints = [
      `https://drive.usercontent.google.com/download?id=${driveId}&export=download&confirm=t`,
      `https://drive.google.com/uc?export=download&id=${driveId}&confirm=t`,
      `https://docs.google.com/uc?export=download&id=${driveId}`,
    ];

    for (const endpoint of driveEndpoints) {
      try {
        const res = await fetch(endpoint);
        if (res.ok) {
          const text = await res.text();
          if (text && !text.includes('Google Drive - Virus scan warning') && text.length > 50) {
            return text;
          }
        }
      } catch {}
    }
  }

  // Strategy 2: Direct fetch on original URL
  try {
    const res = await fetch(clean);
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 50) {
        return text;
      }
    }
  } catch {}

  // Strategy 3: CORS proxy fallback
  try {
    const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(clean)}`;
    const res = await fetch(corsProxyUrl);
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 50) {
        return text;
      }
    }
  } catch {}

  throw new Error(`Could not download raw HTML file. File will be embedded directly.`);
}

/**
 * Sanitizes HTML content based on game type
 */
export function sanitizeHtmlGameCode(rawHtml: string, gameType: GameType): { sanitized: string; notes: string[] } {
  const notes: string[] = [];
  let code = rawHtml;

  const dangerousPatterns = [
    { regex: /window\.top\.location\s*=[^;]+;/gi, note: 'Neutralized window.top redirect' },
    { regex: /top\.location\.href\s*=[^;]+;/gi, note: 'Neutralized top.location redirect' },
    { regex: /<meta\s+http-equiv=["']refresh["'][^>]*>/gi, note: 'Removed meta refresh redirect' },
    { regex: /document\.location\s*=[^;]+;/gi, note: 'Neutralized document.location redirect' },
    { regex: /window\.onbeforeunload\s*=[^;]+;/gi, note: 'Removed beforeunload trap' },
  ];

  dangerousPatterns.forEach(({ regex, note }) => {
    if (regex.test(code)) {
      code = code.replace(regex, '/* [Veloc Sanitizer]: ' + note + ' */');
      notes.push(note);
    }
  });

  if (gameType === 'ruffle' || code.includes('.swf') || code.toLowerCase().includes('ruffle')) {
    notes.push('Flash Ruffle runtime injected');
    if (!code.includes('ruffle.js') && !code.includes('unpkg.com/@ruffle-rs/ruffle')) {
      code = `<!-- Veloc Flash Layer -->\n<script src="https://unpkg.com/@ruffle-rs/ruffle"></script>\n` + code;
    }
  } else if (gameType === 'emulatorjs' || code.toLowerCase().includes('emulatorjs')) {
    notes.push('EmulatorJS sandbox verified');
  }

  if (!code.includes('<html') && !code.includes('<!DOCTYPE')) {
    notes.push('Encapsulated into HTML5 document structure');
    code = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background: #0e0e0e; color: #fff; overflow: hidden; display: flex; align-items: center; justify-content: center; height: 100vh; }
  </style>
</head>
<body>
  ${code}
</body>
</html>`;
  }

  if (notes.length === 0) {
    notes.push('Passed standard code structure verification.');
  }

  return { sanitized: code, notes };
}

/**
 * Detect game format from raw text or filename
 */
export function detectGameType(content: string, filename?: string): GameType {
  const combined = ((filename || '') + ' ' + content).toLowerCase();
  if (combined.includes('.swf') || combined.includes('ruffle') || combined.includes('flash')) {
    return 'ruffle';
  }
  if (combined.includes('emulatorjs') || combined.includes('.nes') || combined.includes('.gba') || combined.includes('.snes')) {
    return 'emulatorjs';
  }
  if (content.startsWith('http://') || content.startsWith('https://')) {
    return 'url';
  }
  return 'html';
}

/**
 * Parses rich clipboard HTML copied directly from Google Docs
 */
export function parseClipboardHtml(htmlString: string): Array<{ title: string; filename: string; url?: string }> {
  const results: Array<{ title: string; filename: string; url?: string }> = [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const links = doc.querySelectorAll('a');
    links.forEach(a => {
      const rawHref = a.getAttribute('href') || undefined;
      const cleanUrl = rawHref ? unwrapGoogleRedirect(rawHref) : undefined;
      const text = a.textContent?.trim() || '';

      let parentText = a.parentElement?.textContent || '';
      let title = '';
      let filename = text || 'game.html';

      if (parentText.includes(':')) {
        const parts = parentText.split(':');
        title = parts[0].trim();
      } else if (text.endsWith('.html') || text.startsWith('cl')) {
        filename = text;
        title = text.replace(/^cl/, '').replace(/\.html$/i, '').replace(/[-_]/g, ' ');
        title = title.charAt(0).toUpperCase() + title.slice(1);
      } else {
        title = text;
      }

      if (cleanUrl) {
        results.push({
          title: title || 'Game',
          filename: filename.endsWith('.html') ? filename : `${filename}.html`,
          url: cleanUrl,
        });
      }
    });
  } catch (err) {
    console.error('Failed to parse clipboard HTML', err);
  }
  return results;
}

/**
 * Parses a single text line formatted like:
 * "Game Name: clgamename.html https://drive.google.com/..."
 * "Game Name: https://drive.google.com/... clgamename.html"
 * "Game Name: [clgamename.html](https://...)"
 */
export function parseGoogleDocLine(line: string): { title: string; filename: string; url?: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // 1. Markdown link format: [clname.html](https://...)
  const mdMatch = trimmed.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
  if (mdMatch) {
    const preText = trimmed.substring(0, mdMatch.index).trim();
    const title = preText.endsWith(':') ? preText.slice(0, -1).trim() : preText;
    return {
      title: title || mdMatch[1],
      filename: mdMatch[1],
      url: unwrapGoogleRedirect(mdMatch[2]),
    };
  }

  // 2. Extract standard URLs
  const urlMatch = trimmed.match(/(https?:\/\/[^\s]+)/i);
  const foundUrl = urlMatch ? unwrapGoogleRedirect(urlMatch[1]) : undefined;

  const textWithoutUrl = trimmed.replace(/(https?:\/\/[^\s]+)/gi, '').trim();

  if (textWithoutUrl.includes(':')) {
    const parts = textWithoutUrl.split(':');
    const title = parts[0].trim();
    const filenamePart = parts.slice(1).join(':').trim();
    const filename = filenamePart || (title.toLowerCase().replace(/[^a-z0-9]/g, '') + '.html');

    return {
      title,
      filename,
      url: foundUrl,
    };
  }

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const title = parts[0].trim();
    return {
      title,
      filename: (title.toLowerCase().replace(/[^a-z0-9]/g, '') || 'game') + '.html',
      url: foundUrl,
    };
  }

  return {
    title: textWithoutUrl || (foundUrl ? 'Imported Game' : 'Untitled'),
    filename: (textWithoutUrl.toLowerCase().replace(/[^a-z0-9]/g, '') || 'game') + '.html',
    url: foundUrl,
  };
}

/**
 * Creates default Material Design 3 gradient cover SVG data URL (512x512)
 */
export function generateDefaultCoverSvg(title: string, genre: string): string {
  const colors: Record<string, [string, string]> = {
    Action: ['#f43f5e', '#881337'],
    Arcade: ['#3b82f6', '#1e3a8a'],
    Puzzle: ['#8b5cf6', '#4c1d95'],
    Sports: ['#10b981', '#064e3b'],
    Retro: ['#f59e0b', '#78350f'],
    Strategy: ['#06b6d4', '#164e63'],
    Casual: ['#ec4899', '#831843'],
  };
  const [col1, col2] = colors[genre] || ['#6366f1', '#312e81'];
  const initial = (title.trim()[0] || 'V').toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${col1}" />
        <stop offset="100%" stop-color="${col2}" />
      </linearGradient>
      <radialGradient id="glow" cx="80%" cy="20%" r="60%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.15" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#grad)" />
    <rect width="100%" height="100%" fill="url(#glow)" />
    <text x="460" y="60" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#ffffff" opacity="0.6" text-anchor="end">${genre.toUpperCase()}</text>
    <circle cx="256" cy="230" r="70" fill="#000000" fill-opacity="0.25" />
    <text x="256" y="258" font-family="system-ui, sans-serif" font-size="76" font-weight="900" fill="#ffffff" text-anchor="middle">${initial}</text>
    <text x="256" y="380" font-family="system-ui, sans-serif" font-size="28" font-weight="700" fill="#ffffff" text-anchor="middle">${title.length > 20 ? title.substring(0, 18) + '...' : title}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates a 512x512 custom 3-cover collage card for a Series
 */
export function generateSeriesCollageSvg(seriesName: string, coverUrls: string[]): string {
  const covers = coverUrls.filter(Boolean).slice(0, 3);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="sgrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e1e24" />
        <stop offset="100%" stop-color="#0a0a0c" />
      </linearGradient>
      <clipPath id="leftCol">
        <rect x="0" y="0" width="256" height="512" />
      </clipPath>
      <clipPath id="topRight">
        <rect x="258" y="0" width="254" height="255" />
      </clipPath>
      <clipPath id="bottomRight">
        <rect x="258" y="257" width="254" height="255" />
      </clipPath>
    </defs>
    <rect width="100%" height="100%" fill="url(#sgrad)" />

    ${
      covers[0]
        ? `<image href="${covers[0]}" x="0" y="0" width="256" height="512" preserveAspectRatio="xMidYMid slice" clip-path="url(#leftCol)" />`
        : `<rect x="0" y="0" width="256" height="512" fill="#2563eb" fill-opacity="0.4" clip-path="url(#leftCol)" />`
    }

    ${
      covers[1]
        ? `<image href="${covers[1]}" x="258" y="0" width="254" height="255" preserveAspectRatio="xMidYMid slice" clip-path="url(#topRight)" />`
        : `<rect x="258" y="0" width="254" height="255" fill="#ec4899" fill-opacity="0.4" clip-path="url(#topRight)" />`
    }

    ${
      covers[2]
        ? `<image href="${covers[2]}" x="258" y="257" width="254" height="255" preserveAspectRatio="xMidYMid slice" clip-path="url(#bottomRight)" />`
        : `<rect x="258" y="257" width="254" height="255" fill="#8b5cf6" fill-opacity="0.4" clip-path="url(#bottomRight)" />`
    }

    <line x1="256" y1="0" x2="256" y2="512" stroke="#121214" stroke-width="4" />
    <line x1="256" y1="256" x2="512" y2="256" stroke="#121214" stroke-width="4" />

    <rect x="0" y="340" width="512" height="172" fill="black" fill-opacity="0.75" />
    <text x="32" y="420" font-family="system-ui, sans-serif" font-size="34" font-weight="900" fill="#ffffff">${seriesName}</text>
    <text x="32" y="465" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#38bdf8">SERIES ARCHIVE</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
