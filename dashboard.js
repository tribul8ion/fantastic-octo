// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.BackButton.show();
tg.BackButton.onClick(() => tg.close());

// Глобальное состояние
let dashboardData = null;
let autoRefreshInterval = null;
let ws = null;
let reconnectTimeout = null;

// API Configuration
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:8765' 
    : 'http://192.168.1.18:8765';
const WS_URL = API_BASE.replace('http', 'ws') + '/ws';

// WebSocket подключение
function connectWebSocket() {
    try {
        ws = new WebSocket(WS_URL);
        
        ws.onopen = () => {
            console.log('✅ WebSocket connected');
            showToast('🟢 Подключено к серверу');
            
            // Запрашиваем начальные данные
            ws.send(JSON.stringify({ action: 'refresh' }));
        };
        
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                
                if (message.type === 'update') {
                    dashboardData = message.data;
                    renderDashboard();
                }
                else if (message.type === 'pong') {
                    console.log('Pong received');
                }
            } catch (e) {
                console.error('WebSocket message error:', e);
            }
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        ws.onclose = () => {
            console.log('❌ WebSocket disconnected');
            showToast('🔴 Соединение потеряно');
            
            // Переподключение через 5 секунд
            reconnectTimeout = setTimeout(() => {
                console.log('🔄 Reconnecting...');
                connectWebSocket();
            }, 5000);
        };
        
    } catch (error) {
        console.error('WebSocket connection error:', error);
        // Fallback на REST API
        loadDashboardREST();
    }
}

// Загрузка через REST API (fallback)
async function loadDashboardREST() {
    try {
        const [statusRes, charsRes, systemRes, clickersRes] = await Promise.all([
            fetch(`${API_BASE}/api/status`),
            fetch(`${API_BASE}/api/characters`),
            fetch(`${API_BASE}/api/system`),
            fetch(`${API_BASE}/api/clickers`)
        ]);
        
        const status = await statusRes.json();
        const chars = await charsRes.json();
        const system = await systemRes.json();
        const clickers = await clickersRes.json();
        
        dashboardData = {
            status: status.status,
            uptime: status.uptime,
            characters: chars.characters,
            system: system,
            clickers: clickers.clickers,
            timestamp: Date.now()
        };
        
        renderDashboard();
        
    } catch (error) {
        console.error('REST API error:', error);
        // Показываем демо-данные
        dashboardData = getDemoData();
        renderDashboard();
    }
}

// Загрузка данных
async function loadDashboard() {
    try {
        const initData = tg.initDataUnsafe;
        
        // Если бот передал данные через start_param
        if (initData.start_param) {
            try {
                dashboardData = JSON.parse(atob(initData.start_param));
                renderDashboard();
            } catch (e) {
                console.error('Ошибка парсинга данных:', e);
            }
        }
        
        // Подключаемся к WebSocket для live-обновлений
        connectWebSocket();
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showError('Не удалось загрузить данные');
    }
}

// Демо-данные для разработки
function getDemoData() {
    return {
        status: 'online',
        uptime: 7234,
        characters: {
            main: {
                label: 'Основной',
                is_alive: true,
                is_connected: true,
                hp: 87,
                cp: 92,
                xp: 45.3,
                death_count: 2,
                disconnect_count: 0
            },
            buffer: {
                label: 'Бафер',
                is_alive: true,
                is_connected: true,
                hp: 100,
                cp: 100,
                xp: 12.7,
                death_count: 0,
                disconnect_count: 1
            }
        },
        system: {
            cpu: 45,
            ram: 62,
            gpu_temp: 72,
            cpu_temp: 68
        },
        clickers: {
            main: {
                state: 'running',
                cycles: 1247,
                total_clicks: 7482,
                cps: 2.3,
                uptime: 7200
            }
        },
        last_update: new Date().toISOString()
    };
}

// Рендеринг дашборда
function renderDashboard() {
    if (!dashboardData) return;
    
    updateStatusBadge();
    
    const content = document.getElementById('content');
    content.innerHTML = `
        ${renderStatsGrid()}
        ${renderCharacters()}
        ${renderSystemInfo()}
        ${renderActions()}
    `;
}

