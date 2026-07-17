// ================================================================
//  CONFIGURATION
// ================================================================
const API_BASE = ''; // not used – we load local JSON

// ================================================================
//  DATA – All 66 Books
// ================================================================
const BOOKS_OT = [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
    "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
    "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
    "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
    "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
    "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
    "Zephaniah", "Haggai", "Zechariah", "Malachi"
];
const BOOKS_NT = [
    "Matthew", "Mark", "Luke", "John", "Acts",
    "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
    "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
    "1 Timothy", "2 Timothy", "Titus", "Philemon",
    "Hebrews", "James", "1 Peter", "2 Peter",
    "1 John", "2 John", "3 John", "Jude", "Revelation"
];
const ALL_BOOKS = [...BOOKS_OT, ...BOOKS_NT];

// ================================================================
//  BOOK NAME MAPPING (full ↔ common abbreviation)
// ================================================================
const BOOK_ABBREVIATIONS = {
    "Genesis": "Gen",
    "Exodus": "Exo",
    "Leviticus": "Lev",
    "Numbers": "Num",
    "Deuteronomy": "Deu",
    "Joshua": "Jos",
    "Judges": "Jdg",
    "Ruth": "Rut",
    "1 Samuel": "1Sa",
    "2 Samuel": "2Sa",
    "1 Kings": "1Ki",
    "2 Kings": "2Ki",
    "1 Chronicles": "1Ch",
    "2 Chronicles": "2Ch",
    "Ezra": "Ezr",
    "Nehemiah": "Neh",
    "Esther": "Est",
    "Job": "Job",
    "Psalms": "Psa",
    "Proverbs": "Pro",
    "Ecclesiastes": "Ecc",
    "Song of Solomon": "Son",
    "Isaiah": "Isa",
    "Jeremiah": "Jer",
    "Lamentations": "Lam",
    "Ezekiel": "Eze",
    "Daniel": "Dan",
    "Hosea": "Hos",
    "Joel": "Joe",
    "Amos": "Amo",
    "Obadiah": "Oba",
    "Jonah": "Jon",
    "Micah": "Mic",
    "Nahum": "Nah",
    "Habakkuk": "Hab",
    "Zephaniah": "Zep",
    "Haggai": "Hag",
    "Zechariah": "Zec",
    "Malachi": "Mal",
    "Matthew": "Mat",
    "Mark": "Mar",
    "Luke": "Luk",
    "John": "Jhn",
    "Acts": "Act",
    "Romans": "Rom",
    "1 Corinthians": "1Co",
    "2 Corinthians": "2Co",
    "Galatians": "Gal",
    "Ephesians": "Eph",
    "Philippians": "Phi",
    "Colossians": "Col",
    "1 Thessalonians": "1Th",
    "2 Thessalonians": "2Th",
    "1 Timothy": "1Ti",
    "2 Timothy": "2Ti",
    "Titus": "Tit",
    "Philemon": "Phm",
    "Hebrews": "Heb",
    "James": "Jam",
    "1 Peter": "1Pe",
    "2 Peter": "2Pe",
    "1 John": "1Jo",
    "2 John": "2Jo",
    "3 John": "3Jo",
    "Jude": "Jud",
    "Revelation": "Rev"
};

// Reverse mapping: abbreviation -> full name
const REVERSE_ABBREV = {};
for (const [full, abbr] of Object.entries(BOOK_ABBREVIATIONS)) {
    REVERSE_ABBREV[abbr] = full;
}

// Helper: get full name from any input (could be full or abbr)
function getFullName(name) {
    const trimmed = name.trim();
    if (ALL_BOOKS.includes(trimmed)) return trimmed;
    if (REVERSE_ABBREV[trimmed]) return REVERSE_ABBREV[trimmed];
    const foundFull = ALL_BOOKS.find(b => b.toLowerCase() === trimmed.toLowerCase());
    if (foundFull) return foundFull;
    for (const [full, abbr] of Object.entries(BOOK_ABBREVIATIONS)) {
        if (abbr.toLowerCase() === trimmed.toLowerCase()) return full;
    }
    return null;
}

// ================================================================
//  STATE
// ================================================================
let currentUser = null;
let currentPlayerId = null;
let activeSection = 'sec-auth';
let currentHomeTab = 'quiz';
let highlightVerse = null;
let returnToResults = false;
let previousSection = 'sec-home';
let deferredPrompt = null;

let currentQuiz = {
    questions: [],
    index: 0,
    score: 0,
    timer: 30,
    interval: null,
    total: 0,
    userAnswers: [],
    questionSet: [],
    selectedOption: null,
    questionFinished: false,
    hasAnswered: false,
    isGlobalChallenge: false,
    isDaily: false, // added for daily quiz tracking
};

let challengeState = {
    isLive: false,
    startTime: null,
    timerInterval: null,
    previousResults: [],
    hasPlayedThisWeek: false,
    currentWeek: null,
};

let leaderboard = [];

// ================================================================
//  TOAST
// ================================================================
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// ================================================================
//  USER / PROGRESS
// ================================================================
let progressData = {
    username: '',
    playerId: '',
    quizzes: [],
    scripture: { booksRead: [], chaptersRead: [], versesRead: 0 },
    globalChallenges: [],
    dailyQuizHistory: [],
    playedQuestions: [],
};

function generateDeviceCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

function initDevice() {
    let storedCode = localStorage.getItem('rhema_device_code');
    if (!storedCode) {
        storedCode = generateDeviceCode();
        localStorage.setItem('rhema_device_code', storedCode);
    }
    return storedCode;
}

function loadProgress(playerId) {
    const key = 'rhema_progress_' + playerId;
    const stored = localStorage.getItem(key);
    if (stored) {
        try {
            const data = JSON.parse(stored);
            progressData = data;
            if (!progressData.scripture) progressData.scripture = { booksRead: [], chaptersRead: [], versesRead: 0 };
            if (!progressData.quizzes) progressData.quizzes = [];
            if (!progressData.globalChallenges) progressData.globalChallenges = [];
            if (!progressData.dailyQuizHistory) progressData.dailyQuizHistory = [];
            if (!progressData.playedQuestions) progressData.playedQuestions = [];
            currentPlayerId = playerId;
            localStorage.setItem('rhema_current_player', playerId);
            updatePlayerBadge();
            return true;
        } catch (e) {
            console.warn('Failed to parse progress', e);
        }
    }
    return false;
}

