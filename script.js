// --- 設定 ---
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRxeHaQzaWE38QznyYbhF9nqALDxkwqyQpQ4jecK_zCMHAegeVFh4Uh6wu9L2_TDQm5MF0zDjX95GIM/pub?gid=231824102&single=true&output=tsv';

// --- DOM要素 ---
const screens = {
    start: document.getElementById('start-screen'),
    quiz: document.getElementById('quiz-screen'),
    results: document.getElementById('results-screen'),
};
const buttons = {
    start: document.getElementById('start-button'),
    restart: document.getElementById('restart-button'),
    hint: document.getElementById('hint-button'),
    next: document.getElementById('next-button'),
};
const elements = {
    answerForm: document.getElementById('answer-form'),
    answerInput: document.getElementById('answer-input'),
    questionCounter: document.getElementById('question-counter'),
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
let allQuestions = [], quizQuestions = [], currentQuestionIndex = 0, score = 0;

// --- イベントリスナー ---
buttons.start.addEventListener('click', startQuiz);
buttons.restart.addEventListener('click', restartQuiz);
elements.answerForm.addEventListener('submit', handleAnswerSubmit);
buttons.hint.addEventListener('click', showHint);
buttons.next.addEventListener('click', loadNextQuestion);

// --- スプレッドシート読み込み ---
async function loadQuestionsFromSheet() {
    if (!SPREADSHEET_URL || SPREADSHEET_URL.includes('ここに')) {
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
            if (columns.length < 4) return null;
            return { question: columns[0], answer: columns[1], hint: columns[2], format: columns[3] };
        }).filter(q => q && q.question && q.answer && q.format);

        if (allQuestions.length === 0) {
            throw new Error(`問題が読み込めませんでした。シートの形式や問題数を確認してください。`);
        }
        buttons.start.disabled = false;
        buttons.start.textContent = 'クイズ開始';
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
    quizQuestions = [...allQuestions];

    screens.start.classList.add('hidden');
    screens.quiz.classList.remove('hidden');

    currentQuestionIndex = 0;
    score = 0;

    loadNextQuestion();
}

function loadNextQuestion() {
    if (currentQuestionIndex >= quizQuestions.length) {
        showResults();
        return;
    }

    elements.feedback.innerHTML = '';
    const q = quizQuestions[currentQuestionIndex];

    elements.questionCounter.textContent = `第${currentQuestionIndex + 1}問 / ${quizQuestions.length}問`;
    elements.questionText.innerHTML = formatMath(q.question);
    elements.answerFormatText.innerHTML = formatMath(q.format);

    elements.hintArea.classList.add('hidden');
    buttons.hint.disabled = !q.hint;
    elements.hintText.textContent = '';
    elements.answerInput.value = '';
    elements.answerInput.focus();

    elements.answerForm.querySelector('.btn-submit').classList.remove('hidden');
    buttons.next.classList.add('hidden');
    elements.answerInput.disabled = false;

    currentQuestionIndex++;
}

function handleAnswerSubmit(e) {
    e.preventDefault();
    const userAnswer = elements.answerInput.value;
    if (userAnswer === "") return;

    checkAnswer(userAnswer);

    elements.answerForm.querySelector('.btn-submit').classList.add('hidden');
    buttons.next.classList.remove('hidden');
    elements.answerInput.disabled = true;
}

function checkAnswer(userAnswer) {
    const currentQuestion = quizQuestions[currentQuestionIndex - 1];
    const sanitizedUserAnswer = userAnswer.replace(/\s/g, '');
    const correctAnswers = currentQuestion.answer.split('|');

    let isCorrect = false;
    for (const singleAnswer of correctAnswers) {
        if (sanitizedUserAnswer === singleAnswer.replace(/\s/g, '')) {
            isCorrect = true;
            break;
        }
    }

    if (isCorrect) {
        score++;
        elements.feedback.innerHTML = '<span class="text-green-500">正解！</span>';
    } else {
        elements.feedback.innerHTML = `<span class="text-red-500">不正解... 正解は ${correctAnswers[0]}</span>`;
    }
}

function showResults() {
    screens.quiz.classList.add('hidden');
    screens.results.classList.remove('hidden');

    elements.scoreText.textContent = `${score} / ${quizQuestions.length}`;

    let message = '';
    const percentage = score / quizQuestions.length;
    if (percentage === 1) message = '素晴らしい！全問正解です！';
    else if (percentage >= 0.7) message = 'おめでとうございます！高得点です！';
    else if (percentage >= 0.4) message = 'よく頑張りました！';
    else message = 'もう少し頑張りましょう！';
    elements.resultMessage.textContent = message;
}

// --- ヘルパー関数と初期化 ---
function restartQuiz() {
    screens.results.classList.add('hidden');
    screens.start.classList.remove('hidden');
}
function showHint() {
    const q = quizQuestions[currentQuestionIndex - 1];
    if (q.hint) {
        elements.hintText.textContent = `ヒント: ${q.hint}`;
        elements.hintArea.classList.remove('hidden');
        buttons.hint.disabled = true;
    }
}
function formatMath(text) {
    return text.replace(/<=/g, '≦').replace(/>=/g, '≧').replace(/\^2/g, '<sup>2</sup>');
}
function showError(message) {
    elements.loadingError.textContent = message;
    elements.loadingError.classList.remove('hidden');
}

// --- ページ読み込み時に実行 ---
loadQuestionsFromSheet();
