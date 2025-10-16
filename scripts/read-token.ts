import { storage } from '../server/storage';

async function run() {
  const rows = [] as any[];
  const users = await storage.getAllUsers();
  // find the most recent unverified user
  const user = users.find(u => !u.isVerified);
  if (!user) {
    console.log('No unverified user found');
    process.exit(0);
  }
  console.log(JSON.stringify({ email: user.email, verificationToken: user.verificationToken }, null, 2));
}

run().catch(err => { console.error(err); process.exit(1); });
