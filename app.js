// ═══════════════════════════════════════════════════════
//  ExamZen — app.js  |  All application logic
//  Requires: questions.js loaded before this file
// ═══════════════════════════════════════════════════════

        // ═══════════════════════════════════════════
        // ═══════════ QUESTION DATABASE ═════════════
        // ═══════════════════════════════════════════
        // ═══════════════════════════════════════════════════════════════════
        // ═══════════ HOW TO ADD QUESTIONS — READ THIS FIRST ════════════════
        // ═══════════════════════════════════════════════════════════════════
        //
        //  Each question is one object inside the QUESTIONS array below.
        //  Copy-paste this template for every question you add:
        //
        //  {
        //    ch:   1,                   ← Chapter number (1–13, see list below)
        //    q:    "Question text?",    ← English question
        //    hi:   "प्रश्न हिंदी में?", ← Hindi translation (optional, use "" to skip)
        //    opts: [                    ← Exactly 5 options (A, B, C, D, E)
        //             "Option A",
        //             "Option B",
        //             "Option C",
        //             "Option D",
        //             "Option E"
        //          ],
        //    ans:  2,                   ← Index of correct option (0=A, 1=B, 2=C, 3=D, 4=E)
        //    exp:  "Explanation here.", ← Why this answer is correct
        //    exam: "UPSSSC PET 2024",  ← Source exam (any string)
        //    diff: "easy"              ← Difficulty: "easy" | "medium" | "hard"
        //  },
        //
        //  CHAPTER NUMBERS:
        //    1 = UP Overview      2 = Physical Layout   3 = Climate & Soil
        //    4 = Flora & Wildlife 5 = Rivers & Lakes    6 = Agriculture
        //    7 = Irrigation       8 = Tourism           9 = Industry
        //   10 = Minerals        11 = Transport        12 = History
        //   13 = Art & Culture
        //
        //  EXAMPLE (5-option question):
        //  { ch:1, q:"Capital of Uttar Pradesh?", hi:"उत्तर प्रदेश की राजधानी?",
        //    opts:["Agra","Varanasi","Lucknow","Allahabad","Kanpur"],
        //    ans:2, exp:"Lucknow is the capital of UP.", exam:"UPSSSC 2024", diff:"easy" },
        //
        // ═══════════════════════════════════════════════════════════════════
        //  ADD YOUR QUESTIONS BELOW ↓↓↓
        // ═══════════════════════════════════════════════════════════════════
        // Custom chapters added via Admin Panel (do not edit manually)
        const CUSTOM_CHAPTERS = [];


        // ═══════════════════════════════════════════════════════════
        // ═══ CURRENT AFFAIRS — Separate Course (like upGK) ═════════
        // ═══════════════════════════════════════════════════════════
        // 6 Topic Chapters:
        // ch:1 = National Affairs | ch:2 = International | ch:3 = Sports
        // ch:4 = Science & Tech   | ch:5 = Economy       | ch:6 = UP Current Affairs

        // ── Active quiz course tracker ────────────────────────────
        var ACTIVE_QUIZ_COURSE = 'upGK'; // 'upGK' | 'current'

        function openCurrentAffairsMode() {
          ACTIVE_QUIZ_COURSE    = 'current';
          window.QUIZ_COURSE_ID = 'current';

          // ── Pass CA data DIRECTLY — no global swap needed ──
          buildTSChapterList(CA_CHAPTER_NAMES, CA_QUESTIONS);
          updateTSDetailProgress(CA_QUESTIONS);
          updateTSDetailLabels(CA_CHAPTER_NAMES, CA_QUESTIONS);

          // Also update Next Suggested label for CA
          var nextLbl = document.getElementById('tsNextSuggestedLabel');
          if (nextLbl) nextLbl.textContent = 'Ch 1 — National Affairs / राष्ट्रीय';

          // ── Update header UI ──
          var titleEl  = document.getElementById('tsDetailTitle');
          var subEl    = document.getElementById('tsDetailSub');
          var iconEl   = document.getElementById('tsDetailIcon');
          var topbarEl = document.getElementById('tsDetailTopbar');
          if (titleEl)  titleEl.textContent  = 'Current Affairs Test Series';
          if (subEl)    subEl.textContent    = '6 Topics • समसामयिकी 2024-25';
          if (iconEl) { iconEl.textContent = '📰'; iconEl.style.background = 'linear-gradient(135deg,#d97706,#b45309)'; }
          if (topbarEl) topbarEl.style.background = 'linear-gradient(135deg,#1f1a10 0%,#2d2410 50%,#1a1005 100%)';

          // Store flag so launchChapterTest knows which dataset to use
          window._ACTIVE_COURSE_QUESTIONS  = CA_QUESTIONS;
          window._ACTIVE_COURSE_CH_NAMES   = CA_CHAPTER_NAMES;
          window._ACTIVE_COURSE_ID         = 'current';

          // Refresh retry/saved badges silently
          try { tsLoadRetryWrong(); } catch(e){}
          try { tsLoadSaved();      } catch(e){}

          switchTSTab(document.querySelector('.ts-tab[data-tab="mock"]'), 'mock');
          showScreen('testSeriesDetailScreen');
        }

        function restoreUpGKMode() {
          ACTIVE_QUIZ_COURSE    = 'upGK';
          window.QUIZ_COURSE_ID = 'upGK';
          window._ACTIVE_COURSE_QUESTIONS = null;
          window._ACTIVE_COURSE_CH_NAMES  = null;
          window._ACTIVE_COURSE_ID        = 'upGK';

          // ── Restore header UI ──
          var titleEl  = document.getElementById('tsDetailTitle');
          var subEl    = document.getElementById('tsDetailSub');
          var iconEl   = document.getElementById('tsDetailIcon');
          var topbarEl = document.getElementById('tsDetailTopbar');
          if (titleEl)  titleEl.textContent  = 'UP GK Mock Test Series 2025–26';
          if (subEl)    subEl.textContent    = 'Chapter-wise • 2025–26';
          if (iconEl) { iconEl.textContent = '🗺️'; iconEl.style.background = 'linear-gradient(135deg,#7c3aed,#4f46e5)'; }
          if (topbarEl) topbarEl.style.background = 'linear-gradient(135deg,#1e1b4b 0%,#2d2260 50%,#1a1040 100%)';
        }

        // ═══════════════════════════════════════════
        // ═══════════ GAME ENGINE ═══════════════════
        // ═══════════════════════════════════════════

        // ── API KEY for AI features ──────────────────────────────────────
        // Stored in localStorage so user only enters once
        let ANTHROPIC_API_KEY = '';
        function getApiKey(){ return ANTHROPIC_API_KEY || localStorage.getItem('upqz_api_key') || ''; }
        function setApiKey(k){ ANTHROPIC_API_KEY = k; try{ localStorage.setItem('upqz_api_key',k); }catch(e){} }
        function promptApiKey(cb){
            const existing = getApiKey();
            if(existing){ cb(existing); return; }
            // Show modal
            document.getElementById('apiKeyOverlay').style.display='flex';
            document.getElementById('apiKeyCb') && (window._apiKeyCb=cb);
            window._apiKeyCb = cb;
        }
        function submitApiKey(){
            const val = document.getElementById('apiKeyInput').value.trim();
            if(!val){ document.getElementById('apiKeyError').textContent='Please enter your API key'; return; }
            if(!val.startsWith('sk-ant-')){ document.getElementById('apiKeyError').textContent='Invalid key — must start with sk-ant-'; return; }
            setApiKey(val);
            document.getElementById('apiKeyOverlay').style.display='none';
            document.getElementById('apiKeyError').textContent='';
            if(window._apiKeyCb){ window._apiKeyCb(val); window._apiKeyCb=null; }
        }
        function closeApiKeyModal(){ document.getElementById('apiKeyOverlay').style.display='none'; }

        // ── Unified AI fetch helper ──────────────────────────────────────
        async function aiFetch(body, useWebSearch=false){
            const key = getApiKey();
            if(!key) throw new Error('API_KEY_MISSING');
            if(useWebSearch && body.messages) {
                body.tools = [{ type:'web_search_20250305', name:'web_search' }];
            }
            const headers = { 'Content-Type':'application/json', 'x-api-key': key, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' };
            const resp = await fetch('https://api.anthropic.com/v1/messages',{ method:'POST', headers, body:JSON.stringify(body) });
            if(!resp.ok){
                const e = await resp.json().catch(()=>({}));
                throw new Error(e?.error?.message || `HTTP ${resp.status}`);
            }
            const data = await resp.json();
            const text = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n').trim();
            if(!text) throw new Error('No response from AI');
            return text;
        }

        // Missing function that home button calls
        function showMyResults(){ showScreen('resultsHistoryScreen'); }

        const G = {
            name:'', chapter:'all', total:20, timerSec:30, mode:'exam',
            questions:[], current:0, score:0, streak:0, maxStreak:0,
            answers:[], bookmarks:new Set(),
            visited:new Set(), marked:new Set(),
            timerId:null, timeLeft:0, frozen:false,
            totalTime:0, qStart:0, answered:false,
            doubleActive:false, audio:true,
            ll:{fifty:1,freeze:1,hint:2,skip:2,double:1}
        };

        // AUDIO
        let actx;
        function getAudioCtx(){ if(!actx) actx=new(window.AudioContext||window.webkitAudioContext)(); return actx; }
        function sfx(type){
            if(!G.audio) return;
            try{
                const ctx=getAudioCtx(); ctx.resume();
                const make=(freq,start,dur,vol=0.15)=>{
                    const o=ctx.createOscillator(),g=ctx.createGain();
                    o.connect(g);g.connect(ctx.destination);
                    o.frequency.setValueAtTime(freq,ctx.currentTime+start);
                    g.gain.setValueAtTime(vol,ctx.currentTime+start);
                    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+start+dur);
                    o.start(ctx.currentTime+start);o.stop(ctx.currentTime+start+dur);
                };
                switch(type){
                    case 'tap':make(700,0,0.06);break;
                    case 'ok':make(523,0,0.12);make(659,0.08,0.12);make(784,0.16,0.15);break;
                    case 'no':make(250,0,0.15);make(180,0.12,0.2);break;
                    case 'fire':[523,659,784,1047].forEach((f,i)=>make(f,i*0.08,0.15,0.12));break;
                    case 'win':[523,659,784,1047,784,1047,1319].forEach((f,i)=>make(f,i*0.12,0.2,0.15));break;
                    case 'tick':make(1200,0,0.03,0.05);break;
                }
            }catch(e){}
        }

        // TOAST
        function toast(msg,type='info'){
            const c=document.getElementById('toastContainer');
            const t=document.createElement('div'); t.className=`toast t-${type}`; t.innerHTML=msg;
            c.appendChild(t); setTimeout(()=>t.remove(),3200);
        }

        // CONFETTI
        function confetti(){
            const box=document.getElementById('confettiBox');
            const colors=['#7c3aed','#2563eb','#059669','#dc2626','#ea580c','#d97706','#ec4899'];
            for(let i=0;i<100;i++){
                setTimeout(()=>{
                    const p=document.createElement('div'); p.className='c-piece';
                    p.style.left=Math.random()*100+'%';
                    p.style.width=(6+Math.random()*10)+'px'; p.style.height=(6+Math.random()*10)+'px';
                    p.style.background=colors[Math.floor(Math.random()*colors.length)];
                    p.style.borderRadius=Math.random()>0.5?'50%':'2px';
                    p.style.animationDuration=(2+Math.random()*3)+'s';
                    box.appendChild(p); setTimeout(()=>p.remove(),5000);
                },i*25);
            }
        }

        function shuffle(a){ const b=[...a]; for(let i=b.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]]; } return b; }
        function showScreen(id){
            document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
            const el = document.getElementById(id);
            if(el) el.classList.add('active');
            window.scrollTo({top:0,behavior:'smooth'});
            const fc=document.querySelector('.floating-controls');
            if(fc) fc.classList.toggle('hidden', id==='quizScreen');
            const bar=document.querySelector('.exam-bottombar');
            if(bar) bar.classList.toggle('visible', id==='quizScreen');
            if(id==='resultsHistoryScreen'){ loadResultsHistory(); if(typeof rhSyncEngineChips==='function') rhSyncEngineChips(); }
        }
        function toggleTheme(){
            document.body.classList.toggle('dark');
            const isDark = document.body.classList.contains('dark');
            document.getElementById('themeBtn').textContent = isDark ? '☀️' : '🌙';
            try { localStorage.setItem('upqz_theme', isDark ? 'dark' : 'light'); } catch(e){}
        }
        /* Restore theme on load */
        (function(){
            if(localStorage.getItem('upqz_theme') === 'dark'){
                document.body.classList.add('dark');
                document.addEventListener('DOMContentLoaded', function(){
                    var btn = document.getElementById('themeBtn');
                    if(btn) btn.textContent = '☀️';
                });
            }
        })();

        function toggleLang(){
            const btn = document.getElementById('langBtn');
            const hiding = !document.body.classList.contains('hide-hindi');
            document.body.classList.toggle('hide-hindi', hiding);
            btn.textContent = hiding ? 'EN' : 'HI';
            btn.title = hiding ? 'Show Hindi' : 'Hide Hindi';
        }

        function toggleEnginePanel(){
            const panel = document.getElementById('enginePanel');
            const fab   = document.getElementById('engineFab');
            const isOpen = panel.classList.contains('open');
            panel.classList.toggle('open', !isOpen);
            fab.classList.toggle('ep-open', !isOpen);
            if(!isOpen) syncEpButtons();
        }

        function syncEpButtons(){
            document.querySelectorAll('.ep-btn').forEach(b=>{
                b.classList.toggle('ep-active', b.dataset.engine === AI_ENGINE);
            });
            const lbl = document.getElementById('epCurrentLabel');
            if(lbl) lbl.textContent = `Current: ${getEngineLabel()}`;
            const fab = document.getElementById('engineFab');
            if(fab) fab.textContent = AI_ENGINE==='auto'?'⚡': AI_ENGINE==='gemini'?'✨': AI_ENGINE==='claude'?'🟣': AI_ENGINE==='chatgpt'?'🟢': AI_ENGINE==='pollinations'?'🔵': AI_ENGINE.includes('llama')?'🦙':'🧠';
        }

        function epSwitch(eng){
            switchEngine(eng);
            syncEpButtons();
            sfx('tap');
            var lbl = getEngineLabel();
            toast(`AI switched to ${lbl}`,'info');
            // Update inline AI label in quiz panel
            var el = document.getElementById('aiCurrentLabel');
            if(el) el.textContent = lbl;
            // Keep panel open so user sees the active state
        }

        // Close engine panel when clicking outside
        document.addEventListener('click', function(e){
            const panel = document.getElementById('enginePanel');
            const fab   = document.getElementById('engineFab');
            if(panel && panel.classList.contains('open')){
                if(!panel.contains(e.target) && e.target !== fab){
                    panel.classList.remove('open');
                    fab.classList.remove('ep-open');
                }
            }
        });
        function toggleAudio(){ G.audio=!G.audio; document.getElementById('audioBtn').textContent=G.audio?'🔊':'🔇'; }
        function openApiKeySettings(){
            const overlay = document.getElementById('apiKeyOverlay');
            const inp = document.getElementById('apiKeyInput');
            const existing = getApiKey();
            if(existing && inp) inp.value = existing;
            overlay.style.display = 'flex';
            window._apiKeyCb = null; // just saving, no callback needed
        }
        // ═══════════ HOME SCREEN HELPERS ═══════════

        function quickStart(type){
            sfx('tap');
            const presets={
                rapid:    {count:'25', timer:15, mode:'speed'},
                practice: {count:'25', timer:0,  mode:'practice'},
                exam:     {count:'25', timer:30, mode:'exam'},
                marathon: {count:'50', timer:45, mode:'exam'}
            };
            const p=presets[type];
            // Reset chapter to all for quick start
            if(typeof window.selectChapter === 'function') window.selectChapter('all');
            else { document.getElementById('chapterInput').value='all'; onChapterChange(); }
            // Activate correct pill
            const pillBtn = document.querySelector(`.count-pill[data-val="${p.count}"]`);
            if(pillBtn) pickCount(pillBtn);
            else document.getElementById('countInput').value=p.count;
            document.getElementById('timerInput').value=p.timer;
            document.querySelectorAll('.ts-btn').forEach(b=>b.classList.remove('active'));
            const tsBtn=document.querySelector(`.ts-btn[data-val="${p.timer}"]`);
            if(tsBtn) tsBtn.classList.add('active');
            updateTimerHint(p.timer);
            document.querySelectorAll('.mode-v2').forEach(c=>c.classList.remove('active'));
            const modeEl=document.querySelector(`.mode-v2[data-mode="${p.mode}"]`);
            if(modeEl) modeEl.classList.add('active');
            G.mode=p.mode;
            initQuiz();
        }

        function pickTimer(el){
            document.querySelectorAll('.ts-btn').forEach(b=>b.classList.remove('active'));
            el.classList.add('active');
            const val=el.dataset.val;
            document.getElementById('timerInput').value=val;
            updateTimerHint(parseInt(val));
            sfx('tap');
        }

        function updateTimerHint(val){
            const hint=document.getElementById('timerHint');
            if(!hint) return;
            if(val===0) hint.textContent='No time limit';
            else if(val<=15) hint.textContent=val+'s — Hard';
            else if(val<=30) hint.textContent=val+'s — Normal';
            else if(val<=45) hint.textContent=val+'s — Easy';
            else hint.textContent=val+'s — Relaxed';
        }

        function pickMode(el){
            document.querySelectorAll('.mode-v2, .mode-card').forEach(c=>c.classList.remove('active'));
            el.classList.add('active');
            G.mode=el.dataset.mode;
            sfx('tap');
        }

        function initHeroParticles(){
            const container=document.getElementById('heroParticles');
            if(!container) return;
            for(let i=0;i<20;i++){
                const p=document.createElement('div');
                p.className='hero-particle';
                p.style.left=Math.random()*100+'%';
                p.style.top=Math.random()*100+'%';
                p.style.animationDelay=Math.random()*6+'s';
                p.style.animationDuration=(4+Math.random()*4)+'s';
                p.style.width=(3+Math.random()*4)+'px';
                p.style.height=p.style.width;
                container.appendChild(p);
            }
        }

        function loadHomeStats(){
            try{
                const history=JSON.parse(localStorage.getItem(_lsk('quizHistory'))||'[]');
                document.getElementById('totalPlayed').textContent=history.length;
                if(history.length>0){
                    const avg=Math.round(history.reduce((s,h)=>s+h.score,0)/history.length);
                    const best=Math.max(...history.map(h=>h.score));
                    const bestStr=Math.max(...history.map(h=>h.streak||0));
                    document.getElementById('avgScore').textContent=avg+'%';
                    document.getElementById('bestScore').textContent=best+'%';
                    document.getElementById('bestStreak').textContent=bestStr;
                }
                if(history.length>0){
                    document.getElementById('historyHeader') && (document.getElementById('historyHeader').style.display='none');
                }
            }catch(e){ console.log('History load error:',e); }
            // Update bookmark & wrong-q buttons
            try{ updateHomeBookmarkBtn(); }catch(e){}
            try{ updateHomeWrongBtn(); }catch(e){}
        }

        function updateTestSeriesProgress(){
            try {
                const total = QUESTIONS.length;
                // Count attempted questions (those with a saved progress entry)
                let attempted = 0;
                try {
                    const usedKey = _lsk ? _lsk('usedIds_all') : 'upqz_usedIds_all';
                    const used = JSON.parse(localStorage.getItem(usedKey)||'[]');
                    attempted = used.length;
                } catch(e){
                    // fallback: count from history unique questions
                    const h = JSON.parse(localStorage.getItem(_lsk ? _lsk('quizHistory') : 'upqz_quizHistory')||'[]');
                    attempted = Math.min(h.reduce((s,x)=>s+(x.count||0),0), total);
                }
                const pct = total>0 ? Math.max(1,Math.round((attempted/total)*100)) : 1;
                const bar = document.getElementById('tsProgressBar');
                const lbl = document.getElementById('tsProgressLabel');
                if(bar) bar.style.width = pct+'%';
                if(lbl) lbl.textContent = attempted+'/'+total+' questions';
            } catch(e){ 
                const lbl = document.getElementById('tsProgressLabel');
                if(lbl) lbl.textContent = QUESTIONS.length+' questions';
                const bar = document.getElementById('tsProgressBar');
                if(bar) bar.style.width = '1%';
            }
        }

        function formatHistoryDate(dateStr){
            try{
                const d=new Date(dateStr), now=new Date(), diff=now-d;
                const mins=Math.floor(diff/60000), hrs=Math.floor(diff/3600000), days=Math.floor(diff/86400000);
                if(mins<1) return 'Just now';
                if(mins<60) return mins+'m ago';
                if(hrs<24) return hrs+'h ago';
                if(days<7) return days+'d ago';
                return d.toLocaleDateString('en-IN',{day:'numeric',month:'short'});
            }catch(e){ return ''; }
        }

        document.addEventListener('DOMContentLoaded',()=>{
            // Populate CHAPTER_COUNTS now that QUESTIONS array is fully declared
            QUESTIONS.forEach(q=>{ CHAPTER_COUNTS[q.ch] = (CHAPTER_COUNTS[q.ch]||0)+1; });
            initHeroParticles();
            loadHomeStats();
            injectChapterCounts();
            onChapterChange();
            updateTestSeriesProgress();
            /* ── Restore saved name & timer preference ── */
            try {
                const savedName = localStorage.getItem('upqz_pref_name');
                const savedTimer = localStorage.getItem('upqz_pref_timer');
                const nameEl  = document.getElementById('nameInput');
                const timerEl = document.getElementById('timerInput');
                if(savedName  && nameEl)  nameEl.value  = savedName;
                if(savedTimer && timerEl) timerEl.value = savedTimer;
            } catch(e){}
        });

        // ═══════════ CHAPTER / SET HELPERS ═══════════

        // CHAPTER_COUNTS is populated inside DOMContentLoaded (after QUESTIONS array is declared below)
        // NOTE: CHAPTER_NAMES is declared in questions.js (loaded first) — do NOT redeclare here
        const CHAPTER_COUNTS = {};

        // Inject question counts into chapter dropdown options
        function injectChapterCounts(){
            // Chapter counts are now displayed inside the modal cards, not <select> options.
            // Just refresh trigger label to reflect latest counts.
            const curCh = document.getElementById('chapterInput').value || '1';
            if(typeof updateTriggerLabel === 'function') updateTriggerLabel(curCh);
        }

        // localStorage key for tracking used questions per chapter
        function storageKey(ch){ return 'upqz_used_ch' + ch; }  // raw key (Firebase path)

        function getUsedIndices(ch){
            try{ return JSON.parse(localStorage.getItem(_lsk(storageKey(ch)))||'[]'); }
            catch(e){ return []; }
        }

        function saveUsedIndices(ch, arr){
            const key = storageKey(ch);
            try{ localStorage.setItem(_lsk(key), JSON.stringify(arr)); }catch(e){}
            if (typeof _fbSyncUsedCh === 'function') _fbSyncUsedCh(key);
        }

        function resetChapterProgress(){
            const ch = document.getElementById('chapterInput').value;
            if(ch === 'all'){
                // Reset all chapters
                for(let c=1;c<=17;c++){
                    localStorage.removeItem(_lsk(storageKey(c)));
                    if (typeof _fbRemoveUsedCh === 'function') _fbRemoveUsedCh(storageKey(c));
                }
                toast('↺ Progress reset for ALL chapters','info');
            } else {
                localStorage.removeItem(_lsk(storageKey(ch)));
                if (typeof _fbRemoveUsedCh === 'function') _fbRemoveUsedCh(storageKey(ch));
                toast(`↺ Progress reset for Ch ${ch}:`+' fresh start!','info');
            }
            injectChapterCounts();
            onChapterChange();
        }

        function onChapterChange(){
            const ch  = document.getElementById('chapterInput').value;
            const bar = document.getElementById('chapterInfoBar');
            const cntSel = document.getElementById('countInput');
            const lockPrompt = document.getElementById('chapterLockPrompt');
            if(lockPrompt) lockPrompt.style.display='none';

            if(typeof updateTriggerLabel === 'function') updateTriggerLabel(ch);

            if(ch === 'all'){
                if(bar) bar.style.display='none';
                rebuildCountOptions(QUESTIONS.length, true);
                return;
            }

            const pool  = QUESTIONS.filter(q=>q.ch==ch);
            const total = pool.length;
            const used  = getUsedIndices(ch).length;
            const rem   = total - used;

            if(bar) bar.style.display='flex';
            const cibCountEl = document.getElementById('cibCount');
            if(cibCountEl) cibCountEl.textContent = `${total} question${total!==1?'s':''} in chapter`;
            const setEl = document.getElementById('cibSet');
            if(setEl){
                if(rem===0){ setEl.textContent='All done! ✅ Reset to retry'; setEl.className='cib-set all-done'; }
                else if(used===0){ setEl.textContent='Not started yet'; setEl.className='cib-set fresh'; }
                else { setEl.textContent=`${used} done · ${rem} remaining`; setEl.className='cib-set'; }
            }

            rebuildCountOptions(rem, false, total);
        }

        function pickCount(btn){
            if(btn.classList.contains('disabled')) return;
            document.querySelectorAll('.count-pill').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('countInput').value = btn.dataset.val;
        }

        function rebuildCountOptions(available, isAll, chTotal){
            const total = isAll ? QUESTIONS.length : (chTotal || 0);
            const allNum = isAll ? QUESTIONS.length : available;

            // Update All pill label
            const allPillNum = document.getElementById('countPillAllNum');
            if(allPillNum) allPillNum.textContent = allNum > 0 ? `(${allNum})` : '';

            // Enable/disable pills based on availability
            document.querySelectorAll('.count-pill').forEach(btn => {
                const val = btn.dataset.val;
                if(val === 'all'){
                    btn.classList.toggle('disabled', allNum === 0);
                } else {
                    const n = parseInt(val);
                    btn.classList.toggle('disabled', n > (isAll ? QUESTIONS.length : total));
                }
            });

            // Smart default selection
            const cur = document.getElementById('countInput').value;
            const pills = [...document.querySelectorAll('.count-pill:not(.disabled)')];
            if(!pills.find(b=>b.dataset.val===cur) && pills.length){
                pickCount(pills[0]);
            }
        }

        // ═══════════ INIT QUIZ ═══════════
        function initQuiz(){
            sfx('tap'); if(actx) actx.resume();
            G.name=document.getElementById('nameInput').value||'Student';
            G.chapter=document.getElementById('chapterInput').value;
            const rawCount=document.getElementById('countInput').value;
            G.timerSec=parseInt(document.getElementById('timerInput').value);

            /* ── Save name & timer preference ── */
            try {
                localStorage.setItem('upqz_pref_name',  G.name);
                localStorage.setItem('upqz_pref_timer', document.getElementById('timerInput').value);
            } catch(e){}

            // ── PAID LOCK CHECK ──
            if (!window._upqzIsTopicUnlocked(QUIZ_COURSE_ID) && !window._upqzIsPaid() && G.chapter !== '1') {
                window.openPaymentPopup();
                return;
            }

            // Build the question pool
            let pool = G.chapter==='all' ? [...QUESTIONS] : QUESTIONS.filter(q=>q.ch==G.chapter);

            // ── SET-BASED TRACKING (specific chapter only) ──
            let setLabel = null;
            let setNum   = 1;
            let totalSets= 1;

            if(G.chapter !== 'all'){
                const usedIds  = getUsedIndices(G.chapter);
                // Questions not yet attempted (by their QUESTIONS array index)
                const freshPool = pool.filter((_,i)=>!usedIds.includes(QUESTIONS.indexOf(pool[i])));

                if(freshPool.length === 0){
                    // All done — ask to reset
                    const doReset = confirm(`✅ You have completed ALL questions in this chapter!\n\nReset progress to attempt them again from the beginning?`);
                    if(doReset){
                        localStorage.removeItem(_lsk(storageKey(G.chapter)));
                        if (typeof _fbRemoveUsedCh === 'function') _fbRemoveUsedCh(storageKey(G.chapter));
                        injectChapterCounts(); onChapterChange();
                        // Retry with fresh pool
                        pool = [...pool];
                    } else { return; }
                } else {
                    pool = freshPool;
                }

                // Compute set numbers for display
                const chTotal     = QUESTIONS.filter(q=>q.ch==G.chapter).length;
                const usedCount   = QUESTIONS.filter(q=>q.ch==G.chapter).length - pool.length;
                const batchSize   = rawCount==='all' ? pool.length : parseInt(rawCount);
                totalSets         = Math.ceil(chTotal / (batchSize||1));
                setNum            = Math.floor(usedCount / (batchSize||1)) + 1;
                setLabel          = totalSets>1 ? `Set ${setNum}/${totalSets}` : null;
            }

            if(pool.length === 0){
                toast('📭 No questions yet! Add questions to QUESTIONS array in the HTML file.','error');
                // Show helpful overlay
                const msg = G.chapter==='all'
                    ? 'No questions found in any chapter.\nOpen the HTML file and add questions to the QUESTIONS array.'
                    : `No questions in Chapter ${G.chapter} yet.\nOpen the HTML file and add questions with ch:${G.chapter}.`;
                alert('📭 ' + msg);
                return;
            }

            if(pool.length < 3 && G.chapter !== 'all'){
                // Don't fallback silently — just use what's there
                if(pool.length === 0){ toast('⚠️ No questions left — reset chapter progress','error'); return; }
            }

            const wantCount = rawCount==='all' ? pool.length : parseInt(rawCount);
            G.questions=shuffle(pool).slice(0, Math.min(wantCount, pool.length));
            G.total=G.questions.length;
            G.current=0; G.score=0; G.streak=0; G.maxStreak=0;
            G.answers=new Array(G.total).fill(null);
            G.bookmarks=new Set(); G.visited=new Set(); G.marked=new Set(); G.totalTime=0; G.doubleActive=false;
            G.ll={fifty:1,freeze:1,hint:2,skip:2,double:1};

            // ── SAVE used question indices BEFORE quiz starts ──
            if(G.chapter !== 'all'){
                const prevUsed = getUsedIndices(G.chapter);
                const newUsed  = [...new Set([...prevUsed, ...G.questions.map(q=>QUESTIONS.indexOf(q))])];
                saveUsedIndices(G.chapter, newUsed);
                injectChapterCounts();
                onChapterChange();
            }

            ['ll5050','llFreeze','llHint','llSkip','llDouble'].forEach(id=>document.getElementById(id).classList.remove('used'));
            updateLLCounts();

            const avatarEl=document.getElementById('qAvatar'); if(avatarEl) avatarEl.textContent=G.name[0].toUpperCase();
            document.getElementById('qName').textContent=G.name;
            const _chv=document.getElementById('chapterInput').value;
            const chTxt=_chv==='all'?'All Chapters':`Ch ${_chv} — ${(typeof CHAPTER_NAMES!=='undefined'&&CHAPTER_NAMES[_chv])||''}`;
            const modeTxt=G.mode.charAt(0).toUpperCase()+G.mode.slice(1);
            document.getElementById('qMeta').textContent=`${chTxt} • ${modeTxt} Mode`;

            // Show/hide the Set badge in topbar
            const setBadge = document.getElementById('etbSetBadge');
            if(setLabel && setBadge){ setBadge.textContent=setLabel; setBadge.style.display='inline-flex'; }
            else if(setBadge){ setBadge.style.display='none'; }

            const nav=document.getElementById('qNav'); nav.innerHTML='';
            for(let i=0;i<G.total;i++){
                const pip=document.createElement('div'); pip.className='qn-pip'; pip.textContent=i+1;
                pip.onclick=()=>jumpTo(i); nav.appendChild(pip);
            }

            showScreen('quizScreen'); renderQ();
        }

        function updateLLCounts(){
            document.getElementById('ll5050c').textContent=G.ll.fifty;
            document.getElementById('llFreezec').textContent=G.ll.freeze;
            document.getElementById('llHintc').textContent=G.ll.hint;
            document.getElementById('llSkipc').textContent=G.ll.skip;
            document.getElementById('llDoublec').textContent=G.ll.double;
        }

        // ═══════════ RENDER QUESTION ═══════════
        function renderQ(){
            G.answered=false; G.doubleActive=false;
            const q=G.questions[G.current], i=G.current;

            // Progress bar (drawer)
            document.getElementById('pBar').style.width=`${((i+1)/G.total)*100}%`;

            // Mark current question as visited
            G.visited.add(G.current);

            // Stats (compact strip)
            const correctCount=G.answers.filter(a=>a&&a.correct).length;
            const wrongCount=G.answers.filter(a=>a&&!a.correct&&!a.skipped).length;
            const skipCount=G.answers.filter(a=>a===null||(a&&a.skipped)).length;
            document.getElementById('hCorrect').textContent=correctCount;
            document.getElementById('hWrong').textContent=wrongCount;
            document.getElementById('hStreak').textContent=G.streak;
            document.getElementById('hScore').textContent=G.score+' pts';

            // Pips — exam palette states
            document.querySelectorAll('.qn-pip').forEach((p,idx)=>{
                p.className='qn-pip';
                const a=G.answers[idx];
                const isAnswered = a && !a.skipped;
                const isMarked   = G.marked.has(idx);
                const isVisited  = G.visited.has(idx);

                if(idx===G.current){
                    p.classList.add('active');
                } else if(isMarked && isAnswered){
                    p.classList.add('marked-for-review','answered');
                } else if(isMarked){
                    p.classList.add('marked-for-review');
                } else if(isAnswered){
                    p.classList.add('answered');
                } else if(isVisited){
                    p.classList.add('visited-unanswered');
                }
                // else: default not-visited style
            });

            // Palette counts
            updatePalette();

            // Strip — show "Q current / total" so user always knows position
            document.getElementById('esQnum').textContent=`${i+1}`;
            // Topbar progress chip — keep it in sync too
            const etbQP=document.getElementById('etbQProgress');
            if(etbQP) etbQP.textContent=`Q${i+1}/${G.total}`;
            document.getElementById('esTime').textContent='⏱ 00:00';

            // Marks
            const marksPlus=G.doubleActive?'+2.0':'+1.0';
            document.querySelector('.es-plus').textContent=marksPlus;
            document.querySelector('.es-minus').textContent=G.mode==='exam'?'-0.25':'-0';

            // Tags
            const chNames={1:'Overview',2:'Geography',3:'Climate',4:'Wildlife',5:'Rivers',6:'Agriculture',7:'Irrigation',8:'Tourism',9:'Industry',10:'Minerals',11:'Transport',12:'History',13:'Culture',14:'Literature',15:'Tribal',16:'Education',17:'Political',18:'Schemes',19:'Census 2011'};
            document.getElementById('qTags').innerHTML=`
                <span class="eq-tag chapter">Ch ${q.ch}: ${chNames[q.ch]||'UP'}</span>
                <span class="eq-tag diff-${q.diff}">${q.diff.toUpperCase()}</span>
                <span class="eq-tag exam">${q.exam}</span>
            `;

            document.getElementById('bookmarkBtn').classList.toggle('active',G.bookmarks.has(i));

            // Question text
            document.getElementById('qText').textContent=q.q;
            const hindiEl=document.getElementById('qHindi');
            hindiEl.textContent=q.hi||'';
            hindiEl.style.display=q.hi?'block':'none';

            // Options — use 1/2/3/4/5 number labels (Image-2 style)
            const optKeys=['1','2','3','4','5'];
            const list=document.getElementById('optList'); list.innerHTML='';
            q.opts.forEach((opt,oi)=>{
                const el=document.createElement('div'); el.className='opt-card'; el.onclick=()=>pickAnswer(oi);
                el.innerHTML=`
                    <div class="opt-num">${optKeys[oi]}.</div>
                    <div class="opt-label">${opt}</div>
                    <div class="opt-indicator"></div>
                `;
                list.appendChild(el);
            });

            // Reset correct-answer-bar + helpful row
            const cab=document.getElementById('correctAnsBar'); if(cab) cab.className='correct-ans-bar';
            const hr=document.getElementById('helpfulRow'); if(hr) hr.className='helpful-row';

            // Build top dot nav
            const qdotInner=document.getElementById('qDotInner');
            if(qdotInner){
                qdotInner.innerHTML='';
                for(let di=0;di<G.total;di++){
                    const dot=document.createElement('div');
                    const a=G.answers[di];
                    let cls='qdot';
                    if(di===i) cls+=' qdot-active';
                    else if(a){ if(a.correct) cls+=' qdot-correct'; else if(a.skipped) cls+=' qdot-skipped'; else cls+=' qdot-wrong'; }
                    dot.className=cls; dot.textContent=di+1;
                    dot.onclick=()=>jumpTo(di);
                    qdotInner.appendChild(dot);
                }
                // Scroll active dot into view
                const activeDotEl=qdotInner.children[i];
                if(activeDotEl) setTimeout(()=>activeDotEl.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}),50);
            }

            // If already answered
            if(G.answers[i]&&!G.answers[i].skipped) showPrevAnswer(i);

            // Reset explanation + inline AI card
            document.getElementById('expBox').className='eq-explanation';
            aiHideTrigger();
            resetQuickAiCard();

            // Next btn label
            document.getElementById('nextBtn').innerHTML=i===G.total-1?'Submit 🏁':'Save & Next <span>→</span>';

            // Topbar time
            document.getElementById('etbTimeText').textContent=G.timerSec>0?formatTime(G.timerSec):'∞';

            // Timer
            G.qStart=Date.now(); startTimer();
        }

        function showCorrectAnsBar(q, status){
            const bar=document.getElementById('correctAnsBar');
            const lbl=document.getElementById('cabLabel');
            const pct=document.getElementById('cabPct');
            const hr=document.getElementById('helpfulRow');
            if(!bar) return;
            lbl.textContent=`Correct Answer Is: ${q.ans+1}`;
            // Generate a plausible "% got this right" based on difficulty
            const pctVal = q.diff==='easy'?Math.floor(55+Math.random()*30):q.diff==='hard'?Math.floor(15+Math.random()*30):Math.floor(30+Math.random()*35);
            pct.textContent=`${pctVal}% got this right`;
            bar.className='correct-ans-bar visible';
            if(hr) hr.className='helpful-row visible';
        }

        function showPrevAnswer(idx){
            G.answered=true;
            const q=G.questions[idx], a=G.answers[idx];
            const opts=document.querySelectorAll('.opt-card');
            opts.forEach((el,oi)=>{
                el.classList.add('locked');
                if(oi===q.ans){ el.classList.add('correct-opt'); el.querySelector('.opt-indicator').textContent='✓'; }
                if(a.selected===oi&&oi!==q.ans){ el.classList.add('wrong-opt'); el.querySelector('.opt-indicator').textContent='✗'; }
            });
            const expBox=document.getElementById('expBox');
            expBox.className=`eq-explanation visible`;
            document.getElementById('expText').textContent=q.exp;
            showCorrectAnsBar(q, a.correct?'correct':'wrong');
            aiShowTrigger(q);
        }

        // ═══════════ PICK ANSWER ═══════════
        function pickAnswer(idx){
            if(G.answered) return;
            G.answered=true; sfx('tap');
            clearInterval(G.timerId);
            const elapsed=Math.round((Date.now()-G.qStart)/1000);
            G.totalTime+=elapsed;

            const q=G.questions[G.current];
            const isCorrect=idx===q.ans;

            G.answers[G.current]={selected:idx,correct:isCorrect,skipped:false,time:elapsed};

            if(isCorrect){
                let pts=G.doubleActive?2:1;
                G.score+=pts; G.streak++;
                G.maxStreak=Math.max(G.maxStreak,G.streak);
                sfx('ok');
                if(G.streak>0&&G.streak%5===0){ G.score+=1; sfx('fire'); toast(`🔥 ${G.streak} Streak! +1 Bonus!`,'streak'); }
            }else{
                if(G.mode==='exam') G.score=Math.max(0,Math.round((G.score-0.25)*100)/100);
                G.streak=0; sfx('no');
            }

            document.getElementById('hScore').textContent=G.score+' pts';
            document.getElementById('hStreak').textContent=`${G.streak}🔥`;
            document.getElementById('hCorrect').textContent=G.answers.filter(a=>a&&a.correct).length;
            updatePalette();

            const opts=document.querySelectorAll('.opt-card');
            const card=document.getElementById('qCard');
            opts.forEach((el,oi)=>{
                el.classList.add('locked');
                if(oi===q.ans){ el.classList.add('correct-opt'); el.querySelector('.opt-indicator').textContent='✓'; }
                if(oi===idx&&!isCorrect){ el.classList.add('wrong-opt'); el.querySelector('.opt-indicator').textContent='✗'; }
            });

            if(isCorrect){ card.classList.add('correct-flash'); setTimeout(()=>card.classList.remove('correct-flash'),600); }
            else{ card.classList.add('wrong-shake'); setTimeout(()=>card.classList.remove('wrong-shake'),500); }

            const expBox=document.getElementById('expBox');
            expBox.className=`eq-explanation visible`;
            document.getElementById('expText').textContent=q.exp;
            showCorrectAnsBar(q, isCorrect?'correct':'wrong');
            aiShowTrigger(q);

            const pips=document.querySelectorAll('.qn-pip');
            if(pips[G.current]){ pips[G.current].classList.remove('active'); pips[G.current].classList.add(isCorrect?'correct':'wrong'); }

            // Update top qdot nav
            const qdotInner=document.getElementById('qDotInner');
            if(qdotInner && qdotInner.children[G.current]){
                qdotInner.children[G.current].classList.add(isCorrect?'qdot-correct':'qdot-wrong');
            }

            if(G.mode==='speed') setTimeout(()=>goNext(),1200);
        }

        function voteHelpful(btn, vote){
            document.querySelectorAll('.helpful-btn').forEach(b=>b.classList.remove('voted'));
            btn.classList.add('voted');
            sfx('tap');
        }

        // ═══════════ NAV ═══════════
        function goNext(){
            sfx('tap');
            if(!G.answered){
                clearInterval(G.timerId);
                const elapsed=Math.round((Date.now()-G.qStart)/1000);
                G.answers[G.current]={selected:-1,correct:false,skipped:true,time:elapsed};
                G.streak=0;
                const pips=document.querySelectorAll('.qn-pip');
                if(pips[G.current]) pips[G.current].classList.add('skipped');
            }
            if(G.current<G.total-1){ G.current++; renderQ(); }
            else showResults();
        }

        function goPrev(){ if(G.current>0){ sfx('tap'); G.current--; renderQ(); } }
        function jumpTo(idx){ sfx('tap'); G.current=idx; renderQ(); }

        // ═══════════ TIMER ═══════════
        const TIMER_CIRCUMFERENCE=94.25; // 2*PI*15 (r=15)
        function startTimer(){
            clearInterval(G.timerId); G.frozen=false;
            const wrap=document.getElementById('timerWrap');
            const circle=document.getElementById('timerCircle');
            const numEl=document.getElementById('timerNum');

            if(G.timerSec===0){ numEl.textContent='∞'; circle.style.strokeDashoffset=0; wrap.className='etb-timer'; return; }

            G.timeLeft=G.timerSec;

            function tick(){
                numEl.textContent=G.timeLeft;
                const offset=TIMER_CIRCUMFERENCE*(1-G.timeLeft/G.timerSec);
                circle.style.strokeDashoffset=offset;
                wrap.className='etb-timer';
                if(G.timeLeft<=5) wrap.classList.add('critical');
                else if(G.timeLeft<=10) wrap.classList.add('warn');
                // Update topbar text and strip time
                const elapsed2=G.timerSec-G.timeLeft;
                const etbEl=document.getElementById('etbTimeText');
                const esEl=document.getElementById('esTime');
                if(etbEl) etbEl.textContent=formatTime(G.timeLeft);
                if(esEl) esEl.textContent='⏱ '+formatTime(elapsed2);
                if(G.timeLeft<=5&&G.timeLeft>0) sfx('tick');
            }
            tick();

            G.timerId=setInterval(()=>{
                if(G.answered||G.frozen) return;
                G.timeLeft--;
                tick();
                if(G.timeLeft<=0){
                    clearInterval(G.timerId);
                    const elapsed=G.timerSec;
                    G.answers[G.current]={selected:-1,correct:false,skipped:true,time:elapsed};
                    G.answered=true; G.streak=0;
                    document.getElementById('hStreak').textContent=`${G.streak}🔥`;

                    const q=G.questions[G.current];
                    document.querySelectorAll('.opt-card').forEach((el,oi)=>{
                        el.classList.add('locked');
                        if(oi===q.ans){ el.classList.add('correct-opt'); el.querySelector('.opt-indicator').textContent='✓'; }
                    });

                    const expBox=document.getElementById('expBox');
                    expBox.className='eq-explanation visible wrong-exp';
                    document.getElementById('expText').textContent='⏰ Time\'s up! '+q.exp;

                    sfx('no'); toast('⏰ Time\'s up!','error');
                    const pips=document.querySelectorAll('.qn-pip');
                    if(pips[G.current]) pips[G.current].classList.add('skipped');

                    setTimeout(()=>{
                        if(G.current<G.total-1){ G.current++; renderQ(); }
                        else showResults();
                    },2000);
                }
            },1000);
        }

        // ═══════════ LIFELINES ═══════════
        function lifeline5050(){
            if(G.ll.fifty<=0||G.answered) return;
            G.ll.fifty--; if(G.ll.fifty<=0) document.getElementById('ll5050').classList.add('used');
            updateLLCounts(); sfx('tap');
            const q=G.questions[G.current]; const wrong=[];
            q.opts.forEach((_,oi)=>{ if(oi!==q.ans) wrong.push(oi); });
            // Remove 3 of 4 wrong options → leaves correct + 1 distractor (true 50:50 for 5 opts)
            const remove=shuffle(wrong).slice(0,3);
            document.querySelectorAll('.opt-card').forEach((el,oi)=>{ if(remove.includes(oi)) el.classList.add('dimmed'); });
            toast('✂️ 50:50 — 3 wrong options removed!','info');
        }
        function lifelineFreeze(){
            if(G.ll.freeze<=0||G.answered||G.timerSec===0) return;
            G.ll.freeze--; if(G.ll.freeze<=0) document.getElementById('llFreeze').classList.add('used');
            updateLLCounts(); sfx('tap'); G.frozen=true;
            toast('🧊 Timer frozen for 10s!','info');
            setTimeout(()=>{ G.frozen=false; if(!G.answered) toast('⏱️ Timer resumed!','info'); },10000);
        }
        function lifelineHint(){
            if(G.ll.hint<=0||G.answered) return;
            G.ll.hint--; if(G.ll.hint<=0) document.getElementById('llHint').classList.add('used');
            updateLLCounts(); sfx('tap');
            const expBox=document.getElementById('expBox');
            expBox.className='explanation-box visible';
            document.getElementById('expText').textContent='💡 Hint: '+G.questions[G.current].exp;
            toast('💡 Hint revealed!','info');
        }
        function lifelineSkip(){
            if(G.ll.skip<=0) return;
            G.ll.skip--; if(G.ll.skip<=0) document.getElementById('llSkip').classList.add('used');
            updateLLCounts(); sfx('tap'); toast('⏭️ Question skipped!','info'); goNext();
        }
        function lifelineDouble(){
            if(G.ll.double<=0||G.answered) return;
            G.ll.double--; if(G.ll.double<=0) document.getElementById('llDouble').classList.add('used');
            updateLLCounts(); sfx('tap'); G.doubleActive=true;
            toast('✨ Double points activated!','streak');
        }
        function toggleBookmark(){
            sfx('tap');
            const i = G.current;
            // Sync both bookmarks (for review system) and marked (for palette)
            if(G.bookmarks.has(i)){ G.bookmarks.delete(i); G.marked.delete(i); }
            else { G.bookmarks.add(i); G.marked.add(i); }
            const isMarked = G.bookmarks.has(i);
            document.getElementById('bookmarkBtn').classList.toggle('active', isMarked);
            // Re-render this pip with correct palette state
            const pip = document.querySelectorAll('.qn-pip')[i];
            if(pip){
                pip.classList.remove('marked-for-review','answered','visited-unanswered','active');
                const a = G.answers[i];
                const isAnswered = a && !a.skipped;
                if(isMarked && isAnswered)      pip.classList.add('marked-for-review','answered');
                else if(isMarked)               pip.classList.add('marked-for-review');
                else if(isAnswered)             pip.classList.add('answered');
                else if(G.visited.has(i))       pip.classList.add('visited-unanswered');
                if(i === G.current) { pip.classList.remove('marked-for-review','answered','visited-unanswered'); pip.classList.add('active'); }
            }
            updatePalette();
            toast(isMarked ? '🚩 Marked for review' : '🔖 Mark removed', 'info');
        }
        function reportQuestion(){ sfx('tap'); toast('🚩 Reported. Thank you!','info'); }

        // ═══════════ RESULTS (FIXED SKIP COUNTING) ═══════════
        function showResults(){
            clearInterval(G.timerId); sfx('win');

            // FIX: Count unanswered (null) entries as skipped too
            const correct=G.answers.filter(a=>a&&a.correct).length;
            const wrong=G.answers.filter(a=>a&&!a.correct&&!a.skipped).length;
            const skipped=G.total-correct-wrong; // Everything not correct or wrong = skipped
            const pct=Math.round((correct/G.total)*100);

            showScreen('resultScreen');

            // Animate ring
            const circumference=578.05;
            const offset=circumference*(1-pct/100);
            setTimeout(()=>{ document.getElementById('scoreRing').style.strokeDashoffset=offset; },400);

            let counter=0;
            const ci=setInterval(()=>{
                counter+=Math.ceil(pct/40);
                if(counter>=pct){ counter=pct; clearInterval(ci); }
                document.getElementById('scorePct').textContent=counter+'%';
            },40);

            document.getElementById('rCorrect').textContent=correct;
            document.getElementById('rWrong').textContent=wrong;
            document.getElementById('rSkip').textContent=skipped;
            document.getElementById('rStreak').textContent=G.maxStreak;

            let grade,msg,color;
            if(pct>=90){ grade='🏆 Outstanding!'; msg=`${pct}% — You're an ExamZen Genius!`; color='#059669'; }
            else if(pct>=75){ grade='🌟 Excellent!'; msg=`${pct}% — Impressive knowledge!`; color='#7c3aed'; }
            else if(pct>=60){ grade='👍 Good Job!'; msg=`${pct}% — Keep it up!`; color='#2563eb'; }
            else if(pct>=40){ grade='📖 Needs Work'; msg=`${pct}% — Review and try again!`; color='#d97706'; }
            else{ grade='💪 Don\'t Give Up!'; msg=`${pct}% — Practice makes perfect!`; color='#dc2626'; }

            document.getElementById('rGrade').textContent=grade;
            document.getElementById('rGrade').style.color=color;
            document.getElementById('rMsg').textContent=msg;

            if(pct>=70) confetti();

            try{
                const history=JSON.parse(localStorage.getItem(_lsk('quizHistory'))||'[]');

                // Build chapter breakdown
                const chNames={1:'Overview',2:'Geography',3:'Climate',4:'Wildlife',5:'Rivers',6:'Agriculture',7:'Irrigation',8:'Tourism',9:'Industry',10:'Minerals',11:'Transport',12:'History',13:'Culture',14:'Literature',15:'Tribal',16:'Education',17:'Political',18:'Schemes',19:'Census'};
                const chBreak={};
                G.questions.forEach((q,i)=>{
                    const cn=chNames[q.ch]||`Ch${q.ch}`;
                    if(!chBreak[cn]) chBreak[cn]={correct:0,wrong:0,total:0,ch:q.ch};
                    chBreak[cn].total++;
                    const a=G.answers[i];
                    if(a&&a.correct) chBreak[cn].correct++;
                    else if(a&&!a.skipped) chBreak[cn].wrong++;
                });
                // Find weakest chapter
                let weakChapter=null, weakPct=101;
                Object.entries(chBreak).forEach(([cn,s])=>{
                    if(s.total>0){const p=s.correct/s.total; if(p<weakPct){weakPct=p;weakChapter={name:cn,ch:s.ch,pct:Math.round(p*100)};}}
                });

                // Save per-question snapshot
                const questionSnapshot=G.questions.map((q,i)=>{
                    const a=G.answers[i];
                    return {
                        q:q.q, hi:q.hi||'', opts:q.opts, ans:q.ans, exp:q.exp||'', exam:q.exam||'', ch:q.ch,
                        chName:chNames[q.ch]||`Ch${q.ch}`, diff:q.diff||'medium',
                        selectedIdx:a?a.selected:-1,
                        status:!a?'skipped':a.skipped?'skipped':a.correct?'correct':'wrong',
                        time:a?a.time||0:0
                    };
                });

                history.push({
                    name:G.name, score:pct, correct, total:G.total,
                    date:new Date().toISOString(), streak:G.maxStreak,
                    chapter:G.chapter, mode:G.mode||'exam',
                    chapterBreakdown:chBreak, weakChapter,
                    questions:questionSnapshot
                });
                localStorage.setItem(_lsk('quizHistory'),JSON.stringify(history.slice(-100)));
                if (typeof _fbSyncHistory === 'function') _fbSyncHistory();
                // Persist bookmarks & wrong questions from this session
                try{ persistSessionBookmarks(); }catch(e){}
                try{ persistWrongQuestions(); }catch(e){}
                try{ updateHomeBookmarkBtn(); updateHomeWrongBtn(); }catch(e){}
            }catch(e){console.log('History save error:',e);}

            buildReview();
            try { buildChapterAnalytics(); } catch(e) { console.log('Chapter analytics error:', e); }
        }


        // ═══════════════════════════════════════════════════════
        // ═══════════ CHAPTER ANALYTICS (Result Screen) ═════════
        // ═══════════════════════════════════════════════════════

        function buildChapterAnalytics() {
            const panel    = document.getElementById('chapterAnalyticsPanel');
            const winRow   = document.getElementById('chWinnerRow');
            const rowsList = document.getElementById('chRowsList');
            if (!panel || !winRow || !rowsList) return;

            const chNames = {1:'Overview',2:'Physical Layout',3:'Climate & Soil',4:'Wildlife & Forests',5:'Rivers & Lakes',6:'Agriculture',7:'Irrigation',8:'Tourism',9:'Industry',10:'Minerals & Energy',11:'Transport',12:'History',13:'Art & Culture',14:'Literature & Press',15:'Tribal Communities',16:'Education & Research',17:'Political System',18:'Important Schemes',19:'Census 2011'};

            // Build per-chapter stats from live G data
            const chMap = {};
            G.questions.forEach((q, i) => {
                const key  = q.ch;
                const name = chNames[key] || `Ch ${key}`;
                if (!chMap[key]) chMap[key] = { name, ch: key, correct: 0, total: 0, timeSum: 0, timeCount: 0 };
                const a = G.answers[i];
                chMap[key].total++;
                if (a && a.correct) chMap[key].correct++;
                if (a && a.time > 0) { chMap[key].timeSum += a.time; chMap[key].timeCount++; }
            });

            const chapters = Object.values(chMap);
            if (chapters.length === 0) { panel.style.display = 'none'; return; }

            // Compute pct + avgTime per chapter
            chapters.forEach(c => {
                c.pct    = c.total > 0 ? Math.round((c.correct / c.total) * 100) : 0;
                c.avgTime = c.timeCount > 0 ? Math.round(c.timeSum / c.timeCount) : 0;
            });

            const strongest = chapters.reduce((a, b) => b.pct > a.pct ? b : a);
            const weakest   = chapters.reduce((a, b) => b.pct < a.pct ? b : a);
            const isMixed   = chapters.length > 1;

            // Update sub-label
            const sub = document.getElementById('chAnalyticsSub');
            if (sub) sub.textContent = `${chapters.length} chapter${chapters.length > 1 ? 's' : ''} · ${G.total} questions`;

            // Winner row
            if (isMixed) {
                winRow.style.display = '';
                winRow.innerHTML = `
                    <div class="ch-winner-card strongest">
                        <div class="ch-winner-emoji">🏆</div>
                        <div>
                            <div class="ch-winner-label">Strongest</div>
                            <div class="ch-winner-name">${strongest.name}</div>
                            <div class="ch-winner-pct">${strongest.pct}%</div>
                        </div>
                    </div>
                    <div class="ch-winner-card weakest">
                        <div class="ch-winner-emoji">💔</div>
                        <div>
                            <div class="ch-winner-label">Needs Work</div>
                            <div class="ch-winner-name">${weakest.name}</div>
                            <div class="ch-winner-pct">${weakest.pct}%</div>
                        </div>
                    </div>`;
            } else {
                winRow.style.display = 'none';
            }

            // Chapter rows
            const sorted = [...chapters].sort((a, b) => b.pct - a.pct);
            rowsList.innerHTML = sorted.map(c => {
                const cls = c.pct >= 70 ? 'good' : c.pct >= 40 ? 'medium' : 'bad';
                const isStrong = isMixed && c === strongest;
                const isWeak   = isMixed && c === weakest;
                const badge    = isStrong ? '<span class="ch-row-badge strong-badge">🏆 Best</span>'
                               : isWeak   ? '<span class="ch-row-badge weak-badge">💔 Weak</span>' : '';
                const timeStr  = c.avgTime > 0 ? `⏱ ${c.avgTime}s avg` : '';
                return `
                    <div class="ch-row">
                        <div class="ch-row-top">
                            <div class="ch-row-name">${c.name} ${badge}</div>
                            <div class="ch-row-stats">
                                <span class="ch-row-time">${timeStr}</span>
                                <span class="ch-row-pct ${cls}">${c.pct}%</span>
                            </div>
                        </div>
                        <div class="ch-bar-track">
                            <div class="ch-bar-fill ${cls}" style="width:0%" data-width="${c.pct}%"></div>
                        </div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${c.correct}/${c.total} correct</div>
                    </div>`;
            }).join('');

            panel.style.display = 'block';

            // Animate bars after paint
            requestAnimationFrame(() => requestAnimationFrame(() => {
                panel.querySelectorAll('.ch-bar-fill[data-width]').forEach(el => {
                    el.style.width = el.dataset.width;
                });
            }));
        }

        // ═══════════════════════════════════════════
        // ═══════════ REVIEW ENGINE (FIXED) ═════════
        // ═══════════════════════════════════════════

        let reviewData=[], activeFilter='all', currentView='detail', currentSort='default';

        function buildReview(){
            reviewData=[];
            const chNames={1:'Overview',2:'Geography',3:'Climate',4:'Wildlife',5:'Rivers',6:'Agriculture',7:'Irrigation',8:'Tourism',9:'Industry',10:'Minerals',11:'Transport',12:'History',13:'Culture',14:'Literature',15:'Tribal',16:'Education',17:'Political',18:'Schemes',19:'Census 2011'};

            G.questions.forEach((q,i)=>{
                const a=G.answers[i];
                let status='skipped';
                let selectedIdx=-1;
                let time=0;

                if(a){
                    selectedIdx=a.selected;
                    time=a.time||0;
                    if(a.skipped){
                        status='skipped';
                    } else if(a.correct){
                        status='correct';
                    } else {
                        status='wrong';
                    }
                }
                // null answer = also skipped (unanswered)

                reviewData.push({
                    index:i, question:q.q, hindi:q.hi||'', options:q.opts,
                    correctIdx:q.ans, selectedIdx:selectedIdx, status:status,
                    time:time, explanation:q.exp, chapter:q.ch,
                    chapterName:chNames[q.ch]||'UP', difficulty:q.diff,
                    exam:q.exam, bookmarked:G.bookmarks.has(i)
                });
            });

            const correct=reviewData.filter(r=>r.status==='correct').length;
            const wrong=reviewData.filter(r=>r.status==='wrong').length;
            const skip=reviewData.filter(r=>r.status==='skipped').length;
            const totalTime=reviewData.reduce((s,r)=>s+r.time,0);
            const attempted=correct+wrong;
            const avgTime=attempted>0?Math.round(totalTime/attempted):0;

            document.getElementById('rvCorrect').textContent=correct;
            document.getElementById('rvWrong').textContent=wrong;
            document.getElementById('rvSkip').textContent=skip;
            document.getElementById('rvAvgTime').textContent=avgTime+'s';
            document.getElementById('reviewTopSub').textContent=`${correct} correct • ${wrong} wrong • ${skip} skipped out of ${G.total} questions`;

            const fc=document.getElementById('reviewFilters');
            const bm=reviewData.filter(r=>r.bookmarked).length;
            fc.innerHTML=`
                <button class="rf-btn active" onclick="filterReview('all',this)">All <span class="rf-count">${G.total}</span></button>
                <button class="rf-btn" onclick="filterReview('correct',this)">✅ Correct <span class="rf-count">${correct}</span></button>
                <button class="rf-btn" onclick="filterReview('wrong',this)">❌ Wrong <span class="rf-count">${wrong}</span></button>
                <button class="rf-btn" onclick="filterReview('skipped',this)">⏭️ Skipped <span class="rf-count">${skip}</span></button>
                ${bm>0?`<button class="rf-btn" onclick="filterReview('bookmarked',this)">🔖 Bookmarked <span class="rf-count">${bm}</span></button>`:''}
            `;

            activeFilter='all'; currentSort='default';
            document.getElementById('reviewSortSelect').value='default';
            document.getElementById('reviewSearchInput').value='';
            renderReviewItems(reviewData);
        }

        function renderReviewItems(items){
            const list=document.getElementById('reviewList');
            list.innerHTML='';

            if(items.length===0){
                list.innerHTML=`<div class="review-empty"><div class="empty-icon">🔍</div><div class="empty-text">No questions match your filter</div><div class="empty-sub">Try changing the filter or search term</div></div>`;
                document.getElementById('reviewCountInfo').innerHTML=`Showing <strong>0</strong> of <strong>${G.total}</strong> questions`;
                return;
            }

            items.forEach(r=>{
                const item=document.createElement('div');
                item.className=`rv-item rv-${r.status}`;
                item.dataset.index=r.index;

                // Score badge
                let scoreHTML='', scoreCls='rv-score-zero', scoreVal='0';
                if(r.status==='correct'){ scoreCls='rv-score-plus'; scoreVal='+1.0'; }
                else if(r.status==='wrong'){ scoreCls='rv-score-minus'; scoreVal='-0.25'; }

                // Build option rows
                let optsHTML='';
                r.options.forEach((opt,oi)=>{
                    let cls='', icon='';
                    if(oi===r.correctIdx){ cls='rvo-correct'; icon='✓'; }
                    else if(oi===r.selectedIdx && r.status==='wrong'){ cls='rvo-wrong'; icon='✗'; }
                    else { cls='rvo-dim'; }
                    optsHTML+=`<div class="rv-opt-row ${cls}">
                        <div class="rv-opt-num">${oi+1}.</div>
                        <div class="rv-opt-text">${opt}</div>
                        <div class="rv-opt-icon">${icon}</div>
                    </div>`;
                });

                // Correct-answer bar
                const pctVal = r.difficulty==='easy'?Math.floor(55+Math.random()*28):r.difficulty==='hard'?Math.floor(15+Math.random()*28):Math.floor(30+Math.random()*32);

                item.innerHTML=`
                    <div class="rv-strip"></div>
                    <div class="rv-header">
                        <div class="rv-q-circle">${r.index+1}</div>
                        <div class="rv-q-body">
                            <div class="rv-q-meta">
                                <span class="rv-q-num">Q${r.index+1} of ${G.total}</span>
                                <span class="rv-score-pill ${scoreCls}">${scoreVal}</span>
                                ${r.time>0?`<span class="rv-time-pill">⏱ ${r.time}s</span>`:''}
                            </div>
                            <div class="rv-q-text">${r.question}</div>
                            ${r.hindi?`<div class="rv-q-hindi">${r.hindi}</div>`:''}
                        </div>
                        <div class="rv-tags">
                            <span class="rv-tag t-chapter">Ch ${r.chapter}</span>
                            <span class="rv-tag t-${r.difficulty}">${r.difficulty.toUpperCase()}</span>
                        </div>
                    </div>

                    <div class="rv-opts-list">${optsHTML}</div>

                    <div class="rv-cab">
                        <span class="rv-cab-label">✅ Correct Answer Is: ${r.correctIdx+1}</span>
                        <span class="rv-cab-pct">${pctVal}% got this right</span>
                    </div>

                    <div class="rv-solution">
                        <div class="rv-sol-head">📋 Solution</div>
                        <div class="rv-sol-body">${r.explanation||'No explanation available.'}</div>
                    </div>

                    <div class="rv-ai-block" id="rvAiBox${r.index}" style="display:none">
                        <div class="qac-header">
                            <div class="qac-header-left">
                                <div class="qac-logo">🧠</div>
                                <div>
                                    <div class="qac-title">AI Analysis — Q${r.index+1}</div>
                                    <div class="qac-engine" id="rvAiEngine${r.index}">Powered by ${typeof getEngineLabel==='function'?getEngineLabel():'⚡ AI'}</div>
                                </div>
                            </div>
                            <button class="qac-close" onclick="document.getElementById('rvAiBox${r.index}').style.display='none'">✕</button>
                        </div>
                        <div id="rvAiContent${r.index}" class="qac-body"></div>
                    </div>

                    <div class="rv-detail-block" id="rvDetailBox${r.index}" style="display:none">
                        <div class="rv-detail-head">
                            <span class="rv-detail-title">🤖 Detailed AI Solution — Q${r.index+1}</span>
                            <button class="rv-detail-close" onclick="document.getElementById('rvDetailBox${r.index}').style.display='none'">✕</button>
                        </div>
                        <div class="rv-detail-body" id="rvDetailContent${r.index}"></div>
                    </div>

                    <div class="rv-footer">
                        <span class="rv-exam-tag">${r.exam||''}</span>
                        <div class="rv-footer-btns">
                            <button class="rv-ai-btn" id="rvDetailBtn${r.index}" onclick="rvGetDetailedSolution(${r.index})">📖 Detailed Solution</button>
                            <button class="rv-ai-btn" id="rvAiBtn${r.index}" onclick="analyseReviewQuestion(${r.index})">🤖 AI Analysis</button>
                            ${r.status!=='correct'?`<button class="rv-retry-btn" onclick="retryQuestion(${r.index})">🔄 Retry</button>`:''}
                        </div>
                    </div>`;

                list.appendChild(item);
            });

            document.getElementById('reviewCountInfo').innerHTML=`Showing <strong>${items.length}</strong> of <strong>${G.total}</strong> questions`;
        }

        function filterReview(type,btn){
            activeFilter=type;
            document.querySelectorAll('.rf-btn').forEach(b=>b.classList.remove('active'));
            if(btn) btn.classList.add('active');
            applyFiltersAndSort();
        }
        function searchReview(q){ applyFiltersAndSort(q); }
        function sortReview(v){ currentSort=v; applyFiltersAndSort(); }

        function applyFiltersAndSort(searchQuery){
            const q=(searchQuery!==undefined?searchQuery:(document.getElementById('reviewSearchInput')?document.getElementById('reviewSearchInput').value:'')).toLowerCase().trim();
            let filtered=[...reviewData];

            switch(activeFilter){
                case 'correct':filtered=filtered.filter(r=>r.status==='correct');break;
                case 'wrong':filtered=filtered.filter(r=>r.status==='wrong');break;
                case 'skipped':filtered=filtered.filter(r=>r.status==='skipped');break;
                case 'bookmarked':filtered=filtered.filter(r=>r.bookmarked);break;
            }
            if(q){
                filtered=filtered.filter(r=>
                    r.question.toLowerCase().includes(q)||r.hindi.toLowerCase().includes(q)||
                    r.explanation.toLowerCase().includes(q)||r.options.some(o=>o.toLowerCase().includes(q))||
                    r.exam.toLowerCase().includes(q)||r.chapterName.toLowerCase().includes(q)
                );
            }
            switch(currentSort){
                case 'correct-first':filtered.sort((a,b)=>(a.status==='correct'?-1:1)-(b.status==='correct'?-1:1));break;
                case 'wrong-first':filtered.sort((a,b)=>(a.status==='wrong'?-1:1)-(b.status==='wrong'?-1:1));break;
                case 'skip-first':filtered.sort((a,b)=>(a.status==='skipped'?-1:1)-(b.status==='skipped'?-1:1));break;
                case 'time-asc':filtered.sort((a,b)=>a.time-b.time);break;
                case 'time-desc':filtered.sort((a,b)=>b.time-a.time);break;
                case 'chapter':filtered.sort((a,b)=>a.chapter-b.chapter);break;
                default:filtered.sort((a,b)=>a.index-b.index);
            }
            renderReviewItems(filtered);
        }

        function setView(mode){
            currentView=mode;
            const list=document.getElementById('reviewList');
            const slideContainer=document.getElementById('slideViewContainer');
            const bottomBar=document.querySelector('.review-bottom-bar');
            document.getElementById('viewDetail').classList.toggle('active',mode==='detail');
            document.getElementById('viewCompact').classList.toggle('active',mode==='compact');
            document.getElementById('viewSlide').classList.toggle('active',mode==='slide');
            if(mode==='slide'){
                list.style.display='none';
                slideContainer.classList.add('active');
                if(bottomBar) bottomBar.style.display='none';
                svBuildView();
            } else {
                list.style.display='';
                slideContainer.classList.remove('active');
                if(bottomBar) bottomBar.style.display='';
                mode==='compact'?list.classList.add('compact'):list.classList.remove('compact');
            }
        }

        // ── SLIDE VIEW ENGINE ──────────────────────────────────
        let svCurrentIdx = 0;
        let svItems = [];

        function svBuildView(){
            svItems = [...reviewData];
            const sort = document.getElementById('reviewSortSelect')?.value || 'default';
            // apply current filter
            switch(activeFilter){
                case 'correct': svItems=svItems.filter(r=>r.status==='correct'); break;
                case 'wrong':   svItems=svItems.filter(r=>r.status==='wrong');   break;
                case 'skipped': svItems=svItems.filter(r=>r.status==='skipped'); break;
            }
            svCurrentIdx = Math.min(svCurrentIdx, Math.max(0, svItems.length-1));
            svRenderDots();
            svRenderQuestion();
        }

        function svRenderDots(){
            const dotsEl = document.getElementById('svNavDots');
            dotsEl.innerHTML = '';
            svItems.forEach((r,i)=>{
                const dot = document.createElement('div');
                dot.className = `sv-dot dot-${r.status}${i===svCurrentIdx?' dot-active':''}`;
                dot.textContent = r.index+1;
                dot.onclick = ()=>{ svCurrentIdx=i; svRenderDots(); svRenderQuestion(); };
                dotsEl.appendChild(dot);
            });
            // scroll active dot into view
            const activeDot = dotsEl.children[svCurrentIdx];
            if(activeDot) activeDot.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
        }

        function svRenderQuestion(){
            const keys=['A','B','C','D','E'];
            const r = svItems[svCurrentIdx];
            if(!r){ document.getElementById('svBody').innerHTML='<div style="text-align:center;padding:48px;color:var(--text-muted)">No questions to show</div>'; return; }

            const total = svItems.length;
            document.getElementById('svCenterInfo').textContent = `Q ${svCurrentIdx+1} / ${total}`;
            document.getElementById('svPrevBtn').disabled = svCurrentIdx===0;
            document.getElementById('svNextBtn').disabled = svCurrentIdx===total-1;

            let scoreBadge='', scoreClass='sb-zero';
            if(r.status==='correct'){ scoreBadge='+1.0'; scoreClass='sb-plus'; }
            else if(r.status==='wrong'){ scoreBadge='-0.25'; scoreClass='sb-minus'; }
            else { scoreBadge='0'; scoreClass='sb-zero'; }

            let optsHTML='';
            r.options.forEach((opt,oi)=>{
                let cls='', checkIcon='';
                if(oi===r.correctIdx){ cls='svo-correct'; checkIcon='<span class="sv-opt-check">✓</span>'; }
                else if(oi===r.selectedIdx && r.status==='wrong'){ cls='svo-wrong'; checkIcon='<span class="sv-opt-check">✗</span>'; }
                else { cls='svo-dimmed'; }
                optsHTML += `<div class="sv-opt ${cls}">
                    <div class="sv-opt-num">${oi+1}</div>
                    <span>${opt}</span>
                    ${checkIcon}
                </div>`;
            });

            const correctAnswerLabel = `${r.correctIdx+1}. ${r.options[r.correctIdx]}`;

            document.getElementById('svBody').innerHTML = `
                <div class="sv-q-meta">
                    <span class="sv-q-num">Q${r.index+1} of ${G.total}</span>
                    ${r.time>0?`<span class="sv-q-timer">⏱ ${r.time}s</span>`:''}
                    <span class="sv-score-badge ${scoreClass}">${scoreBadge}</span>
                    <div style="display:flex;gap:5px;flex-wrap:wrap">
                        <span class="rv-tag t-chapter">Ch ${r.chapter}</span>
                        <span class="rv-tag t-${r.difficulty}">${r.difficulty.toUpperCase()}</span>
                    </div>
                </div>
                <div class="sv-q-text">${r.question}</div>
                ${r.hindi?`<div class="sv-q-hindi">${r.hindi}</div>`:''}
                <div class="sv-options">${optsHTML}</div>
                <div class="sv-correct-row">
                    <span class="sv-correct-label">✅ Correct Answer: ${correctAnswerLabel}</span>
                    <span class="sv-pct-right" id="svPctRight">—</span>
                </div>
                <div class="sv-solution">
                    <div class="sv-sol-header">📖 Solution / Explanation</div>
                    <div class="sv-sol-text">${r.explanation||'No explanation provided.'}</div>
                </div>
                <div class="sv-ai-section" id="svAiSection${r.index}" style="display:flex;gap:8px;flex-wrap:wrap">
                    <button class="rv-ai-btn" id="svDetailBtn${r.index}" onclick="svGetDetailedSolution(${r.index})">📖 Detailed Solution</button>
                    <button class="rv-ai-btn" onclick="svTriggerAi(${r.index})">🤖 AI Analysis</button>
                </div>
                <div class="rv-detail-block" id="svDetailBox${r.index}" style="display:none;margin:12px 0 0">
                    <div class="rv-detail-head">
                        <span class="rv-detail-title">🤖 Detailed Solution — Q${r.index+1}</span>
                        <button class="rv-detail-close" onclick="document.getElementById('svDetailBox${r.index}').style.display='none'">✕</button>
                    </div>
                    <div class="rv-detail-body" id="svDetailContent${r.index}"></div>
                </div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:8px">${r.exam||''}</div>
            `;
        }

        function svNavigate(dir){
            svCurrentIdx = Math.max(0, Math.min(svItems.length-1, svCurrentIdx+dir));
            svRenderDots();
            svRenderQuestion();
            document.getElementById('svBody').scrollTo({top:0,behavior:'smooth'});
        }

        function svTriggerAi(index){
            const r = reviewData[index];
            if(!r) return;
            const secEl = document.getElementById(`svAiSection${index}`);
            if(!secEl) return;
            const nums=['1','2','3','4','5'];
            const statusText = r.status==='correct'
                ? `CORRECT ✅ (answered ${nums[r.correctIdx]})`
                : r.status==='wrong'
                ? `WRONG ❌ (selected ${nums[r.selectedIdx]}: "${r.options[r.selectedIdx]}", correct is ${nums[r.correctIdx]}: "${r.options[r.correctIdx]}")`
                : `SKIPPED — correct is ${nums[r.correctIdx]}: "${r.options[r.correctIdx]}"`;
            const box = document.getElementById(`svDetailBox${index}`);
            // Show AI inline below the solution
            const aiDiv = document.createElement('div');
            aiDiv.className='sv-solution';
            aiDiv.style.borderColor='var(--accent-purple)';
            aiDiv.innerHTML=`<div class="sv-sol-header" style="color:var(--accent-purple)">🧠 AI Analysis — Q${index+1}</div><div id="svAiContent${index}" class="qac-body"><div class="qac-loading"><div class="qac-dots"><span></span><span></span><span></span></div> Generating…</div></div>`;
            secEl.parentNode.insertBefore(aiDiv, secEl.nextSibling);
            const qData={question:r.question,hindi:r.hindi,options:r.options,correctIdx:r.correctIdx,explanation:r.explanation,exam:r.exam,q:r.question,opts:r.options,ans:r.correctIdx,exp:r.explanation};
            const prompt = buildAiSectionsPrompt(qData, statusText);
            callAI(prompt,'').then(text=>{
                const el=document.getElementById(`svAiContent${index}`);
                if(el) el.innerHTML=renderAiSectionsHTML(text);
            }).catch(e=>{
                const el=document.getElementById(`svAiContent${index}`);
                if(el) el.innerHTML=`<div class="qac-error">⚠️ ${e.message}</div>`;
            });
        }

        async function svGetDetailedSolution(index){
            const r = reviewData[index];
            if(!r) return;
            const btn  = document.getElementById(`svDetailBtn${index}`);
            const box  = document.getElementById(`svDetailBox${index}`);
            const body = document.getElementById(`svDetailContent${index}`);
            if(!box||!body) return;

            if(btn){ btn.disabled=true; btn.innerHTML='⏳ Loading…'; }
            box.style.display='block';
            body.innerHTML=`<div class="qac-loading"><div class="qac-dots"><span></span><span></span><span></span></div> Generating detailed solution…</div>`;
            // Scroll into view
            setTimeout(()=>box.scrollIntoView({behavior:'smooth',block:'nearest'}), 100);

            const nums=['1','2','3','4','5'];
            const statusText = r.status==='correct'
                ? `Student answered CORRECTLY (option ${nums[r.correctIdx]})`
                : r.status==='wrong'
                ? `Student answered WRONG — selected option ${nums[r.selectedIdx]}: "${r.options[r.selectedIdx]}", correct is option ${nums[r.correctIdx]}: "${r.options[r.correctIdx]}"`
                : `Student SKIPPED — correct is option ${nums[r.correctIdx]}: "${r.options[r.correctIdx]}"`;

            const prompt = `You are an expert UP GK exam tutor. Give a DETAILED and THOROUGH solution for this question.
${getLangInstruction()}

Question: ${r.question}
${r.hindi?`Hindi: ${r.hindi}`:''}
Options: ${r.options.map((o,i)=>`${i+1}. ${o}`).join(' | ')}
Correct Answer: ${nums[r.correctIdx]}. ${r.options[r.correctIdx]}
${statusText}
Basic Explanation: ${r.explanation||''}
Exam Source: ${r.exam||''}

Provide a detailed solution with:
1. **Why the correct answer is right** — full factual explanation with dates, facts, context
2. **Why each wrong option is wrong** — specific reason for each
3. **Related facts for this topic** — 3-5 important facts that appear in UP exams
4. **Memory trick** — one powerful mnemonic
5. **Previous year connections** — how this topic has appeared in other UP exams

Use bold for key terms. Be thorough but exam-focused.`;

            try {
                const text = await callAI(prompt, '');
                body.innerHTML = text
                    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
                    .replace(/^#{1,3}\s*(.+)$/gm,'<p style="font-weight:800;color:var(--accent-purple);margin:10px 0 4px">$1</p>')
                    .replace(/\n\n/g,'</p><p style="margin:4px 0">')
                    .replace(/\n/g,'<br>');
                if(btn){ btn.innerHTML='✅ Done'; btn.disabled=false; btn.style.cssText='background:var(--accent-green-light);color:var(--accent-green);border-color:var(--accent-green)'; }
            } catch(e) {
                body.innerHTML=`<div class="qac-error">⚠️ ${e.message}</div>`;
                if(btn){ btn.disabled=false; btn.innerHTML='🔄 Retry'; }
            }
        }

        function toggleExpand(index,btn){
            const opts=document.getElementById(`rvOpts${index}`);
            const exp=document.getElementById(`rvExp${index}`);
            const ai=document.getElementById(`rvAiBox${index}`);
            const isOpen = opts && opts.style.display !== 'none';
            if(isOpen){
                if(opts) opts.style.display='none';
                if(exp)  exp.style.display='none';
                if(ai)   ai.style.display='none';
                btn.classList.remove('expanded'); btn.querySelector('span:first-child').textContent='Show Details';
            }else{
                if(opts) opts.style.display='grid';
                if(exp)  exp.style.display='block';
                if(ai)   ai.style.display='block';
                btn.classList.add('expanded'); btn.querySelector('span:first-child').textContent='Hide Details';
            }
        }

        function expandAll(){
            document.querySelectorAll('[id^="rvOpts"]').forEach(el=>el.style.display='grid');
            document.querySelectorAll('[id^="rvExp"]').forEach(el=>el.style.display='block');
            document.querySelectorAll('[id^="rvAiBox"]').forEach(el=>el.style.display='block');
            document.querySelectorAll('.rv-expand-btn').forEach(btn=>{
                btn.classList.add('expanded'); btn.querySelector('span:first-child').textContent='Hide Details';
            });
        }
        function collapseAll(){
            document.querySelectorAll('[id^="rvOpts"]').forEach(el=>el.style.display='none');
            document.querySelectorAll('[id^="rvExp"]').forEach(el=>el.style.display='none');
            document.querySelectorAll('[id^="rvAiBox"]').forEach(el=>el.style.display='none');
            document.querySelectorAll('.rv-expand-btn').forEach(btn=>{
                btn.classList.remove('expanded'); btn.querySelector('span:first-child').textContent='Show Details';
            });
        }

        function retryQuestion(index){ sfx('tap'); toast(`🔄 Retrying Q${index+1} — coming soon!`,'info'); }
        function scrollReviewTop(){ document.getElementById('reviewList').scrollTo({top:0,behavior:'smooth'}); }

        async function rvGetDetailedSolution(index){
            const r = reviewData[index];
            if(!r) return;
            const btn  = document.getElementById(`rvDetailBtn${index}`);
            const box  = document.getElementById(`rvDetailBox${index}`);
            const body = document.getElementById(`rvDetailContent${index}`);
            if(!box||!body) return;

            if(btn){ btn.disabled=true; btn.innerHTML='⏳ Loading…'; }
            box.style.display='block';
            body.innerHTML=`<div class="qac-loading"><div class="qac-dots"><span></span><span></span><span></span></div> Generating detailed solution…</div>`;

            const nums=['1','2','3','4','5'];
            const statusText = r.status==='correct'
                ? `Student answered CORRECTLY (option ${nums[r.correctIdx]})`
                : r.status==='wrong'
                ? `Student answered WRONG — selected option ${nums[r.selectedIdx]}: "${r.options[r.selectedIdx]}", correct is option ${nums[r.correctIdx]}: "${r.options[r.correctIdx]}"`
                : `Student SKIPPED — correct is option ${nums[r.correctIdx]}: "${r.options[r.correctIdx]}"`;

            const prompt = `You are an expert UP GK exam tutor. Give a DETAILED and THOROUGH solution for this question.
${getLangInstruction()}

Question: ${r.question}
${r.hindi?`Hindi: ${r.hindi}`:''}
Options: ${r.options.map((o,i)=>`${i+1}. ${o}`).join(' | ')}
Correct Answer: ${nums[r.correctIdx]}. ${r.options[r.correctIdx]}
${statusText}
Basic Explanation: ${r.explanation||''}
Exam Source: ${r.exam||''}

Provide a detailed solution with:
1. **Why the correct answer is right** — full factual explanation with dates, facts, context
2. **Why each wrong option is wrong** — specific reason for each
3. **Related facts for this topic** — 3-5 important facts that appear in UP exams
4. **Memory trick** — one powerful mnemonic
5. **Previous year connections** — how this topic has appeared in other UP exams

Use bold for key terms. Be thorough but exam-focused.`;

            try {
                const text = await callAI(prompt, '');
                body.innerHTML = text
                    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
                    .replace(/^#{1,3}\s*(.+)$/gm,'<p style="font-weight:800;color:var(--accent-purple);margin:10px 0 4px">$1</p>')
                    .replace(/^(\d+)\.\s\*\*(.+?)\*\*/gm,'<p style="margin:8px 0 2px"><strong style="color:var(--accent-purple)">$1. $2</strong></p>')
                    .replace(/\n\n/g,'</p><p style="margin:4px 0">')
                    .replace(/\n/g,'<br>');
                if(btn){ btn.innerHTML='✅ Done'; btn.disabled=false; btn.style.cssText='background:var(--accent-green-light);color:var(--accent-green);border-color:var(--accent-green)'; }
            } catch(e) {
                body.innerHTML=`<div class="qac-error">⚠️ ${e.message}</div>`;
                if(btn){ btn.disabled=false; btn.innerHTML='🔄 Retry'; }
            }
        }

        // ═══════════════════════════════════════════════════════
        // ═══ SHARED: Build structured 4-section AI card HTML ═══
        // ═══════════════════════════════════════════════════════

        function buildAiSectionsPrompt(q, statusText, timeTaken) {
            const keys = ['1','2','3','4','5'];
            const opts = (q.opts || q.options || []);
            const correctAns = opts[q.ans ?? q.correctIdx];
            const isGuess = timeTaken > 0 && timeTaken < 2 && statusText.includes('WRONG');
            const isSlow  = timeTaken > 45;
            const timeNote = isGuess
                ? `⚡ ALERT: Student answered in only ${timeTaken}s — this was likely a random guess (negative marking applies!)`
                : isSlow
                ? `🐢 Student took ${timeTaken}s — struggled with this question`
                : timeTaken > 0 ? `Time taken: ${timeTaken}s` : '';

            return `You are an expert UP GK exam tutor (UPSSSC/UP Lekhpal/UPPSC). Analyse this question deeply.
${getLangInstruction()}

QUESTION: ${q.q || q.question}
DIFFICULTY: ${q.diff || 'medium'} | CHAPTER: ${q.ch} | EXAM SOURCE: ${q.exam || 'UP Exam'}
OPTIONS: ${opts.map((o,i)=>`${keys[i]}. ${o}`).join(' | ')}
CORRECT ANSWER: ${keys[q.ans ?? q.correctIdx]}. ${correctAns}
STUDENT RESULT: ${statusText}
${timeNote ? timeNote : ''}
${(q.exp || q.explanation) ? `OFFICIAL EXPLANATION: ${q.exp || q.explanation}` : ''}

Respond in EXACTLY this format with these 5 labeled sections. Be sharp, exam-focused, specific:

🎯 WHY IT'S CORRECT
[2-3 sentences. State the key fact/logic. Bold the most important term or number. If student was wrong, briefly explain their mistake.]

⚠️ TRAP OPTIONS
[Name the most tempting wrong options and exactly WHY students confuse them. Be specific — e.g. "Option 2 (Bihar) is confused because both share eastern UP border".]

💡 MEMORY TRICK
[One powerful mnemonic, acronym, story, or wordplay. Make it vivid and stick-able. Hindi tricks welcome.]

📚 EXAM FACTS
[2 bullet points of related facts that appear in UPSSSC/UPPSC/UP Lekhpal exams. Start each with •]

🔗 RELATED TOPICS
[2 closely related topics from the same chapter likely to appear in the same exam. Start each with •]`;
        }

        function renderAiSectionsHTML(text, timeTaken) {
            const sections = [
                { key: '🎯 WHY IT\'S CORRECT', cls: 'correct',   icon: '🎯', label: 'Why It\'s Correct' },
                { key: '⚠️ TRAP OPTIONS',       cls: 'trap',      icon: '⚠️', label: 'Trap Options'     },
                { key: '💡 MEMORY TRICK',        cls: 'trick',     icon: '💡', label: 'Memory Trick'     },
                { key: '📚 EXAM FACTS',          cls: 'facts',     icon: '📚', label: 'Exam Facts'       },
                { key: '🔗 RELATED TOPICS',      cls: 'related',   icon: '🔗', label: 'Related Topics'   }
            ];

            // Also handle old 4-section format for backwards compat
            const legacySections = [
                { key: '🎯 CORRECT ANSWER', cls: 'correct', icon: '🎯', label: 'Why It\'s Correct' },
                { key: '⚠️ TRAP OPTIONS',   cls: 'trap',    icon: '⚠️', label: 'Trap Options'     },
                { key: '💡 MEMORY TRICK',   cls: 'trick',   icon: '💡', label: 'Memory Trick'     },
                { key: '📚 EXAM FACTS',     cls: 'facts',   icon: '📚', label: 'Exam Facts'       }
            ];

            const activeSections = text.includes('🎯 WHY IT\'S CORRECT') ? sections : legacySections;
            const isGuess = timeTaken > 0 && timeTaken < 2;

            let html = '';

            // Guess warning card at top
            if (isGuess) {
                html += `<div class="qac-section guessflag">
                    <div class="qac-section-head guessflag">⚡ Random Guess Detected</div>
                    <span class="qac-guess-badge">⚡ Answered in ${timeTaken}s</span>
                    <div>You answered this in under 2 seconds — that's a guess. With <strong>−0.25 negative marking</strong>, random guessing costs more than skipping. Study this explanation carefully.</div>
                </div>`;
            }

            activeSections.forEach((sec, i) => {
                const nextKey = i < activeSections.length - 1 ? activeSections[i+1].key : null;
                let start = text.indexOf(sec.key);
                if (start === -1) {
                    const shortKey = sec.key.split(' ').slice(0,2).join(' ');
                    start = text.indexOf(shortKey);
                }
                let end = nextKey ? text.indexOf(nextKey) : text.length;
                if (start === -1) return;
                if (end === -1) end = text.length;

                let content = text.slice(start + sec.key.length, end).trim();
                // Format bold, bullets
                content = content
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/^•\s+(.+)$/gm, '<li>$1</li>')
                    .replace(/^-\s+(.+)$/gm, '<li>$1</li>');

                // Wrap li tags in ul
                if (content.includes('<li>')) {
                    content = content.replace(/(<li>[\s\S]*?<\/li>)/g, (m) => {
                        return m;
                    });
                    const parts = content.split('\n').map(l => l.trim()).filter(Boolean);
                    let inList = false, result = '';
                    parts.forEach(p => {
                        if (p.startsWith('<li>')) {
                            if (!inList) { result += '<ul>'; inList = true; }
                            result += p;
                        } else {
                            if (inList) { result += '</ul>'; inList = false; }
                            result += `<p>${p}</p>`;
                        }
                    });
                    if (inList) result += '</ul>';
                    content = result;
                } else {
                    content = content.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>l.startsWith('<')?l:`<p>${l}</p>`).join('');
                }

                html += `<div class="qac-section ${sec.cls}">
                    <div class="qac-section-head ${sec.cls}">${sec.icon} ${sec.label}</div>
                    ${content}
                </div>`;
            });

            if (!html || html === (isGuess ? html.split('</div>').slice(0,2).join('</div>') + '</div>' : '')) {
                html += `<div class="qac-section">${text.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>')}</div>`;
            }
            return html;
        }

        // ══════════════════════════════════════════
        // 🧠 Quick AI Analysis — Quiz Screen (inline)
        // ══════════════════════════════════════════

        let _quickAiRunning = false;

        async function quickAiAnalyse() {
            if (_quickAiRunning || !AI_CURRENT_Q) return;
            _quickAiRunning = true;

            const btn  = document.getElementById('aiBtnQuick');
            const card = document.getElementById('quickAiCard');
            const body = document.getElementById('qacBody');
            const engLabel = document.getElementById('qacEngineLabel');

            if (engLabel) engLabel.textContent = `Powered by ${getEngineLabel()}`;

            btn.disabled = true;
            btn.innerHTML = `<span class="ai-spinner"></span> Analysing…`;
            card.classList.add('visible');
            body.innerHTML = `<div class="qac-loading"><div class="qac-dots"><span></span><span></span><span></span></div> AI is analysing this question…</div>`;

            const q = AI_CURRENT_Q;
            const keys = ['1','2','3','4','5'];
            const a = G.answers[G.current];
            const timeTaken = a && a.time ? Math.round(a.time) : 0;
            let statusText = '';
            if (a) {
                if (a.skipped) statusText = `SKIPPED — correct is ${keys[q.ans]}: "${q.opts[q.ans]}"`;
                else if (a.correct) statusText = `CORRECT ✅ (answered ${keys[q.ans]}: "${q.opts[q.ans]}")`;
                else statusText = `WRONG ❌ (selected ${keys[a.selected]}: "${q.opts[a.selected]}", correct is ${keys[q.ans]}: "${q.opts[q.ans]}")`;
            }

            const prompt = buildAiSectionsPrompt(q, statusText, timeTaken);

            try {
                const text = await callAI(prompt, '');
                body.innerHTML = renderAiSectionsHTML(text, timeTaken);
                btn.innerHTML = '✅ AI Analysis Done';
                btn.style.background = 'linear-gradient(135deg,#059669,#10b981)';
                btn.disabled = false;
                btn.onclick = () => { card.classList.toggle('visible'); };
            } catch(e) {
                body.innerHTML = `<div class="qac-error">⚠️ ${e.message} — Try switching AI engine.</div>`;
                btn.innerHTML = '🔄 Retry AI Analysis';
                btn.disabled = false;
            }
            _quickAiRunning = false;
        }

        function closeQuickAiCard() {
            const card = document.getElementById('quickAiCard');
            if (card) card.classList.remove('visible');
        }

        // Reset quick AI card when rendering a new question
        function resetQuickAiCard() {
            const card = document.getElementById('quickAiCard');
            const body = document.getElementById('qacBody');
            const btn  = document.getElementById('aiBtnQuick');
            if (card) card.classList.remove('visible');
            if (body) body.innerHTML = '';
            if (btn)  { btn.innerHTML = '🧠 Quick AI Analysis'; btn.style.background = ''; btn.disabled = false; btn.onclick = quickAiAnalyse; }
            _quickAiRunning = false;
        }

        // Per-question AI analysis in review — structured card + auto-trigger for wrong/skipped
        async function analyseReviewQuestion(index, autoTriggered = false) {
            const r = reviewData[index];
            if (!r) return;
            const btn     = document.getElementById(`rvAiBtn${index}`);
            const box     = document.getElementById(`rvAiBox${index}`);
            const content = document.getElementById(`rvAiContent${index}`);
            const engEl   = document.getElementById(`rvAiEngine${index}`);

            if (btn) { btn.disabled = true; btn.innerHTML = `⏳ Analysing…`; }
            if (engEl) engEl.textContent = `Powered by ${getEngineLabel()}`;
            if (box) box.style.display = 'block';
            if (content) content.innerHTML = `<div class="qac-loading"><div class="qac-dots"><span></span><span></span><span></span></div> AI is analysing Q${index+1}…</div>`;

            const nums = ['1','2','3','4','5'];
            const timeTaken = r.time ? Math.round(r.time) : 0;
            const statusText = r.status === 'correct'
                ? `CORRECT ✅ (answered ${nums[r.correctIdx]}: "${r.options[r.correctIdx]}")`
                : r.status === 'wrong'
                ? `WRONG ❌ (selected ${nums[r.selectedIdx]}: "${r.options[r.selectedIdx]}", correct is ${nums[r.correctIdx]}: "${r.options[r.correctIdx]}")`
                : `SKIPPED — correct is ${nums[r.correctIdx]}: "${r.options[r.correctIdx]}"`;

            const qData = {
                question: r.question, hindi: r.hindi,
                options: r.options, correctIdx: r.correctIdx,
                explanation: r.explanation, exam: r.exam,
                q: r.question, opts: r.options, ans: r.correctIdx, exp: r.explanation,
                diff: r.difficulty, ch: r.chapter
            };

            const prompt = buildAiSectionsPrompt(qData, statusText, timeTaken);

            try {
                const text = await callAI(prompt, '');
                if (content) content.innerHTML = renderAiSectionsHTML(text, timeTaken);
                if (btn) {
                    btn.innerHTML = `✅ Done`;
                    btn.style.cssText = 'background:var(--accent-green-light);color:var(--accent-green);border-color:var(--accent-green)';
                    btn.disabled = false;
                }
            } catch(e) {
                if (content) content.innerHTML = `<div class="qac-error">⚠️ ${e.message} — Try switching AI engine.</div>`;
                if (btn) { btn.disabled = false; btn.innerHTML = `🔄 Retry`; }
            }
        }

        function formatRvAiText(text) {
            return text
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/^(#{1,3})\s*(.+)$/gm, (_, h, t) => `<p><strong style="color:var(--accent-purple)">${t}</strong></p>`)
                .replace(/^[-•]\s+(.+)$/gm, '<p>• $1</p>')
                .replace(/\n{2,}/g, '</p><p>')
                .replace(/\n/g, ' ')
                .replace(/^/, '<p>')
                .replace(/$/, '</p>');
        }

        // Overall result AI analysis
        async function runResultAIAnalysis() {
            const btn    = document.getElementById('rapBtn');
            const label  = document.getElementById('rapBtnLabel');
            const icon   = document.getElementById('rapBtnIcon');
            const idle   = document.getElementById('rapIdle');
            const loading= document.getElementById('rapLoading');
            const content= document.getElementById('rapContent');
            const error  = document.getElementById('rapError');
            const loadTxt= document.getElementById('rapLoadingText');

            btn.disabled = true;
            icon.innerHTML = `<span class="rap-spinner"></span>`;
            label.textContent = 'Analysing…';
            idle.style.display = 'none'; content.style.display = 'none'; error.style.display = 'none';
            loading.style.display = 'flex';

            // ── Core counts ──
            const correct = G.answers.filter(a => a && a.correct).length;
            const wrong   = G.answers.filter(a => a && !a.correct && !a.skipped).length;
            const skipped = G.total - correct - wrong;
            const pct     = Math.round((correct / G.total) * 100);
            const attempted = correct + wrong;

            // ── Time analysis ──
            const attemptedData = reviewData.filter(r => r.status !== 'skipped' && r.time > 0);
            const avgTime = attemptedData.length ? Math.round(attemptedData.reduce((s,r)=>s+r.time,0)/attemptedData.length) : 0;
            const guessQs  = reviewData.filter(r => r.status === 'wrong' && r.time > 0 && r.time < 2); // <2s = guess
            const slowQs   = reviewData.filter(r => r.time > 45); // >45s = struggled
            const totalTimeSec = reviewData.reduce((s,r)=>s+r.time,0);

            // ── Difficulty breakdown ──
            const diffMap = {easy:{c:0,t:0}, medium:{c:0,t:0}, hard:{c:0,t:0}};
            reviewData.forEach(r => {
                const d = r.difficulty || 'medium';
                if(diffMap[d]){ diffMap[d].t++; if(r.status==='correct') diffMap[d].c++; }
            });

            // ── Chapter breakdown ──
            const chapterBreakdown = {};
            reviewData.forEach(r => {
                if(!chapterBreakdown[r.chapterName]) chapterBreakdown[r.chapterName]={correct:0,total:0};
                chapterBreakdown[r.chapterName].total++;
                if(r.status==='correct') chapterBreakdown[r.chapterName].correct++;
            });
            const chEntries = Object.entries(chapterBreakdown).sort((a,b)=>b[1].total-a[1].total);
            const chSummary = chEntries.map(([ch,s])=>`${ch}: ${s.correct}/${s.total} (${Math.round(s.correct/s.total*100)}%)`).join(', ');

            // ── Weak questions (wrong/skipped, top 8, with what student chose) ──
            const problemQs = reviewData.filter(r=>r.status!=='correct').slice(0,8).map(r=>{
                const chosen = r.selectedIdx >= 0 ? `Student chose: "${r.options[r.selectedIdx]}"` : 'SKIPPED';
                const tFlag  = r.time < 2 && r.status==='wrong' ? ' [GUESS <2s]' : r.time > 45 ? ' [SLOW '+r.time+'s]' : '';
                return `• [${r.status.toUpperCase()}${tFlag}] Ch${r.chapter}(${r.difficulty||'?'}): "${r.question.substring(0,70)}..." | ${chosen} → Correct: "${r.options[r.correctIdx]}"`;
            }).join('\n');

            // ── Easy-wrong (hardest to explain, most fixable) ──
            const easyWrong = reviewData.filter(r=>r.status==='wrong'&&r.difficulty==='easy').length;

            // ── Build visual stats HTML (rendered before AI text) ──
            const statsHTML = buildRapStatsHTML({correct,wrong,skipped,pct,avgTime,totalTimeSec,guessQs,slowQs,diffMap,chEntries,easyWrong,attempted});

            // ── Build rich prompt ──
            const prompt = `You are an expert UP Government Exam (UP Lekhpal / UPSSSC) coach. Analyse this student's quiz result and give a structured, highly personalised, actionable report.

STUDENT: ${G.name} | SCORE: ${correct}/${G.total} (${pct}%) | MODE: ${G.mode||'exam'} | BEST STREAK: ${G.maxStreak}
CORRECT: ${correct} | WRONG: ${wrong} | SKIPPED: ${skipped} | ATTEMPTED: ${attempted}/${G.total}
AVG TIME/Q: ${avgTime}s | TOTAL TIME: ${Math.round(totalTimeSec/60)}m ${totalTimeSec%60}s
GUESS ATTEMPTS (<2s): ${guessQs.length} questions | SLOW ATTEMPTS (>45s): ${slowQs.length} questions
EASY QUESTIONS WRONG: ${easyWrong} (these are most fixable!)

DIFFICULTY ACCURACY:
- Easy: ${diffMap.easy.c}/${diffMap.easy.t} correct (${diffMap.easy.t?Math.round(diffMap.easy.c/diffMap.easy.t*100):0}%)
- Medium: ${diffMap.medium.c}/${diffMap.medium.t} correct (${diffMap.medium.t?Math.round(diffMap.medium.c/diffMap.medium.t*100):0}%)
- Hard: ${diffMap.hard.c}/${diffMap.hard.t} correct (${diffMap.hard.t?Math.round(diffMap.hard.c/diffMap.hard.t*100):0}%)

CHAPTER PERFORMANCE: ${chSummary}

WRONG/SKIPPED QUESTIONS (with what student chose):
${problemQs || 'All correct! 🎉'}

Write a structured report using EXACTLY these section headers:
🎯 OVERALL VERDICT
💪 STRENGTHS
⚠️ WEAK AREAS
⏱️ TIME & BEHAVIOUR PATTERNS
📅 7-DAY REVISION PLAN
💡 EXAM DAY STRATEGY

Rules:
- If guesses (<2s wrong) > 3, call it out — random guessing hurts in negative marking
- If easy-wrong > 2, emphasise these are the easiest marks to recover
- Be specific about which chapters to revise, not generic advice
- Under 400 words total. Warm, direct, motivating Hindi/English mix where natural.`;

            loadTxt.textContent = `🔍 Building deep analysis via ${getEngineLabel()}…`;
            try {
                const text = await callAI(prompt, '');
                loading.style.display = 'none';
                content.style.display = 'block';
                content.innerHTML = statsHTML + formatRapContent(text);
                document.getElementById('rapReviewBtnWrapper').style.display = 'block';
                // Animate bars after render
                setTimeout(()=>{
                    document.querySelectorAll('.rap-ch-bar-fill[data-w]').forEach(el=>{
                        el.style.width = el.dataset.w + '%';
                    });
                }, 80);
                btn.innerHTML = `<span id="rapBtnIcon">✅</span> <span id="rapBtnLabel">Re-Analyse</span>`;
                btn.disabled = false;
                btn.style.background = 'rgba(5,150,105,0.15)';
                btn.style.borderColor = 'rgba(5,150,105,0.4)';
            } catch(e) {
                loading.style.display = 'none';
                error.style.display = 'block';
                error.innerHTML = `⚠️ ${e.message}<br><small>Try selecting a different AI engine (Groq/Pollinations are free) or check your connection.</small>`;
                btn.innerHTML = `<span id="rapBtnIcon">🔄</span> <span id="rapBtnLabel">Retry</span>`;
                btn.disabled = false;
            }
        }

        function buildRapStatsHTML({correct,wrong,skipped,pct,avgTime,totalTimeSec,guessQs,slowQs,diffMap,chEntries,easyWrong,attempted}){
            const grade = pct>=85?'A+':pct>=70?'A':pct>=55?'B':pct>=40?'C':'D';
            const gradeColor = pct>=70?'green':pct>=40?'yellow':'red';
            const accuracy = attempted>0?Math.round(correct/attempted*100):0;

            // Chapter bars (top 6 by total)
            const topCh = chEntries.slice(0,6);
            const chBars = topCh.map(([name,s])=>{
                const p = Math.round(s.correct/s.total*100);
                const color = p>=70?'#059669':p>=40?'#d97706':'#dc2626';
                return `<div class="rap-ch-row">
                    <div class="rap-ch-name" title="${name}">${name}</div>
                    <div class="rap-ch-bar-wrap"><div class="rap-ch-bar-fill" data-w="${p}" style="width:0%;background:${color}"></div></div>
                    <div class="rap-ch-pct" style="color:${color}">${p}%</div>
                </div>`;
            }).join('');

            // Diff accuracy pills
            const diffPills = ['easy','medium','hard'].map(d=>{
                const s = diffMap[d]; if(!s.t) return '';
                const p = Math.round(s.c/s.t*100);
                const col = p>=70?'#059669':p>=40?'#d97706':'#dc2626';
                const label = d==='easy'?'Easy':d==='medium'?'Medium':'Hard';
                return `<div class="rap-stat-card" style="background:transparent;border-color:${col}20">
                    <div class="rap-stat-label" style="color:${col}">${label}</div>
                    <div class="rap-stat-val" style="color:${col}">${p}%</div>
                    <div class="rap-stat-sub">${s.c}/${s.t} correct</div>
                </div>`;
            }).join('');

            // Behaviour tags
            let tags = '';
            if(guessQs.length>0) tags += `<span class="rap-tag guess">⚡ ${guessQs.length} Guesses (&lt;2s)</span>`;
            if(slowQs.length>0)  tags += `<span class="rap-tag slow">🐢 ${slowQs.length} Slow (>45s)</span>`;
            if(easyWrong>0)      tags += `<span class="rap-tag easy-wrong">⚠️ ${easyWrong} Easy Wrong</span>`;
            if(!tags)            tags  = `<span class="rap-tag" style="background:var(--accent-green-light);color:var(--accent-green);border:1px solid var(--accent-green)">✅ Clean Behaviour</span>`;

            return `
            <div class="rap-stats-grid">
                <div class="rap-stat-card ${gradeColor}">
                    <div class="rap-stat-label">Grade</div>
                    <div class="rap-stat-val">${grade}</div>
                    <div class="rap-stat-sub">${pct}% score</div>
                </div>
                <div class="rap-stat-card">
                    <div class="rap-stat-label">Accuracy</div>
                    <div class="rap-stat-val">${accuracy}%</div>
                    <div class="rap-stat-sub">${correct}/${attempted} attempted</div>
                </div>
                <div class="rap-stat-card">
                    <div class="rap-stat-label">Avg Time/Q</div>
                    <div class="rap-stat-val">${avgTime}s</div>
                    <div class="rap-stat-sub">Total: ${Math.floor(totalTimeSec/60)}m ${totalTimeSec%60}s</div>
                </div>
                <div class="rap-stat-card ${skipped>G.total*0.2?'red':''}">
                    <div class="rap-stat-label">Skipped</div>
                    <div class="rap-stat-val">${skipped}</div>
                    <div class="rap-stat-sub">${G.total-skipped} attempted</div>
                </div>
            </div>
            <div class="rap-section-head">Difficulty Accuracy</div>
            <div class="rap-stats-grid" style="grid-template-columns:repeat(3,1fr)">${diffPills}</div>
            <div class="rap-section-head">Chapter Performance</div>
            ${chBars}
            <div style="margin:10px 0 4px;display:flex;flex-wrap:wrap;gap:4px">${tags}</div>
            <div class="rap-divider"></div>
            <div class="rap-section-head">🤖 AI Coach Analysis</div>
            <div class="rap-ai-section">`;
        }

        function formatRapContent(text) {
            let html = text
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/^(🎯|💪|⚠️|⏱️|📅|💡)\s*(.+)$/gm, (_, emoji, title) =>
                    `</div><h3 class="rap-section-head" style="color:var(--accent-purple);font-size:13px;margin-top:14px">${emoji} ${title}</h3><div class="rap-ai-section">`)
                .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
                .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
                .replace(/\n{2,}/g, '\n');

            // Wrap plain text lines as paragraphs
            html = html.split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .map(line => {
                    if(line.startsWith('<')) return line;
                    return `<p>${line}</p>`;
                })
                .join('\n');

            return html + '</div>';
        }

        function exportReviewText(){
            const keys=['A','B','C','D','E'];
            let text=`📋 ExamZen — ANSWER REVIEW\n${'═'.repeat(40)}\nPlayer: ${G.name}\nScore: ${G.score} | Correct: ${reviewData.filter(r=>r.status==='correct').length}/${G.total}\n${'═'.repeat(40)}\n\n`;
            reviewData.forEach(r=>{
                const icon=r.status==='correct'?'✅':r.status==='wrong'?'❌':'⏭️';
                text+=`${icon} Q${r.index+1}. ${r.question}\n`;
                r.options.forEach((o,oi)=>{
                    const mark=oi===r.correctIdx?' ✓':(oi===r.selectedIdx&&r.status==='wrong'?' ✗':'');
                    text+=`   ${keys[oi]}. ${o}${mark}\n`;
                });
                text+=`   Correct: ${keys[r.correctIdx]}. ${r.options[r.correctIdx]}\n`;
                text+=`   📖 ${r.explanation}\n\n`;
            });
            navigator.clipboard.writeText(text).then(()=>toast('📋 Copied to clipboard!','success')).catch(()=>{
                const blob=new Blob([text],{type:'text/plain'}); const url=URL.createObjectURL(blob);
                const a=document.createElement('a'); a.href=url; a.download='quiz-review.txt'; a.click();
                URL.revokeObjectURL(url); toast('📥 Downloaded!','success');
            });
        }
        function printReview(){ expandAll(); setTimeout(()=>window.print(),300); }


        function togglePips(){
            const wrap=document.getElementById('qNavWrap');
            wrap.classList.toggle('expanded');
            wrap.classList.toggle('collapsed');
            document.getElementById('pipToggleBtn').textContent=
                wrap.classList.contains('expanded')?'✕':'📊';
        }

        // ═══════════════════════════════════════════════
        // ═══════ QUESTION PALETTE SUMMARY ══════════════
        // ═══════════════════════════════════════════════

        function updatePalette(){
            const answered   = G.answers.filter((a,i) => a && !a.skipped).length;
            const notAnswered = G.answers.filter((a,i) => !a || a.skipped).length;
            const marked     = G.marked.size;
            const visited    = G.visited.size;
            const notVisited = G.total - visited;

            const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
            set('qpAnswered',   answered);
            set('qpNotAnswered', notAnswered);
            set('qpMarked',     marked);
            set('qpVisited',    visited);
            set('qpNotVisited', notVisited);
        }

        // ═══════════ DRAWER ═══════════
        function toggleDrawer(){
            document.getElementById('drawerOverlay').classList.toggle('open');
            document.getElementById('drawerPanel').classList.toggle('open');
        }

        // ═══════════ BOTTOM BAR ACTIONS ═══════════
        function markAndNext(){
            sfx('tap');
            G.bookmarks.add(G.current);
            document.getElementById('bookmarkBtn').classList.add('active');
            const pips=document.querySelectorAll('.qn-pip');
            if(pips[G.current]) pips[G.current].classList.add('bookmarked');
            toast('⭐ Marked for review','info');
            goNext();
        }

        function clearAnswer(){
            if(G.answered&&G.answers[G.current]){
                if(G.mode==='practice'){
                    G.answers[G.current]=null;
                    sfx('tap'); renderQ();
                    toast('🗑️ Answer cleared','info');
                } else {
                    toast('⚠️ Cannot clear in exam mode','error');
                }
            }
        }

        function saveAndNext(){ sfx('tap'); goNext(); }

        function submitQuiz(){
            if(confirm('Submit test? Unanswered questions will be marked as skipped.')){
                toggleDrawer(); showResults();
            }
        }

        function confirmSubmitQuiz(){
            const answered = G.answers.filter(a => a && !a.skipped).length;
            const unanswered = G.total - answered;
            const msg = unanswered > 0
                ? `You have ${unanswered} unanswered question(s).\nSubmit now? They will be marked as skipped.`
                : `All ${G.total} questions answered. Submit and see your results?`;
            if(confirm(msg)){ showResults(); }
        }

        function formatTime(secs){
            const m=String(Math.floor(secs/60)).padStart(2,'0');
            const s=String(secs%60).padStart(2,'0');
            return `${m}:${s}`;
        }
        function showReview(){
            const card=document.getElementById('reviewCard');
            if(card.style.display==='none'){
                card.style.display='block';
                card.scrollIntoView({behavior:'smooth'});
                // Always open in slide view
                setTimeout(()=>setView('slide'), 80);
            } else {
                card.style.display='none';
            }
        }

        function resetResultAiPanel(){
            try{
                document.getElementById('rapIdle').style.display='block';
                document.getElementById('rapLoading').style.display='none';
                document.getElementById('rapContent').style.display='none';
                document.getElementById('rapError').style.display='none';
                document.getElementById('rapReviewBtnWrapper').style.display='none';
                const sub=document.getElementById('rapEngineSub');
                if(sub && typeof getEngineLabel==='function') sub.textContent=`Powered by ${getEngineLabel()} · Groq & Pollinations are FREE`;
                const btn=document.getElementById('rapBtn');
                if(btn){ btn.disabled=false; btn.style.background=''; btn.style.borderColor=''; btn.innerHTML='<span id="rapBtnIcon">✨</span> <span id="rapBtnLabel">Analyse My Result</span>'; }
                // Reset chapter analytics
                const cap = document.getElementById('chapterAnalyticsPanel');
                if (cap) cap.style.display = 'none';
            }catch(e){}
        }
        function restartQuiz(){ sfx('tap'); document.getElementById('reviewCard').style.display='none'; resetResultAiPanel(); injectChapterCounts(); onChapterChange(); initQuiz(); }
        function goHome(){ sfx('tap'); document.getElementById('reviewCard').style.display='none'; resetResultAiPanel(); injectChapterCounts(); onChapterChange(); showScreen('welcomeScreen'); }

        // ═══════════════════════════════════════════════════════
        // ═══════ BOOKMARKS SYSTEM ══════════════════════════════
        // ═══════════════════════════════════════════════════════

        /* Bookmark key — user-prefixed so each account has its own bookmarks */
        function getBmKey(){ return _lsk('upqz_bookmarks'); }

        function loadBookmarks(){ try{ return JSON.parse(localStorage.getItem(getBmKey())||'[]'); }catch(e){ return []; } }
        function saveBookmarksStore(arr){
            localStorage.setItem(getBmKey(), JSON.stringify(arr));
            if(typeof _fbSyncBookmarks==='function') _fbSyncBookmarks();
        }

        // Called each time quiz is saved (result screen) — persist bookmarks from current session
        function persistSessionBookmarks(){
            if(!G.bookmarks || G.bookmarks.size===0) return;
            const existing = loadBookmarks();
            const existingQs = new Set(existing.map(b=>b.q));
            G.questions.forEach((q,i)=>{
                if(G.bookmarks.has(i) && !existingQs.has(q.q)){
                    existing.push({ q:q.q, hi:q.hi||'', opts:q.opts, ans:q.ans, exp:q.exp||'', exam:q.exam||'', ch:q.ch, diff:q.diff||'medium', savedAt:new Date().toISOString() });
                }
            });
            saveBookmarksStore(existing);
            updateHomeBookmarkBtn();
        }

        function removeBookmark(qText){
            const arr = loadBookmarks().filter(b=>b.q!==qText);
            saveBookmarksStore(arr);
            showBookmarksScreen();
        }

        function updateHomeBookmarkBtn(){
            const bm = loadBookmarks();
            const btn = document.getElementById('bookmarksHomeBtn');
            const sub = document.getElementById('bookmarksHomeSub');
            if(btn){ btn.style.display = bm.length>0 ? '' : 'none'; }
            if(sub) sub.textContent = bm.length + ' question' + (bm.length!==1?'s':'') + ' saved';
        }

        function showBookmarksScreen(){
            const bm = loadBookmarks();
            const sub = document.getElementById('bmScreenSub');
            const list = document.getElementById('bmList');
            const startBtn = document.getElementById('bmStartBtn');
            if(sub) sub.textContent = bm.length + ' saved question' + (bm.length!==1?'s':'');
            if(startBtn) startBtn.style.display = bm.length>0 ? '' : 'none';
            if(list){
                list.innerHTML = '';
                if(bm.length===0){
                    list.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-muted);font-size:15px">🔖<br><br>No bookmarks yet.<br>Press 🔖 during a quiz to save questions.</div>';
                } else {
                    var chNames={1:'Overview',2:'Geography',3:'Climate',4:'Wildlife',5:'Rivers',6:'Agriculture',7:'Irrigation',8:'Tourism',9:'Industry',10:'Minerals',11:'Transport',12:'History',13:'Culture',14:'Literature',15:'Tribal',16:'Education',17:'Political',18:'Schemes',19:'Census 2011'};
                    bm.forEach(function(b, idx){
                        var card = document.createElement('div');
                        card.className = 'glass';
                        card.style.cssText = 'padding:18px;border-radius:16px;position:relative';
                        // Header row
                        var hdr = document.createElement('div');
                        hdr.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px';
                        var tag = document.createElement('div');
                        tag.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-orange);background:var(--accent-orange-light);padding:3px 10px;border-radius:20px';
                        tag.textContent = chNames[b.ch] || ('Ch'+b.ch);
                        var rmBtn = document.createElement('button');
                        rmBtn.style.cssText = 'background:var(--accent-red-light);color:var(--accent-red);border:none;border-radius:8px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0';
                        rmBtn.textContent = '✕ Remove';
                        (function(qText){ rmBtn.onclick = function(){ removeBookmark(qText); }; })(b.q);
                        hdr.appendChild(tag); hdr.appendChild(rmBtn);
                        card.appendChild(hdr);
                        // Question
                        var qDiv = document.createElement('div');
                        qDiv.style.cssText = 'font-size:14px;font-weight:700;color:var(--text-primary);line-height:1.5;margin-bottom:10px';
                        qDiv.textContent = b.q;
                        card.appendChild(qDiv);
                        // Hindi
                        if(b.hi){ var hiDiv=document.createElement('div'); hiDiv.style.cssText='font-size:12px;color:var(--text-muted);margin-bottom:10px'; hiDiv.textContent=b.hi; card.appendChild(hiDiv); }
                        // Options
                        var optsDiv = document.createElement('div');
                        optsDiv.style.cssText = 'display:grid;gap:6px;margin-bottom:10px';
                        b.opts.forEach(function(o,oi){
                            var opt = document.createElement('div');
                            var isAns = oi===b.ans;
                            opt.style.cssText = 'padding:8px 12px;border-radius:10px;font-size:13px;' +
                                'background:'+(isAns?'var(--accent-green-light)':'var(--bg-card-alt)')+';' +
                                'border:1.5px solid '+(isAns?'var(--accent-green)':'var(--border)')+';' +
                                'color:'+(isAns?'var(--accent-green)':'var(--text-secondary)');
                            opt.textContent = (isAns?'✅ ':'')+String.fromCharCode(65+oi)+'. '+o;
                            optsDiv.appendChild(opt);
                        });
                        card.appendChild(optsDiv);
                        // Explanation
                        if(b.exp){ var expDiv=document.createElement('div'); expDiv.style.cssText='font-size:12px;color:var(--text-secondary);background:var(--bg-section);border-radius:10px;padding:10px 12px;line-height:1.6'; expDiv.innerHTML='<b>💡 Explanation:</b> '+b.exp; card.appendChild(expDiv); }
                        list.appendChild(card);
                    });
                }
            }
            showScreen('bookmarksScreen');
        }

        function startBookmarkQuiz(){
            const bm = loadBookmarks();
            if(bm.length===0){ toast('No bookmarks to practice!','error'); return; }
            // Load as custom questions into quiz engine
            _startCustomQuiz(bm, '🔖 Bookmarks Practice');
        }

        // ═══════════════════════════════════════════════════════
        // ═══════ WRONG QUESTIONS SYSTEM ════════════════════════
        // ═══════════════════════════════════════════════════════

        /* Wrong-question key — user-prefixed */
        function getWqKey(){ return _lsk('upqz_wrong_questions'); }

        function loadWrongQs(){ try{ return JSON.parse(localStorage.getItem(getWqKey())||'[]'); }catch(e){ return []; } }
        function saveWrongQs(arr){
            // Keep latest 200, deduplicate by question text
            const seen = new Set();
            const deduped = arr.filter(q=>{ if(seen.has(q.q)) return false; seen.add(q.q); return true; });
            localStorage.setItem(getWqKey(), JSON.stringify(deduped.slice(-200)));
            if(typeof _fbSyncWrongQs==='function') _fbSyncWrongQs();
        }

        // Called after each quiz finishes — collects wrong answers
        function persistWrongQuestions(){
            if(!G.answers || !G.questions) return;
            const existing = loadWrongQs();
            const existingQs = new Set(existing.map(w=>w.q));
            const newWrong = [];
            G.questions.forEach((q,i)=>{
                const a = G.answers[i];
                if(a && !a.skipped && !a.correct){
                    if(!existingQs.has(q.q)){
                        newWrong.push({ q:q.q, hi:q.hi||'', opts:q.opts, ans:q.ans, exp:q.exp||'', exam:q.exam||'', ch:q.ch, diff:q.diff||'medium', wrongAt:new Date().toISOString(), selectedIdx:a.selected });
                    }
                }
            });
            if(newWrong.length>0){
                saveWrongQs([...existing, ...newWrong]);
                updateHomeWrongBtn();
            }
        }

        // Remove a question once answered correctly in retry mode
        function markWrongQCorrect(qText){
            const arr = loadWrongQs().filter(w=>w.q!==qText);
            saveWrongQs(arr);
            updateHomeWrongBtn();
        }

        function updateHomeWrongBtn(){
            const wq = loadWrongQs();
            const btn = document.getElementById('wrongQHomeBtn');
            const sub = document.getElementById('wrongQHomeSub');
            if(btn){ btn.style.display = wq.length>0 ? '' : 'none'; }
            if(sub) sub.textContent = wq.length + ' question' + (wq.length!==1?'s':'') + ' to retry';
            // Also show/hide Retry Wrong button on result screen
            const retryBtn = document.getElementById('retryWrongBtn');
            if(retryBtn) retryBtn.style.display = wq.length>0 ? '' : 'none';
        }

        function showWrongQScreen(){
            const wq = loadWrongQs();
            const sub = document.getElementById('wqScreenSub');
            const list = document.getElementById('wqList');
            const startBtn = document.getElementById('wqStartBtn');
            if(sub) sub.textContent = wq.length + ' question' + (wq.length!==1?'s':'') + ' to retry';
            if(startBtn) startBtn.style.display = wq.length>0 ? '' : 'none';
            if(list){
                list.innerHTML = '';
                if(wq.length===0){
                    list.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-muted);font-size:15px">🎉<br><br>No wrong questions!<br>Complete a quiz to track mistakes here.</div>';
                } else {
                    var chNames={1:'Overview',2:'Geography',3:'Climate',4:'Wildlife',5:'Rivers',6:'Agriculture',7:'Irrigation',8:'Tourism',9:'Industry',10:'Minerals',11:'Transport',12:'History',13:'Culture',14:'Literature',15:'Tribal',16:'Education',17:'Political',18:'Schemes',19:'Census 2011'};
                    wq.forEach(function(w){
                        var card = document.createElement('div');
                        card.className = 'glass';
                        card.style.cssText = 'padding:18px;border-radius:16px';
                        // Header
                        var hdr = document.createElement('div');
                        hdr.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px';
                        var tag = document.createElement('div');
                        tag.style.cssText = 'font-size:13px;font-weight:700;color:var(--accent-red);background:var(--accent-red-light);padding:3px 10px;border-radius:20px';
                        tag.textContent = chNames[w.ch] || ('Ch'+w.ch);
                        var dateSpan = document.createElement('span');
                        dateSpan.style.cssText = 'font-size:11px;color:var(--text-muted)';
                        try{ dateSpan.textContent = new Date(w.wrongAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'}); }catch(e){ dateSpan.textContent=''; }
                        hdr.appendChild(tag); hdr.appendChild(dateSpan);
                        card.appendChild(hdr);
                        // Question
                        var qDiv = document.createElement('div');
                        qDiv.style.cssText = 'font-size:14px;font-weight:700;color:var(--text-primary);line-height:1.5;margin-bottom:10px';
                        qDiv.textContent = w.q;
                        card.appendChild(qDiv);
                        // Hindi
                        if(w.hi){ var hiDiv=document.createElement('div'); hiDiv.style.cssText='font-size:12px;color:var(--text-muted);margin-bottom:10px'; hiDiv.textContent=w.hi; card.appendChild(hiDiv); }
                        // Options
                        var optsDiv = document.createElement('div');
                        optsDiv.style.cssText = 'display:grid;gap:6px;margin-bottom:10px';
                        w.opts.forEach(function(o, oi){
                            var isCorrect = oi===w.ans;
                            var wasSelected = oi===w.selectedIdx;
                            var opt = document.createElement('div');
                            var bg='var(--bg-card-alt)', border='var(--border)', color='var(--text-secondary)', prefix='';
                            if(isCorrect){ bg='var(--accent-green-light)'; border='var(--accent-green)'; color='var(--accent-green)'; prefix='✅ '; }
                            else if(wasSelected){ bg='var(--accent-red-light)'; border='var(--accent-red)'; color='var(--accent-red)'; prefix='❌ '; }
                            opt.style.cssText = 'padding:8px 12px;border-radius:10px;font-size:13px;background:'+bg+';border:1.5px solid '+border+';color:'+color;
                            opt.textContent = prefix+String.fromCharCode(65+oi)+'. '+o;
                            optsDiv.appendChild(opt);
                        });
                        card.appendChild(optsDiv);
                        // Explanation
                        if(w.exp){ var expDiv=document.createElement('div'); expDiv.style.cssText='font-size:12px;color:var(--text-secondary);background:var(--bg-section);border-radius:10px;padding:10px 12px;line-height:1.6'; expDiv.innerHTML='<b>💡 Explanation:</b> '+w.exp; card.appendChild(expDiv); }
                        list.appendChild(card);
                    });
                }
            }
            showScreen('wrongQScreen');
        }

        function startWrongQuiz(){
            const wq = loadWrongQs();
            if(wq.length===0){ toast('No wrong questions to retry!','error'); return; }
            _startCustomQuiz(wq, '❌ Wrong Questions Retry');
        }

        function retryWrongQuestions(){
            sfx('tap');
            document.getElementById('reviewCard').style.display='none';
            resetResultAiPanel();
            startWrongQuiz();
        }

        // ── Shared: start a quiz from a custom question array ──
        function _startCustomQuiz(pool, label){
            sfx('tap');
            if(actx) actx.resume();
            G.name = document.getElementById('nameInput').value || 'Student';
            G.chapter = 'custom';
            G.timerSec = parseInt(document.getElementById('timerInput').value) || 30;
            // Map to QUESTIONS format
            G.questions = shuffle(pool.map(b=>({ q:b.q, hi:b.hi||'', opts:b.opts, ans:b.ans, exp:b.exp||'', exam:b.exam||'', ch:b.ch, diff:b.diff||'medium' })));
            G.total = G.questions.length;
            G.current=0; G.score=0; G.streak=0; G.maxStreak=0;
            G.answers = new Array(G.total).fill(null);
            G.bookmarks = new Set(); G.visited=new Set(); G.marked=new Set(); G.totalTime=0; G.doubleActive=false;
            G.ll = {fifty:1,freeze:1,hint:2,skip:2,double:1};
            ['ll5050','llFreeze','llHint','llSkip','llDouble'].forEach(id=>document.getElementById(id).classList.remove('used'));
            updateLLCounts();
            const avatarEl=document.getElementById('qAvatar'); if(avatarEl) avatarEl.textContent=G.name[0].toUpperCase();
            document.getElementById('qName').textContent = G.name;
            document.getElementById('qMeta').textContent = label;
            const setBadge=document.getElementById('etbSetBadge'); if(setBadge) setBadge.style.display='none';
            const nav=document.getElementById('qNav'); nav.innerHTML='';
            for(let i=0;i<G.total;i++){
                const pip=document.createElement('div'); pip.className='qn-pip'; pip.textContent=i+1;
                pip.onclick=()=>jumpTo(i); nav.appendChild(pip);
            }
            showScreen('quizScreen'); renderQ();
        }

        // ═══════════════════════════════════════════════════════
        // ═══════════ RESULTS HISTORY SCREEN JS ════════════════
        // ═══════════════════════════════════════════════════════

        let rhCurrentFilter = 'all';
        let rhAllHistory = [];

        function loadResultsHistory() {
            try {
                rhAllHistory = JSON.parse(localStorage.getItem(_lsk('quizHistory')) || '[]').reverse();
            } catch(e) { rhAllHistory = []; }

            // Summary stats
            const total = rhAllHistory.length;
            document.getElementById('rhs-total').textContent = total;
            if (total > 0) {
                const avg = Math.round(rhAllHistory.reduce((s,h) => s + h.score, 0) / total);
                const best = Math.max(...rhAllHistory.map(h => h.score));
                const bestStreak = Math.max(...rhAllHistory.map(h => h.streak || 0));
                document.getElementById('rhs-avg').textContent = avg + '%';
                document.getElementById('rhs-best').textContent = best + '%';
                document.getElementById('rhs-streak').textContent = bestStreak;
            } else {
                document.getElementById('rhs-avg').textContent = '—';
                document.getElementById('rhs-best').textContent = '—';
                document.getElementById('rhs-streak').textContent = '0';
            }

            rhRender();
        }

        function rhFilter(type, btn) {
            rhCurrentFilter = type;
            document.querySelectorAll('.rh-filter-btn').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');
            rhRender();
        }

        function rhRender() {
            const list = document.getElementById('rhList');
            let data = [...rhAllHistory];

            if (rhCurrentFilter === 'good')  data = data.filter(h => h.score >= 70);
            else if (rhCurrentFilter === 'mid')  data = data.filter(h => h.score >= 40 && h.score < 70);
            else if (rhCurrentFilter === 'low')  data = data.filter(h => h.score < 40);

            if (data.length === 0) {
                list.innerHTML = `<div class="rh-empty glass">
                    <div class="rh-empty-icon">${rhAllHistory.length === 0 ? '📭' : '🔍'}</div>
                    <div class="rh-empty-title">${rhAllHistory.length === 0 ? 'No quizzes yet!' : 'No results match filter'}</div>
                    <div class="rh-empty-sub">${rhAllHistory.length === 0 ? 'Complete a quiz to see your results here.' : 'Try a different filter.'}</div>
                    ${rhAllHistory.length === 0 ? `<button class="btn btn-primary" onclick="showScreen('welcomeScreen')">🚀 Start a Quiz</button>` : ''}
                </div>`;
                return;
            }

            list.innerHTML = '';
            const medals = ['🥇','🥈','🥉'];
            const sorted = [...rhAllHistory].sort((a,b) => b.score - a.score);
            const optKeys = ['A','B','C','D','E'];

            data.forEach((h, i) => {
                const globalRank = sorted.findIndex(s => s === h || (s.score === h.score && s.date === h.date));
                const medal = globalRank < 3 ? medals[globalRank] : `#${globalRank + 1}`;
                const pClass = h.score >= 70 ? 'p-good' : h.score >= 40 ? 'p-mid' : 'p-low';
                const sClass = h.score >= 70 ? 's-good' : h.score >= 40 ? 's-mid' : 's-low';
                const rankBg  = h.score >= 70 ? '#d1fae5' : h.score >= 40 ? '#fef3c7' : '#fee2e2';
                const gbClass = h.score >= 70 ? 'rgb-good' : h.score >= 40 ? 'rgb-mid' : 'rgb-low';
                const gradeLabel = h.score >= 90 ? '🏆 Outstanding' : h.score >= 75 ? '🌟 Excellent' : h.score >= 60 ? '👍 Good' : h.score >= 40 ? '📖 Needs Work' : '💪 Keep Going';
                const dateStr = formatHistoryDate(h.date);
                const idx = rhAllHistory.indexOf(h);
                const hasQuestions = Array.isArray(h.questions) && h.questions.length > 0;

                // Chapter insights (rich panel replacing mini-pills)
                let chBreakHTML = '';
                const chInsightsId = `rhChInsights${idx}`;
                if (h.chapterBreakdown) {
                    const entries = Object.entries(h.chapterBreakdown);
                    if (entries.length > 0) {
                        // Compute per-chapter avg time from question snapshots
                        const chTimeMap = {};
                        if (Array.isArray(h.questions)) {
                            h.questions.forEach(q => {
                                const key = q.chName || `Ch${q.ch}`;
                                if (!chTimeMap[key]) chTimeMap[key] = { sum: 0, count: 0 };
                                if (q.time > 0) { chTimeMap[key].sum += q.time; chTimeMap[key].count++; }
                            });
                        }

                        // Find strongest / weakest
                        const chPcts = entries.map(([cn, s]) => ({ cn, pct: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0, s }));
                        const strongest = chPcts.reduce((a, b) => b.pct > a.pct ? b : a);
                        const weakest   = chPcts.reduce((a, b) => b.pct < a.pct ? b : a);
                        const isMixed   = chPcts.length > 1;

                        const winnerSection = isMixed ? `
                            <div class="rh-ch-winner-row">
                                <div class="rh-ch-winner s">
                                    <div class="rh-ch-winner-label">🏆 Strongest</div>
                                    <div class="rh-ch-winner-name">${strongest.cn}</div>
                                    <div class="rh-ch-winner-pct">${strongest.pct}%</div>
                                </div>
                                <div class="rh-ch-winner w">
                                    <div class="rh-ch-winner-label">💔 Needs Work</div>
                                    <div class="rh-ch-winner-name">${weakest.cn}</div>
                                    <div class="rh-ch-winner-pct">${weakest.pct}%</div>
                                </div>
                            </div>` : '';

                        const chRows = chPcts.sort((a, b) => b.pct - a.pct).map(({ cn, pct, s }) => {
                            const cls = pct >= 70 ? 'good' : pct >= 40 ? 'medium' : 'bad';
                            const tm  = chTimeMap[cn];
                            const avg = tm && tm.count > 0 ? Math.round(tm.sum / tm.count) : 0;
                            const timeStr = avg > 0 ? `${avg}s` : '—';
                            return `<div class="rh-ch-row">
                                <div class="rh-ch-row-name" title="${cn}">${cn}</div>
                                <div class="rh-ch-bar-track"><div class="rh-ch-bar-fill ${cls}" style="width:${pct}%"></div></div>
                                <div class="rh-ch-row-pct" style="color:var(--accent-${cls==='good'?'green':cls==='medium'?'yellow':'red'})">${pct}%</div>
                                <div class="rh-ch-row-time">⏱${timeStr}</div>
                            </div>`;
                        }).join('');

                        const countLabel = entries.length > 1 ? `${entries.length} chapters` : `1 chapter`;
                        chBreakHTML = `
                            <div class="rh-ch-insights">
                                <button class="rh-ch-insights-toggle" onclick="(function(btn){var b=document.getElementById('${chInsightsId}');b.classList.toggle('open');btn.querySelector('.rh-ch-toggle-arrow').textContent=b.classList.contains('open')?'▲':'▼';})(this)">
                                    📊 Chapter Insights · ${countLabel} <span class="rh-ch-toggle-arrow">▼</span>
                                </button>
                                <div class="rh-ch-insights-body" id="${chInsightsId}">
                                    ${winnerSection}
                                    ${chRows}
                                </div>
                            </div>`;
                    }
                }

                // Weak chapter button
                const weakBtn = h.weakChapter
                    ? `<button class="rh-weak-btn" onclick="rhPracticeWeak(${idx})" title="Start a quiz on your weakest chapter: ${h.weakChapter.name} (${h.weakChapter.pct}%)">🎯 Practice Weak: ${h.weakChapter.name}</button>`
                    : '';

                const div = document.createElement('div');
                div.className = 'rh-item glass';
                div.innerHTML = `
                    <div class="rh-item-strip ${sClass}"></div>
                    <div class="rh-item-body">
                        <div class="rh-item-rank" style="background:${rankBg}">${medal}</div>
                        <div class="rh-item-info">
                            <div class="rh-item-name">${h.name || 'Student'} <span class="rh-grade-badge ${gbClass}" style="margin-left:6px">${gradeLabel}</span></div>
                            <div class="rh-item-detail">
                                <span>✅ ${h.correct}/${h.total} correct</span>
                                <span>🔥 Streak: ${h.streak || 0}</span>
                                <span>📅 ${dateStr}</span>
                                ${h.mode ? `<span>📝 ${h.mode}</span>` : ''}
                            </div>
                            ${chBreakHTML}
                        </div>
                        <div class="rh-item-right">
                            <div class="rh-item-pct ${pClass}">${h.score}%</div>
                            <div class="rh-item-date">Rank ${globalRank + 1}</div>
                        </div>
                    </div>
                    <div class="rh-ai-row">
                        <div class="rh-action-row">
                            <button class="rh-ai-mini-btn" id="rhAiBtn${idx}" onclick="rhAnalyseAttempt(${idx})">
                                🤖 AI Analysis
                            </button>
                            ${hasQuestions ? `<button class="rh-review-btn" onclick="rhToggleReview(${idx})">📋 Review Questions</button>` : ''}
                            ${weakBtn}
                        </div>
                        <span style="font-size:11px;color:var(--text-muted);margin-top:4px;width:100%">Get personalised feedback · Review answers · Practice weak topics</span>
                    </div>
                    <div class="rh-ai-result" id="rhAiResult${idx}"></div>
                    ${hasQuestions ? `
                    <div class="rh-review-panel" id="rhReview${idx}">
                        <div class="rh-review-panel-header">
                            <span>📋 Question Review — ${h.total} Questions (${h.correct} correct, ${h.total-h.correct} wrong/skipped)</span>
                            <button class="rh-review-panel-close" onclick="rhToggleReview(${idx})">✕</button>
                        </div>
                        <div class="rh-qlist" id="rhQList${idx}"></div>
                    </div>` : ''}
                `;
                list.appendChild(div);
            });
        }

        // ── RH REVIEW SCREEN ENGINE ─────────────────────────────
        let rhrHistory = null;
        let rhrCurrentIdx = 0;

        function openRhReviewScreen(idx) {
            const h = rhAllHistory[idx];
            if (!h || !h.questions || !h.questions.length) return;
            rhrHistory = h;
            rhrCurrentIdx = 0;

            // Set header
            const d = new Date(h.date);
            document.getElementById('rhrTitle').textContent = `${h.name || 'Student'} — Review`;
            document.getElementById('rhrSubtitle').textContent = `${h.correct}✅ ${h.wrong||0}❌ ${h.skip||0}⏭ · ${d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}`;
            document.getElementById('rhrScore').textContent = `${h.correct}/${h.total}`;

            // Build dots
            rhrBuildDots();
            rhrRenderQuestion();
            showScreen('rhReviewScreen');
        }

        function rhrBuildDots() {
            const inner = document.getElementById('rhrDotInner');
            if (!inner) return;
            inner.innerHTML = '';
            rhrHistory.questions.forEach((q, i) => {
                const dot = document.createElement('div');
                dot.className = `qdot qdot-${q.status}${i===rhrCurrentIdx?' qdot-active':''}`;
                dot.textContent = i + 1;
                dot.onclick = () => { rhrCurrentIdx = i; rhrBuildDots(); rhrRenderQuestion(); };
                inner.appendChild(dot);
            });
            const active = inner.children[rhrCurrentIdx];
            if (active) setTimeout(() => active.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}), 50);
        }

        function rhrRenderQuestion() {
            const q = rhrHistory.questions[rhrCurrentIdx];
            const total = rhrHistory.questions.length;
            if (!q) return;

            // Reset AI boxes
            document.getElementById('rhrAiBox').style.display = 'none';
            document.getElementById('rhrDetailBox').style.display = 'none';
            const aiBtn = document.getElementById('rhrAiBtn');
            const detBtn = document.getElementById('rhrDetailBtn');
            if (aiBtn) { aiBtn.innerHTML = '🤖 AI Analysis'; aiBtn.disabled = false; aiBtn.style.cssText = ''; }
            if (detBtn) { detBtn.innerHTML = '📖 Detailed Solution'; detBtn.disabled = false; detBtn.style.cssText = ''; }

            // Strip info
            document.getElementById('rhrQNum').textContent = rhrCurrentIdx + 1;
            document.getElementById('rhrQProgress').textContent = `Q${rhrCurrentIdx+1}/${total}`;
            document.getElementById('rhrNavInfo').textContent = `${rhrCurrentIdx+1} / ${total}`;
            document.getElementById('rhrTime').textContent = q.time > 0 ? `⏱ ${q.time}s` : '';
            const scorePlus = document.getElementById('rhrScorePlus');
            const scoreMinus = document.getElementById('rhrScoreMinus');
            if (q.status === 'correct') { scorePlus.textContent = '+1.0'; scorePlus.style.color = '#059669'; scoreMinus.textContent = ''; }
            else if (q.status === 'wrong') { scorePlus.textContent = ''; scoreMinus.textContent = '-0.25'; scoreMinus.style.color = '#dc2626'; }
            else { scorePlus.textContent = '0'; scorePlus.style.color = 'var(--text-muted)'; scoreMinus.textContent = ''; }
            document.getElementById('rhrExamTag').textContent = q.exam || '';

            // Tags
            const chNames = {1:'Overview',2:'Geography',3:'Climate',4:'Wildlife',5:'Rivers',6:'Agriculture',7:'Irrigation',8:'Tourism',9:'Industry',10:'Minerals',11:'Transport',12:'History',13:'Culture',14:'Literature',15:'Tribal',16:'Education',17:'Political',18:'Schemes',19:'Census 2011'};
            document.getElementById('rhrTags').innerHTML = `
                <span class="eq-tag chapter">Ch ${q.ch}: ${chNames[q.ch]||'UP'}</span>
                <span class="eq-tag diff-${q.diff||'medium'}">${(q.diff||'medium').toUpperCase()}</span>
                ${q.exam ? `<span class="eq-tag exam">${q.exam}</span>` : ''}
            `;

            // Question text
            document.getElementById('rhrQText').textContent = q.q;
            const hindiEl = document.getElementById('rhrQHindi');
            hindiEl.textContent = q.hi || '';
            hindiEl.style.display = q.hi ? 'block' : 'none';

            // Options — full-width Image-2 style
            const list = document.getElementById('rhrOptList');
            list.innerHTML = '';
            q.opts.forEach((opt, oi) => {
                const el = document.createElement('div');
                el.className = 'opt-card locked';
                if (oi === q.ans) el.classList.add('correct-opt');
                else if (oi === q.selectedIdx && q.status === 'wrong') el.classList.add('wrong-opt');
                else el.classList.add('dimmed');
                el.innerHTML = `
                    <div class="opt-num">${oi+1}.</div>
                    <div class="opt-label">${opt}</div>
                    <div class="opt-indicator">${oi===q.ans?'✓':(oi===q.selectedIdx&&q.status==='wrong')?'✗':''}</div>
                `;
                list.appendChild(el);
            });

            // Correct answer bar
            const pct = q.diff==='easy'?Math.floor(55+Math.random()*28):q.diff==='hard'?Math.floor(15+Math.random()*28):Math.floor(30+Math.random()*32);
            document.getElementById('rhrAnsLabel').textContent = `✅ Correct Answer Is: ${q.ans+1}`;
            document.getElementById('rhrAnsPct').textContent = `${pct}% got this right`;
            document.getElementById('rhrAnsBar').className = 'correct-ans-bar visible';

            // Solution
            const expBox = document.getElementById('rhrExpBox');
            if (q.exp) {
                document.getElementById('rhrExpText').textContent = q.exp;
                expBox.style.display = 'block';
                expBox.className = 'eq-explanation visible';
            } else {
                expBox.style.display = 'none';
            }

            // Flash card
            const card = document.getElementById('rhrQCard');
            if (q.status === 'correct') { card.classList.add('correct-flash'); setTimeout(()=>card.classList.remove('correct-flash'),600); }
            else if (q.status === 'wrong') { card.classList.add('wrong-shake'); setTimeout(()=>card.classList.remove('wrong-shake'),500); }

            // Nav buttons
            document.getElementById('rhrPrevBtn').disabled = rhrCurrentIdx === 0;
            document.getElementById('rhrNextBtn').disabled = rhrCurrentIdx === total - 1;

            // Scroll to top of scroll area
            const sa = document.getElementById('rhrScrollArea');
            if (sa) sa.scrollTop = 0;
            else window.scrollTo({top:0,behavior:'smooth'});
        }

        function rhrNavigate(dir) {
            const total = rhrHistory.questions.length;
            rhrCurrentIdx = Math.max(0, Math.min(total - 1, rhrCurrentIdx + dir));
            rhrBuildDots();
            rhrRenderQuestion();
        }

        async function rhrGetAiAnalysis() {
            const q = rhrHistory.questions[rhrCurrentIdx];
            const box = document.getElementById('rhrAiBox');
            const body = document.getElementById('rhrAiBody');
            const engEl = document.getElementById('rhrAiEngine');
            const title = document.getElementById('rhrAiTitle');
            const btn = document.getElementById('rhrAiBtn');

            if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Analysing…'; }
            box.style.display = 'block';
            if (engEl) engEl.textContent = `Powered by ${getEngineLabel()}`;
            if (title) title.textContent = `AI Analysis — Q${rhrCurrentIdx+1}`;
            body.innerHTML = `<div class="qac-loading"><div class="qac-dots"><span></span><span></span><span></span></div> Analysing…</div>`;
            box.scrollIntoView({behavior:'smooth',block:'nearest'});

            const nums = ['1','2','3','4','5'];
            const statusText = q.status==='correct'
                ? `CORRECT ✅ (answered ${nums[q.ans]})`
                : q.status==='wrong'
                ? `WRONG ❌ (selected ${nums[q.selectedIdx]}: "${q.opts[q.selectedIdx]}", correct: ${nums[q.ans]}: "${q.opts[q.ans]}")`
                : `SKIPPED ⏭️ (correct: ${nums[q.ans]}: "${q.opts[q.ans]}")`;

            try {
                const text = await callAI(buildAiSectionsPrompt(q, statusText), '');
                body.innerHTML = renderAiSectionsHTML(text);
                if (btn) { btn.innerHTML = '✅ Done'; btn.disabled = false; btn.style.cssText = 'background:var(--accent-green-light);color:var(--accent-green);border-color:var(--accent-green)'; }
            } catch(e) {
                body.innerHTML = `<div class="qac-error">⚠️ ${e.message}</div>`;
                if (btn) { btn.disabled = false; btn.innerHTML = '🔄 Retry'; }
            }
        }

        async function rhrGetDetailedSolution() {
            const q = rhrHistory.questions[rhrCurrentIdx];
            const box = document.getElementById('rhrDetailBox');
            const body = document.getElementById('rhrDetailBody');
            const btn = document.getElementById('rhrDetailBtn');
            const title = document.getElementById('rhrDetailTitle');

            if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Loading…'; }
            box.style.display = 'block';
            if (title) title.textContent = `🤖 Detailed Solution — Q${rhrCurrentIdx+1}`;
            body.innerHTML = `<div class="qac-loading"><div class="qac-dots"><span></span><span></span><span></span></div> Generating…</div>`;
            setTimeout(()=>box.scrollIntoView({behavior:'smooth',block:'nearest'}),100);

            const nums = ['1','2','3','4','5'];
            const statusText = q.status==='correct'
                ?`Student CORRECTLY answered (option ${nums[q.ans]})`
                :q.status==='wrong'
                ?`Student answered WRONG — selected ${nums[q.selectedIdx]}: "${q.opts[q.selectedIdx]}", correct is ${nums[q.ans]}: "${q.opts[q.ans]}"`
                :`Student SKIPPED — correct is ${nums[q.ans]}: "${q.opts[q.ans]}"`;

            const prompt = `You are an expert UP GK exam tutor. Give a DETAILED solution.
${getLangInstruction()}
Question: ${q.q}
${q.hi?`Hindi: ${q.hi}`:''}
Options: ${q.opts.map((o,i)=>`${i+1}. ${o}`).join(' | ')}
Correct Answer: ${nums[q.ans]}. ${q.opts[q.ans]}
${statusText}
Basic Explanation: ${q.exp||''}
Exam: ${q.exam||''}

Provide:
1. **Why the correct answer is right** — full facts, dates, context
2. **Why each wrong option is wrong** — specific reason
3. **Related UP exam facts** — 3-5 key facts
4. **Memory trick** — mnemonic
5. **Previous year connections** — related exam appearances

Use bold for key terms. Be thorough but exam-focused.`;

            try {
                const text = await callAI(prompt, '');
                body.innerHTML = text
                    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
                    .replace(/^#{1,3}\s*(.+)$/gm,'<p style="font-weight:800;color:var(--accent-purple);margin:10px 0 4px">$1</p>')
                    .replace(/\n\n/g,'</p><p style="margin:4px 0">')
                    .replace(/\n/g,'<br>');
                if (btn) { btn.innerHTML = '✅ Done'; btn.disabled = false; btn.style.cssText = 'background:var(--accent-green-light);color:var(--accent-green);border-color:var(--accent-green)'; }
            } catch(e) {
                body.innerHTML = `<div class="qac-error">⚠️ ${e.message}</div>`;
                if (btn) { btn.disabled = false; btn.innerHTML = '🔄 Retry'; }
            }
        }

        function rhToggleReview(idx) {
            // Now opens full-screen instead of panel
            openRhReviewScreen(idx);
        }

        function rhRenderQuestions(idx, container) {
            const h = rhAllHistory[idx];
            if (!h || !h.questions) return;
            container.innerHTML = '';

            h.questions.forEach((q, qi) => {
                const stripColor = q.status==='correct'?'var(--gradient-success)':q.status==='wrong'?'var(--gradient-danger)':'var(--gradient-warm)';
                const circleColor = q.status==='correct'?'#059669':q.status==='wrong'?'#dc2626':'#94a3b8';

                // Full-width option rows
                const optsHTML = q.opts.map((o, oi) => {
                    let cls = 'rv-opt-row';
                    let icon = '';
                    if (oi === q.ans) { cls += ' rvo-correct'; icon = '✓'; }
                    else if (oi === q.selectedIdx && q.status === 'wrong') { cls += ' rvo-wrong'; icon = '✗'; }
                    else { cls += ' rvo-dim'; }
                    return `<div class="${cls}">
                        <div class="rv-opt-num">${oi+1}.</div>
                        <div class="rv-opt-text">${o}</div>
                        <div class="rv-opt-icon">${icon}</div>
                    </div>`;
                }).join('');

                // Score badge
                const scoreCls = q.status==='correct'?'rv-score-plus':q.status==='wrong'?'rv-score-minus':'rv-score-zero';
                const scoreVal = q.status==='correct'?'+1.0':q.status==='wrong'?'-0.25':'0';
                const pctVal = q.diff==='easy'?Math.floor(55+Math.random()*28):q.diff==='hard'?Math.floor(15+Math.random()*28):Math.floor(30+Math.random()*32);

                const div = document.createElement('div');
                div.className = 'rv-item rv-' + q.status;
                div.innerHTML = `
                    <div class="rv-strip" style="background:${stripColor}"></div>
                    <div class="rv-header">
                        <div class="rv-q-circle" style="background:${circleColor}">${qi+1}</div>
                        <div class="rv-q-body">
                            <div class="rv-q-meta">
                                <span class="rv-q-num">Q${qi+1} of ${h.questions.length}</span>
                                <span class="rv-score-pill ${scoreCls}">${scoreVal}</span>
                                ${q.time>0?`<span class="rv-time-pill">⏱ ${q.time}s</span>`:''}
                            </div>
                            <div class="rv-q-text">${q.q}</div>
                            ${q.hi?`<div class="rv-q-hindi">${q.hi}</div>`:''}
                        </div>
                        <div class="rv-tags">
                            <span class="rv-tag t-chapter">Ch ${q.ch}</span>
                            <span class="rv-tag t-${q.diff||'medium'}">${(q.diff||'medium').toUpperCase()}</span>
                        </div>
                    </div>

                    <div class="rv-opts-list">${optsHTML}</div>

                    <div class="rv-cab">
                        <span class="rv-cab-label">✅ Correct Answer Is: ${q.ans+1}</span>
                        <span class="rv-cab-pct">${pctVal}% got this right</span>
                    </div>

                    ${q.exp?`<div class="rv-solution">
                        <div class="rv-sol-head">📋 Solution</div>
                        <div class="rv-sol-body">${q.exp}</div>
                    </div>`:''}

                    <div class="rv-ai-block" id="rhAiCard_${idx}_${qi}" style="display:none">
                        <div class="qac-header">
                            <div class="qac-header-left">
                                <div class="qac-logo">🧠</div>
                                <div>
                                    <div class="qac-title">AI Analysis — Q${qi+1}</div>
                                    <div class="qac-engine" id="rhAiEng_${idx}_${qi}">Powered by ${typeof getEngineLabel==='function'?getEngineLabel():'⚡ AI'}</div>
                                </div>
                            </div>
                            <button class="qac-close" onclick="document.getElementById('rhAiCard_${idx}_${qi}').style.display='none'">✕</button>
                        </div>
                        <div id="rhAiBody_${idx}_${qi}" class="qac-body"></div>
                    </div>

                    <div class="rv-detail-block" id="rhDetailBox_${idx}_${qi}" style="display:none">
                        <div class="rv-detail-head">
                            <span class="rv-detail-title">🤖 Detailed Solution — Q${qi+1}</span>
                            <button class="rv-detail-close" onclick="document.getElementById('rhDetailBox_${idx}_${qi}').style.display='none'">✕</button>
                        </div>
                        <div class="rv-detail-body" id="rhDetailContent_${idx}_${qi}"></div>
                    </div>

                    <div class="rv-footer">
                        <span class="rv-exam-tag">${q.exam||''}</span>
                        <div class="rv-footer-btns">
                            <button class="rv-ai-btn" id="rhDetailBtn_${idx}_${qi}" onclick="rhGetDetailedSolution(${idx},${qi})">📖 Detailed Solution</button>
                            <button class="rv-ai-btn" id="rhAiBtn_${idx}_${qi}" onclick="rhTriggerAI(${idx},${qi})">🤖 AI Analysis</button>
                        </div>
                    </div>
                `;
                container.appendChild(div);
            });
        }

        async function rhTriggerAI(histIdx, qIdx) {
            const h = rhAllHistory[histIdx];
            if (!h || !h.questions) return;
            const q = h.questions[qIdx];
            const btn    = document.getElementById(`rhAiBtn_${histIdx}_${qIdx}`);
            const box    = document.getElementById(`rhAiCard_${histIdx}_${qIdx}`);
            const bodyEl = document.getElementById(`rhAiBody_${histIdx}_${qIdx}`);
            const engEl  = document.getElementById(`rhAiEng_${histIdx}_${qIdx}`);
            if (!bodyEl) return;

            if(btn){ btn.disabled=true; btn.innerHTML='⏳ Analysing…'; }
            if(box) box.style.display='block';
            if(engEl) engEl.textContent = `Powered by ${getEngineLabel()}`;
            bodyEl.innerHTML=`<div class="qac-loading"><div class="qac-dots"><span></span><span></span><span></span></div> Analysing Q${qIdx+1}…</div>`;

            const nums = ['1','2','3','4','5'];
            let statusText = '';
            if (q.status === 'correct')
                statusText = `CORRECT ✅ (answered ${nums[q.ans]})`;
            else if (q.status === 'wrong')
                statusText = `WRONG ❌ (selected ${nums[q.selectedIdx]}: "${q.opts[q.selectedIdx]}", correct: ${nums[q.ans]}: "${q.opts[q.ans]}")`;
            else
                statusText = `SKIPPED ⏭️ (correct: ${nums[q.ans]}: "${q.opts[q.ans]}")`;

            const prompt = buildAiSectionsPrompt(q, statusText);
            try {
                const text = await callAI(prompt, '');
                bodyEl.innerHTML = renderAiSectionsHTML(text);
                if(btn){ btn.innerHTML='✅ Done'; btn.disabled=false; btn.style.cssText='background:var(--accent-green-light);color:var(--accent-green);border-color:var(--accent-green)'; }
            } catch(e) {
                bodyEl.innerHTML = `<div class="qac-error">⚠️ ${e.message}</div>`;
                if(btn){ btn.disabled=false; btn.innerHTML='🔄 Retry'; }
            }
        }

        async function rhGetDetailedSolution(histIdx, qIdx) {
            const h = rhAllHistory[histIdx];
            if (!h || !h.questions) return;
            const q   = h.questions[qIdx];
            const btn  = document.getElementById(`rhDetailBtn_${histIdx}_${qIdx}`);
            const box  = document.getElementById(`rhDetailBox_${histIdx}_${qIdx}`);
            const body = document.getElementById(`rhDetailContent_${histIdx}_${qIdx}`);
            if(!box||!body) return;

            if(btn){ btn.disabled=true; btn.innerHTML='⏳ Loading…'; }
            box.style.display='block';
            body.innerHTML=`<div class="qac-loading"><div class="qac-dots"><span></span><span></span><span></span></div> Generating detailed solution…</div>`;
            setTimeout(()=>box.scrollIntoView({behavior:'smooth',block:'nearest'}),100);

            const nums=['1','2','3','4','5'];
            const statusText = q.status==='correct'
                ?`Student answered CORRECTLY (option ${nums[q.ans]})`
                :q.status==='wrong'
                ?`Student answered WRONG — selected ${nums[q.selectedIdx]}: "${q.opts[q.selectedIdx]}", correct is ${nums[q.ans]}: "${q.opts[q.ans]}"`
                :`Student SKIPPED — correct is ${nums[q.ans]}: "${q.opts[q.ans]}"`;

            const prompt=`You are an expert UP GK exam tutor. Give a DETAILED solution.
${getLangInstruction()}
Question: ${q.q}
${q.hi?`Hindi: ${q.hi}`:''}
Options: ${q.opts.map((o,i)=>`${i+1}. ${o}`).join(' | ')}
Correct Answer: ${nums[q.ans]}. ${q.opts[q.ans]}
${statusText}
Basic Explanation: ${q.exp||''}
Exam: ${q.exam||''}

Provide:
1. **Why the correct answer is right** — full facts, dates, context
2. **Why each wrong option is wrong** — specific reason
3. **Related UP exam facts** — 3-5 key facts
4. **Memory trick** — mnemonic
5. **Previous year connections** — related exam appearances

Use bold for key terms. Be thorough but exam-focused.`;

            try {
                const text = await callAI(prompt,'');
                body.innerHTML=text
                    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
                    .replace(/^#{1,3}\s*(.+)$/gm,'<p style="font-weight:800;color:var(--accent-purple);margin:10px 0 4px">$1</p>')
                    .replace(/\n\n/g,'</p><p style="margin:4px 0">')
                    .replace(/\n/g,'<br>');
                if(btn){btn.innerHTML='✅ Done';btn.disabled=false;btn.style.cssText='background:var(--accent-green-light);color:var(--accent-green);border-color:var(--accent-green)';}
            } catch(e){
                body.innerHTML=`<div class="qac-error">⚠️ ${e.message}</div>`;
                if(btn){btn.disabled=false;btn.innerHTML='🔄 Retry';}
            }
        }

        function rhPracticeWeak(idx) {
            const h = rhAllHistory[idx];
            if (!h || !h.weakChapter) return;
            const ch = h.weakChapter.ch;
            /* Paid check — chapter 1 is always free */
            if (String(ch) !== '1' && !window._upqzIsPaid()) {
                window.openPaymentPopup();
                return;
            }
            // Pre-fill the chapter selector and go to home
            showScreen('welcomeScreen');
            setTimeout(() => {
                if(typeof window.selectChapter === 'function'){
                    window.selectChapter(ch);
                } else {
                    const sel = document.getElementById('chapterInput');
                    if(sel){ sel.value = ch; onChapterChange(); }
                }
                toast(`🎯 Set to practice "${h.weakChapter.name}" — your weakest chapter (${h.weakChapter.pct}%)`, 'info');
                const triggerBtn = document.getElementById('chTriggerBtn');
                if(triggerBtn) triggerBtn.scrollIntoView({ behavior:'smooth' });
            }, 400);
        }

        function rhSyncEngineChips() {
            const eng = AI_ENGINE;
            document.querySelectorAll('.rh-engine-chip').forEach(c => {
                const active = c.dataset.engine === eng;
                c.classList.toggle('active', active);
            });
        }

        async function rhAnalyseAttempt(idx) {
            const h = rhAllHistory[idx];
            if (!h) return;
            const btn = document.getElementById(`rhAiBtn${idx}`);
            const box = document.getElementById(`rhAiResult${idx}`);

            btn.disabled = true;
            btn.innerHTML = `<span class="rv-ai-spin"></span> Analysing…`;
            box.style.display="block";
            box.innerHTML = `<div class="rv-ai-loading"><div class="rvai-dots"><span></span><span></span><span></span></div> Generating feedback via ${getEngineLabel()}…</div>`;

            const pct = h.score;
            const gradeLabel = pct>=90?'Outstanding':pct>=75?'Excellent':pct>=60?'Good':pct>=40?'Needs Work':'Keep Going';

            // Build chapter breakdown summary
            let chSummary = '';
            if (h.chapterBreakdown) {
                chSummary = '\nChapter-wise: ' + Object.entries(h.chapterBreakdown)
                    .map(([cn,s]) => `${cn}: ${s.correct}/${s.total}`)
                    .join(', ');
            }
            const weakInfo = h.weakChapter ? `\nWeakest chapter: ${h.weakChapter.name} (${h.weakChapter.pct}%)` : '';

            const prompt = `Student: ${h.name||'Student'} | Score: ${h.correct}/${h.total} (${pct}%) — ${gradeLabel} | Streak: ${h.streak||0} | Mode: ${h.mode||'exam'}${chSummary}${weakInfo}

Write a warm, exam-focused analysis in 3 short paragraphs:
1. One-sentence verdict with grade and score
2. Chapter-specific insight: what went well and what needs work (mention specific chapters from breakdown)
3. One concrete actionable tip to improve for UP Lekhpal/UPSSSC/UPPSC exam

Under 150 words. Be encouraging but honest. Use some Hindi where helpful.`;

            try {
                const text = await callAI(prompt);
                box.innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:12px;font-weight:800;color:var(--accent-purple);text-transform:uppercase;letter-spacing:0.5px"><div style="width:22px;height:22px;background:linear-gradient(135deg,#a78bfa,#818cf8);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px">🤖</div>AI Analysis · ${getEngineLabel()}</div>` + formatRvAiText(text);
                btn.innerHTML='✅ Done'; btn.style.cssText='background:var(--accent-green-light);color:var(--accent-green);border-color:var(--accent-green)';
            } catch(e) {
                box.innerHTML=`<span style="color:var(--accent-red);font-size:12px">⚠️ ${e.message}. Try switching AI engine above.</span>`;
                btn.disabled=false; btn.innerHTML='🔄 Retry';
            }
        }

        function clearHistory() {
            if (!confirm('Clear all quiz history? This cannot be undone.')) return;
            try { localStorage.removeItem(_lsk('quizHistory')); } catch(e) {}
            if (typeof _fbClearHistory === 'function') _fbClearHistory();
            rhAllHistory = [];
            loadResultsHistory();
            loadHomeStats();
            toast('🗑 History cleared', 'info');
        }

        function shareResults(){
            const correct=G.answers.filter(a=>a&&a.correct).length;
            const pct=Math.round((correct/G.total)*100);
            const text=`📚 ExamZen\n🎯 Score: ${pct}% (${correct}/${G.total})\n🔥 Max Streak: ${G.maxStreak}\n💯 Total Points: ${G.score}\n\nTry it yourself! 🚀`;
            if(navigator.share) navigator.share({title:'My ExamZen Quiz Result',text});
            else navigator.clipboard.writeText(text).then(()=>toast('📋 Copied to clipboard!','success'));
        }

        // ═══════════ KEYBOARD ═══════════
        document.addEventListener('keydown',e=>{
            if(document.getElementById('quizScreen').classList.contains('active')){
                switch(e.key){
                    case '1':if(!G.answered) pickAnswer(0);break;
                    case '2':if(!G.answered) pickAnswer(1);break;
                    case '3':if(!G.answered) pickAnswer(2);break;
                    case '4':if(!G.answered) pickAnswer(3);break;
                    case '5':if(!G.answered) pickAnswer(4);break;
                    case 'Enter':case 'ArrowRight':case 'n':case 'N':goNext();break;
                    case 'ArrowLeft':case 'p':case 'P':goPrev();break;
                    case 'b':case 'B':toggleBookmark();break;
                    case 'h':case 'H':lifelineHint();break;
                    case 'f':case 'F':lifeline5050();break;
                    case 's':case 'S':lifelineSkip();break;
                    case 'd':case 'D':lifelineDouble();break;
                }
            }
        });

        document.addEventListener('visibilitychange',()=>{
            if(document.hidden&&document.getElementById('quizScreen').classList.contains('active')&&G.mode==='exam')
                toast('👀 Tab switch detected!','error');
        });

        // ═══════════════════════════════════════════════════════════════
        //  ADMIN PANEL v2 — Single Add | Bulk Import | New Chapter
        // ═══════════════════════════════════════════════════════════════

        const ADMIN_PASSWORD = 'upgk2025';
        let adminClickCount = 0, adminClickTimer = null, adminUnlocked = false;

        // ── Admin panel only opens via ⚙️ settings icon ──
        // Removed: 5-click hero trigger & Ctrl+Shift+A shortcut
        // To open admin: tap the ⚙️ icon in the footer

        // ── Login ────────────────────────────────────────────────────
        function openAdminLogin() {
            if (adminUnlocked) { showAdminPanel('tabSingle'); return; }
            document.getElementById('adminLoginOverlay').style.display = 'flex';
            document.getElementById('adminPasswordInput').value = '';
            setTimeout(() => document.getElementById('adminPasswordInput').focus(), 100);
        }
        function closeAdminLogin() { document.getElementById('adminLoginOverlay').style.display = 'none'; }
        function checkAdminPassword() {
            const val = document.getElementById('adminPasswordInput').value;
            if (val === ADMIN_PASSWORD) {
                adminUnlocked = true;
                document.getElementById('adminLoginOverlay').style.display = 'none';
                showAdminPanel('tabSingle');
            } else {
                const inp = document.getElementById('adminPasswordInput');
                inp.style.borderColor = '#dc2626'; inp.value = '';
                inp.placeholder = '❌ Wrong password!';
                setTimeout(() => { inp.style.borderColor = ''; inp.placeholder = 'Enter admin password…'; }, 1800);
            }
        }

        // ── Panel open/close ─────────────────────────────────────────
        function showAdminPanel(tab) {
            document.getElementById('adminPanelOverlay').style.display = 'flex';
            updateAdminChapterDropdowns();
            updateAdminQuestionCount();
            switchAdminTab(tab || 'tabSingle');
        }
        function closeAdminPanel() { document.getElementById('adminPanelOverlay').style.display = 'none'; }

        function updateAdminQuestionCount() {
            document.getElementById('adminQCount').textContent =
                `${QUESTIONS.length} questions • ${getAllChapters().length} chapters`;
        }

        // ── Tab switching ────────────────────────────────────────────
        function switchAdminTab(tabId) {
            ['tabSingle','tabBulk','tabChapter','tabKeys'].forEach(t => {
                const btn = document.getElementById('atb_' + t);
                const pane = document.getElementById(t);
                if (btn)  btn.style.background  = t === tabId ? 'rgba(255,255,255,0.2)' : 'transparent';
                if (btn)  btn.style.fontWeight   = t === tabId ? '800' : '600';
                if (pane) pane.style.display     = t === tabId ? 'block' : 'none';
            });
            if (tabId === 'tabKeys') renderAdminKeys();
        }

        // ── Keys Management ──────────────────────────────────────────
        var _keysData = [], _keysPage = 0, _keysSearch = '', _keysPageSize = 50;

        function renderAdminKeys() {
            var db = window._upqzGetDB ? window._upqzGetDB() : null;
            var el = document.getElementById('keysListBody');
            var countEl = document.getElementById('keysCount');
            if (!el) return;
            if (!db) { el.innerHTML = '<div style="padding:16px;color:#dc2626;font-size:13px">⚠️ Firebase not connected</div>'; return; }
            el.innerHTML = '<div style="padding:16px;text-align:center;color:#64748b;font-size:13px">⏳ Loading keys…</div>';
            db.ref('licenses').once('value').then(function(snap) {
                _keysData = [];
                snap.forEach(function(child) {
                    _keysData.push({ key: child.key, val: child.val() });
                });
                _keysData.sort(function(a,b){ return (b.val.createdAt||0) - (a.val.createdAt||0); });
                if (countEl) countEl.textContent = _keysData.length + ' keys total';
                renderKeysPage();
            }).catch(function(e){ el.innerHTML = '<div style="padding:16px;color:#dc2626;font-size:13px">Error: ' + e.message + '</div>'; });
        }

        function renderKeysPage() {
            var el = document.getElementById('keysListBody');
            if (!el) return;
            var search = _keysSearch.toLowerCase();
            var filtered = _keysData.filter(function(k){
                return !search || k.key.toLowerCase().includes(search) || (k.val.usedBy||'').toLowerCase().includes(search);
            });
            var pages = Math.ceil(filtered.length / _keysPageSize) || 1;
            if (_keysPage >= pages) _keysPage = pages - 1;
            var start = _keysPage * _keysPageSize;
            var slice = filtered.slice(start, start + _keysPageSize);
            var pageEl = document.getElementById('keysPageInfo');
            if (pageEl) pageEl.textContent = 'Page ' + (_keysPage+1) + '/' + pages + ' (' + filtered.length + ' filtered)';

            if (!slice.length) {
                el.innerHTML = '<div style="padding:24px;text-align:center;color:#94a3b8;font-size:13px">No keys found</div>';
                return;
            }

            el.innerHTML = '';
            slice.forEach(function(k) {
                var used = k.val.used || k.val.usedBy;
                var date = k.val.createdAt ? new Date(k.val.createdAt).toLocaleDateString('en-IN') : '';
                var row = document.createElement('div');
                row.style.cssText = 'display:grid;grid-template-columns:1fr auto auto auto;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:12px';
                var info = document.createElement('div');
                info.innerHTML = '<div style="font-family:monospace;font-weight:700;color:#1e1b4b;letter-spacing:1px">' + k.key + '</div>'
                    + '<div style="color:#94a3b8;font-size:10px;margin-top:1px">' + (k.val.usedBy||'') + (date ? ' · ' + date : '') + '</div>';
                var badge = document.createElement('span');
                badge.style.cssText = 'padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;background:' + (used ? '#fee2e2' : '#d1fae5') + ';color:' + (used ? '#dc2626' : '#059669');
                badge.textContent = used ? '✓ Used' : '● Free';
                var revokeBtn = document.createElement('button');
                revokeBtn.textContent = 'Revoke';
                revokeBtn.style.cssText = 'padding:4px 8px;border:1px solid #fca5a5;border-radius:6px;background:#fff;color:#dc2626;font-size:10px;font-weight:700;cursor:pointer';
                revokeBtn.dataset.key = k.key;
                revokeBtn.addEventListener('click', function(){ adminRevokeKey(this.dataset.key); });
                var deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.style.cssText = 'padding:4px 8px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;color:#64748b;font-size:10px;font-weight:700;cursor:pointer';
                deleteBtn.dataset.key = k.key;
                deleteBtn.addEventListener('click', function(){ adminDeleteKey(this.dataset.key); });
                row.appendChild(info);
                row.appendChild(badge);
                row.appendChild(revokeBtn);
                row.appendChild(deleteBtn);
                el.appendChild(row);
            });
        }

        function adminRevokeKey(key) {
            if (!confirm('Revoke key ' + key + '? The user will lose access.')) return;
            var db = window._upqzGetDB ? window._upqzGetDB() : null;
            if (!db) return;
            db.ref('licenses/' + key).update({ used: false, usedBy: null, revokedAt: Date.now() })
                .then(function(){ toast('Key revoked: ' + key, 'info'); renderAdminKeys(); })
                .catch(function(e){ alert('Error: ' + e.message); });
        }

        function adminDeleteKey(key) {
            if (!confirm('Permanently delete key ' + key + '?')) return;
            var db = window._upqzGetDB ? window._upqzGetDB() : null;
            if (!db) return;
            db.ref('licenses/' + key).remove()
                .then(function(){ toast('Key deleted', 'info'); renderAdminKeys(); })
                .catch(function(e){ alert('Error: ' + e.message); });
        }

        function adminExportKeysCSV() {
            if (!_keysData.length) { alert('No keys loaded. Open the Keys tab first.'); return; }
            var rows = ['Key,Status,UsedBy,CreatedAt'];
            _keysData.forEach(function(k) {
                var used = k.val.used || k.val.usedBy ? 'Used' : 'Free';
                var by = k.val.usedBy || '';
                var dt = k.val.createdAt ? new Date(k.val.createdAt).toISOString() : '';
                rows.push([k.key, used, by, dt].map(function(v){ return '"' + String(v).replace(/"/g,'""') + '"'; }).join(','));
            });
            var blob = new Blob([rows.join('\n')], { type: 'text/csv' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'examzen_keys_' + Date.now() + '.csv';
            a.click();
        }

        // ── Chapter helpers ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════
// AI TUTOR – CORE LOGIC
// ═══════════════════════════════════════════════════════

function openAITutor() {
  document.getElementById('aiTutorOverlay').classList.add('open');
  setTimeout(() => document.getElementById('atQuestionInput').focus(), 300);
}
function closeAITutor() {
  document.getElementById('aiTutorOverlay').classList.remove('open');
}
function closeAITutorOnBg(e) {
  if (e.target === document.getElementById('aiTutorOverlay')) closeAITutor();
}
function appendBadge(name) {
  const ta = document.getElementById('atQuestionInput');
  if (!ta.value.includes(name)) {
    ta.value = (ta.value ? ta.value + '\n' : '') + 'Focus exams: ' + name;
  }
  ta.focus();
}
function clearAITutor() {
  document.getElementById('atQuestionInput').value = '';
  document.getElementById('atResponseArea').innerHTML = `
    <div class="at-welcome">
      <div class="at-welcome-icon">📚</div>
      <h3>UP Exam AI Tutor</h3>
      <p>Question paste करें और पाएं:<br>
        ✅ सही उत्तर + Explanation · 📖 Key Facts Table<br>
        📝 Previous Year Questions · 🔑 Revision Chart · 💡 Exam Trick
      </p>
    </div>`;
}

// ── Build rich HTML from the AI's markdown-ish response ──
function renderAIResponse(raw) {
  // Parse sections from the structured response
  let html = '<div class="at-response-block at-content">';

  // Helper: wrap section heading
  function secHead(emoji, title, cls) {
    return `<div class="at-sec-head ${cls}">${emoji} ${title}</div>`;
  }

  // Split by section markers
  const lines = raw.split('\n');
  let section = '';
  let buffer  = [];

  function flushBuffer() {
    if (!buffer.length) return;
    const text = buffer.join('\n').trim();
    if (!text) { buffer=[]; return; }

    if (section === 'answer') {
      html += renderAnswerSection(text);
    } else if (section === 'facts') {
      html += renderFactsSection(text);
    } else if (section === 'pyq') {
      html += renderPYQSection(text);
    } else if (section === 'chart') {
      html += renderChartSection(text);
    } else if (section === 'trick') {
      html += renderTrickSection(text);
    } else {
      html += `<div style="color:#94a3b8;font-size:13px;line-height:1.7;margin-bottom:12px">${text.replace(/\n/g,'<br>')}</div>`;
    }
    buffer = [];
  }

  for (const line of lines) {
    const L = line.trim();
    const isNewSection =
      L.match(/^(✅|##\s*✅|##\s*Correct Answer|CORRECT ANSWER|सही उत्तर)/i)    ? 'answer' :
      L.match(/^(📖|##\s*📖|##\s*Key Facts|KEY FACTS|मुख्य तथ्य)/i)            ? 'facts'  :
      L.match(/^(📝|##\s*📝|##\s*Previous Year|PREVIOUS YEAR|PYQ|पिछले)/i)      ? 'pyq'    :
      L.match(/^(🔑|##\s*🔑|##\s*Master Revision|MASTER REVISION|रिवीज़न)/i)    ? 'chart'  :
      L.match(/^(💡|##\s*💡|##\s*Exam Trick|EXAM TRICK|परीक्षा ट्रिक)/i)        ? 'trick'  :
      null;

    if (isNewSection) {
      flushBuffer();
      section = isNewSection;
      // Add section heading
      if (isNewSection === 'answer') { html += secHead('✅', 'Correct Answer & Explanation', 'green'); }
      else if (isNewSection === 'facts') { html += secHead('📖', 'Key Facts Table', 'blue'); }
      else if (isNewSection === 'pyq')   { html += secHead('📝', 'Previous Year Questions (UP Exams)', 'orange'); }
      else if (isNewSection === 'chart') { html += secHead('🔑', 'Master Revision Chart', 'purple'); }
      else if (isNewSection === 'trick') { html += secHead('💡', 'Exam Trick', 'yellow'); }
    } else {
      buffer.push(line);
    }
  }
  flushBuffer();
  html += '</div>';
  return html;
}

function renderAnswerSection(text) {
  // Highlight correct answer and trap options
  let out = '<div class="at-answer-box">';
  const processedLines = text.split('\n').map(l => {
    // Bold the correct answer line
    if (l.match(/correct|सही|✅/i) && l.match(/\*\*|option|विकल्प/i)) {
      return `<div class="at-correct-tag">✅ Correct</div> ${l.replace(/\*\*/g,'').trim()}`;
    }
    // Highlight trap options
    if (l.match(/trap|⚠️|wrong|गलत|incorrect/i)) {
      return `<span class="at-trap-tag">⚠️ Trap Option</span> ${l.trim()}`;
    }
    return l;
  });
  out += processedLines.filter(l=>l.trim()).join('<br>');
  out += '</div>';
  return out;
}

function renderFactsSection(text) {
  const rows = text.split('\n').filter(l => l.trim() && !l.match(/^[-─=]+$/));
  // Check if looks like a table (has | separators)
  if (text.includes('|')) {
    let tbl = '<table class="at-facts-table"><tbody>';
    let headerDone = false;
    rows.forEach(row => {
      if (row.includes('|')) {
        const cells = row.split('|').map(c=>c.trim()).filter(Boolean);
        if (!headerDone && cells.length) {
          tbl += '<thead><tr>' + cells.map(c=>`<th>${c}</th>`).join('') + '</tr></thead><tbody>';
          headerDone = true;
          return;
        }
        if (cells.every(c=>c.match(/^[-:]+$/))) return; // skip separator row
        tbl += '<tr>' + cells.map(c=>`<td>${c}</td>`).join('') + '</tr>';
      }
    });
    tbl += '</tbody></table>';
    return tbl;
  }
  // Fallback: key: value list
  let tbl = '<table class="at-facts-table"><thead><tr><th>Topic</th><th>Details</th></tr></thead><tbody>';
  rows.forEach(row => {
    if (!row.trim()) return;
    const colon = row.indexOf(':');
    if (colon > 0) {
      const k = row.substring(0,colon).replace(/[*#-]/g,'').trim();
      const v = row.substring(colon+1).trim();
      if (k && v) tbl += `<tr><td><b>${k}</b></td><td>${v}</td></tr>`;
    } else {
      tbl += `<tr><td colspan="2">${row.replace(/[*#]/g,'')}</td></tr>`;
    }
  });
  tbl += '</tbody></table>';
  return tbl;
}

function renderPYQSection(text) {
  let out = '';
  const blocks = text.split(/\n(?=\d+\.|[-•]|\*\*)/);
  blocks.forEach(block => {
    block = block.trim();
    if (!block) return;
    // Extract exam tag if present
    const examMatch = block.match(/(UP Lekhpal|UPSSSC PET|UPSSSC VDO|UPPSC|UP RO|ARO|UP Police|UP SI|UP PCS)[^\n]*/i);
    const examLabel = examMatch ? examMatch[0] : '';
    // Extract answer if present
    const ansMatch = block.match(/Ans(?:wer)?[:\s]+([A-D][^\n]*)/i);
    const ansLabel = ansMatch ? ansMatch[1] : '';
    // Clean up block text
    let q = block.replace(/(UP Lekhpal|UPSSSC PET|UPSSSC VDO|UPPSC|UP RO|ARO|UP Police|UP SI|UP PCS)[^\n]*/gi,'')
                 .replace(/Ans(?:wer)?[:\s]+[A-D][^\n]*/gi,'')
                 .replace(/^\d+\.\s*/, '')
                 .replace(/\*\*/g,'')
                 .replace(/^[-•]\s*/,'')
                 .trim();
    out += `<div class="at-pyq-item">
      ${examLabel ? `<div class="at-pyq-exam-tag">📋 ${examLabel}</div>` : ''}
      ${ansLabel  ? `<div class="at-pyq-ans">✅ ${ansLabel}</div>` : ''}
      <div style="margin-top:${(examLabel||ansLabel)?'6':'0'}px">${q.replace(/\n/g,'<br>')}</div>
    </div>`;
  });
  return out || `<div class="at-pyq-item" style="color:rgba(148,163,184,0.7)">${text.replace(/\n/g,'<br>')}</div>`;
}

function renderChartSection(text) {
  const uid = 'chart_' + Date.now();
  return `<div class="at-code-box" id="${uid}">
    <button class="at-copy-btn" onclick="copyChart('${uid}')">📋 Copy</button>${escHTML(text)}
  </div>`;
}

function renderTrickSection(text) {
  return `<div class="at-trick-box">
    <div class="at-trick-label">💡 Memory Trick</div>
    ${text.replace(/\n/g,'<br>').replace(/\*\*/g,'').replace(/\*([^*]+)\*/g,'<b style="color:#fbbf24">$1</b>')}
  </div>`;
}

function copyChart(uid) {
  const el = document.getElementById(uid);
  const text = el.innerText.replace('📋 Copy','').trim();
  navigator.clipboard.writeText(text).then(() => {
    const btn = el.querySelector('.at-copy-btn');
    btn.textContent = '✅ Copied!';
    setTimeout(() => btn.textContent = '📋 Copy', 2000);
  });
}

function escHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Main API Call ──
async function askAITutor() {
  const question = document.getElementById('atQuestionInput').value.trim();
  if (!question) {
    document.getElementById('atQuestionInput').style.borderColor = 'rgba(220,38,38,0.5)';
    setTimeout(()=>document.getElementById('atQuestionInput').style.borderColor='rgba(124,58,237,0.25)',1500);
    return;
  }

  const btn   = document.getElementById('atAskBtn');
  const label = document.getElementById('atBtnLabel');
  const area  = document.getElementById('atResponseArea');

  btn.disabled = true;
  const engineLabel = typeof getEngineLabel === 'function' ? getEngineLabel() : '⚡ AI';
  label.textContent = 'Searching...';

  area.innerHTML = `
    <div class="at-thinking">
      <div class="at-thinking-dots"><span></span><span></span><span></span></div>
      <div class="at-thinking-text">🌐 ${engineLabel} analysis चल रहा है… कृपया प्रतीक्षा करें…</div>
    </div>`;

  const systemPrompt = `You are an expert AI Tutor specializing in UP State Government Exams: UP Lekhpal (UPSSSC), UPSSSC PET, UPSSSC VDO/Gram Vikas Adhikari, UPPSC/UP PCS, UP RO/ARO, UP Police/SI.

When given a question, always respond in this EXACT structured format:

✅ CORRECT ANSWER
State the correct option letter and full answer text. Explain WHY it is correct with facts, dates, data.
Then for each WRONG option, explain briefly why it is wrong. Clearly label TRAP OPTIONS with ⚠️.

📖 KEY FACTS TABLE
Create a markdown table with 2-3 columns covering the most important facts related to this topic. Include: Name | Detail | Extra Info (or similar relevant columns).

📝 PREVIOUS YEAR QUESTIONS
List 4-6 real or highly likely Previous Year Questions from these specific exams:
- UP Lekhpal (UPSSSC)
- UPSSSC PET
- UPSSSC VDO / Gram Vikas Adhikari
- UPPSC / UP PCS
- UP RO/ARO
- UP Police / SI
Format each as:
[Exam Name + Year if known]
Question text
Ans: [Option letter]. [Answer text]

🔑 MASTER REVISION CHART
Provide a compact text-based revision chart in a code/monospace format covering the key facts, dates, names related to this topic. Use ASCII formatting with alignment.

💡 EXAM TRICK
Give one powerful memory trick/mnemonic to remember the correct answer. Use wordplay, acronym, or story-method.

RULES:
- Always mention exam name with each PYQ
- Highlight ⚠️ trap options clearly
- Keep format consistent
- Use both Hindi and English where helpful
- Be accurate and exam-focused`;

  try {
    let fullText;
    // Try Claude with web_search first if API key is available
    const key = typeof getApiKey === 'function' ? getApiKey() : null;
    if (key) {
      const headers = { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{ role: 'user', content: question }]
        })
      });
      if (response.ok) {
        const data = await response.json();
        fullText = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      } else {
        throw new Error('Claude API failed');
      }
    } else {
      // Fallback to unified AI router (Groq/Pollinations/etc)
      fullText = await callAI(question, systemPrompt);
    }

    if (!fullText) throw new Error('AI से कोई response नहीं मिला। कृपया फिर प्रयास करें।');

    area.innerHTML = renderAIResponse(fullText);

  } catch (err) {
    // If Claude failed, try the multi-AI router
    try {
      const fallbackText = await callAI(question, systemPrompt);
      if (fallbackText) { area.innerHTML = renderAIResponse(fallbackText); return; }
    } catch(e2) {}
    area.innerHTML = `<div class="at-error">
      <b>⚠️ Error:</b> ${err.message}<br><br>
      <span style="font-size:12px;opacity:0.7">कृपया AI Engine (Groq/Pollinations) switch करें या internet connection जाँचें।</span>
    </div>`;
  } finally {
    btn.disabled = false;
    label.textContent = 'Ask AI Tutor';
  }
}

// Allow Enter key (Ctrl+Enter or Shift+Enter to submit)
document.getElementById('atQuestionInput').addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    askAITutor();
  }
});

// ── Open question in ChatGPT ──
function openInChatGPT() {
  const question = document.getElementById('atQuestionInput').value.trim();
  if (!question) {
    document.getElementById('atQuestionInput').style.borderColor = 'rgba(220,38,38,0.5)';
    document.getElementById('atQuestionInput').placeholder = '⚠️ पहले question डालें...';
    setTimeout(() => {
      document.getElementById('atQuestionInput').style.borderColor = 'rgba(124,58,237,0.25)';
      document.getElementById('atQuestionInput').placeholder = 'अपना प्रश्न यहाँ paste करें...';
    }, 1800);
    return;
  }

  const fullPrompt = `I am preparing for UP Lekhpal / UPSSSC exam. Here is my question:

${question}

Please provide:

✅ Correct Answer with explanation (why other options are wrong)
📖 Key Facts Table related to the topic
📝 Previous Year Questions from these UP exams specifically:
- UP Lekhpal (UPSSSC)
- UPSSSC PET
- UPSSSC VDO / Gram Vikas Adhikari
- UPPSC / UP PCS
- UP RO/ARO
- UP Police / SI

🔑 Master Revision Chart in code box format
💡 Exam Trick to remember the answer

⚠️ Rules:
- Mention exam name and year with each PYQ
- Highlight trap options clearly
- Keep format consistent throughout`;

  const encoded = encodeURIComponent(fullPrompt);
  const chatgptUrl = `https://chatgpt.com/?q=${encoded}`;
  window.open(chatgptUrl, '_blank');
}
  (function(){ const k=localStorage.getItem('upqz_api_key'); if(k) ANTHROPIC_API_KEY=k; })();
  /* Seed UID from localStorage so _lsk() works even before the Firebase
     IIFE runs (e.g. the payment-init block that runs immediately).       */
  window._upqzUID = localStorage.getItem('upqz_user_id') || null;

  /** Returns a user-namespaced localStorage key.
   *  e.g. _lsk('quizHistory') → 'u_1234567890_quizHistory'  */
  window._lsk = function(k) {
    var uid = window._upqzUID;
    return uid ? ('u_' + uid + '_' + k) : k;
  };
(function () {
  'use strict';

  /* ─── Firebase Config ─────────────────────────── */
  var FB_CFG = {
    apiKey:            "AIzaSyC-o6Z5C3svx6ncoc0eohsY2MW7pBxcxOI",
    authDomain:        "upgk-c3981.firebaseapp.com",
    databaseURL:       "https://upgk-c3981-default-rtdb.firebaseio.com",
    projectId:         "upgk-c3981",
    storageBucket:     "upgk-c3981.firebasestorage.app",
    messagingSenderId: "62592037300",
    appId:             "1:62592037300:web:0bc145de6ec03917b482e1"
  };

  /* ─── State ─────────────────────────────────── */
  var _db      = null;
  var _ready   = false;
  var _userId  = null;
  var _queue   = [];

  /* ─── SHA-256 Hash ───────────────────────────── */
  async function sha256(str) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
  }

  /* ─── Badge helper ───────────────────────────── */
  function badge(msg, color, stay) {
    var el = document.getElementById('fbSyncBadge');
    if (!el) return;
    el.textContent = msg;
    el.style.background = color;
    el.style.opacity = '1';
    el.style.display = 'flex';
    if (!stay) {
      setTimeout(function () {
        el.style.opacity = '0';
        setTimeout(function () { el.style.display = 'none'; }, 600);
      }, 3500);
    }
  }

  /* ─── Update navbar button ───────────────────── */
  function updateNavBtn() {
    var btn = document.getElementById('fbNavBtn');
    if (!btn) return;
    if (_userId) {
      btn.innerHTML = '🟢 ID: ' + _userId;
      btn.style.background = 'linear-gradient(135deg,#059669,#047857)';
      btn.onclick = window.openFbAccount;
    } else {
      btn.innerHTML = '🔥 Login / Sync';
      btn.style.background = 'linear-gradient(135deg,#6366f1,#0891b2)';
      btn.onclick = window.openFbAuth;
    }
  }

  /* ─── Write / Delete ─────────────────────────── */
  function fbWrite(path, value) {
    if (!_ready || !_userId) { _queue.push({ op:'set', path:path, value:value }); return; }
    _db.ref('users/' + _userId + '/data/' + path).set(value)
       .catch(function(e){ console.warn('[FB] write err:', e.message); });
  }
  function fbDel(path) {
    if (!_ready || !_userId) { _queue.push({ op:'del', path:path }); return; }
    _db.ref('users/' + _userId + '/data/' + path).remove()
       .catch(function(e){ console.warn('[FB] del err:', e.message); });
  }
  function flushQueue() {
    var item;
    while (_queue.length) {
      item = _queue.shift();
      if (item.op === 'set') fbWrite(item.path, item.value);
      else fbDel(item.path);
    }
  }

  /* ─── Expose DB for license key engine ─────────── */
  window._upqzGetDB = function() { return _db; };

  /* ─── Load remote data → localStorage ─────────── */
  function mergeRemoteData(data) {
    /* Quiz History */
    if (Array.isArray(data.quizHistory)) {
      try {
        var local = JSON.parse(localStorage.getItem(_lsk('quizHistory')) || '[]');
        var merged = data.quizHistory.slice();
        local.forEach(function(lh) {
          if (!merged.some(function(fh){ return fh.date === lh.date && fh.name === lh.name; }))
            merged.push(lh);
        });
        merged.sort(function(a,b){ return new Date(a.date)-new Date(b.date); });
        localStorage.setItem(_lsk('quizHistory'), JSON.stringify(merged.slice(-100)));
      } catch(e){}
    }
    /* Bookmarks */
    if (Array.isArray(data.bookmarks)) {
      try {
        var localBm = JSON.parse(localStorage.getItem(_lsk('upqz_bookmarks')) || '[]');
        var bmSet = new Set(localBm.map(function(b){ return b.q; }));
        data.bookmarks.forEach(function(b){ if (!bmSet.has(b.q)) localBm.push(b); });
        localStorage.setItem(_lsk('upqz_bookmarks'), JSON.stringify(localBm));
      } catch(e){}
    }
    /* Wrong Questions */
    if (Array.isArray(data.wrongQuestions)) {
      try {
        var localWq = JSON.parse(localStorage.getItem(_lsk('upqz_wrong_questions')) || '[]');
        var wqSet = new Set(localWq.map(function(w){ return w.q; }));
        data.wrongQuestions.forEach(function(w){ if (!wqSet.has(w.q)) localWq.push(w); });
        localStorage.setItem(_lsk('upqz_wrong_questions'), JSON.stringify(localWq.slice(-200)));
      } catch(e){}
    }
    /* Chapter Progress */
    if (data.usedChapters) {
      Object.keys(data.usedChapters).forEach(function(key) {
        var val = data.usedChapters[key];
        if (!Array.isArray(val)) return;
        try {
          var localKey = _lsk(key);
          var localArr = JSON.parse(localStorage.getItem(localKey) || '[]');
          val.forEach(function(v){ if (localArr.indexOf(v) === -1) localArr.push(v); });
          localStorage.setItem(localKey, JSON.stringify(localArr));
        } catch(e){}
      });
    }
    /* Verify paid status from Firebase */
    try { if (typeof window._upqzVerifyPaidOnLogin === 'function') window._upqzVerifyPaidOnLogin(_db, _userId); } catch(e){}
    /* Refresh UI */
    try { if (typeof loadHomeStats === 'function') loadHomeStats(); } catch(e){}
    try { if (typeof updateHomeBookmarkBtn === 'function') updateHomeBookmarkBtn(); } catch(e){}
    try { if (typeof updateHomeWrongBtn === 'function') updateHomeWrongBtn(); } catch(e){}
  }

  /* ─── After login: load user data ─────────────── */
  function loadUserData(userId, cb) {
    badge('🔄 Loading your data…', '#7c3aed', true);
    _db.ref('users/' + userId + '/data').get().then(function(snap) {
      if (snap.exists()) mergeRemoteData(snap.val());
      badge('🟢 All data loaded!', '#059669');
      if (cb) cb(null);
    }).catch(function(e) {
      badge('⚠️ Loaded (partial)', '#ea580c');
      if (cb) cb(e);
    });
  }

  /* ─── Init Firebase DB ───────────────────────── */
  function initDB(cb) {
    try {
      var apps = firebase.apps.slice();
      function doInit() {
        firebase.initializeApp(FB_CFG);
        _db = firebase.database();
        _ready = true;
        if (cb) cb();
      }
      if (apps.length) {
        Promise.all(apps.map(function(a){ return a.delete().catch(function(){}); }))
          .then(doInit).catch(function(){ doInit(); });
      } else {
        doInit();
      }
    } catch(e) {
      console.warn('[FB] initDB error:', e.message);
    }
  }

  /* ═══ PUBLIC API ════════════════════════════════ */

  window._fbSyncHistory = function() {
    try { fbWrite('quizHistory', JSON.parse(localStorage.getItem(_lsk('quizHistory'))||'[]')); } catch(e){}
  };
  window._fbSyncBookmarks = function() {
    try { fbWrite('bookmarks', JSON.parse(localStorage.getItem(_lsk('upqz_bookmarks'))||'[]')); } catch(e){}
  };
  window._fbSyncWrongQs = function() {
    try { fbWrite('wrongQuestions', JSON.parse(localStorage.getItem(_lsk('upqz_wrong_questions'))||'[]')); } catch(e){}
  };
  window._fbClearHistory = function() { fbDel('quizHistory'); };
  window._fbSyncUsedCh = function(key) {
    try { fbWrite('usedChapters/' + key, JSON.parse(localStorage.getItem(_lsk(key))||'[]')); } catch(e){}
  };
  window._fbRemoveUsedCh = function(key) { fbDel('usedChapters/' + key); };

  window.fbForceSyncAll = function() {
    if (!_userId) return;
    window._fbSyncHistory();
    window._fbSyncBookmarks();
    window._fbSyncWrongQs();
    /* sync all chapter keys */
    for (var i = 1; i <= 30; i++) {
      var k = 'upqz_used_ch' + i;
      if (localStorage.getItem(_lsk(k))) window._fbSyncUsedCh(k);
    }
    badge('🟢 All data synced!', '#059669');
    updateAccStats();
  };

  /* ─── Auth Tab Switch ────────────────────────── */
  window.fbAuthTab = function(tab) {
    var isLogin = tab === 'login';
    document.getElementById('authLoginPanel').style.display  = isLogin ? '' : 'none';
    document.getElementById('authSignupPanel').style.display = isLogin ? 'none' : '';
    document.getElementById('tabLoginBtn').style.background  = isLogin ? 'linear-gradient(135deg,#6366f1,#0891b2)' : 'transparent';
    document.getElementById('tabLoginBtn').style.color       = isLogin ? 'white' : '#94a3b8';
    document.getElementById('tabSignupBtn').style.background = isLogin ? 'transparent' : 'linear-gradient(135deg,#059669,#0891b2)';
    document.getElementById('tabSignupBtn').style.color      = isLogin ? '#94a3b8' : 'white';
  };

  window.openFbAuth = function() {
    document.getElementById('fbAuthOverlay').style.display = 'flex';
  };

  window.fbAuthSkip = function() {
    /* User chose to skip login — treat as guest: no paid access */
    window._upqzUID = null;
    window._UPQZ_PAID = false;
    window._UPQZ_PAID_UNTIL = null;
    document.getElementById('fbAuthOverlay').style.display = 'none';
    /* Refresh lock UI so chapters reflect free/locked state */
    if (typeof window._upqzRefreshChapterLock === 'function') window._upqzRefreshChapterLock();
  };

  /* ─── SIGNUP ─────────────────────────────────── */
  window.fbDoSignup = async function() {
    var idVal   = document.getElementById('signupIdInput').value.trim();
    var pass    = document.getElementById('signupPassInput').value;
    var pass2   = document.getElementById('signupPass2Input').value;
    var errEl   = document.getElementById('signupErr');
    function showErr(msg){ errEl.textContent = msg; errEl.style.display = 'block'; }
    errEl.style.display = 'none';

    if (!/^\d{10}$/.test(idVal)) return showErr('❌ ID must be exactly 10 digits.');
    if (pass.length < 6)         return showErr('❌ Password must be at least 6 characters.');
    if (pass !== pass2)          return showErr('❌ Passwords do not match.');

    var btn = document.getElementById('signupBtn');
    btn.textContent = '⏳ Creating...'; btn.disabled = true;

    initDB(async function() {
      try {
        var existing = await _db.ref('users/' + idVal + '/meta').get();
        if (existing.exists()) {
          btn.textContent = '✨ Create Account'; btn.disabled = false;
          return showErr('❌ ID already taken. Choose a different number.');
        }
        var hash = await sha256(idVal + ':' + pass);
        await _db.ref('users/' + idVal + '/meta').set({ passwordHash: hash, createdAt: new Date().toISOString() });

        /* Login immediately */
        _userId = idVal;
        window._upqzUID = idVal;
        localStorage.setItem('upqz_user_id', idVal);
        flushQueue();

        /* Push any existing local data */
        window.fbForceSyncAll();

        document.getElementById('fbAuthOverlay').style.display = 'none';
        updateNavBtn();
        badge('🟢 Account created & synced!', '#059669');
        btn.textContent = '✨ Create Account'; btn.disabled = false;
      } catch(e) {
        btn.textContent = '✨ Create Account'; btn.disabled = false;
        showErr('❌ Error: ' + e.message);
      }
    });
  };

  /* ─── LOGIN ──────────────────────────────────── */
  window.fbDoLogin = async function() {
    var idVal = document.getElementById('loginIdInput').value.trim();
    var pass  = document.getElementById('loginPassInput').value;
    var errEl = document.getElementById('loginErr');
    function showErr(msg){ errEl.textContent = msg; errEl.style.display = 'block'; }
    errEl.style.display = 'none';

    if (!/^\d{10}$/.test(idVal)) return showErr('❌ Enter a valid 10-digit ID.');
    if (!pass)                   return showErr('❌ Enter your password.');

    var btn = document.getElementById('loginBtn');
    btn.textContent = '⏳ Logging in...'; btn.disabled = true;

    initDB(async function() {
      try {
        var snap = await _db.ref('users/' + idVal + '/meta').get();
        if (!snap.exists()) {
          btn.textContent = '🔑 Login & Sync Data'; btn.disabled = false;
          return showErr('❌ ID not found. Create an account first.');
        }
        var meta = snap.val();
        var hash = await sha256(idVal + ':' + pass);
        if (hash !== meta.passwordHash) {
          btn.textContent = '🔑 Login & Sync Data'; btn.disabled = false;
          return showErr('❌ Wrong password. Try again.');
        }

        /* Logged in */
        _userId = idVal;
        window._upqzUID = idVal;
        localStorage.setItem('upqz_user_id', idVal);
        flushQueue();

        loadUserData(idVal, function() {
          document.getElementById('fbAuthOverlay').style.display = 'none';
          updateNavBtn();
          btn.textContent = '🔑 Login & Sync Data'; btn.disabled = false;
        });
      } catch(e) {
        btn.textContent = '🔑 Login & Sync Data'; btn.disabled = false;
        showErr('❌ Error: ' + e.message);
      }
    });
  };

  /* ─── LOGOUT ─────────────────────────────────── */
  window.fbDoLogout = function() {
    if (!confirm('Logout? Your local data stays on this device.')) return;
    _userId = null; _ready = false; _db = null; _queue = [];
    window._upqzUID = null;
    window._UPQZ_PAID = false;
    window._UPQZ_PAID_UNTIL = null;
    localStorage.removeItem('upqz_user_id');
    document.getElementById('fbAccountOverlay').style.display = 'none';
    updateNavBtn();
    badge('👋 Logged out', '#6366f1');
  };

  /* ─── ACCOUNT PANEL ──────────────────────────── */
  function updateAccStats() {
    var h  = JSON.parse(localStorage.getItem(_lsk('quizHistory')) || '[]').length;
    var bm = JSON.parse(localStorage.getItem(_lsk('upqz_bookmarks')) || '[]').length;
    var wq = JSON.parse(localStorage.getItem(_lsk('upqz_wrong_questions')) || '[]').length;
    var el = document.getElementById('fbAccStats');
    if (el) el.innerHTML =
      '📊 Quiz History: <b style="color:#6ee7b7">' + h + ' attempts</b><br>' +
      '🔖 Bookmarks: <b style="color:#6ee7b7">' + bm + ' questions</b><br>' +
      '❌ Wrong Questions: <b style="color:#6ee7b7">' + wq + ' questions</b>';
  }

  window.openFbAccount = function() {
    document.getElementById('fbAccIdDisplay').textContent = _userId || '—';
    document.getElementById('fbAccStatusLine').textContent = (_ready && _userId) ? '🟢 Connected & syncing' : '🔴 Not connected';
    updateAccStats();
    /* Update subscription status */
    var isPaid = window._upqzIsPaid ? window._upqzIsPaid() : false;
    var subStatus = document.getElementById('accSubStatus');
    var keySection = document.getElementById('accKeySection');
    var until = window._UPQZ_PAID_UNTIL || localStorage.getItem(_lsk('upqz_paid_until'));
    if (subStatus) {
      if (isPaid && until) {
        var d = new Date(until);
        subStatus.innerHTML = '⭐ <span style="color:#10b981">PREMIUM</span> — Valid till <b style="color:#fbbf24">' + d.toLocaleDateString('en-IN') + '</b>';
        if (keySection) keySection.style.display = 'none';
      } else {
        subStatus.innerHTML = '🔒 <span style="color:#ef4444">FREE</span> — Only Chapter 1 available';
        if (keySection) keySection.style.display = 'block';
      }
    }
    document.getElementById('fbAccountOverlay').style.display = 'flex';
    /* Auto-check Firebase status when account panel opens */
    if (_userId) setTimeout(function(){ window.checkPaymentStatus && window.checkPaymentStatus(); }, 300);
  };

  window.fbCopyId = function() {
    if (!_userId) return;
    navigator.clipboard.writeText(_userId).then(function() {
      badge('📋 ID copied!', '#059669');
    }).catch(function() {
      prompt('Your ID:', _userId);
    });
  };

  /* ─── Nav Button inject ──────────────────────── */
  function injectNavBtn() {
    if (document.getElementById('fbNavBtn')) return;
    var btn = document.createElement('button');
    btn.id = 'fbNavBtn';
    btn.style.cssText =
      'border:none;border-radius:10px;padding:7px 13px;font-size:11px;font-weight:700;' +
      'cursor:pointer;display:inline-flex;align-items:center;gap:5px;' +
      'font-family:Inter,sans-serif;box-shadow:0 4px 14px rgba(99,102,241,0.35);' +
      'transition:all 0.2s;color:white;';
    btn.onmouseenter = function() { btn.style.transform = 'translateY(-2px)'; };
    btn.onmouseleave = function() { btn.style.transform = ''; };
    var ref = document.querySelector('[onclick*="ApiKey"],[onclick*="apiKey"]');
    if (ref && ref.parentElement) {
      ref.parentElement.insertBefore(btn, ref.nextSibling);
    } else {
      btn.style.cssText += 'position:fixed;top:16px;right:68px;z-index:9997;';
      document.body.appendChild(btn);
    }
    updateNavBtn();
  }

  /* ─── Auto-login if saved ─────────────────────── */
  function boot() {
    var savedId = localStorage.getItem('upqz_user_id');
    if (savedId) {
      _userId = savedId;
      window._upqzUID = savedId;
      initDB(function() {
        loadUserData(savedId, function() {
          _ready = true;
          flushQueue();
          updateNavBtn();
        });
      });
    } else {
      /* Show login overlay after short delay */
      setTimeout(function() {
        document.getElementById('fbAuthOverlay').style.display = 'flex';
      }, 1200);
      /* Still init DB for when user logs in */
      initDB(function() { _ready = true; });
    }
  }

  /* ─── Boot ───────────────────────────────────── */
  boot();
  setTimeout(injectNavBtn, 900);

  /* expose for old config overlay ref */
  window.openFbConfig = window.openFbAccount;

})();
(function(){
  'use strict';

  /* ── Paid status check (reads from localStorage cache, verified on login) ── */
  /* ── Single source of truth: global variable ── */
  window._UPQZ_PAID = false;
  window._UPQZ_PAID_UNTIL = null;

  /* Initialize from localStorage on load */
  (function() {
    var paid  = localStorage.getItem(_lsk('upqz_is_paid'));
    var until = localStorage.getItem(_lsk('upqz_paid_until'));
    if (paid === 'true' && until && new Date() < new Date(until)) {
      window._UPQZ_PAID = true;
      window._UPQZ_PAID_UNTIL = until;
    }
  })();

  /* ── COURSE ID for this quiz app ── */
  var QUIZ_COURSE_ID = 'upGK';

  /* ── Per-topic access cache ── */
  window._UPQZ_TOPIC_ACCESS = {};

  /* ── Check if a specific topic is unlocked ── */
  window._upqzIsTopicUnlocked = function(courseId) {
    if (!window._upqzUID) return false;
    /* Global paid = access to everything */
    if (window._upqzIsPaid()) return true;
    var t = window._UPQZ_TOPIC_ACCESS[courseId];
    if (!t || !t.unlocked) return false;
    /* Check expiry */
    if (!t.expiry) return true; /* permanent */
    return new Date() < new Date(t.expiry);
  };

  /* ── Set paid status — single function that updates everything ── */
  window._upqzSetPaid = function(isPaid, paidUntil) {
    window._UPQZ_PAID = isPaid;
    window._UPQZ_PAID_UNTIL = paidUntil || null;
    /* Sync to localStorage */
    localStorage.setItem(_lsk('upqz_is_paid'), isPaid ? 'true' : 'false');
    if (isPaid && paidUntil) {
      localStorage.setItem(_lsk('upqz_paid_until'), paidUntil);
    } else {
      localStorage.removeItem(_lsk('upqz_paid_until'));
    }
    /* Immediately refresh UI */
    window._upqzRefreshChapterLock();
  };

  /* ── Set topic-level access ── */
  window._upqzSetTopicAccess = function(topicsObj) {
    window._UPQZ_TOPIC_ACCESS = topicsObj || {};
    /* Cache in localStorage */
    try { localStorage.setItem(_lsk('upqz_topic_access'), JSON.stringify(window._UPQZ_TOPIC_ACCESS)); } catch(e){}
    window._upqzRefreshChapterLock();
  };

  /* ── Restore topic access from localStorage on boot ── */
  (function(){
    try {
      var ta = localStorage.getItem(_lsk('upqz_topic_access'));
      if (ta) window._UPQZ_TOPIC_ACCESS = JSON.parse(ta);
    } catch(e){}
  })();

  window._upqzIsPaid = function() {
    /* Must be logged in — paid status without a user is meaningless */
    if (!window._upqzUID) return false;
    if (!window._UPQZ_PAID) return false;
    if (!window._UPQZ_PAID_UNTIL) return false;
    return new Date() < new Date(window._UPQZ_PAID_UNTIL);
  };

  /* ── Refresh all lock UI — single call updates everything ── */
  window._upqzRefreshChapterLock = function() {
    /* Update dropdown */
    if (typeof injectChapterCounts === 'function') injectChapterCounts();
    /* Update paid badge in navbar */
    var isPaid = window._upqzIsPaid() || window._upqzIsTopicUnlocked(QUIZ_COURSE_ID);
    var badge = document.getElementById('paidBadge');
    if (isPaid && !badge) {
      try {
        var b = document.createElement('span');
        b.id = 'paidBadge';
        b.textContent = '⭐ PREMIUM';
        b.style.cssText = 'background:linear-gradient(135deg,#f59e0b,#d97706);color:white;' +
          'border-radius:8px;padding:4px 10px;font-size:10px;font-weight:800;' +
          'font-family:Inter,sans-serif;letter-spacing:0.5px;margin-right:6px;';
        var ref = document.getElementById('fbNavBtn');
        if (ref && ref.parentElement) ref.parentElement.insertBefore(b, ref);
      } catch(ex){}
    }
    if (!isPaid && badge) badge.remove();
  };

  /* ── On login: verify isPaid + topic access from Firebase ── */
  window._upqzVerifyPaidOnLogin = async function(db, userId) {
    try {
      var snap = await db.ref('users/' + userId + '/meta').get();
      if (!snap.exists()) { window._upqzSetPaid(false, null); return; }
      var meta = snap.val();
      if (meta.cancelled) { window._upqzSetPaid(false, null); return; }

      /* Global paid check */
      if (meta.isPaid && meta.paidUntil) {
        var valid = new Date() < new Date(meta.paidUntil);
        window._upqzSetPaid(valid, valid ? meta.paidUntil : null);
      } else {
        window._upqzSetPaid(false, null);
      }

      /* Per-topic access */
      if (meta.topics) {
        window._upqzSetTopicAccess(meta.topics);
      }

      /* Also load course config (price etc) for payment popup */
      try {
        var cSnap = await db.ref('config/courses/' + QUIZ_COURSE_ID).get();
        if (cSnap.exists()) {
          var cfg = cSnap.val();
          window._UPQZ_COURSE_CFG = cfg;
          /* Update UPI amount dynamically */
          if (cfg.price) window.UPI_AMT = String(cfg.price);
        }
        var bSnap = await db.ref('config/bundle').get();
        if (bSnap.exists()) window._UPQZ_BUNDLE_CFG = bSnap.val();

        /* ── Auto-register courses to Firebase so admin auto-detects ── */
        try { _upqzAutoRegisterCourses(); } catch(re) { console.warn('course reg:', re); }
      } catch(ce) {}

    } catch(e) { console.warn('[PAID] verify error:', e); }
  };

  /* ── Auto-register all quiz courses into Firebase config/courses ── */
  async function _upqzAutoRegisterCourses() {
    if (!db) return;
    var snap = await db.ref('config/courses').get();
    var existing = snap.exists() ? snap.val() : {};
    var updates = {};
    var now = new Date().toISOString().slice(0,10);

    /* upGK course — always update chapter info */
    if (!existing.upGK) {
      updates['config/courses/upGK'] = {
        id:'upGK', name:'UP GK Mock Test Series', emoji:'🗺️',
        price:49, trialDays:3, active:true,
        chapters:'1-19', totalQuestions: (typeof QUESTIONS !== 'undefined' ? QUESTIONS.length : 0),
        registeredAt: now
      };
    } else {
      /* Update question count silently */
      updates['config/courses/upGK/totalQuestions'] = (typeof QUESTIONS !== 'undefined' ? QUESTIONS.length : 0);
    }

    /* current affairs course */
    if (!existing.current) {
      updates['config/courses/current'] = {
        id:'current', name:'Current Affairs 2024-25', emoji:'📰',
        price:39, trialDays:3, active:true,
        chapters:'6 Topics', totalQuestions: (typeof CA_QUESTIONS !== 'undefined' ? CA_QUESTIONS.length : 0),
        registeredAt: now
      };
    } else {
      updates['config/courses/current/active'] = true;
      updates['config/courses/current/totalQuestions'] = (typeof CA_QUESTIONS !== 'undefined' ? CA_QUESTIONS.length : 0);
    }

    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
    }
  }

  /* ── UPI config (change these if needed) ── */
  var UPI_ID   = '9454084629@ybl';
  var UPI_NAME = 'ExamZen';
  var UPI_AMT  = '49';

  /* ── Active realtime listener handle ── */
  var _payReqListener = null;

  /* ── Step navigator ── */
  window.upqzPayStep = function(n) {
    [1,2,3].forEach(function(i){
      var el = document.getElementById('payStep'+i);
      if (el) el.style.display = (i===n) ? '' : 'none';
      var dot = document.getElementById('pstep'+i+'dot');
      if (dot) {
        if (i < n) {
          dot.style.background = 'linear-gradient(135deg,#10b981,#059669)';
          dot.style.color = '#fff';
          dot.textContent = '✓';
        } else if (i === n) {
          dot.style.background = 'linear-gradient(135deg,#f59e0b,#d97706)';
          dot.style.color = '#000';
          dot.textContent = String(i);
        } else {
          dot.style.background = 'rgba(255,255,255,0.08)';
          dot.style.color = '#64748b';
          dot.textContent = String(i);
        }
      }
    });
  };

  /* ── Copy UPI ID ── */
  window.upqzCopyUpi = function() {
    try {
      navigator.clipboard.writeText(UPI_ID);
      if (typeof toast === 'function') toast('📋 UPI ID copied: ' + UPI_ID, 'success');
    } catch(e) {
      /* fallback */
      var ta = document.createElement('textarea');
      ta.value = UPI_ID;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      if (typeof toast === 'function') toast('📋 UPI ID copied!', 'success');
    }
  };

  /* ── Generate QR into #payQrCode ── */
  function _loadPayQR() {
    var wrap = document.getElementById('payQrCode');
    if (!wrap) return;
    var upiStr = 'upi://pay?pa=' + UPI_ID + '&pn=' + encodeURIComponent(UPI_NAME) +
                 '&am=' + UPI_AMT + '&cu=INR&tn=ExamZen_Premium';
    var qrUrl  = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' +
                 encodeURIComponent(upiStr);
    var img = document.createElement('img');
    img.src = qrUrl;
    img.alt = 'UPI QR';
    img.style.cssText = 'width:150px;height:150px;border-radius:8px;display:block';
    img.onerror = function() { wrap.textContent = 'QR load failed — UPI ID use करें'; };
    wrap.innerHTML = '';
    wrap.appendChild(img);
  }

  /* ── Submit UTR to Firebase ── */
  window.upqzSubmitUTR = async function() {
    var utr    = (document.getElementById('utrInput').value || '').trim().toUpperCase();
    var userId = localStorage.getItem('upqz_user_id');
    var msgEl  = document.getElementById('utrMsg');
    var btn    = document.getElementById('utrSubmitBtn');

    function showMsg(txt, ok) {
      msgEl.textContent = txt;
      msgEl.style.background = ok
        ? 'rgba(5,150,105,0.12)' : 'rgba(220,38,38,0.1)';
      msgEl.style.color  = ok ? '#6ee7b7' : '#fca5a5';
      msgEl.style.border = ok
        ? '1px solid rgba(5,150,105,0.3)' : '1px solid rgba(220,38,38,0.25)';
      msgEl.style.display = 'block';
    }

    if (!userId)       return showMsg('❌ पहले Login करें।', false);
    if (utr.length < 6) return showMsg('❌ Valid UTR / Transaction ID enter करें।', false);

    var db = window._upqzGetDB ? window._upqzGetDB() : null;
    if (!db) return showMsg('❌ Firebase connect नहीं हुई। फिर try करें।', false);

    btn.textContent = '⏳ Submitting...'; btn.disabled = true;

    try {
      /* Check if already approved */
      var metaSnap = await db.ref('users/' + userId + '/meta').get();
      if (metaSnap.exists()) {
        var meta = metaSnap.val();
        if (meta.isPaid && meta.paidUntil && new Date() < new Date(meta.paidUntil)) {
          window._upqzSetPaid(true, meta.paidUntil);
          document.getElementById('paymentPopup').style.display = 'none';
          if (typeof toast === 'function') toast('🎉 Already Premium! सब unlock है।', 'success');
          return;
        }
      }

      /* Save payment request */
      await db.ref('paymentRequests/' + userId).set({
        userId:      userId,
        utr:         utr,
        amount:      parseInt(UPI_AMT),
        upiId:       UPI_ID,
        submittedAt: new Date().toISOString(),
        status:      'pending'
      });

      showMsg('✅ UTR submit हो गया! Admin जल्द verify करेगा।', true);
      btn.textContent = '✅ Submitted';

      /* Move to step 3 */
      setTimeout(function() { window.upqzPayStep(3); }, 800);

      /* Start realtime listener for auto-unlock */
      _startPayListener(db, userId);

    } catch(e) {
      btn.textContent = '📤 Submit UTR — Verify करें';
      btn.disabled = false;
      showMsg('❌ Error: ' + e.message, false);
    }
  };

  /* ── Realtime listener: auto-unlock when admin approves ── */
  function _startPayListener(db, userId) {
    if (_payReqListener) return; /* already running */
    var ref = db.ref('paymentRequests/' + userId + '/status');
    _payReqListener = ref;
    ref.on('value', function(snap) {
      if (!snap.exists()) return;
      var status = snap.val();
      if (status === 'approved') {
        ref.off('value');
        _payReqListener = null;
        /* Get paidUntil from meta */
        db.ref('users/' + userId + '/meta').get().then(function(ms) {
          var until = ms.exists() && ms.val().paidUntil ? ms.val().paidUntil : null;
          if (!until) {
            var exp = new Date(); exp.setDate(exp.getDate() + 60);
            until = exp.toISOString();
          }
          window._upqzSetPaid(true, until);
          document.getElementById('paymentPopup').style.display = 'none';
          /* Show celebration */
          var s3icon  = document.getElementById('payStep3Icon');
          var s3title = document.getElementById('payStep3Title');
          var s3msg   = document.getElementById('payStep3Msg');
          var badge   = document.getElementById('payPendingBadge');
          if (s3icon)  s3icon.textContent  = '🎉';
          if (s3title) s3title.textContent  = 'Approved! Unlocked!';
          if (s3msg)   s3msg.innerHTML      = 'सभी 19 chapters unlock हो गए!<br>Premium valid till <b style="color:#fbbf24">' +
                                              new Date(until).toLocaleDateString('hi-IN') + '</b>';
          if (badge) { badge.style.background='rgba(16,185,129,0.1)'; badge.style.borderColor='rgba(16,185,129,0.3)';
                       badge.style.color='#6ee7b7'; badge.innerHTML='✅ Payment Approved!'; }
          if (typeof toast === 'function') toast('🎉 Payment approved! सब unlock!', 'success');
        });
      } else if (status === 'rejected') {
        ref.off('value');
        _payReqListener = null;
        var s3icon  = document.getElementById('payStep3Icon');
        var s3title = document.getElementById('payStep3Title');
        var s3msg   = document.getElementById('payStep3Msg');
        var badge   = document.getElementById('payPendingBadge');
        if (s3icon)  s3icon.textContent  = '❌';
        if (s3title) s3title.textContent  = 'Rejected';
        if (s3msg)   s3msg.innerHTML      = 'UTR verify नहीं हुआ।<br>Correct UTR के साथ फिर try करें।';
        if (badge) { badge.style.background='rgba(220,38,38,0.1)'; badge.style.borderColor='rgba(220,38,38,0.25)';
                     badge.style.color='#fca5a5'; badge.textContent='❌ Rejected — फिर try करें'; }
        /* Go back to step 2 so they can resubmit */
        setTimeout(function() {
          window.upqzPayStep(2);
          var utrMsg = document.getElementById('utrMsg');
          if (utrMsg) { utrMsg.textContent='❌ UTR reject हुआ। Correct UTR enter करके फिर submit करें।';
                        utrMsg.style.background='rgba(220,38,38,0.1)';
                        utrMsg.style.color='#fca5a5';
                        utrMsg.style.border='1px solid rgba(220,38,38,0.25)';
                        utrMsg.style.display='block'; }
        }, 2500);
      }
    });
  }

  /* ── Open payment popup ── */
  window.openPaymentPopup = function() {
    var userId = localStorage.getItem('upqz_user_id') || '';
    var loginWarn  = document.getElementById('payLoginWarn');
    var paySteps   = document.getElementById('paySteps');
    var keySection = document.getElementById('payKeySection');

    /* Update price display from course config */
    try {
      var cfg = window._UPQZ_COURSE_CFG;
      var price = (cfg && cfg.price) ? cfg.price : 49;
      UPI_AMT = String(price);
      var priceEl = document.getElementById('payDisplayPrice');
      var descEl  = document.getElementById('payDisplayDesc');
      var lblEl   = document.getElementById('payUpiAmtLabel');
      if (priceEl) priceEl.textContent = '₹' + price;
      if (descEl)  descEl.innerHTML = (cfg && cfg.name ? cfg.name : 'Full access') + ' · <b style="color:#fbbf24">2 months</b>';
      if (lblEl)   lblEl.textContent = 'इस UPI ID पर ₹' + price + ' भेजें';
    } catch(pe){}

    if (!userId) {
      /* Not logged in — show login warning only */
      if (loginWarn)  loginWarn.style.display  = 'flex';
      if (paySteps)   paySteps.style.display   = 'none';
      if (keySection) keySection.style.display = 'none';
    } else {
      if (loginWarn)  loginWarn.style.display  = 'none';
      if (paySteps)   paySteps.style.display   = '';
      if (keySection) keySection.style.display = '';
      /* Reset key input errors */
      var ke = document.getElementById('keyErr');
      var ks = document.getElementById('keySuccess');
      if (ke) ke.style.display = 'none';
      if (ks) ks.style.display = 'none';
      /* Load QR */
      _loadPayQR();
      /* Check if pending request already exists → jump to step 3 */
      var db = window._upqzGetDB ? window._upqzGetDB() : null;
      if (db) {
        db.ref('paymentRequests/' + userId).get().then(function(snap) {
          if (snap.exists()) {
            var pr = snap.val();
            if (pr.status === 'pending') {
              window.upqzPayStep(3);
              _startPayListener(db, userId);
              return;
            }
          }
          /* Default: step 1 */
          window.upqzPayStep(1);
        }).catch(function() { window.upqzPayStep(1); });
      } else {
        window.upqzPayStep(1);
      }
      /* Auto-check Firebase status silently */
      setTimeout(checkPaymentStatus, 400);
    }
    document.getElementById('paymentPopup').style.display = 'flex';
  };

  /* ── Activate License Key ── */
  window.activateLicenseKey = async function() {
    var key    = (document.getElementById('licenseKeyInput').value || '').trim().toUpperCase();
    var userId = localStorage.getItem('upqz_user_id');
    var errEl  = document.getElementById('keyErr');
    var okEl   = document.getElementById('keySuccess');
    var btn    = document.getElementById('activateBtn');

    function showErr(msg) { errEl.textContent = msg; errEl.style.display = 'block'; okEl.style.display = 'none'; }
    function showOk(msg)  { okEl.textContent  = msg; okEl.style.display  = 'block'; errEl.style.display = 'none'; }

    errEl.style.display = 'none'; okEl.style.display = 'none';

    if (!userId) return showErr('❌ पहले Login करें।');
    if (!/^UPGK-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) return showErr('❌ Invalid key format. Example: UPGK-AB12-CD34');

    btn.textContent = '⏳ Verifying...'; btn.disabled = true;
    try {
      /* Get Firebase DB reference (exposed by login engine) */
      var db = window._upqzGetDB ? window._upqzGetDB() : null;
      if (!db) { btn.textContent = '🔑 Activate Key'; btn.disabled = false; return showErr('❌ Not connected to Firebase. Please login first.'); }

      /* Check key in Firebase */
      var keySnap = await db.ref('keys/' + key).get();
      if (!keySnap.exists()) {
        btn.textContent = '🔑 Activate Key'; btn.disabled = false;
        return showErr('❌ Invalid key. Check and try again.');
      }
      var keyData = keySnap.val();
      if (keyData.revoked) {
        btn.textContent = '🔑 Activate Key'; btn.disabled = false;
        return showErr('❌ यह key revoke हो चुकी है। नई key लें।');
      }
      if (keyData.used) {
        btn.textContent = '🔑 Activate Key'; btn.disabled = false;
        return showErr('❌ यह key already use हो चुकी है।');
      }

      /* Mark key as used */
      var now = new Date();
      var expiry = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); /* 2 months = 60 days */
      await db.ref('keys/' + key).update({ used: true, usedBy: userId, usedAt: now.toISOString() });

      /* Set isPaid on user account + per-topic access */
      var courseId = (keyData.courseId) || (window.QUIZ_COURSE_ID || 'upGK');
      var updates = {};
      updates['users/' + userId + '/meta/isPaid'] = true;
      updates['users/' + userId + '/meta/paidUntil'] = expiry.toISOString();
      updates['users/' + userId + '/meta/activatedKey'] = key;
      updates['users/' + userId + '/meta/activatedAt'] = now.toISOString();
      updates['users/' + userId + '/meta/topics/' + courseId] = {
        unlocked: true, unlockedBy: 'key', unlockedAt: now.toISOString(), expiry: expiry.toISOString()
      };
      await db.ref().update(updates);

      /* Update paid status globally — instant UI refresh */
      window._upqzSetPaid(true, expiry.toISOString());
      /* Also update topic-level access cache */
      var newTopics = Object.assign({}, window._UPQZ_TOPIC_ACCESS);
      newTopics[courseId] = { unlocked: true, unlockedBy: 'key', expiry: expiry.toISOString() };
      window._upqzSetTopicAccess(newTopics);

      showOk('🎉 Activated! सभी chapters unlock हो गए। Valid till: ' + expiry.toLocaleDateString('hi-IN'));
      btn.textContent = '✅ Activated!';

      /* Auto close after 2.5 sec */
      setTimeout(function() {
        document.getElementById('paymentPopup').style.display = 'none';
        btn.textContent = '🔑 Activate Key'; btn.disabled = false;
      }, 2500);

    } catch(e) {
      btn.textContent = '🔑 Activate Key'; btn.disabled = false;
      showErr('❌ Error: ' + e.message);
    }
  };

  /* ── Check payment status from Firebase (called from popup + account panel) ── */
  window.checkPaymentStatus = async function() {
    var userId = localStorage.getItem('upqz_user_id');
    var btn    = document.getElementById('checkStatusBtn');
    var accBtn = document.getElementById('accCheckStatusBtn');
    var accStatus = document.getElementById('accSubStatus');
    var keySection = document.getElementById('accKeySection');

    function setLoading() {
      if (btn)    { btn.textContent='⏳ Checking...'; btn.disabled=true; }
      if (accBtn) { accBtn.textContent='⏳ Checking...'; accBtn.disabled=true; }
    }
    function resetBtns() {
      if (btn)    { btn.textContent='🔄 Check Payment Status'; btn.disabled=false; }
      if (accBtn) { accBtn.textContent='🔄 Check Status'; accBtn.disabled=false; }
    }
    function showAccMsg(html) {
      if (accStatus) accStatus.innerHTML = html;
    }

    if (!userId) { showAccMsg('⚠️ Login करें पहले'); return; }
    setLoading();

    /* Wait for DB up to 5 seconds */
    var db = null;
    for (var i = 0; i < 20; i++) {
      db = window._upqzGetDB ? window._upqzGetDB() : null;
      if (db) break;
      await new Promise(function(r){ setTimeout(r, 250); });
    }
    if (!db) {
      resetBtns();
      showAccMsg('🔴 Firebase connect नहीं हुई — Retry करें');
      return;
    }

    try {
      var snap = await db.ref('users/' + userId + '/meta').get();
      if (!snap.exists()) {
        resetBtns();
        showAccMsg('⚠️ Account data नहीं मिला');
        return;
      }
      var meta = snap.val();

      /* isPaid true + not expired + not cancelled */
      var isNowPaid = meta.isPaid === true
        && meta.paidUntil
        && new Date() < new Date(meta.paidUntil)
        && !meta.cancelled;

      if (isNowPaid) {
        /* ✅ UNLOCK */
        window._upqzSetPaid(true, meta.paidUntil);
        /* Also sync per-topic access */
        if (meta.topics) window._upqzSetTopicAccess(meta.topics);
        else {
          var t2 = Object.assign({}, window._UPQZ_TOPIC_ACCESS);
          t2[window.QUIZ_COURSE_ID || 'upGK'] = { unlocked:true, unlockedBy:'payment', expiry:meta.paidUntil };
          window._upqzSetTopicAccess(t2);
        }
        var expDate = new Date(meta.paidUntil).toLocaleDateString('en-IN');
        showAccMsg('⭐ <span style="color:#10b981">PREMIUM</span> — Valid till <b style="color:#fbbf24">' + expDate + '</b>');
        if (keySection) keySection.style.display = 'none';
        /* Close payment popup if open */
        var popup = document.getElementById('paymentPopup');
        if (popup) popup.style.display = 'none';
        try { if(typeof toast==='function') toast('🎉 सभी chapters unlock हो गए!','success'); } catch(e){}
        resetBtns();
      } else {
        /* 🔒 NOT PAID — show exact reason */
        window._upqzSetPaid(false, null);
        var reason = '';
        if (meta.cancelled)             reason = '(Subscription cancelled)';
        else if (!meta.isPaid)          reason = '(Not activated)';
        else if (!meta.paidUntil)       reason = '(No expiry set)';
        else                            reason = '(Expired: ' + new Date(meta.paidUntil).toLocaleDateString('en-IN') + ')';
        showAccMsg('🔒 <span style="color:#ef4444">FREE</span> ' + reason);
        if (keySection) keySection.style.display = 'block';
        resetBtns();
      }
    } catch(e) {
      resetBtns();
      showAccMsg('❌ Error: ' + e.message);
    }
  };

  /* ── Activate key from Account Panel ── */
  window.accActivateKey = async function() {
    var key = (document.getElementById('accKeyInput').value || '').trim().toUpperCase();
    var userId = localStorage.getItem('upqz_user_id');
    var msgEl = document.getElementById('accKeyMsg');
    var btn = document.getElementById('accActivateBtn');
    function showMsg(txt, ok) {
      msgEl.textContent = txt;
      msgEl.style.background = ok ? 'rgba(5,150,105,0.15)' : 'rgba(220,38,38,0.12)';
      msgEl.style.color = ok ? '#6ee7b7' : '#fca5a5';
      msgEl.style.border = ok ? '1px solid rgba(5,150,105,0.3)' : '1px solid rgba(220,38,38,0.25)';
      msgEl.style.display = 'block';
    }
    if (!userId) return showMsg('❌ Login करें पहले', false);
    if (!/^UPGK-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) return showMsg('❌ Invalid format: UPGK-XXXX-XXXX', false);
    btn.textContent = '⏳ Verifying...'; btn.disabled = true;
    try {
      var db = window._upqzGetDB ? window._upqzGetDB() : null;
      if (!db) { btn.textContent='🔑 Activate Key'; btn.disabled=false; return showMsg('❌ Firebase not connected', false); }
      var keySnap = await db.ref('keys/' + key).get();
      if (!keySnap.exists()) { btn.textContent='🔑 Activate Key'; btn.disabled=false; return showMsg('❌ Invalid key', false); }
      var kd = keySnap.val();
      if (kd.revoked) { btn.textContent='🔑 Activate Key'; btn.disabled=false; return showMsg('❌ Key revoked हो चुकी है', false); }
      if (kd.used)    { btn.textContent='🔑 Activate Key'; btn.disabled=false; return showMsg('❌ Key already used है', false); }
      var now = new Date();
      var expiry = new Date(now.getTime() + 60*24*60*60*1000);
      await db.ref('keys/' + key).update({ used:true, usedBy:userId, usedAt:now.toISOString() });
      await db.ref('users/' + userId + '/meta').update({ isPaid:true, paidUntil:expiry.toISOString(), activatedKey:key, activatedAt:now.toISOString(), cancelled:false });
      window._upqzSetPaid(true, expiry.toISOString());
      showMsg('🎉 Activated! Valid till ' + expiry.toLocaleDateString('en-IN'), true);
      /* Refresh subscription display */
      var subStatus = document.getElementById('accSubStatus');
      var keySection = document.getElementById('accKeySection');
      if (subStatus) subStatus.innerHTML = '⭐ <span style="color:#10b981">PREMIUM</span> — Valid till <b style="color:#fbbf24">' + expiry.toLocaleDateString('en-IN') + '</b>';
      if (keySection) keySection.style.display = 'none';
    } catch(e) { showMsg('❌ Error: ' + e.message, false); }
    btn.textContent = '🔑 Activate Key'; btn.disabled = false;
  };

  /* ── Forgot Password ── */
  window.showForgotPassword = function() {
    /* Hide login overlay */
    document.getElementById('fbAuthOverlay').style.display = 'none';
    /* Show logged-in ID if available */
    var userId = localStorage.getItem('upqz_user_id') || '';
    var idDisplay = document.getElementById('forgotPwIdDisplay');
    var waLink = document.getElementById('forgotPwWaLink');
    if (idDisplay) {
      idDisplay.textContent = userId || '— Login करें पहले —';
    }
    if (waLink && userId) {
      waLink.href = 'https://wa.me/919454084629?text=Password%20reset%20request%0ALogin%20ID%3A%20' + encodeURIComponent(userId);
    }
    document.getElementById('forgotPwOverlay').style.display = 'flex';
  };

  /* ── Boot: refresh once DOM is ready ── */
  setTimeout(function() { window._upqzRefreshChapterLock(); }, 600);

})();
(function(){
  const MODAL_CHAPTERS = [
    {v:'2',  name:'Physical Layout',       hi:'भौतिक विन्यास',          icon:'🗺️'},
    {v:'3',  name:'Climate & Soil',        hi:'जलवायु एवं मृदा',        icon:'🌦️'},
    {v:'4',  name:'Wildlife & Forests',    hi:'प्राकृतिक वनस्पति',      icon:'🦁'},
    {v:'5',  name:'Rivers & Lakes',        hi:'नदियाँ, झीलें',           icon:'🏞️'},
    {v:'6',  name:'Agriculture',           hi:'कृषि',                   icon:'🌾'},
    {v:'7',  name:'Irrigation Projects',   hi:'सिंचाई परियोजनाएं',      icon:'💧'},
    {v:'8',  name:'Tourism',               hi:'पर्यटन',                  icon:'🕌'},
    {v:'9',  name:'Industry',              hi:'उद्योग',                  icon:'🏭'},
    {v:'10', name:'Minerals & Energy',     hi:'खनिज एवं ऊर्जा',         icon:'⚡'},
    {v:'11', name:'Transport',             hi:'परिवहन',                  icon:'🚆'},
    {v:'12', name:'History',               hi:'इतिहास',                  icon:'🏛️'},
    {v:'13', name:'Art & Culture',         hi:'कला एवं संस्कृति',        icon:'🎭'},
    {v:'14', name:'Literature & Press',    hi:'साहित्य एवं पत्रिकाएं',   icon:'📰'},
    {v:'15', name:'Tribal Communities',    hi:'जनजातियाँ',               icon:'🪘'},
    {v:'16', name:'Education & Research',  hi:'शिक्षा व्यवस्था',         icon:'🎓'},
    {v:'17', name:'Political System',      hi:'राजनीतिक व्यवस्था',       icon:'🏛️'},
    {v:'18', name:'Important Schemes',     hi:'महत्वपूर्ण योजनाएं',      icon:'📋'},
    {v:'19', name:'Census 2011',           hi:'जनगणना-2011',             icon:'📊'},
  ];

  // Build premium grid once DOM ready
  window.addEventListener('DOMContentLoaded', function(){
    buildPremiumGrid();
  });

  function buildPremiumGrid(){
    const grid = document.getElementById('chPremiumGrid');
    if(!grid) return;
    grid.innerHTML = MODAL_CHAPTERS.map(c => `
      <div class="ch-card locked" id="chCard_${c.v}" data-ch="${c.v}" onclick="handleChCardClick('${c.v}')">
        <div class="ch-card-content">
          <div class="ch-card-icon">${c.icon}</div>
          <div class="ch-card-num">Ch ${c.v}</div>
          <div class="ch-card-name">${c.name}</div>
          <div class="ch-card-hi">${c.hi}</div>
          <div class="ch-card-meta" id="chMeta_${c.v}">Loading…</div>
        </div>
        <div class="ch-card-lock-overlay" id="chLockOverlay_${c.v}">
          <div class="ch-card-lock-icon">🔒</div>
          <div class="ch-card-lock-cta">Unlock ₹49</div>
        </div>
      </div>`).join('');
  }

  window.openChapterModal = function(){
    refreshChModalState();
    document.getElementById('chModalOverlay').classList.add('visible');
    const tb = document.getElementById('chTriggerBtn'); if(tb) tb.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  window.closeChapterModal = function(){
    document.getElementById('chModalOverlay').classList.remove('visible');
    const tb = document.getElementById('chTriggerBtn'); if(tb) tb.classList.remove('open');
    document.body.style.overflow = '';
  };

  window.handleChModalOverlayClick = function(e){
    if(e.target === document.getElementById('chModalOverlay')) closeChapterModal();
  };

  window.handleChCardClick = function(v){
    const isPaid = (typeof window._upqzIsPaid === 'function') ? window._upqzIsPaid() : false;
    if(v !== '1' && !isPaid && !window._upqzIsTopicUnlocked(window.QUIZ_COURSE_ID || 'upGK')){
      closeChapterModal();
      window.openPaymentPopup && window.openPaymentPopup();
      return;
    }
    selectChapter(v);
  };

  window.selectChapter = function(v){
    // Update hidden input
    document.getElementById('chapterInput').value = v;

    // Update card highlights
    document.querySelectorAll('.ch-card').forEach(c => c.classList.remove('selected'));
    const sel = document.getElementById('chCard_' + v) || document.getElementById('chAllCard');
    if(sel) sel.classList.add('selected');

    // Update trigger button label
    updateTriggerLabel(v);

    // Fire existing chapter change logic
    if(typeof window.onChapterChange === 'function') window.onChapterChange();

    closeChapterModal();
  };

  function updateTriggerLabel(v){
    const nameEl = document.getElementById('chTriggerName');
    const subEl  = document.getElementById('chTriggerSub');
    if(!nameEl) return;  // elements removed — no-op
    const isPaid = (typeof window._upqzIsPaid === 'function') ? window._upqzIsPaid() : false;

    if(v === 'all'){
      nameEl.textContent = 'All Chapters (Mixed)';
      if(subEl) subEl.textContent  = isPaid ? 'Premium · All questions' : '🔒 Requires Premium';
    } else if(v === '1'){
      const n = (typeof CHAPTER_COUNTS !== 'undefined') ? (CHAPTER_COUNTS[1]||0) : 0;
      nameEl.textContent = 'Ch 1 — Overview';
      if(subEl) subEl.textContent  = 'Free' + (n ? ` · ${n} questions` : '');
    } else {
      const names = (typeof CHAPTER_NAMES !== 'undefined') ? CHAPTER_NAMES : {};
      const n = (typeof CHAPTER_COUNTS !== 'undefined') ? (CHAPTER_COUNTS[v]||0) : 0;
      nameEl.textContent = `Ch ${v} — ${names[v] || ''}`;
      if(subEl) subEl.textContent  = isPaid ? (n ? `${n} questions` : 'Premium') : '🔒 Requires Premium';
    }
  }

  function refreshChModalState(){
    const isPaid = (typeof window._upqzIsPaid === 'function') ? window._upqzIsPaid() : false;
    const curVal = document.getElementById('chapterInput').value || '1';

    // Upsell banner
    const upsell = document.getElementById('chUpsellBanner');
    if(upsell) upsell.style.display = isPaid ? 'none' : 'flex';

    // All-chapters card
    const allCard = document.getElementById('chAllCard');
    const allOverlay = document.getElementById('chAllLockOverlay');
    if(allCard){
      if(isPaid){
        allCard.classList.remove('locked');
        if(allOverlay) allOverlay.style.display='none';
        const qCount = (typeof QUESTIONS !== 'undefined') ? QUESTIONS.length : 0;
        const allMeta = document.getElementById('chAllMeta');
        if(allMeta) allMeta.textContent = qCount ? `${qCount} questions · random mix` : 'All questions · random';
      } else {
        allCard.classList.add('locked');
        if(allOverlay) allOverlay.style.display='flex';
      }
      allCard.classList.toggle('selected', curVal === 'all');
    }

    // Ch 1 meta
    const meta1 = document.getElementById('chMeta_1');
    if(meta1 && typeof CHAPTER_COUNTS !== 'undefined'){
      const n = CHAPTER_COUNTS[1]||0;
      const used = (typeof getUsedIndices==='function') ? getUsedIndices('1').length : 0;
      const rem = n - used;
      meta1.textContent = n ? `${n} Qs${used>0?' · '+rem+' left':''}` : '';
    }
    const card1 = document.getElementById('chCard_1');
    if(card1) card1.classList.toggle('selected', curVal === '1');

    // Premium cards
    MODAL_CHAPTERS.forEach(c => {
      const card = document.getElementById('chCard_'+c.v);
      const overlay = document.getElementById('chLockOverlay_'+c.v);
      const meta = document.getElementById('chMeta_'+c.v);
      if(!card) return;

      if(isPaid){
        card.classList.remove('locked');
        if(overlay) overlay.style.display='none';
        card.onclick = function(){ selectChapter(c.v); };
        if(meta && typeof CHAPTER_COUNTS !== 'undefined'){
          const n = CHAPTER_COUNTS[c.v]||0;
          const used = (typeof getUsedIndices==='function') ? getUsedIndices(c.v).length : 0;
          const rem = n-used;
          meta.textContent = n ? `${n} Qs${used>0?' · '+rem+' left':''}` : '';
        }
      } else {
        card.classList.add('locked');
        if(overlay) overlay.style.display='flex';
        card.onclick = function(){ closeChapterModal(); window.openPaymentPopup && window.openPaymentPopup(); };
        if(meta) meta.textContent = 'Premium only';
      }
      card.classList.toggle('selected', curVal === c.v);
    });

    // Sync trigger label
    updateTriggerLabel(curVal);
  }

  // After pay-unlock, refresh modal state and trigger label
  const _origInjCh = window.injectChapterCounts;
  window.injectChapterCounts = function(){
    if(typeof _origInjCh === 'function') _origInjCh();
    updateTriggerLabel(document.getElementById('chapterInput').value || '1');
  };

  // Init trigger label after page loads
  window.addEventListener('load', function(){
    setTimeout(function(){
      updateTriggerLabel(document.getElementById('chapterInput').value || '1');
    }, 300);
  });

  // Escape key closes modal
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') closeChapterModal();
  });
})();
/* ─── Test Series Detail Screen Logic ─── */

function openTestSeriesDetail() {
    // Always reset to UP GK mode
    restoreUpGKMode();
    // Pass UP GK data directly (const variables, not globals)
    buildTSChapterList(CHAPTER_NAMES, QUESTIONS);
    updateTSDetailProgress(QUESTIONS);
    updateTSDetailLabels(CHAPTER_NAMES, QUESTIONS);
    // Refresh retry/saved badges silently
    try { tsLoadRetryWrong(); } catch(e){}
    try { tsLoadSaved();      } catch(e){}
    // Switch to mock tab
    switchTSTab(document.querySelector('.ts-tab[data-tab="mock"]'), 'mock');
    // Go to screen
    showScreen('testSeriesDetailScreen');
}

function buildTSChapterList(_chNames, _questions) {
    const container = document.getElementById('tsChapterList');
    // Use passed data OR fall back to globals
    const useChNames   = _chNames   || (typeof CHAPTER_NAMES !== 'undefined' ? CHAPTER_NAMES : {});
    const useQuestions = _questions || (typeof QUESTIONS      !== 'undefined' ? QUESTIONS      : []);
    if (!container || !Object.keys(useChNames).length) return;
    let html = '';
    const chNums = Object.keys(useChNames).map(Number).sort((a,b)=>a-b);
    // find first unattempted chapter for "next suggested"
    let nextCh = chNums[0];
    try {
        const h = JSON.parse(localStorage.getItem(_lsk('quizHistory'))||'[]');
        const attempted = new Set(h.map(x=>x.chapter).filter(Boolean));
        nextCh = chNums.find(c => !attempted.has(String(c))) || chNums[0];
        const nextLbl = document.getElementById('tsNextSuggestedLabel');
        if (nextLbl) nextLbl.textContent = `Ch ${nextCh} — ${useChNames[nextCh]||''}`;
    } catch(e){}

    // Chapter list header
    html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0 6px">
        <span style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-muted)">${chNums.length} 📖 Chapter Tests</span>
        <span style="font-size:11px;color:#7c3aed;font-weight:600">1 Free</span>
    </div>`;

    chNums.forEach(ch => {
        const name  = useChNames[ch] || `Chapter ${ch}`;
        const count = useQuestions.filter(q => q.ch == ch).length;
        const isFree = ch === 1;
        let attempted = 0;
        try {
            const h = JSON.parse(localStorage.getItem(_lsk('quizHistory'))||'[]');
            attempted = h.filter(x=>String(x.chapter)===String(ch)).length;
        } catch(e){}
        html += `<div onclick="launchChapterTest(${ch})" style="display:flex;align-items:center;justify-content:space-between;padding:13px 0;border-top:1px solid var(--border);cursor:pointer;border-radius:8px;transition:background 0.15s" onmouseenter="this.style.background='var(--bg-hover)'" onmouseleave="this.style.background='none'">
            <div style="display:flex;align-items:center;gap:10px">
                <div style="width:34px;height:34px;border-radius:10px;background:${ch==nextCh?'linear-gradient(135deg,#7c3aed,#4f46e5)':'var(--bg-hover)'};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:${ch==nextCh?'#fff':'var(--text-muted)'};flex-shrink:0">${ch}</div>
                <div>
                    <div style="font-size:13px;font-weight:700;color:var(--text-primary);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${count} questions${attempted>0?' • '+attempted+' attempts':''}</div>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
                ${isFree ? '<span style="font-size:10px;color:#059669;font-weight:700;background:#d1fae5;padding:2px 7px;border-radius:8px">Free</span>' : ''}
                <span style="color:var(--text-muted);font-size:16px">›</span>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

function switchTSTab(el, tab) {
    // Update tab button styles
    document.querySelectorAll('.ts-tab').forEach(t => {
        const isActive = t.dataset.tab === tab;
        t.style.color      = isActive ? '#fff' : 'rgba(255,255,255,0.45)';
        t.style.borderBottom = isActive ? '2.5px solid #7c3aed' : '2.5px solid transparent';
        t.style.fontWeight = isActive ? '700' : '600';
    });
    // Show/hide tab content — now includes retry and saved
    ['mock','pyqs','notes','retry','saved'].forEach(t => {
        const el = document.getElementById('tsTab_'+t);
        if (el) el.style.display = t === tab ? 'block' : 'none';
    });
    // Load data when switching tabs
    if (tab === 'retry')  tsLoadRetryWrong();
    if (tab === 'saved')  tsLoadSaved();
    if (tab === 'pyqs')   {
        // If no specific chapter was recently clicked, show all PYQs
        if (!window._pyqActiveCh) window._pyqActiveCh = 'all';
        setTimeout(() => pyqRenderPaperCards(), 50);
    }
}

/* ── Retry Wrong Tab logic ── */
function tsLoadRetryWrong() {
    var countLbl  = document.getElementById('tsRetryCountLabel');
    var startBtn  = document.getElementById('tsRetryStartBtn');
    var emptyMsg  = document.getElementById('tsRetryEmptyMsg');
    var listEl    = document.getElementById('tsRetryList');
    try {
        var wq = JSON.parse(localStorage.getItem((typeof _lsk==='function'?_lsk('wrongQs'):'wrongQs'))||'[]');
        // Update badge on tab button
        var retryTab = document.getElementById('tsTabRetryBtn');
        if (retryTab) retryTab.innerHTML = '❌ Retry' + (wq.length > 0 ? ' <span style="font-size:9px;background:#ef4444;color:#fff;padding:1px 5px;border-radius:8px;margin-left:2px">'+wq.length+'</span>' : '');
        if (wq.length === 0) {
            if (countLbl) countLbl.textContent = '0 wrong questions';
            if (startBtn) startBtn.style.display = 'none';
            if (emptyMsg) emptyMsg.style.display = 'block';
            if (listEl)   listEl.innerHTML = '';
            return;
        }
        if (countLbl) countLbl.textContent = wq.length + ' wrong question' + (wq.length>1?'s':'') + ' to practise';
        if (startBtn) startBtn.style.display = 'inline-block';
        if (emptyMsg) emptyMsg.style.display = 'none';
        // Show preview list (max 5)
        var preview = wq.slice(0, 5);
        if (listEl) listEl.innerHTML = preview.map(function(w, i) {
            return '<div style="padding:10px 12px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:10px;margin-bottom:8px;font-size:12px;color:var(--text-secondary);line-height:1.5">' +
                '<span style="color:#ef4444;font-weight:700">'+(i+1)+'.</span> ' + (w.q||'').slice(0,90) + (w.q&&w.q.length>90?'…':'') +
            '</div>';
        }).join('') + (wq.length > 5 ? '<div style="text-align:center;font-size:11px;color:var(--text-muted);padding:8px">+' + (wq.length-5) + ' more questions</div>' : '');
    } catch(e) {
        if (countLbl) countLbl.textContent = 'Could not load wrong questions';
    }
}

function tsStartRetryWrong() {
    try {
        var wq = JSON.parse(localStorage.getItem((typeof _lsk==='function'?_lsk('wrongQs'):'wrongQs'))||'[]');
        if (!wq.length) { return; }
        if (typeof _startCustomQuiz === 'function') {
            restoreUpGKMode();
            showScreen('welcomeScreen');
            setTimeout(function(){ _startCustomQuiz(wq, '❌ Wrong Questions Retry'); }, 200);
        }
    } catch(e) {}
}

/* ── Saved / Bookmarks Tab logic ── */
function tsLoadSaved() {
    var countLbl = document.getElementById('tsSavedCountLabel');
    var startBtn = document.getElementById('tsSavedStartBtn');
    var emptyMsg = document.getElementById('tsSavedEmptyMsg');
    var listEl   = document.getElementById('tsSavedList');
    try {
        var bm = (typeof loadBookmarks === 'function') ? loadBookmarks() :
                 JSON.parse(localStorage.getItem((typeof _lsk==='function'?_lsk('bookmarks'):'bookmarks'))||'[]');
        // Update badge on tab button
        var savedTab = document.getElementById('tsTabSavedBtn');
        if (savedTab) savedTab.innerHTML = '🔖 Saved' + (bm.length > 0 ? ' <span style="font-size:9px;background:#d97706;color:#fff;padding:1px 5px;border-radius:8px;margin-left:2px">'+bm.length+'</span>' : '');
        if (bm.length === 0) {
            if (countLbl) countLbl.textContent = '0 saved questions';
            if (startBtn) startBtn.style.display = 'none';
            if (emptyMsg) emptyMsg.style.display = 'block';
            if (listEl)   listEl.innerHTML = '';
            return;
        }
        if (countLbl) countLbl.textContent = bm.length + ' saved question' + (bm.length>1?'s':'');
        if (startBtn) startBtn.style.display = 'inline-block';
        if (emptyMsg) emptyMsg.style.display = 'none';
        // Show preview list (max 5)
        var preview = bm.slice(0, 5);
        if (listEl) listEl.innerHTML = preview.map(function(b, i) {
            return '<div style="padding:10px 12px;background:rgba(217,119,6,0.06);border:1px solid rgba(217,119,6,0.15);border-radius:10px;margin-bottom:8px;font-size:12px;color:var(--text-secondary);line-height:1.5">' +
                '<span style="color:#d97706;font-weight:700">'+(i+1)+'.</span> ' + (b.q||'').slice(0,90) + (b.q&&b.q.length>90?'…':'') +
            '</div>';
        }).join('') + (bm.length > 5 ? '<div style="text-align:center;font-size:11px;color:var(--text-muted);padding:8px">+' + (bm.length-5) + ' more saved</div>' : '');
    } catch(e) {
        if (countLbl) countLbl.textContent = 'Could not load saved questions';
    }
}

function tsStartBookmarkQuiz() {
    try {
        var bm = (typeof loadBookmarks === 'function') ? loadBookmarks() :
                 JSON.parse(localStorage.getItem((typeof _lsk==='function'?_lsk('bookmarks'):'bookmarks'))||'[]');
        if (!bm.length) { return; }
        if (typeof _startCustomQuiz === 'function') {
            restoreUpGKMode();
            showScreen('welcomeScreen');
            setTimeout(function(){ _startCustomQuiz(bm, '🔖 Bookmarks Practice'); }, 200);
        }
    } catch(e) {}
}

function updateTSDetailProgress(_questions) {
    try {
        const useQuestions = _questions || (typeof QUESTIONS !== 'undefined' ? QUESTIONS : []);
        const total = useQuestions.length;
        let attempted = 0;
        try {
            const h = JSON.parse(localStorage.getItem(_lsk('quizHistory'))||'[]');
            attempted = h.reduce((s,x)=>s+(x.count||0),0);
            attempted = Math.min(attempted, total);
        } catch(e) {}
        const pct = total > 0 ? Math.max(1, Math.round((attempted/total)*100)) : 1;
        const bar = document.getElementById('tsDetailProgBar');
        const lbl = document.getElementById('tsDetailProgLabel');
        if (bar) bar.style.width = pct + '%';
        if (lbl) lbl.textContent = attempted + ' / ' + total + ' questions attempted';
    } catch(e){}
}

function updateTSDetailLabels(_chNames, _questions) {
    try {
        const useChNames   = _chNames   || (typeof CHAPTER_NAMES !== 'undefined' ? CHAPTER_NAMES : {});
        const useQuestions = _questions || (typeof QUESTIONS      !== 'undefined' ? QUESTIONS      : []);
        // Chapter count
        const chCount = Object.keys(useChNames).length;
        const subEl = document.getElementById('tsSubjectCount');
        if (subEl) subEl.textContent = chCount;
        // Total Q
        const tqEl = document.getElementById('tsTotalQLabel');
        if (tqEl) tqEl.textContent = (useQuestions.length||0) + ' questions • Exam mode';
        // Wrong Q count
        try {
            const wq = JSON.parse(localStorage.getItem(_lsk('wrongQs'))||'[]');
            const wqEl = document.getElementById('tsWrongQLabel');
            if (wqEl && wq.length > 0) wqEl.textContent = wq.length + ' wrong questions to retry';
        } catch(e){}
        // Bookmark count
        try {
            const bm = JSON.parse(localStorage.getItem(_lsk('bookmarks'))||'[]');
            const bmEl = document.getElementById('tsBookmarkLabel');
            if (bmEl && bm.length > 0) bmEl.textContent = bm.length + ' saved questions';
        } catch(e){}
    } catch(e){}
}
/* ══════ Quiz Options Bottom Sheet ══════ */
let _qoChapter = 1;
let _qoCount = 25;
let _qoTimer = 0;
let _qoMode = 'exam';
let _qoTotalQ = 0;

function openQuizOptions(config) {
    // config: { chapter, title, subtitle, icon, count, timer, mode, totalQ }
    _qoChapter = config.chapter !== undefined ? config.chapter : 1;
    _qoCount   = config.count   || 25;
    _qoTimer   = config.timer   !== undefined ? config.timer : 0;
    _qoMode    = config.mode    || 'exam';
    _qoTotalQ  = config.totalQ  || 0;

    // Update header
    document.getElementById('qoTitle').textContent    = config.title    || 'Quiz';
    document.getElementById('qoSubtitle').textContent = config.subtitle || '';
    document.getElementById('qoIcon').textContent     = config.icon     || '📖';

    // Build count pills
    const pillsEl = document.getElementById('qoCountPills');
    const avail = _qoTotalQ;
    let pillsHTML = '';
    [10, 25, 50].forEach(n => {
        const disabled = avail > 0 && n > avail;
        pillsHTML += `<button class="qo-count-btn${_qoCount===n?' active':''}" data-val="${n}" onclick="qoPickCount(this)" ${disabled?'style="opacity:0.4;pointer-events:none"':''}>${n} Qs</button>`;
    });
    pillsHTML += `<button class="qo-count-btn${_qoCount==='all'?' active':''}" data-val="all" onclick="qoPickCount(this)">All${avail?' ('+avail+')':''}</button>`;
    pillsEl.innerHTML = pillsHTML;

    // Timer buttons
    document.querySelectorAll('.qo-timer-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.val) === parseInt(_qoTimer));
    });

    // Mode rows
    document.querySelectorAll('.qo-mode-row').forEach(r => {
        r.classList.toggle('active', r.dataset.mode === _qoMode);
    });

    // Show overlay
    const overlay = document.getElementById('quizOptionsOverlay');
    const sheet   = document.getElementById('quizOptionsSheet');
    overlay.style.display = 'flex';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => { sheet.style.transform = 'translateY(0)'; });
    });
}

function closeQuizOptions() {
    const sheet = document.getElementById('quizOptionsSheet');
    sheet.style.transform = 'translateY(100%)';
    setTimeout(() => { document.getElementById('quizOptionsOverlay').style.display = 'none'; }, 350);
}

function qoPickCount(btn) {
    document.querySelectorAll('.qo-count-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _qoCount = btn.dataset.val === 'all' ? 'all' : parseInt(btn.dataset.val);
}

function qoPickTimer(btn) {
    document.querySelectorAll('.qo-timer-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _qoTimer = parseInt(btn.dataset.val);
}

function qoPickMode(row) {
    document.querySelectorAll('.qo-mode-row').forEach(r => r.classList.remove('active'));
    row.classList.add('active');
    _qoMode = row.dataset.mode;
}

function qoStartQuiz() {
    closeQuizOptions();
    setTimeout(() => {
        // Set hidden inputs
        const chInp  = document.getElementById('chapterInput');
        const cntInp = document.getElementById('countInput');
        const tmrInp = document.getElementById('timerInput');
        if (chInp)  chInp.value  = _qoChapter;
        if (cntInp) cntInp.value = _qoCount;
        if (tmrInp) tmrInp.value = _qoTimer;

        // Set G.mode directly (no DOM .mode-v2 needed)
        if (typeof G !== 'undefined') G.mode = _qoMode;

        // Fire initQuiz
        if (typeof initQuiz === 'function') initQuiz();
    }, 400);
}

/* Override the launch functions to use the popup */
function launchChapterTest(ch) {
    // Track active chapter for PYQ tab filtering
    window._pyqActiveCh = ch;

    const name   = (typeof CHAPTER_NAMES !== 'undefined') ? CHAPTER_NAMES[ch] : `Chapter ${ch}`;
    const totalQ = (typeof CHAPTER_COUNTS !== 'undefined') ? (CHAPTER_COUNTS[ch]||0) : 0;
    let attempted = 0;
    try {
        const h = JSON.parse(localStorage.getItem(_lsk('quizHistory'))||'[]');
        attempted = h.filter(x=>String(x.chapter)===String(ch)).length;
    } catch(e){}
    openQuizOptions({
        chapter:  ch,
        title:    `Ch ${ch} — ${name}`,
        subtitle: `${totalQ} questions${attempted?' • '+attempted+' attempts played':''}`,
        icon:     '📖',
        count:    25,
        timer:    0,
        mode:     'exam',
        totalQ:   totalQ
    });
}

function launchSuggestedTest() {
    try {
        const chNums = Object.keys(CHAPTER_NAMES).map(Number).sort((a,b)=>a-b);
        const h = JSON.parse(localStorage.getItem(_lsk('quizHistory'))||'[]');
        const attempted = new Set(h.map(x=>x.chapter).filter(Boolean));
        const nextCh = chNums.find(c => !attempted.has(String(c))) || chNums[0];
        launchChapterTest(nextCh);
    } catch(e) { launchChapterTest(1); }
}

function launchSubjectTest() {
    const totalQ = (typeof QUESTIONS !== 'undefined') ? QUESTIONS.length : 0;
    openQuizOptions({
        chapter:  'all',
        title:    'Subject Test',
        subtitle: 'All chapters combined',
        icon:     '📚',
        count:    50,
        timer:    0,
        mode:     'exam',
        totalQ:   totalQ
    });
}

function launchFullTest() {
    const totalQ = (typeof QUESTIONS !== 'undefined') ? QUESTIONS.length : 0;
    openQuizOptions({
        chapter:  'all',
        title:    'Full Test',
        subtitle: `${totalQ} questions • All chapters`,
        icon:     '🏆',
        count:    'all',
        timer:    30,
        mode:     'exam',
        totalQ:   totalQ
    });
}

function launchSpeedTest() {
    const totalQ = (typeof QUESTIONS !== 'undefined') ? QUESTIONS.length : 0;
    openQuizOptions({
        chapter:  'all',
        title:    'Speed Run',
        subtitle: 'Race against the clock',
        icon:     '⚡',
        count:    25,
        timer:    15,
        mode:     'speed',
        totalQ:   totalQ
    });
}

/* ══════════ PYQ PAPER-BASED QUIZ SYSTEM ══════════ */
