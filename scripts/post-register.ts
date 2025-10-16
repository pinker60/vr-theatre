const email = `e2e+${Date.now()}@example.com`;

async function run() {
  const res = await fetch('http://127.0.0.1:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'E2E Tester', email, password: 'password123' }),
  });
  const json = await res.json();
  console.log('Status', res.status);
  console.log(JSON.stringify(json, null, 2));
}

run().catch(err => { console.error(err); process.exit(1); });
