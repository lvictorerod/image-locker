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
    encryptBtn: document.getElementById('encryptBtn'),
    decryptBtn: document.getElementById('decryptBtn'),
    encryptSpinner: document.getElementById('encryptSpinner'),
    decryptSpinner: document.getElementById('decryptSpinner'),
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
                showStatus('Imagen encriptada exitosamente.', 'success');
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
    elements.encryptBtn.addEventListener('click', handleEncrypt);
    elements.decryptBtn.addEventListener('click', handleDecrypt);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.passwordInput.addEventListener('input', updateButtonStates);
}

function handleFile(file) {
    const forbiddenExt = /\.(html?|js|exe|bat|cmd|sh|php|svg)$/i;
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|gif|bmp|webp)$/i.test(file.name);
    const isJSON = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
    if (forbiddenExt.test(file.name)) {
        showStatus('Tipo de archivo no permitido por seguridad.', 'error');
        return;
    }
    if (!isImage && !isJSON) {
        showStatus('Archivo no válido. Selecciona imagen o JSON.', 'error');
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
            elements.previewContainer.style.display = 'block';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function hideImagePreview() {
    elements.previewContainer.style.display = 'none';
}

function displayDecryptedImage(imageData) {
    const blob = new Blob([imageData]);
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
        elements.previewContainer.style.display = 'block';
        URL.revokeObjectURL(url);
    };
    img.src = url;
}

// =================== ACCIONES ===================
function handleEncrypt() {
    if (!currentFile) return;
    const password = elements.passwordInput.value.trim();
    if (password.length < 6) return showStatus('Contraseña mínima de 6 caracteres.', 'error');
    setProcessing(true, 'encrypt');
    currentFile.arrayBuffer().then(buf => {
        cryptoWorker.postMessage({ action: 'encrypt', data: { imageData: buf, password } });
    });
}

function handleDecrypt() {
    if (!currentFile) return;
    const password = elements.passwordInput.value.trim();
    if (!password) return showStatus('Ingrese contraseña.', 'error');
    setProcessing(true, 'decrypt');
    currentFile.text().then(txt => {
        const data = JSON.parse(txt);
        cryptoWorker.postMessage({ action: 'decrypt', data: { encryptedData: data, password } });
    });
}

function sanitizeFileName(name) {
    // Remove dangerous characters and limit length
    return name.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40);
}

function downloadEncryptedFile(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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
}

function updateButtonStates() {
    const hasPass = elements.passwordInput.value.trim().length > 0;
    elements.encryptBtn.disabled = !(currentFileType === 'image' && hasPass);
    elements.decryptBtn.disabled = !(currentFileType === 'json' && hasPass);
}

function togglePasswordVisibility() {
    const isPass = elements.passwordInput.type === 'password';
    elements.passwordInput.type = isPass ? 'text' : 'password';
    elements.passwordToggle.textContent = isPass ? '🙈' : '👁️';
}

function setProcessing(state, type = '') {
    elements.passwordInput.disabled = state;
    elements.encryptBtn.disabled = state;
    elements.decryptBtn.disabled = state;
    elements.fileInput.disabled = state;
    elements.encryptSpinner.classList.toggle('hidden', !(state && type === 'encrypt'));
    elements.decryptSpinner.classList.toggle('hidden', !(state && type === 'decrypt'));
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
