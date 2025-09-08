// --- 設定部分 ---
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRxeHaQzaWE38QznyYbhF9nqALDxkwqyQpQ4jecK_zCMHAegeVFh4Uh6wu9L2_TDQm5MF0zDjX95GIM/pub?gid=231824102&single=true&output=csv";

// DOM要素の取得
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const answerForm = document.getElementById('answer-form');
const answerInput = document.getElementById('answer-input');
const questionCounter = document.getElementById('question-counter');
const timerDisplay = document.getElementById('timer');
const questionTypeText = document.getElementById('question-type');
const questionText = document.getElementById('question-text');
const feedback = document.getElementById('feedback');
const scoreText = document.getElementById('score-text');
const resultMessage = document.getElementById('result-message');

// クイズの設定
const TOTAL_QUESTIONS = 10;
const TIME_LIMIT = 300; // 5分 = 300秒

// クイズの状態を管理する変数
let allProblems = [];
let quizProblems = [];
let currentQuestionIndex = 0;
let score = 0;
let timerInterval;
let timeLeft = TIME_LIMIT;

// --- イベントリスナー ---
startButton.addEventListener('click', startQuiz);
restartButton.addEventListener('click', restartQuiz);
answerForm.addEventListener('submit', handleAnswerSubmit);


// --- スプレッドシートから問題を読み込む関数 ---
async function loadProblemsFromSheet() {
    try {
        const response = await fetch(SHEET_URL);
        if (!response.ok) {
            throw new Error('ネットワークの応答が正しくありませんでした。');
        }
        const csvText = await response.text();

        allProblems = csvText
            .trim()
            .split('\n')
            .slice(1) // ヘッダー行をスキップ
            .map(row => {
                // CSVの行をカンマで分割しますが、答えにカンマが含まれる可能性を考慮
                const parts = row.split(',');
                const type = parts[0];
                const question = parts[1];
                // 答えは3番目以降の要素をすべて結合する
                const answer = parts.slice(2).join(',');
                return { type, question, answer: answer.trim().replace(/"/g, '') }; // 前後の空白と不要な引用符を削除
            });

        if (allProblems.length === 0) {
            throw new Error('スプレッドシートから問題が読み込めませんでした。');
        }
        console.log("読み込んだ問題:", allProblems);

    } catch (error) {
        console.error('問題の読み込みに失敗しました:', error);
        alert('問題の読み込みに失敗しました。URLやスプレッドシートの公開設定を確認してください。');
    }
}

// --- クイズのメインロジック ---

async function startQuiz() {
    startButton.disabled = true;
    startButton.textContent = "問題 загрузка..."; // ロシア語で "loading..."

    await loadProblemsFromSheet();
    if (allProblems.length === 0) {
        startButton.disabled = false;
        startButton.textContent = "クイズ開始";
        return;
    }

    quizProblems = allProblems.sort(() => 0.5 - Math.random()).slice(0, TOTAL_QUESTIONS);

    startScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');

    currentQuestionIndex = 0;
    score = 0;
    timeLeft = TIME_LIMIT;

    clearInterval(timerInterval);
    startTimer();
    loadNextQuestion();

    startButton.disabled = false;
    startButton.textContent = "クイズ開始";
}

function restartQuiz() {
    resultsScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
}

function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            showResults();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `残り時間: ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function loadNextQuestion() {
    if (currentQuestionIndex >= quizProblems.length) {
        showResults();
        return;
    }

    const currentQuestion = quizProblems[currentQuestionIndex];

    questionCounter.textContent = `第${currentQuestionIndex + 1}問 / ${quizProblems.length}問`;
    questionTypeText.textContent = currentQuestion.type;
    questionText.innerHTML = currentQuestion.question; // スプレッドシートの数式をHTMLとして解釈
    answerInput.value = '';
    answerInput.focus();

    currentQuestionIndex++;
}

function handleAnswerSubmit(e) {
    e.preventDefault();
    const userAnswer = answerInput.value;
    if (!userAnswer) return;

    checkAnswer(userAnswer);

    answerForm.querySelector('button').disabled = true; // ボタンを一時的に無効化
    setTimeout(() => {
        feedback.innerHTML = '';
        loadNextQuestion();
        answerForm.querySelector('button').disabled = false; // ボタンを有効に戻す
    }, 1200);
}

function checkAnswer(userAnswer) {
    const currentQuestion = quizProblems[currentQuestionIndex - 1];
    const sanitizedUserAnswer = userAnswer.replace(/\s/g, '');
    const correctAnswers = currentQuestion.answer.split('|');

    let isCorrect = false;
    for (const singleAnswer of correctAnswers) {
        const sanitizedCorrectAnswer = singleAnswer.replace(/\s/g, '');
        if (sanitizedUserAnswer === sanitizedCorrectAnswer) {
            isCorrect = true;
            break;
        }
    }

    if (isCorrect) {
        score++;
        feedback.innerHTML = '<span class="text-green-500 feedback">正解！</span>';
    } else {
        feedback.innerHTML = `<span class="text-red-500 feedback">不正解... 正解は <code>${correctAnswers[0]}</code></span>`;
    }
}

function showResults() {
    clearInterval(timerInterval);
    quizScreen.classList.add('hidden');
    resultsScreen.classList.remove('hidden');

    scoreText.textContent = `${score} / ${quizProblems.length}`;

    let message = '';
    const percentage = score / quizProblems.length;
    if (percentage === 1) {
        message = '素晴らしい！全問正解です！';
    } else if (percentage >= 0.7) {
        message = 'おめでとうございます！高得点です！';
    } else if (percentage >= 0.4) {
        message = 'よく頑張りました！';
    } else {
        message = 'もう少し頑張りましょう！';
    }
    resultMessage.textContent = message;
}
