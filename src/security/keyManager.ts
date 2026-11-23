import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  generateRandomBytes,
  deriveMasterKey,
  encryptAesGcm,
  decryptAesGcm,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from './cipher';

const SECURE_STORE_SALT = 'nl_vault_salt';
const SECURE_STORE_ENC_VAULT_KEY = 'nl_enc_vault_key';
const SECURE_STORE_VAULT_KEY_IV = 'nl_vault_key_iv';
const SECURE_STORE_VAULT_KEY_TAG = 'nl_vault_key_tag';
const SECURE_STORE_BIO_VAULT_KEY = 'nl_bio_vault_key';
const SECURE_STORE_BIO_ENABLED = 'nl_bio_enabled';

// Recovery wrapping keys
const SECURE_STORE_REC_WRAP = 'nl_rec_wrap';
const SECURE_STORE_REC_IV = 'nl_rec_iv';
const SECURE_STORE_REC_TAG = 'nl_rec_tag';

export interface SetupResult {
  vaultKey: Uint8Array;
  recoveryPhrase: string[];
}

/**
 * Check if the user has already configured a vault on this device
 */
export async function isVaultConfigured(): Promise<boolean> {
  const encKey = await SecureStore.getItemAsync(SECURE_STORE_ENC_VAULT_KEY);
  return Boolean(encKey);
}

/**
 * Check whether hardware biometrics are supported and enrolled
 */
export async function checkBiometricsAvailable(): Promise<{
  hasHardware: boolean;
  isEnrolled: boolean;
  biometryType: LocalAuthentication.AuthenticationType[];
}> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  const biometryType = await LocalAuthentication.supportedAuthenticationTypesAsync();
  return { hasHardware, isEnrolled, biometryType };
}

export async function isBiometricsEnabled(): Promise<boolean> {
  const enabled = await SecureStore.getItemAsync(SECURE_STORE_BIO_ENABLED);
  return enabled === 'true';
}

export async function setBiometricsEnabled(enabled: boolean, vaultKey?: Uint8Array): Promise<void> {
  await SecureStore.setItemAsync(SECURE_STORE_BIO_ENABLED, enabled ? 'true' : 'false');
  if (enabled && vaultKey) {
    try {
      await SecureStore.setItemAsync(
        SECURE_STORE_BIO_VAULT_KEY,
        uint8ArrayToBase64(vaultKey)
      );
    } catch (err) {
      console.warn('Failed to store biometric vault key:', err);
      throw err;
    }
  } else if (!enabled) {
    await SecureStore.deleteItemAsync(SECURE_STORE_BIO_VAULT_KEY).catch(() => {});
  }
}

/**
 * 12-word recovery wordlist
 */
const WORDLIST = [
  'shield', 'anchor', 'harbor', 'beacon', 'citadel', 'granite',
  'cipher', 'matrix', 'summit', 'aurora', 'timber', 'glacier',
  'horizon', 'nebula', 'zenith', 'pulse', 'quantum', 'cobalt',
  'vanguard', 'sentinel', 'bastion', 'amber', 'prism', 'solitude',
];

export function generateRecoveryPhrase(): string[] {
  const words: string[] = [];
  const randomIndices = generateRandomBytes(12);
  for (let i = 0; i < 12; i++) {
    const index = randomIndices[i] % WORDLIST.length;
    words.push(WORDLIST[index]);
  }
  return words;
}

/**
 * Initialize a new vault with a Master Password and dual-wrapped Vault Key
 */
