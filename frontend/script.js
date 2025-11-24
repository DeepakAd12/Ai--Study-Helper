const explainBtn = document.getElementById("explainBtn");
const inputText = document.getElementById("inputText");
const loadingEl = document.getElementById("loading");
const resultsEl = document.getElementById("results");
const simpleExplanationEl = document.getElementById("simpleExplanation");
const bulletSummaryEl = document.getElementById("bulletSummary");
const errorEl = document.getElementById("error");

explainBtn.addEventListener("click", async () => {
  const text = inputText.value.trim();

  // reset UI
  errorEl.classList.add("hidden");
  resultsEl.classList.add("hidden");
  bulletSummaryEl.innerHTML = "";
  simpleExplanationEl.textContent = "";

  if (!text) {
    errorEl.textContent = "Please paste some text first.";
    errorEl.classList.remove("hidden");
    return;
  }

  loadingEl.classList.remove("hidden");
  explainBtn.disabled = true;

  try {
    const response = await fetch("http://localhost:5000/api/explain", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Bad response from backend:", response.status, errText);
      throw new Error("Server error");
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error("JSON parse error:", e);
      throw new Error("Invalid JSON from server");
    }

    const raw = (data && data.simpleExplanation) ? String(data.simpleExplanation) : "";

    // ---- Parse explanation + bullets safely ----
    renderExplanationAndBullets(raw);

    resultsEl.classList.remove("hidden");
  } catch (err) {
    console.error("Frontend error:", err);
    errorEl.textContent = "Something went wrong. Please try again.";
    errorEl.classList.remove("hidden");
  } finally {
    loadingEl.classList.add("hidden");
    explainBtn.disabled = false;
  }
});

/**
 * Tries to split the raw AI text into:
 *  - explanation text
 *  - bullet points (lines starting with "- ")
 * If format is unexpected, it still shows the full text as explanation.
 */
function renderExplanationAndBullets(rawText) {
  if (!rawText) {
    simpleExplanationEl.textContent = "No explanation received from AI.";
    return;
  }

  let explanationPart = String(rawText);
  let bulletsPart = "";

  // Try to split using our "Explanation: ... Bullets:" format
  try {
    const parts = String(rawText).split("Bullets:");
    if (parts.length > 1) {
      explanationPart = parts[0].replace("Explanation:", "").trim();
      bulletsPart = parts[1];
    }
  } catch (e) {
    console.warn("Could not split explanation/bullets, showing raw text.", e);
  }

  // Show explanation
  simpleExplanationEl.textContent = explanationPart || rawText;

  // Try to extract bullet lines
  if (bulletsPart) {
    const bulletLines = bulletsPart
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("- "));

    bulletSummaryEl.innerHTML = "";
    bulletLines.forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line.replace(/^-+\s*/, ""); // remove leading "- "
      bulletSummaryEl.appendChild(li);
    });
  }
}
