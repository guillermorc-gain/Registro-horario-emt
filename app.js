'use strict';

const SUPABASE_URL = 'https://lrwttnwtgisxvmewgenp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyd3R0bnd0Z2lzeHZtZXdnZW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMzY1OTIsImV4cCI6MjA5MDcxMjU5Mn0.3wvAyIoSo6emhKZ33GoJVgOmocBF2OfWeb_QGpvQMw4';
const HORAS_ANUALES = 777;

const AVATAR_EMOJIS = ['🚌','⭐','🔥','⚡','🌊','🎯','🚀','🦋','🎨','🌈'];
const AVATAR_BG     = ['#667eea','#e74c3c','#f39c12','#27ae60','#3498db','#9b59b6','#1abc9c','#e67e22','#764ba2','#e91e63'];

const app = {
    supabase: null,
    usuarioActual: null,
    darkMode: localStorage.getItem('darkMode') === 'true',
    horasAnualesCustom: parseFloat(localStorage.getItem('horasAnuales')) || HORAS_ANUALES,
    precioNocheDefault: parseFloat(localStorage.getItem('precioNoche')) || 0,
    modalCallback: null,
    editingId: null,
    _historialMap: {},

    async init() {
        const { createClient } = window.supabase;
        this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        this.setupAuth();
        this.setupUI();
        if (this.darkMode) this.aplicarDarkMode();
        this._buildAvatarGrid();
    },

    setupAuth() {
        this.supabase.auth.onAuthStateChange(async (event, session) => {
            if (session) {
                this.usuarioActual = session.user;
                const meta = session.user.user_metadata || {};
                if (meta.display_name) localStorage.setItem('displayName', meta.display_name);
                if (meta.username) {
                    localStorage.setItem('username', meta.username);
                    localStorage.setItem('u2e_' + meta.username.toLowerCase(), session.user.email);
                }
                if (meta.avatar_emoji) localStorage.setItem('avatarEmoji', meta.avatar_emoji);
                if (meta.avatar_bg)    localStorage.setItem('avatarBg', meta.avatar_bg);
                this.mostrarApp();
                this.cargarDatos();
                this.actualizarBotonesPerfil();
            } else {
                this.usuarioActual = null;
                this.mostrarAuth();
            }
        });
    },

    setupUI() {
        this.establecerFechaHoy();
        this.actualizarFecha();
        if (this.precioNocheDefault > 0) {
            document.getElementById('precioNocheGlobal').value = this.precioNocheDefault;
        }
        this.actualizarEstadoGPS();
        const lastInicio = localStorage.getItem('lastHoraInicio');
        if (lastInicio) document.getElementById('horaInicio').value = lastInicio;
    },

    // ── PROFILE / AVATAR ─────────────────────────────────────────

    actualizarBotonesPerfil() {
        const btn = document.getElementById('profileBtn');
        if (!btn) return;
        const photo = localStorage.getItem('avatarPhoto');
        const emoji = localStorage.getItem('avatarEmoji');
        const bg    = localStorage.getItem('avatarBg') || '#667eea';
        btn.style.cssText = '';
        if (photo) {
            btn.innerHTML = `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            btn.style.background = 'transparent';
            btn.style.padding = '0';
            btn.style.overflow = 'hidden';
        } else if (emoji) {
            btn.textContent = emoji;
            btn.style.background = bg;
            btn.style.fontSize = '20px';
            btn.style.color = 'white';
        } else {
            const email = this.usuarioActual?.email || '';
            const name  = localStorage.getItem('displayName') || email;
            const initial = name.charAt(0).toUpperCase();
            const palette = ['#667eea','#764ba2','#e74c3c','#27ae60','#f39c12','#3498db'];
            btn.textContent = initial;
            btn.style.background = palette[email.charCodeAt(0) % palette.length];
            btn.style.color = 'white';
            btn.style.fontSize = '16px';
        }
    },

    _buildAvatarGrid() {
        const grid = document.getElementById('avatarGrid');
        if (!grid) return;
        grid.innerHTML = '';
        AVATAR_EMOJIS.forEach((emoji, i) => {
            const btn = document.createElement('button');
            btn.className = 'avatar-option';
            btn.textContent = emoji;
            btn.style.background = AVATAR_BG[i];
            btn.addEventListener('click', () => this._seleccionarEmojiAvatar(emoji, AVATAR_BG[i]));
            grid.appendChild(btn);
        });
    },

    _seleccionarEmojiAvatar(emoji, bg) {
        localStorage.setItem('avatarEmoji', emoji);
        localStorage.setItem('avatarBg', bg);
        localStorage.removeItem('avatarPhoto');
        document.getElementById('avatarPickerModal').classList.remove('show');
        this.actualizarBotonesPerfil();
        this._actualizarAvatarPreview();
    },

    mostrarAvatarPicker() {
        document.getElementById('avatarPickerModal').classList.add('show');
        if (this.darkMode) document.getElementById('avatarModalContent').classList.add('dark');
    },

    subirFotoPerfil() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 80; canvas.height = 80;
                    canvas.getContext('2d').drawImage(img, 0, 0, 80, 80);
                    localStorage.setItem('avatarPhoto', canvas.toDataURL('image/jpeg', 0.85));
                    localStorage.removeItem('avatarEmoji');
                    document.getElementById('avatarPickerModal').classList.remove('show');
                    this.actualizarBotonesPerfil();
                    this._actualizarAvatarPreview();
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        };
        input.click();
    },

    _actualizarAvatarPreview() {
        const el = document.getElementById('profileAvatarPreview');
        if (!el) return;
        const photo = localStorage.getItem('avatarPhoto');
        const emoji = localStorage.getItem('avatarEmoji');
        const bg    = localStorage.getItem('avatarBg') || '#667eea';
        if (photo) {
            el.innerHTML = `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            el.style.background = 'transparent';
        } else if (emoji) {
            el.textContent = emoji;
            el.style.background = bg;
            el.style.color = '';
        } else {
            const email = this.usuarioActual?.email || '';
            const name  = localStorage.getItem('displayName') || email;
            const palette = ['#667eea','#764ba2','#e74c3c','#27ae60','#f39c12','#3498db'];
            el.textContent = name.charAt(0).toUpperCase();
            el.style.background = palette[email.charCodeAt(0) % palette.length];
            el.style.color = 'white';
        }
    },

    async guardarPerfil() {
        if (!this.usuarioActual) return;
        const displayName = document.getElementById('displayNameInput').value.trim();
        const username    = document.getElementById('usernameInput').value.trim().toLowerCase();
        const updateData  = {};
        if (displayName) updateData.display_name = displayName;
        if (username)    updateData.username = username;
        const emoji = localStorage.getItem('avatarEmoji');
        const bg    = localStorage.getItem('avatarBg');
        if (emoji) { updateData.avatar_emoji = emoji; updateData.avatar_bg = bg || '#667eea'; }

        const { error } = await this.supabase.auth.updateUser({ data: updateData });
        if (error) { alert('❌ Error al guardar: ' + error.message); return; }
        if (displayName) localStorage.setItem('displayName', displayName);
        if (username) {
            localStorage.setItem('username', username);
            localStorage.setItem('u2e_' + username, this.usuarioActual.email);
        }
        this.actualizarBotonesPerfil();
        alert('✅ Perfil guardado');
    },

    // ── AUTH ──────────────────────────────────────────────────────

    establecerFechaHoy() {
        const hoy = new Date();
        const y = hoy.getFullYear();
        const m = String(hoy.getMonth() + 1).padStart(2, '0');
        const d = String(hoy.getDate()).padStart(2, '0');
        document.getElementById('fechaInput').value = `${y}-${m}-${d}`;
        document.getElementById('fechaInput').max   = `${y}-${m}-${d}`;
    },

    actualizarFecha() {
        const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('fechaHoy').textContent =
            `📅 ${new Date().toLocaleDateString('es-ES', opts)}`;
    },

    toggleAuth() {
        const lf = document.getElementById('loginForm');
        const rf = document.getElementById('registerForm');
        lf.style.display = lf.style.display === 'none' ? 'flex' : 'none';
        rf.style.display = rf.style.display === 'none' ? 'flex' : 'none';
        document.getElementById('authError').classList.remove('show');
        document.getElementById('authSuccess').classList.remove('show');
    },

    mostrarMensaje(msg, tipo) {
        const el = document.getElementById('auth' + (tipo === 'error' ? 'Error' : 'Success'));
        el.textContent = msg;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 5000);
    },

    async login() {
        let input = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        if (!input || !password) { this.mostrarMensaje('❌ Completa todos los campos', 'error'); return; }
        let email = input;
        if (!input.includes('@')) {
            const saved = localStorage.getItem('u2e_' + input.toLowerCase());
            if (saved) {
                email = saved;
            } else {
                this.mostrarMensaje('❌ Usuario no encontrado. Usa tu correo la primera vez.', 'error');
                return;
            }
        }
        const { error } = await this.supabase.auth.signInWithPassword({ email, password });
        if (error) {
            this.mostrarMensaje('❌ Correo/usuario o contraseña incorrectos', 'error');
        } else {
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';
        }
    },

    async register() {
        const email = document.getElementById('registerEmail').value.trim();
        const pw1   = document.getElementById('registerPassword').value;
        const pw2   = document.getElementById('registerPassword2').value;
        if (!email || !pw1 || !pw2) { this.mostrarMensaje('❌ Completa todos los campos', 'error'); return; }
        if (pw1 !== pw2)   { this.mostrarMensaje('❌ Las contraseñas no coinciden', 'error'); return; }
        if (pw1.length < 6){ this.mostrarMensaje('❌ Mínimo 6 caracteres', 'error'); return; }
        const { error } = await this.supabase.auth.signUp({ email, password: pw1 });
        if (error) {
            this.mostrarMensaje('❌ ' + error.message, 'error');
        } else {
            this.mostrarMensaje('✅ Cuenta creada. Inicia sesión.', 'success');
            setTimeout(() => {
                document.getElementById('registerEmail').value = '';
                document.getElementById('registerPassword').value = '';
                document.getElementById('registerPassword2').value = '';
                this.toggleAuth();
            }, 2000);
        }
    },

    mostrarAuth() {
        document.getElementById('authScreen').classList.remove('hidden');
        document.getElementById('appScreen').classList.remove('active');
        document.getElementById('optionsScreen').classList.remove('active');
    },

    mostrarApp() {
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('appScreen').classList.add('active');
        document.getElementById('optionsScreen').classList.remove('active');
    },

    mostrarOpciones() {
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('appScreen').classList.remove('active');
        document.getElementById('optionsScreen').classList.add('active');
        document.getElementById('darkModeToggle').checked = this.darkMode;
        document.getElementById('horasAnualesDisplay').textContent = this.horasAnualesCustom + 'h';
        document.getElementById('displayNameInput').value = localStorage.getItem('displayName') || '';
        document.getElementById('usernameInput').value    = localStorage.getItem('username') || '';
        document.getElementById('perfilEmail').textContent = this.usuarioActual?.email || '';
        this.actualizarEstadoGPS();
        this._actualizarAvatarPreview();
    },

    toggleSection(btn) {
        btn.closest('.ops-section').classList.toggle('open');
    },

    // ── HOURS DATA ────────────────────────────────────────────────

    async cargarDatos() {
        if (!this.usuarioActual) return;
        const { data } = await this.supabase
            .from('horas_trabajo').select('*').eq('user_id', this.usuarioActual.id).single();
        this.actualizarUI(data || { horasTrabajadas: 0, historial: {} });
        this.verificarUbicacion();
    },

    async registrarHoras() {
        if (!this.usuarioActual) return;
        const horas = parseFloat(document.getElementById('horasInput').value);
        const fecha = document.getElementById('fechaInput').value;
        if (!fecha || isNaN(horas) || horas <= 0) { alert('❌ Introduce fecha y horas válidas'); return; }

        const horaInicio     = document.getElementById('horaInicio').value;
        const horaFin        = document.getElementById('horaFin').value;
        const esNoche        = document.getElementById('nocheToggle').checked;
        const horasNocturnas = esNoche ? (parseFloat(document.getElementById('horasNocturnas').value) || 0) : 0;
        const precioNoche    = esNoche ? (parseFloat(document.getElementById('precioNoche').value) || 0) : 0;
        const extraNoche     = Math.round(horasNocturnas * precioNoche * 100) / 100;

        if (esNoche && horasNocturnas > horas) { alert('❌ Las horas nocturnas no pueden superar las horas totales'); return; }

        const { data: actual } = await this.supabase
            .from('horas_trabajo').select('*').eq('user_id', this.usuarioActual.id).single();
        const datos = actual || { horasTrabajadas: 0, historial: {} };
        if (!datos.historial) datos.historial = {};

        if (this.editingId && datos.historial[this.editingId]) {
            datos.horasTrabajadas = Math.round((datos.horasTrabajadas - datos.historial[this.editingId].horas) * 10) / 10;
            delete datos.historial[this.editingId];
        }

        if (datos.horasTrabajadas + horas > this.horasAnualesCustom) {
            alert(`❌ Solo tienes ${(this.horasAnualesCustom - datos.horasTrabajadas).toFixed(1)}h disponibles`);
            return;
        }

        datos.horasTrabajadas = Math.round((datos.horasTrabajadas + horas) * 10) / 10;
        const fechaFormato = new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const registroId   = fecha.replace(/-/g, '');
        datos.historial[registroId] = {
            fecha: fechaFormato,
            horas,
            timestamp: new Date(fecha + 'T12:00:00').getTime(),
            ...(horaInicio && horaFin ? { horaInicio, horaFin } : {}),
            ...(esNoche && horasNocturnas > 0 ? { horasNocturnas, precioNoche, extraNoche } : {})
        };

        if (actual) {
            await this.supabase.from('horas_trabajo').update(datos).eq('user_id', this.usuarioActual.id);
        } else {
            await this.supabase.from('horas_trabajo').insert([{ user_id: this.usuarioActual.id, ...datos }]);
        }

        if (horaInicio) localStorage.setItem('lastHoraInicio', horaInicio);
        this.actualizarUI(datos);
        this.cancelarEdicion();
    },

    editarRegistro(id) {
        const reg = this._historialMap[id];
        if (!reg) return;
        this.editingId = id;
        const fecha = `${id.slice(0,4)}-${id.slice(4,6)}-${id.slice(6,8)}`;
        document.getElementById('fechaInput').value  = fecha;
        document.getElementById('horasInput').value  = reg.horas;
        document.getElementById('horaInicio').value  = reg.horaInicio || '';
        document.getElementById('horaFin').value     = reg.horaFin   || '';
        const hasNoche = !!reg.horasNocturnas;
        document.getElementById('nocheToggle').checked = hasNoche;
        document.getElementById('nocheExtra').classList.toggle('visible', hasNoche);
        if (hasNoche) {
            document.getElementById('horasNocturnas').value = reg.horasNocturnas;
            document.getElementById('precioNoche').value    = reg.precioNoche || '';
            this.calcularExtra();
        }
        document.getElementById('registrarBtn').textContent = '✏️ Actualizar';
        document.getElementById('cancelarBtn').style.display = '';
        document.getElementById('editLabel').style.display   = 'block';
        document.getElementById('inputSection').classList.add('editing');
        document.getElementById('appContent').scrollTo({ top: 0, behavior: 'smooth' });
    },

    cancelarEdicion() {
        this.editingId = null;
        this.limpiarInput();
        document.getElementById('registrarBtn').textContent    = 'Registrar';
        document.getElementById('cancelarBtn').style.display   = 'none';
        document.getElementById('editLabel').style.display     = 'none';
        document.getElementById('inputSection').classList.remove('editing');
    },

    calcularHorasPorTiempo() {
        const inicio = document.getElementById('horaInicio').value;
        const fin    = document.getElementById('horaFin').value;
        if (!inicio || !fin) return;
        const [h1, m1] = inicio.split(':').map(Number);
        const [h2, m2] = fin.split(':').map(Number);
        let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (mins < 0) mins += 1440;
        const horas = Math.round(mins / 60 * 2) / 2;
        if (horas > 0) document.getElementById('horasInput').value = horas;
    },

    guardarUltimaHoraInicio() {
        const val = document.getElementById('horaInicio').value;
        if (val) localStorage.setItem('lastHoraInicio', val);
    },

    async borrarRegistro(id) {
        if (!this.usuarioActual) return;
        if (!confirm('¿Borrar este registro?')) return;
        const { data } = await this.supabase
            .from('horas_trabajo').select('*').eq('user_id', this.usuarioActual.id).single();
        if (data && data.historial && data.historial[id]) {
            data.horasTrabajadas = Math.round((data.horasTrabajadas - data.historial[id].horas) * 10) / 10;
            delete data.historial[id];
            await this.supabase.from('horas_trabajo').update(data).eq('user_id', this.usuarioActual.id);
            this.actualizarUI(data);
            if (this.editingId === id) this.cancelarEdicion();
        }
    },

    clickNocheCompact() {
        const cb = document.getElementById('nocheToggle');
        cb.checked = !cb.checked;
        this.toggleNoche();
    },

    toggleNoche() {
        const on = document.getElementById('nocheToggle').checked;
        document.getElementById('nocheExtra').classList.toggle('visible', on);
        if (on && this.precioNocheDefault > 0) document.getElementById('precioNoche').value = this.precioNocheDefault;
        if (!on) document.getElementById('nocheResumen').textContent = '';
    },

    calcularExtra() {
        const hN     = parseFloat(document.getElementById('horasNocturnas').value) || 0;
        const precio = parseFloat(document.getElementById('precioNoche').value) || 0;
        document.getElementById('nocheResumen').textContent =
            (hN > 0 && precio > 0) ? `Extra: ${hN}h × ${precio}€ = ${(hN * precio).toFixed(2)}€` : '';
    },

    limpiarInput() {
        document.getElementById('horasInput').value = '';
        document.getElementById('horaFin').value    = '';
        document.getElementById('nocheToggle').checked = false;
        document.getElementById('nocheExtra').classList.remove('visible');
        document.getElementById('horasNocturnas').value = '';
        document.getElementById('precioNoche').value    = '';
        document.getElementById('nocheResumen').textContent = '';
        this.establecerFechaHoy();
        document.getElementById('horaInicio').value = localStorage.getItem('lastHoraInicio') || '';
    },

    // ── SETTINGS ──────────────────────────────────────────────────

    revisarSuma() {
        const t = parseFloat(document.getElementById('horasTrabajadas').textContent);
        const r = parseFloat(document.getElementById('horasRestantes').textContent);
        const s = t + r;
        if (Math.abs(s - this.horasAnualesCustom) < 0.1) {
            alert(`✅ Suma correcta!\n\nTrabajadas: ${t}h\nRestantes: ${r}h\nTotal: ${s}h`);
        } else {
            alert(`❌ Error en la suma!\n\nTrabajadas: ${t}h\nRestantes: ${r}h\nTotal: ${s}h\nEsperado: ${this.horasAnualesCustom}h`);
        }
    },

    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        localStorage.setItem('darkMode', this.darkMode);
        this.darkMode ? this.aplicarDarkMode() : this.removerDarkMode();
    },

    aplicarDarkMode() {
        ['body', '.container', '#appHeader', '#appContent', '#optionsHeader', '#optionsContent', '#modalContent'].forEach(s => {
            const el = s.startsWith('#') || s.startsWith('.') ? document.querySelector(s) : document.body;
            el && el.classList.add('dark');
        });
        const amc = document.getElementById('avatarModalContent');
        if (amc) amc.classList.add('dark');
    },

    removerDarkMode() {
        ['body', '.container', '#appHeader', '#appContent', '#optionsHeader', '#optionsContent', '#modalContent'].forEach(s => {
            const el = s.startsWith('#') || s.startsWith('.') ? document.querySelector(s) : document.body;
            el && el.classList.remove('dark');
        });
        const amc = document.getElementById('avatarModalContent');
        if (amc) amc.classList.remove('dark');
    },

    guardarPrecioNoche() {
        const precio = parseFloat(document.getElementById('precioNocheGlobal').value) || 0;
        this.precioNocheDefault = precio;
        localStorage.setItem('precioNoche', precio);
    },

    mostrarCambiarHoras() {
        const v = prompt('¿Cuántas horas quieres trabajar al año?', this.horasAnualesCustom);
        if (v !== null && !isNaN(parseFloat(v)) && parseFloat(v) > 0) {
            this.horasAnualesCustom = parseFloat(v);
            localStorage.setItem('horasAnuales', this.horasAnualesCustom);
            document.getElementById('horasAnualesDisplay').textContent = this.horasAnualesCustom + 'h';
            alert(`✅ Horas anuales cambiadas a ${this.horasAnualesCustom}h`);
            this.cargarDatos();
        }
    },

    confirmarResetear() {
        this.mostrarModal('⚠️ Resetear Contador', '¿Estás seguro? Se pondrán todas las horas a 0.', this.resetearContador.bind(this));
    },

    async resetearContador() {
        if (!this.usuarioActual) return;
        const { data } = await this.supabase.from('horas_trabajo').select('*').eq('user_id', this.usuarioActual.id).single();
        if (data) {
            data.horasTrabajadas = 0; data.historial = {};
            await this.supabase.from('horas_trabajo').update(data).eq('user_id', this.usuarioActual.id);
            this.actualizarUI(data);
            alert('✅ Contador reseteado a 0');
        }
    },

    mostrarModal(titulo, mensaje, callback) {
        document.getElementById('modalTitle').textContent   = titulo;
        document.getElementById('modalMessage').textContent = mensaje;
        document.getElementById('modal').classList.add('show');
        this.modalCallback = callback;
    },

    cerrarModal() {
        document.getElementById('modal').classList.remove('show');
        this.modalCallback = null;
    },

    async confirmarModal() {
        if (this.modalCallback) await this.modalCallback();
        this.cerrarModal();
    },

    confirmarBorrarCuenta() {
        this.mostrarModal('⚠️ Borrar Cuenta', '¿Estás seguro? Esta acción no se puede deshacer.', this.borrarCuenta.bind(this));
    },

    async borrarCuenta() {
        if (!this.usuarioActual) return;
        await this.supabase.from('horas_trabajo').delete().eq('user_id', this.usuarioActual.id);
        await this.supabase.auth.signOut();
    },

    async cerrarSesion() {
        await this.supabase.auth.signOut();
    },

    // ── UI ────────────────────────────────────────────────────────

    actualizarUI(datos) {
        const restantes = Math.max(0, this.horasAnualesCustom - datos.horasTrabajadas);
        const pct = (datos.horasTrabajadas / this.horasAnualesCustom) * 100;
        document.getElementById('horasTrabajadas').textContent = datos.horasTrabajadas.toFixed(1);
        document.getElementById('horasRestantes').textContent  = restantes.toFixed(1);
        document.getElementById('porcentaje').textContent = Math.min(Math.round(pct), 100);
        document.getElementById('progressFill').style.width = Math.min(pct, 100) + '%';
        if (pct >= 100) document.getElementById('progressFill').style.background = 'linear-gradient(90deg,#27ae60,#229954)';
        this.actualizarHistorial(datos.historial || {});
    },

    actualizarHistorial(historial) {
        this._historialMap = {};
        const list = document.getElementById('historialList');
        list.innerHTML = '';
        const registros = Object.entries(historial).sort((a, b) => b[1].timestamp - a[1].timestamp);
        if (registros.length === 0) {
            list.innerHTML = '<li class="empty-state">Sin registros</li>';
            return;
        }
        registros.forEach(([id, reg]) => {
            this._historialMap[id] = reg;
            const li = document.createElement('li');
            const nocheInfo = reg.horasNocturnas
                ? `<span class="historial-noche">🌙 ${reg.horasNocturnas}h noct. · +${(reg.extraNoche || 0).toFixed(2)}€</span>`
                : '';
            const horario = (reg.horaInicio && reg.horaFin)
                ? `<span class="historial-horario">${reg.horaInicio}–${reg.horaFin}</span>`
                : '';
            li.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span class="historial-fecha">${reg.fecha}</span>
                        ${horario}
                        <span class="historial-horas">${reg.horas}h</span>
                    </div>
                    ${nocheInfo}
                </div>
                <div class="historial-actions">
                    <button class="historial-edit">✏️</button>
                    <button class="historial-delete">✕</button>
                </div>`;
            li.querySelector('.historial-edit').addEventListener('click', () => this.editarRegistro(id));
            li.querySelector('.historial-delete').addEventListener('click', () => this.borrarRegistro(id));
            list.appendChild(li);
        });
    },

    // ── GPS & NOTIFICATIONS ───────────────────────────────────────

    async guardarUbicacionTrabajo() {
        if (!navigator.geolocation) { alert('❌ Tu dispositivo no soporta geolocalización'); return; }
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                localStorage.setItem('workLocation', JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
                this.actualizarEstadoGPS();
                alert('✅ Ubicación guardada. Recibirás una notificación al llegar al trabajo.');
            },
            () => alert('❌ No se pudo obtener la ubicación. Activa el GPS.')
        );
    },

    borrarUbicacionTrabajo() {
        localStorage.removeItem('workLocation');
        this.actualizarEstadoGPS();
        document.getElementById('workBanner').classList.remove('show');
    },

    actualizarEstadoGPS() {
        const loc = localStorage.getItem('workLocation');
        const el  = document.getElementById('gpsStatus');
        const btn = document.getElementById('borrarGpsBtn');
        if (!el) return;
        if (loc) {
            el.textContent = '✅ Ubicación guardada'; el.className = 'gps-badge saved';
            if (btn) btn.style.display = '';
        } else {
            el.textContent = 'Sin ubicación'; el.className = 'gps-badge none';
            if (btn) btn.style.display = 'none';
        }
    },

    verificarUbicacion() {
        const workLoc = JSON.parse(localStorage.getItem('workLocation') || 'null');
        if (!workLoc || !navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition((pos) => {
            const dist = this.calcularDistancia(pos.coords.latitude, pos.coords.longitude, workLoc.lat, workLoc.lng);
            if (dist < 300) {
                document.getElementById('workBanner').classList.add('show');
                this._enviarNotificacionTrabajo();
            }
        }, () => {});
    },

    async _enviarNotificacionTrabajo() {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        try {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification('📍 Horas EMT', {
                body: 'Parece que estás en el trabajo. ¿Registras la jornada?',
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-192.png',
                tag: 'trabajo-cercano',
                requireInteraction: true,
                actions: [{ action: 'abrir', title: 'Abrir app' }]
            });
        } catch(_) {
            new Notification('📍 Horas EMT', { body: 'Parece que estás en el trabajo.', icon: '/icons/icon-192.png' });
        }
    },

    calcularDistancia(lat1, lng1, lat2, lng2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    },

    registrarJornadaHoy() {
        document.getElementById('workBanner').classList.remove('show');
        this.establecerFechaHoy();
        this.mostrarApp();
        document.getElementById('horasInput').focus();
    },

    // ── BACKUP ────────────────────────────────────────────────────

    async exportarDatos() {
        if (!this.usuarioActual) return;
        const { data } = await this.supabase.from('horas_trabajo').select('*').eq('user_id', this.usuarioActual.id).single();
        const historial = Object.entries((data?.historial) || {})
            .sort((a, b) => a[1].timestamp - b[1].timestamp)
            .map(([id, reg]) => ({ id, ...reg }));
        const exportacion = {
            exportado: new Date().toISOString(),
            usuario: this.usuarioActual.email,
            horasAnuales: this.horasAnualesCustom,
            horasTrabajadas: data?.horasTrabajadas || 0,
            historial
        };
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(exportacion, null, 2)], { type: 'application/json' }));
        a.download = `horas-emt-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    },

    async importarDatos() {
        if (!this.usuarioActual) return;
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json,application/json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const datos = JSON.parse(await file.text());
                if (datos.horasTrabajadas === undefined || !datos.historial) {
                    alert('❌ Archivo no válido.'); return;
                }
                const historialObj = {};
                if (Array.isArray(datos.historial)) {
                    datos.historial.forEach(({ id, ...rest }) => { historialObj[id] = rest; });
                } else {
                    Object.assign(historialObj, datos.historial);
                }
                const restored = { horasTrabajadas: datos.horasTrabajadas, historial: historialObj };
                const { data: ex } = await this.supabase.from('horas_trabajo').select('id').eq('user_id', this.usuarioActual.id).single();
                if (ex) {
                    await this.supabase.from('horas_trabajo').update(restored).eq('user_id', this.usuarioActual.id);
                } else {
                    await this.supabase.from('horas_trabajo').insert([{ user_id: this.usuarioActual.id, ...restored }]);
                }
                if (datos.horasAnuales) {
                    this.horasAnualesCustom = datos.horasAnuales;
                    localStorage.setItem('horasAnuales', datos.horasAnuales);
                }
                this.actualizarUI(restored);
                alert('✅ Copia restaurada correctamente');
            } catch(err) {
                alert('❌ Error al leer el archivo: ' + err.message);
            }
        };
        input.click();
    }
};

