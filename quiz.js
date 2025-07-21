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
        const mode = urlParams.get('mode');

        let query = supabase.from('words').select('*');

        if (mode === 'learned') {
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

            // 퀴즈 정보 업데이트
            const totalWords = words.length;
            if (mode === 'learned') {
                quizInfo.textContent = `총 ${totalWords}개의 단어를 복습해야 해요!`;
            } else {
                const reviewCount = words.filter(word => word.learned).length;
                quizInfo.textContent = `총 ${totalWords}개의 단어 중 ${reviewCount}개를 복습해야 해요!`;
            }

            if (words.length > 0) {
                showNextWord();
            } else {
                koreanQuiz.textContent = mode === 'learned' ? '복습할 단어가 없습니다!' : '단어장에 단어를 추가해주세요.';
            }
        }
    };

    const showNextWord = () => {
        card.classList.remove('flipped');
        
        setTimeout(() => {
            if (words.length > 0) {
                const randomIndex = Math.floor(Math.random() * words.length);
                currentWord = words[randomIndex];
                koreanQuiz.textContent = currentWord.korean;
                japaneseQuiz.textContent = currentWord.japanese;
                hiraganaQuizFront.textContent = currentWord.hiragana;
                quizLearnedCheckbox.checked = currentWord.learned;
            }
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