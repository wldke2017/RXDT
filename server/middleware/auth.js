import jwt from 'jsonwebtoken';

/**
 * Shared JWT authentication middleware.
 * All routes should use this instead of duplicating JWT logic,
 * ensuring a single source of truth for token verification.
 */
export function requireAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const secret = process.env.JWT_SECRET || 'rxdt_jwt_secret_key_2026_production';
        const decoded = jwt.verify(auth.slice(7), secret);
        if (!decoded.id) {
            return res.status(401).json({ error: 'Invalid token payload' });
        }
        // Standardize: both req.user (object) and req.userId (string) are available
        req.user = decoded;
        req.userId = decoded.id;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

export default requireAuth;