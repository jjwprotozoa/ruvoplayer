import cors from 'cors';
import express from 'express';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import parseHandler from './parse.js';
import xtreamHandler from './xtream.js';
import imageHandler from './image.js';

// No fetch polyfill needed - using native http/https modules

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3333;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Ruvo Player Local API is running',
    endpoints: {
      parse: '/api/parse',
      xtream: '/api/xtream',
      streamProxy: '/api/stream-proxy',
      stalker: '/api/stalker',
      health: '/health'
    }
  });
});

// Parse endpoint
app.get('/api/parse', async (req, res) => {
  try {
    const vercelReq = {
      method: req.method,
      query: req.query,
      headers: req.headers
    };
    
    const vercelRes = {
      setHeader: (name, value) => res.set(name, value),
      status: (code) => ({ json: (data) => res.status(code).json(data), end: () => res.status(code).end() }),
      statusCode: 200
    };
    
    await parseHandler(vercelReq, vercelRes);
  } catch (error) {
    res.status(500).json({ error: 'Parse endpoint error', message: error.message });
  }
});

// Convert Vercel serverless functions to Express routes
app.get('/api/xtream', async (req, res) => {
  try {
    // Mock the Vercel request/response objects
    const vercelReq = {
      method: req.method,
      query: req.query,
      headers: req.headers
    };
    
    const vercelRes = {
      setHeader: (name, value) => res.set(name, value),
      status: (code) => ({ json: (data) => res.status(code).json(data), end: () => res.status(code).end() }),
      statusCode: 200
    };
    
    await xtreamHandler(vercelReq, vercelRes);
  } catch (error) {
    res.status(500).json({ error: 'Xtream endpoint error', message: error.message });
  }
});

// Image proxy endpoint
app.get('/api/image', async (req, res) => {
  try {
    const vercelReq = {
      method: req.method,
      query: req.query,
      headers: req.headers
    };
    const vercelRes = {
      setHeader: (name, value) => res.set(name, value),
      status: (code) => ({ json: (data) => res.status(code).json(data), end: (data) => res.status(code).end(data) }),
      statusCode: 200
    };
    await imageHandler(vercelReq, vercelRes);
  } catch (error) {
    res.status(500).json({ error: 'Image endpoint error', message: error.message });
  }
});

