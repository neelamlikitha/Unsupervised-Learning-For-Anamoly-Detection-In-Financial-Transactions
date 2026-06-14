import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, '../../../db/schema.sql');

async function main() {
  console.log('Running database schema...');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
  console.log('Schema applied successfully. Tables "users" and "transactions" are ready.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error running schema:', err.message);
  process.exit(1);
});
