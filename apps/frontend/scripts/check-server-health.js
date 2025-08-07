const http = require('http');

console.log('🏥 Checking Mock Server Health...\n');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/health',
  method: 'GET',
  timeout: 5000,
};

const req = http.request(options, res => {
  let data = '';

  res.on('data', chunk => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);

      if (response.success) {
        console.log('✅ Server is healthy!');
        console.log(`📊 Status: ${res.statusCode}`);
        console.log(`⏰ Timestamp: ${response.timestamp}`);
        console.log(`💬 Message: ${response.message}`);

        console.log('\n🔗 Available endpoints:');
        console.log('• Health Check: http://localhost:3001/api/health');
        console.log('• Login: POST http://localhost:3001/api/auth/login');
        console.log('• Users: GET http://localhost:3001/api/users');
        console.log(
          '• Face Recognition: POST http://localhost:3001/api/face-recognition/recognize-base64'
        );

        console.log('\n👤 Default accounts:');
        console.log('• Admin: admin@example.com / admin123');
        console.log('• User: john.doe@example.com / password123');
      } else {
        console.log('⚠️ Server responded but not healthy');
        console.log('Response:', response);
      }
    } catch (error) {
      console.log('❌ Invalid JSON response');
      console.log('Raw response:', data);
    }
  });
});

req.on('error', error => {
  console.log('❌ Server health check failed!');
  console.log('Error:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('1. Make sure the server is running on port 3001');
  console.log('2. Check if the server started without errors');
  console.log('3. Verify no other service is using port 3001');
  console.log('4. Try restarting the server');
});

req.on('timeout', () => {
  console.log('⏰ Server health check timed out!');
  console.log('The server might be starting up or experiencing issues.');
  req.destroy();
});

req.end();
