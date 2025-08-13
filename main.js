/**
 * Image Locker - Production Ready Application
 * Secure image encryption/decryption with modern web technologies
 */

// Production constants
const CONFIG = {
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    MIN_PASSWORD_LENGTH: 6,
    ALLOWED_IMAGE_TYPES: ['image/png', 'image/jpeg', 'image/gif', 'image/bmp', 'image/webp'],
    FORBIDDEN_EXTENSIONS: /\.(html?|js|exe|bat|cmd|sh|php|svg)$/i,
    PREVIEW_MAX_WIDTH: 400,
    PREVIEW_MAX_HEIGHT: 300,
    LARGE_IMAGE_THRESHOLD: 1200 * 900
};

// Global error handler
window.addEventListener('error', handleGlobalError);
window.addEventListener('unhandledrejection', handleUnhandledRejection);

document.addEventListener('DOMContentLoaded', initializeApp);

// Application state
let currentFile = null;
let currentFileType = null;
let cryptoWorker = null;
let isProcessing = false;
let performanceMetrics = {
    startTime: 0,
    encryptionTime: 0,
    decryptionTime: 0
};

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

/**
 * Initialize the application with all components
 */
function initializeApp() {
    try {
        // Check browser compatibility
        if (!checkBrowserSupport()) {
            showError('Su navegador no soporta las funciones necesarias para esta aplicación.');
            return;
        }

        initializeTheme();
        setupEventListeners();
        initializeWorker();
        setupAccessibility();
        
        // Register service worker for offline support
        registerServiceWorker();
        
        logDebug('Application initialized successfully');
        showStatus('Aplicación lista. Selecciona una imagen o archivo JSON.', 'info');
    } catch (error) {
        handleGlobalError(error);
    }
}

/**
 * Check if browser supports required features
 */
function checkBrowserSupport() {
    return !!(
        window.crypto?.subtle && 
        window.Worker && 
        window.FileReader && 
        HTMLCanvasElement.prototype.getContext
    );
}

/**
 * Register service worker for offline functionality
 */
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            logDebug('Service Worker registered:', registration);
        } catch (error) {
            logDebug('Service Worker registration failed:', error);
        }
    }
}

/**
 * Setup accessibility features
 */
function setupAccessibility() {
    // Keyboard support for drop zone
    elements.dropZone.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            elements.fileInput.click();
        }
    });

    // Focus management
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-navigation');
        }
    });

    document.addEventListener('mousedown', function() {
        document.body.classList.remove('keyboard-navigation');
    });
}

/**
 * Global error handlers
 */
function handleGlobalError(error) {
    logError('Global error:', error);
    showError('Ha ocurrido un error inesperado. Por favor, recarga la página.');
}

function handleUnhandledRejection(event) {
    logError('Unhandled promise rejection:', event.reason);
    showError('Error en la aplicación. Por favor, intenta de nuevo.');
}

// =================== WORKER ===================
/**
 * Initialize crypto worker with error handling and performance monitoring
 */
