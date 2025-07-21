document.addEventListener('DOMContentLoaded', () => {
    const koreanInput = document.getElementById('korean-input');
    const japaneseOutput = document.getElementById('japanese-output');
    const hiraganaOutput = document.getElementById('hiragana-output');
    const addButton = document.getElementById('add-button');
    const wordList = document.getElementById('word-list');
    const suggestionBox = document.querySelector('.suggestion-box');
    const unlearnedFilterCheckbox = document.getElementById('unlearned-filter-checkbox');

    const SUPABASE_URL = 'https://evkvkaygvasckxgeytqb.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2a3ZrYXlndmFzY2t4Z2V5dHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MzcxNjEsImV4cCI6MjA2ODMxMzE2MX0.H8lPBay8MnCn-7ixAM-enFU3LOD1Jm6Hj_6rHyAMD3E';

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let debounceTimer;
    let allWords = []; // 모든 단어를 저장할 배열

    const renderWords = (words) => {
        wordList.innerHTML = '';
        if (words && words.length > 0) {
            words.sort((a, b) => a.id - b.id);
            
            const header = document.createElement('div');
            header.id = 'word-list-header';
            header.innerHTML = `
                <span class="num-col">번호</span>
                <span class="word-col">한글</span>
                <span class="word-col">일본어</span>
                <span class="word-col">히라가나</span>
                <span class="check-col">완료</span>
                <span class="delete-col"></span>
            `;
            wordList.appendChild(header);

            words.forEach((word, index) => {
                console.log('Word data:', word); // 전체 word 객체 확인
                console.log('Word ID:', word.id); // ID 값 확인
                
                const li = document.createElement('li');
                li.setAttribute('data-id', word.id); // li에 id 추가
                li.classList.toggle('learned', word.learned);

                li.innerHTML = `
                    <span class="word-item-num">${index + 1}</span>
                    <span class="word-item">${word.korean || ''}</span>
                    <span class="word-item">${word.japanese || ''}</span>
                    <span class="word-item editable" contenteditable="true" data-field="hiragana">${word.hiragana || ''}</span>
                    <span class="check-col">
                        <input type="checkbox" class="learned-checkbox" ${word.learned ? 'checked' : ''}>
                    </span>
                    <button class="delete-button" data-id="${word.id}">🗑️</button>
                `;
                wordList.appendChild(li);
            });
        }
    };

    const applyFilter = () => {
        const showOnlyUnlearned = unlearnedFilterCheckbox.checked;
        localStorage.setItem('unlearnedFilter', showOnlyUnlearned); // 필터 상태 저장
        if (showOnlyUnlearned) {
            const unlearnedWords = allWords.filter(word => !word.learned);
            renderWords(unlearnedWords);
        } else {
            renderWords(allWords);
        }
    };

    const fetchWords = async () => {
        console.log('Fetching words from Supabase...'); // 디버깅 로그
        const { data: words, error } = await supabase.from('words').select('*');
        if (error) {
            console.error('Error fetching words:', error);
        } else {
            console.log('Fetched words:', words); // 디버깅 로그
            allWords = words; // 가져온 단어를 전역 변수에 저장
            applyFilter(); // 필터 적용하여 렌더링
        }
    };

    const updateWord = async (id, field, value) => {
        const { error } = await supabase
            .from('words')
            .update({ [field]: value })
            .eq('id', id);

        if (error) {
            console.error('Error updating word:', error);
            alert('단어 업데이트에 실패했습니다.');
        }
    };

    const addWord = async () => {
        const korean = koreanInput.value.trim();
        const japanese = japaneseOutput.value.trim();
        const hiragana = hiraganaOutput.value.trim();

        if (korean && japanese) {
            const { error } = await supabase.from('words').insert([{ 
                korean, 
                japanese, 
                hiragana: hiragana || japanese, // 히라가나 비어있으면 일본어로 채움
                learned: false 
            }]);
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
            console.log(`Attempting to delete word with ID: ${id}`); // 디버깅 로그 강화
            if (!id || id === 'undefined') {
                console.error('Delete function called with invalid ID:', id);
                alert('유효하지 않은 ID이므로 삭제할 수 없습니다.');
                return;
            }

            const { error } = await supabase
                .from('words')
                .delete()
                .eq('id', id);
            
            if (error) {
                console.error('Error deleting word from Supabase:', error);
                alert(`삭제에 실패했습니다: ${error.message}`);
            } else {
                console.log('Word deleted successfully');
                fetchWords(); // 목록 새로고침
            }
        } catch (err) {
            console.error('A critical error occurred during delete operation:', err);
            alert('삭제 중 심각한 오류가 발생했습니다.');
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

            // 2단계: 일본어 -> 히라가나 변환 (임시 비활성화 - CORS 문제로 인해)
            hiraganaOutput.value = translatedText; // 임시로 일본어와 동일하게 표시
            
            /* CORS 문제로 임시 비활성화
            try {
                const hiraResponse = await fetch(`https://jlp.yahooapis.jp/FuriganaService/V2/furigana?appid=dj00aiZpPVhSMEtUd2loTFlYYSZzPWNvbnN1bWVyc2VjcmV0Jng9Njc-&grade=1&sentence=${encodeURIComponent(translatedText)}`);

                if (hiraResponse.ok) {
                    const hiraData = await hiraResponse.json();
                    if (hiraData.result && hiraData.result.word) {
                        const furigana = hiraData.result.word.map(w => w.furigana || w.surface).join('');
                        hiraganaOutput.value = furigana;
                    } else {
                        hiraganaOutput.value = translatedText;
                    }
                } else {
                     hiraganaOutput.value = translatedText;
                }
            } catch (hiraError) {
                console.error('Hiragana conversion failed:', hiraError);
                hiraganaOutput.value = translatedText;
            }
            */

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

    unlearnedFilterCheckbox.addEventListener('change', applyFilter);

    wordList.addEventListener('change', (e) => {
        if (e.target.classList.contains('learned-checkbox')) {
            const li = e.target.closest('li');
            const id = li.dataset.id;
            const isLearned = e.target.checked;
            li.classList.toggle('learned', isLearned);
            updateWord(id, 'learned', isLearned).then(() => {
                const wordToUpdate = allWords.find(w => w.id == id);
                if(wordToUpdate) wordToUpdate.learned = isLearned;
                applyFilter();
            });
        }
    });

    wordList.addEventListener('focusout', (e) => {
        if (e.target.classList.contains('editable') && e.target.dataset.field === 'hiragana') {
            const li = e.target.closest('li');
            const id = li.dataset.id;
            const newValue = e.target.textContent.trim();
            updateWord(id, 'hiragana', newValue);
        }
    });

    wordList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-button')) {
            const idStr = e.target.getAttribute('data-id');
            console.log('Delete button clicked, data-id attribute:', idStr); // 디버깅 로그
            
            if (idStr && idStr !== 'undefined' && confirm('이 단어를 삭제하시겠습니까?')) {
                const id = parseInt(idStr, 10);
                
                if (!isNaN(id)) {
                    await deleteWord(id);
                } else {
                    console.error('Parsed ID is not a number:', idStr);
                    alert('ID가 숫자가 아니므로 삭제할 수 없습니다.');
                }
            } else {
                console.error('Cannot delete, ID is invalid or confirmation was cancelled. ID:', idStr);
                if (!idStr || idStr === 'undefined') {
                    alert('ID가 없어 단어를 삭제할 수 없습니다.');
                }
            }
        }
    });

    japaneseOutput.readOnly = false;
    hiraganaOutput.readOnly = false;
    
    // 페이지 로드 시 저장된 필터 상태 복원
    unlearnedFilterCheckbox.checked = localStorage.getItem('unlearnedFilter') === 'true';
    fetchWords();
}); 