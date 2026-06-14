import { query } from '../config/database.js';

export async function createAuditLog({ userId, action, resourceType, resourceId, details, ipAddress }) {
  await query(
    `INSERT INTO audit_log (user_id, action, resource_type, resource_id, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, action, resourceType || null, resourceId || null, details ? JSON.stringify(details) : null, ipAddress || null]
  );
}
