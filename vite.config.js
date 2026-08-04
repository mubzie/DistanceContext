import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

function geocodeDevProxy() {
  return {
    name: "distance-context-geocode-proxy",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/geocode")) {
          next();
          return;
        }

        try {
          const requestUrl = new URL(req.url, "http://localhost");
          const mode = requestUrl.searchParams.get("mode") || "search";
          const upstream = new URL(
            mode === "reverse" ? "/reverse" : "/search",
            "https://nominatim.openstreetmap.org",
          );

          upstream.searchParams.set("format", "jsonv2");
          upstream.searchParams.set("accept-language", "en");
          if (mode === "reverse") {
            upstream.searchParams.set(
              "lat",
              requestUrl.searchParams.get("lat") || "",
            );
            upstream.searchParams.set(
              "lon",
              requestUrl.searchParams.get("lon") || "",
            );
            upstream.searchParams.set("zoom", "10");
          } else {
            upstream.searchParams.set(
              "q",
              requestUrl.searchParams.get("q") || "",
            );
            upstream.searchParams.set("limit", "5");
            const viewbox = requestUrl.searchParams.get("viewbox");
            if (viewbox) upstream.searchParams.set("viewbox", viewbox);
          }

          const upstreamResponse = await fetch(upstream, {
            headers: {
              Accept: "application/json",
              "User-Agent": "DistanceContext/1.0 (local development)",
            },
          });
          res.statusCode = upstreamResponse.status;
          res.setHeader(
            "Content-Type",
            upstreamResponse.headers.get("content-type") ||
              "application/json; charset=utf-8",
          );
          res.end(await upstreamResponse.text());
        } catch {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(
            JSON.stringify({
              code: "NETWORK_ERROR",
              error: "Location search is unavailable. Check your connection and try again.",
            }),
          );
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [geocodeDevProxy(), tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
});
