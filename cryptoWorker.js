/**
 * Crypto Worker - Production Ready
 * Secure image encryption/decryption with enhanced error handling and performance monitoring
 */

// Worker configuration
const WORKER_CONFIG = {
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    MIN_PASSWORD_LENGTH: 6,
    PBKDF2_ITERATIONS: 250000,
    SALT_LENGTH: 16,
    IV_LENGTH: 12
};

// Performance monitoring
let performanceMetrics = {
    operationStart: 0,
    keyDerivationTime: 0,
    encryptionTime: 0,
    decryptionTime: 0
};

// Worker: Enhanced message handler with comprehensive validation and error handling
self.onmessage = async e => {
    const startTime = performance.now();
    performanceMetrics.operationStart = startTime;
    
    try {
        // Validate message structure
        if (!e.data || typeof e.data !== 'object') {
            throw new Error('Estructura de mensaje inválida');
        }
        
        const { action, data } = e.data;
        
        // Validate action and data
        if (!data || typeof action !== 'string') {
            throw new Error('Datos de entrada inválidos');
        }
        
        // Log operation start (in development)
        logWorkerDebug(`Starting ${action} operation`);
        
        let result;
        
        if (action === 'encrypt') {
            result = await handleEncryption(data);
        } else if (action === 'decrypt') {
            result = await handleDecryption(data);
        } else {
            throw new Error(`Acción no reconocida: ${action}`);
        }
        
        const totalTime = performance.now() - startTime;
        logWorkerDebug(`${action} completed in ${totalTime.toFixed(2)}ms`);
        
        // Send successful result with performance metrics
        self.postMessage({ 
            success: true, 
            result,
            metrics: {
                totalTime,
                keyDerivationTime: performanceMetrics.keyDerivationTime,
                operationTime: action === 'encrypt' ? performanceMetrics.encryptionTime : performanceMetrics.decryptionTime
            }
        });
        
    } catch (err) {
        const totalTime = performance.now() - startTime;
        
        logWorkerError('Worker operation failed:', err);
        
        // Send error result
        self.postMessage({ 
            success: false, 
            error: err.message || 'Error desconocido en el worker',
            metrics: {
                totalTime,
                failed: true
            }
        });
    }
};

/**
 * Handle encryption with comprehensive validation
 */
async function handleEncryption(data) {
    try {
        // Validate encryption data
        if (!data.imageData || !data.password || typeof data.password !== 'string') {
            throw new Error('Datos de imagen o contraseña faltantes');
        }
        
        if (data.password.length < WORKER_CONFIG.MIN_PASSWORD_LENGTH) {
            throw new Error(`Contraseña debe tener al menos ${WORKER_CONFIG.MIN_PASSWORD_LENGTH} caracteres`);
        }
        
        // Validate file size
        if (data.imageData.byteLength > WORKER_CONFIG.MAX_FILE_SIZE) {
            throw new Error('El archivo es demasiado grande para procesar');
        }
        
        if (data.imageData.byteLength === 0) {
            throw new Error('El archivo está vacío');
        }
        
        // Perform encryption
        const result = await encryptImage(data.imageData, data.password);
        
        // Include MIME type if provided
        if (data.mimeType) {
            result.mimeType = data.mimeType;
        }
        
        return result;
        
    } catch (error) {
        logWorkerError('Encryption error:', error);
        throw new Error(`Error en encriptación: ${error.message}`);
    }
}

/**
 * Handle decryption with comprehensive validation
 */
async function handleDecryption(data) {
    try {
        // Validate decryption data
        if (!data.encryptedData || !data.password || typeof data.password !== 'string') {
            throw new Error('Datos encriptados o contraseña faltantes');
        }
        
        if (data.password.length < 1) {
            throw new Error('Contraseña requerida para desencriptar');
        }
        
        // Validate encrypted data structure
        if (!validateEncryptedDataStructure(data.encryptedData)) {
            throw new Error('Estructura de datos encriptados inválida');
        }
        
        // Perform decryption
        return await decryptImage(data.encryptedData, data.password);
        
    } catch (error) {
        logWorkerError('Decryption error:', error);
        throw new Error(`Error en desencriptación: ${error.message}`);
    }
}

/**
 * Validate encrypted data structure
 */
function validateEncryptedDataStructure(data) {
    return (
        data &&
        typeof data === 'object' &&
        Array.isArray(data.salt) &&
        Array.isArray(data.iv) &&
        Array.isArray(data.encryptedData) &&
        data.salt.length === WORKER_CONFIG.SALT_LENGTH &&
        data.iv.length === WORKER_CONFIG.IV_LENGTH &&
        data.encryptedData.length > 0
    );
}

/**
 * Enhanced key derivation with performance monitoring
 */