function saveProgressToStorage(playerId) {
    if (!playerId) return;
    const key = 'rhema_progress_' + playerId;
    localStorage.setItem(key, JSON.stringify(progressData));
    localStorage.setItem('rhema_current_player', playerId);
    currentPlayerId = playerId;
    updatePlayerBadge();
}

function updatePlayerBadge() {
    const badge = document.getElementById('display-user');
    if (badge) {
        const code = initDevice();
        if (currentPlayerId && progressData.username) {
            badge.textContent = progressData.username + ' ' + code;
        } else if (currentPlayerId) {
            badge.textContent = 'Player ' + code;
        } else {
            badge.textContent = 'Progress';
        }
    }
}

function trackQuizResult(book, score, total, isDaily = false, isGlobal = false) {
    const entry = { book, score, total, date: new Date().toISOString() };
    if (isGlobal) {
        progressData.globalChallenges.push(entry);
    } else if (isDaily) {
        progressData.dailyQuizHistory.push(entry);
    } else {
        progressData.quizzes.push(entry);
    }
    saveProgressToStorage(currentPlayerId);
}

function markQuestionsPlayed(refs) {
    if (!currentPlayerId) return;
    refs.forEach(ref => {
        if (!progressData.playedQuestions.includes(ref)) {
            progressData.playedQuestions.push(ref);
        }
    });
    saveProgressToStorage(currentPlayerId);
}

function getUnplayedQuestions(questionPool, count) {
    const played = progressData.playedQuestions || [];
    const available = questionPool.filter(q => !played.includes(q.ref));
    if (available.length < count) {
        const shuffled = shuffle(questionPool);
        return shuffled.slice(0, count);
    }
    return shuffle(available).slice(0, count);
}

// ================================================================
//  NAVIGATION – with skipInit option
// ================================================================
function navigateTo(sectionId, skipInit = false) {
    document.querySelectorAll('.app-section').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(sectionId);
    if (target) target.classList.add('active');

    previousSection = activeSection;
    activeSection = sectionId;
    updateHeaderButtons(sectionId);

    if (sectionId === 'sec-challenge') {
        startGlobalChallenge();
    }

    if (sectionId === 'sec-reader') {
        if (!skipInit) {
            if (!_currentBibleData) {
                openReaderTo(ALL_BOOKS[0], 1, null);
            } else {
                loadReaderChapter();
            }
        } else {
            loadReaderChapter();
        }
        if (highlightVerse) {
            setTimeout(() => {
                const content = document.getElementById('reader-content');
                const lines = content.querySelectorAll('.verse-line');
                for (let line of lines) {
                    const data = line.dataset;
                    if (data.book === highlightVerse.book && data.chapter == highlightVerse.chapter && data.verse == highlightVerse.verse) {
                        line.classList.add('highlight');
                        line.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        break;
                    }
                }
            }, 300);
        }
    }

    if (sectionId === 'sec-progress') {
        updateProgressUI();
        window.scrollTo(0, 0);
    }

    if (sectionId === 'sec-home') {
        window.scrollTo(0, 0);
        if (document.getElementById('quiz-ot-grid').children.length === 0) populateQuizGrids();
        if (document.getElementById('scripture-ot-grid').children.length === 0) populateScriptureGrids();
        toggleHomeMode(currentHomeTab);
    }

    if (sectionId === 'sec-about') {
        setupPWAInstall();
    }
}

function updateHeaderButtons(sectionId) {
    const left = document.getElementById('headerLeft');
    const right = document.getElementById('headerRight');

    if (sectionId === 'sec-auth') {
        left.innerHTML =
            `<button class="header-btn about-btn" onclick="navigateTo('sec-about')"> About Us</button>`;
        right.innerHTML = `<a href="mailto:info@rhema.org" class="header-btn contact-btn"> Contact Us</a>`;
    } else if (sectionId === 'sec-about' || sectionId === 'sec-contact') {
        left.innerHTML = `<button class="header-btn home-btn" onclick="navigateTo('sec-auth')">← Back</button>`;
        right.innerHTML = '';
    } else if (sectionId === 'sec-home') {
        left.innerHTML =
            `<button class="header-btn welcome-btn" onclick="navigateTo('sec-auth')"> Welcome</button>`;
        right.innerHTML = `<div class="user-badge" id="display-user" onclick="openProgress()">Progress</div>`;
        updatePlayerBadge();
    } else {
        left.innerHTML = `<button class="header-btn home-btn" onclick="navigateTo('sec-home')"> Home</button>`;
        right.innerHTML = `<div class="user-badge" id="display-user" onclick="openProgress()">Progress</div>`;
        updatePlayerBadge();
    }
}

// ================================================================
//  AUTH
// ================================================================
function handleAuth(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('username-input');
    let username = usernameInput.value.trim();

    if (!username) {
        username = 'Player';
    }

    const deviceCode = initDevice();
    const playerId = username + ' ' + deviceCode;

    if (!loadProgress(playerId)) {
        progressData = {
            username: username,
            playerId: playerId,
            quizzes: [],
            scripture: { booksRead: [], chaptersRead: [], versesRead: 0 },
            globalChallenges: [],
            dailyQuizHistory: [],
            playedQuestions: [],
        };
        saveProgressToStorage(playerId);
        showToast('👋 Welcome, ' + username + '!', 'success');
    } else {
        showToast('👋 Welcome back, ' + username + '!', 'success');
    }

    currentUser = username;
    navigateTo('sec-home');
    if (document.getElementById('quiz-ot-grid').children.length === 0) populateQuizGrids();
    if (document.getElementById('scripture-ot-grid').children.length === 0) populateScriptureGrids();
    updatePlayerBadge();
}

function openProgress() {
    navigateTo('sec-progress');
    updateProgressUI();
}

