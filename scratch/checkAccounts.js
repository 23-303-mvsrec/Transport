import fs from 'fs';
import path from 'path';
import https from 'https';

// Load .env file
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.error('.env file not found at:', envPath);
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  });
  return env;
}

const env = loadEnv();
const apiKey = env.VITE_FIREBASE_API_KEY;
const projectId = env.VITE_FIREBASE_PROJECT_ID;

if (!apiKey) {
  console.error('VITE_FIREBASE_API_KEY is not defined in .env');
  process.exit(1);
}

console.log('Firebase Project:', projectId);
console.log('Firebase API Key:', apiKey ? apiKey.substring(0, 10) + '...' : 'None');

// Function to test login using Firebase Auth REST API
function testLogin(email, password) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      email,
      password,
      returnSecureToken: true
    });

    const options = {
      hostname: 'identitytoolkit.googleapis.com',
      port: 443,
      path: `/v1/accounts:signInWithPassword?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve({ success: true, localId: parsed.localId, email: parsed.email });
          } else {
            resolve({ success: false, error: parsed.error?.message || 'Unknown error', statusCode: res.statusCode });
          }
        } catch (e) {
          resolve({ success: false, error: 'Failed to parse JSON response', statusCode: res.statusCode });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ success: false, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

// Function to fetch a document from Firestore REST API
function checkFirestoreUser(localId, idToken) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      port: 443,
      path: `/v1/projects/${projectId}/databases/(default)/documents/users/${localId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve({ success: true, data: parsed });
          } else {
            resolve({ success: false, error: parsed.error?.message || 'Unknown error', statusCode: res.statusCode });
          }
        } catch (e) {
          resolve({ success: false, error: 'Failed to parse JSON response' });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ success: false, error: e.message });
    });

    req.end();
  });
}

async function runTests() {
  const accountsToTest = [
    // Test admin with both potential passwords
    { role: 'Administrator', email: 'admin@citybus.in', password: 'admin-uid' },
    { role: 'Administrator', email: 'admin@citybus.in', password: 'admin123' },
  ];

  // Test drivers 1 to 15
  for (let i = 1; i <= 15; i++) {
    accountsToTest.push({
      role: `Driver ${i}`,
      email: `driver${i}@citybus.gov.in`,
      password: 'CityBus@2024'
    });
  }

  console.log(`\n--- Starting Account Verification Checks (Total: ${accountsToTest.length}) ---`);
  
  const results = [];
  for (const account of accountsToTest) {
    process.stdout.write(`Checking ${account.role} (${account.email}) with password "${account.password}"... `);
    const authResult = await testLogin(account.email, account.password);
    if (authResult.success) {
      console.log('✅ SUCCESS');
      results.push({
        role: account.role,
        email: account.email,
        password: account.password,
        status: 'Working',
        details: `Firebase Auth ID: ${authResult.localId}`
      });
    } else {
      console.log(`❌ FAILED (${authResult.error})`);
      results.push({
        role: account.role,
        email: account.email,
        password: account.password,
        status: 'Not Working',
        details: authResult.error
      });
    }
  }

  console.log('\n--- VERIFICATION REPORT SUMMARY ---');
  console.table(results);
}

runTests().catch(console.error);
