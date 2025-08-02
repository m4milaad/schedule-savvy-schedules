// Quick test to generate proper hash
const bcrypt = require('bcryptjs');

const generateHash = async () => {
  const hash1 = await bcrypt.hash('admin123', 12);
  const hash2 = await bcrypt.hash('milad3103', 12);
  
  console.log('admin123 hash:', hash1);
  console.log('milad3103 hash:', hash2);
  
  // Test the comparison
  console.log('admin123 test:', await bcrypt.compare('admin123', hash1));
  console.log('milad3103 test:', await bcrypt.compare('milad3103', hash2));
};

generateHash();