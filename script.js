// --- 設定 ---
const SPREADSHEET_URLS = {
    math1: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRxeHaQzaWE38QznyYbhF9nqALDxkwqyQpQ4jecK_zCMHAegeVFh4Uh6wu9L2_TDQm5MF0zDjX95GIM/pub?gid=231824102&single=true&output=tsv',
    trigonometry: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-hyftW-YKwRbP5KhOOneJEZrDHKVaXQibVOpvtRkQRt4oZJtNTrucd6crSiJBTYov0khpjbTixMKQ/pub?gid=436998403&single=true&output=tsv'
};
// TOTAL_QUESTIONS は全問出題するので不要に
// TIME_LIMIT も不要に

// --- DOM要素 ---
// (変更なし)
const screens = { start: document.getElementById('start-screen'), quiz: document.getElementById('quiz-screen'), results: document.getElementById('results-screen') };
const buttons = { restart: document.getElementById('restart-button'), hint: document.getElementById('hint-button'), next: document.getElementById('next-button') };
const elements = { courseSelection: document.getElementById('course-selection'), answerForm: document.getElementById('answer-form'), answerInput: document.getElementById('answer-input'), questionCounter: document.getElementById('question-counter'), questionText: document.getElementById('question-text'), feedback: document.getElementById('feedback'), scoreText: document.getElementById('score-text'), resultMessage: document.getElementById('result-message'), loader: document.getElementById('loader'), loadingError: document.getElementById('loading-error'), hintArea: document.getElementById('hint-area'), hintText: document.getElementById('hint-text'), answerFormatText: document.getElementById('answer-format-text') };

// --- 状態管理 ---
let allQuestions = {};
let quizQuestions = [], userAnswers = [], currentQuestionIndex = 0, score = 0;
// timerInterval は不要に

// --- イベントリスナー ---
elements.courseSelection.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        const course = e.target.dataset.course;
        startQuiz(course);
    }
});
buttons.restart.addEventListener('click', restartQuiz);
elements.answerForm.addEventListener('submit', handleAnswerSubmit);
buttons.hint.addEventListener('click', showHint);
buttons.next.addEventListener('click', () => loadNextQuestion(false)); // 次の問題を読み込む

// --- スプレッドシート読み込み (変更なし) ---
async function loadAllSheets() { /* ... */ }

// --- クイズロジック ---
function startQuiz(course) {
    if (!allQuestions[course] || allQuestions[course].length === 0) {
        alert(`${course} の問題が読み込めていません。`);
        return;
    }

    // ★変更: ランダム化せず、全問題を順番通りに設定
    quizQuestions = allQuestions[course];

    userAnswers = [];
    screens.start.classList.add('hidden');
    screens.quiz.classList.remove('hidden');
    currentQuestionIndex = 0;
    score = 0;

    // ★変更: タイマー開始を削除
    loadNextQuestion(true); // 最初の問題を表示
}

function loadNextQuestion(isFirstQuestion = false) {
    if (!isFirstQuestion) {
        currentQuestionIndex++;
    }
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

    // ★追加: ボタンの状態をリセット
    elements.answerForm.querySelector('.btn-submit').classList.remove('hidden');
    buttons.next.classList.add('hidden');
    elements.answerInput.disabled = false;
}

function handleAnswerSubmit(e) {
    e.preventDefault();
    const userAnswer = elements.answerInput.value;
    if (userAnswer === "") return;

    const isCorrect = checkAnswer(userAnswer);
    userAnswers.push({ question: quizQuestions[currentQuestionIndex], answer: userAnswer, isCorrect });

    // ★変更: setTimeoutを削除し、ボタンの表示を切り替える
    elements.answerForm.querySelector('.btn-submit').classList.add('hidden');
    buttons.next.classList.remove('hidden');
    elements.answerInput.disabled = true; // 答えの変更を防ぐ
}

function checkAnswer(userAnswer) { /* ...変更なし... */ }
function showResults() { /* ...変更なし... */ }

// --- 初期化とヘルパー関数 ---
function restartQuiz() {
    screens.results.classList.add('hidden');
    screens.start.classList.remove('hidden');
}
function showHint() { /* ... */ }
function formatMath(text) { /* ... */ }
function showError(message) { /* ... */ }

