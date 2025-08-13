document.addEventListener('DOMContentLoaded', initializeApp);
// Accessibility: Keyboard support for drop zone
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    dropZone.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            elements.fileInput.click();
        }
    });
});

let currentFile = null;
let currentFileType = null;
let cryptoWorker = null;

const elements = {
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    passwordInput: document.getElementById('passwordInput'),
    passwordToggle: document.getElementById('passwordToggle'),
    previewContainer: document.getElementById('previewContainer'),
    previewCanvas: document.getElementById('previewCanvas'),
    statusMessage: document.getElementById('statusMessage'),
    actionBtn: document.getElementById('actionBtn'),
    actionBtnText: document.getElementById('actionBtnText'),
    actionSpinner: document.getElementById('actionSpinner'),
    themeToggle: document.getElementById('themeToggle'),
    themeIcon: document.getElementById('themeIcon')
};

function initializeApp() {
    initializeTheme();
    setupEventListeners();
    initializeWorker();
    showStatus('Aplicación lista. Selecciona una imagen o archivo JSON.', 'info');
}

// =================== WORKER ===================
function initializeWorker() {
    cryptoWorker = new Worker('cryptoWorker.js');
    cryptoWorker.onmessage = e => {
        const { success, result, error } = e.data;
        if (success) {
            if (result.salt) {
                downloadEncryptedFile(result);
                resetApp(); // Reset everything after encryption
            } else {
                displayDecryptedImage(result);
                showStatus('Imagen desencriptada exitosamente.', 'success');
            }
        } else {
            showStatus(error, 'error');
        }
        setProcessing(false);
    };
}

// =================== UI ===================
function setupEventListeners() {
    // Bloquear drop global que recarga página
    document.addEventListener('dragover', e => e.preventDefault());
    document.addEventListener('drop', e => e.preventDefault());

    elements.dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        elements.dropZone.classList.add('drag-over');
    });
    elements.dropZone.addEventListener('dragleave', () => elements.dropZone.classList.remove('drag-over'));
    elements.dropZone.addEventListener('drop', e => {
        e.preventDefault();
        elements.dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    elements.dropZone.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', e => {
        if (e.target.files[0]) handleFile(e.target.files[0]);
    });

    elements.passwordToggle.addEventListener('click', togglePasswordVisibility);
    elements.actionBtn.addEventListener('click', handleAction);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.passwordInput.addEventListener('input', updateButtonStates);
}

function handleFile(file) {
    const forbiddenExt = /\.(html?|js|exe|bat|cmd|sh|php|svg)$/i;
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|gif|bmp|webp)$/i.test(file.name);
    const isJSON = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
    if (forbiddenExt.test(file.name)) {
        showStatus('Tipo de archivo no permitido por seguridad.', 'error');
        hideImagePreview();
        return;
    }
    if (!isImage && !isJSON) {
        showStatus('Archivo no válido. Selecciona imagen o JSON.', 'error');
        hideImagePreview();
        return;
    }
    if (file.size === 0) {
        showStatus('El archivo está vacío.', 'error');
        hideImagePreview();
        return;
    }
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
        showStatus('El archivo es demasiado grande (máx 50MB).', 'error');
        hideImagePreview();
        return;
    }
    currentFile = file;
    currentFileType = isImage ? 'image' : 'json';
    if (isImage) displayImagePreview(file);
    else hideImagePreview();
    elements.passwordInput.disabled = false;
    updateButtonStates();
}

function displayImagePreview(file) {
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            const canvas = elements.previewCanvas;
            const ctx = canvas.getContext('2d');
            let { width, height } = img;
            const maxW = 400, maxH = 300;
            if (width > maxW) { height *= maxW / width; width = maxW; }
            if (height > maxH) { width *= maxH / height; height = maxH; }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            elements.previewContainer.classList.add('active');
        };
        img.onerror = () => {
            showStatus('No se pudo mostrar la imagen.', 'error');
            hideImagePreview();
        };
        img.src = e.target.result;
    };
    reader.onerror = () => {
        showStatus('Error al leer la imagen.', 'error');
        hideImagePreview();
    };
    reader.readAsDataURL(file);
}

function hideImagePreview() {
    elements.previewContainer.classList.remove('active');
}

function displayDecryptedImage(imageData) {
    let mimeType = 'image/png'; // Valor por defecto
    if (currentFileType === 'json' && currentFile) {
        currentFile.text().then(txt => {
            try {
                const json = JSON.parse(txt);
                mimeType = json.mimeType || mimeType;
            } catch {}
            const blob = new Blob([imageData], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
                const canvas = elements.previewCanvas;
                const ctx = canvas.getContext('2d');
                let { width, height } = img;
                const maxW = 400, maxH = 300;
                if (width > maxW) { height *= maxW / width; width = maxW; }
                if (height > maxH) { width *= maxH / height; height = maxH; }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                elements.previewContainer.classList.add('active');
                URL.revokeObjectURL(url);
            };
            img.onerror = () => {
                showStatus('No se pudo mostrar la imagen desencriptada.', 'error');
                hideImagePreview();
            };
            img.src = url;
        }).catch(() => {
            showStatus('Error al leer el archivo JSON desencriptado.', 'error');
            hideImagePreview();
        });
    } else {
        const blob = new Blob([imageData], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            const canvas = elements.previewCanvas;
            const ctx = canvas.getContext('2d');
            let { width, height } = img;
            const maxW = 400, maxH = 300;
            if (width > maxW) { height *= maxW / width; width = maxW; }
            if (height > maxH) { width *= maxH / height; height = maxH; }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            elements.previewContainer.classList.add('active');
            URL.revokeObjectURL(url);
        };
        img.onerror = () => {
            showStatus('No se pudo mostrar la imagen desencriptada.', 'error');
            hideImagePreview();
        };
        img.src = url;
    }
}

