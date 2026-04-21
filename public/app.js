// ── Executive Assistant – frontend logic ──────────────────────────────────────

const chat = document.getElementById('chat');
const inp  = document.getElementById('inp');
const btn  = document.getElementById('send-btn');

let history = [];
let currentView = 'chat';

// Date in topbar
const d = new Date();
document.getElementById('topbar-date').textContent =
  d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });

// Integration status dots (server will tell us which are configured)
async function checkIntegrations() {
  try {
    const res = await fetch('/api/integrations');
    const data = await res.json();
    ['cal','gmail','drive'].forEach(key => {
      const el = document.getElementById(`dot-${key}`);
      if (el) el.className = `int-dot${data[key] ? '' : ' off'}`;
    });
  } catch (_) {}
}
checkIntegrations();

// ── View switching ────────────────────────────────────────────────────────────
function setView(v) {
  currentView = v;
  document.querySelectorAll('.nav-item').forEach((el, i) => {
    el.classList.toggle('active', ['chat','tasks','calendar'][i] === v);
  });
  document.getElementById('view-title').textContent =
    v === 'chat' ? 'Chat' : v === 'tasks' ? 'Tasks' : 'Calendar';

  if (v !== 'chat') {
    const prompt = v === 'tasks'
      ? 'List my current tasks and action items'
      : 'Show my calendar events for the rest of this week';
    sendChip(prompt);
    currentView = 'chat';
    document.querySelectorAll('.nav-item')[0].classList.add('active');
    document.querySelectorAll('.nav-item')[['chat','tasks','calendar'].indexOf(v)].classList.remove('active');
    document.getElementById('view-title').textContent = 'Chat';
  }
}

// ── Message rendering ─────────────────────────────────────────────────────────
function addMsg(role, html, toolName) {
  const isUser = role === 'user';
  const div = document.createElement('div');
  div.className = `msg ${isUser ? 'user' : ''}`;
  div.innerHTML = `
    <div class="msg-av ${isUser ? 'you' : 'ea'}">${isUser ? 'You' : 'EA'}</div>
    <div>
      <div class="bubble ${isUser ? 'you' : 'ea'}">${html}</div>
      ${toolName ? `<div class="tool-pill"><div class="dot"></div>${toolName}</div>` : ''}
    </div>`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function addTyping() {
  const div = document.createElement('div');
  div.className = 'msg'; div.id = 'typing';
  div.innerHTML = `
    <div class="msg-av ea">EA</div>
    <div class="bubble ea"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function rmTyping() {
  const t = document.getElementById('typing');
  if (t) t.remove();
}

// ── API call ──────────────────────────────────────────────────────────────────
async function callEA(text) {
  btn.disabled = true;
  history.push({ role: 'user', content: text });
  addTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    rmTyping();

    const reply   = data.reply   || 'Done.';
    const toolUsed = data.toolUsed || null;

    history.push({ role: 'assistant', content: reply });
    addMsg('ai', reply.replace(/\n/g, '<br>'), toolUsed);

  } catch (err) {
    rmTyping();
    addMsg('ai', `<span style="color:#e05252">Error: ${err.message}</span>`);
    history.pop();
  } finally {
    btn.disabled = false;
  }
}

function send() {
  const text = inp.value.trim();
  if (!text) return;
  inp.value = '';
  addMsg('user', text);
  callEA(text);
}

function sendChip(text) {
  addMsg('user', text);
  callEA(text);
}

// ── Welcome message ───────────────────────────────────────────────────────────
addMsg('ai',
  `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}! ` +
  `I'm your Executive Assistant. I can help with your schedule, tasks, emails, and documents. ` +
  `What would you like to tackle first?`
);
