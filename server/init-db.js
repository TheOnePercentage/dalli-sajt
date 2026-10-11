import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { resolve } from 'path';
import bcrypt from 'bcryptjs';

const dbPath = resolve(process.cwd(), 'db.json');

const defaultData = {
  reviews: [],
  admins: [],
  refresh_tokens: [],
  trusted_devices: [],
  admin_sessions: [],
  audit_logs: []
};

async function initDb() {
  const adapter = new JSONFile(dbPath);
  const db = new Low(adapter, defaultData);
  await db.read();
  db.data = db.data || defaultData;
  
  // Create default admin if not exists
  const existingAdmin = db.data.admins.find(a => a.email === 'harissacirovic');
  if (!existingAdmin) {
    const hash = await bcrypt.hash('lenovo123', 12);
    db.data.admins.push({
      id: 1,
      email: 'harissacirovic',
      password_hash: hash,
      role: 'super_admin',
      mfa_enabled: 0,
      failed_attempts: 0,
      locked_until: null,
      last_login: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    await db.write();
    console.log('Default admin created: harissacirovic / lenovo123');
  }
  
  console.log('Database initialized at:', dbPath);
  return db;
}

export default initDb;