// ================================================================
//  PROGRESS UI
// ================================================================
function updateProgressUI() {
    const area = document.getElementById('progress-content');
    if (!area) return;
    const deviceCode = initDevice();
    let totalCorrect = 0;
    let totalQuestions = 0;
    const bookStats = {};
    progressData.quizzes.forEach(q => {
        totalCorrect += q.score;
        totalQuestions += q.total;
        if (!bookStats[q.book]) bookStats[q.book] = { correct: 0, total: 0 };
        bookStats[q.book].correct += q.score;
        bookStats[q.book].total += q.total;
    });
    progressData.dailyQuizHistory.forEach(q => {
        totalCorrect += q.score;
        totalQuestions += q.total;
    });
    const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const booksReadCount = progressData.scripture.booksRead.length;
    const versesRead = progressData.scripture.versesRead || 0;
    const gcAttempts = progressData.globalChallenges.length;
    let gcBest = 0;
    if (gcAttempts > 0) {
        progressData.globalChallenges.forEach(g => {
            const pct = Math.round((g.score / g.total) * 100);
            if (pct > gcBest) gcBest = pct;
        });
    }
    const displayId = progressData.username ? progressData.username + ' ' + deviceCode : 'Player ' + deviceCode;
    let html = `
        <div class="player-id-box">
            Player ID: <span>${displayId}</span>
        </div>
        <div class="progress-stats-grid">
            <div class="stat-card">
                <div class="stat-number">${accuracy}%</div>
                <div class="stat-label">Quiz Accuracy</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalCorrect}/${totalQuestions}</div>
                <div class="stat-label">Quiz Correct / Total</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${booksReadCount}</div>
                <div class="stat-label">Books Read</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${versesRead}</div>
                <div class="stat-label">Verses Read</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${gcAttempts}</div>
                <div class="stat-label">Global Challenges</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${gcBest}%</div>
                <div class="stat-label">Best Challenge</div>
            </div>
        </div>
        <div style="margin-top:8px; font-size:14px; color:var(--muted);">
            <strong>Per‑Book Quiz Stats:</strong>
            ${Object.keys(bookStats).length === 0 ? ' None yet.' : ''}
            <ul style="list-style:none; padding:0; margin-top:4px;">
                ${Object.entries(bookStats).map(([book, stats]) => 
                    `<li style="padding:4px 0; border-bottom:1px solid #2a2a2a;">${book}: ${stats.correct}/${stats.total} (${Math.round((stats.correct/stats.total)*100)}%)</li>`
                ).join('')}
            </ul>
        </div>
        <div style="margin-top:12px;">
            <div style="display:flex; justify-content:space-between; font-size:14px; color:var(--muted);">
                <span>Overall Progress</span>
                <span>${accuracy}%</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width:${accuracy}%;"></div>
            </div>
        </div>
        <div class="progress-actions">
            <button class="btn" onclick="saveProgress()"> Save Progress</button>
            <button class="btn btn-secondary" onclick="loadProgressPrompt()"> Load Progress</button>
            <button class="btn btn-secondary" onclick="syncProgress()"> Sync</button>
        </div>
        <div style="margin-top:12px; text-align:center; color:var(--muted); font-size:13px;">
            ${progressData.username ? 'Logged in as ' + progressData.username + ' ' + deviceCode : 'Not logged in'}
        </div>
    `;
    area.innerHTML = html;
}

function saveProgress() {
    const username = prompt('Enter your name:', progressData.username || '');
    if (username === null) return;
    const trimmed = username.trim();
    if (trimmed === '') {
        alert('Name cannot be empty.');
        return;
    }
    progressData.username = trimmed;
    const deviceCode = initDevice();
    const playerId = trimmed + ' ' + deviceCode;
    progressData.playerId = playerId;
    saveProgressToStorage(playerId);
    updateProgressUI();
    showToast('✅ Progress saved! Player ID: ' + playerId, 'success');
}

function loadProgressPrompt() {
    const input = prompt('Enter your Player ID (e.g., Noah 3907):', '');
    if (input === null) return;
    const id = input.trim();
    if (id === '') {
        alert('Please enter a valid Player ID.');
        return;
    }
    if (loadProgress(id)) {
        updateProgressUI();
        showToast('✅ Progress loaded for ' + id, 'success');
    } else {
        showToast('❌ No progress found for: ' + id, 'error');
    }
}

async function syncProgress() {
    showToast('⚠️ Sync not available offline.', 'error');
}

// ================================================================
//  HOME MODE TOGGLE
// ================================================================
function toggleHomeMode(mode) {
    const subQuiz = document.getElementById('sub-mode-quiz');
    const subRead = document.getElementById('sub-mode-read');
    const btnQuiz = document.getElementById('mode-quiz');
    const btnRead = document.getElementById('mode-read');
    currentHomeTab = mode;
    if (mode === 'quiz') {
        subQuiz.style.display = 'block';
        subRead.style.display = 'none';
        btnQuiz.classList.add('active');
        btnRead.classList.remove('active');
        if (document.getElementById('quiz-ot-grid').children.length === 0) populateQuizGrids();
    } else {
        subQuiz.style.display = 'none';
        subRead.style.display = 'block';
        btnRead.classList.add('active');
        btnQuiz.classList.remove('active');
        if (document.getElementById('scripture-ot-grid').children.length === 0) populateScriptureGrids();
    }
}

// ================================================================
//  QUIZ GRIDS – show all books, load on click
// ================================================================
function populateQuizGrids() {
    const otGrid = document.getElementById('quiz-ot-grid');
    const ntGrid = document.getElementById('quiz-nt-grid');
    otGrid.innerHTML = '';
    ntGrid.innerHTML = '';
    ALL_BOOKS.forEach(book => {
        const isOT = BOOKS_OT.includes(book);
        const card = document.createElement('div');
        card.className = 'book-card';
        card.textContent = book;
        card.onclick = () => startBookQuiz(book);
        if (isOT) otGrid.appendChild(card);
        else ntGrid.appendChild(card);
    });
}

// ================================================================
//  SCRIPTURE GRID – show all books, load on click
// ================================================================
function populateScriptureGrids() {
    const otGrid = document.getElementById('scripture-ot-grid');
    const ntGrid = document.getElementById('scripture-nt-grid');
    otGrid.innerHTML = '';
    ntGrid.innerHTML = '';
    ALL_BOOKS.forEach(book => {
        const isOT = BOOKS_OT.includes(book);
        const card = document.createElement('div');
        card.className = 'book-card';
        card.textContent = book;
        card.onclick = () => openReader(book);
        if (isOT) otGrid.appendChild(card);
        else ntGrid.appendChild(card);
    });
}

// ================================================================
//  LOAD ALL QUIZ QUESTIONS (lazy, from all book JSON files)
// ================================================================
async function loadAllQuizQuestions() {
    const allQuestions = [];
    for (const book of ALL_BOOKS) {
        const safeName = encodeURIComponent(book);
        const filename = `quiz_data/${safeName}.json`;
        try {
            const response = await fetch(filename);
            if (!response.ok) continue;
            const questions = await response.json();
            if (Array.isArray(questions)) {
                questions.forEach(q => {
                    if (q.ref && q.question && q.options && q.answer !== undefined) {
                        allQuestions.push(q);
                    }
                });
            }
        } catch (e) {
            // silently skip
        }
    }
    console.log(`Loaded ${allQuestions.length} total quiz questions.`);
    return allQuestions;
}

