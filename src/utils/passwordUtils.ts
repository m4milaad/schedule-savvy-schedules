
// Browser-compatible password hashing using Web Crypto API
const SALT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
  // Generate a random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Encode the password
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  // Import the password as a key
  const key = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  // Derive the hash using PBKDF2
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: Math.pow(2, SALT_ROUNDS),
      hash: 'SHA-256'
    },
    key,
    256
  );
  
  // Combine salt and hash for storage
  const hashArray = new Uint8Array(hashBuffer);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);
  
  // Convert to base64 for storage
  return btoa(String.fromCharCode(...combined));
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    // Decode the stored hash
    const combined = new Uint8Array(
      atob(hash).split('').map(char => char.charCodeAt(0))
    );
    
    // Extract salt and hash
    const salt = combined.slice(0, 16);
    const storedHash = combined.slice(16);
    
    // Encode the input password
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    
    // Import the password as a key
    const key = await crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    // Derive the hash using the same salt
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: Math.pow(2, SALT_ROUNDS),
        hash: 'SHA-256'
      },
      key,
      256
    );
    
    const computedHash = new Uint8Array(hashBuffer);
    
    // Compare the hashes
    if (computedHash.length !== storedHash.length) {
      return false;
    }
    
    for (let i = 0; i < computedHash.length; i++) {
      if (computedHash[i] !== storedHash[i]) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};
