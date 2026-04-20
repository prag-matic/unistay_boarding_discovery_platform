const PORT = Bun.env.PORT || 3000;
const BASE_PATH = "./dist";

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let filePath = BASE_PATH + url.pathname;

    // 1. Handle the root path
    if (url.pathname === "/") {
      filePath = BASE_PATH + "/index.html";
    }

    const file = Bun.file(filePath);

    // 2. Check if file exists, otherwise serve index.html (for React Router)
    if (await file.exists()) {
      return new Response(file);
    } else {
      // This is crucial for SPA routing (React Router)
      return new Response(Bun.file(BASE_PATH + "/index.html"));
    }
  },
});

console.log(`🚀 Server running at http://localhost:${server.port}`);