// ================================================================
//  QUIZ STARTERS
// ================================================================
async function startBookQuiz(book) {
    const safeName = encodeURIComponent(book);
    const filename = `quiz_data/${safeName}.json`;
    try {
        const response = await fetch(filename);
        if (!response.ok) throw new Error('No questions');
        const bookQuestions = await response.json();
        if (bookQuestions.length === 0) {
            showToast(`📚 "${book}" has no questions yet.`, 'info');
            return;
        }
        const selected = shuffle(bookQuestions).slice(0, 10);
        const refs = selected.map(q => q.ref);
        startQuizSession(selected, `📖 ${book} Quiz`, false, refs);
    } catch (e) {
        showToast(`📚 "${book}" coming soon!`, 'info');
    }
}

async function startDailyQuiz() {
    const allQuestions = await loadAllQuizQuestions();
    if (allQuestions.length < 15) {
        showToast('⚠️ Not enough questions for Daily Quiz.', 'error');
        return;
    }
    const selected = getUnplayedQuestions(allQuestions, 15);
    if (selected.length < 15) {
        const shuffled = shuffle(allQuestions);
        const fallback = shuffled.slice(0, 15);
        const refs = fallback.map(q => q.ref);
        startQuizSession(fallback, '📅 Daily Quiz', true, refs);
        return;
    }
    const refs = selected.map(q => q.ref);
    startQuizSession(selected, '📅 Daily Quiz', true, refs);
}

async function startGlobalChallenge() {
    const allQuestions = await loadAllQuizQuestions();
    if (allQuestions.length < 30) {
        showToast('⚠️ Not enough questions for Global Challenge.', 'error');
        return;
    }
    const selected = getUnplayedQuestions(allQuestions, 30);
    if (selected.length < 30) {
        const shuffled = shuffle(allQuestions);
        const fallback = shuffled.slice(0, 30);
        const refs = fallback.map(q => q.ref);
        startQuizSession(fallback, '🌍 Global Challenge', false, refs, true);
        return;
    }
    const refs = selected.map(q => q.ref);
    startQuizSession(selected, '🌍 Global Challenge', false, refs, true);
}

// ================================================================
//  QUIZ ENGINE
// ================================================================
function startQuizSession(questions, label, isDaily = false, refs = [], isGlobal = false) {
    returnToResults = false;
    navigateTo('sec-quiz-play');
    currentQuiz.questions = questions;
    currentQuiz.index = 0;
    currentQuiz.score = 0;
    currentQuiz.timer = 30;
    currentQuiz.total = questions.length;
    currentQuiz.userAnswers = new Array(questions.length).fill(null);
    currentQuiz.questionSet = questions.slice();
    currentQuiz.selectedOption = null;
    currentQuiz.questionFinished = false;
    currentQuiz.hasAnswered = false;
    currentQuiz.isGlobalChallenge = isGlobal;
    currentQuiz.isDaily = isDaily;   // track daily
    if (currentQuiz.interval) clearInterval(currentQuiz.interval);
    renderQuiz();
}

function renderQuiz() {
    const area = document.getElementById('quiz-play-area');
    const qs = currentQuiz.questions;
    const idx = currentQuiz.index;
    if (idx >= currentQuiz.total) {
        showDetailedResults(area);
        return;
    }
    const q = qs[idx];
    const total = currentQuiz.total;
    const questionNum = idx + 1;
    const timer = currentQuiz.timer;
    const finished = currentQuiz.questionFinished;
    const hasSelected = currentQuiz.selectedOption !== null;
    let optionsHtml = '';
    const letters = ['A', 'B', 'C', 'D'];
    q.options.forEach((opt, i) => {
        const selectedClass = (currentQuiz.selectedOption === i) ? ' selected' : '';
        optionsHtml +=
            `<button class="option-btn${selectedClass}" data-optindex="${i}" onclick="selectOption(${i})" ${finished ? 'disabled' : ''}>${letters[i]}. ${opt}</button>`;
    });
    const isLast = (idx === total - 1);
    const buttonText = isLast ? ' Submit Quiz' : ' Next Question';
    const buttonDisabled = finished || !hasSelected;
    area.innerHTML = `
        <div class="quiz-header">
            <div>${currentQuiz.isGlobalChallenge ? '🌍 ' : ''}${currentQuiz.isDaily ? '📅 ' : ''}Question ${questionNum}/${total}</div>
            <div class="timer" id="q-timer-display">${timer}s</div>
            <button class="quit-btn" onclick="quitQuiz()">✕ Quit</button>
        </div>
        <div class="question-box">
            <div>${q.question}</div>
        </div>
        <div class="options-list" id="options-container">
            ${optionsHtml}
        </div>
        <div style="margin-top:15px;display:flex;justify-content:flex-end;align-items:center;flex-wrap:wrap;gap:8px;">
            <span id="feedback-message" style="font-size:14px;color:var(--muted);"></span>
        </div>
        <div style="margin-top:12px;">
            <button class="btn" id="quiz-nav-btn" ${buttonDisabled ? 'disabled' : ''} onclick="handleNavClick()">${buttonText}</button>
        </div>
    `;
    if (!finished) {
        let timeLeft = timer;
        const timerDisplay = document.getElementById('q-timer-display');
        if (currentQuiz.interval) clearInterval(currentQuiz.interval);
        currentQuiz.interval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = timeLeft + 's';
            currentQuiz.timer = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(currentQuiz.interval);
                if (!currentQuiz.questionFinished) {
                    finalizeAndAdvance();
                }
            }
        }, 1000);
    }
}

function quitQuiz() {
    if (confirm('Are you sure you want to quit? Your progress will be lost.')) {
        clearInterval(currentQuiz.interval);
        currentQuiz.questions = [];
        currentQuiz.questionSet = [];
        returnToResults = false;
        navigateTo('sec-home');
    }
}

function selectOption(index) {
    if (currentQuiz.questionFinished) return;
    currentQuiz.selectedOption = index;
    currentQuiz.hasAnswered = true;
    const options = document.querySelectorAll('.option-btn');
    options.forEach((btn, i) => {
        btn.classList.toggle('selected', i === index);
    });
    const navBtn = document.getElementById('quiz-nav-btn');
    if (navBtn) navBtn.disabled = false;
}

