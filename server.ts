import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to unwrap google.com/url?q= redirects
function unwrapGoogleRedirect(url: string): string {
  try {
    if (url.includes('google.com/url') && url.includes('q=')) {
      const parsed = new URL(url);
      const target = parsed.searchParams.get('q');
      if (target) return decodeURIComponent(target);
    }
  } catch {}
  return url;
}

// Helper to convert Google Drive share URL to direct download URL
function normalizeDownloadUrl(rawUrl: string): string {
  const cleanUrl = unwrapGoogleRedirect(rawUrl);
  const driveMatch = cleanUrl.match(/(?:file\/d\/|id=|open\?id=)([a-zA-Z0-9_-]{20,})/);
  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
  }
  return cleanUrl;
}

// API endpoint to download HTML game file from Google Drive or external URL
app.post('/api/download-game', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid URL' });
    }

    const downloadUrl = normalizeDownloadUrl(url.trim());

    const response = await fetch(downloadUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to download file from link (HTTP ${response.status})`,
      });
    }

    let text = await response.text();

    // Check if Google Drive returned a "virus scan warning / download confirm" HTML page instead of the file
    if (text.includes('drive.google.com') && text.includes('confirm=')) {
      const confirmMatch = text.match(/href="(\/uc\?export=download[^"]*confirm=[^"]*)"/);
      if (confirmMatch && confirmMatch[1]) {
        const confirmUrl = 'https://drive.google.com' + confirmMatch[1].replace(/&amp;/g, '&');
        const confirmRes = await fetch(confirmUrl, { redirect: 'follow' });
        if (confirmRes.ok) {
          text = await confirmRes.text();
        }
      }
    }

    return res.json({
      success: true,
      content: text,
      size: text.length,
      originalUrl: url,
    });
  } catch (error: any) {
    console.error('Error downloading game file:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to download game from provided link',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, () => {
    console.log(`Veloc server running on http://localhost:${port}`);
  });
}

startServer();
