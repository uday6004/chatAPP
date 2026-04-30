const socket = io();

// DOM refs
const joinScreen    = document.getElementById("join-screen");
const chatScreen    = document.getElementById("chat-screen");
const usernameInput = document.getElementById("username-input");
const joinBtn       = document.getElementById("join-btn");
const messagesDiv   = document.getElementById("messages");
const messageInput  = document.getElementById("message-input");
const sendBtn       = document.getElementById("send-btn");
const userList      = document.getElementById("user-list");
const onlineCount   = document.getElementById("online-count");
const headerUser    = document.getElementById("header-user");
const typingDiv     = document.getElementById("typing-indicator");

let currentUser = "";
let typingTimer  = null;

// ── JOIN ──────────────────────────────────────────────
function joinChat() {
  const name = usernameInput.value.trim();
  if (!name) return;
  currentUser = name;
  socket.emit("user:join", name);
  joinScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");
  headerUser.textContent = `@${name}`;
  messageInput.focus();
}

joinBtn.addEventListener("click", joinChat);
usernameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") joinChat(); });

// ── SEND MESSAGE ──────────────────────────────────────
function sendMessage() {
  const msg = messageInput.value.trim();
  if (!msg || !currentUser) return;
  socket.emit("chat:message", { username: currentUser, message: msg });
  messageInput.value = "";
  socket.emit("chat:stop_typing");
  clearTimeout(typingTimer);
}

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { sendMessage(); return; }

  // Typing indicator
  socket.emit("chat:typing", currentUser);
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => socket.emit("chat:stop_typing"), 2000);
});

// ── HELPERS ───────────────────────────────────────────
function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function scrollToBottom() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function appendMessage({ username, message, timestamp }) {
  const isOwn = username === currentUser;
  const div = document.createElement("div");
  div.className = `msg ${isOwn ? "own" : ""}`;
  div.innerHTML = `
    <div class="msg-meta">
      <span class="msg-user">${escapeHtml(username)}</span>
      <span class="msg-time">${formatTime(timestamp)}</span>
    </div>
    <div class="msg-bubble">${escapeHtml(message)}</div>
  `;
  messagesDiv.appendChild(div);
  scrollToBottom();
}

function appendSystem(text) {
  const div = document.createElement("div");
  div.className = "msg-system";
  div.textContent = text;
  messagesDiv.appendChild(div);
  scrollToBottom();
}

function escapeHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ── SOCKET EVENTS ─────────────────────────────────────
socket.on("chat:history", (messages) => {
  messagesDiv.innerHTML = "";
  messages.forEach(appendMessage);
});

socket.on("chat:message", appendMessage);

socket.on("chat:system", appendSystem);

socket.on("user:list", (users) => {
  onlineCount.textContent = users.length;
  userList.innerHTML = users
    .map((u) => `<li>${escapeHtml(u)}</li>`)
    .join("");
});

socket.on("chat:typing", (username) => {
  typingDiv.classList.remove("hidden");
  typingDiv.textContent = `${username} is typing...`;
});

socket.on("chat:stop_typing", () => {
  typingDiv.classList.add("hidden");
  typingDiv.textContent = "";
});