async function deriveKey(password, salt) {
    const keyDerivationStart = performance.now();
    
    try {
        // Validate inputs
        if (!password || !salt) {
            throw new Error('Contraseña o salt faltantes para derivación de clave');
        }
        
        // Derive AES-GCM key from password and salt using PBKDF2
        const enc = new TextEncoder();
        const passwordBuffer = enc.encode(password);
        
        // Import password as key material
        const keyMaterial = await crypto.subtle.importKey(
            'raw', 
            passwordBuffer,
            { name: 'PBKDF2' }, 
            false,
            ['deriveKey']
        );
        
        // Derive the actual encryption key
        const derivedKey = await crypto.subtle.deriveKey(
            { 
                name: 'PBKDF2', 
                salt: salt, 
                iterations: WORKER_CONFIG.PBKDF2_ITERATIONS, 
                hash: 'SHA-256' 
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
        
        performanceMetrics.keyDerivationTime = performance.now() - keyDerivationStart;
        logWorkerDebug(`Key derivation took ${performanceMetrics.keyDerivationTime.toFixed(2)}ms`);
        
        return derivedKey;
        
    } catch (error) {
        logWorkerError('Key derivation failed:', error);
        throw new Error('Error en derivación de clave');
    }
}

/**
 * Enhanced image encryption with performance monitoring
 */
async function encryptImage(buffer, password) {
    const encryptionStart = performance.now();
    
    try {
        if (!buffer || !password) {
            throw new Error('Buffer de imagen o contraseña faltantes');
        }
        
        // Generate cryptographically secure random values
        const salt = crypto.getRandomValues(new Uint8Array(WORKER_CONFIG.SALT_LENGTH));
        const iv = crypto.getRandomValues(new Uint8Array(WORKER_CONFIG.IV_LENGTH));
        
        // Derive encryption key
        const key = await deriveKey(password, salt);
        
        // Perform AES-GCM encryption
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv }, 
            key, 
            buffer
        );
        
        performanceMetrics.encryptionTime = performance.now() - encryptionStart;
        logWorkerDebug(`Encryption took ${performanceMetrics.encryptionTime.toFixed(2)}ms`);
        
        // Return encrypted data with metadata
        return { 
            salt: [...salt], 
            iv: [...iv], 
            encryptedData: [...new Uint8Array(encrypted)],
            timestamp: Date.now(),
            version: '1.0.0'
        };
        
    } catch (error) {
        logWorkerError('Encryption failed:', error);
        throw new Error('Error durante la encriptación');
    }
}

/**
 * Enhanced image decryption with performance monitoring
 */
async function decryptImage(data, password) {
    const decryptionStart = performance.now();
    
    try {
        // Validate and extract encrypted data components
        if (!data?.salt || !data?.iv || !data?.encryptedData || !password) {
            throw new Error('Datos de entrada incompletos para desencriptar');
        }
        
        const salt = new Uint8Array(data.salt);
        const iv = new Uint8Array(data.iv);
        const encrypted = new Uint8Array(data.encryptedData);
        
        // Derive decryption key (same as encryption key)
        const key = await deriveKey(password, salt);
        
        // Perform AES-GCM decryption
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv }, 
            key, 
            encrypted
        );
        
        performanceMetrics.decryptionTime = performance.now() - decryptionStart;
        logWorkerDebug(`Decryption took ${performanceMetrics.decryptionTime.toFixed(2)}ms`);
        
        return new Uint8Array(decrypted);
        
    } catch (error) {
        logWorkerError('Decryption failed:', error);
        
        // Provide more specific error messages
        if (error.name === 'OperationError') {
            throw new Error('Contraseña incorrecta o archivo dañado');
        } else {
            throw new Error('Error durante la desencriptación');
        }
    }
}

// =================== LOGGING UTILITIES ===================
/**
 * Debug logging for worker (development only)
 */
function logWorkerDebug(...args) {
    if (typeof DEBUG !== 'undefined' && DEBUG) {
        console.log('[CryptoWorker Debug]', ...args);
    }
}

/**
 * Error logging for worker (always enabled)
 */
function logWorkerError(...args) {
    console.error('[CryptoWorker Error]', ...args);
}

// =================== WORKER LIFECYCLE ===================
/**
 * Handle worker errors
 */
self.onerror = function(error) {
    logWorkerError('Worker global error:', error);
    self.postMessage({
        success: false,
        error: 'Error crítico en el worker de encriptación'
    });
};

/**
 * Handle unhandled promise rejections
 */
self.onunhandledrejection = function(event) {
    logWorkerError('Worker unhandled rejection:', event.reason);
    self.postMessage({
        success: false,
        error: 'Error no manejado en el worker'
    });
};

// Log worker initialization
logWorkerDebug('CryptoWorker initialized successfully');
