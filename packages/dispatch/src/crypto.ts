import crypto from 'crypto';

// The key must be exactly 32 bytes (256 bits) for AES-256
const getMasterKey = (): Buffer => {
    const keyString = process.env.VAULT_MASTER_KEY;
    if (!keyString) {
        throw new Error('Fatal: VAULT_MASTER_KEY environment variable is not defined.');
    }

    // We expect a 64-character hex string (32 bytes)
    const key = Buffer.from(keyString, 'hex');
    if (key.length !== 32) {
        throw new Error(`Fatal: VAULT_MASTER_KEY must be exactly 32 bytes (64 hex characters). Found: ${key.length} bytes.`);
    }
    return key;
};

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a URL-safe, base64 encoded string containing the IV, ciphertext, and auth tag.
 * Format: iv.authTag.ciphertext
 */
export function encrypt(text: string): string {
    const key = getMasterKey();
    const iv = crypto.randomBytes(12); // GCM standard IV size is 12 bytes
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');

    return `${iv.toString('base64')}.${authTag}.${encrypted}`;
}

/**
 * Decrypt a ciphertext string previously encrypted by this module.
 */
export function decrypt(encryptedData: string): string {
    const key = getMasterKey();
    const parts = encryptedData.split('.');

    if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format. Expected iv.authTag.ciphertext');
    }

    const [ivStr, authTagStr, ciphertextStr] = parts;
    const iv = Buffer.from(ivStr, 'base64');
    const authTag = Buffer.from(authTagStr, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextStr, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
