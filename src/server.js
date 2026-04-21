// ── Executive Assistant – Express server ──────────────────────────────────────
// Proxies chat requests to Anthropic API with optional Google MCP servers.

import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app  = express();
const port = process.env.PORT || 3000;

// ── Clients ───────────────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── MCP server config (add OAuth tokens to .env to enable) ───────────────────
function getMcpServers() {
  const servers = [];

  if (process.env.GOOGLE_CALENDAR_TOKEN) {
    servers.push({
      type: 'url',
      url:  'https://calendarmcp.googleapis.com/mcp/v1',
      name: 'google-calendar',
      authorization_token: process.env.GOOGLE_CALENDAR_TOKEN,
    });
  }
  if (process.env.GMAIL_TOKEN) {
    servers.push({
      type: 'url',
      url:  'https://gmailmcp.googleapis.com/mcp/v1',
      name: 'gmail',
      authorization_token: process.env.GMAIL_TOKEN,
    });
  }
  if (process.env.GOOGLE_DRIVE_TOKEN) {
    servers.push({
      type: 'url',
      url:  'https://drivemcp.googleapis.com/mcp/v1',
      name: 'google-drive',
      authorization_token: process.env.GOOGLE_DRIVE_TOKEN,
    });
  }

  return servers;
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM = `You are a highly capable Executive Assistant. You have access to the user's Google Calendar, Gmail, and Google Drive via MCP tools when configured.

Your responsibilities:
- Schedule and manage calendar events
- Summarise emails and flag priorities
- Find and reference documents in Drive
- Help the user plan their day and manage tasks
- Draft emails and meeting agendas on request

Guidelines:
- Be concise and action-oriented — bullet points over paragraphs
- Always check the actual tools for real data; never fabricate events or emails
- If a tool is unavailable, say so clearly and suggest the user configure it
- Today's date: ${new Date().toDateString()}`;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// ── Routes ────────────────────────────────────────────────────────────────────

// Health / integration status
app.get('/api/integrations', (_req, res) => {
  res.json({
    cal:   !!process.env.GOOGLE_CALENDAR_TOKEN,
    gmail: !!process.env.GMAIL_TOKEN,
    drive: !!process.env.GOOGLE_DRIVE_TOKEN,
  });
});

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const mcpServers = getMcpServers();

  try {
    const params = {
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system:     SYSTEM,
      messages,
    };

    if (mcpServers.length > 0) params.mcp_servers = mcpServers;

    const response = await anthropic.messages.create(params);

    // Extract text blocks and tool-use names
    const textBlocks = response.content.filter(b => b.type === 'text');
    const toolBlocks = response.content.filter(b => b.type === 'tool_use' || b.type === 'mcp_tool_use');

    const reply    = textBlocks.map(b => b.text).join('\n').trim() || 'Done.';
    const toolUsed = toolBlocks.length > 0
      ? toolBlocks.map(b => b.name.replace(/_/g, ' ')).join(', ')
      : null;

    res.json({ reply, toolUsed });

  } catch (err) {
    console.error('Anthropic error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Fallback → SPA
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`\n  Executive Assistant running at http://localhost:${port}\n`);
  const mcp = getMcpServers();
  if (mcp.length === 0) {
    console.log('  ⚠  No Google integrations configured.');
    console.log('     Add tokens to .env to enable Calendar, Gmail, and Drive.\n');
  } else {
    console.log(`  ✓  ${mcp.length} Google MCP server(s) active.\n`);
  }
});