function handleNavClick() {
    finalizeAndAdvance();
}

function finalizeAndAdvance() {
    if (currentQuiz.questionFinished) return;
    const idx = currentQuiz.index;
    const q = currentQuiz.questions[idx];
    const finalChoice = currentQuiz.selectedOption !== null ? currentQuiz.selectedOption : -1;
    currentQuiz.userAnswers[idx] = finalChoice;
    if (finalChoice !== -1 && finalChoice === q.answer) {
        currentQuiz.score++;
    }
    currentQuiz.questionFinished = true;
    if (currentQuiz.interval) clearInterval(currentQuiz.interval);
    if (idx < currentQuiz.total - 1) {
        currentQuiz.index++;
        currentQuiz.selectedOption = null;
        currentQuiz.questionFinished = false;
        currentQuiz.hasAnswered = false;
        currentQuiz.timer = 30;
        renderQuiz();
    } else {
        currentQuiz.index = currentQuiz.total;
        renderQuiz();
    }
}

function showDetailedResults(area) {
    const qs = currentQuiz.questionSet;
    const userAnswers = currentQuiz.userAnswers;
    const total = qs.length;
    let correctCount = 0;
    let itemsHtml = '';
    const letters = ['A', 'B', 'C', 'D'];
    qs.forEach((q, i) => {
        const userAns = userAnswers[i];
        const isCorrect = (userAns === q.answer);
        if (isCorrect) correctCount++;
        const itemClass = isCorrect ? 'result-item correct-item' : 'result-item wrong-item';
        const statusText = isCorrect ? '✅ Correct' : '❌ Incorrect';
        const statusClass = isCorrect ? 'correct-status' : 'wrong-status';
        let optionsReviewHtml = '';
        q.options.forEach((opt, optIdx) => {
            let optClass = 'opt-review';
            let checkMark = '';
            const isPlayerChoice = (userAns === optIdx);
            const isCorrectAnswer = (optIdx === q.answer);
            if (isPlayerChoice && isCorrectAnswer) {
                optClass += ' player-correct';
                checkMark = '✅';
            } else if (isPlayerChoice && !isCorrectAnswer) {
                optClass += ' player-wrong';
                checkMark = '❌';
            } else if (!isPlayerChoice && isCorrectAnswer) {
                optClass += ' correct-answer';
                checkMark = '✔';
            }
            optionsReviewHtml += `
                <div class="${optClass}">
                    <span class="opt-letter">${letters[optIdx]}.</span>
                    <span class="opt-text">${opt}</span>
                    <span class="check-mark">${checkMark}</span>
                </div>
            `;
        });
        let timeoutMsg = '';
        if (userAns === -1) {
            timeoutMsg =
                '<div style="color:var(--error);font-size:13px;margin-top:6px;">⏱️ You did not answer this question in time.</div>';
        }
        const refString = q.ref;
        itemsHtml += `
            <div class="${itemClass}">
                <div class="q-header">
                    <span class="q-number">Question ${i+1}</span>
                    <span class="q-status ${statusClass}">${statusText}</span>
                </div>
                <div class="q-text">${q.question}</div>
                <div class="options-review">
                    ${optionsReviewHtml}
                </div>
                ${timeoutMsg}
                <div class="q-ref-bottom" onclick="goToVerseFromRef('${refString}')">📖 ${refString}</div>
            </div>
        `;
    });
    const percent = Math.round((correctCount / total) * 100);
    let emoji = '';
    let message = '';
    if (percent === 100) { emoji = '🌟';
        message = 'Perfect! Divine wisdom!'; } else if (percent >= 70) { emoji = '👏';
        message = 'Great job! You know the Word!'; } else if (percent >= 40) { emoji = '📖';
        message = 'Good effort! Keep reading!'; } else { emoji = '💪';
        message = 'Keep studying the Word!'; }
    if (currentPlayerId) {
        const book = currentQuiz.questionSet.length > 0 ? currentQuiz.questionSet[0].book : 'Mixed';
        if (currentQuiz.isGlobalChallenge) {
            trackQuizResult('Global Challenge', correctCount, total, false, true);
            updateGlobalLeaderboard(correctCount, total);
            challengeState.hasPlayedThisWeek = true;
            saveChallengeState();
        } else if (currentQuiz.isDaily) {
            trackQuizResult('Daily Quiz', correctCount, total, true, false);
        } else {
            trackQuizResult(book, correctCount, total, false, false);
        }
        const refs = currentQuiz.questionSet.map(q => q.ref);
        if (refs.length > 0) {
            markQuestionsPlayed(refs);
        }
        if (activeSection === 'sec-progress') {
            updateProgressUI();
        }
    }
    area.innerHTML = `
        <div class="quiz-result-detailed">
            <div class="result-summary">
                <div style="font-size:32px;">${emoji}</div>
                <div class="big-score">${correctCount}/${total}</div>
                <div style="font-size:18px;margin-top:4px;">${message}</div>
                ${currentQuiz.isGlobalChallenge ? `<div style="margin-top:8px; color:var(--primary); font-weight:600;">🌍 Global Challenge Complete!</div>` : ''}
                ${currentQuiz.isDaily ? `<div style="margin-top:8px; color:var(--primary); font-weight:600;">📅 Daily Quiz Complete!</div>` : ''}
            </div>
            <div style="margin-bottom:12px;font-weight:600;font-size:15px;color:var(--muted);">📋 Detailed Review</div>
            ${itemsHtml}
            <div class="result-actions">
                <button class="btn" onclick="redoQuiz()"> Redo Quiz</button>
                <button class="btn btn-secondary" onclick="navigateTo('sec-home')"> Go Home</button>
                ${currentQuiz.isGlobalChallenge ? `<button class="btn btn-secondary" onclick="navigateTo('sec-challenge')">🏅 Leaderboard</button>` : ''}
            </div>
        </div>
    `;
}

function redoQuiz() {
    const questions = currentQuiz.questionSet.slice();
    if (questions.length === 0) {
        navigateTo('sec-home');
        return;
    }
    startQuizSession(questions, '🔄 Redo Quiz', currentQuiz.isDaily, [], currentQuiz.isGlobalChallenge);
}

// ================================================================
//  GLOBAL LEADERBOARD
// ================================================================
function updateGlobalLeaderboard(correct, total) {
    const score = Math.round((correct / total) * 100);
    const entry = {
        name: progressData.username || 'Player',
        score: score,
        correct: correct,
        total: total,
        date: new Date().toISOString()
    };
    leaderboard.push(entry);
    leaderboard.sort((a, b) => b.score - a.score || a.correct - b.correct);
    leaderboard = leaderboard.slice(0, 50);
    saveLeaderboard();
    saveChallengeState();
}

