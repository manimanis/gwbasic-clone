/**
 * Simple static file server for production
 * In development, use: npm run dev (Vite dev server)
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const port = parseInt(process.env.PORT || "3000", 10);

const staticPath =
  process.env.NODE_ENV === "production"
    ? path.resolve(__dirname, "public")
    : path.resolve(__dirname, "..", "dist", "public");

const server = http.createServer((req, res) => {
  let urlPath = req.url || "/";
  
  // Remove query strings
  const queryIndex = urlPath.indexOf("?");
  if (queryIndex !== -1) urlPath = urlPath.substring(0, queryIndex);

  // Default to index.html
  if (urlPath === "/" || !path.extname(urlPath)) {
    urlPath = "/index.html";
  }

  const filePath = path.join(staticPath, urlPath);
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // For SPA routing, serve index.html for any non-file route
      if (err.code === "ENOENT" && !path.extname(urlPath)) {
        fs.readFile(path.join(staticPath, "index.html"), (err2, data2) => {
          if (err2) {
            res.writeHead(500);
            res.end("Internal Server Error");
            return;
          }
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(data2);
        });
        return;
      }
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}/`);
});