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
    if (!password || !hash) {
      return false;
    }

    // Check if the hash is a valid bcrypt hash format
    const bcryptRegex = /^\$2[abyxy]?\$[0-9]{2}\$.{53}$/;
    if (!bcryptRegex.test(hash)) {
      return false;
    }
    
    const result = await bcrypt.compare(password, hash);
    return result;
  } catch (error) {
    return false;
  }
};