// Обновление статус-бейджа
function updateStatusBadge() {
    const badge = document.getElementById('statusBadge');
    const isOnline = dashboardData.status === 'online';
    
    badge.className = `status-badge ${isOnline ? '' : 'offline'}`;
    badge.innerHTML = `
        <span class="pulse"></span>
        <span>${isOnline ? 'Онлайн' : 'Оффлайн'} • ${formatUptime(dashboardData.uptime)}</span>
    `;
}

// Рендеринг статистики
function renderStatsGrid() {
    const chars = Object.values(dashboardData.characters);
    const totalDeaths = chars.reduce((sum, c) => sum + (c.death_count || 0), 0);
    const totalDisconnects = chars.reduce((sum, c) => sum + (c.disconnect_count || 0), 0);
    const avgXP = chars.reduce((sum, c) => sum + (c.xp || 0), 0) / chars.length;
    
    const clickers = Object.values(dashboardData.clickers || {});
    const totalCycles = clickers.reduce((sum, c) => sum + (c.cycles || 0), 0);
    
    return `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">💀 Смерти</div>
                <div class="stat-value">${totalDeaths}</div>
                <div class="stat-subtitle">Всего за сессию</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">🔌 Дисконнекты</div>
                <div class="stat-value">${totalDisconnects}</div>
                <div class="stat-subtitle">Всего за сессию</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">💠 Средний XP</div>
                <div class="stat-value">${avgXP.toFixed(1)}%</div>
                <div class="stat-subtitle">По всем персонажам</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">⚔️ Циклы</div>
                <div class="stat-value">${totalCycles}</div>
                <div class="stat-subtitle">Кликер активен</div>
            </div>
        </div>
    `;
}

// Рендеринг персонажей
function renderCharacters() {
    const chars = dashboardData.characters;
    
    return `
        <div class="characters-section">
            <div class="section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                Персонажи
            </div>
            ${Object.entries(chars).map(([id, char]) => renderCharacterCard(id, char)).join('')}
        </div>
    `;
}

// Рендеринг карточки персонажа
function renderCharacterCard(id, char) {
    const statusIcon = !char.is_connected ? '🔌' : !char.is_alive ? '💀' : '✅';
    const statusClass = !char.is_connected ? 'disconnected' : !char.is_alive ? 'dead' : 'alive';
    
    return `
        <div class="character-card">
            <div class="character-header">
                <div class="character-name">
                    ${char.label}
                </div>
                <div class="character-status">
                    <div class="status-icon ${statusClass}">${statusIcon}</div>
                </div>
            </div>
            <div class="bars-container">
                <div class="bar-row">
                    <div class="bar-label">HP</div>
                    <div class="bar-wrapper">
                        <div class="bar-fill hp" style="width: ${char.hp}%">
                            <div class="bar-value">${char.hp}%</div>
                        </div>
                    </div>
                </div>
                <div class="bar-row">
                    <div class="bar-label">CP</div>
                    <div class="bar-wrapper">
                        <div class="bar-fill cp" style="width: ${char.cp}%">
                            <div class="bar-value">${char.cp}%</div>
                        </div>
                    </div>
                </div>
                <div class="bar-row">
                    <div class="bar-label">XP</div>
                    <div class="bar-wrapper">
                        <div class="bar-fill xp" style="width: ${char.xp}%">
                            <div class="bar-value">${char.xp.toFixed(1)}%</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Рендеринг системной информации
function renderSystemInfo() {
    const sys = dashboardData.system;
    
    return `
        <div class="system-info">
            <div class="section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
                </svg>
                Система
            </div>
            <div class="info-row">
                <div class="info-label">CPU</div>
                <div class="info-value" style="color: ${getColorForValue(sys.cpu)}">${sys.cpu}%</div>
            </div>
            <div class="info-row">
                <div class="info-label">RAM</div>
                <div class="info-value" style="color: ${getColorForValue(sys.ram)}">${sys.ram}%</div>
            </div>
            <div class="info-row">
                <div class="info-label">GPU Temp</div>
                <div class="info-value" style="color: ${getColorForTemp(sys.gpu_temp)}">${sys.gpu_temp}°C</div>
            </div>
            <div class="info-row">
                <div class="info-label">CPU Temp</div>
                <div class="info-value" style="color: ${getColorForTemp(sys.cpu_temp)}">${sys.cpu_temp}°C</div>
            </div>
        </div>
    `;
}

// Рендеринг быстрых действий
function renderActions() {
    return `
        <div class="actions-grid">
            <button class="action-btn primary" onclick="requestScreenshot()">
                <span>📸 Скриншот</span>
            </button>
            <button class="action-btn" onclick="requestStatus()">
                <span>📊 Статус</span>
            </button>
            <button class="action-btn" onclick="requestXP()">
                <span>💠 XP</span>
            </button>
            <button class="action-btn" onclick="openMenu()">
                <span>⚙️ Меню</span>
            </button>
        </div>
    `;
}

// Вспомогательные функции
function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}ч ${minutes}м`;
}

