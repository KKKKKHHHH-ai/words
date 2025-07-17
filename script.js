document.addEventListener('DOMContentLoaded', () => {
    const koreanInput = document.getElementById('korean-input');
    const japaneseOutput = document.getElementById('japanese-output');
    const hiraganaOutput = document.getElementById('hiragana-output');
    const addButton = document.getElementById('add-button');
    const wordList = document.getElementById('word-list');
    const suggestionBox = document.querySelector('.suggestion-box');

    const SUPABASE_URL = 'https://evkvkaygvasckxgeytqb.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2a3ZrYXlndmFzY2t4Z2V5dHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MzcxNjEsImV4cCI6MjA2ODMxMzE2MX0.H8lPBay8MnCn-7ixAM-enFU3LOD1Jm6Hj_6rHyAMD3E';

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let debounceTimer;

    const renderWords = (words) => {
        wordList.innerHTML = '';
        if (words) {
            words.sort((a, b) => a.id - b.id);
            
            const header = document.createElement('div');
            header.id = 'word-list-header';
            header.innerHTML = `
                <span class="num-col">번호</span>
                <span class="word-col">한글</span>
                <span class="word-col">일본어</span>
                <span class="word-col">히라가나</span>
                <span class="delete-col"></span>
            `;
            wordList.appendChild(header);

            words.forEach((word, index) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="word-item-num">${index + 1}</span>
                    <span class="word-item">${word.korean}</span>
                    <span class="word-item">${word.japanese}</span>
                    <span class="word-item">${word.hiragana}</span>
                    <button class="delete-button" data-id="${word.id}">🗑️</button>
                `;
                wordList.appendChild(li);
            });
        }
    };

    const fetchWords = async () => {
        const { data: words, error } = await supabase.from('words').select('*');
        if (error) {
            console.error('Error fetching words:', error);
        } else {
            renderWords(words);
        }
    };

    const addWord = async () => {
        const korean = koreanInput.value.trim();
        const japanese = japaneseOutput.value.trim();
        const hiragana = hiraganaOutput.value.trim();

        if (korean && japanese && hiragana) {
            const { error } = await supabase.from('words').insert([{ korean, japanese, hiragana }]);
            if (error) {
                console.error('Error adding word:', error);
            } else {
                koreanInput.value = '';
                japaneseOutput.value = '';
                hiraganaOutput.value = '';
                fetchWords(); 
            }
        }
    };

    const deleteWord = async (id) => {
        try {
            console.log('Deleting word with ID:', id); // 디버깅 로그
            const { error } = await supabase
                .from('words')
                .delete()
                .eq('id', id);
            
            if (error) {
                console.error('Error deleting word:', error);
                alert('삭제에 실패했습니다: ' + error.message);
            } else {
                console.log('Word deleted successfully');
                fetchWords(); // 목록 새로고침
            }
        } catch (err) {
            console.error('Delete operation failed:', err);
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    const translateAndFill = async (text) => {
        if (!text) return;

        japaneseOutput.value = '번역 중...';
        hiraganaOutput.value = '변환 중...';

        try {
            // 1단계: 한국어 -> 일본어 번역
            const encodedText = encodeURIComponent(text);
            const apiUrl = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=ko|ja`;
            
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            let translatedText;

            if (data.responseData && data.responseData.translatedText) {
                translatedText = data.responseData.translatedText;
                japaneseOutput.value = translatedText;
            } else {
                throw new Error('Invalid API response');
            }

            // 2단계: 일본어 -> 히라가나 변환 (API 교체)
            try {
                const hiraResponse = await fetch(`https://jlp.yahooapis.jp/FuriganaService/V2/furigana?appid=dj00aiZpPVhSMEtUd2loTFlYYSZzPWNvbnN1bWVyc2VjcmV0Jng9Njc-&grade=1&sentence=${encodeURIComponent(translatedText)}`);

                if (hiraResponse.ok) {
                    const hiraData = await hiraResponse.json();
                    if (hiraData.result && hiraData.result.word) {
                        const furigana = hiraData.result.word.map(w => w.furigana || w.surface).join('');
                        hiraganaOutput.value = furigana;
                    } else {
                        hiraganaOutput.value = translatedText; // 실패 시 한자 표시
                    }
                } else {
                     hiraganaOutput.value = translatedText; // 실패 시 한자 표시
                }
            } catch (hiraError) {
                console.error('Hiragana conversion failed:', hiraError);
                hiraganaOutput.value = translatedText; // 실패 시 한자 표시
            }

        } catch (error) {
            console.error('Translation failed:', error);
            japaneseOutput.value = '번역 실패';
            hiraganaOutput.value = '';
        }
    };
    
    const showSuggestions = (inputValue) => {
        suggestionBox.innerHTML = '';
        if (inputValue.length === 0) {
            return;
        }

        const suggestions = Object.keys(dictionary).filter(key => key.startsWith(inputValue));

        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.classList.add('suggestion-item');
            item.textContent = suggestion;
            item.addEventListener('click', () => {
                koreanInput.value = suggestion;
                const translation = dictionary[suggestion];
                japaneseOutput.value = translation.japanese;
                hiraganaOutput.value = translation.hiragana;
                suggestionBox.innerHTML = '';
            });
            suggestionBox.appendChild(item);
        });
    };

    koreanInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const inputValue = koreanInput.value.trim();
        showSuggestions(inputValue);
        
        if (!inputValue) {
            japaneseOutput.value = '';
            hiraganaOutput.value = '';
            return;
        }

        const translation = dictionary[inputValue];
        if (translation) {
            japaneseOutput.value = translation.japanese;
            hiraganaOutput.value = translation.hiragana;
        } else {
            japaneseOutput.value = '...';
            hiraganaOutput.value = '...';
            debounceTimer = setTimeout(() => {
                translateAndFill(inputValue);
            }, 500);
        }
    });

    document.addEventListener('click', (e) => {
        if (!koreanInput.contains(e.target)) {
            suggestionBox.innerHTML = '';
        }
    });

    addButton.addEventListener('click', addWord);

    wordList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-button')) {
            const idStr = e.target.getAttribute('data-id');
            console.log('Delete button clicked, ID string:', idStr); // 디버깅 로그
            
            if (idStr && confirm('이 단어를 삭제하시겠습니까?')) {
                const id = parseInt(idStr, 10);
                console.log('Parsed ID:', id); // 디버깅 로그
                
                if (!isNaN(id)) {
                    await deleteWord(id);
                } else {
                    console.error('Invalid ID:', idStr);
                    alert('잘못된 ID입니다.');
                }
            }
        }
    });

    japaneseOutput.readOnly = false;
    hiraganaOutput.readOnly = false;
    
    fetchWords();
}); 