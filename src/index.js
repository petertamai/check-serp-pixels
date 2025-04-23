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

// Add middleware to handle various input formats for batch endpoint
app.use((req, res, next) => {
  // Only process POST requests to the batch endpoint
  if (req.method === 'POST' && req.path === '/api/analyze/batch') {
    // Log the raw request body for debugging
    console.log('Raw request body:', typeof req.body, JSON.stringify(req.body, null, 2));
    
    // Check if the body is a string (might happen with some clients)
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch (e) {
        // If parsing fails, continue with the original body
        console.error('Failed to parse string body:', e.message);
      }
    }
  }
  next();
});

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

// Batch endpoint with robust handling of various input formats
app.post('/api/analyze/batch', (req, res) => {
  try {
    // Log what we received for debugging
    console.log('Request body type:', typeof req.body);
    console.log('Request body keys:', Object.keys(req.body));
    
    // Extract the items array from wherever it might be in the request
    let items;
    
    if (req.body && req.body.items && Array.isArray(req.body.items)) {
      // Standard format: { items: [...] }
      items = req.body.items;
      console.log('Found items array in req.body.items');
    } else if (Array.isArray(req.body)) {
      // Direct array: [...]
      items = req.body;
      console.log('Request body is directly an array');
    } else if (req.body && typeof req.body === 'object') {
      // Try to find an items array somewhere in the object
      let found = false;
      
      // Check first level properties for an items array
      for (const key of Object.keys(req.body)) {
        const value = req.body[key];
        if (value && typeof value === 'object') {
          if (Array.isArray(value)) {
            items = value;
            found = true;
            console.log(`Found array in req.body.${key}`);
            break;
          } else if (value.items && Array.isArray(value.items)) {
            items = value.items;
            found = true;
            console.log(`Found items array in req.body.${key}.items`);
            break;
          }
        }
      }
      
      if (!found) {
        // As a last resort, try to construct an array from the request body
        if (req.body.title || req.body.description) {
          items = [req.body];
          console.log('Treating single item as array');
        } else {
          return res.status(400).json({ 
            error: 'Could not find a valid items array in the request',
            receivedBody: req.body
          });
        }
      }
    } else {
      return res.status(400).json({ 
        error: 'Invalid request format',
        receivedBody: req.body 
      });
    }
    
    // Ensure items is defined and is an array
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: 'No items to analyze found in request',
        receivedBody: req.body
      });
    }
    
    // Process each item in the batch
    const results = items.map(item => {
      if (!item || typeof item !== 'object') {
        return { error: 'Invalid item format' };
      }
      
      const result = {
        id: item.id || null // Include the ID if provided
      };
      
      if (item.title) {
        result.title = analyzeText(item.title, 'title');
      }
      
      if (item.description) {
        result.description = analyzeText(item.description, 'description');
      }
      
      if (!item.title && !item.description) {
        result.error = 'Item must contain either a title or description';
      }
      
      return result;
    });
    
    res.json({
      items: results,
      count: results.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[ERROR] Batch processing failed: ${error.message}`);
    console.error(error.stack);
    res.status(500).json({
      error: 'Batch processing failed',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message,
      receivedBody: req.body
    });
  }
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
      '/api/analyze/batch': {
        methods: ['POST'],
        description: 'Analyze multiple meta titles and descriptions in a single request',
        parameters: {
          items: 'Array of objects containing id (optional), title (optional), and description (optional)'
        },
        example: 'POST to /api/analyze/batch with JSON body: {"items": [{"id": "1", "title": "First Title", "description": "First description"}, {"id": "2", "title": "Second Title"}]}'
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
