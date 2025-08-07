const https = require('https');
const http = require('http');

console.log('🧪 Testing API Endpoints...\n');

const baseUrl = 'http://localhost:3001';
let authToken = null;

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let responseData = '';

      res.on('data', chunk => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            data: parsedData,
            headers: res.headers,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: responseData,
            headers: res.headers,
          });
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  console.log('1. Testing Health Check...');

  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/health',
      method: 'GET',
    });

    if (response.statusCode === 200 && response.data.success) {
      console.log('   ✅ Health check passed');
      return true;
    } else {
      console.log('   ❌ Health check failed');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Health check error:', error.message);
    return false;
  }
}

async function testLogin() {
  console.log('2. Testing Login...');

  try {
    const response = await makeRequest(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      {
        email: 'admin@example.com',
        password: 'admin123',
      }
    );

    if (response.statusCode === 200 && response.data.success) {
      authToken = response.data.data.accessToken;
      console.log('   ✅ Login successful');
      console.log('   🔑 Token received');
      return true;
    } else {
      console.log('   ❌ Login failed');
      console.log('   📄 Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Login error:', error.message);
    return false;
  }
}

async function testGetUsers() {
  console.log('3. Testing Get Users...');

  if (!authToken) {
    console.log('   ⚠️ Skipped - No auth token');
    return false;
  }

  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/users',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.statusCode === 200 && response.data.success) {
      console.log('   ✅ Get users successful');
      console.log(`   👥 Found ${response.data.data.total} users`);
      return true;
    } else {
      console.log('   ❌ Get users failed');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Get users error:', error.message);
    return false;
  }
}

async function testFaceRecognitionStats() {
  console.log('4. Testing Face Recognition Stats...');

  if (!authToken) {
    console.log('   ⚠️ Skipped - No auth token');
    return false;
  }

  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/face-recognition/stats',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.statusCode === 200 && response.data.success) {
      console.log('   ✅ Face recognition stats successful');
      console.log(`   📊 Total faces: ${response.data.data.totalFaces}`);
      console.log(`   📊 Active faces: ${response.data.data.activeFaces}`);
      return true;
    } else {
      console.log('   ❌ Face recognition stats failed');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Face recognition stats error:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting API endpoint tests...\n');

  const results = [];

  results.push(await testHealthCheck());
  results.push(await testLogin());
  results.push(await testGetUsers());
  results.push(await testFaceRecognitionStats());

  console.log('\n📊 Test Results:');
  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);

  if (passed === total) {
    console.log('\n🎉 All tests passed! The mock server is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the server logs for issues.');
  }
}

// Wait a moment for server to be ready, then run tests
setTimeout(runTests, 2000);
