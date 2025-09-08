// --- 設定 ---
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRxeHaQzaWE38QznyYbhF9nqALDxkwqyQpQ4jecK_zCMHAegeVFh4Uh6wu9L2_TDQm5MF0zDjX95GIM/pub?gid=231824102&single=true&output=tsv';
const TOTAL_QUESTIONS = 10;
const TIME_LIMIT = 300;

// --- DOM要素の取得 ---
const screens = {
    start: document.getElementById('start-screen'),
    quiz: document.getElementById('quiz-screen'),
    results: document.getElementById('results-screen'),
};
const buttons = {
    start: document.getElementById('start-button'),
    restart: document.getElementById('restart-button'),
    hint: document.getElementById('hint-button'),
};
const elements = {
    answerForm: document.getElementById('answer-form'),
    answerInput: document.getElementById('answer-input'),
    questionCounter: document.getElementById('question-counter'),
    timerDisplay: document.getElementById('timer'),
    questionText: document.getElementById('question-text'),
    feedback: document.getElementById('feedback'),
    scoreText: document.getElementById('score-text'),
    resultMessage: document.getElementById('result-message'),
    loader: document.getElementById('loader'),
    loadingError: document.getElementById('loading-error'),
    hintArea: document.getElementById('hint-area'),
    hintText: document.getElementById('hint-text'),
    answerFormatText: document.getElementById('answer-format-text'),
};

// --- 状態管理 ---
let allQuestions = [], quizQuestions = [], currentQuestionIndex = 0, score = 0, timerInterval;

// --- イベントリスナー ---
buttons.start.addEventListener('click', startQuiz);
buttons.restart.addEventListener('click', restartQuiz);
elements.answerForm.addEventListener('submit', handleAnswerSubmit);
buttons.hint.addEventListener('click', showHint);

// --- スプレッドシート読み込み ---
async function loadQuestionsFromSheet() {
    if (!SPREADSHEET_URL) {
        showError('スプレッドシートのURLが設定されていません。');
        return false;
    }
    elements.loader.classList.remove('hidden');
    buttons.start.disabled = true;
    elements.loadingError.classList.add('hidden');
    try {
        const response = await fetch(SPREADSHEET_URL);
        if (!response.ok) throw new Error(`ネットワーク応答エラー: ${response.statusText}`);
        const tsvText = await response.text();

        allQuestions = tsvText.trim().split(/\r?\n/).slice(1).map(row => {
            const columns = row.split('\t');
            if (columns.length < 4) return null; // 列が足りない行は無視
            return { question: columns[0], answer: columns[1], hint: columns[2], format: columns[3] };
        }).filter(q => q && q.question && q.answer && q.format);

        if (allQuestions.length < TOTAL_QUESTIONS) {
            throw new Error(`問題数が不足しています。${TOTAL_QUESTIONS}問以上必要です (現在${allQuestions.length}問)。`);
        }
        buttons.start.disabled = false;
        return true;
    } catch (error) {
        console.error('問題の読み込み失敗:', error);
        showError(error.message);
        return false;
    } finally {
        elements.loader.classList.add('hidden');
    }
}

// --- クイズロジック ---
function startQuiz() {
    screens.start.classList.add('hidden');
    screens.quiz.classList.remove('hidden');

    quizQuestions = [...allQuestions].sort(() => 0.5 - Math.random()).slice(0, TOTAL_QUESTIONS);
    currentQuestionIndex = 0;
    score = 0;

    startTimer();
    loadNextQuestion();
}

function loadNextQuestion() {
    if (currentQuestionIndex >= TOTAL_QUESTIONS) {
        showResults();
        return;
    }
    const q = quizQuestions[currentQuestionIndex];
    elements.questionCounter.textContent = `第${currentQuestionIndex + 1}問 / ${TOTAL_QUESTIONS}問`;
    elements.questionText.innerHTML = formatMath(q.question);
    elements.answerFormatText.innerHTML = formatMath(q.format);

    elements.hintArea.classList.add('hidden');
    buttons.hint.disabled = !q.hint;
    elements.hintText.textContent = '';
    elements.answerInput.value = '';
    elements.answerInput.focus();
}

function handleAnswerSubmit(e) {
    e.preventDefault();
    const userAnswer = elements.answerInput.value;
    if (userAnswer === "") return;

    checkAnswer(userAnswer);
    currentQuestionIndex++;

    const submitButton = elements.answerForm.querySelector('button');
    submitButton.disabled = true;
    setTimeout(() => {
        elements.feedback.innerHTML = '';
        loadNextQuestion();
        submitButton.disabled = false;
    }, 1500);
}

function checkAnswer(userAnswer) {
    const currentQuestion = quizQuestions[currentQuestionIndex];
    const isCorrect = userAnswer.replace(/\s/g, '') === currentQuestion.answer;
    if (isCorrect) {
        score++;
        elements.feedback.innerHTML = '<span class="text-green-500 feedback">正解！</span>';
    } else {
        elements.feedback.innerHTML = `<span class="text-red-500 feedback">不正解... 正解は ${currentQuestion.answer}</span>`;
    }
}

function showResults() {
    clearInterval(timerInterval);
    screens.quiz.classList.add('hidden');
    screens.results.classList.remove('hidden');

    elements.scoreText.textContent = `${score} / ${TOTAL_QUESTIONS}`;

    let message = '';
    const percentage = score / TOTAL_QUESTIONS;
    if (percentage === 1) message = '素晴らしい！全問正解です！';
    else if (percentage >= 0.7) message = 'おめでとうございます！高得点です！';
    else if (percentage >= 0.4) message = 'よく頑張りました！';
    else message = 'もう少し頑張りましょう！';
    elements.resultMessage.textContent = message;
}

function showHint() {
    const q = quizQuestions[currentQuestionIndex];
    if (q.hint) {
        elements.hintText.textContent = `ヒント: ${q.hint}`;
        elements.hintArea.classList.remove('hidden');
        buttons.hint.disabled = true;
    }
}

function startTimer() {
    let timeLeft = TIME_LIMIT;
    updateTimerDisplay(timeLeft);
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay(timeLeft);
        if (timeLeft < 0) {
            clearInterval(timerInterval);
            showResults();
        }
    }, 1000);
}

function updateTimerDisplay(timeLeft) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    elements.timerDisplay.textContent = `残り時間: ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// --- ヘルパー関数 ---
function showError(message) {
    elements.loadingError.textContent = message;
    elements.loadingError.classList.remove('hidden');
}

function formatMath(text) {
    return text.replace(/<=/g, '≦').replace(/>=/g, '≧').replace(/\^2/g, '<sup>2</sup>');
}

function restartQuiz() {
    screens.results.classList.add('hidden');
    screens.start.classList.remove('hidden');
}

// --- 初期化 ---
loadQuestionsFromSheet();
