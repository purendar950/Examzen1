# 📚 ExamZen — UP GK Mock Test Series 2025–26

A fully offline, mobile-friendly quiz app for **UPPSC, UPSSSC, UP Police, UP Lekhpal** and other UP government exam preparation.

## 🌐 Live Demo
> Deploy on GitHub Pages — link appears here after setup.

---

## 📁 File Structure

```
examzen/
├── index.html       ← App UI, logic, styles (never edit manually)
├── questions.js     ← All questions, chapters & PYQ data (edit this!)
└── README.md
```

**Only two files.** `index.html` loads `questions.js` as a script.

---

## 🚀 Deploy on GitHub Pages (5 minutes)

1. **Create a new repository** on GitHub (e.g. `examzen`)
2. Upload both `index.html` and `questions.js`
3. Go to **Settings → Pages → Source → main branch → / (root)**
4. Click **Save** — your app is live at:
   `https://YOUR-USERNAME.github.io/examzen/`

---

## ✏️ How to Add Questions

Open `questions.js` and add to the `QUESTIONS` array:

```js
{ ch:1, q:"Question text?", hi:"हिंदी अनुवाद?",
  opts:["Option A","Option B","Option C","Option D","Option E"],
  ans:2,                          // 0-indexed: 0=A, 1=B, 2=C ...
  exp:"Explanation of answer.",
  exam:"UPSSSC PET 2024",
  diff:"easy"                     // easy | medium | hard
},
```

### Chapter Numbers
| # | Topic | # | Topic |
|---|-------|---|-------|
| 1 | UP Overview | 11 | Transport |
| 2 | Physical Layout | 12 | History |
| 3 | Climate & Soil | 13 | Culture & Arts |
| 4 | Wildlife | 14 | Literature & Press |
| 5 | Rivers & Lakes | 15 | Tribal Communities |
| 6 | Agriculture | 16 | Education & Museums |
| 7 | Irrigation | 17 | Political & Admin |
| 8 | Tourism | 18 | Important Schemes |
| 9 | Industry | 19 | Census 2011 |
| 10 | Minerals | | |

---

## 🛠️ Admin Panel Workflow (Recommended)

Instead of editing `questions.js` manually, use the built-in Admin Panel:

1. Open the app → tap **⚙️ Admin Panel**
2. Add questions, create custom chapters
3. Click **💾 Save & Download questions.js**
4. Upload the downloaded `questions.js` to GitHub
5. Changes go live immediately ✅

---

## ✨ Features

- ✅ 1500+ UP GK questions across 19 chapters
- ✅ Chapter-wise quiz, Mock Tests, Speed Run, Full Test
- ✅ PYQ papers — UPPSC, UPSSSC, UP Police, UP Lekhpal
- ✅ Retry wrong answers, Bookmarks
- ✅ Study Notes
- ✅ Lifelines: 50-50, Hint, Skip, Double Points, Freeze Timer
- ✅ AI Tutor (Claude + ChatGPT integration)
- ✅ Dark mode, Hindi + English questions
- ✅ Works offline after first load
- ✅ No server needed — pure HTML + JS

---

## 📄 License

Free to use for educational purposes.
