document.addEventListener('DOMContentLoaded', () => {
    const SUPABASE_URL = 'https://evkvkaygvasckxgeytqb.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2a3ZrYXlndmFzY2t4Z2V5dHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MzcxNjEsImV4cCI6MjA2ODMxMzE2MX0.H8lPBay8MnCn-7ixAM-enFU3LOD1Jm6Hj_6rHyAMD3E';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const card = document.querySelector('.card');
    const koreanQuiz = document.getElementById('korean-quiz');
    const japaneseQuiz = document.getElementById('japanese-quiz');
    const hiraganaQuizFront = document.getElementById('hiragana-quiz-front');
    const quizLearnedCheckbox = document.getElementById('quiz-learned-checkbox');
    const nextButton = document.getElementById('next-button');
    const quizInfo = document.getElementById('quiz-info');

    let words = [];
    let currentWord = null;
    let remainingWords = [];
    let quizMode = 'all';

    const updateWordLearnedStatus = async (id, isLearned) => {
        const { error } = await supabase
            .from('words')
            .update({ learned: isLearned })
            .eq('id', id);
        if (error) {
            console.error('Error updating word status:', error);
        }
    };

    const fetchWords = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        quizMode = urlParams.get('mode');

        let query = supabase.from('words').select('*');

        if (quizMode === 'learned') {
            document.querySelector('h1').textContent = '복습할 단어 퀴즈';
            query = query.eq('learned', true);
        } else {
            document.querySelector('h1').textContent = '전체 단어 퀴즈';
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching words:', error);
            quizInfo.textContent = '';
            koreanQuiz.textContent = '단어를 불러오는 데 실패했습니다.';
        } else {
            words = data;
            remainingWords = [...words]; // 퀴즈 풀 단어 목록 복사
            updateQuizInfo(); // 정보 업데이트
            if (remainingWords.length > 0) {
                showNextWord();
            } else {
                koreanQuiz.textContent = quizMode === 'learned' ? '복습할 단어가 없습니다!' : '단어장에 단어를 추가해주세요.';
            }
        }
    };

    const updateQuizInfo = () => {
        const totalWords = words.length;
        if (quizMode === 'learned') {
            quizInfo.textContent = `총 ${totalWords}개의 단어를 복습합니다. (${totalWords - remainingWords.length + 1}/${totalWords})`;
        } else {
            const currentCount = totalWords - remainingWords.length + 1;
            quizInfo.textContent = `총 ${totalWords}개의 단어 중 ${currentCount}번째`;
        }
    };

    const showNextWord = () => {
        card.classList.remove('flipped');
        
        if (remainingWords.length === 0) {
            quizInfo.textContent = "퀴즈 끝! 참 잘했어요! 🎉";
            koreanQuiz.textContent = "";
            japaneseQuiz.textContent = "";
            hiraganaQuizFront.textContent = "";
            quizLearnedCheckbox.style.display = 'none';
            return;
        }

        setTimeout(() => {
            const randomIndex = Math.floor(Math.random() * remainingWords.length);
            currentWord = remainingWords[randomIndex];
            remainingWords.splice(randomIndex, 1); // 출제된 단어는 목록에서 제거

            koreanQuiz.textContent = currentWord.korean;
            japaneseQuiz.textContent = currentWord.japanese;
            hiraganaQuizFront.textContent = currentWord.hiragana;
            quizLearnedCheckbox.checked = currentWord.learned;
            quizLearnedCheckbox.style.display = 'inline-block';

            updateQuizInfo(); // 정보 업데이트
        }, 300); // Allow flip-back animation to finish
    };

    card.addEventListener('click', () => {
        card.classList.toggle('flipped');
    });

    quizLearnedCheckbox.addEventListener('change', () => {
        if (currentWord) {
            const isLearned = quizLearnedCheckbox.checked;
            currentWord.learned = isLearned; // 로컬 상태 즉시 업데이트
            updateWordLearnedStatus(currentWord.id, isLearned);
        }
    });

    nextButton.addEventListener('click', showNextWord);

    fetchWords();
}); 