export async function setupVault(password: string): Promise<SetupResult> {
  // 1. Generate 16-byte random salt
  const salt = generateRandomBytes(16);
  // 2. Generate 32-byte Vault Key (KEK)
  const vaultKey = generateRandomBytes(32);
  // 3. Derive 32-byte Master Key from Password + Salt
  const masterKey = deriveMasterKey(password, salt);
  // 4. Encrypt the Vault Key with the Master Key
  const { ciphertext, iv, tag } = encryptAesGcm(masterKey, vaultKey);

  // 5. Generate 12-word recovery phrase and wrap Vault Key with Recovery Key
  const recoveryPhrase = generateRecoveryPhrase();
  const recoveryKey = deriveMasterKey(recoveryPhrase.join(' ').toLowerCase().trim(), salt);
  const { ciphertext: recCipher, iv: recIv, tag: recTag } = encryptAesGcm(recoveryKey, vaultKey);

  // 6. Store in SecureStore
  await SecureStore.setItemAsync(SECURE_STORE_SALT, uint8ArrayToBase64(salt));
  await SecureStore.setItemAsync(SECURE_STORE_ENC_VAULT_KEY, uint8ArrayToBase64(ciphertext));
  await SecureStore.setItemAsync(SECURE_STORE_VAULT_KEY_IV, uint8ArrayToBase64(iv));
  await SecureStore.setItemAsync(SECURE_STORE_VAULT_KEY_TAG, uint8ArrayToBase64(tag));

  // Store recovery wrapper
  await SecureStore.setItemAsync(SECURE_STORE_REC_WRAP, uint8ArrayToBase64(recCipher));
  await SecureStore.setItemAsync(SECURE_STORE_REC_IV, uint8ArrayToBase64(recIv));
  await SecureStore.setItemAsync(SECURE_STORE_REC_TAG, uint8ArrayToBase64(recTag));

  // Check if biometrics can be automatically enrolled
  const { hasHardware, isEnrolled } = await checkBiometricsAvailable();
  if (hasHardware && isEnrolled) {
    await setBiometricsEnabled(true, vaultKey);
  }

  return { vaultKey, recoveryPhrase };
}

/**
 * Unlock the vault using the Master Password
 */
export async function unlockWithPassword(password: string): Promise<Uint8Array> {
  const saltBase64 = await SecureStore.getItemAsync(SECURE_STORE_SALT);
  const encKeyBase64 = await SecureStore.getItemAsync(SECURE_STORE_ENC_VAULT_KEY);
  const ivBase64 = await SecureStore.getItemAsync(SECURE_STORE_VAULT_KEY_IV);
  const tagBase64 = await SecureStore.getItemAsync(SECURE_STORE_VAULT_KEY_TAG);

  if (!saltBase64 || !encKeyBase64 || !ivBase64 || !tagBase64) {
    throw new Error('Vault is not properly configured on this device.');
  }

  const salt = base64ToUint8Array(saltBase64);
  const ciphertext = base64ToUint8Array(encKeyBase64);
  const iv = base64ToUint8Array(ivBase64);
  const tag = base64ToUint8Array(tagBase64);

  // Derive master key
  const masterKey = deriveMasterKey(password, salt);

  try {
    const vaultKey = decryptAesGcm(masterKey, ciphertext, iv, tag);
    return vaultKey;
  } catch {
    throw new Error('Incorrect master password. Decryption failed.');
  }
}

/**
 * Recover Vault using the 12-word Emergency Recovery Phrase & set a new Master Password
 */
