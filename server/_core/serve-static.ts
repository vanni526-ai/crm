import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export function serveStatic(app: Express) {
  // Safely get __dirname in ESM (import.meta.dirname may be undefined in some environments)
  const __dirname = import.meta.dirname ?? 
    (typeof import.meta.url === 'string' ? path.dirname(fileURLToPath(import.meta.url)) : process.cwd());
  
  // In FC environment, static files are served from /code/public
  // In regular production, they're at dist/public relative to the server
  const possiblePaths = [
    path.resolve(process.cwd(), "public"),
    path.resolve(__dirname, "public"),
    path.resolve(__dirname, "../", "../", "dist", "public"),
    path.resolve(__dirname, "..", "public"),
    "/code/public",
  ];

  let distPath = possiblePaths.find(p => fs.existsSync(p));

  if (!distPath) {
    console.error(
      `Could not find the build directory. Tried: ${possiblePaths.join(", ")}`
    );
    // Fallback: serve a simple response
    app.use("*", (_req, res) => {
      res.status(503).json({ error: "Frontend build not found" });
    });
    return;
  }

  console.log(`[Static] Serving from: ${distPath}`);
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath!, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ error: "index.html not found" });
    }
  });
}
