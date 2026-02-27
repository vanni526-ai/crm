import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { handleWechatPaymentNotify, handleAlipayPaymentNotify } from "./paymentWebhook";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Configure CORS with wildcard support for Manus domains
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }
      
      // Allow all *.manus.computer domains
      if (origin.match(/^https?:\/\/.*\.manus\.computer$/)) {
        return callback(null, true);
      }
      
      // Allow all *.manus-asia.computer domains
      if (origin.match(/^https?:\/\/.*\.manus-asia\.computer$/)) {
        return callback(null, true);
      }
      
      // Allow all *.manuspre.computer domains (preview environment)
      if (origin.match(/^https?:\/\/.*\.manuspre\.computer$/)) {
        return callback(null, true);
      }
      
      // Allow all *.manuscomputer.ai domains
      if (origin.match(/^https?:\/\/.*\.manuscomputer\.ai$/)) {
        return callback(null, true);
      }
      
      // Allow all *.manusvm.computer domains
      if (origin.match(/^https?:\/\/.*\.manusvm\.computer$/)) {
        return callback(null, true);
      }
      
      // Allow localhost for development
      if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
        return callback(null, true);
      }
      
      // Allow 127.0.0.1 for development
      if (origin.match(/^https?:\/\/127\.0\.0\.1(:\d+)?$/)) {
        return callback(null, true);
      }
      
      // Allow Expo Go app
      if (origin.startsWith('app://')) {
        return callback(null, true);
      }
      
      // Allow production domain crm.bdsm.com.cn
      if (origin === 'https://crm.bdsm.com.cn' || origin === 'http://crm.bdsm.com.cn') {
        return callback(null, true);
      }
      
      // Allow all *.bdsm.com.cn subdomains
      if (origin.match(/^https?:\/\/.*\.bdsm\.com\.cn$/)) {
        return callback(null, true);
      }
      
      // Allow custom origins from environment variable
      const customOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      if (customOrigins.some(allowed => origin === allowed || origin.endsWith(allowed))) {
        return callback(null, true);
      }
      
      // Log rejected origin for debugging
      console.warn(`[CORS] Rejected origin: ${origin}`);
      
      // Reject other origins
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'authorization', 'X-Auth-Token', 'x-auth-token'],
    exposedHeaders: ['Authorization', 'authorization', 'X-Auth-Token', 'x-auth-token'],
  }));
  
  // Handle OPTIONS preflight requests for all routes
  app.options('*', cors());
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Payment webhook routes
  app.post("/api/webhook/wechat-payment-notify", handleWechatPaymentNotify);
  app.post("/api/webhook/alipay-payment-notify", handleAlipayPaymentNotify);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  
  // Global error handler - must be after all routes
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('[Express Error]', err);
    
    // Ensure we always return JSON
    if (!res.headersSent) {
      res.status(err.status || 500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: err.message || 'Internal server error',
        },
      });
    }
  });
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
