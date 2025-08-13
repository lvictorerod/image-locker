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
6. **Quality Control**: Configure image quality settings for optimal results
7. **High-Quality Download**: Download decrypted images in maximum quality

### Quality Settings

- **Preserve Maximum Quality**: Enables highest quality rendering settings
- **Lossless Format**: Use PNG format to avoid compression artifacts
- **Quality Slider**: Fine-tune compression level (10%-100%)
- **High-Resolution Support**: Optimized processing for large images
- **Format Preservation**: Maintains original image format when possible

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

### Image Quality Preservation

- **High-Quality Canvas Rendering**: Advanced smoothing algorithms with configurable quality settings
- **Lossless Format Support**: Option to use PNG format for zero compression artifacts  
- **Multi-Pass Scaling**: Progressive scaling for large images to maintain quality
- **User-Controlled Quality**: Adjustable quality settings from 10% to 100%
- **High-DPI Support**: Automatic scaling for high-resolution displays
- **Original Format Preservation**: Maintains original file format metadata

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