function initializeWorker() {
    try {
        cryptoWorker = new Worker('cryptoWorker.js');
        
        cryptoWorker.onmessage = e => {
            const { success, result, error } = e.data;
            
            try {
                if (success) {
                    if (result.salt) {
                        // Encryption completed
                        performanceMetrics.encryptionTime = Date.now() - performanceMetrics.startTime;
                        logDebug(`Encryption completed in ${performanceMetrics.encryptionTime}ms`);
                        
                        downloadEncryptedFile(result);
                        showSuccess('Imagen encriptada exitosamente.');
                        resetApp();
                    } else {
                        // Decryption completed
                        performanceMetrics.decryptionTime = Date.now() - performanceMetrics.startTime;
                        logDebug(`Decryption completed in ${performanceMetrics.decryptionTime}ms`);
                        
                        displayDecryptedImage(result);
                        showSuccess('Imagen desencriptada exitosamente.');
                    }
                } else {
                    logError('Worker error:', error);
                    showError(error || 'Error en el procesamiento');
                }
            } catch (err) {
                handleGlobalError(err);
            } finally {
                setProcessing(false);
            }
        };

        cryptoWorker.onerror = (error) => {
            logError('Worker error event:', error);
            showError('Error en el worker de encriptación');
            setProcessing(false);
        };

    } catch (error) {
        logError('Failed to initialize worker:', error);
        showError('No se pudo inicializar el sistema de encriptación');
    }
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

/**
 * Enhanced file handler with comprehensive validation and security
 */
function handleFile(file) {
    try {
        logDebug('Processing file:', file.name, file.size, file.type);

        // Comprehensive validation
        const validation = validateFile(file);
        if (!validation.isValid) {
            showError(validation.error);
            hideImagePreview();
            clearFileSummary();
            return;
        }

        // Security check for file content (basic)
        if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
            showError('Nombre de archivo no válido por seguridad.');
            hideImagePreview();
            clearFileSummary();
            return;
        }

        currentFile = file;
        currentFileType = validation.fileType;
        
        // Show file summary with enhanced info
        showFileSummary(file);
        
        if (validation.fileType === 'image') {
            displayImagePreview(file);
        } else {
            hideImagePreview();
        }
        
        elements.passwordInput.disabled = false;
        elements.passwordInput.focus();
        updateButtonStates();
        
        logDebug('File processed successfully');
        
    } catch (error) {
        logError('Error processing file:', error);
        showError('Error al procesar el archivo.');
        hideImagePreview();
        clearFileSummary();
    }
}

/**
 * Comprehensive file validation
 */
function validateFile(file) {
    if (!file) {
        return { isValid: false, error: 'No se seleccionó ningún archivo.' };
    }

    // Check forbidden extensions
    if (CONFIG.FORBIDDEN_EXTENSIONS.test(file.name)) {
        return { isValid: false, error: 'Tipo de archivo no permitido por seguridad.' };
    }

    // Check file size
    if (file.size === 0) {
        return { isValid: false, error: 'El archivo está vacío.' };
    }

    if (file.size > CONFIG.MAX_FILE_SIZE) {
        const maxSizeMB = Math.round(CONFIG.MAX_FILE_SIZE / (1024 * 1024));
        return { isValid: false, error: `El archivo es demasiado grande (máx ${maxSizeMB}MB).` };
    }

    // Determine file type
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|gif|bmp|webp)$/i.test(file.name);
    const isJSON = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');

    if (!isImage && !isJSON) {
        return { isValid: false, error: 'Archivo no válido. Selecciona imagen o JSON.' };
    }

    // Additional image validation
    if (isImage && !CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type) && file.type) {
        logDebug('Image type not in whitelist, but allowing based on extension');
    }

    return { 
        isValid: true, 
        fileType: isImage ? 'image' : 'json',
        error: null 
    };
}

/**
 * Enhanced file summary display with accessibility
 */
function showFileSummary(file) {
    let summary = document.getElementById('fileSummary');
    if (!summary) {
        summary = document.createElement('div');
        summary.id = 'fileSummary';
        summary.className = 'file-summary';
        summary.setAttribute('aria-live', 'polite');
        summary.setAttribute('role', 'status');
        elements.dropZone.parentNode.insertBefore(summary, elements.dropZone.nextSibling);
    }
    
    const type = file.type || 'Desconocido';
    const size = formatFileSize(file.size);
    const lastModified = new Date(file.lastModified).toLocaleDateString();
    
    summary.innerHTML = `
        <div class="file-info">
            <div><strong>📁 Archivo:</strong> ${escapeHTML(file.name)}</div>
            <div><strong>📊 Tamaño:</strong> ${size}</div>
            <div><strong>🏷️ Tipo:</strong> ${escapeHTML(type)}</div>
            <div><strong>📅 Modificado:</strong> ${lastModified}</div>
        </div>
    `;
    summary.style.display = 'block';
}

