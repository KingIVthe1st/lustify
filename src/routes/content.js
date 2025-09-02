const express = require('express');
const { body, param } = require('express-validator');
const { authenticateToken, requireEmailVerification } = require('../middleware/auth');
const ContentController = require('../controllers/contentController');

const router = express.Router();
const contentController = new ContentController();

// Image generation validation
const generateImageValidation = [
  body('prompt')
    .trim()
    .isLength({ min: 5, max: 2000 })
    .withMessage('Prompt must be between 5 and 2000 characters'),
  body('avatarId')
    .optional()
    .isUUID()
    .withMessage('Avatar ID must be a valid UUID'),
  body('settings.size')
    .optional()
    .isIn(['256x256', '512x512', '1024x1024', '1920x1080', '2048x2048'])
    .withMessage('Invalid image size'),
  body('settings.quality')
    .optional()
    .isIn(['standard', 'hd', 'premium'])
    .withMessage('Quality must be standard, hd, or premium'),
  body('settings.count')
    .optional()
    .isInt({ min: 1, max: 4 })
    .withMessage('Count must be between 1 and 4')
];

// Video generation validation
const generateVideoValidation = [
  body('imageUrl')
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  body('avatarId')
    .optional()
    .isUUID()
    .withMessage('Avatar ID must be a valid UUID'),
  body('settings.duration')
    .optional()
    .isInt({ min: 3, max: 30 })
    .withMessage('Duration must be between 3 and 30 seconds'),
  body('settings.withAudio')
    .optional()
    .isBoolean()
    .withMessage('With audio must be a boolean'),
  body('settings.style')
    .optional()
    .isIn(['natural', 'cinematic', 'artistic'])
    .withMessage('Style must be natural, cinematic, or artistic')
];

// Content ID validation
const contentIdValidation = [
  param('id').isUUID().withMessage('Invalid content ID format')
];

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireEmailVerification);

// GET /api/content - Get user's generated content with pagination and filters
router.get('/', contentController.getContent.bind(contentController));

// POST /api/content/generate/image - Generate image
router.post('/generate/image', generateImageValidation, contentController.generateImage.bind(contentController));

// POST /api/content/generate/video - Generate video from image
router.post('/generate/video', generateVideoValidation, contentController.generateVideo.bind(contentController));

// GET /api/content/stats - Get content generation statistics
router.get('/stats', contentController.getContentStats.bind(contentController));

// GET /api/content/:id - Get specific content item
router.get('/:id', contentIdValidation, contentController.getContentById.bind(contentController));

// DELETE /api/content/:id - Delete content item
router.delete('/:id', contentIdValidation, contentController.deleteContent.bind(contentController));

// POST /api/content/:id/retry - Retry failed generation
router.post('/:id/retry', contentIdValidation, contentController.retryGeneration.bind(contentController));

module.exports = router;