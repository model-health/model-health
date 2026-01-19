# Model Health SDK Demo

A simple, educational web demo that walks through the complete Model Health SDK workflow step-by-step.

## Purpose

This demo serves two purposes:
1. **Learning Tool**: Shows developers exactly how to use each SDK method with real code examples
2. **Testing Tool**: Allows you to test the complete SDK workflow in a browser

## What's Included

- **index.html** - Main HTML structure
- **style.css** - Clean, minimal styling
- **demo.js** - Demo logic with mock SDK client
- **Makefile** - Easy launch commands

## Quick Start

### Option 1: Using Make (Recommended)

```bash
# Start the server and open in browser
make run

# In another terminal, open the browser
make open
```

### Option 2: Manual Start

```bash
# Start a local server (Python 3)
python3 -m http.server 8000

# Or Python 2
python -m SimpleHTTPServer 8000

# Then open http://localhost:8000 in your browser
```

### Option 3: Using Node.js

```bash
# Install http-server globally (first time only)
npm install -g http-server

# Start server
http-server -p 8000

# Open http://localhost:8000
```

## How to Use

The demo walks through 8 steps:

1. **Login** - Authenticate with email/password, handle 2FA
2. **Create Session** - Initialize a recording session
3. **Create Subject** - Define the person being analyzed
4. **Camera Calibration** - Calibrate cameras using checkerboard
5. **Neutral Pose** - Capture neutral standing pose for scaling
6. **Record Trial** - Record and process a movement trial
7. **Start Analysis** - Run biomechanical analysis
8. **View Results** - Display and export analysis metrics

Each step shows:
- **UI Form**: Input fields and action buttons
- **Code Example**: Exact TypeScript/JavaScript code to use
- **Console Output**: Real-time logging of SDK calls and responses

## Using with Real SDK

To integrate with the actual Model Health SDK:

1. Install the SDK:
```bash
npm install @modelhealth/sdk
```

2. Update `demo.js` line 1:
```javascript
// Replace mock client with real SDK
import { ModelHealthService } from '@modelhealth/sdk';

// Remove MockModelHealthService class
// Update init() to use real client:
state.client = new ModelHealthService();
```

3. Build for browser (if using bundler):
```bash
# Example with Vite
npm install -D vite
npx vite build
```

## Features

### Live Console Logging
Every SDK call and response is logged with timestamps:
```
[14:23:45] → Calling client.login(...)
[14:23:46] ✓ Login successful
```

### Progress Tracking
Visual progress bar shows completion status for each step.

### Status Updates
Real-time status indicators for:
- Camera calibration progress
- Video upload progress
- Processing status
- Analysis completion

### Export Options
Download analysis results as:
- JSON (structured data)
- CSV (tabular format)

### Testing Checklist
Built-in checklist at the bottom to track manual testing progress.

## Mock vs Real SDK

The demo currently uses a **mock SDK client** that simulates API calls with delays and sample data. This allows you to:
- Test the UI flow without a backend
- See how callbacks and polling work
- Understand the complete workflow

The mock client:
- Simulates realistic delays
- Returns sample data structures
- Shows all callback states
- Demonstrates error handling

## Code Structure

```javascript
// Simple state management
const state = {
  currentStep: 1,
  client: null,
  session: null,
  subject: null,
  trial: null,
  analysisTask: null,
  results: null
};

// Each step has its own render function
function renderStep1() { /* Login UI */ }
function renderStep2() { /* Session UI */ }
// ... etc

// Handler functions for each action
async function handleLogin() { /* ... */ }
async function handleCreateSession() { /* ... */ }
// ... etc
```

## Customization

### Changing Default Values

Edit `demo.js` to change default form values:
```javascript
// In renderStep1()
value="your-email@example.com"

// In renderStep3()
value="Your Name"
```

### Adding More Steps

1. Add step to progress bar in `index.html`
2. Create `renderStepN()` function in `demo.js`
3. Add code example to `codeExamples` object
4. Update `render()` switch statement

### Styling

Edit `style.css` to customize:
- Colors (search for `#667eea`)
- Fonts (change font-family)
- Layout (adjust padding, margins)
- Responsive breakpoints

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires JavaScript ES6+ features:
- async/await
- Promise
- Template literals
- Arrow functions

## Troubleshooting

### Port 8000 Already in Use

```bash
# Kill existing process
make clean

# Or use different port
python3 -m http.server 8001
```

### CORS Errors

If you see CORS errors, ensure you're:
1. Using a local server (not file:// protocol)
2. Accessing via localhost or 127.0.0.1
3. Not mixing http and https

### Module Not Found

The demo uses standard `<script type="module">` - ensure:
1. Files are in same directory
2. Server is running (not opening file directly)
3. Browser supports ES6 modules

## Next Steps

After exploring the demo:

1. **Read the code examples** - Each step shows production-ready code
2. **Check the console** - See exactly what the SDK does
3. **Modify and experiment** - Change values, add logging
4. **Integrate real SDK** - Replace mock with actual SDK
5. **Build your app** - Use patterns from the demo

## Testing Checklist

Use the checklist at the bottom of the page to track:
- ☐ Login with valid credentials
- ☐ Handle 2FA verification
- ☐ Create session successfully
- ☐ Create subject with all fields
- ☐ Camera calibration completes
- ☐ Neutral pose calibration completes
- ☐ Record and stop trial
- ☐ Trial processes to "ready"
- ☐ Analysis starts and completes
- ☐ Results display correctly

## License

This demo is provided as-is for educational purposes.

## Support

For SDK support, visit: https://docs.modelhealth.com
For demo issues, check the browser console for errors.
