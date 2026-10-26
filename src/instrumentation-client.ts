import { initBotId } from "botid/client/core";

// Attach BotID headers to grid generation calls from the /fleche page, so the
// route can reject scripted callers (see src/lib/crossword/guard-generate.ts).
// `/api/fleche/generate/*` covers the boosted endpoint.
initBotId({
  protect: [
    { path: "/api/fleche/generate", method: "POST" },
    { path: "/api/fleche/generate/*", method: "POST" },
  ],
});
