// ===== STATE MANAGEMENT =====
const state = {
    theme: localStorage.getItem('pm-theme') || 'system',
    viewMode: 'trimestre', // mes, bimestre, trimestre
    phases: JSON.parse(localStorage.getItem('pm-phases')) || [
        { id: 1, name: 'Salud y Tech', color: '#0a84ff', items: [
            { id: 1, name: 'Salud Mental/Checkup', value: 540 },
            { id: 2, name: 'MacBook Air M2/M3', value: 5000 },
            { id: 3, name: 'Higiene/Libros', value: 90 }
        ]},
        { id: 2, name: 'Movilidad', color: '#bf5af2', items: [
            { id: 4, name: 'Moto Honda XR 150', value: 10200 },
            { id: 5, name: 'Documentación/Casco', value: 485 }
        ]},
        { id: 3, name: 'Ecosistema', color: '#ff9f0a', items: [
            { id: 6, name: 'iPad / Tablet', value: 2500 },
            { id: 7, name: 'Apple Watch / Airpods', value: 1800 }
        ]},
        { id: 4, name: 'Estilo', color: '#ff375f', items: [
            { id: 8, name: 'Ropa (Lote anual)', value: 1450 },
            { id: 9, name: 'Accesorios Cuarto', value: 1100 }
        ]}
    ],
    months: JSON.parse(localStorage.getItem('pm-months')) || [
        { id: 1, name: 'Abril', enabled: true },
        { id: 2, name: 'Mayo', enabled: true },
        { id: 3, name: 'Junio', enabled: true },
        { id: 4, name: 'Julio', enabled: true },
        { id: 5, name: 'Agosto', enabled: true },
        { id: 6, name: 'Septiembre', enabled: true },
        { id: 7, name: 'Octubre', enabled: true },
        { id: 8, name: 'Noviembre', enabled: true },
        { id: 9, name: 'Diciembre', enabled: true }
    ],
    baseValues: JSON.parse(localStorage.getItem('pm-base')) || {
        colchon: 20, utp: 550, mesesCiclo: 5, gastos: 30
    },
    chatMessages: [],
    nextItemId: 100
};

const ALL_MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const PHASE_COLORS = ['#0a84ff','#bf5af2','#ff9f0a','#ff375f','#30d158','#64d2ff','#ff453a','#5e5ce6'];

// ===== THEME =====
function applyTheme() {
    const html = document.documentElement;
    if (state.theme === 'system') {
        const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        html.setAttribute('data-theme', dark ? 'dark' : 'light');
    } else {
        html.setAttribute('data-theme', state.theme);
    }
    localStorage.setItem('pm-theme', state.theme);
    updateThemeIcon();
}

function toggleTheme() {
    const cycle = ['system', 'light', 'dark'];
    const idx = cycle.indexOf(state.theme);
    state.theme = cycle[(idx + 1) % cycle.length];
    applyTheme();
}

function updateThemeIcon() {
    const btn = document.getElementById('theme-btn');
    if (!btn) return;
    const icons = { system: '🖥️', light: '☀️', dark: '🌙' };
    btn.textContent = icons[state.theme];
    btn.title = `Tema: ${state.theme === 'system' ? 'Sistema' : state.theme === 'light' ? 'Claro' : 'Oscuro'}`;
}

