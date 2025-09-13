const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { models } = require('../models/index');

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: User profile management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Profile:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The user ID
 *         name:
 *           type: string
 *           description: The user's full name
 *         email:
 *           type: string
 *           description: The user's email address
 *         userType:
 *           type: string
 *           enum: [donor, receiver]
 *           description: The type of user
 *         organization:
 *           type: string
 *           description: Organization name
 *         location:
 *           type: string
 *           description: User's location
 *         phone:
 *           type: string
 *           description: User's phone number
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation date
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update date
 *       example:
 *         id: 1
 *         name: "John Doe"
 *         email: "john@example.com"
 *         userType: "donor"
 *         organization: "Fresh Farms"
 *         location: "Cape Town"
 *         phone: "+27 123 456 789"
 *         createdAt: "2024-01-15T10:30:00.000Z"
 *         updatedAt: "2024-01-15T10:30:00.000Z"
 */

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get current user's profile
 *     description: Retrieve the authenticated user's profile information
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             example:
 *               message: "Access denied. No token provided."
 *       500:
 *         description: Internal server error
 */
router.get('/', auth, async (req, res) => {
  try {
    // req.user is set by the auth middleware
    const userResponse = { ...req.user.toJSON() };
    delete userResponse.password;
    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /profile:
 *   put:
 *     summary: Update user profile
 *     description: Update the authenticated user's profile information
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               organization:
 *                 type: string
 *               location:
 *                 type: string
 *               phone:
 *                 type: string
 *             example:
 *               name: "Jane Smith"
 *               organization: "Hope Kitchen"
 *               location: "Johannesburg"
 *               phone: "+27 987 654 321"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put('/', auth, async (req, res) => {
  try {
    const { name, organization, location, phone } = req.body;
    
    // Update allowed fields only
    const updatedUser = await req.user.update({
      name: name || req.user.name,
      organization: organization || req.user.organization,
      location: location || req.user.location,
      phone: phone || req.user.phone
    });

    const userResponse = { ...updatedUser.toJSON() };
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /profile/listings:
 *   get:
 *     summary: Get user's food listings
 *     description: Retrieve all listings associated with the authenticated user (donations if donor, claims if receiver)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's listings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Listing'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/listings', auth, async (req, res) => {
  try {
    let listings;
    let includeOptions = [];
    
    if (req.user.userType === 'donor') {
      // Donors see their created listings with receiver info
      includeOptions = [{
        model: models.User,
        as: 'receiver',
        attributes: ['id', 'name', 'organization', 'email', 'phone'],
        required: false
      }];
      
      listings = await models.Listing.findAll({ 
        where: { userId: req.user.id },
        include: includeOptions,
        order: [['createdAt', 'DESC']]
      });
    } else {
      // Receivers see listings they've claimed with donor info
      includeOptions = [{
        model: models.User,
        as: 'donor',
        attributes: ['id', 'name', 'organization', 'email', 'phone', 'location'],
        required: true
      }];
      
      listings = await models.Listing.findAll({ 
        where: { claimedBy: req.user.id },
        include: includeOptions,
        order: [['createdAt', 'DESC']]
      });
    }
    
    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /profile/stats:
 *   get:
 *     summary: Get user statistics
 *     description: Retrieve statistics about the user's activity on the platform
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalListings:
 *                   type: integer
 *                   description: Total number of listings
 *                 availableListings:
 *                   type: integer
 *                   description: Number of available listings (for donors)
 *                 claimedListings:
 *                   type: integer
 *                   description: Number of claimed listings
 *                 completedListings:
 *                   type: integer
 *                   description: Number of completed listings
 *                 totalDonations:
 *                   type: integer
 *                   description: Estimated total quantity donated (for donors)
 *                 totalReceived:
 *                   type: integer
 *                   description: Estimated total quantity received (for receivers)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/stats', auth, async (req, res) => {
  try {
    let stats = {};
    
    if (req.user.userType === 'donor') {
      const listings = await models.Listing.findAll({ 
        where: { userId: req.user.id }
      });
      
      stats = {
        totalListings: listings.length,
        availableListings: listings.filter(l => l.status === 'available').length,
        claimedListings: listings.filter(l => l.status === 'claimed').length,
        completedListings: listings.filter(l => l.status === 'completed').length,
        totalDonations: listings.reduce((total, listing) => {
          // Simple estimation - you might want to parse the quantity string
          const quantity = parseInt(listing.quantity) || 0;
          return total + quantity;
        }, 0)
      };
    } else {
      const listings = await models.Listing.findAll({ 
        where: { claimedBy: req.user.id }
      });
      
      stats = {
        totalClaims: listings.length,
        activeClaims: listings.filter(l => l.status === 'claimed').length,
        completedClaims: listings.filter(l => l.status === 'completed').length,
        totalReceived: listings.reduce((total, listing) => {
          const quantity = parseInt(listing.quantity) || 0;
          return total + quantity;
        }, 0)
      };
    }
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;