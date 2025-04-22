# Meta Pixel Calculator API

A Node.js API service to calculate the pixel width of meta titles and descriptions based on Google's SERP display parameters.

## Features

- Accurately measures meta titles and descriptions in pixels based on Google's font settings
- Analyzes if text will be truncated in search results
- Provides recommended character counts for optimal display
- Returns truncated text preview
- Checks if descriptions meet minimum length requirements
- Supports both GET and POST requests
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

### Analyze Meta Tags
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

### Health Check
```
GET /health
```

Returns the current status of the API service.

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