// ===== TAB SWITCHING =====
function switchTab(id, btn) {
    document.querySelectorAll('.tab-content').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(e => e.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    btn.classList.add('active');
}

// ===== FORMATTING =====
function fmt(n) { return 'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2 }); }

// ===== SAVE STATE =====
function saveState() {
    localStorage.setItem('pm-phases', JSON.stringify(state.phases));
    localStorage.setItem('pm-months', JSON.stringify(state.months));
    localStorage.setItem('pm-base', JSON.stringify(state.baseValues));
}

// ===== ROADMAP RENDERING =====
function renderRoadmap() {
    const container = document.getElementById('roadmap-container');
    container.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'categories-grid';

    state.phases.forEach((phase, pi) => {
        const div = document.createElement('div');
        div.className = 'phase-section';
        div.innerHTML = `
            <div class="h2-sub" style="color: ${phase.color};">
                <span contenteditable="true" class="phase-name-edit" data-phase="${pi}" 
                    style="outline:none;border:none;background:transparent;color:inherit;font:inherit;letter-spacing:inherit;text-transform:inherit;">
                    Fase ${pi + 1}: ${phase.name}
                </span>
                <div class="phase-actions">
                    <button class="add-btn" onclick="addItem(${pi})" title="Agregar ítem">+ Ítem</button>
                    <button class="phase-delete-btn" onclick="deletePhase(${pi})" title="Eliminar fase">✕</button>
                </div>
            </div>
            <div class="phase-items" id="phase-items-${pi}"></div>
        `;
        grid.appendChild(div);

        const itemsDiv = div.querySelector(`#phase-items-${pi}`);
        phase.items.forEach((item, ii) => {
            const row = document.createElement('div');
            row.className = 'input-row';
            row.innerHTML = `
                <label contenteditable="true" class="item-name-edit" data-phase="${pi}" data-item="${ii}"
                    style="outline:none;">${item.name}</label>
                <input type="number" value="${item.value}" 
                    onchange="updateItemValue(${pi}, ${ii}, this.value)" 
                    oninput="updateItemValue(${pi}, ${ii}, this.value)">
                <button class="delete-item-btn" onclick="deleteItem(${pi}, ${ii})" title="Eliminar">✕</button>
            `;
            itemsDiv.appendChild(row);
        });
    });

    container.appendChild(grid);

    // Phase name edit listeners
    container.querySelectorAll('.phase-name-edit').forEach(el => {
        el.addEventListener('blur', function() {
            const pi = parseInt(this.dataset.phase);
            const raw = this.textContent.trim();
            const match = raw.match(/^Fase \d+:\s*(.+)$/);
            state.phases[pi].name = match ? match[1] : raw;
            saveState();
            recalc();
        });
        el.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); this.blur(); }});
    });

    // Item name edit listeners
    container.querySelectorAll('.item-name-edit').forEach(el => {
        el.addEventListener('blur', function() {
            const pi = parseInt(this.dataset.phase);
            const ii = parseInt(this.dataset.item);
            state.phases[pi].items[ii].name = this.textContent.trim();
            saveState();
        });
        el.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); this.blur(); }});
    });

    recalc();
}

function updateItemValue(pi, ii, val) {
    state.phases[pi].items[ii].value = parseFloat(val) || 0;
    saveState();
    recalc();
}

function addItem(phaseIdx) {
    state.phases[phaseIdx].items.push({ id: state.nextItemId++, name: 'Nuevo Ítem', value: 0 });
    saveState();
    renderRoadmap();
}

function deleteItem(phaseIdx, itemIdx) {
    if (state.phases[phaseIdx].items.length <= 1) {
        if (confirm('¿Eliminar toda la fase?')) deletePhase(phaseIdx);
        return;
    }
    state.phases[phaseIdx].items.splice(itemIdx, 1);
    saveState();
    renderRoadmap();
}

function addPhase() {
    const colorIdx = state.phases.length % PHASE_COLORS.length;
    state.phases.push({
        id: Date.now(),
        name: 'Nueva Fase',
        color: PHASE_COLORS[colorIdx],
        items: [{ id: state.nextItemId++, name: 'Nuevo Ítem', value: 0 }]
    });
    saveState();
    renderRoadmap();
}

function deletePhase(phaseIdx) {
    if (state.phases.length <= 1) return alert('Debe haber al menos una fase.');
    state.phases.splice(phaseIdx, 1);
    saveState();
    renderRoadmap();
}

