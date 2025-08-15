export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ status: 'error', message: 'Missing url parameter' });
    }

    const target = new URL(url);
    const response = await fetch(target.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': target.origin
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ status: 'error', message: `Upstream responded ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length, Cache-Control');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).end(buffer);
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
}


