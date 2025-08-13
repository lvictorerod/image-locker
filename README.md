# Image Locker - Production Ready

A secure, client-side image encryption/decryption application built with modern web technologies.

## 🚀 Features

- **🔒 Client-Side Security**: All encryption/decryption happens in your browser
- **🏃‍♂️ High Performance**: Web Workers for non-blocking operations
- **📱 Responsive Design**: Works on desktop, tablet, and mobile
- **🎨 Modern UI/UX**: Clean, accessible interface with dark/light themes
- **♿ Accessibility**: WCAG compliant with keyboard navigation and screen reader support
- **🔄 Offline Ready**: Service Worker for offline functionality
- **🛡️ Security Hardened**: CSP, input sanitization, and secure coding practices

## 🔧 Technical Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Encryption**: Web Crypto API (AES-GCM, PBKDF2)
- **Workers**: Web Workers for crypto operations
- **Storage**: Client-side only (no server)
- **PWA**: Service Worker, offline capability

## 🚀 Quick Start

### Development

```bash
# Start development server
python -m http.server 8080

# Open browser
open http://localhost:8080
```

## 📋 Usage

1. **Select Image**: Drag & drop or click to select an image file
2. **Enter Password**: Minimum 6 characters with letters and numbers
3. **Encrypt**: Click "Encriptar" to create encrypted JSON file
4. **Decrypt**: Select encrypted JSON file and enter password
5. **Download**: Encrypted files download automatically

### Supported Formats

- **Input**: PNG, JPEG, GIF, BMP, WebP images
- **Output**: JSON files with encrypted data
- **Max Size**: 50MB per file

## 🔒 Security Features

### Encryption

- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 (250,000 iterations)
- **Salt**: 16-byte random salt per encryption
- **IV**: 12-byte random initialization vector

### Security Measures

- Content Security Policy (CSP)
- Input sanitization and validation
- XSS protection
- No server-side data storage
- Secure random number generation
- Memory cleanup after operations

## ♿ Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader compatible
- High contrast mode support
- Focus management
- ARIA labels and roles

## 🌐 Browser Support

- Chrome/Edge 88+
- Firefox 84+
- Safari 14+
- Modern mobile browsers

### Required APIs

- Web Crypto API
- Web Workers
- FileReader API
- Service Workers

---

Made with ❤️ for privacy and security