// --- ページ読み込み時に実行 ---
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#course-selection button').forEach(button => {
        button.disabled = true;
        button.textContent = "準備中...";
    });
    loadAllSheets();
});

// 以下、省略した関数の全コードです。
async function loadAllSheets() {
    elements.loader.classList.remove('hidden');
    elements.loadingError.classList.add('hidden');
    try {
        let loadedCount = 0;
        const promises = Object.keys(SPREADSHEET_URLS).map(async (course) => {
            const url = SPREADSHEET_URLS[course];
            const button = document.querySelector(`[data-course="${course}"]`);
            if (!url || url.includes('ここに')) {
                button.disabled = true;
                button.style.backgroundColor = '#6c757d';
                return;
            };
            const response = await fetch(url);
            if (!response.ok) throw new Error(`${courseDisplayNames[course]} のシートでネットワークエラー`);
            const tsvText = await response.text();
            allQuestions[course] = tsvText.trim().split(/\r?\n/).slice(1).map(row => {
                const columns = row.split('\t');
                return { question: columns[0], answer: columns[1], hint: columns[2], format: columns[3] };
            }).filter(q => q && q.question && q.answer);
            if (allQuestions[course].length > 0) {
                loadedCount++;
                button.disabled = false;
                button.textContent = courseDisplayNames[course];
            } else {
                button.disabled = true;
                button.style.backgroundColor = '#6c757d';
            }
        });
        await Promise.all(promises);
        if(loadedCount === 0) throw new Error("読み込める問題がありません。URLを確認してください。");
    } catch (error) {
        console.error('問題の読み込み失敗:', error);
        showError(error.message);
    } finally {
        elements.loader.classList.add('hidden');
    }
}
const courseDisplayNames = { math1: '数学ⅠA (二次関数など)', trigonometry: '数学ⅠA (三角比)'};
function checkAnswer(userAnswer) { const currentQuestion = quizQuestions[currentQuestionIndex]; const sanitizedUserAnswer = userAnswer.replace(/\s/g, ''); const correctAnswers = currentQuestion.answer.split('|'); let isCorrect = false; for (const singleAnswer of correctAnswers) { if (sanitizedUserAnswer === singleAnswer.replace(/\s/g, '')) { isCorrect = true; break; } } if (isCorrect) { score++; elements.feedback.innerHTML = '<span class="text-green-500 feedback">正解！</span>'; } else { elements.feedback.innerHTML = `<span class="text-red-500 feedback">不正解... 正解は ${correctAnswers[0]}</span>`; } return isCorrect; }
function showResults() { screens.quiz.classList.add('hidden'); screens.results.classList.remove('hidden'); elements.scoreText.textContent = `${score} / ${quizQuestions.length}`; let resultDetailsHTML = '<div class="text-left mt-4 max-h-48 overflow-y-auto">'; userAnswers.forEach((item, index) => { if (!item.isCorrect) { resultDetailsHTML += `<div class="mb-2 border-b pb-2"><p class="text-red-600 font-bold">【${index + 1}問目】不正解</p><p class="ml-4">問題: ${formatMath(item.question.question)}</p><p class="ml-4">あなたの答え: <span class="text-red-500">${item.answer}</span></p><p class="ml-4">正解: <span class="text-green-500">${item.question.answer.split('|')[0]}</span></p></div>`; } }); resultDetailsHTML += '</div>'; let message = ''; const percentage = score / quizQuestions.length; if (percentage === 1) message = '素晴らしい！全問正解です！'; else message = '間違えた問題を確認して、しっかり復習しよう！'; elements.resultMessage.innerHTML = message + resultDetailsHTML; }
function showHint() { const q = quizQuestions[currentQuestionIndex]; if (q && q.hint) { elements.hintText.textContent = `ヒント: ${q.hint}`; elements.hintArea.classList.remove('hidden'); buttons.hint.disabled = true; } }
function formatMath(text) { if(!text) return ''; return text.replace(/<=/g, '≦').replace(/>=/g, '≧').replace(/\^2/g, '<sup>2</sup>'); }
function showError(message) { elements.loadingError.textContent = message; elements.loadingError.classList.remove('hidden'); }
