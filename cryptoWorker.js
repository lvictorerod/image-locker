// Worker: Robust error handling, input validation, and comments
self.onmessage = async e => {
    const { action, data } = e.data;
    try {
        if (!data || typeof action !== 'string') throw new Error('Datos de entrada inválidos');
        if (action === 'encrypt') {
            if (!data.imageData || !data.password || typeof data.password !== 'string' || data.password.length < 6) {
                throw new Error('Datos o contraseña inválidos para encriptar');
            }
            const res = await encryptImage(data.imageData, data.password);
            if (data.mimeType) res.mimeType = data.mimeType;
            self.postMessage({ success: true, result: res });
        } else if (action === 'decrypt') {
            if (!data.encryptedData || !data.password || typeof data.password !== 'string' || data.password.length < 1) {
                throw new Error('Datos o contraseña inválidos para desencriptar');
            }
            const res = await decryptImage(data.encryptedData, data.password);
            self.postMessage({ success: true, result: res });
        } else {
            throw new Error('Acción no reconocida');
        }
    } catch (err) {
        self.postMessage({ success: false, error: err.message || 'Error desconocido en el worker' });
    }
};

async function deriveKey(password, salt) {
    // Derive AES-GCM key from password and salt
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw', enc.encode(password),
        { name: 'PBKDF2' }, false,
        ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encryptImage(buffer, password) {
    // Encrypt image buffer with password
    if (!buffer || !password) throw new Error('Datos de imagen o contraseña faltantes');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buffer);
    return { salt: [...salt], iv: [...iv], encryptedData: [...new Uint8Array(encrypted)] };
}

async function decryptImage(data, password) {
    // Decrypt image buffer with password
    try {
        if (!data || !data.salt || !data.iv || !data.encryptedData || !password) {
            throw new Error('Datos de entrada incompletos para desencriptar');
        }
        const salt = new Uint8Array(data.salt);
        const iv = new Uint8Array(data.iv);
        const encrypted = new Uint8Array(data.encryptedData);
        const key = await deriveKey(password, salt);
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
        return new Uint8Array(decrypted);
    } catch {
        throw new Error('Contraseña incorrecta o archivo dañado');
    }
}
