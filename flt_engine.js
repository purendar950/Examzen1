// ═══════════════════════════════════════════════════════
//  ExamZen — flt_engine.js  (FIXED v2.0)
//  Standalone Full Length Test engine
//  Now properly connects to fullLengthScreen & sectionalScreen
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── State ────────────────────────────────────────────
  var F = {
    test:       null,
    questions:  [],
    current:    0,
    answers:    {},
    bookmarks:  {},
    timerSec:   0,
    timerInt:   null,
    submitted:  false,
    visited:    {},     // track visited questions
    startTime:  0,      // quiz start timestamp
  };

  // ── Helpers ──────────────────────────────────────────
  function $id(id) { return document.getElementById(id); }

  function fltShowScreen(id) {
    if (typeof showScreen === 'function') {
      showScreen(id);
    } else {
      document.querySelectorAll('.screen').forEach(function(s) {
        s.classList.remove('active');
      });
      var el = $id(id);
      if (el) { el.classList.add('active'); window.scrollTo(0, 0); }
    }
  }

  function fltToast(msg, type) {
    var t = $id('toastContainer');
    if (!t) return;
    var d = document.createElement('div');
    d.className = 'toast ' + (type ? 't-' + type : 't-info');
    d.innerHTML = msg;
    t.appendChild(d);
    setTimeout(function() { d.remove(); }, 3200);
  }

  function formatTime(totalSec) {
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    if (h > 0) {
      return (h < 10 ? '0' : '') + h + ':' +
             (m < 10 ? '0' : '') + m + ':' +
             (s < 10 ? '0' : '') + s;
    }
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  // ── Storage helpers (user-scoped if login system exists) ──
  function _lsk(key) {
    if (typeof window._lsk === 'function') return window._lsk(key);
    return key;
  }

  function fltSaveScore(testId, scoreStr) {
    try { localStorage.setItem(_lsk('flt_done_' + testId), scoreStr); } catch(e) {}
  }

  function fltGetScore(testId) {
    try { return localStorage.getItem(_lsk('flt_done_' + testId)); } catch(e) { return null; }
  }

  // ═══════════════════════════════════════════════════════
  //  BRIDGE: Connect fullLengthScreen buttons to FLT engine
  //  This replaces the old openFLT() iframe approach
  // ═══════════════════════════════════════════════════════

  // Map filenames to test IDs for backward compatibility
  var FILE_TO_ID = {
    'FULL_LENGTH_TEST_-_1.html': { id: 'flt_1', title: 'Full Length Test — 1', type: 'full' },
    'FULL_LENGTH_TEST_-_2.html': { id: 'flt_2', title: 'Full Length Test — 2', type: 'full' },
    'FULL_LENGTH_TEST_-_3.html': { id: 'flt_3', title: 'Full Length Test — 3', type: 'full' },
    'FULL_LENGTH_TEST_-_4.html': { id: 'flt_4', title: 'Full Length Test — 4', type: 'full' },
    'FULL_LENGTH_TEST_-_5.html': { id: 'flt_5', title: 'Full Length Test — 5', type: 'full' },
    'FULL_LENGTH_TEST_-_6.html': { id: 'flt_6', title: 'Full Length Test — 6', type: 'full' },
    'FULL_LENGTH_TEST_-_7.html': { id: 'flt_7', title: 'Full Length Test — 7', type: 'full' },
    'FULL_LENGTH_TEST_-_8.html': { id: 'flt_8', title: 'Full Length Test — 8', type: 'full' },
    'FULL_LENGTH_TEST_-_9.html': { id: 'flt_9', title: 'Full Length Test — 9', type: 'full' },
    'UP_-_GK_-_TEST_-_1.html':  { id: 'upgk_1', title: 'UP GK Test — 1', type: 'sectional' },
    'UP_-_GK_-_TEST_-_2.html':  { id: 'upgk_2', title: 'UP GK Test — 2', type: 'sectional' },
    'UP_-_GK_-_TEST_-_3.html':  { id: 'upgk_3', title: 'UP GK Test — 3', type: 'sectional' },
    'UP_-_GK_-_TEST_-_4.html':  { id: 'upgk_4', title: 'UP GK Test — 4', type: 'sectional' },
    'UP_-_GK_-_TEST_-_5.html':  { id: 'upgk_5', title: 'UP GK Test — 5', type: 'sectional' },
    'UP_-_GK_-_TEST_-_6.html':  { id: 'upgk_6', title: 'UP GK Test — 6', type: 'sectional' },
  };

  // ── Override the old openFLT to use native engine ────
  window.openFLT = function(filename, title) {
    var mapping = FILE_TO_ID[filename];

    // If FLT_TESTS exists and has matching data, use native engine
    if (typeof FLT_TESTS !== 'undefined' && FLT_TESTS.length > 0) {
      var test = null;

      // Try to find by mapping ID
      if (mapping) {
        test = FLT_TESTS.find(function(t) {
          return t.id === mapping.id || 
                 t.id === mapping.id.replace('flt_','').replace('upgk_','') ||
                 t.title === mapping.title ||
                 t.title === title;
        });
      }

      // Try to find by title
      if (!test && title) {
        test = FLT_TESTS.find(function(t) {
          return t.title === title || 
                 t.title.indexOf(title) >= 0 ||
                 title.indexOf(t.title) >= 0;
        });
      }

      // Try to find by index from filename
      if (!test) {
        var numMatch = filename.match(/(\d+)/);
        if (numMatch) {
          var num = parseInt(numMatch[1]);
          // Check if it's a full length or sectional
          var isSectional = filename.indexOf('GK') >= 0;
          test = FLT_TESTS.find(function(t) {
            if (typeof t.id === 'number') return t.id === num;
            if (typeof t.id === 'string') {
              if (isSectional) return t.id === 'upgk_' + num || t.id === 'sectional_' + num;
              return t.id === 'flt_' + num || t.id === num.toString();
            }
            return false;
          });

          // Last resort: use index
          if (!test && !isSectional && num >= 1 && num <= FLT_TESTS.length) {
            test = FLT_TESTS[num - 1];
          }
        }
      }

      if (test && test.questions && test.questions.length > 0) {
        launchFLTNative(test);
        return;
      }
    }

    // ── Fallback: try iframe method ──
    console.warn('[FLT Engine] No matching test data found for "' + filename + '", trying iframe...');
    fltOpenIframe(filename, title);
  };

  // ── Iframe fallback (original method) ────────────────
  function fltOpenIframe(filename, title) {
    var overlay = $id('fltOverlay');
    var frame   = $id('fltFrame');
    var titleEl = $id('fltTitle');

    if (!overlay || !frame) {
      fltToast('❌ Could not open test: ' + (title || filename), 'error');
      return;
    }

    if (titleEl) titleEl.textContent = title || 'Full Length Test';

    // Test if file exists first
    var xhr = new XMLHttpRequest();
    xhr.open('HEAD', filename, true);
    xhr.timeout = 5000;
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 400) {
        frame.src = filename;
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        window.scrollTo(0, 0);
      } else {
        fltToast('❌ Test file not found: ' + filename, 'error');
        console.error('[FLT] File not found:', filename, 'Status:', xhr.status);
      }
    };
    xhr.onerror = function() {
      fltToast('❌ Could not load test file', 'error');
      console.error('[FLT] Network error loading:', filename);
    };
    xhr.ontimeout = function() {
      // On timeout, try loading anyway (some servers don't support HEAD)
      frame.src = filename;
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    };
    xhr.send();
  }

  // ── Close iframe overlay (keep for backward compat) ──
  window.closeFLT = function() {
    var overlay = $id('fltOverlay');
    var frame   = $id('fltFrame');
    if (!overlay || !frame) return;
    if (!confirm('Exit the test? Your progress in this test will be lost.')) return;
    frame.src = '';
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  };


  // ═══════════════════════════════════════════════════════
  //  NATIVE FLT ENGINE — Quiz Screen
  // ═══════════════════════════════════════════════════════

  function launchFLTNative(test) {
    F.test      = test;
    F.questions = test.questions || [];
    F.current   = 0;
    F.answers   = {};
    F.bookmarks = {};
    F.visited   = { 0: true };
    F.submitted = false;
    F.timerSec  = (test.timeMin || 120) * 60;
    F.startTime = Date.now();

    if (F.questions.length === 0) {
      fltToast('❌ No questions found in this test', 'error');
      return;
    }

    fltRebuildPalette();
    fltRenderQ();
    fltShowScreen('fltQuizScreen');
    fltStartTimer();

    // Hide the iframe overlay if it was open
    var iframeOverlay = $id('fltOverlay');
    if (iframeOverlay) iframeOverlay.style.display = 'none';

    fltToast('📝 ' + (test.title || 'Test') + ' — ' + F.questions.length + ' Questions', 'info');
  }

  // Also expose the old name for backward compat
  window.launchFLT = function(testId) {
    if (typeof testId === 'object' && testId.questions) {
      // Direct test object passed
      launchFLTNative(testId);
      return;
    }

    if (typeof FLT_TESTS === 'undefined' || !FLT_TESTS.length) {
      fltToast('❌ No test data loaded. Check flt_questions.js', 'error');
      return;
    }

    var test = FLT_TESTS.find(function(t) {
      return t.id === testId || 
             t.id === String(testId) ||
             t.id === 'flt_' + testId;
    });

    if (!test) {
      // Try by index
      if (typeof testId === 'number' && testId >= 1 && testId <= FLT_TESTS.length) {
        test = FLT_TESTS[testId - 1];
      }
    }

    if (!test) {
      fltToast('❌ Test #' + testId + ' not found', 'error');
      return;
    }

    launchFLTNative(test);
  };


  // ── Render current question ──────────────────────────
  function fltRenderQ() {
    var q   = F.questions[F.current];
    var tot = F.questions.length;
    if (!q) return;

    F.visited[F.current] = true;

    // Header
    var el;
    el = $id('fltQNum');
    if (el) el.textContent = 'Q ' + (F.current + 1) + ' / ' + tot;

    // Counts
    var answeredCount = Object.keys(F.answers).length;
    el = $id('fltAnswered');   if (el) el.textContent = answeredCount;
    el = $id('fltUnanswered'); if (el) el.textContent = tot - answeredCount;

    // Question text — support both plain text and HTML
    el = $id('fltQText');
    if (el) {
      // Check if question has Hindi version
      var qHtml = '<div style="font-weight:700;line-height:1.75">' + (q.q || q.question || '') + '</div>';
      if (q.hi || q.hindi) {
        qHtml += '<div style="color:var(--text-secondary);font-size:13px;margin-top:8px;line-height:1.6">' + (q.hi || q.hindi) + '</div>';
      }
      // Show chapter/difficulty tags if available
      var tags = '';
      if (q.chapter) tags += '<span class="eq-tag chapter">' + q.chapter + '</span>';
      if (q.diff) {
        var diffClass = q.diff === 'hard' ? 'diff-hard' : q.diff === 'medium' ? 'diff-medium' : 'diff-easy';
        tags += '<span class="eq-tag ' + diffClass + '">' + q.diff.charAt(0).toUpperCase() + q.diff.slice(1) + '</span>';
      }
      if (q.exam) tags += '<span class="eq-tag exam">' + q.exam + '</span>';
      if (tags) qHtml = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">' + tags + '</div>' + qHtml;
      el.innerHTML = qHtml;
    }

    // Options
    var optsWrap = $id('fltOptsWrap');
    if (optsWrap) {
      var labels = ['A', 'B', 'C', 'D', 'E'];
      var options = q.opts || q.options || [];
      var userAns = F.answers.hasOwnProperty(F.current) ? F.answers[F.current] : -1;

      optsWrap.innerHTML = options.map(function(opt, i) {
        var sel = (userAns === i) ? ' flt-opt--selected' : '';
        return [
          '<button class="flt-opt' + sel + '" onclick="fltPickAnswer(' + i + ')" style="width:100%">',
            '<span class="flt-opt-label">' + labels[i] + '</span>',
            '<span class="flt-opt-text">' + opt + '</span>',
          '</button>'
        ].join('');
      }).join('');
    }

    // Bookmark button
    el = $id('fltBookmarkBtn');
    if (el) {
      el.textContent = F.bookmarks[F.current] ? '★ Marked' : '☆ Mark';
      el.style.color = F.bookmarks[F.current] ? '#f59e0b' : '';
      el.style.borderColor = F.bookmarks[F.current] ? '#f59e0b' : '';
    }

    // Nav buttons
    el = $id('fltPrevBtn');
    if (el) {
      el.disabled = (F.current === 0);
      el.style.opacity = (F.current === 0) ? '0.4' : '1';
    }

    el = $id('fltNextBtn');
    if (el) {
      if (F.current === tot - 1) {
        el.innerHTML = '🏁 Finish';
        el.style.background = 'linear-gradient(135deg, #059669, #10b981)';
      } else {
        el.innerHTML = 'Next →';
        el.style.background = '';
      }
    }

    fltUpdatePalette();

    // Scroll to top of question area
    var qArea = $id('fltQText');
    if (qArea) qArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }


  // ── Answer Selection ─────────────────────────────────
  window.fltPickAnswer = function(idx) {
    if (F.submitted) return;

    // Toggle: if same answer clicked, deselect
    if (F.answers[F.current] === idx) {
      delete F.answers[F.current];
    } else {
      F.answers[F.current] = idx;
    }

    fltRenderQ();
    fltUpdatePalette();
  };

  window.fltClearAnswer = function() {
    if (F.submitted) return;
    delete F.answers[F.current];
    fltRenderQ();
    fltUpdatePalette();
  };

  window.fltToggleBookmark = function() {
    if (F.submitted) return;
    F.bookmarks[F.current] = !F.bookmarks[F.current];
    fltRenderQ();
    fltUpdatePalette();
  };


  // ── Navigation ───────────────────────────────────────
  window.fltPrev = function() {
    if (F.current > 0) {
      F.current--;
      fltRenderQ();
      fltScrollPaletteToActive();
    }
  };

  window.fltNext = function() {
    if (F.current < F.questions.length - 1) {
      F.current++;
      fltRenderQ();
      fltScrollPaletteToActive();
    } else {
      fltConfirmSubmit();
    }
  };

  window.fltJumpTo = function(idx) {
    if (idx < 0 || idx >= F.questions.length) return;
    F.current = idx;
    fltRenderQ();
    fltScrollPaletteToActive();
    // Close palette on mobile
    var pal = $id('fltPalette');
    if (pal && window.innerWidth < 768) {
      pal.classList.remove('flt-palette--open');
      pal.style.width = '0';
    }
  };


  // ── Question Palette ─────────────────────────────────
  function fltRebuildPalette() {
    var grid = $id('fltPaletteGrid');
    if (!grid) return;
    grid.innerHTML = F.questions.map(function(_, i) {
      return '<button class="flt-pb" id="fltpb_' + i + '" onclick="fltJumpTo(' + i + ')" title="Q' + (i+1) + '">' + (i + 1) + '</button>';
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
    if (btn) btn.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }

  window.fltTogglePalette = function() {
    var pal = $id('fltPalette');
    if (!pal) return;
    var isOpen = pal.classList.contains('flt-palette--open');
    if (isOpen) {
      pal.classList.remove('flt-palette--open');
      pal.style.width = '0';
    } else {
      pal.classList.add('flt-palette--open');
      pal.style.width = '175px';
      fltScrollPaletteToActive();
    }
  };


  // ── Timer ────────────────────────────────────────────
  function fltStartTimer() {
    if (F.timerInt) clearInterval(F.timerInt);
    fltUpdateTimerUI();
    F.timerInt = setInterval(function() {
      if (F.submitted) { clearInterval(F.timerInt); return; }
      F.timerSec--;
      fltUpdateTimerUI();
      if (F.timerSec <= 0) {
        clearInterval(F.timerInt);
        F.timerInt = null;
        fltToast('⏰ Time\'s up! Auto-submitting your test...', 'error');
        setTimeout(fltDoSubmit, 1500);
      }
    }, 1000);
  }

  function fltUpdateTimerUI() {
    var el = $id('fltTimer');
    if (!el) return;
    el.textContent = formatTime(Math.max(0, F.timerSec));

    // Color coding
    var totalTime = (F.test && F.test.timeMin) ? F.test.timeMin * 60 : 7200;
    var pctLeft = F.timerSec / totalTime;

    if (pctLeft <= 0.02 || F.timerSec <= 60) {
      el.style.color = '#ef4444';
      el.style.animation = 'tPulse 0.5s ease infinite';
    } else if (pctLeft <= 0.1 || F.timerSec <= 300) {
      el.style.color = '#f59e0b';
      el.style.animation = '';
    } else {
      el.style.color = '#10b981';
      el.style.animation = '';
    }
  }


  // ── Submit ───────────────────────────────────────────
  window.fltConfirmSubmit = function() {
    if (F.submitted) return;

    var answered   = Object.keys(F.answers).length;
    var unanswered = F.questions.length - answered;

    var msg = '🏁 Submit Test?\n\n';
    msg += '✅ Answered: ' + answered + '\n';
    msg += '⬜ Unanswered: ' + unanswered + '\n';
    if (Object.keys(F.bookmarks).filter(function(k) { return F.bookmarks[k]; }).length > 0) {
      msg += '🔖 Bookmarked: ' + Object.keys(F.bookmarks).filter(function(k) { return F.bookmarks[k]; }).length + '\n';
    }
    msg += '\nAre you sure?';

    if (confirm(msg)) fltDoSubmit();
  };

  function fltDoSubmit() {
    if (F.submitted) return;
    F.submitted = true;
    if (F.timerInt) { clearInterval(F.timerInt); F.timerInt = null; }

    var correct = 0, wrong = 0, skipped = 0;
    var posMarks = 0, negMarks = 0;
    var maxPerQ = 1;  // default marks per question
    var negPerQ = 0.25; // default negative marking

    F.questions.forEach(function(q, i) {
      var qMarks = q.marks || maxPerQ;
      var qNeg   = (q.neg !== undefined) ? q.neg : negPerQ;

      if (!F.answers.hasOwnProperty(i)) {
        skipped++;
      } else if (F.answers[i] === (q.ans !== undefined ? q.ans : q.answer)) {
        correct++;
        posMarks += qMarks;
      } else {
        wrong++;
        negMarks += qNeg;
      }
    });

    var finalScore = posMarks - negMarks;
    var maxScore   = F.questions.reduce(function(s, q) { return s + (q.marks || maxPerQ); }, 0);
    var pct        = maxScore > 0 ? ((finalScore / maxScore) * 100) : 0;
    if (pct < 0) pct = 0;
    pct = pct.toFixed(1);

    var timeTaken = (F.test.timeMin || 120) * 60 - F.timerSec;
    if (timeTaken < 0) timeTaken = 0;
    var timeStr = formatTime(timeTaken);

    // Save score
    var testId = F.test.id || 'unknown';
    fltSaveScore(testId, finalScore.toFixed(2) + '/' + maxScore + ' (' + pct + '%)');

    // Grade
    var grade;
    if (pct >= 90)      grade = { g: 'A+', emoji: '🏆', c: '#10b981', msg: 'Outstanding! You\'re exam-ready!' };
    else if (pct >= 80) grade = { g: 'A',  emoji: '🌟', c: '#6366f1', msg: 'Excellent performance!' };
    else if (pct >= 70) grade = { g: 'B+', emoji: '👏', c: '#0891b2', msg: 'Great work! Keep it up!' };
    else if (pct >= 60) grade = { g: 'B',  emoji: '👍', c: '#2563eb', msg: 'Good effort. Review weak areas.' };
    else if (pct >= 50) grade = { g: 'C',  emoji: '📖', c: '#f59e0b', msg: 'Average. More practice needed.' };
    else if (pct >= 35) grade = { g: 'D',  emoji: '📝', c: '#f97316', msg: 'Below average. Focus on basics.' };
    else                grade = { g: 'F',  emoji: '💪', c: '#ef4444', msg: 'Need significant improvement.' };

    // Accuracy
    var attempted = correct + wrong;
    var accuracy = attempted > 0 ? ((correct / attempted) * 100).toFixed(1) : '0.0';

    // Build result
    var resultWrap = $id('fltResultWrap');
    if (resultWrap) {
      resultWrap.innerHTML = [
        // Hero Card
        '<div class="flt-result-hero">',
          '<div style="font-size:56px;margin-bottom:8px">' + grade.emoji + '</div>',
          '<div class="flt-result-grade" style="color:' + grade.c + '">' + grade.g + '</div>',
          '<div class="flt-result-score">' + finalScore.toFixed(2) + ' <span>/ ' + maxScore + '</span></div>',
          '<div class="flt-result-pct" style="color:' + grade.c + '">' + pct + '%</div>',
          '<div style="font-size:13px;color:var(--text-secondary);margin:8px 0">' + grade.msg + '</div>',
          '<div class="flt-result-test">' + (F.test.title || 'Test') + ' · ' + timeStr + '</div>',
        '</div>',

        // Stats Grid
        '<div class="flt-result-stats">',
          '<div class="flt-rs"><div class="flt-rs-val flt-rs--correct">' + correct + '</div><div class="flt-rs-lbl">Correct</div></div>',
          '<div class="flt-rs"><div class="flt-rs-val flt-rs--wrong">' + wrong + '</div><div class="flt-rs-lbl">Wrong</div></div>',
          '<div class="flt-rs"><div class="flt-rs-val flt-rs--skip">' + skipped + '</div><div class="flt-rs-lbl">Skipped</div></div>',
          '<div class="flt-rs"><div class="flt-rs-val" style="font-size:16px">' + timeStr + '</div><div class="flt-rs-lbl">Time</div></div>',
        '</div>',

        // Marks & Accuracy Row
        '<div class="flt-result-marks-row">',
          '<div class="flt-rm"><span class="flt-rm-plus">+' + posMarks.toFixed(2) + '</span>Positive</div>',
          '<div class="flt-rm"><span class="flt-rm-neg">−' + negMarks.toFixed(2) + '</span>Negative</div>',
          '<div class="flt-rm"><span style="font-size:20px;font-weight:800;color:' + (accuracy >= 70 ? '#10b981' : accuracy >= 50 ? '#f59e0b' : '#ef4444') + ';display:block">' + accuracy + '%</span>Accuracy</div>',
        '</div>',

        // Action Buttons
        '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:20px 0">',
          '<button class="flt-start-btn" style="background:linear-gradient(135deg,#475569,#334155)" onclick="fltGoBack()">← Back to Tests</button>',
          '<button class="flt-start-btn" style="background:linear-gradient(135deg,#7c3aed,#6d28d9)" onclick="fltRetryTest()">🔁 Retry Test</button>',
          '<button class="flt-start-btn" style="background:linear-gradient(135deg,#dc2626,#b91c1c)" onclick="fltToggleReview()">📋 Review Answers</button>',
        '</div>',

        // Review section (hidden by default)
        '<div id="fltReviewSection" style="display:none">',
          '<div class="flt-review-header">',
            '📋 Question Review',
            '<div style="display:flex;gap:8px;margin-top:8px">',
              '<button onclick="fltFilterReview(\'all\')" class="flt-filter-btn flt-filter-active" style="padding:5px 12px;border-radius:8px;border:1.5px solid var(--border);background:var(--accent-purple);color:#fff;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">All (' + F.questions.length + ')</button>',
              '<button onclick="fltFilterReview(\'correct\')" class="flt-filter-btn" style="padding:5px 12px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg-hover);color:var(--text-secondary);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">✅ (' + correct + ')</button>',
              '<button onclick="fltFilterReview(\'wrong\')" class="flt-filter-btn" style="padding:5px 12px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg-hover);color:var(--text-secondary);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">❌ (' + wrong + ')</button>',
              '<button onclick="fltFilterReview(\'skip\')" class="flt-filter-btn" style="padding:5px 12px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg-hover);color:var(--text-secondary);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">⏭ (' + skipped + ')</button>',
            '</div>',
          '</div>',
          '<div id="fltReviewItems">' + fltBuildReview() + '</div>',
        '</div>',

      ].join('');
    }

    fltShowScreen('fltResultScreen');
    window.scrollTo(0, 0);

    // Confetti for great scores
    if (pct >= 80 && typeof launchConfetti === 'function') {
      launchConfetti();
    }
  }


  // ── Review Builder ───────────────────────────────────
  function fltBuildReview(filter) {
    var labels = ['A', 'B', 'C', 'D', 'E'];
    var html = [];

    F.questions.forEach(function(q, i) {
      var correctAns = (q.ans !== undefined) ? q.ans : q.answer;
      var userAns    = F.answers.hasOwnProperty(i) ? F.answers[i] : -1;
      var status     = userAns === -1 ? 'skip'
                     : userAns === correctAns ? 'correct' : 'wrong';

      // Filter
      if (filter && filter !== 'all' && status !== filter) return;

      var statusLabel = { correct: '✅ Correct', wrong: '❌ Wrong', skip: '⏭ Skipped' }[status];
      var statusColor = { correct: '#10b981', wrong: '#ef4444', skip: '#94a3b8' }[status];
      var borderColor = { correct: 'rgba(16,185,129,0.3)', wrong: 'rgba(239,68,68,0.3)', skip: 'var(--border)' }[status];

      var options = q.opts || q.options || [];
      var opts = options.map(function(o, j) {
        var cls = '';
        var icon = '';
        if (j === correctAns) {
          cls = 'flt-rv-opt--correct';
          icon = ' ✓';
        } else if (j === userAns && userAns !== correctAns) {
          cls = 'flt-rv-opt--wrong';
          icon = ' ✗';
        }
        return '<div class="flt-rv-opt ' + cls + '"><span class="flt-opt-label" style="width:22px;height:22px;font-size:11px">' + labels[j] + '</span><span style="flex:1">' + o + icon + '</span></div>';
      }).join('');

      var correctLetter = labels[correctAns] || '?';

      html.push([
        '<div class="flt-rv-item" data-status="' + status + '" style="border-left:3px solid ' + borderColor + '">',
          '<div class="flt-rv-top">',
            '<span class="flt-rv-num">Q' + (i + 1) + '</span>',
            '<span class="flt-rv-status" style="color:' + statusColor + '">' + statusLabel + '</span>',
          '</div>',
          '<div class="flt-rv-q">' + (q.q || q.question || '') + '</div>',
          (q.hi || q.hindi ? '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">' + (q.hi || q.hindi) + '</div>' : ''),
          '<div class="flt-rv-opts">' + opts + '</div>',
          '<div style="margin-top:8px;padding:8px 12px;background:rgba(5,150,105,0.06);border:1px solid rgba(5,150,105,0.2);border-radius:8px;font-size:12px">',
            '<strong style="color:#059669">Correct: ' + correctLetter + '</strong>',
            (userAns >= 0 && userAns !== correctAns ? ' &nbsp;|&nbsp; <strong style="color:#ef4444">Your Answer: ' + labels[userAns] + '</strong>' : ''),
          '</div>',
          (q.exp || q.explanation ? '<div class="flt-rv-exp"><b>📋 Explanation:</b> ' + (q.exp || q.explanation || '') + '</div>' : ''),
        '</div>'
      ].join(''));
    });

    if (html.length === 0) {
      return '<div style="text-align:center;padding:24px;color:var(--text-muted)">No questions match this filter.</div>';
    }

    return html.join('');
  }


  // ── Review Toggle & Filter ───────────────────────────
  window.fltToggleReview = function() {
    var section = $id('fltReviewSection');
    if (!section) return;
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
    if (section.style.display === 'block') {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  window.fltFilterReview = function(filter) {
    var items = $id('fltReviewItems');
    if (items) items.innerHTML = fltBuildReview(filter);

    // Update filter button styles
    document.querySelectorAll('.flt-filter-btn').forEach(function(btn) {
      btn.classList.remove('flt-filter-active');
      btn.style.background = 'var(--bg-hover)';
      btn.style.color = 'var(--text-secondary)';
    });
    event.target.classList.add('flt-filter-active');
    event.target.style.background = 'var(--accent-purple)';
    event.target.style.color = '#fff';
  };


  // ── Navigation helpers ───────────────────────────────
  window.fltGoBack = function() {
    // Determine where to go back to
    var test = F.test;
    if (test && test.type === 'sectional') {
      fltShowScreen('sectionalScreen');
    } else {
      fltShowScreen('fullLengthScreen');
    }
  };

  window.fltRetryTest = function() {
    if (F.test) {
      launchFLTNative(F.test);
    }
  };

  window.fltBackFromQuiz = function() {
    if (!F.submitted) {
      var answered = Object.keys(F.answers).length;
      var msg = 'Leave test?';
      if (answered > 0) msg += '\n\nYou\'ve answered ' + answered + '/' + F.questions.length + ' questions. Progress will be lost.';
      if (!confirm(msg)) return;
      if (F.timerInt) { clearInterval(F.timerInt); F.timerInt = null; }
    }
    fltGoBack();
  };


  // ═══════════════════════════════════════════════════════
  //  FLT LIST SCREEN — Build cards from FLT_TESTS
  // ═══════════════════════════════════════════════════════

  window.openFLTScreen = function() {
    fltBuildList();
    fltShowScreen('fltListScreen');
  };

  function fltBuildList() {
    var wrap = $id('fltCardGrid');
    if (!wrap) return;

    if (typeof FLT_TESTS === 'undefined' || !FLT_TESTS.length) {
      wrap.innerHTML = [
        '<div style="text-align:center;padding:60px 20px">',
          '<div style="font-size:48px;margin-bottom:16px">📝</div>',
          '<div style="font-size:16px;font-weight:800;color:var(--text-primary);margin-bottom:8px">No Tests Available</div>',
          '<div style="font-size:13px;color:var(--text-secondary)">Test data not loaded. Make sure flt_questions.js is included.</div>',
        '</div>'
      ].join('');
      return;
    }

    wrap.innerHTML = FLT_TESTS.map(function(t, idx) {
      var testId = t.id || (idx + 1);
      var savedScore = fltGetScore(testId);
      var qCount = (t.questions || []).length || t.totalQ || 100;
      var timeMins = t.timeMin || 120;

      var scoreHtml = savedScore
        ? '<div class="flt-card-score">✅ Last: ' + savedScore + '</div>'
        : '<div class="flt-card-score flt-card-score--new">🆕 New — Not attempted</div>';

      return [
        '<div class="flt-card" onclick="launchFLT(\'' + testId + '\')">',
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">',
            '<div class="flt-card-num">Test ' + (idx + 1) + '</div>',
            savedScore ? '<span style="font-size:9px;font-weight:800;padding:3px 8px;border-radius:10px;background:rgba(16,185,129,0.15);color:#10b981">ATTEMPTED</span>' : '<span style="font-size:9px;font-weight:800;padding:3px 8px;border-radius:10px;background:rgba(37,99,235,0.15);color:#2563eb">NEW</span>',
          '</div>',
          '<div class="flt-card-title">' + (t.title || 'Full Length Test ' + (idx + 1)) + '</div>',
          '<div class="flt-card-meta">',
            '<span>📝 ' + qCount + ' Qs</span>',
            '<span>⏱ ' + timeMins + ' min</span>',
            '<span>➖ 0.25 neg</span>',
          '</div>',
          scoreHtml,
          '<button class="flt-start-btn">' + (savedScore ? 'Retry →' : 'Start Test →') + '</button>',
        '</div>'
      ].join('');
    }).join('');
  }


  // ═══════════════════════════════════════════════════════
  //  AUTO-INIT: Build list when DOM is ready
  // ═══════════════════════════════════════════════════════

  function fltInit() {
    // Pre-build the list if on fltListScreen
    if ($id('fltCardGrid')) {
      fltBuildList();
    }

    // Add keyboard shortcuts for quiz screen
    document.addEventListener('keydown', function(e) {
      // Only when fltQuizScreen is active
      var screen = $id('fltQuizScreen');
      if (!screen || !screen.classList.contains('active') || F.submitted) return;

      var key = e.key.toLowerCase();

      // A-E to select options
      var optMap = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4 };
      if (optMap.hasOwnProperty(key)) {
        var options = F.questions[F.current] ? (F.questions[F.current].opts || F.questions[F.current].options || []) : [];
        if (optMap[key] < options.length) {
          fltPickAnswer(optMap[key]);
          e.preventDefault();
        }
      }

      // Arrow keys
      if (key === 'arrowleft' || key === 'arrowup') { fltPrev(); e.preventDefault(); }
      if (key === 'arrowright' || key === 'arrowdown') { fltNext(); e.preventDefault(); }

      // M to bookmark
      if (key === 'm') { fltToggleBookmark(); e.preventDefault(); }

      // P to toggle palette
      if (key === 'p') { fltTogglePalette(); e.preventDefault(); }

      // C to clear answer
      if (key === 'c') { fltClearAnswer(); e.preventDefault(); }
    });

    console.log('[FLT Engine v2.0] Initialized. Tests available:', typeof FLT_TESTS !== 'undefined' ? FLT_TESTS.length : 0);
  }

  // Run init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fltInit);
  } else {
    fltInit();
  }

})();