// ── BOOTSTRAP ─────────────────────────────────────────────────────

let _swCheck = setInterval(() => {
    if (window.supabase) { clearInterval(_swCheck); app.init(); }
}, 100);

// ── PWA INSTALL ───────────────────────────────────────────────────

window._deferredPrompt = null;
const _isIOS        = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const _isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

function _showInstallBanner(ios) {
    if (_isStandalone) return;
    const banner    = document.getElementById('installBanner');
    const bannerBtn = document.getElementById('installBannerBtn');
    document.getElementById('installBannerMsg').textContent =
        ios ? 'Toca Compartir ↑ → "Añadir a inicio"' : 'Instala la app para acceso rápido';
    if (bannerBtn) bannerBtn.style.display = ios ? 'none' : '';
    if (banner) banner.classList.add('show');
    const sec = document.getElementById('installSection');
    if (sec) sec.style.display = '';
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window._deferredPrompt = e;
    _showInstallBanner(false);
});

window.addEventListener('appinstalled', () => {
    window._deferredPrompt = null;
    const banner = document.getElementById('installBanner');
    if (banner) banner.classList.remove('show');
    const sec = document.getElementById('installSection');
    if (sec) sec.style.display = 'none';
});

app.instalarApp = async function() {
    if (!window._deferredPrompt) {
        alert(_isIOS
            ? 'En Safari:\n1. Toca el botón Compartir (□↑)\n2. Selecciona "Añadir a pantalla de inicio"\n3. Pulsa "Añadir"'
            : 'Usa el menú del navegador → "Instalar app".');
        return;
    }
    window._deferredPrompt.prompt();
    const { outcome } = await window._deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        const banner = document.getElementById('installBanner');
        if (banner) banner.classList.remove('show');
        const sec = document.getElementById('installSection');
        if (sec) sec.style.display = 'none';
    }
    window._deferredPrompt = null;
};

app.ocultarInstallBanner = function() {
    const banner = document.getElementById('installBanner');
    if (banner) banner.classList.remove('show');
};

if (_isIOS && !_isStandalone) setTimeout(() => _showInstallBanner(true), 3000);

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
}