// Handle OPTIONS requests for CORS
app.options('/api/stream-proxy', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// Stream proxy endpoint - IPTVnator-style implementation
app.get('/api/stream-proxy', async (req, res) => {
  await handleStreamProxy(req, res);
});

// Handle HEAD requests for stream proxy
app.head('/api/stream-proxy', async (req, res) => {
  await handleStreamProxy(req, res, true);
});

// Stream proxy handler function
async function handleStreamProxy(req, res, isHeadRequest = false) {
  try {
    const { streamUrl } = req.query;

    if (!streamUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing streamUrl parameter'
      });
    }

    // Validate that this is an IPTV stream URL
    if (!streamUrl.includes('.m3u8') && !streamUrl.includes('.ts') && !streamUrl.includes('.mp4') && 
        !streamUrl.includes('.mkv') && !streamUrl.includes('.avi') && !streamUrl.includes('.mov')) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid stream URL format'
      });
    }

    console.log('Proxying stream:', streamUrl);

    // Use the built-in https/http modules instead of fetch for better stream handling
    const url = new URL(streamUrl);
    const httpModule = url.protocol === 'https:' ? await import('https') : await import('http');
    
    const request = httpModule.request(streamUrl, {
      method: isHeadRequest ? 'HEAD' : 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'video',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'Referer': url.origin,
        ...(req.headers.range && { 'Range': req.headers.range }),
        ...(req.headers.authorization && { 'Authorization': req.headers.authorization })
      },
      timeout: 60000
    }, (response) => {
      console.log('Stream response status:', response.statusCode);
      console.log('Stream response headers:', response.headers);
      
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400) {
        const location = response.headers.location;
        if (location) {
          console.log('Following redirect to:', location);
          // Make a new request to the redirected URL
          return res.redirect(`/api/stream-proxy?streamUrl=${encodeURIComponent(location)}`);
        }
      }
      
      // Accept both 200 (OK) and 206 (Partial Content) responses
      if (response.statusCode !== 200 && response.statusCode !== 206) {
        res.status(response.statusCode).json({
          status: 'error',
          message: `Stream server responded with status ${response.statusCode}`
        });
        return;
      }

      // Set appropriate headers for streaming - IPTVnator style with MKV support
      let contentType = response.headers['content-type'] || 'application/octet-stream';
      
      // Special handling for MKV files - force application/octet-stream for better compatibility
      if (url.includes('.mkv') || contentType.includes('matroska')) {
        contentType = 'application/octet-stream';
        console.log('🎬 MKV file detected - using application/octet-stream content type');
      }
      
      const contentLength = response.headers['content-length'];
      const acceptRanges = response.headers['accept-ranges'] || 'bytes';
      const contentRange = response.headers['content-range'];
      
      // Enhanced CORS headers for better compatibility
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS, POST');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Range, User-Agent, Referer');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type');
      res.setHeader('Access-Control-Max-Age', '86400');
      
      // Content headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Accept-Ranges', acceptRanges);
      
      // Cache control for streaming
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Pragma', 'public');
      
      if (contentLength) res.setHeader('Content-Length', contentLength);
      if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
      if (contentRange) res.setHeader('Content-Range', contentRange);
      
      // Set status code to match the upstream response
      res.status(response.statusCode);
      
      // For HEAD requests, just send headers, no body
      if (isHeadRequest) {
        console.log('HEAD request - sending headers only');
        res.end();
        return;
      }
      
      // Pipe the response directly - this is the IPTVnator approach
      console.log('Piping stream response...');
      response.pipe(res);
      
      // Handle errors
      response.on('error', (error) => {
        console.error('Stream response error:', error);
        if (!res.headersSent) {
          res.status(500).json({
            status: 'error',
            message: 'Stream error occurred'
          });
        }
      });
    });

    request.on('error', (error) => {
      console.error('Stream request error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          status: 'error',
          message: `Failed to connect to stream: ${error.message}`
        });
      }
    });

    request.on('timeout', () => {
      console.error('Stream request timeout');
      if (!res.headersSent) {
        res.status(408).json({
          status: 'error',
          message: 'Stream request timeout'
        });
      }
      request.destroy();
    });

    request.end();

  } catch (error) {
    console.error('Stream Proxy Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        message: error.message || 'Internal server error'
      });
    }
  }
}

// Stalker endpoint (Added)
app.get('/api/stalker', async (req, res) => {
  try {
    // Mock the Vercel request/response objects
    const vercelReq = {
      method: req.method,
      query: req.query,
      headers: req.headers
    };
    
    const vercelRes = {
      setHeader: (name, value) => res.set(name, value),
      status: (code) => ({ json: (data) => res.status(code).json(data), end: () => res.status(code).end() }),
      statusCode: 200
    };
    
    // For now, return a basic response since we don't have a stalker handler
    res.json({ 
      status: 'OK', 
      message: 'Stalker endpoint is available',
      payload: { message: 'Stalker functionality not yet implemented' }
    });
  } catch (error) {
    res.status(500).json({ error: 'Stalker endpoint error', message: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Ruvo Player Local API is running' });
});

// Health check endpoint (alias under /api for compatibility with frontend health checks)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Ruvo Player Local API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Ruvo Player Local API server running on http://localhost:${PORT}`);
  console.log(`📡 Parse endpoint: http://localhost:${PORT}/api/parse`);
  console.log(`📡 Xtream endpoint: http://localhost:${PORT}/api/xtream`);
  console.log(`📡 Stream proxy endpoint: http://localhost:${PORT}/api/stream-proxy`);
  console.log(`📡 Stalker endpoint: http://localhost:${PORT}/api/stalker`);
  console.log(`📡 Health endpoint: http://localhost:${PORT}/health`);
});

export default app;
