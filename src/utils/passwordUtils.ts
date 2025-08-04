import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

// For testing - generate correct hashes
export const generateTestHashes = async () => {
  const adminHash = await bcrypt.hash('admin123', SALT_ROUNDS);
  const miladHash = await bcrypt.hash('milad3103', SALT_ROUNDS);
  console.log('Admin hash:', adminHash);
  console.log('Milad hash:', miladHash);
  return { adminHash, miladHash };
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    console.log('Comparing password with hash...');
    console.log('Password length:', password.length);
    console.log('Hash format:', hash ? hash.substring(0, 10) + '...' : 'null');
    
    if (!password || !hash) {
      console.error('Password or hash is missing');
      return false;
    }

    // Check if the hash is a valid bcrypt hash format
    const bcryptRegex = /^\$2[abyxy]?\$[0-9]{2}\$.{53}$/;
    if (!bcryptRegex.test(hash)) {
      console.warn('Invalid bcrypt hash format detected:', hash.substring(0, 20) + '...');
      // For development/testing - compare plain text (NOT for production)
      if (process.env.NODE_ENV === 'development') {
        console.warn('Development mode: comparing plain text passwords');
        return password === hash;
      }
      return false;
    }
    
    const result = await bcrypt.compare(password, hash);
    console.log('Bcrypt comparison result:', result);
    return result;
  } catch (error) {
    console.error('Error comparing password:', error);
    return false;
  }
};