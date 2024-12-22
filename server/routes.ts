import type { Express } from "express";
import { createServer, type Server } from "http";

export function registerRoutes(app: Express): Server {
  // Handle CORS for image loading
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  // Add image proxy endpoint to handle CORS issues with external images
  app.get('/api/proxy-image', async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) {
        return res.status(400).json({ error: 'Image URL is required' });
      }

      const response = await fetch(imageUrl);
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to fetch image' });
      }

      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      response.body?.pipe(res);
    } catch (error) {
      res.status(500).json({ error: 'Failed to proxy image' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
