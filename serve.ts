#!/usr/bin/env bun
import { $ } from "bun";
import { join } from "path";

async function main() {
  console.log(`🚀 Starting server...`);
  
  // Start the server
  const server = Bun.serve({
    port: 0, // random available port
    async fetch(req) {
      const url = new URL(req.url);
      let filePath = url.pathname;
      
      // Default to index.html
      if (filePath === "/") {
        filePath = "/index.html";
      }

      try {
        const file = Bun.file(join("drawio/src/main/webapp", filePath));
        
        // Check if file exists
        if (await file.exists()) {
          return new Response(file);
        }
        
        return new Response("Not Found", { status: 404 });
      } catch (error) {
        console.error("Error serving file:", error);
        return new Response("Internal Server Error", { status: 500 });
      }
    },
  });

  console.log(`✨ Server running at http://localhost:${server.port}`);
  console.log(`🔌 Open in dev mode: http://localhost:${server.port}?dev=1`);
  
  // Open browser
  await $`xdg-open http://localhost:${server.port}?dev=1`.quiet().catch(() => {
    console.log("💡 Could not auto-open browser. Please open manually.");
  });
}

main().catch(console.error);