function getColorForValue(value) {
    if (value < 50) return 'var(--success-color)';
    if (value < 80) return 'var(--warning-color)';
    return 'var(--danger-color)';
}

function getColorForTemp(temp) {
    if (temp < 70) return 'var(--success-color)';
    if (temp < 85) return 'var(--warning-color)';
    return 'var(--danger-color)';
}

function showError(message) {
    document.getElementById('content').innerHTML = `
        <div class="loading">
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <div>${message}</div>
        </div>
    `;
}

// Обработчики действий
async function sendAction(action, data = {}) {
    try {
        const response = await fetch(`${API_BASE}/api/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...data })
        });
        
        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error('Action error:', error);
        return false;
    }
}

async function startClicker(character = 'main') {
    tg.HapticFeedback.impactOccurred('heavy');
    const success = await sendAction('start_clicker', { character });
    if (success) {
        showToast(`✅ Кликер ${character} запущен`);
    } else {
        showToast(`❌ Не удалось запустить кликер`);
    }
}

async function stopClicker(character = 'main') {
    tg.HapticFeedback.impactOccurred('heavy');
    const success = await sendAction('stop_clicker', { character });
    if (success) {
        showToast(`⏹ Кликер ${character} остановлен`);
    }
}

async function startAllClickers() {
    tg.HapticFeedback.impactOccurred('heavy');
    const result = await sendAction('start_all');
    if (result) {
        showToast(`✅ Все кликеры запущены`);
    }
}

async function stopAllClickers() {
    tg.HapticFeedback.impactOccurred('heavy');
    const result = await sendAction('stop_all');
    if (result) {
        showToast(`⏹ Все кликеры остановлены`);
    }
}

function requestScreenshot() {
    tg.HapticFeedback.impactOccurred('heavy');
    tg.sendData(JSON.stringify({ action: 'screenshot' }));
    showToast('📸 Запрос на скриншот отправлен');
}

function requestStatus() {
    tg.HapticFeedback.impactOccurred('medium');
    tg.sendData(JSON.stringify({ action: 'status' }));
    showToast('📊 Запрос статуса отправлен');
}

function requestXP() {
    tg.HapticFeedback.impactOccurred('medium');
    tg.sendData(JSON.stringify({ action: 'xp' }));
    showToast('💠 Запрос XP отправлен');
}

function openMenu() {
    tg.HapticFeedback.impactOccurred('light');
    tg.sendData(JSON.stringify({ action: 'menu' }));
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-100px);
        background: linear-gradient(135deg, rgba(212, 175, 55, 0.95), rgba(255, 215, 0, 0.95));
        color: #0a0e1a;
        padding: 12px 24px;
        border-radius: 24px;
        font-weight: 700;
        font-size: 14px;
        box-shadow: 0 8px 32px rgba(212, 175, 55, 0.4);
        z-index: 1000;
        transition: transform 0.3s ease;
        backdrop-filter: blur(10px);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(-100px)';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Обновление данных
function refreshDashboard() {
    const btn = document.getElementById('refreshBtn');
    btn.classList.add('spinning');
    
    tg.HapticFeedback.impactOccurred('medium');
    
    // Запрос через WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'refresh' }));
        showToast('🔄 Обновление данных...');
    } else {
        // Fallback на REST API
        loadDashboardREST();
    }
    
    setTimeout(() => {
        btn.classList.remove('spinning');
        tg.HapticFeedback.notificationOccurred('success');
    }, 500);
}

// Обработчики событий
document.getElementById('refreshBtn').addEventListener('click', refreshDashboard);

// Ping каждые 30 секунд для поддержания соединения
setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'ping' }));
    }
}, 30000);

// Очистка при закрытии
window.addEventListener('beforeunload', () => {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
    }
    if (ws) {
        ws.close();
    }
});

// Запуск
loadDashboard();
