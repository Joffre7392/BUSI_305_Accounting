/**
 * quiz-engine.js — Shared quiz engine for BUSI 305 Accounting Toolkit
 *
 * Provides:
 *  - Utility functions: rand(), pick(), shuffle(), fmt()
 *  - Deck system: non-repeating question pools with auto-reshuffle
 *  - Score tracker with streak
 *  - MC renderer (shuffled button-based answers)
 *  - Numeric input renderer + checker
 *  - JE builder (account dropdowns, debit/credit inputs)
 *  - Progress counter ("Question 12 of 104")
 *
 * Each page loads this file, then registers generators and accounts
 * via QuizEngine.init({ ... }).
 */

const QuizEngine = (() => {
    // ========== UTILITIES ==========
    function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    function fmt(n) { return Number(n).toLocaleString('en-US'); }

    // ========== DECK SYSTEM ==========
    // A deck pre-generates questions from generators, shuffles, draws sequentially.
    // When exhausted, rebuilds and reshuffles.
    function buildDeck(generators, copiesEach) {
        const pool = [];
        generators.forEach(gen => {
            for (let i = 0; i < copiesEach; i++) {
                pool.push(gen);
            }
        });
        return shuffle(pool);
    }

    // ========== STATE ==========
    let qDeck = [], qIndex = 0, qGens = [], qCopies = 8;
    let jeDeck = [], jeIndex = 0, jeGens = [], jeCopies = 2;
    let pCorrect = 0, pTotal = 0, pStreak = 0;
    let curQ = null, curJE = null;
    let jeAccounts = [];
    let accentColor = 'teal'; // page accent for button styling

    function resetQDeck() {
        qDeck = buildDeck(qGens, qCopies);
        qIndex = 0;
    }
    function resetJEDeck() {
        jeDeck = buildDeck(jeGens, jeCopies);
        jeIndex = 0;
    }
    function nextQ() {
        if (qIndex >= qDeck.length) resetQDeck();
        return qDeck[qIndex++]();
    }
    function nextJE() {
        if (jeIndex >= jeDeck.length) resetJEDeck();
        return jeDeck[jeIndex++]();
    }

    // ========== SCORE ==========
    function updateScoreUI() {
        const ce = document.getElementById('p-correct');
        const te = document.getElementById('p-total');
        const se = document.getElementById('p-streak');
        if (ce) ce.textContent = pCorrect;
        if (te) te.textContent = pTotal;
        if (se) se.textContent = pStreak;
        // Progress counter
        const pc = document.getElementById('p-progress');
        if (pc) pc.textContent = 'Question ' + Math.min(qIndex, qDeck.length) + ' of ' + qDeck.length;
    }

    function recordAnswer(correct) {
        pTotal++;
        if (correct) { pCorrect++; pStreak++; } else { pStreak = 0; }
        updateScoreUI();
    }

    // ========== FEEDBACK ==========
    function showFeedback(elemId, correct, explanation) {
        const fb = document.getElementById(elemId);
        if (!fb) return;
        fb.classList.remove('hidden');
        const c = correct ? 'emerald' : 'rose';
        fb.innerHTML = '<div class="bg-' + c + '-500/10 border border-' + c + '-500/30 rounded-lg p-4">' +
            '<p class="font-bold text-' + c + '-400 mb-1">' + (correct ? 'Correct!' : 'Not quite.') + '</p>' +
            '<p class="text-sm text-slate-300">' + explanation + '</p></div>';
    }

    // ========== MC RENDERER ==========
    function renderMC(question, answerDivId, feedbackDivId) {
        curQ = question;
        const qDiv = document.getElementById('p-question');
        qDiv.innerHTML = '<p class="text-slate-300 text-sm">' + question.question + '</p>';

        const ans = document.getElementById(answerDivId);
        ans.classList.remove('hidden');
        document.getElementById('p-check-btn').classList.add('hidden');
        document.getElementById(feedbackDivId).classList.add('hidden');

        // Shuffle options and track correct index
        const indices = question.options.map((_, i) => i);
        const shuffled = shuffle(indices);
        const letters = 'ABCDEFGH';

        ans.innerHTML = shuffled.map((origIdx, displayIdx) => {
            return '<button onclick="QuizEngine.checkMC(' + origIdx + ')" ' +
                'class="qe-mc-btn w-full text-left bg-slate-900/60 hover:bg-slate-700/60 border border-slate-600 rounded-lg p-3 transition-colors text-sm mb-2">' +
                '<span class="font-semibold text-slate-400 mr-2">' + letters[displayIdx] + '.</span>' +
                question.options[origIdx] + '</button>';
        }).join('');
    }

    function renderNumeric(question, answerDivId, feedbackDivId) {
        curQ = question;
        const qDiv = document.getElementById('p-question');
        qDiv.innerHTML = '<p class="text-slate-300 text-sm">' + question.question + '</p>';

        const ans = document.getElementById(answerDivId);
        ans.classList.remove('hidden');
        ans.innerHTML = '<input type="number" id="p-num" class="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white w-48" placeholder="Enter amount">';
        document.getElementById('p-check-btn').classList.remove('hidden');
        document.getElementById(feedbackDivId).classList.add('hidden');
    }

    // ========== ANSWER CHECKING ==========
    window.QuizEngine = window.QuizEngine || {};

    function checkMC(idx) {
        if (!curQ) return;
        const correct = idx === curQ.answer;
        recordAnswer(correct);
        showFeedback('p-feedback', correct, curQ.explanation);
        // Disable all MC buttons
        document.querySelectorAll('.qe-mc-btn').forEach(btn => {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        });
    }

    function checkNumeric() {
        if (!curQ) return;
        const inp = document.getElementById('p-num');
        if (!inp || !inp.value) return;
        const userAns = parseFloat(inp.value);
        const tolerance = Math.max(2, Math.abs(curQ.answer) * 0.01);
        const correct = Math.abs(userAns - curQ.answer) < tolerance;
        recordAnswer(correct);
        showFeedback('p-feedback', correct, curQ.explanation);
        document.getElementById('p-check-btn').classList.add('hidden');
    }

    // ========== PRACTICE QUESTION DISPATCH ==========
    function pNew() {
        const q = nextQ();
        if (q.type === 'mc') {
            renderMC(q, 'p-answer', 'p-feedback');
        } else {
            renderNumeric(q, 'p-answer', 'p-feedback');
        }
        updateScoreUI();
    }

    // ========== JE BUILDER ==========
    function makeJELine() {
        const div = document.createElement('div');
        div.className = 'flex gap-2 items-center';
        div.innerHTML = '<select class="je-acct bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-white text-sm flex-1">' +
            '<option value="">-- Account --</option>' +
            jeAccounts.map(a => '<option value="' + a + '">' + a + '</option>').join('') +
            '</select>' +
            '<input type="number" class="je-dr bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-white text-sm w-28" placeholder="Debit">' +
            '<input type="number" class="je-cr bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-white text-sm w-28" placeholder="Credit">' +
            '<button onclick="this.parentElement.remove()" class="text-slate-500 hover:text-rose-400 text-sm">\u00d7</button>';
        return div;
    }

    function jeAdd() {
        document.getElementById('je-lines').appendChild(makeJELine());
    }

    function jeNew() {
        curJE = nextJE();
        document.getElementById('je-prompt').innerHTML = '<p class="text-slate-300 text-sm">' + curJE.prompt + '</p>';
        document.getElementById('je-lines').innerHTML = '';
        document.getElementById('je-feedback').classList.add('hidden');
        // Update JE progress
        const jp = document.getElementById('je-progress');
        if (jp) jp.textContent = 'Entry ' + Math.min(jeIndex, jeDeck.length) + ' of ' + jeDeck.length;
        jeAdd(); jeAdd();
    }

    function jeCheck() {
        if (!curJE) return;
        const lines = document.getElementById('je-lines').children;
        let tDr = 0, tCr = 0, entries = [];
        for (let l of lines) {
            const a = l.querySelector('.je-acct').value;
            const d = parseFloat(l.querySelector('.je-dr').value) || 0;
            const c = parseFloat(l.querySelector('.je-cr').value) || 0;
            if (a && (d || c)) { entries.push({ acct: a, dr: d, cr: c }); tDr += d; tCr += c; }
        }
        const fb = document.getElementById('je-feedback');
        fb.classList.remove('hidden');

        if (Math.abs(tDr - tCr) > 0.01) {
            fb.innerHTML = '<div class="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4">' +
                '<p class="text-rose-400 font-bold">Debits ($' + fmt(tDr) + ') \u2260 Credits ($' + fmt(tCr) + ')</p></div>';
            return;
        }

        const ansStr = curJE.answer.map(a => a.acct + ':' + a.dr + ':' + a.cr).sort().join('|');
        const userStr = entries.map(a => a.acct + ':' + a.dr + ':' + a.cr).sort().join('|');

        if (ansStr === userStr) {
            fb.innerHTML = '<div class="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">' +
                '<p class="text-emerald-400 font-bold">Correct!</p></div>';
        } else {
            const correctHTML = curJE.answer.map(a =>
                (a.dr ? 'Dr ' + a.acct + ' ' + fmt(a.dr) : 'Cr ' + a.acct + ' ' + fmt(a.cr))
            ).join('<br>');
            fb.innerHTML = '<div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">' +
                '<p class="text-amber-400 font-bold">Not quite.</p>' +
                '<p class="text-sm text-slate-300 mt-2">Expected:<br><span class="font-mono text-xs">' + correctHTML + '</span></p></div>';
        }
    }

    // ========== INIT ==========
    function init(config) {
        qGens = config.questionGenerators || [];
        jeGens = config.jeGenerators || [];
        jeAccounts = config.jeAccounts || [];
        accentColor = config.accentColor || 'teal';
        qCopies = config.qCopies || 8;
        jeCopies = config.jeCopies || 2;
        pCorrect = 0; pTotal = 0; pStreak = 0;
        curQ = null; curJE = null;
        resetQDeck();
        resetJEDeck();
    }

    // ========== PUBLIC API ==========
    return {
        rand, pick, shuffle, fmt,
        init,
        pNew, pCheck: checkNumeric, checkMC,
        jeNew, jeAdd, jeCheck,
        updateScoreUI
    };
})();
