const express = require('express');
const { body, param } = require('express-validator');
const { authenticateToken, requireEmailVerification } = require('../middleware/auth');
const AvatarController = require('../controllers/avatarController');

const router = express.Router();
const avatarController = new AvatarController();

// Avatar creation validation
const createAvatarValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('customization.contentCategory')
    .optional()
    .isIn(['sfw', 'nsfw'])
    .withMessage('Content category must be either sfw or nsfw'),
  body('customization.style')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Style must be a string with max 200 characters')
];

// Avatar update validation
const updateAvatarValidation = [
  param('id').isUUID().withMessage('Invalid avatar ID format'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('content_category')
    .optional()
    .isIn(['sfw', 'nsfw'])
    .withMessage('Content category must be either sfw or nsfw')
];

// Avatar ID validation
const avatarIdValidation = [
  param('id').isUUID().withMessage('Invalid avatar ID format')
];

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireEmailVerification);

// GET /api/avatars - Get user's avatars with pagination
router.get('/', avatarController.getAvatars.bind(avatarController));

// POST /api/avatars - Create new avatar
router.post('/', createAvatarValidation, avatarController.createAvatar.bind(avatarController));

// GET /api/avatars/limit - Check avatar creation limit
router.get('/limit', avatarController.checkAvatarLimit.bind(avatarController));

// GET /api/avatars/stats - Get avatar statistics
router.get('/stats', avatarController.getAvatarStats.bind(avatarController));

// GET /api/avatars/:id - Get specific avatar
router.get('/:id', avatarIdValidation, avatarController.getAvatar.bind(avatarController));

// PUT /api/avatars/:id - Update avatar
router.put('/:id', updateAvatarValidation, avatarController.updateAvatar.bind(avatarController));

// DELETE /api/avatars/:id - Delete avatar
router.delete('/:id', avatarIdValidation, avatarController.deleteAvatar.bind(avatarController));

// POST /api/avatars/:id/regenerate-thumbnail - Regenerate avatar thumbnail
router.post('/:id/regenerate-thumbnail', avatarIdValidation, avatarController.regenerateThumbnail.bind(avatarController));

module.exports = router;