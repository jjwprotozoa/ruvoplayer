export default async function handler(req, res) {
  // CORS + preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Range, User-Agent, Referer');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const isHead = req.method === 'HEAD';
  try {
    const { streamUrl } = req.query;
    if (!streamUrl) {
      return res.status(400).json({ status: 'error', message: 'Missing streamUrl parameter' });
    }

    const targetUrl = new URL(streamUrl);
    const httpModule = targetUrl.protocol === 'https:' ? await import('https') : await import('http');

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'identity',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'video',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
      'Referer': targetUrl.origin,
      ...(req.headers.range ? { 'Range': req.headers.range } : {}),
      ...(req.headers.authorization ? { 'Authorization': req.headers.authorization } : {}),
    };

    const request = httpModule.request(streamUrl, {
      method: isHead ? 'HEAD' : 'GET',
      headers,
      timeout: 60000
    }, (upstream) => {
      // Handle redirects (3xx)
      if (upstream.statusCode >= 300 && upstream.statusCode < 400 && upstream.headers.location) {
        const location = upstream.headers.location;
        return res.redirect(`/api/stream-proxy?streamUrl=${encodeURIComponent(location)}`);
      }

      // Only accept 200 OK or 206 Partial Content for streaming
      if (upstream.statusCode !== 200 && upstream.statusCode !== 206) {
        return res.status(upstream.statusCode || 500).json({
          status: 'error',
          message: `Stream server responded with status ${upstream.statusCode}`,
        });
      }

      // Propagate key headers
      let contentType = upstream.headers['content-type'] || 'application/octet-stream';
      const contentLength = upstream.headers['content-length'];
      const acceptRanges = upstream.headers['accept-ranges'] || 'bytes';
      const contentRange = upstream.headers['content-range'];

      res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
      if (contentRange) res.setHeader('Content-Range', contentRange);
      res.setHeader('Cache-Control', 'no-store');

      res.status(upstream.statusCode);
      if (isHead) {
        return res.end();
      }

      upstream.on('error', (e) => {
        if (!res.headersSent) {
          res.status(500).json({ status: 'error', message: 'Upstream stream error' });
        }
      });

      upstream.pipe(res);
    });

    request.on('error', (e) => {
      if (!res.headersSent) {
        res.status(500).json({ status: 'error', message: `Failed to connect to stream: ${e.message}` });
      }
    });
    request.on('timeout', () => {
      try { request.destroy(); } catch {}
      if (!res.headersSent) {
        res.status(408).json({ status: 'error', message: 'Stream request timeout' });
      }
    });
    request.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
    }
  }
}


