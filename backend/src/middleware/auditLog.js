import { createAuditLog } from '../models/auditModel.js';

export function auditLog(action, resourceType = null, getResourceId = null) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      const resourceId = typeof getResourceId === 'function' ? getResourceId(req, body) : (req.params?.id || null);
      createAuditLog({
        userId: req.user?.id,
        action,
        resourceType,
        resourceId: resourceId ?? undefined,
        details: body,
        ipAddress: req.ip || req.connection?.remoteAddress
      }).catch((err) => console.warn('[Audit]', err.message));
      return originalJson(body);
    };
    next();
  };
}
