# Model Health TypeScript Example

A Vite web app implementing the complete SDK workflow in the browser: session management, camera calibration, subject calibration, activity recording, and analysis retrieval.

## Requirements

- Node.js 16.0+
- A modern browser with WebAssembly support (Chrome, Edge, Firefox, or Safari)
- An API key

## Configuration

Copy the environment template and add your API key:

```bash
cp .env.local.template .env.local
```

Open `.env.local` and replace the placeholder:

```
VITE_API_KEY=your_api_key_here
```

## Launch

Install dependencies and start the dev server:

```bash
make install
make dev
```

Or without Make:

```bash
npm install
npm run dev
```

The app opens at `http://localhost:5173`. The dev server is also accessible on your local network at your machine's IP address — useful for testing the full workflow from a mobile device running the Model Health Companion app.
