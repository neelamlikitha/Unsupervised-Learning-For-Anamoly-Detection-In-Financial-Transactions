import crypto from 'crypto';
import { query } from '../config/database.js';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createRefreshToken(userId, expiresAt) {
  const token = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(token);
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
  return token;
}

export async function findRefreshToken(token) {
  const tokenHash = hashToken(token);
  const res = await query(
    `SELECT rt.id, rt.user_id, rt.expires_at, u.id AS u_id, u.name, u.email, u.role
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1 AND rt.expires_at > NOW()`,
    [tokenHash]
  );
  return res.rows[0] || null;
}

export async function deleteRefreshToken(token) {
  const tokenHash = hashToken(token);
  await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
}

export async function deleteExpiredRefreshTokens() {
  await query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
}
