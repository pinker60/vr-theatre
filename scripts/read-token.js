(async () => {
  const { storage } = require('../server/storage');
  const users = await storage.getAllUsers();
  const user = users.find(u => !u.isVerified);
  if (!user) {
    console.log('No unverified user found');
    process.exit(0);
  }
  console.log(JSON.stringify({ email: user.email, verificationToken: user.verificationToken }, null, 2));
})();
