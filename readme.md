# Meta Pixel Calculator API

A Node.js API service to calculate the pixel width of meta titles and descriptions based on Google's SERP display parameters.

## Features

- Accurately measures meta titles and descriptions in pixels based on Google's font settings
- Analyzes if text will be truncated in search results
- Provides recommended character counts for optimal display
- Returns truncated text preview
- Checks if descriptions meet minimum length requirements
- Supports both GET and POST requests
- Batch processing capability for analyzing multiple meta tags at once
- OpenAI function specifications for AI integration
- Ready for production with PM2 configuration

## Google SERP Parameters Used

**Meta Title**:
- Font: Arial 16px (internal truncation logic)
- Maximum width: 600 pixels
- Visual display: 18px in actual SERPs

**Meta Description**:
- Font: Arial 13px
- Maximum width: 920 pixels
- Minimum recommended: 430 pixels (to avoid auto-generated snippets)

## Installation

1. Clone the repository
```bash
git clone https://your-repository-url.git
cd meta-pixel-calculator
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file from the example
```bash
cp .env.example .env
```

4. Start the server
```bash
# Development mode
npm run dev

# Production mode with PM2
npm install pm2 -g
pm2 start ecosystem.config.js
```

## API Endpoints

### Single Item Analysis
```
GET or POST /api/analyze
```

**Parameters**:
- `title` (optional): Meta title text to analyze
- `description` (optional): Meta description text to analyze

At least one parameter is required.

**Example GET Request**:
```
GET /api/analyze?title=Your%20Meta%20Title&description=Your%20meta%20description%20text%20here
```

**Example POST Request**:
```json
{
  "title": "Your Meta Title",
  "description": "Your meta description text here"
}
```

**Example Response**:
```json
{
  "title": {
    "pixelWidth": 123,
    "characterCount": 14,
    "isTruncated": false,
    "truncatedText": "Your Meta Title",
    "isOptimal": true,
    "recommendedMaxChars": 60,
    "maxPixels": 600
  },
  "description": {
    "pixelWidth": 315,
    "characterCount": 31,
    "isTruncated": false,
    "truncatedText": "Your meta description text here",
    "isOptimal": false,
    "recommendedMaxChars": 155,
    "maxPixels": 920,
    "minPixels": 430,
    "isTooShort": true
  }
}
```

### Batch Analysis
```
POST /api/analyze/batch
```

**Parameters**:
- `items`: Array of objects to analyze, where each object can contain:
  - `id` (optional): Identifier for the item
  - `title` (optional): Meta title text to analyze
  - `description` (optional): Meta description text to analyze

Each item must contain either a title, description, or both.

**Example POST Request**:
```json
{
  "items": [
    {
      "id": "page1",
      "title": "First Page Title",
      "description": "This is the meta description for the first page"
    },
    {
      "id": "page2",
      "title": "Second Page Title",
      "description": "Another description example"
    }
  ]
}
```

**Example Response**:
```json
{
  "items": [
    {
      "id": "page1",
      "title": {
        "pixelWidth": 145,
        "characterCount": 16,
        "isTruncated": false,
        "truncatedText": "First Page Title",
        "isOptimal": true,
        "recommendedMaxChars": 66,
        "maxPixels": 600
      },
      "description": {
        "pixelWidth": 415,
        "characterCount": 45,
        "isTruncated": false,
        "truncatedText": "This is the meta description for the first page",
        "isOptimal": false,
        "recommendedMaxChars": 155,
        "maxPixels": 920,
        "minPixels": 430,
        "isTooShort": true
      }
    },
    {
      "id": "page2",
      "title": {
        "pixelWidth": 162,
        "characterCount": 17,
        "isTruncated": false,
        "truncatedText": "Second Page Title",
        "isOptimal": true,
        "recommendedMaxChars": 63,
        "maxPixels": 600
      },
      "description": {
        "pixelWidth": 235,
        "characterCount": 26,
        "isTruncated": false,
        "truncatedText": "Another description example",
        "isOptimal": false,
        "recommendedMaxChars": 155,
        "maxPixels": 920,
        "minPixels": 430,
        "isTooShort": true
      }
    }
  ],
  "count": 2,
  "timestamp": "2023-05-01T12:34:56.789Z"
}
```

### Health Check
```
GET /health
```

Returns the current status of the API service.

## OpenAI Function Specifications

### Single Item Analysis

```json
{
  "name": "analyze_meta_pixels",
  "parameters": {
    "type": "object",
    "required": [],
    "properties": {
      "title": {
        "type": "string",
        "description": "The meta title to analyze for pixel width (optional if description is provided)"
      },
      "description": {
        "type": "string",
        "description": "The meta description to analyze for pixel width (optional if title is provided)"
      }
    }
  },
  "description": "Analyzes the pixel width of meta titles and descriptions for SEO optimization to determine if they will be truncated in search results."
}
```

### Batch Analysis

```json
{
  "name": "analyze_meta_pixels_batch",
  "parameters": {
    "type": "object",
    "required": ["items"],
    "properties": {
      "items": {
        "type": "array",
        "description": "Array of meta tag items to analyze in batch",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "description": "Optional identifier for this item to track it in the response"
            },
            "title": {
              "type": "string",
              "description": "The meta title to analyze for pixel width (optional if description is provided)"
            },
            "description": {
              "type": "string",
              "description": "The meta description to analyze for pixel width (optional if title is provided)"
            }
          }
        }
      }
    }
  },
  "description": "Analyzes multiple meta titles and descriptions in a single batch request to determine if they will be truncated in search results. Each item in the batch can have an optional ID and must contain either a title, description, or both. Returns pixel width measurements, truncation status, and optimization recommendations for each item."
}
```

## PM2 Configuration

The project includes a PM2 ecosystem.config.js file with optimized settings for production deployment:

- Cluster mode for utilizing all CPU cores
- Auto-restart on crashes
- Memory limit monitoring
- Proper log management

## Dependencies

- express: Web server framework
- canvas: For accurate text measurement
- express-validator: Input validation
- cors: Cross-origin resource sharing
- morgan: HTTP request logging
- dotenv: Environment variable management

## Development Dependencies

- eslint: Code quality
- jest & supertest: Testing
- nodemon: Development hot reloading

## Author

Piotr Tamulewicz - [petertam.pro](https://petertam.pro/)
