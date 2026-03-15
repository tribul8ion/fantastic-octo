// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();

// Состояние приложения (хранит ротации для всех комбинаций)
const appState = {
    main: { default: [], farm: [], pvp: [], raid: [] },
    buffer: { default: [], farm: [], pvp: [], raid: [] }
};

let currentCharacter = 'main';
let currentProfile = 'default';

// Иконки SVG для кнопок
const ICONS = {
    up: `<svg viewBox="0 0 24 24"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>`,
    down: `<svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>`,
    delete: `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`,
    empty: `<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 9h-2V7h-2v5H6v2h2v5h2v-5h2v-2z"/></svg>`
};

// Загрузка данных
function loadInitialData() {
    const initData = tg.initDataUnsafe;
    if (initData.start_param) {
        try {
            const data = JSON.parse(atob(initData.start_param));
            // Восстанавливаем состояние (если бот прислал полное дерево)
            if (data.state) Object.assign(appState, data.state);
            currentCharacter = data.character || 'main';
            currentProfile = data.profile || 'default';
        } catch (e) {
            console.error('Ошибка парсинга данных:', e);
            setDefaultSkills();
        }
    } else {
        setDefaultSkills();
    }
    
    document.getElementById('character').value = currentCharacter;
    updateProfileButtons();
    updateUI();
}

function setDefaultSkills() {
    appState.main.default = [
        { key: 'F1', delay: 2.5 },
        { key: 'F2', delay: 1.2 },
        { key: 'F3', delay: 4.0 }
    ];
}

function getActiveSkills() {
    return appState[currentCharacter][currentProfile];
}

// Генерация списка клавиш с оптигруппами (геймерский стиль)
function generateKeyOptions(selectedKey) {
    const fKeys = Array.from({length: 12}, (_, i) => `F${i+1}`);
    const numKeys = ['1','2','3','4','5','6','7','8','9','0','-','='];
    const charKeys = ['Q','W','E','R','T','Y','U','I','O','P','A','S','D','F','G','H','J','K','L','Z','X','C','V','B','N','M'];

    const renderGroup = (label, keys) => `
        <optgroup label="${label}">
            ${keys.map(k => `<option value="${k}" ${k === selectedKey ? 'selected' : ''}>${k}</option>`).join('')}
        </optgroup>
    `;

    return renderGroup('F-Панель', fKeys) + renderGroup('Цифры', numKeys) + renderGroup('Буквы', charKeys);
}

// Обновление интерфейса
function updateUI() {
    const skills = getActiveSkills();
    const container = document.getElementById('skillsList');
    
    if (skills.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                ${ICONS.empty}
                <div style="font-size: 15px; font-weight: 500;">Макрос пуст</div>
                <div style="font-size: 13px; margin-top: 4px;">Добавьте скиллы для ротации</div>
            </div>
        `;
    } else {
        container.innerHTML = skills.map((skill, index) => `
            <div class="skill-item">
                <div class="skill-number">${index + 1}</div>
                <div class="skill-content">
                    <div class="skill-input-group">
                        <label>Клавиша</label>
                        <select onchange="updateSkill(${index}, 'key', this.value)">
                            ${generateKeyOptions(skill.key)}
                        </select>
                    </div>
                    <div class="skill-input-group">
                        <label>Откат (сек)</label>
                        <input type="number" value="${skill.delay}" min="0.1" step="0.1"
                               onchange="updateSkill(${index}, 'delay', parseFloat(this.value) || 0.1)">
                    </div>
                </div>
                <div class="skill-actions">
                    <button class="action-btn" onclick="moveSkill(${index}, -1)" ${index === 0 ? 'disabled' : ''}>${ICONS.up}</button>
                    <button class="action-btn" onclick="moveSkill(${index}, 1)" ${index === skills.length - 1 ? 'disabled' : ''}>${ICONS.down}</button>
                    <button class="action-btn delete" onclick="deleteSkill(${index})">${ICONS.delete}</button>
                </div>
            </div>
        `).join('');
    }

    // Подсчет времени цикла
    const totalTime = skills.reduce((sum, skill) => sum + (parseFloat(skill.delay) || 0), 0);
    document.getElementById('totalTimeDisplay').textContent = `Общее время макроса: ${totalTime.toFixed(1)}s`;

    // Управление главной кнопкой ТГ
    if (skills.length > 0) {
        tg.MainButton.setText('💾 СОХРАНИТЬ РОТАЦИЮ');
        tg.MainButton.show();
    } else {
        tg.MainButton.hide();
    }
}

// Функции управления скиллами
function updateSkill(index, field, value) {
    getActiveSkills()[index][field] = value;
    updateUI();
}

function addSkill() {
    tg.HapticFeedback.impactOccurred('light');
    getActiveSkills().push({ key: 'F1', delay: 1.0 });
    updateUI();
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function deleteSkill(index) {
    tg.HapticFeedback.impactOccurred('medium');
    getActiveSkills().splice(index, 1);
    updateUI();
}

function moveSkill(index, direction) {
    tg.HapticFeedback.selectionChanged();
    const skills = getActiveSkills();
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= skills.length) return;
    
    [skills[index], skills[newIndex]] = [skills[newIndex], skills[index]];
    updateUI();
}

function updateProfileButtons() {
    document.querySelectorAll('.profile-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.profile === currentProfile);
    });
}

// Отправка данных боту
function saveRotation() {
    const payload = {
        character: currentCharacter,
        profile: currentProfile,
        activeSkills: getActiveSkills(),
        state: appState // Отправляем все дерево, чтобы бот мог сохранить всё
    };
    
    tg.sendData(JSON.stringify(payload));
    tg.HapticFeedback.notificationOccurred('success');
}

// Слушатели событий
document.getElementById('addSkillBtn').addEventListener('click', addSkill);

document.getElementById('character').addEventListener('change', (e) => {
    tg.HapticFeedback.selectionChanged();
    currentCharacter = e.target.value;
    updateUI();
});

document.getElementById('profileGrid').addEventListener('click', (e) => {
    if (e.target.classList.contains('profile-btn')) {
        tg.HapticFeedback.selectionChanged();
        currentProfile = e.target.dataset.profile;
        updateProfileButtons();
        updateUI();
    }
});

tg.MainButton.onClick(saveRotation);

// Запуск
loadInitialData();