// =================== ACCIONES ===================
function handleAction() {
    if (!currentFile) return showStatus('No hay archivo seleccionado.', 'error');
    const password = elements.passwordInput.value.trim();
    if (currentFileType === 'image') {
        if (password.length < 6) return showStatus('Contraseña mínima de 6 caracteres.', 'error');
        setProcessing(true, 'encrypt');
        elements.actionBtn.disabled = true;
        elements.actionSpinner.classList.remove('hidden');
        currentFile.arrayBuffer().then(buf => {
            cryptoWorker.postMessage({ action: 'encrypt', data: { imageData: buf, password, mimeType: currentFile.type } });
        }).catch(() => {
            showStatus('Error al leer el archivo.', 'error');
            setProcessing(false);
        });
    } else if (currentFileType === 'json') {
        if (!password) return showStatus('Ingrese contraseña.', 'error');
        setProcessing(true, 'decrypt');
        elements.actionBtn.disabled = true;
        elements.actionSpinner.classList.remove('hidden');
        currentFile.text().then(txt => {
            let data;
            try {
                data = JSON.parse(txt);
            } catch {
                showStatus('El archivo JSON está corrupto o no es válido.', 'error');
                setProcessing(false);
                return;
            }
            cryptoWorker.postMessage({ action: 'decrypt', data: { encryptedData: data, password } });
        }).catch(() => {
            showStatus('Error al leer el archivo JSON.', 'error');
            setProcessing(false);
        });
    }
}

function sanitizeFileName(name) {
    // Remove dangerous characters and limit length
    return name.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40);
}

function downloadEncryptedFile(data) {
    // Adjuntar el tipo MIME original al JSON encriptado si está presente
    const output = { ...data };
    if (data.mimeType) output.mimeType = data.mimeType;
    const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    let baseName = currentFile?.name?.split('.')[0] || 'file';
    baseName = sanitizeFileName(baseName);
    a.href = url;
    a.download = `${baseName}_encrypted.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function resetApp() {
    // Clear sensitive variables
    currentFile = null;
    currentFileType = null;
    // Reset file input
    elements.fileInput.value = '';
    // Reset password input
    elements.passwordInput.value = '';
    elements.passwordInput.disabled = true;
    // Hide preview
    hideImagePreview();
    // Hide status message
    elements.statusMessage.textContent = '';
    elements.statusMessage.className = 'status-message';
    elements.statusMessage.style.display = 'none';
    // Reset action button
    elements.actionBtn.disabled = true;
    elements.actionBtnText.textContent = 'Encriptar';
    // Hide spinner
    elements.actionSpinner.classList.add('hidden');
    // Optionally reset drag-over state
    elements.dropZone.classList.remove('drag-over');
    // Show initial status
    showStatus('Aplicación lista. Selecciona una imagen o archivo JSON.', 'info');
}

// =================== UTILIDADES ===================
function escapeHTML(str) {
    return str.replace(/[&<>'"`]/g, function (c) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;',
            '`': '&#96;'
        }[c];
    });
}

function showStatus(msg, type) {
    elements.statusMessage.textContent = escapeHTML(msg);
    elements.statusMessage.className = `status-message status-${type}`;
    elements.statusMessage.style.display = 'block';
    elements.statusMessage.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    elements.statusMessage.setAttribute('role', 'alert');
    elements.statusMessage.tabIndex = 0;
    elements.statusMessage.focus();
}

function updateButtonStates() {
    const hasPass = elements.passwordInput.value.trim().length > 0;
    if (currentFileType === 'image') {
        elements.actionBtn.disabled = !hasPass;
        elements.actionBtnText.textContent = 'Encriptar';
    } else if (currentFileType === 'json') {
        elements.actionBtn.disabled = !hasPass;
        elements.actionBtnText.textContent = 'Desencriptar';
    } else {
        elements.actionBtn.disabled = true;
        elements.actionBtnText.textContent = 'Encriptar';
    }
}

function togglePasswordVisibility() {
    const isPass = elements.passwordInput.type === 'password';
    elements.passwordInput.type = isPass ? 'text' : 'password';
    elements.passwordToggle.textContent = isPass ? '🙈' : '👁️';
}

function setProcessing(state, type = '') {
    elements.passwordInput.disabled = state;
    elements.actionBtn.disabled = state;
    elements.fileInput.disabled = state;
    elements.actionSpinner.classList.toggle('hidden', !state);
    if (!state) updateButtonStates();
}

function initializeTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(currentTheme) {
    // Show the icon for the theme you will switch to
    if (elements.themeIcon) {
        elements.themeIcon.textContent = currentTheme === 'dark' ? '🌙' : '☀️';
    }
}
