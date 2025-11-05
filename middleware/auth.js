import JWTUtils from '../utils/jwt.js';
import Admin from '../models/Admin.js';

const authenticateAdmin = async (req, res, next) => {
  try {
    const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);
    const decoded = JWTUtils.verifyToken(token);
    
    // Verify admin still exists and is active
    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Admin account not found or inactive'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: error.message
    });
  }
};

const requireSuperAdmin = (req, res, next) => {
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      error: 'Super admin privileges required'
    });
  }
  next();
};

export {
  authenticateAdmin,
  requireSuperAdmin
};