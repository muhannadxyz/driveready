/**
 * Permit quiz: one question at a time, immediate feedback, localStorage for wrong IDs.
 *
 * WHY track wrong question IDs: lets teens revisit weak spots without rebuilding a quiz engine.
 */

(function () {
  const { initNav, initFooter, getQueryState } = window.DriveReadyCommon;

  const LS_PREFIX = 'driveready_wrong_';

  let stateMeta = null;
  /** @type {{ id: number, question: string, option_a: string, option_b: string, option_c: string, option_d: string | null, correct_answer: string, explanation: string, category: string }[]} */
  let questions = [];
  let index = 0;
  let correctCount = 0;
  /** ids missed in this session (deduped) */
  const missedIds = new Set();

  /**
   * Returns localStorage key for wrong-question IDs for a state code.
   */
  function wrongKey(code) {
    return `${LS_PREFIX}${code}`;
  }

  /**
   * Loads stored wrong IDs as JSON array of numbers.
   */
  function loadWrongIds(code) {
    try {
      const raw = localStorage.getItem(wrongKey(code));
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter((n) => Number.isInteger(n)) : [];
    } catch {
      return [];
    }
  }

  /**
   * Persists wrong IDs; merges with previous misses from this session.
   */
  function saveWrongIds(code, ids) {
    const merged = new Set([...loadWrongIds(code), ...ids]);
    localStorage.setItem(wrongKey(code), JSON.stringify([...merged]));
  }

  /**
   * Updates the “review mistakes” button state from storage.
   */
  function refreshWrongButton(code) {
    const btn = document.getElementById('review-wrongs');
    const ids = loadWrongIds(code);
    btn.disabled = ids.length === 0;
    document.getElementById('wrong-hint').textContent =
      ids.length > 0
        ? `You have ${ids.length} question(s) saved to review on this device.`
        : 'Questions you miss are saved on this device for a quick review session.';
  }

  /**
   * Fetches shuffled quiz payload for the selected state.
   */
  async function fetchQuiz(code) {
    const res = await fetch(`/api/quiz/${encodeURIComponent(code)}`);
    if (!res.ok) throw new Error('quiz');
    return res.json();
  }

  /**
   * Renders the current question and optional fourth choice.
   */
  function showQuestion() {
    const q = questions[index];
    document.getElementById('quiz-progress').textContent = `Question ${index + 1} of ${questions.length}`;
    document.getElementById('quiz-score-inline').textContent = `${correctCount} correct`;
    document.getElementById('quiz-cat').textContent = q.category || 'General';
    document.getElementById('quiz-qtext').textContent = q.question;
    const opts = document.getElementById('quiz-options');
    opts.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];
    const texts = [q.option_a, q.option_b, q.option_c, q.option_d];
    texts.forEach((text, i) => {
      if (text == null || text === '') return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'w-full text-left rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm hover:border-emerald-400 hover:bg-emerald-50 transition';
      btn.textContent = `${letters[i]}. ${text}`;
      btn.addEventListener('click', () => answer(letters[i]));
      opts.appendChild(btn);
    });
    document.getElementById('quiz-feedback').classList.add('hidden');
  }

  /**
   * Compares chosen letter to correct_answer and records misses for storage.
   */
  function answer(letter) {
    const q = questions[index];
    const ok = letter === q.correct_answer;
    if (ok) correctCount += 1;
    else {
      missedIds.add(q.id);
    }

    const fb = document.getElementById('quiz-feedback');
    const title = document.getElementById('feedback-title');
    const expl = document.getElementById('feedback-expl');
    fb.classList.remove('hidden');
    title.textContent = ok ? 'Correct' : 'Incorrect';
    title.className = ok ? 'font-semibold text-emerald-700 mb-2' : 'font-semibold text-red-700 mb-2';
    expl.textContent = q.explanation;

    // WHY: colour every button after answering so the user can see the right answer
    // even when they chose wrong — dark green = correct, red = their wrong pick.
    const letters = ['A', 'B', 'C', 'D'];
    document.getElementById('quiz-options').querySelectorAll('button').forEach((b, i) => {
      b.disabled = true;
      const btnLetter = letters[i];
      if (btnLetter === q.correct_answer) {
        b.className = 'w-full text-left rounded-xl border-2 border-emerald-700 bg-emerald-700 px-4 py-3 text-sm text-white font-semibold transition';
      } else if (btnLetter === letter && !ok) {
        b.className = 'w-full text-left rounded-xl border-2 border-red-500 bg-red-500 px-4 py-3 text-sm text-white font-semibold transition';
      } else {
        b.className = 'w-full text-left rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400 transition';
      }
    });
  }

  /**
   * Advances or finishes; persists wrong IDs when the quiz completes.
   */
  function next() {
    index += 1;
    if (index >= questions.length) {
      finishQuiz();
      return;
    }
    showQuestion();
  }

  /**
   * Shows pass/fail vs state threshold and saves wrong-question IDs.
   */
  function finishQuiz() {
    document.getElementById('quiz-run').classList.add('hidden');
    document.getElementById('quiz-summary').classList.remove('hidden');
    const pct = Math.round((100 * correctCount) / questions.length);
    const need = stateMeta.passing_score;
    const passed = pct >= need;
    document.getElementById('summary-text').textContent = `You scored ${correctCount} out of ${questions.length} (${pct}%). Typical passing score for ${stateMeta.name} is ${need}% or higher.`;
    const passEl = document.getElementById('summary-pass');
    passEl.textContent = passed ? 'You met the practice threshold — great job!' : 'Keep practicing — review the handbook sections you missed.';
    passEl.className = passed ? 'text-lg font-semibold text-emerald-700' : 'text-lg font-semibold text-amber-800';

    const wrongFromSession = [...missedIds];
    if (wrongFromSession.length) {
      saveWrongIds(stateMeta.code, wrongFromSession);
    }
    refreshWrongButton(stateMeta.code);
  }

  /**
   * Builds a mini-quiz from only stored wrong IDs (falls back to full fetch if needed).
   */
  async function startReviewMode(code) {
    const ids = loadWrongIds(code);
    if (!ids.length) return;
    const full = await fetchQuiz(code);
    const byId = new Map(full.questions.map((q) => [q.id, q]));
    questions = ids.map((id) => byId.get(id)).filter(Boolean);
    if (!questions.length) {
      alert('Could not load saved questions — try a full quiz again.');
      return;
    }
    stateMeta = full.state;
    index = 0;
    correctCount = 0;
    missedIds.clear();
    document.getElementById('quiz-setup').classList.add('hidden');
    document.getElementById('quiz-summary').classList.add('hidden');
    document.getElementById('quiz-run').classList.remove('hidden');
    showQuestion();
  }

  initNav('quiz');
  initFooter();

  const stateSel = document.getElementById('quiz-state');

  fetch('/api/states')
    .then((r) => r.json())
    .then((states) => {
      for (const s of states) {
        const opt = document.createElement('option');
        opt.value = s.code;
        opt.textContent = `${s.name} (${s.dmv_name})`;
        stateSel.appendChild(opt);
      }
      const preset = getQueryState();
      stateSel.value = preset || 'OH';
      refreshWrongButton(stateSel.value);
    })
    .catch(() => {});

  stateSel.addEventListener('change', () => refreshWrongButton(stateSel.value));

  document.getElementById('start-quiz').addEventListener('click', async () => {
    const msg = document.getElementById('quiz-setup-msg');
    msg.textContent = '';
    const code = stateSel.value;
    try {
      const data = await fetchQuiz(code);
      if (!data.questions.length) {
        msg.textContent = 'No questions for this state yet — try Ohio.';
        return;
      }
      stateMeta = data.state;
      questions = data.questions;
      index = 0;
      correctCount = 0;
      missedIds.clear();
      document.getElementById('quiz-setup').classList.add('hidden');
      document.getElementById('quiz-summary').classList.add('hidden');
      document.getElementById('quiz-run').classList.remove('hidden');
      showQuestion();
    } catch {
      msg.textContent = 'Could not load quiz.';
    }
  });

  document.getElementById('quiz-next').addEventListener('click', next);

  document.getElementById('quiz-retry').addEventListener('click', () => {
    document.getElementById('quiz-summary').classList.add('hidden');
    document.getElementById('quiz-setup').classList.remove('hidden');
  });

  document.getElementById('review-wrongs').addEventListener('click', () => {
    const code = stateSel.value;
    startReviewMode(code).catch(() => alert('Review failed to load.'));
  });
})();
