// Minimal e2e: admin login -> set fees -> create content -> purchase cart (manual) -> fetch receipt

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5000';

async function jsonFetch(url: string, init?: RequestInit & { json?: any }) {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    body: init?.json !== undefined ? JSON.stringify(init.json) : (init?.body as any),
  } as any);
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data;
}

async function run() {
  console.log('🔐 Logging in as admin...');
  const login = await jsonFetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    json: { email: 'admin@vr.local', password: 'admin123' },
  });
  const token = login.token as string;
  if (!token) throw new Error('No token from login');
  const auth = { Authorization: `Bearer ${token}` } as const;
  console.log('✅ Logged in');

  console.log('⚙️ Setting fee/tax settings...');
  const settings = await jsonFetch(`${BASE}/api/admin/settings`, {
    method: 'PUT',
    headers: auth,
    json: {
      feeFixedCents: 100,
      feePercent: 5,
      paymentFeeFixedCents: 0,
      paymentFeePercent: 2,
      taxPercent: 22,
      appUrl: 'http://localhost:3000',
    },
  });
  console.log('✅ Settings updated');

  console.log('🎭 Creating a content with pricing...');
  const content = await jsonFetch(`${BASE}/api/contents`, {
    method: 'POST',
    headers: auth,
    json: {
      title: `E2E Show ${Date.now()}`,
      description: 'End-to-end test content',
      imageUrl: 'https://picsum.photos/seed/vrtheatre/800/450',
      duration: 60,
      tags: ['e2e', 'test', 'vr'],
      vrUrl: 'https://example.com/vr/e2e',
      // extended event/pricing fields handled by server
      eventType: 'ondemand',
      totalTickets: 100,
      availableTickets: 100,
      unlimitedTickets: false,
      ticketPriceStandard: 10,
      ticketPriceVip: 15,
      ticketPricePremium: 20,
    },
  });
  const contentId = content?.id;
  if (!contentId) throw new Error('Content creation failed: missing id');
  console.log('✅ Content created:', contentId);

  console.log('🛒 Purchasing cart (manual)...');
  const purchase = await jsonFetch(`${BASE}/api/purchase/cart`, {
    method: 'POST',
    json: {
      method: 'manual',
      cart: [
        { contentId, ticketType: 'standard', quantity: 2 },
        { contentId, ticketType: 'vip', quantity: 1 },
      ],
      buyerEmail: `buyer+${Date.now()}@example.com`,
    },
  });
  const groupId = purchase?.groupId;
  if (!groupId) throw new Error('Cart purchase failed: missing groupId');
  console.log('✅ Cart purchased, groupId:', groupId);

  console.log('🧾 Fetching receipt...');
  const receipt = await jsonFetch(`${BASE}/api/order-group/${groupId}`);
  const amounts = receipt?.group?.amounts;
  if (!amounts) throw new Error('Receipt missing amounts');
  console.log('✅ Receipt totals:', amounts);

  const tickets = receipt?.group?.tickets || [];
  console.log(`🎟️ Tickets issued: ${tickets.length}`);
  if (!tickets.length) throw new Error('No tickets issued');

  console.log('Done.');
}

run().catch((err) => {
  console.error('E2E failed:', err?.message || err);
  process.exit(1);
});
