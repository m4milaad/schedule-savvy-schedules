import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    // Check if the hash is a valid bcrypt hash
    if (!hash || (!hash.startsWith('$2a$') && !hash.startsWith('$2b$') && !hash.startsWith('$2y$'))) {
      console.warn('Invalid bcrypt hash format:', hash);
      return false;
    }
    
    const result = await bcrypt.compare(password, hash);
    console.log('Password comparison result:', result);
    return result;
  } catch (error) {
    console.error('Error comparing password:', error);
    return false;
  }
};