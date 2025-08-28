// server/index.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import crypto from "crypto";
import { configDotenv } from "dotenv";

configDotenv();

const app = express();
app.use(cors());
app.use(express.json());

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
if (!MISTRAL_API_KEY) {
  console.warn("⚠️  Missing MISTRAL_API_KEY in environment.");
}

// Tiny in-memory cache (LRU-ish with TTL)
const CACHE_TTL_MS = 60_000; // 1 minute
const CACHE_MAX = 200;
const cache = new Map(); // key -> { value, t }

function cacheGet(key) {
  const v = cache.get(key);
  if (!v) return null;
  if (Date.now() - v.t > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  // refresh recency
  cache.delete(key);
  cache.set(key, v);
  return v.value;
}
function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) {
    // evict oldest
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, { value, t: Date.now() });
}

function keyFor({ text, conciseness, professionalism }) {
  const h = crypto.createHash("sha256");
  h.update(text);
  h.update(String(conciseness));
  h.update(String(professionalism));
  return h.digest("hex");
}

app.post("/api/tone", async (req, res) => {
  try {
    const { text, conciseness, professionalism } = req.body || {};
    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Text is required." });
    }
    const c = Number(conciseness);
    const p = Number(professionalism);
    if (
      !Number.isFinite(c) ||
      !Number.isFinite(p) ||
      c < -50 ||
      c > 50 ||
      p < -50 ||
      p > 50
    ) {
      return res
        .status(400)
        .json({ error: "Scores must be numbers in [-50, 50]." });
    }

    const cacheKey = keyFor({ text, conciseness: c, professionalism: p });
    const cached = cacheGet(cacheKey);
    if (cached) return res.json({ text: cached, cached: true });

    const system = [
      "You are a rewriting assistant.",
      "Rewrite the user's text according to two sliders:",
      "- Conciseness (-50 = very concise; +50 = very expanded).",
      "- Professionalism (-50 = professional; +50 = casual).",
      "Do not add disclaimers, keep meaning intact, and keep language consistent with the source.",
      "Please ensure that you only output the data based on the input data. Nothing additional on your end",
    ].join(" ");

    const userPrompt = `Rewrite the following text.
        Conciseness: ${c}  (-50=Concise, +50=Expanded)
        Professionalism: ${p}  (-50=Professional, +50=Casual)

        Text:
        ${text}`;

    // Mistral chat completions
    const apiRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mistral-small",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 2048,
      }),
      timeout: 20000,
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text().catch(() => "");
      return res.status(502).json({
        error: `Mistral API error (${apiRes.status})`,
        details: errText.slice(0, 300),
      });
    }

    const data = await apiRes.json();
    const rewritten = data?.choices?.[0]?.message?.content?.trim();
    if (!rewritten)
      return res
        .status(500)
        .json({ error: "Invalid API response: empty content" });

    cacheSet(cacheKey, rewritten);
    res.json({ text: rewritten });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: `${err}` });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Tone server running on http://localhost:${PORT}`)
);
