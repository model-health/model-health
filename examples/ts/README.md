# Model Health TypeScript Example

A browser-based demo of the Model Health SDK. Walks through creating a session, adding a subject, running camera calibration and neutral pose capture, recording an activity, and viewing analysis results.

## Setup

**1. Add your API key**

Create `.env.local` in this directory:

```
VITE_API_KEY=your_api_key_here
```

**2. Install dependencies**

```bash
make install
```

**3. Start the dev server**

```bash
make dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. The server is also accessible from other devices on your local network — the address is printed on startup.
