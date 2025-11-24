const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fetch = require("node-fetch");

dotenv.config();

const app = express();
const PORT = 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Simple logs so we can see what’s happening
console.log("Starting server...");
console.log("GEMINI_API_KEY present:", !!GEMINI_API_KEY);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is working with Gemini 🤖");
});

// --- Gemini call using REST API ---
async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing in .env");
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
    GEMINI_API_KEY;

  const body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error("Gemini HTTP error: " + response.status + " " + errText);
  }

  const data = await response.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "No response text from Gemini.";
  return text;
}

// --- Main route used by your frontend ---
app.post("/api/explain", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Text is required" });
    }

    console.log("📥 /api/explain called, text length:", text.length);

    const prompt = `
Explain the following text in simple language.
Then write 4–6 bullet points summary starting each bullet with "- ".

FORMAT EXACTLY LIKE THIS:
Explanation:
[your explanation here]

Bullets:
- [bullet 1]
- [bullet 2]
- [bullet 3]
- [bullet 4]

Text:
${text}
`;
    let aiText;

    // Call Gemini but don't let it crash everything
    try {
      aiText = await callGemini(prompt);
      console.log("✅ Gemini responded");
    } catch (err) {
      console.error("❌ Gemini error:", err.message);
      aiText =
        "AI error: " +
        err.message +
        "\n\n(But your frontend and backend connection are working fine.)";
    }

    res.json({
      simpleExplanation: aiText,
      bulletSummary: [],
    });
  } catch (error) {
    console.error("❌ Error in /api/explain handler:", error.message);
    res.status(500).json({ error: "Server error in /api/explain" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