/**
 * Clear file summary
 */
function clearFileSummary() {
    const summary = document.getElementById('fileSummary');
    if (summary) {
        summary.style.display = 'none';
        summary.innerHTML = '';
    }
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Enhanced image preview with progressive loading and error handling
 */
function displayImagePreview(file) {
    if (!file?.type?.startsWith('image/')) {
        logError('Invalid file for preview');
        return;
    }

    // Show loading state
    showLoadingState('Cargando vista previa...');
    
    const reader = new FileReader();
    
    reader.onloadstart = () => {
        logDebug('Starting to read file for preview');
    };
    
    reader.onprogress = (e) => {
        if (e.lengthComputable) {
            const percentLoaded = Math.round((e.loaded / e.total) * 100);
            updateLoadingState(`Cargando vista previa... ${percentLoaded}%`);
        }
    };
    
    reader.onload = e => {
        try {
            const img = new Image();
            
            img.onload = () => {
                try {
                    renderImageToCanvas(img);
                    elements.previewContainer.classList.add('active');
                    hideLoadingState();
                    logDebug('Image preview rendered successfully');
                } catch (error) {
                    logError('Error rendering image to canvas:', error);
                    showError('Error al mostrar la vista previa.');
                    hideImagePreview();
                    hideLoadingState();
                }
            };
            
            img.onerror = (error) => {
                logError('Error loading image for preview:', error);
                showError('No se pudo mostrar la imagen.');
                hideImagePreview();
                hideLoadingState();
            };
            
            img.src = e.target.result;
            
        } catch (error) {
            logError('Error processing image preview:', error);
            showError('Error al procesar la vista previa.');
            hideImagePreview();
            hideLoadingState();
        }
    };
    
    reader.onerror = (error) => {
        logError('FileReader error:', error);
        showError('Error al leer la imagen.');
        hideImagePreview();
        hideLoadingState();
    };
    
    reader.readAsDataURL(file);
}

/**
 * Render image to canvas with performance optimization
 */
function renderImageToCanvas(img) {
    const canvas = elements.previewCanvas;
    const ctx = canvas.getContext('2d');
    
    let { width, height } = img;
    const maxW = CONFIG.PREVIEW_MAX_WIDTH;
    const maxH = CONFIG.PREVIEW_MAX_HEIGHT;
    
    // Performance optimization for large images
    if (width * height > CONFIG.LARGE_IMAGE_THRESHOLD) {
        // Use progressive scaling for very large images
        const scale = Math.min(maxW / width, maxH / height, 0.5);
        width *= scale;
        height *= scale;
    } else {
        // Standard scaling
        if (width > maxW) { height *= maxW / width; width = maxW; }
        if (height > maxH) { width *= maxH / height; height = maxH; }
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // Use smooth scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(img, 0, 0, width, height);
}

/**
 * Loading state management
 */
function showLoadingState(message) {
    let loadingEl = document.getElementById('loadingState');
    if (!loadingEl) {
        loadingEl = document.createElement('div');
        loadingEl.id = 'loadingState';
        loadingEl.className = 'loading-state';
        loadingEl.setAttribute('aria-live', 'polite');
        elements.previewContainer.parentNode.insertBefore(loadingEl, elements.previewContainer);
    }
    loadingEl.textContent = message;
    loadingEl.style.display = 'block';
}

function updateLoadingState(message) {
    const loadingEl = document.getElementById('loadingState');
    if (loadingEl) {
        loadingEl.textContent = message;
    }
}

function hideLoadingState() {
    const loadingEl = document.getElementById('loadingState');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
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

// =================== ENHANCED ACTIONS ===================
/**
 * Enhanced action handler with comprehensive error handling and performance monitoring
 */
function handleAction() {
    if (isProcessing) {
        logDebug('Action already in progress, ignoring');
        return;
    }

    try {
        if (!currentFile) {
            showError('No hay archivo seleccionado.');
            return;
        }

        const password = elements.passwordInput.value.trim();
        
        if (currentFileType === 'image') {
            handleEncryption(password);
        } else if (currentFileType === 'json') {
            handleDecryption(password);
        } else {
            showError('Tipo de archivo no reconocido.');
        }
        
    } catch (error) {
        logError('Error in handleAction:', error);
        showError('Error al procesar la acción.');
        setProcessing(false);
    }
}

/**
 * Handle image encryption with validation and performance monitoring
 */
async function handleEncryption(password) {
    try {
        // Validate password
        if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
            showError(`Contraseña mínima de ${CONFIG.MIN_PASSWORD_LENGTH} caracteres.`);
            elements.passwordInput.focus();
            return;
        }

        // Additional password strength validation
        if (!validatePasswordStrength(password)) {
            showError('La contraseña debe contener al menos una letra y un número.');
            elements.passwordInput.focus();
            return;
        }

        logDebug('Starting encryption process');
        performanceMetrics.startTime = Date.now();
        
        setProcessing(true, 'encrypt');
        showStatus('Encriptando imagen...', 'info');

        const buffer = await currentFile.arrayBuffer();
        
        cryptoWorker.postMessage({ 
            action: 'encrypt', 
            data: { 
                imageData: buffer, 
                password, 
                mimeType: currentFile.type 
            } 
        });
        
    } catch (error) {
        logError('Error in encryption process:', error);
        showError('Error al leer el archivo para encriptar.');
        setProcessing(false);
    }
}

/**
 * Handle file decryption with validation and performance monitoring
 */
async function handleDecryption(password) {
    try {
        if (!password) {
            showError('Ingrese contraseña para desencriptar.');
            elements.passwordInput.focus();
            return;
        }

        logDebug('Starting decryption process');
        performanceMetrics.startTime = Date.now();
        
        setProcessing(true, 'decrypt');
        showStatus('Desencriptando archivo...', 'info');

        const text = await currentFile.text();
        let data;
        
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            logError('JSON parse error:', parseError);
            showError('El archivo JSON está corrupto o no es válido.');
            setProcessing(false);
            return;
        }

        // Validate JSON structure
        if (!validateEncryptedData(data)) {
            showError('El archivo JSON no contiene datos encriptados válidos.');
            setProcessing(false);
            return;
        }

        cryptoWorker.postMessage({ 
            action: 'decrypt', 
            data: { 
                encryptedData: data, 
                password 
            } 
        });
        
    } catch (error) {
        logError('Error in decryption process:', error);
        showError('Error al leer el archivo JSON.');
        setProcessing(false);
    }
}

/**
 * Validate password strength
 */
function validatePasswordStrength(password) {
    // Basic validation: at least one letter and one number
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    return hasLetter && hasNumber;
}

/**
 * Validate encrypted data structure
 */
function validateEncryptedData(data) {
    return (
        data &&
        typeof data === 'object' &&
        Array.isArray(data.salt) &&
        Array.isArray(data.iv) &&
        Array.isArray(data.encryptedData) &&
        data.salt.length > 0 &&
        data.iv.length > 0 &&
        data.encryptedData.length > 0
    );
}

// =================== UTILITIES ===================
/**
 * Enhanced HTML escaping for XSS prevention
 */
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    
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

/**
 * Enhanced processing state management
 */
function setProcessing(state, type = '') {
    try {
        isProcessing = state;
        elements.passwordInput.disabled = state;
        elements.actionBtn.disabled = state;
        elements.fileInput.disabled = state;
        elements.actionSpinner.classList.toggle('hidden', !state);
        
        if (state) {
            elements.actionBtnText.textContent = type === 'encrypt' ? 'Encriptando...' : 'Desencriptando...';
            document.body.style.cursor = 'wait';
        } else {
            document.body.style.cursor = 'default';
            updateButtonStates();
        }
        
        logDebug(`Processing state changed to: ${state}`);
        
    } catch (error) {
        logError('Error setting processing state:', error);
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

// =================== ENHANCED STATUS MANAGEMENT ===================
/**
 * Show success message with accessibility
 */
function showSuccess(message) {
    showStatus(message, 'success');
}

/**
 * Show error message with accessibility and logging
 */
function showError(message) {
    logError('User facing error:', message);
    showStatus(message, 'error');
}

/**
 * Enhanced status display with better UX
 */
function showStatus(msg, type) {
    try {
        elements.statusMessage.textContent = escapeHTML(msg);
        elements.statusMessage.className = `status-message status-${type}`;
        elements.statusMessage.style.display = 'block';
        elements.statusMessage.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
        elements.statusMessage.setAttribute('role', 'alert');
        elements.statusMessage.tabIndex = 0;
        
        // Auto-focus for screen readers
        if (type === 'error') {
            elements.statusMessage.focus();
        }
        
        // Auto-hide success messages after delay
        if (type === 'success') {
            setTimeout(() => {
                if (elements.statusMessage.className.includes('status-success')) {
                    elements.statusMessage.style.opacity = '0.7';
                }
            }, 3000);
        }
        
        logDebug(`Status displayed: ${type} - ${msg}`);
        
    } catch (error) {
        logError('Error displaying status:', error);
    }
}

// =================== ENHANCED RESET AND SECURITY ===================
/**
 * Comprehensive application reset with security focus
 */
function resetApp() {
    try {
        logDebug('Resetting application state');
        
        // Clear sensitive variables immediately
        currentFile = null;
        currentFileType = null;
        isProcessing = false;
        
        // Terminate worker for security (prevent memory leaks)
        if (cryptoWorker) {
            cryptoWorker.terminate();
            cryptoWorker = null;
            logDebug('Crypto worker terminated');
        }
        
        // Clear all UI elements
        elements.fileInput.value = '';
        elements.passwordInput.value = '';
        elements.passwordInput.disabled = true;
        
        // Clear file summary and preview
        hideImagePreview();
        clearFileSummary();
        hideLoadingState();
        
        // Reset status
        elements.statusMessage.textContent = '';
        elements.statusMessage.className = 'status-message';
        elements.statusMessage.style.display = 'none';
        elements.statusMessage.style.opacity = '1';
        
        // Reset button states
        elements.actionBtn.disabled = true;
        elements.actionBtnText.textContent = 'Encriptar';
        elements.actionSpinner.classList.add('hidden');
        
        // Clear drag states
        elements.dropZone.classList.remove('drag-over');
        
        // Force garbage collection hint
        if (window.gc) {
            window.gc();
        }
        
        // Re-initialize worker
        initializeWorker();
        
        // Show ready state
        setTimeout(() => {
            showStatus('Aplicación lista. Selecciona una imagen o archivo JSON.', 'info');
        }, 100);
        
        logDebug('Application reset completed');
        
    } catch (error) {
        logError('Error during app reset:', error);
        // Fallback: reload page if reset fails
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
}

// =================== LOGGING AND DEBUGGING ===================
/**
 * Development logging (removed in production build)
 */
function logDebug(...args) {
    if (typeof DEBUG !== 'undefined' && DEBUG) {
        console.log('[ImageLocker Debug]', ...args);
    }
}

/**
 * Error logging (always enabled)
 */
function logError(...args) {
    console.error('[ImageLocker Error]', ...args);
    
    // In production, you might want to send to error tracking service
    // sendToErrorTracking(args);
}

/**
 * Performance logging
 */
function logPerformance(operation, duration) {
    logDebug(`Performance: ${operation} took ${duration}ms`);
    
    // In production, send to analytics
    // sendPerformanceMetric(operation, duration);
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
