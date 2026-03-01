const form = document.getElementById("quiz-form");
const topicsInput = document.getElementById("topics");
const sourcesInput = document.getElementById("sources");
const sourceFilesInput = document.getElementById("source-files");
const numQuestionsInput = document.getElementById("num-questions");
const difficultySelect = document.getElementById("difficulty");
const questionsContainer = document.getElementById("questions");
const emptyState = document.getElementById("empty-state");
const statusEl = document.getElementById("status");
const resultsMeta = document.getElementById("results-meta");
const generateBtn = document.getElementById("generate-btn");
const generateLabel = document.getElementById("generate-label");
const generateSpinner = document.getElementById("generate-spinner");

let currentQuestions = [];
let quizPhase = "idle"; // idle | taking | results

function setLoading(isLoading) {
  if (isLoading) {
    generateBtn.setAttribute("disabled", "true");
    generateLabel.textContent = "Generating…";
    generateSpinner.style.display = "inline-block";
    statusEl.classList.remove("error");
    statusEl.textContent = "Talking to the model…";
  } else {
    generateBtn.removeAttribute("disabled");
    generateLabel.textContent = "Generate quiz";
    generateSpinner.style.display = "none";
  }
}

function parseTopics(raw) {
  if (!raw) return [];
  return raw
    .split(/[\n,]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function renderTakingPhase(questions) {
  questionsContainer.innerHTML = "";
  emptyState.style.display = "none";
  resultsMeta.textContent = `${questions.length} questions — select answers, then submit`;

  questions.forEach((q, idx) => {
    const card = document.createElement("article");
    card.className = "question-card";
    card.dataset.questionIndex = idx;

    const header = document.createElement("div");
    header.className = "question-header";
    const indexBadge = document.createElement("div");
    indexBadge.className = "question-index";
    indexBadge.textContent = `Q${idx + 1}`;
    header.appendChild(indexBadge);
    card.appendChild(header);

    const text = document.createElement("div");
    text.className = "question-text";
    text.textContent = q.question || "";
    card.appendChild(text);

    if (Array.isArray(q.options) && q.options.length) {
      const list = document.createElement("div");
      list.className = "options";
      q.options.forEach((opt, optIdx) => {
        const label = document.createElement("label");
        label.className = "option-row";
        label.style.cursor = "pointer";
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = `q-${idx}`;
        radio.value = opt;
        radio.dataset.optionIndex = optIdx;
        const span = document.createElement("span");
        span.textContent = opt;
        label.appendChild(radio);
        label.appendChild(span);
        list.appendChild(label);
      });
      card.appendChild(list);
    }

    questionsContainer.appendChild(card);
  });

  const submitWrapper = document.createElement("div");
  submitWrapper.style.marginTop = "16px";
  const submitBtn = document.createElement("button");
  submitBtn.type = "button";
  submitBtn.className = "btn-primary btn-submit-quiz";
  submitBtn.textContent = "Submit answers";
  submitBtn.addEventListener("click", () => showResults());
  submitWrapper.appendChild(submitBtn);
  questionsContainer.appendChild(submitWrapper);
}

function showResults() {
  const userAnswers = {};
  currentQuestions.forEach((_, idx) => {
    const radio = document.querySelector(`input[name="q-${idx}"]:checked`);
    userAnswers[idx] = radio ? radio.value : null;
  });

  quizPhase = "results";
  renderResultsPhase(currentQuestions, userAnswers);
}

function renderResultsPhase(questions, userAnswers) {
  questionsContainer.innerHTML = "";
  emptyState.style.display = "none";

  let correctCount = 0;
  questions.forEach((q, idx) => {
    const userAnswer = userAnswers[idx];
    const isCorrect =
      q.answer && userAnswer && userAnswer.trim() === q.answer.trim();
    if (isCorrect) correctCount++;

    const card = document.createElement("article");
    card.className = "question-card";

    const header = document.createElement("div");
    header.className = "question-header";
    const indexBadge = document.createElement("div");
    indexBadge.className = "question-index";
    indexBadge.textContent = `Q${idx + 1}`;
    const resultBadge = document.createElement("span");
    resultBadge.className = `result-badge ${isCorrect ? "correct" : "wrong"}`;
    resultBadge.textContent = isCorrect ? "Correct" : "Wrong";
    header.appendChild(indexBadge);
    header.appendChild(resultBadge);
    card.appendChild(header);

    const text = document.createElement("div");
    text.className = "question-text";
    text.textContent = q.question || "";
    card.appendChild(text);

    if (Array.isArray(q.options) && q.options.length) {
      const list = document.createElement("ul");
      list.className = "options";
      q.options.forEach((opt) => {
        const li = document.createElement("li");
        li.className = "option";
        li.textContent = opt;
        const isUserPick = userAnswer && opt.trim() === userAnswer.trim();
        const isCorrectOpt = q.answer && opt.trim() === q.answer.trim();
        if (isCorrectOpt) li.classList.add("correct");
        if (isUserPick && !isCorrectOpt) li.classList.add("wrong");
        list.appendChild(li);
      });
      card.appendChild(list);
    }

    if (q.answer) {
      const answerRow = document.createElement("div");
      answerRow.className = "answer-row";
      answerRow.innerHTML = `<span>Correct answer</span><span>${q.answer}</span>`;
      card.appendChild(answerRow);
    }

    if (q.explanation) {
      const explanation = document.createElement("div");
      explanation.className = "explanation";
      explanation.textContent = q.explanation;
      card.appendChild(explanation);
    }

    questionsContainer.appendChild(card);
  });

  resultsMeta.textContent = `${correctCount} / ${questions.length} correct`;
  statusEl.textContent = "Here are your results.";
}

function renderQuestions(questions) {
  currentQuestions = questions || [];
  quizPhase = "taking";
  renderTakingPhase(currentQuestions);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  statusEl.textContent = "";
  statusEl.classList.remove("error");

  const topics = parseTopics(topicsInput.value);
  const sourceText = (sourcesInput.value || "").trim();
  const numQuestions = parseInt(numQuestionsInput.value || "10", 10);
  const difficulty = difficultySelect.value || "mixed";
  const files = sourceFilesInput ? sourceFilesInput.files : [];

  if (!topics.length) {
    statusEl.textContent = "Add at least one topic.";
    statusEl.classList.add("error");
    return;
  }

  const hasFiles = files && files.length > 0;
  const hasText = sourceText.length > 0;
  if (!hasFiles && !hasText) {
    statusEl.textContent =
      "Upload PDF/DOCX files or paste source text (or both).";
    statusEl.classList.add("error");
    return;
  }

  setLoading(true);

  try {
    let response;

    if (hasFiles) {
      const formData = new FormData();
      formData.append("topics", topics.join("\n"));
      formData.append("num_questions", numQuestions);
      formData.append("difficulty", difficulty);
      formData.append("sources_text", sourceText);
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      response = await fetch("/api/quiz/generate-from-files", {
        method: "POST",
        body: formData,
      });
    } else {
      response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topics,
          sources: [{ title: "User input", content: sourceText }],
          num_questions: numQuestions,
          difficulty,
        }),
      });
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message =
        (errorBody && (errorBody.detail || errorBody.message)) ||
        `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    const data = await response.json();
    renderQuestions(data.questions || []);
    statusEl.textContent = "Quiz ready. Select your answers, then click Submit.";
  } catch (error) {
    console.error(error);
    statusEl.textContent = `Error generating quiz: ${error.message}`;
    statusEl.classList.add("error");
  } finally {
    setLoading(false);
  }
});
