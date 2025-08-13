# Image Locker

**Image Locker** is a browser-based tool for encrypting and decrypting images or JSON files using password-based AES-GCM encryption. All operations are performed locally in your browser, ensuring privacy and security without uploading files to any server.

## Features

- **Encrypt images or JSON files** with a password using AES-GCM.
- **Decrypt encrypted JSON files** back to images.
- **Drag-and-drop interface** for easy file selection.
- **Password visibility toggle** and minimum password length enforcement.
- **Download encrypted files** as JSON for secure sharing or storage.
- **Theme toggle** for light/dark mode.
- **No server required**—all cryptography is performed in your browser.

## Usage

1. **Open `index.html` in your browser.**
2. **Drag and drop** an image or JSON file into the drop zone, or click to select a file.
3. **Enter a password** (minimum 6 characters) to enable encryption or decryption.
4. **Click "Encriptar"** to encrypt an image, or **"Desencriptar"** to decrypt a JSON file.
5. **Download** the encrypted file (as JSON) or view the decrypted image in the preview area.

## Technologies

- HTML, CSS, JavaScript (Vanilla)
- Web Crypto API
- Web Workers

## Security

- All cryptographic operations are performed locally in your browser.
- Files are never uploaded or sent to any server.
- Uses PBKDF2 for key derivation and AES-GCM for encryption.

## License

MIT License

---

*Protect your images and data with modern browser
