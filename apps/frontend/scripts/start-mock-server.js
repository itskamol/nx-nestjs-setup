const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Staff Management System Mock Server...\n');

// Check if mock-server directory exists
const mockServerPath = path.join(process.cwd(), 'mock-server');
if (!fs.existsSync(mockServerPath)) {
  console.error('❌ Mock server directory not found!');
  console.log('Please make sure the mock-server directory exists with the server files.');
  process.exit(1);
}

// Check if package.json exists
const packageJsonPath = path.join(mockServerPath, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found in mock-server directory!');
  console.log('Please make sure package.json exists in the mock-server directory.');
  process.exit(1);
}

// Check if node_modules exists
const nodeModulesPath = path.join(mockServerPath, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies...');

  const installProcess = spawn('npm', ['install'], {
    cwd: mockServerPath,
    stdio: 'inherit',
    shell: true,
  });

  installProcess.on('close', code => {
    if (code !== 0) {
      console.error('❌ Failed to install dependencies');
      process.exit(1);
    }

    console.log('✅ Dependencies installed successfully!\n');
    startServer();
  });

  installProcess.on('error', err => {
    console.error('❌ Error installing dependencies:', err.message);
    process.exit(1);
  });
} else {
  startServer();
}

function startServer() {
  console.log('🔄 Starting mock server...\n');

  const serverProcess = spawn('npm', ['run', 'dev'], {
    cwd: mockServerPath,
    stdio: 'inherit',
    shell: true,
  });

  serverProcess.on('error', err => {
    console.error('❌ Error starting server:', err.message);
    process.exit(1);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down mock server...');
    serverProcess.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down mock server...');
    serverProcess.kill('SIGTERM');
    process.exit(0);
  });
}
