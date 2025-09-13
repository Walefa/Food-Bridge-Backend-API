const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { models } = require('../models/index');

/**
 * @swagger
 * tags:
 *   name: Listings
 *   description: Food donation listings management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Listing:
 *       type: object
 *       required:
 *         - foodType
 *         - quantity
 *         - location
 *       properties:
 *         id:
 *           type: integer
 *         foodType:
 *           type: string
 *         quantity:
 *           type: string
 *         description:
 *           type: string
 *         location:
 *           type: string
 *         status:
 *           type: string
 *           enum: [available, claimed, completed]
 *         userId:
 *           type: integer
 *         claimedBy:
 *           type: integer
 */

/**
 * @swagger
 * /listings:
 *   get:
 *     summary: Retrieve all available food donations
 *     tags: [Listings]
 *     responses:
 *       200:
 *         description: List of available food donations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Listing'
 */
router.get('/', async (req, res) => {
  try {
    const listings = await models.Listing.findAll({
      where: { status: 'available' },
      include: [{
        model: models.User,
        as: 'donor',
        attributes: ['id', 'name', 'organization', 'location']
      }]
    });
    
    res.json({
      success: true,
      data: listings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching listings'
    });
  }
});

/**
 * @swagger
 * /listings:
 *   post:
 *     summary: Create a new food donation listing
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               foodType:
 *                 type: string
 *               quantity:
 *                 type: string
 *               description:
 *                 type: string
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: Listing created successfully
 */
// FIXED: Added proper middleware reference
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.userType !== 'donor') {
      return res.status(403).json({
        success: false,
        message: 'Only donors can create listings'
      });
    }

    const { foodType, quantity, description, location } = req.body;
    const newListing = await models.Listing.create({
      foodType,
      quantity,
      description,
      location,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      data: newListing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating listing'
    });
  }
});

/**
 * @swagger
 * /listings/{id}/claim:
 *   patch:
 *     summary: Claim a food donation
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Listing claimed successfully
 */
// FIXED: Added proper middleware reference
router.patch('/:id/claim', auth, async (req, res) => {
  try {
    if (req.user.userType !== 'receiver') {
      return res.status(403).json({
        success: false,
        message: 'Only receivers can claim listings'
      });
    }

    const listing = await models.Listing.findByPk(req.params.id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    listing.status = 'claimed';
    listing.claimedBy = req.user.id;
    await listing.save();

    res.json({
      success: true,
      data: listing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error claiming listing'
    });
  }
});

/**
 * @swagger
 * /listings/search:
 *   get:
 *     summary: Search food listings
 *     tags: [Listings]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    let whereClause = { status: 'available' };

    if (q) {
      whereClause.foodType = { [models.Sequelize.Op.iLike]: `%${q}%` };
    }

    const listings = await models.Listing.findAll({
      where: whereClause,
      include: [{
        model: models.User,
        as: 'donor',
        attributes: ['id', 'name', 'organization', 'location']
      }]
    });

    res.json({
      success: true,
      data: listings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching listings'
    });
  }
});

module.exports = router;