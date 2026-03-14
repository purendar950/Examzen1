// ═══════════════════════════════════════════════════════
//  ExamZen — flt_engine.js
//  Standalone Full Length Test engine
//  Zero dependency on app.js — safe to include separately
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── State ────────────────────────────────────────────
  var F = {
    test:       null,   // current FLT_TESTS entry
    questions:  [],
    current:    0,
    answers:    {},     // { qIndex: optionIndex }
    bookmarks:  {},     // { qIndex: true }
    timerSec:   0,
    timerInt:   null,
    submitted:  false,
  };

  // ── Helpers ──────────────────────────────────────────
  function $id(id) { return document.getElementById(id); }

  function fltShowScreen(id) {
    // Delegate to app.js showScreen when available (keeps floating controls in sync)
    if (typeof showScreen === 'function') {
      showScreen(id);
    } else {
      document.querySelectorAll('.screen').forEach(function(s) {
        s.classList.remove('active');
      });
      var el = $id(id);
      if (el) { el.classList.add('active'); window.scrollTo(0,0); }
    }
  }

  function fltToast(msg) {
    var t = $id('toastContainer');
    if (!t) return;
    var d = document.createElement('div');
    d.className = 'toast toast-info';
    d.textContent = msg;
    t.appendChild(d);
    setTimeout(function() { d.remove(); }, 2800);
  }

  function fltStripHtml(s) {
    var d = document.createElement('div');
    d.innerHTML = s;
    return d.textContent || d.innerText || '';
  }

  // ── Screen 1: FLT List ───────────────────────────────
  window.openFLTScreen = function () {
    fltBuildList();
    fltShowScreen('fltListScreen');
  };

  function fltBuildList() {
    var wrap = $id('fltCardGrid');
    if (!wrap) return;
    if (typeof FLT_TESTS === 'undefined' || !FLT_TESTS.length) {
      wrap.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:40px">No tests loaded yet.</p>';
      return;
    }
    wrap.innerHTML = FLT_TESTS.map(function(t) {
      var key = 'flt_done_' + t.id;
      var done = localStorage.getItem(key);
      var scoreHtml = done
        ? '<div class="flt-card-score">Last: ' + done + '</div>'
        : '<div class="flt-card-score flt-card-score--new">New</div>';
      return [
        '<div class="flt-card" onclick="launchFLT(' + t.id + ')">',
          '<div class="flt-card-num">Test ' + t.id + '</div>',
          '<div class="flt-card-title">' + t.title + '</div>',
          '<div class="flt-card-meta">',
            '<span>📝 ' + t.totalQ + ' Qs</span>',
            '<span>⏱ ' + t.timeMin + ' min</span>',
            '<span>➖ 0.25 neg</span>',
          '</div>',
          scoreHtml,
          '<button class="flt-start-btn">Start Test →</button>',
        '</div>'
      ].join('');
    }).join('');
  }

  // ── Screen 2: FLT Quiz ───────────────────────────────
  window.launchFLT = function (testId) {
    var test = (FLT_TESTS || []).find(function(t) { return t.id === testId; });
    if (!test) { fltToast('Test not found'); return; }

    F.test      = test;
    F.questions = test.questions;
    F.current   = 0;
    F.answers   = {};
    F.bookmarks = {};
    F.submitted = false;
    F.timerSec  = test.timeMin * 60;

    fltRebuildPalette();
    fltRenderQ();
    fltShowScreen('fltQuizScreen');
    fltStartTimer();
  };

  function fltRenderQ() {
    var q   = F.questions[F.current];
    var tot = F.questions.length;
    if (!q) return;

    // Header counts
    var el;
    el = $id('fltQNum');   if(el) el.textContent = 'Q ' + (F.current+1) + ' / ' + tot;

    // Answered / unanswered counts
    var answeredCount = Object.keys(F.answers).length;
    el = $id('fltAnswered');   if(el) el.textContent = answeredCount;
    el = $id('fltUnanswered'); if(el) el.textContent = tot - answeredCount;

    // Question text
    el = $id('fltQText'); if(el) el.textContent = q.q;

    // Options
    var optsWrap = $id('fltOptsWrap');
    if (optsWrap) {
      var labels = ['A','B','C','D','E'];
      var userAns = F.answers.hasOwnProperty(F.current) ? F.answers[F.current] : -1;
      optsWrap.innerHTML = q.opts.map(function(opt, i) {
        var sel = (userAns === i) ? ' flt-opt--selected' : '';
        return [
          '<button class="flt-opt' + sel + '" onclick="fltPickAnswer(' + i + ')">',
            '<span class="flt-opt-label">' + labels[i] + '</span>',
            '<span class="flt-opt-text">' + opt + '</span>',
          '</button>'
        ].join('');
      }).join('');
    }

    // Bookmark btn
    el = $id('fltBookmarkBtn');
    if (el) el.textContent = F.bookmarks[F.current] ? '🔖' : '☆';

    // Nav buttons
    el = $id('fltPrevBtn'); if(el) el.disabled = (F.current === 0);
    el = $id('fltNextBtn');
    if(el) {
      if (F.current === tot - 1) {
        el.textContent = 'Submit'; el.style.background = '#059669';
      } else {
        el.textContent = 'Next →'; el.style.background = '';
      }
    }

    fltUpdatePalette();
  }

  window.fltPickAnswer = function (idx) {
    if (F.submitted) return;
    F.answers[F.current] = idx;
    fltRenderQ();
    fltUpdatePalette();
  };

  window.fltClearAnswer = function () {
    delete F.answers[F.current];
    fltRenderQ();
    fltUpdatePalette();
  };

  window.fltToggleBookmark = function () {
    F.bookmarks[F.current] = !F.bookmarks[F.current];
    var el = $id('fltBookmarkBtn');
    if (el) el.textContent = F.bookmarks[F.current] ? '🔖' : '☆';
    fltUpdatePalette();
  };

  window.fltPrev = function () {
    if (F.current > 0) { F.current--; fltRenderQ(); fltScrollPaletteToActive(); }
  };

  window.fltNext = function () {
    if (F.current < F.questions.length - 1) {
      F.current++;
      fltRenderQ();
      fltScrollPaletteToActive();
    } else {
      fltConfirmSubmit();
    }
  };

  window.fltJumpTo = function (idx) {
    F.current = idx;
    fltRenderQ();
    fltScrollPaletteToActive();
    // close palette on mobile
    var pal = $id('fltPalette');
    if (pal && window.innerWidth < 768) pal.classList.remove('flt-palette--open');
  };

  // ── Palette ──────────────────────────────────────────
  function fltRebuildPalette() {
    var grid = $id('fltPaletteGrid');
    if (!grid) return;
    grid.innerHTML = F.questions.map(function(_, i) {
      return '<button class="flt-pb" id="fltpb_' + i + '" onclick="fltJumpTo(' + i + ')">' + (i+1) + '</button>';
    }).join('');
  }

  function fltUpdatePalette() {
    F.questions.forEach(function(_, i) {
      var btn = $id('fltpb_' + i);
      if (!btn) return;
      btn.className = 'flt-pb';
      if (F.answers.hasOwnProperty(i))  btn.classList.add('flt-pb--answered');
      if (F.bookmarks[i])               btn.classList.add('flt-pb--bookmarked');
      if (i === F.current)              btn.classList.add('flt-pb--active');
    });
  }

  function fltScrollPaletteToActive() {
    var btn = $id('fltpb_' + F.current);
    if (btn) btn.scrollIntoView({ block:'nearest', inline:'nearest', behavior:'smooth' });
  }

  window.fltTogglePalette = function () {
    var pal = $id('fltPalette');
    if (pal) pal.classList.toggle('flt-palette--open');
  };

  // ── Timer ────────────────────────────────────────────
  function fltStartTimer() {
    if (F.timerInt) clearInterval(F.timerInt);
    fltUpdateTimerUI();
    F.timerInt = setInterval(function () {
      F.timerSec--;
      fltUpdateTimerUI();
      if (F.timerSec <= 0) {
        clearInterval(F.timerInt);
        fltToast('⏰ Time up! Auto-submitting...');
        setTimeout(fltDoSubmit, 1200);
      }
    }, 1000);
  }

  function fltUpdateTimerUI() {
    var el = $id('fltTimer');
    if (!el) return;
    var m = Math.floor(F.timerSec / 60);
    var s = F.timerSec % 60;
    el.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    if (F.timerSec <= 120) el.style.color = '#ef4444';
    else el.style.color = '';
  }

  // ── Submit ───────────────────────────────────────────
  window.fltConfirmSubmit = function () {
    var answered  = Object.keys(F.answers).length;
    var unanswered = F.questions.length - answered;
    var msg = unanswered > 0
      ? unanswered + ' questions unanswered. Submit anyway?'
      : 'Submit the test?';
    if (confirm(msg)) fltDoSubmit();
  };

  function fltDoSubmit() {
    if (F.submitted) return;
    F.submitted = true;
    if (F.timerInt) { clearInterval(F.timerInt); F.timerInt = null; }

    var correct = 0, wrong = 0, skipped = 0;
    var posMarks = 0, negMarks = 0;

    F.questions.forEach(function(q, i) {
      if (!F.answers.hasOwnProperty(i)) {
        skipped++;
      } else if (F.answers[i] === q.ans) {
        correct++;
        posMarks += (q.marks || 1);
      } else {
        wrong++;
        negMarks += (q.neg || 0.25);
      }
    });

    var finalScore  = posMarks - negMarks;
    var maxScore    = F.questions.reduce(function(s,q){ return s + (q.marks||1); }, 0);
    var pct         = ((finalScore / maxScore) * 100).toFixed(1);
    var timeTaken   = F.test.timeMin * 60 - F.timerSec;
    var mm          = Math.floor(timeTaken/60);
    var ss          = timeTaken % 60;
    var timeStr     = mm + 'm ' + (ss < 10 ? '0' : '') + ss + 's';

    // Save last score
    localStorage.setItem('flt_done_' + F.test.id, finalScore.toFixed(2) + '/' + maxScore);

    // Build result HTML
    var grade = pct >= 85 ? { g:'A+', c:'#10b981' }
              : pct >= 70 ? { g:'A',  c:'#6366f1' }
              : pct >= 55 ? { g:'B',  c:'#f59e0b' }
              : pct >= 40 ? { g:'C',  c:'#f97316' }
              :             { g:'D',  c:'#ef4444' };

    var resultWrap = $id('fltResultWrap');
    if (resultWrap) {
      resultWrap.innerHTML = [
        '<div class="flt-result-hero">',
          '<div class="flt-result-grade" style="color:' + grade.c + '">' + grade.g + '</div>',
          '<div class="flt-result-score">' + finalScore.toFixed(2) + ' <span>/ ' + maxScore + '</span></div>',
          '<div class="flt-result-pct">' + pct + '%</div>',
          '<div class="flt-result-test">' + F.test.title + '</div>',
        '</div>',
        '<div class="flt-result-stats">',
          '<div class="flt-rs"><div class="flt-rs-val flt-rs--correct">' + correct + '</div><div class="flt-rs-lbl">Correct</div></div>',
          '<div class="flt-rs"><div class="flt-rs-val flt-rs--wrong">'   + wrong   + '</div><div class="flt-rs-lbl">Wrong</div></div>',
          '<div class="flt-rs"><div class="flt-rs-val flt-rs--skip">'    + skipped + '</div><div class="flt-rs-lbl">Skipped</div></div>',
          '<div class="flt-rs"><div class="flt-rs-val">' + timeStr + '</div><div class="flt-rs-lbl">Time Taken</div></div>',
        '</div>',
        '<div class="flt-result-marks-row">',
          '<div class="flt-rm"><span class="flt-rm-plus">+' + posMarks.toFixed(2) + '</span> Positive Marks</div>',
          '<div class="flt-rm"><span class="flt-rm-neg">−' + negMarks.toFixed(2) + '</span> Negative Marks</div>',
        '</div>',
        '<div class="flt-review-header">Question Review</div>',
        fltBuildReview(),
        '<div style="display:flex;gap:12px;justify-content:center;margin-top:28px;flex-wrap:wrap">',
          '<button class="flt-start-btn" onclick="openFLTScreen()">← All Tests</button>',
          '<button class="flt-start-btn" style="background:linear-gradient(135deg,#7c3aed,#6d28d9)" onclick="launchFLT(' + F.test.id + ')">Retry Test 🔁</button>',
        '</div>',
      ].join('');
    }

    fltShowScreen('fltResultScreen');
    window.scrollTo(0,0);
  }

  function fltBuildReview() {
    var labels = ['A','B','C','D','E'];
    return F.questions.map(function(q, i) {
      var userAns = F.answers.hasOwnProperty(i) ? F.answers[i] : -1;
      var status  = userAns === -1 ? 'skip'
                  : userAns === q.ans ? 'correct' : 'wrong';
      var statusLabel = { correct:'✓ Correct', wrong:'✗ Wrong', skip:'— Skipped' }[status];
      var statusColor = { correct:'#10b981',   wrong:'#ef4444', skip:'#94a3b8' }[status];
      var opts = q.opts.map(function(o, j) {
        var cls = '';
        if (j === q.ans) cls = 'flt-rv-opt--correct';
        else if (j === userAns && userAns !== q.ans) cls = 'flt-rv-opt--wrong';
        return '<div class="flt-rv-opt ' + cls + '"><span class="flt-opt-label">' + labels[j] + '</span>' + o + '</div>';
      }).join('');
      return [
        '<div class="flt-rv-item">',
          '<div class="flt-rv-top">',
            '<span class="flt-rv-num">Q' + (i+1) + '</span>',
            '<span class="flt-rv-status" style="color:' + statusColor + '">' + statusLabel + '</span>',
          '</div>',
          '<div class="flt-rv-q">' + q.q + '</div>',
          '<div class="flt-rv-opts">' + opts + '</div>',
          (q.exp ? '<div class="flt-rv-exp"><b>Explanation:</b> ' + q.exp + '</div>' : ''),
        '</div>'
      ].join('');
    }).join('');
  }

  // ── Back from quiz (confirm) ─────────────────────────
  window.fltBackFromQuiz = function () {
    if (!F.submitted) {
      if (!confirm('Leave test? Your progress will be lost.')) return;
      if (F.timerInt) clearInterval(F.timerInt);
    }
    fltShowScreen('fltListScreen');
    fltBuildList();
  };

}());
