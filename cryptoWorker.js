self.onmessage = async e => {
    const { action, data } = e.data;
    try {
        if (action === 'encrypt') {
            const res = await encryptImage(data.imageData, data.password);
            self.postMessage({ success: true, result: res });
        } else if (action === 'decrypt') {
            const res = await decryptImage(data.encryptedData, data.password);
            self.postMessage({ success: true, result: res });
        } else {
            throw new Error('Acción no reconocida');
        }
    } catch (err) {
        self.postMessage({ success: false, error: err.message });
    }
};

async function deriveKey(password, salt) {
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
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buffer);
    return { salt: [...salt], iv: [...iv], encryptedData: [...new Uint8Array(encrypted)] };
}

async function decryptImage(data, password) {
    try {
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
