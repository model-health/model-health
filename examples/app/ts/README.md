# Model Health TypeScript Example

A Vite web app implementing the complete SDK workflow in the browser: session management, camera calibration, subject calibration, activity recording and analysis retrieval.

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

## Browsing the lists

The **Browse** row on the session list leads to four screens, one per resource and separate from
the capture workflow: Activities, Subjects, Sessions and Subject groups.

Every list is read the same way — `client.<resource>.list(options)` returns a sequence you
iterate — so the reading is written once in `src/views/browseScreen.js` and each screen supplies
only what genuinely differs: the options its resource accepts, the fields it sorts by, and what a
row looks like. Sessions, for instance, take a subject, an order and a limit and nothing else, so
the other controls are absent there rather than greyed out.

They exist to make a few things visible that are otherwise hard to see from a finished list:

- the number of matches, which the sequence reports before it has been read to the end
- items arriving a piece at a time, with how long each read took
- stopping part-way, and collecting the rest afterwards with `all()`
- releasing a sequence you have stopped reading, with `close()`

Activities is the screen worth opening first — it is usually the only list with enough records
for a long read to arrive in more than one piece.
