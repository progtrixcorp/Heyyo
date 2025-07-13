const CryptoJS = require('crypto-js');

const SECRET_KEY = process.env.MESSAGE_ENCRYPTION_KEY;

exports.encryptMessage = (text) => {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

exports.decryptMessage = (ciphertext) => {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (err) {
    console.error('Decryption error:', err);
    return '';
  }
};
