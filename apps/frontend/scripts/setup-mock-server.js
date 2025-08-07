const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Mock Server...\n');

const mockServerDir = path.join(process.cwd(), 'mock-server');

// Create mock-server directory if it doesn't exist
if (!fs.existsSync(mockServerDir)) {
  fs.mkdirSync(mockServerDir, { recursive: true });
  console.log('📁 Created mock-server directory');
}

// Create uploads directory
const uploadsDir = path.join(mockServerDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

// Create .gitkeep file in uploads
const gitkeepPath = path.join(uploadsDir, '.gitkeep');
if (!fs.existsSync(gitkeepPath)) {
  fs.writeFileSync(gitkeepPath, '# Keep this directory in git\n');
  console.log('📄 Created .gitkeep file');
}

console.log('\n✅ Mock server setup complete!');
console.log('\nNext steps:');
console.log('1. Make sure all server files are in the mock-server directory');
console.log('2. Run: node scripts/start-mock-server.js');
console.log('3. Or manually: cd mock-server && npm install && npm run dev');