// ===== CRONOGRAMA =====
function renderCronograma() {
    const container = document.getElementById('crono-container');
    container.innerHTML = '';
    const enabledMonths = state.months.filter(m => m.enabled);
    if (enabledMonths.length === 0) { container.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);">No hay meses habilitados.</p>'; return; }

    const mode = state.viewMode;
    let groupSize = mode === 'mes' ? 1 : mode === 'bimestre' ? 2 : 3;
    const groupNames = { mes: 'Mes', bimestre: 'Bimestre', trimestre: 'Trimestre' };
    const colors = ['#0a84ff', '#bf5af2', '#ff9f0a', '#ff375f', '#30d158', '#64d2ff'];

    const groups = [];
    for (let i = 0; i < enabledMonths.length; i += groupSize) {
        groups.push(enabledMonths.slice(i, i + groupSize));
    }

    const totalInversion = state.phases.reduce((a, p) => a + p.items.reduce((b, it) => b + it.value, 0), 0);
    const invPerMonth = enabledMonths.length > 0 ? totalInversion / enabledMonths.length : 0;
    const baseMes = state.baseValues.utp + (state.baseValues.gastos * 4);

    groups.forEach((group, gi) => {
        const color = colors[gi % colors.length];
        const card = document.createElement('div');
        card.className = 'period-card';
        card.style.borderLeft = `4px solid ${color}`;

        const title = `${groupNames[mode]} ${gi + 1}`;
        let gridClass = `grid-${Math.min(group.length, 3)}`;

        let monthsHTML = group.map((m, mi) => {
            const totalMes = baseMes + invPerMonth;
            return `
                <div class="mes-box">
                    <button class="mes-delete" onclick="removeMonth(${m.id})" title="Quitar mes">✕</button>
                    <span class="mes-name">${m.name}</span>
                    <span class="val-mes">${fmt(totalMes)}</span>
                    <span class="val-sem">${fmt(totalMes / 4)} / sem</span>
                    <div class="formula-tag">(${invPerMonth.toFixed(0)} inv. + ${baseMes} fijo)</div>
                </div>
            `;
        }).join('');

        const groupTotal = group.length * (baseMes + invPerMonth);

        card.innerHTML = `
            <div class="h2-sub" style="color: ${color};">${title}</div>
            <div class="mes-grid ${gridClass}">${monthsHTML}</div>
            <div class="footer-tri">
                <div class="total-tri-label">TOTAL ${groupNames[mode].toUpperCase()}:</div>
                <div class="total-tri-val">${fmt(groupTotal)}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

function changeViewMode(mode) {
    state.viewMode = mode;
    renderCronograma();
}

function addMonth() {
    const existing = state.months.map(m => m.name);
    const available = ALL_MONTHS.filter(m => !existing.includes(m));
    if (available.length === 0) return alert('Todos los meses ya están agregados.');

    const select = document.getElementById('add-month-select');
    const selectedMonth = select.value;
    if (!selectedMonth) return;

    const monthOrder = ALL_MONTHS.indexOf(selectedMonth);
    state.months.push({ id: Date.now(), name: selectedMonth, enabled: true });
    state.months.sort((a, b) => ALL_MONTHS.indexOf(a.name) - ALL_MONTHS.indexOf(b.name));
    saveState();
    renderCronograma();
    updateMonthSelector();
}

function removeMonth(monthId) {
    if (state.months.filter(m => m.enabled).length <= 1) return alert('Debe haber al menos un mes.');
    const idx = state.months.findIndex(m => m.id === monthId);
    if (idx > -1) { state.months.splice(idx, 1); saveState(); renderCronograma(); updateMonthSelector(); }
}

function updateMonthSelector() {
    const select = document.getElementById('add-month-select');
    if (!select) return;
    const existing = state.months.map(m => m.name);
    const available = ALL_MONTHS.filter(m => !existing.includes(m));
    select.innerHTML = available.length === 0
        ? '<option value="">Todos agregados</option>'
        : '<option value="">Seleccionar...</option>' + available.map(m => `<option value="${m}">${m}</option>`).join('');
}

// ===== RECALCULATE EVERYTHING =====
function recalc() {
    const b = state.baseValues;
    const baseMes = b.utp + (b.gastos * 4);

    // Tab 1 outputs
    document.getElementById('out-colchon').innerText = fmt(b.colchon * 52);
    document.getElementById('out-ciclo').innerText = fmt(baseMes * b.mesesCiclo);
    document.getElementById('label-meses-ciclo').innerText = `Compromiso Total del Ciclo (${b.mesesCiclo} meses)`;
    document.getElementById('label-fijo-mes').innerText = baseMes.toFixed(2);

    // Total inversiones
    const totalInv = state.phases.reduce((a, p) => a + p.items.reduce((b, it) => b + it.value, 0), 0);
    document.getElementById('out-capital').innerText = fmt(totalInv);

    // Re-render cronograma
    renderCronograma();
    saveState();
}

function updateBase(key, val) {
    state.baseValues[key] = parseFloat(val) || 0;
    recalc();
}

// ===== AI CHAT =====
function toggleChat() {
    document.getElementById('chat-panel').classList.toggle('open');
    document.getElementById('chat-backdrop').classList.toggle('open');
}

function sendChat() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';

    addChatMessage('user', msg);

    // Show typing indicator
    const typingId = addChatMessage('ai', '', true);

    // Generate AI response based on context
    setTimeout(() => {
        removeChatMessage(typingId);
        const response = generateAIResponse(msg);
        addChatMessage('ai', response);
    }, 800 + Math.random() * 1200);
}

let chatMsgId = 0;
function addChatMessage(type, text, isTyping = false) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    const id = ++chatMsgId;
    div.className = `chat-msg ${type}${isTyping ? ' typing' : ''}`;
    div.id = `chat-msg-${id}`;
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeChatMessage(id) {
    const el = document.getElementById(`chat-msg-${id}`);
    if (el) el.remove();
}

function generateAIResponse(query) {
    const b = state.baseValues;
    const baseMes = b.utp + (b.gastos * 4);
    const totalInv = state.phases.reduce((a, p) => a + p.items.reduce((b, it) => b + it.value, 0), 0);
    const enabledMonths = state.months.filter(m => m.enabled).length;
    const invPerMonth = enabledMonths > 0 ? totalInv / enabledMonths : 0;
    const totalMensual = baseMes + invPerMonth;
    const ahorro = b.colchon * 52;

    const q = query.toLowerCase();

    if (q.includes('resumen') || q.includes('general') || q.includes('situación') || q.includes('situacion')) {
        return `📊 Resumen de tu Plan Maestro 2026:\n\n• Capital total requerido: ${fmt(totalInv)}\n• Costo fijo mensual (UTP + gastos): ${fmt(baseMes)}\n• Inversión mensual distribuida: ${fmt(invPerMonth)}\n• Total mensual necesario: ${fmt(totalMensual)}\n• Ahorro de emergencia anual: ${fmt(ahorro)}\n• Meses activos: ${enabledMonths}\n• Fases de inversión: ${state.phases.length}\n\nTu plan está bien estructurado. ¿Necesitas algún consejo específico?`;
    }

    if (q.includes('ahorro') || q.includes('ahorr') || q.includes('colchón') || q.includes('colchon') || q.includes('emergencia')) {
        const weeklyNeeded = totalMensual / 4;
        return `💰 Sobre tu ahorro y fondo de emergencia:\n\n• Actualmente ahorras S/ ${b.colchon} semanales para emergencias\n• Eso genera ${fmt(ahorro)} anuales\n• Tu gasto semanal base es S/ ${b.gastos}\n\n💡 Consejo: Los expertos recomiendan tener 3-6 meses de gastos como fondo de emergencia. Con tu gasto mensual de ${fmt(totalMensual)}, necesitarías entre ${fmt(totalMensual * 3)} y ${fmt(totalMensual * 6)} como colchón ideal.`;
    }

    if (q.includes('moto') || q.includes('movilidad') || q.includes('honda') || q.includes('vehículo') || q.includes('vehiculo')) {
        const motoPhase = state.phases.find(p => p.name.toLowerCase().includes('movilidad'));
        const motoTotal = motoPhase ? motoPhase.items.reduce((a, it) => a + it.value, 0) : 0;
        return `🏍️ Análisis de inversión en Movilidad:\n\n• Total fase movilidad: ${fmt(motoTotal)}\n• Representa el ${(motoTotal / totalInv * 100).toFixed(1)}% de tu inversión total\n\n💡 Consejos:\n- Considera buscar financiamiento a 12 meses si la tasa es menor al 15% TEA\n- El seguro SOAT es obligatorio, inclúyelo en documentación\n- La Honda XR 150 tiene buen valor de reventa (pierde ~15% primer año)\n- Ahorra para mantenimiento: ~S/ 50-80 mensuales`;
    }

    if (q.includes('reducir') || q.includes('optimizar') || q.includes('mejorar') || q.includes('consejo') || q.includes('tip')) {
        return `📈 Consejos para optimizar tu plan:\n\n1. **Prioriza inversiones**: Tu fase más costosa es la que más impacta tu flujo mensual\n2. **Regla 50/30/20**: Intenta que tus gastos fijos no superen el 50% de tu ingreso\n3. **Inversión escalonada**: Podrías distribuir en más meses para reducir el impacto mensual de ${fmt(totalMensual)}\n4. **Busca ofertas**: Para tech (MacBook, iPad), considera eventos como Black Friday o CyberDays\n5. **Ingreso extra**: Con tu inversión mensual de ${fmt(invPerMonth)}, cualquier ingreso adicional acelera tu plan\n\n¿Quieres que analice alguna fase en particular?`;
    }

    if (q.includes('mac') || q.includes('tech') || q.includes('apple') || q.includes('ipad') || q.includes('tecnología') || q.includes('tecnologia')) {
        return `💻 Sobre tus inversiones en tecnología:\n\n💡 Consejos:\n- MacBook Air M2 refurbished de Apple es igual a nuevo con 15-20% descuento\n- iPad refurbished también es excelente opción\n- Compra en eventos: Black Friday, CyberDays, o viajes\n- Considera AppleCare+ para la MacBook (protección 3 años)\n- Apple Watch SE es 40% más barato y cubre 90% de funciones del regular`;
    }

    if (q.includes('cuánto') || q.includes('cuanto') || q.includes('necesito') || q.includes('ingreso') || q.includes('ganar') || q.includes('sueldo')) {
        return `💵 Análisis de ingresos necesarios:\n\n• Necesitas mínimo ${fmt(totalMensual)} mensuales para cubrir tu plan\n• Más ${fmt(b.colchon * 4)} mensuales para emergencias\n• Total mínimo mensual: ${fmt(totalMensual + b.colchon * 4)}\n\nCon la regla 50/30/20, tu ingreso ideal sería:\n• Mínimo: ${fmt((totalMensual + b.colchon * 4) / 0.5)}\n• Esto deja 30% para gastos personales y 20% para ahorro extra`;
    }

    // Default response
    return `🤖 Entiendo tu consulta. Aquí tienes información relevante:\n\n• Tu plan tiene ${state.phases.length} fases de inversión\n• Capital total: ${fmt(totalInv)}\n• Gasto mensual: ${fmt(totalMensual)}\n• Tienes ${enabledMonths} meses para distribuir\n\nPuedes preguntarme sobre:\n- "Resumen general" de tu plan\n- "Consejos" para optimizar\n- Análisis de "ahorro" y emergencias\n- Análisis de "movilidad" o "tech"\n- "Cuánto necesito ganar"\n\n¿En qué puedo ayudarte?`;
}

// ===== INITIALIZATION =====
function init() {
    applyTheme();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (state.theme === 'system') applyTheme();
    });

    renderRoadmap();
    updateMonthSelector();
    recalc();

    // Add welcome chat message
    setTimeout(() => {
        addChatMessage('ai', '¡Hola! 👋 Soy tu asistente financiero. Puedo ayudarte con consultas sobre tu plan, consejos de ahorro, análisis de inversiones y más. ¿En qué puedo ayudarte hoy?');
    }, 500);

    // Chat enter key
    document.getElementById('chat-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') sendChat();
    });
}

window.onload = init;