function saveLeaderboard() {
    localStorage.setItem('rhema_global_leaderboard', JSON.stringify(leaderboard));
}

function loadLeaderboard() {
    const lb = localStorage.getItem('rhema_global_leaderboard');
    if (lb) {
        try {
            leaderboard = JSON.parse(lb);
        } catch (e) {}
    }
}

// ================================================================
//  GLOBAL CHALLENGE (timer page)
// ================================================================
function getNextSunday9pmEAT() {
    const now = new Date();
    const eatOffset = 3;
    const eatNow = new Date(now.getTime() + (eatOffset * 60 * 60 * 1000));
    const day = eatNow.getUTCDay();
    const hours = eatNow.getUTCHours();
    const minutes = eatNow.getUTCMinutes();
    let target = new Date(eatNow);
    if (day === 0 && (hours < 21 || (hours === 21 && minutes === 0))) {
        target.setUTCHours(21, 0, 0, 0);
    } else {
        let daysUntilSunday = (7 - day) % 7;
        if (daysUntilSunday === 0) daysUntilSunday = 7;
        target.setUTCDate(target.getUTCDate() + daysUntilSunday);
        target.setUTCHours(21, 0, 0, 0);
    }
    return target;
}

function getChallengeWeek() {
    const now = new Date();
    const eatNow = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    const year = eatNow.getUTCFullYear();
    const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
    const pastDaysOfYear = (eatNow - firstDayOfYear) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getUTCDay() + 1) / 7);
    return `${year}-W${weekNum}`;
}

function loadChallengeState() {
    const stored = localStorage.getItem('rhema_challenge_state');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            challengeState = parsed;
        } catch (e) {}
    }
    const currentWeek = getChallengeWeek();
    if (challengeState.currentWeek !== currentWeek) {
        challengeState.currentWeek = currentWeek;
        challengeState.hasPlayedThisWeek = false;
        challengeState.isLive = false;
        challengeState.startTime = null;
        saveChallengeState();
    }
    loadLeaderboard();
}

function saveChallengeState() {
    localStorage.setItem('rhema_challenge_state', JSON.stringify(challengeState));
}

function startGlobalChallenge() {
    navigateTo('sec-challenge');
    loadChallengeState();
    updateChallengeTimer();
    if (challengeState.timerInterval) clearInterval(challengeState.timerInterval);
    challengeState.timerInterval = setInterval(() => {
        updateChallengeTimer();
    }, 1000);
}

function updateChallengeTimer() {
    const area = document.getElementById('challenge-area');
    if (!area) return;
    const now = new Date();
    const eatNow = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    const day = eatNow.getUTCDay();
    const hours = eatNow.getUTCHours();
    const minutes = eatNow.getUTCMinutes();
    const isSunday = day === 0;
    const isAfter = isSunday && (hours > 21 || (hours === 21 && minutes >= 30));
    if (!isSunday || isAfter) {
        const nextSunday = getNextSunday9pmEAT();
        const diff = nextSunday.getTime() - eatNow.getTime();
        if (diff <= 0) {
            const nextNext = new Date(nextSunday);
            nextNext.setUTCDate(nextNext.getUTCDate() + 7);
            const diff2 = nextNext.getTime() - eatNow.getTime();
            renderChallengeWaiting(area, diff2);
        } else {
            renderChallengeWaiting(area, diff);
        }
        renderPreviousResults(area);
        return;
    }
    if (isSunday && hours === 21 && minutes < 30) {
        const elapsed = (eatNow.getTime() - new Date(eatNow).setUTCHours(21, 0, 0, 0)) / 1000;
        const remaining = 1800 - elapsed;
        if (remaining > 0) {
            renderChallengeLive(area, remaining);
            renderPreviousResults(area);
            return;
        }
    }
    if (isSunday && hours === 20 && minutes >= 30) {
        const diff = (new Date(eatNow).setUTCHours(21, 0, 0, 0) - eatNow.getTime()) / 1000;
        renderChallengeWaiting(area, diff * 1000);
        renderPreviousResults(area);
        return;
    }
    const nextSunday = getNextSunday9pmEAT();
    const diff = nextSunday.getTime() - eatNow.getTime();
    renderChallengeWaiting(area, diff);
    renderPreviousResults(area);
}

function renderChallengeWaiting(area, diffMs) {
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const display = days > 0 ?
        `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` :
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const isSunday = new Date(new Date().getTime() + (3 * 60 * 60 * 1000)).getUTCDay() === 0;
    area.innerHTML = `
        <h2 style="color:var(--primary);">🌍 Global Challenge</h2>
        <div class="challenge-timer-box">
            <div class="timer-label">${isSunday ? 'Starting in' : 'Next Challenge in'}</div>
            <div class="timer-display">${display}</div>
            <div class="challenge-status waiting">⏳ ${isSunday ? 'Challenge starts at 9:00 PM EAT' : 'Every Sunday at 9:00 PM EAT'}</div>
            ${isSunday && hours === 20 && minutes >= 30 ? `
                <div style="margin-top:12px; color:var(--primary); font-weight:600;">Get ready! Challenge starts in ${minutes}:${seconds.toString().padStart(2,'0')}</div>
            ` : ''}
        </div>
        ${renderPreviousResultsHTML()}
        <div style="margin-top:15px;">
            <button class="btn btn-secondary" onclick="navigateTo('sec-home')">← Back to Home</button>
        </div>
    `;
}

function renderChallengeLive(area, remainingSeconds) {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = Math.floor(remainingSeconds % 60);
    const display = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const hasPlayed = challengeState.hasPlayedThisWeek;
    area.innerHTML = `
        <h2 style="color:var(--primary);">🌍 Global Challenge</h2>
        <div class="challenge-timer-box">
            <div class="timer-label">⏱️ Challenge ends in</div>
            <div class="timer-display" style="color:var(--success);">${display}</div>
            <div class="challenge-status live">🔴 LIVE NOW</div>
        </div>
        ${renderPreviousResultsHTML()}
        <div style="margin-top:15px;">
            ${hasPlayed ? 
                `<div style="text-align:center; color:var(--muted); padding:12px; background:#1a1a1a; border-radius:8px;">
                    ✅ You've already participated in this week's challenge!
                 </div>` :
                `<button class="btn" onclick="startGlobalChallengeGame()">▶ Join Challenge</button>`
            }
            <button class="btn btn-secondary" style="margin-top:8px;" onclick="navigateTo('sec-home')">← Back to Home</button>
        </div>
    `;
}

