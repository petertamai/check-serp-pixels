// src/index.js
const express = require('express');
const { createCanvas } = require('canvas');
const cors = require('cors');
const morgan = require('morgan');
const { body, query, validationResult } = require('express-validator');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan('dev'));

// Create a canvas context for text measurement
const createContext = (fontSize, fontFamily = 'Arial') => {
  const canvas = createCanvas(1, 1);
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontSize}px ${fontFamily}`;
  return ctx;
};

// Meta measurement constants
const META_SETTINGS = {
  title: {
    fontFamily: 'Arial',
    fontSize: 20, // Google's internal logic uses closer to 16px
    maxPixels: 600,
    visualFontSize: 20 // Actual visual size in SERP
  },
  description: {
    fontFamily: 'Arial',
    fontSize: 14,
    maxPixels: 920,
    minPixels: 430 // Minimum to avoid auto-snippet
  }
};

// Helper function to measure text width in pixels
const measureTextWidth = (text, fontSize, fontFamily = 'Arial') => {
  const ctx = createContext(fontSize, fontFamily);
  return ctx.measureText(text).width;
};

// Helper function to check truncation and character limits
const analyzeText = (text, type) => {
  const settings = META_SETTINGS[type];
  const pixelWidth = measureTextWidth(text, settings.fontSize, settings.fontFamily);
  
  const isTruncated = pixelWidth > settings.maxPixels;
  let truncatedText = text;
  
  // Calculate where truncation would occur
  if (isTruncated) {
    const ctx = createContext(settings.fontSize, settings.fontFamily);
    let i = 0;
    while (i < text.length) {
      const slice = text.slice(0, i + 1);
      const sliceWidth = ctx.measureText(slice).width;
      if (sliceWidth > settings.maxPixels - 5) { // 5px buffer for ellipsis
        break;
      }
      i++;
    }
    truncatedText = text.slice(0, i) + '...';
  }

  // Calculate recommended character count based on average char width
  const avgCharWidth = pixelWidth / text.length;
  const recommendedChars = Math.floor(settings.maxPixels / avgCharWidth);
  
  // For description, check if it meets minimum length
  const isTooShort = type === 'description' && pixelWidth < settings.minPixels;
  
  return {
    pixelWidth: Math.round(pixelWidth),
    characterCount: text.length,
    isTruncated,
    truncatedText: isTruncated ? truncatedText : text,
    isOptimal: !isTruncated && (type !== 'description' || !isTooShort),
    recommendedMaxChars: recommendedChars,
    maxPixels: settings.maxPixels,
    ...(type === 'description' && { 
      minPixels: settings.minPixels,
      isTooShort 
    })
  };
};

// Validation middleware
const validateMetaParams = [
  body('title').optional().isString().trim().notEmpty().withMessage('Title must be a non-empty string'),
  body('description').optional().isString().trim().notEmpty().withMessage('Description must be a non-empty string'),
  query('title').optional().isString().trim().notEmpty().withMessage('Title must be a non-empty string'),
  query('description').optional().isString().trim().notEmpty().withMessage('Description must be a non-empty string')
];

// GET and POST endpoint to analyze meta tags
app.all('/api/analyze', validateMetaParams, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Get parameters from either query or body
  const title = req.method === 'GET' ? req.query.title : req.body.title;
  const description = req.method === 'GET' ? req.query.description : req.body.description;

  const response = {};

  if (title) {
    response.title = analyzeText(title, 'title');
  }

  if (description) {
    response.description = analyzeText(description, 'description');
  }

  if (!title && !description) {
    return res.status(400).json({ 
      error: 'Please provide either a title or description parameter'
    });
  }

  res.json(response);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint with basic instructions
app.get('/', (req, res) => {
  res.json({
    name: 'Meta Pixel Calculator API',
    author: 'Piotr Tamulewicz',
    website: 'https://petertam.pro/',
    endpoints: {
      '/api/analyze': {
        methods: ['GET', 'POST'],
        description: 'Analyze meta title and description pixel widths',
        parameters: {
          title: 'Meta title to analyze (optional)',
          description: 'Meta description to analyze (optional)'
        },
        examples: {
          get: '/api/analyze?title=Your%20Meta%20Title&description=Your%20meta%20description%20here',
          post: 'POST to /api/analyze with JSON body: {"title": "Your Meta Title", "description": "Your meta description here"}'
        }
      },
      '/health': {
        methods: ['GET'],
        description: 'Health check endpoint'
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.stack}`);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Meta Pixel Calculator API running on port ${PORT}`);
});

module.exports = app; // For testing