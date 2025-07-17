document.addEventListener('DOMContentLoaded', () => {
    const SUPABASE_URL = 'https://evkvkaygvasckxgeytqb.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2a3ZrYXlndmFzY2t4Z2V5dHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MzcxNjEsImV4cCI6MjA2ODMxMzE2MX0.H8lPBay8MnCn-7ixAM-enFU3LOD1Jm6Hj_6rHyAMD3E';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const card = document.querySelector('.card');
    const koreanQuiz = document.getElementById('korean-quiz');
    const japaneseQuiz = document.getElementById('japanese-quiz');
    const hiraganaQuiz = document.getElementById('hiragana-quiz');
    const nextButton = document.getElementById('next-button');

    let words = [];
    let currentWord = null;

    const fetchWords = async () => {
        const { data, error } = await supabase.from('words').select('*');
        if (error) {
            console.error('Error fetching words:', error);
            koreanQuiz.textContent = '단어를 불러오는 데 실패했습니다.';
        } else {
            words = data;
            if (words.length > 0) {
                showNextWord();
            } else {
                koreanQuiz.textContent = '단어장에 단어를 추가해주세요.';
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
                hiraganaQuiz.textContent = `(${currentWord.hiragana})`;
            }
        }, 300); // Allow flip-back animation to finish
    };

    card.addEventListener('click', () => {
        card.classList.toggle('flipped');
    });

    nextButton.addEventListener('click', showNextWord);

    fetchWords();
}); 