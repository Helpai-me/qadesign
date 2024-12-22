import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import { AddressInfo } from "net";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

const findAvailablePort = async (startPort: number, maxAttempts: number = 20): Promise<number> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = startPort + attempt;
    try {
      const server = createServer();

      await new Promise<void>((resolve, reject) => {
        server.once('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            log(`Puerto ${port} en uso, intentando siguiente puerto...`);
            server.close();
            resolve();
          } else {
            reject(err);
          }
        });

        server.once('listening', () => {
          const address = server.address() as AddressInfo;
          log(`Puerto ${address.port} disponible`);
          server.close(() => resolve());
        });

        server.listen(port, '0.0.0.0');
      });

      return port;
    } catch (err) {
      lastError = err as Error;
      log(`Error al intentar puerto ${port}: ${err}`);
      continue;
    }
  }

  throw new Error(`No se encontró puerto disponible después de ${maxAttempts} intentos. Último error: ${lastError?.message}`);
};

(async () => {
  try {
    const server = registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error: ${status} - ${message}`);
      res.status(status).json({ message });
    });

    // Setup Vite or static serving
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Find available port and start server
    const port = await findAvailablePort(5000);
    server.listen(port, "0.0.0.0", () => {
      const address = server.address() as AddressInfo;
      log(`🚀 Servidor iniciado en http://localhost:${address.port}`);
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        log(`Error: Puerto ${port} ya está en uso`);
        process.exit(1);
      } else {
        log(`Error del servidor: ${error.message}`);
        throw error;
      }
    });

  } catch (error) {
    log(`Error fatal al iniciar el servidor: ${error}`);
    process.exit(1);
  }
})();