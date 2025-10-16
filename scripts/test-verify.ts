import fetch from 'node-fetch';
import { storage } from '../server/storage';

async function run() {
  const testEmail = `test+${Date.now()}@example.com`;
  console.log('Registering test user with email:', testEmail);

  const res = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email: testEmail, password: 'password123' }),
  });

  const json = await res.json();
  console.log('Register response:', res.status, json);

  // Wait briefly for DB write
  await new Promise((r) => setTimeout(r, 200));

  const user = await storage.getUserByEmail(testEmail);
  console.log('User from storage:', user?.email, 'isVerified=', user?.isVerified, 'verificationToken=', user?.verificationToken);

  if (!user || !user.verificationToken) {
    console.error('No verification token found, aborting.');
    process.exit(1);
  }

  const verifyRes = await fetch(`http://localhost:5000/api/auth/verify?token=${encodeURIComponent(user.verificationToken)}`);
  const verifyJson = await verifyRes.json();
  console.log('Verify response:', verifyRes.status, verifyJson);

  const updated = await storage.getUserByEmail(testEmail);
  console.log('After verify isVerified=', updated?.isVerified);
}

run().catch(err => { console.error(err); process.exit(1); });
