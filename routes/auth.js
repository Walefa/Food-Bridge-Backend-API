/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - userType
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               userType:
 *                 type: string
 *                 enum: [donor, receiver]
 *               organization:
 *                 type: string
 *               location:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: User already exists
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User logged in successfully
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */
const express = require('express');
const router = express.Router();
const { models } = require('../models/index');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, userType, organization, location, phone } = req.body;
    if (!name || !email || !password || !userType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const existingUser = await models.User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await models.User.create({
      name,
      email,
      password: hashedPassword,
      userType,
      organization,
      location,
      phone
    });
    const token = jwt.sign({ id: user.id, userType: user.userType }, JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({ token, user: { ...user.toJSON(), password: undefined } });
  } catch (error) {
    console.log('Registration error:', error);
    res.status(500).json({ message: 'Internal server error during registration' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Missing email or password' });
    }
    const user = await models.User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, userType: user.userType }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { ...user.toJSON(), password: undefined } });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error during login' });
  }
});


module.exports = router;

// JWT secret key - In production, use environment variable!
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-for-hackathon-demo';

/**
 * Authentication middleware to verify JWT tokens
 * This middleware adds the user object to the request if token is valid
 */
const auth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. No authorization token provided.' 
      });
    }

    // Check if header has Bearer format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token format. Please use Bearer authentication.' 
      });
    }

    // Extract token from header
    const token = authHeader.replace('Bearer ', '').trim();
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user in database
    const user = await models.User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] } // Don't include password
    });
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Token is invalid. User not found.' 
      });
    }

    // Check if user account is active (you can add this field later)
    // if (!user.isActive) {
    //   return res.status(401).json({ 
    //     success: false,
    //     message: 'Account is deactivated. Please contact support.' 
    //   });
    // }

    // Add user to request object
    req.user = user;
    next(); // Continue to the next middleware/route

  } catch (error) {
    console.error('Auth middleware error:', error.message);

    // Handle different JWT error types
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token has expired. Please login again.' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token. Please provide a valid token.' 
      });
    }
    
    if (error.name === 'NotBeforeError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token not active yet.' 
      });
    }

    // Generic server error
    res.status(500).json({ 
      success: false,
      message: 'Internal server error during authentication.' 
    });
  }
};

/**
 * Optional middleware to require specific user types
 * Usage: Use after auth middleware to restrict routes to specific user types
 */
const requireUserType = (allowedTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required.' 
      });
    }

    if (!allowedTypes.includes(req.user.userType)) {
      return res.status(403).json({ 
        success: false,
        message: `Access forbidden. Required user types: ${allowedTypes.join(', ')}` 
      });
    }

    next();
  };
};

/**
 * Optional middleware to check if user owns a resource
 * This is useful for routes where users can only access their own data
 */
const requireOwnership = (modelName, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      const resource = await models[modelName].findByPk(resourceId);

      if (!resource) {
        return res.status(404).json({ 
          success: false,
          message: 'Resource not found.' 
        });
      }

      // Check if the current user owns this resource
      // Adjust the foreign key field name as needed for your models
      const ownerField = modelName === 'User' ? 'id' : 'userId';
      if (resource[ownerField] !== req.user.id) {
        return res.status(403).json({ 
          success: false,
          message: 'Access denied. You do not own this resource.' 
        });
      }

      // Add resource to request for use in the route handler
      req.resource = resource;
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Internal server error during ownership verification.' 
      });
    }
  };
};

/**
 * Optional middleware for role-based access control
 * You can extend this for more complex permission systems
 */
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required.' 
      });
    }

    // Example role check - you can implement your own logic here
    if (req.user.role !== requiredRole) {
      return res.status(403).json({ 
        success: false,
        message: `Insufficient permissions. Required role: ${requiredRole}` 
      });
    }

    next();
  };
};

/**
 * Optional middleware to check if user can claim listings
 * Only receivers should be able to claim listings
 */
const canClaimListings = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required.' 
    });
  }

  if (req.user.userType !== 'receiver') {
    return res.status(403).json({ 
      success: false,
      message: 'Only receivers can claim listings.' 
    });
  }

  next();
};

/**
 * Optional middleware to check if user can create listings
 * Only donors should be able to create listings
 */
const canCreateListings = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required.' 
    });
  }

  if (req.user.userType !== 'donor') {
    return res.status(403).json({ 
      success: false,
      message: 'Only donors can create listings.' 
    });
  }

  next();
};

module.exports = router;