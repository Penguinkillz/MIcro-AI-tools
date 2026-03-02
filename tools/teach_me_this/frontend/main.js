const form       = document.getElementById("teach-form");
const topicEl    = document.getElementById("topic");
const sourcesEl  = document.getElementById("sources-text");
const filesEl    = document.getElementById("source-files");
const levelEl    = document.getElementById("level");
const styleEl    = document.getElementById("style");
const btn        = document.getElementById("explain-btn");
const btnLabel   = document.getElementById("explain-label");
const spinner    = document.getElementById("explain-spinner");
const statusEl   = document.getElementById("status");
const sectionsEl = document.getElementById("sections");
const metaEl     = document.getElementById("results-meta");
const emptyEl    = document.getElementById("empty-state");

// ── Section definitions ──────────────────────────────────────────────────────
const SECTION_DEFS = [
  { key: "simple_explanation",  label: "Simple Explanation",  icon: "💡", cls: "icon-purple" },
  { key: "detailed_explanation", label: "Detailed Explanation", icon: "📖", cls: "icon-blue" },
  { key: "real_life_example",   label: "Real-Life Example",   icon: "🌍", cls: "icon-green" },
  { key: "key_points",          label: "Key Points Summary",  icon: "📌", cls: "icon-amber" },
  { key: "practice_questions",  label: "5 Practice Questions", icon: "❓", cls: "icon-pink" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function setLoading(on) {
  btn.disabled = on;
  btnLabel.style.display = on ? "none" : "";
  spinner.style.display  = on ? "inline" : "none";
}

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.className   = "status" + (isError ? " error" : "");
}

function clearResults() {
  sectionsEl.innerHTML = "";
  emptyEl.style.display = "block";
  metaEl.textContent    = "Nothing yet.";
}

// ── Collapsible section card ──────────────────────────────────────────────────
function createSectionCard(def, content) {
  const card = document.createElement("div");
  card.className = "section-card";

  const header = document.createElement("div");
  header.className = "section-header";

  const iconEl = document.createElement("div");
  iconEl.className = `section-icon ${def.cls}`;
  iconEl.textContent = def.icon;

  const labelEl = document.createElement("div");
  labelEl.className = "section-label";
  labelEl.textContent = def.label;

  const chevron = document.createElement("div");
  chevron.className = "section-chevron";
  chevron.textContent = "▼";

  header.append(iconEl, labelEl, chevron);

  const body = document.createElement("div");
  body.className = "section-body";

  // Render arrays (key_points, practice_questions) differently
    if (Array.isArray(content)) {
    if (def.key === "practice_questions") {
      const list = document.createElement("div");
      list.className = "practice-list";
      content.forEach((q, i) => {
        const item = document.createElement("div");
        item.className = "practice-item";

        const qRow = document.createElement("div");
        qRow.className = "practice-question-row";

        const num = document.createElement("span");
        num.className = "practice-num";
        num.textContent = `Q${i + 1}`;

        const qText = document.createElement("span");
        qText.className = "practice-q-text";
        qText.textContent = q.question ?? q;

        const toggle = document.createElement("span");
        toggle.className = "practice-toggle";
        toggle.textContent = "Show answer";

        qRow.append(num, qText, toggle);

        const answerEl = document.createElement("div");
        answerEl.className = "practice-answer";
        answerEl.textContent = q.answer ?? "";

        toggle.addEventListener("click", () => {
          const open = answerEl.classList.toggle("open");
          toggle.textContent = open ? "Hide answer" : "Show answer";
        });

        item.append(qRow, answerEl);
        list.appendChild(item);
      });
      body.appendChild(list);
    } else {
      const ul = document.createElement("ul");
      content.forEach(pt => {
        const li = document.createElement("li");
        li.textContent = pt;
        ul.appendChild(li);
      });
      body.appendChild(ul);
    }
  } else {
    body.textContent = content;
  }

  card.append(header, body);

  // Toggle open/close
  header.addEventListener("click", () => {
    const isOpen = body.classList.contains("open");
    body.classList.toggle("open", !isOpen);
    header.classList.toggle("open", !isOpen);
    chevron.classList.toggle("open", !isOpen);
  });

  return card;
}

// ── Render full response ──────────────────────────────────────────────────────
function renderResult(data) {
  sectionsEl.innerHTML = "";
  emptyEl.style.display = "none";
  metaEl.textContent = `${data.level} · ${data.style}`;

  const s = data.sections;

  SECTION_DEFS.forEach((def, idx) => {
    const content = s[def.key];
    const card = createSectionCard(def, content);

    // Auto-open first two sections
    if (idx < 2) {
      card.querySelector(".section-body").classList.add("open");
      card.querySelector(".section-header").classList.add("open");
      card.querySelector(".section-chevron").classList.add("open");
    }

    sectionsEl.appendChild(card);
  });
}

// ── Determine which endpoint to call ─────────────────────────────────────────
async function callApi() {
  const topic      = topicEl.value.trim();
  const sourcesText = sourcesEl.value.trim();
  const files      = filesEl.files;
  const level      = levelEl.value;
  const style      = styleEl.value;

  const hasFiles = files && files.length > 0;
  const hasSources = sourcesText.length > 0;

  if (!topic && !hasFiles && !hasSources) {
    throw new Error("Enter a topic, paste some text, or upload a file.");
  }

  // If only a topic (no files, no pasted text) → use JSON endpoint
  if (topic && !hasFiles && !hasSources) {
    const res = await fetch("/api/teach/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, level, style }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Server error ${res.status}`);
    }
    return res.json();
  }

  // Otherwise → multipart endpoint
  const fd = new FormData();
  fd.append("level", level);
  fd.append("style", style);
  fd.append("topic_hint", topic);
  fd.append("sources_text", sourcesText);
  for (const f of files) fd.append("files", f);

  const res = await fetch("/api/teach/explain-from-files", {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server error ${res.status}`);
  }
  return res.json();
}

// ── Form submit ───────────────────────────────────────────────────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setLoading(true);
  setStatus("Thinking…");
  clearResults();

  try {
    const data = await callApi();
    renderResult(data);
    setStatus("");
  } catch (err) {
    setStatus(err.message || "Something went wrong.", true);
  } finally {
    setLoading(false);
  }
});
