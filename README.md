# Executive Assistant

An AI-powered Executive Assistant and optional Google integrations (Calendar, Gmail, Drive). Runs entirely on your local machine.

![screenshot](https://placeholder/screenshot.png)

---

## Features

- **Natural language chat** with Claude claude-sonnet-4
- **Google Calendar** — view today's schedule, create/update events
- **Gmail** — summarise emails, flag priorities, draft replies
- **Google Drive** — search and reference your documents
- Dark, minimal UI — works in any modern browser

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- An [Anthropic API key](https://console.anthropic.com/)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and set your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

For development with auto-restart on file changes:

```bash
npm run dev
```

---

## Connecting Google Services

Google integrations are **optional** — the assistant works without them, using only Claude's knowledge. To enable live Calendar, Gmail, and Drive access, you need OAuth 2.0 Bearer tokens.

### Getting Google OAuth Tokens

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the following APIs:
   - Google Calendar API
   - Gmail API
   - Google Drive API
4. Go to **Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Choose **Desktop application**
6. Download the credentials JSON

#### Exchange for a Bearer token (easiest method)

Use the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/):

1. Click the gear icon → check **"Use your own OAuth credentials"**
2. Enter your Client ID and Secret
3. In Step 1, select the scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/drive.readonly`
4. Click **Authorize APIs** → **Exchange authorization code for tokens**
5. Copy the **Access token**

Add each token to your `.env`:

```
GOOGLE_CALENDAR_TOKEN=ya29.your-calendar-token
GMAIL_TOKEN=ya29.your-gmail-token
GOOGLE_DRIVE_TOKEN=ya29.your-drive-token
```

> **Note:** Access tokens expire after 1 hour. For a production setup, implement the OAuth refresh token flow. See `src/server.js` for where to add refresh logic.

---

## Project Structure

```
executive-assistant/
├── public/
│   ├── index.html      # UI — dark chat interface
│   └── app.js          # Frontend logic (fetch, rendering)
├── src/
│   └── server.js       # Express server + Anthropic API proxy
├── .env.example        # Environment variable template
├── package.json
└── README.md
```

---

## How It Works

```
Browser (public/)
    │
    │  POST /api/chat { messages: [...] }
    ▼
Express server (src/server.js)
    │
    │  anthropic.messages.create({ model, messages, mcp_servers })
    ▼
Anthropic API  ←──MCP──→  Google Calendar / Gmail / Drive
    │
    │  { content: [ text, tool_use, ... ] }
    ▼
Express extracts text + tool names
    │
    │  { reply, toolUsed }
    ▼
Browser renders message
```

The server acts as a secure proxy — your API key never leaves the server and is never exposed to the browser.

---

## Configuration

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Your Anthropic API key |
| `GOOGLE_CALENDAR_TOKEN` | ❌ | OAuth token for Google Calendar |
| `GMAIL_TOKEN` | ❌ | OAuth token for Gmail |
| `GOOGLE_DRIVE_TOKEN` | ❌ | OAuth token for Google Drive |
| `PORT` | ❌ | Server port (default: 3000) |

---

## Customising the Assistant

### Change the system prompt

Edit the `SYSTEM` constant in `src/server.js` to adjust the assistant's persona, priorities, or behaviour.

### Add more MCP servers

Add entries to the `getMcpServers()` function in `src/server.js`. Any MCP-compatible server can be plugged in:

```js
servers.push({
  type: 'url',
  url:  'https://your-mcp-server.com/mcp/v1',
  name: 'my-tool',
  authorization_token: process.env.MY_TOOL_TOKEN,
});
```

### Switch models

Change `model` in the `params` object in the `/api/chat` handler:

```js
model: 'claude-opus-4-20250514',  // more powerful
model: 'claude-haiku-4-5-20251001', // faster and cheaper
```

---

## Troubleshooting

**`Error: HTTP 401`** — Check your `ANTHROPIC_API_KEY` in `.env`.

**Google tools not appearing** — Make sure the token is set in `.env` and the corresponding Google API is enabled in Cloud Console.

**Token expired** — Google OAuth access tokens expire after 1 hour. Re-run the OAuth Playground flow to get a fresh token.

**Port already in use** — Change `PORT=3001` in `.env`.

---

## License

MIT