export async function recoverVaultWithPhrase(
  phrase: string,
  newPassword: string
): Promise<Uint8Array> {
  const saltBase64 = await SecureStore.getItemAsync(SECURE_STORE_SALT);
  const recWrapBase64 = await SecureStore.getItemAsync(SECURE_STORE_REC_WRAP);
  const recIvBase64 = await SecureStore.getItemAsync(SECURE_STORE_REC_IV);
  const recTagBase64 = await SecureStore.getItemAsync(SECURE_STORE_REC_TAG);

  if (!saltBase64 || !recWrapBase64 || !recIvBase64 || !recTagBase64) {
    throw new Error('Recovery configuration not found on this device.');
  }

  const salt = base64ToUint8Array(saltBase64);
  const recCipher = base64ToUint8Array(recWrapBase64);
  const recIv = base64ToUint8Array(recIvBase64);
  const recTag = base64ToUint8Array(recTagBase64);

  // Normalize recovery phrase words
  const normalizedPhrase = phrase.trim().toLowerCase().split(/\s+/).join(' ');
  const recoveryKey = deriveMasterKey(normalizedPhrase, salt);

  let vaultKey: Uint8Array;
  try {
    vaultKey = decryptAesGcm(recoveryKey, recCipher, recIv, recTag);
  } catch {
    throw new Error('Invalid recovery phrase. Words do not match.');
  }

  // Re-wrap Vault Key with the NEW Master Password
  const newMasterKey = deriveMasterKey(newPassword, salt);
  const { ciphertext, iv, tag } = encryptAesGcm(newMasterKey, vaultKey);

  await SecureStore.setItemAsync(SECURE_STORE_ENC_VAULT_KEY, uint8ArrayToBase64(ciphertext));
  await SecureStore.setItemAsync(SECURE_STORE_VAULT_KEY_IV, uint8ArrayToBase64(iv));
  await SecureStore.setItemAsync(SECURE_STORE_VAULT_KEY_TAG, uint8ArrayToBase64(tag));

  // Update biometric key if enabled
  const bioEnabled = await isBiometricsEnabled();
  if (bioEnabled) {
    await setBiometricsEnabled(true, vaultKey);
  }

  return vaultKey;
}

/**
 * Unlock the vault using Biometrics (Fingerprint / FaceID)
 */
export async function unlockWithBiometrics(): Promise<Uint8Array | null> {
  const bioEnabled = await isBiometricsEnabled();
  if (!bioEnabled) {
    return null;
  }

  const bioVaultKeyBase64 = await SecureStore.getItemAsync(SECURE_STORE_BIO_VAULT_KEY);
  if (!bioVaultKeyBase64) {
    return null;
  }

  const authResult = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock BUBI Vault',
    fallbackLabel: 'Use Master Password',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });

  if (!authResult.success) {
    return null;
  }

  return base64ToUint8Array(bioVaultKeyBase64);
}

/**
 * Update the Master Password for an unlocked vault
 */
export async function changeMasterPassword(vaultKey: Uint8Array, newPassword: string): Promise<void> {
  const salt = generateRandomBytes(16);
  const masterKey = deriveMasterKey(newPassword, salt);
  const { ciphertext, iv, tag } = encryptAesGcm(masterKey, vaultKey);

  await SecureStore.setItemAsync(SECURE_STORE_SALT, uint8ArrayToBase64(salt));
  await SecureStore.setItemAsync(SECURE_STORE_ENC_VAULT_KEY, uint8ArrayToBase64(ciphertext));
  await SecureStore.setItemAsync(SECURE_STORE_VAULT_KEY_IV, uint8ArrayToBase64(iv));
  await SecureStore.setItemAsync(SECURE_STORE_VAULT_KEY_TAG, uint8ArrayToBase64(tag));

  const bioEnabled = await isBiometricsEnabled();
  if (bioEnabled) {
    await setBiometricsEnabled(true, vaultKey);
  }
}

/**
 * Complete Vault Reset: Wipes all SecureStore keys
 */
export async function resetVaultKeys(): Promise<void> {
  await SecureStore.deleteItemAsync(SECURE_STORE_SALT).catch(() => {});
  await SecureStore.deleteItemAsync(SECURE_STORE_ENC_VAULT_KEY).catch(() => {});
  await SecureStore.deleteItemAsync(SECURE_STORE_VAULT_KEY_IV).catch(() => {});
  await SecureStore.deleteItemAsync(SECURE_STORE_VAULT_KEY_TAG).catch(() => {});
  await SecureStore.deleteItemAsync(SECURE_STORE_BIO_VAULT_KEY).catch(() => {});
  await SecureStore.deleteItemAsync(SECURE_STORE_BIO_ENABLED).catch(() => {});
  await SecureStore.deleteItemAsync(SECURE_STORE_REC_WRAP).catch(() => {});
  await SecureStore.deleteItemAsync(SECURE_STORE_REC_IV).catch(() => {});
  await SecureStore.deleteItemAsync(SECURE_STORE_REC_TAG).catch(() => {});
}