async function startGlobalChallengeGame() {
    const allQuestions = await loadAllQuizQuestions();
    if (allQuestions.length < 30) {
        showToast('⚠️ Not enough questions for Global Challenge.', 'error');
        return;
    }
    const selected = getUnplayedQuestions(allQuestions, 30);
    if (selected.length < 30) {
        const shuffled = shuffle(allQuestions);
        const fallback = shuffled.slice(0, 30);
        const refs = fallback.map(q => q.ref);
        startQuizSession(fallback, '🌍 Global Challenge', false, refs, true);
        return;
    }
    const refs = selected.map(q => q.ref);
    startQuizSession(selected, '🌍 Global Challenge', false, refs, true);
}

function renderPreviousResultsHTML() {
    const lb = leaderboard.slice(0, 10);
    if (lb.length === 0) {
        return `<div class="previous-results-box"><h4>📊 Previous Results</h4><p style="color:var(--muted);">No previous results yet.</p></div>`;
    }
    const trophies = ['🥇', '🥈', '🥉'];
    let html = `<div class="previous-results-box"><h4>🏆 Top 10 Leaderboard</h4><div class="leaderboard-list">`;
    lb.forEach((entry, idx) => {
        const rank = idx + 1;
        let rankClass = '';
        let trophy = '';
        if (rank === 1) { rankClass = 'gold';
            trophy = trophies[0]; } else if (rank === 2) { rankClass = 'silver';
            trophy = trophies[1]; } else if (rank === 3) { rankClass = 'bronze';
            trophy = trophies[2]; }
        html += `
            <div class="leader-item">
                <span class="rank ${rankClass}">${trophy || '#' + rank}</span>
                <span class="name">${entry.name}</span>
                <span class="score">${entry.score}% (${entry.correct}/${entry.total})</span>
            </div>
        `;
    });
    html += `</div></div>`;
    return html;
}

function renderPreviousResults(area) {
    // Already rendered via renderPreviousResultsHTML
}

// ================================================================
//  READER – Load Bible data from Bible-niv/ on demand
// ================================================================
let _currentBibleData = null;
let _currentBook = '';

async function openReaderTo(book, chapter, verse) {
    const safeName = encodeURIComponent(book);
    const filename = `Bible-niv/${safeName}.json`;
    try {
        const response = await fetch(filename);
        if (!response.ok) throw new Error('Book not found');
        const rawData = await response.json();

        const chapterMap = {};
        rawData.chapters.forEach(ch => {
            chapterMap[ch.chapter] = ch.verses.map(v => v.text);
        });

        const chapters = Object.keys(chapterMap).map(Number).sort((a, b) => a - b);
        if (chapters.length === 0) {
            showToast(`📖 "${book}" has no chapters.`, 'error');
            return;
        }

        let targetChapter = chapter;
        if (isNaN(targetChapter) || !chapterMap[targetChapter]) {
            targetChapter = chapters[0];
        }

        _currentBibleData = chapterMap;
        _currentBook = book;

        populateReaderDropdownsWithData(book, chapters);
        document.getElementById('reader-book-select').value = book;
        document.getElementById('reader-chapter-select').value = targetChapter;

        highlightVerse = verse ? { book: book, chapter: targetChapter, verse } : null;
        navigateTo('sec-reader', true);
        loadReaderChapterWithData(chapterMap, book, targetChapter);

        if (returnToResults) {
            document.getElementById('readerBackBtn').textContent = '← Back to Results';
            document.getElementById('readerBackBtn').style.borderColor = 'var(--primary)';
        } else {
            document.getElementById('readerBackBtn').textContent = '← Back';
            document.getElementById('readerBackBtn').style.borderColor = '';
        }

        if (highlightVerse) {
            setTimeout(() => {
                const content = document.getElementById('reader-content');
                const lines = content.querySelectorAll('.verse-line');
                for (let line of lines) {
                    const data = line.dataset;
                    if (data.book === book && Number(data.chapter) === targetChapter && Number(data.verse) === verse) {
                        line.classList.add('highlight');
                        line.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        break;
                    }
                }
            }, 300);
        }
    } catch (e) {
        showToast(`📖 "${book}" not found.`, 'error');
    }
}

function loadReaderChapterWithData(data, book, chapter) {
    const content = document.getElementById('reader-content');
    const verses = data[chapter];
    if (!verses) {
        content.innerHTML = `<p style="color:var(--muted);">No verses for ${book} ${chapter}.</p>`;
        return;
    }
    let html = `<h3>${book} ${chapter}</h3>`;
    verses.forEach((text, i) => {
        const v = i + 1;
        const isHighlight = highlightVerse && highlightVerse.book === book && highlightVerse.chapter === chapter && highlightVerse.verse === v;
        const highlightClass = isHighlight ? ' highlight' : '';
        html += `<div class="verse-line${highlightClass}" data-book="${book}" data-chapter="${chapter}" data-verse="${v}">
                    <span class="v-num">${v}.</span> ${text}
                </div>`;
    });
    content.innerHTML = html;
    // Track progress
    if (currentPlayerId) {
        const chapterKey = book + ':' + chapter;
        if (!progressData.scripture.chaptersRead.includes(chapterKey)) {
            progressData.scripture.chaptersRead.push(chapterKey);
            progressData.scripture.versesRead += verses.length;
            saveProgressToStorage(currentPlayerId);
        }
        if (!progressData.scripture.booksRead.includes(book)) {
            progressData.scripture.booksRead.push(book);
            saveProgressToStorage(currentPlayerId);
        }
    }
    // Auto‑scroll to top when chapter changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function populateReaderDropdownsWithData(book, chapters) {
    const bookSelect = document.getElementById('reader-book-select');
    bookSelect.innerHTML = '';
    ALL_BOOKS.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        bookSelect.appendChild(opt);
    });
    bookSelect.value = book;
    const chapterSelect = document.getElementById('reader-chapter-select');
    chapterSelect.innerHTML = '';
    chapters.forEach(ch => {
        const opt = document.createElement('option');
        opt.value = ch;
        opt.textContent = `Chapter ${ch}`;
        chapterSelect.appendChild(opt);
    });
    chapterSelect.value = chapterSelect.options[0]?.value || chapters[0];
}

function loadReaderChapter() {
    const book = document.getElementById('reader-book-select').value;
    let chapter = parseInt(document.getElementById('reader-chapter-select').value, 10);
    if (isNaN(chapter) || chapter < 1) {
        const select = document.getElementById('reader-chapter-select');
        if (select.options.length > 0) {
            chapter = parseInt(select.options[0].value, 10);
        } else {
            chapter = 1;
        }
    }
    if (_currentBibleData && _currentBook === book) {
        loadReaderChapterWithData(_currentBibleData, book, chapter);
    } else {
        openReaderTo(book, chapter, null);
    }
}

// ================================================================
//  GO TO VERSE FROM REF STRING (robust parsing)
// ================================================================
function goToVerseFromRef(ref) {
    console.log('goToVerseFromRef called with ref:', ref);
    const match = ref.match(/^(.+?)\s+(\d+):(\d+)$/);
    if (!match) {
        showToast(`Invalid reference format: "${ref}"`, 'error');
        return;
    }
    const book = match[1].trim();
    const chapter = parseInt(match[2], 10);
    const verse = parseInt(match[3], 10);
    console.log('Parsed:', { book, chapter, verse });
    const fullBook = getFullName(book);
    console.log('Normalized book:', fullBook);
    if (!fullBook) {
        showToast(`📖 Book "${book}" not recognized.`, 'error');
        return;
    }
    returnToResults = true;
    openReaderTo(fullBook, chapter, verse);
}

function goToVerse(book, chapter, verse) {
    console.log('goToVerse called with:', { book, chapter, verse });
    const fullBook = getFullName(book);
    if (!fullBook) {
        showToast(`📖 Book "${book}" not recognized.`, 'error');
        return;
    }
    returnToResults = true;
    openReaderTo(fullBook, chapter, verse);
}

function openReader(book) {
    openReaderTo(book, 1, null);
}

function goBackFromReader() {
    if (returnToResults) {
        returnToResults = false;
        const area = document.getElementById('quiz-play-area');
        if (area && area.innerHTML.includes('quiz-result-detailed')) {
            navigateTo('sec-quiz-play');
            return;
        }
    }
    navigateTo('sec-home');
    toggleHomeMode('read');
}

function readerPrevChapter() {
    const book = document.getElementById('reader-book-select').value;
    const current = parseInt(document.getElementById('reader-chapter-select').value);
    if (current > 1) {
        document.getElementById('reader-chapter-select').value = current - 1;
        loadReaderChapter();
    }
}

function readerNextChapter() {
    const book = document.getElementById('reader-book-select').value;
    const current = parseInt(document.getElementById('reader-chapter-select').value);
    if (_currentBibleData && _currentBook === book) {
        const chapters = Object.keys(_currentBibleData).map(Number).sort((a, b) => a - b);
        const max = Math.max(...chapters);
        if (current < max) {
            document.getElementById('reader-chapter-select').value = current + 1;
            loadReaderChapter();
        }
    }
}

// ================================================================
//  UTILITY
// ================================================================
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ================================================================
//  PWA INSTALL
// ================================================================
function setupPWAInstall() {
    const installBtn = document.getElementById('installAppBtn');
    const installStatus = document.getElementById('installStatus');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
    if (isStandalone) {
        installBtn.textContent = '✅ App Installed';
        installBtn.disabled = true;
        installStatus.innerHTML =
            'Rhema is already installed on your device. <button class="header-btn" onclick="shareApp()" style="display:inline-block; margin-left:8px;">📤 Share</button>';
        installStatus.className = 'install-status-msg success';
        return;
    }
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.textContent = '📲 Install Rhema App';
        installBtn.disabled = false;
        installStatus.textContent = 'Tap "Install" to add Rhema to your home screen.';
        installStatus.className = 'install-status-msg';
    });
    window.addEventListener('appinstalled', () => {
        installBtn.textContent = '✅ App Installed';
        installBtn.disabled = true;
        installStatus.innerHTML =
            'Rhema has been successfully installed! <button class="header-btn" onclick="shareApp()" style="display:inline-block; margin-left:8px;">📤 Share</button>';
        installStatus.className = 'install-status-msg success';
        deferredPrompt = null;
    });
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const result = await deferredPrompt.userChoice;
            if (result.outcome === 'accepted') {
                installBtn.textContent = '✅ App Installed';
                installBtn.disabled = true;
                installStatus.innerHTML =
                    'Rhema installed successfully! <button class="header-btn" onclick="shareApp()" style="display:inline-block; margin-left:8px;">📤 Share</button>';
                installStatus.className = 'install-status-msg success';
            } else {
                installStatus.textContent = 'Installation declined. You can try again later.';
                installStatus.className = 'install-status-msg';
            }
            deferredPrompt = null;
        } else {
            installStatus.textContent = '💡 Tap the share icon and select "Add to Home Screen"';
            installStatus.className = 'install-status-msg';
        }
    });
}

function shareApp() {
    if (navigator.share) {
        navigator.share({
            title: 'Rhema Bible Quiz',
            text: 'Check out Rhema - an interactive Bible Quiz and Reading app!',
            url: window.location.href
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(window.location.href).then(() => {
            showToast('📋 Link copied to clipboard!', 'success');
        }).catch(() => {
            alert('Share not supported. Please share the URL: ' + window.location.href);
        });
    }
}

// ================================================================
//  INIT
// ================================================================
document.addEventListener('DOMContentLoaded', async function() {
    const deviceCode = initDevice();
    const savedPlayer = localStorage.getItem('rhema_current_player');
    if (savedPlayer) {
        loadProgress(savedPlayer);
    }

    loadChallengeState();

    navigateTo('sec-auth');
    document.getElementById('login-form').addEventListener('submit', handleAuth);

    // Reader events
    document.getElementById('reader-book-select').addEventListener('change', function() {
        const book = this.value;
        openReaderTo(book, 1, null);
    });
    document.getElementById('reader-chapter-select').addEventListener('change', loadReaderChapter);

    populateQuizGrids();
    populateScriptureGrids();

    setupPWAInstall();

    // Offline handling
    window.addEventListener('online', () => {
        document.getElementById('offline-screen').classList.remove('show');
    });
    window.addEventListener('offline', () => {
        document.getElementById('offline-screen').classList.add('show');
    });

    if (!navigator.onLine) {
        document.getElementById('offline-screen').classList.add('show');
    }

    console.log('✝ Rhema loaded – ready to fetch data on demand.');
});