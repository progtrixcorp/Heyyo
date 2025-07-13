const socket = io();
const contactManager = new ContactManager();

let currentUserId = null;
let activeChatUserId = null;
let seenMessages = JSON.parse(localStorage.getItem('seenMessages') || '{}');
let onlineUsers = {}; // Track online users


async function fetchCurrentUserId() {
  try {
    const res = await fetch('/profile', { credentials: 'include' });
    if (!res.ok) throw new Error('Not authenticated');
    const user = await res.json();
    if (!user || !user._id) throw new Error('Not authenticated');
    currentUserId = user._id;
    socket.emit('user_connected', currentUserId);
  } catch (err) {
    window.location.href = '/index.html';
  }
}

function showChatWindow() {
  const chatContainer = document.querySelector('.chat-container');
  document.getElementById('chat-window').style.display = 'flex';
  document.getElementById('contact-list').style.display = 'none';
  chatContainer.classList.remove('only-contacts');
  chatContainer.classList.add('only-chat');
  const bars = document.getElementById('bars');
  if (bars) bars.style.display = 'none';
  ensureStatusDiv();
  updateOnlineStatus();
}

function showContactList() {
  const chatContainer = document.querySelector('.chat-container');
  document.getElementById('chat-window').style.display = 'none';
  document.getElementById('contact-list').style.display = 'block';
  chatContainer.classList.remove('only-chat');
  chatContainer.classList.add('only-contacts');
  activeChatUserId = null;
  document.getElementById('chat-contact-name').textContent = 'Not Selected';
  document.querySelector('.chat-messages').innerHTML = '';
  const bars = document.getElementById('bars');
  if (bars) bars.style.display = '';
}

function ensureStatusDiv() {
  const nameSpan = document.getElementById('chat-contact-name');
  if (!document.getElementById('chat-contact-status')) {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'chat-contact-status';
    statusDiv.style.fontSize = '0.95em';
    statusDiv.style.marginTop = '2px';
    statusDiv.style.marginLeft = '2px';
    statusDiv.style.fontWeight = 'normal';
    nameSpan.parentNode.insertBefore(statusDiv, nameSpan.nextSibling);
  }
}

// Update online status in chat window
function updateOnlineStatus() {
  ensureStatusDiv();
  const statusDiv = document.getElementById('chat-contact-status');
  if (!statusDiv) return;
  if (activeChatUserId && onlineUsers[activeChatUserId]) {
    statusDiv.textContent = 'Online';
    statusDiv.style.color = '#4caf50';
  } else if (activeChatUserId) {
    statusDiv.textContent = 'Offline';
    statusDiv.style.color = '#888';
  } else {
    statusDiv.textContent = '';
  }
}

function renderContacts() {
    const contacts = contactManager.getContacts();
    const container = document.getElementById('contacts-container');
    container.innerHTML = '';
    contacts.forEach((contact, index) => {
        const contactDiv = document.createElement('div');
        contactDiv.className = 'contact';
        contactDiv.textContent = contact.name;
        contactDiv.dataset.userid = contact._id;
        
        contactDiv.onclick = function() {
            activeChatUserId = contact._id;
            loadMessages(activeChatUserId);
            document.getElementById('chat-contact-name').textContent = contact.name;
            ensureStatusDiv();
            showChatWindow();
        };

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-contact';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = function(e) {
            e.stopPropagation();
            if (confirm('Remove this contact?')) {
                contacts.splice(index, 1);
                localStorage.setItem('contacts', JSON.stringify(contacts));
                renderContacts();
                if (activeChatUserId === contact._id) {
                    showContactList();
                }
            }
        };

        contactDiv.appendChild(removeBtn);
        container.appendChild(contactDiv);
    });
}

window.addEventListener('DOMContentLoaded', () => {
  fetchCurrentUserId().then(() => {
    renderContacts();
    document.querySelector('.chat-container').classList.add('only-contacts');
    socket.emit('get_online_users');
  });
});

function searchUser(event) {
    event.preventDefault();
    const name = document.getElementById('searchInput').value.trim();
    if (!name) return;

    fetch(`/api/users/name/${encodeURIComponent(name)}`)
        .then(async res => {
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Error searching for user');
            }
            return data;
        })
        .then(user => {
            if (!user || !user._id) {
                throw new Error('Invalid user data received');
            }
            if (user._id === currentUserId) {
                throw new Error('You cannot add yourself as a contact');
            }

            const contacts = JSON.parse(localStorage.getItem('contacts')) || [];
            if (contacts.some(c => c._id === user._id)) {
                throw new Error('User is already in your contacts');
            }
            if (contacts.length >= 15) {
                throw new Error('Contact list is full (maximum 15 contacts)');
            }

            contacts.push({ name: user.name, _id: user._id });
            localStorage.setItem('contacts', JSON.stringify(contacts));
            renderContacts();
            document.getElementById('searchInput').value = '';
        })
        .catch(err => {
            console.error('Search error:', err);
            alert(err.message);
        });
}

function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateHeader(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function sendMessage() {
    const content = document.getElementById('messagebox').value.trim();
    if (!content || !activeChatUserId || !currentUserId) {
        console.log('Missing required data:', { content, activeChatUserId, currentUserId });
        return;
    }

    const messageData = {
        from: currentUserId,
        to: activeChatUserId,
        content: content
    };

    console.log('Sending message:', messageData);
    socket.emit('private_message', messageData);

    document.getElementById('messagebox').value = '';
}

function loadMessages(userId) {
  if (!currentUserId || !userId) return;

  fetch(`/api/messages/${currentUserId}/${userId}`)
    .then(response => response.json())
    .then(messages => {
      const messagesDiv = document.querySelector('.chat-messages');
      messagesDiv.innerHTML = '';

      let lastDate = null;
      let lastSentMsgId = null;
      let lastSentMsgSeen = false;
      let lastSentMsgTimestamp = null;

      messages.forEach(msg => {
        const msgDate = new Date(msg.timestamp).toDateString();
        const showDateHeader = lastDate !== msgDate;
        const isSent = msg.sender === currentUserId;
        appendMessage(
          isSent ? 'sent' : 'received',
          msg.content,
          msg.timestamp,
          showDateHeader,
          isSent ? msg._id : null,
          isSent ? (msg.seen || seenMessages[msg._id]) : null
        );
        if (isSent) {
          lastSentMsgId = msg._id;
          lastSentMsgSeen = msg.seen;
          lastSentMsgTimestamp = msg.timestamp;
        }
        lastDate = msgDate;
      });

      // If a seen event was received while chat was closed, show it now
      if (window._lastSeenMessageId) {
        const sentMsg = Array.from(messagesDiv.childNodes).find(
          node => node.classList && node.classList.contains('message') && node.classList.contains('sent') && node.dataset.msgId === window._lastSeenMessageId
        );
        if (sentMsg) {
          // Remove any existing seen-indicator after this message
          if (sentMsg.nextSibling && sentMsg.nextSibling.classList && sentMsg.nextSibling.classList.contains('seen-indicator')) {
            sentMsg.nextSibling.remove();
          }
          const seenDiv = document.createElement('div');
          seenDiv.className = 'seen-indicator';
          seenDiv.style.fontSize = '0.75em';
          seenDiv.style.color = '#888';
          seenDiv.style.marginTop = '2px';
          seenDiv.style.marginLeft = '8px';
          seenDiv.textContent = 'Seen';
          sentMsg.parentNode.insertBefore(seenDiv, sentMsg.nextSibling);
          delete window._lastSeenMessageId;
        }
      }

      // Mark as seen all messages received from this contact
      socket.emit('mark_seen', { userId: currentUserId, contactId: userId });

      // Update contact's last message time
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        contactManager.addOrUpdateContact(
          { _id: lastMsg.sender === currentUserId ? lastMsg.receiver : lastMsg.sender, name: document.getElementById('chat-contact-name').textContent },
          lastMsg.timestamp
        );
        renderContacts();
      }
    })
    .catch(err => console.error('Error loading messages:', err));
}

// Append message with optional seen indicator
function appendMessage(type, content, timestamp, showDateHeader = false, msgId = null, seen = null) {
  const messagesDiv = document.querySelector('.chat-messages');
  if (showDateHeader) {
    const dateDiv = document.createElement('div');
    dateDiv.className = 'date-header';
    dateDiv.textContent = formatDateHeader(timestamp);
    messagesDiv.appendChild(dateDiv);
  }
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${type}`;
  msgDiv.innerHTML = `<span>${content}</span><span style="float:right;font-size:0.8em;color:#bdbbbb;margin-left:10px;">${formatTime(timestamp)}</span>`;
  msgDiv.dataset.msgId = msgId || '';

  messagesDiv.appendChild(msgDiv);

  // If sent and seen, print seen just below the message bubble, aligned right, but outside msgDiv
  if (type === 'sent' && seen) {
    // Remove any existing seen-indicator after this message
    if (msgDiv.nextSibling && msgDiv.nextSibling.classList && msgDiv.nextSibling.classList.contains('seen-indicator')) {
      msgDiv.nextSibling.remove();
    }
    // Remove any other seen-indicator in the chat
    const seenIndicators = messagesDiv.querySelectorAll('.seen-indicator');
    seenIndicators.forEach(div => {
      if (div.previousSibling !== msgDiv) div.remove();
    });
    // Add seen indicator as a separate div after the message
    const seenDiv = document.createElement('div');
    seenDiv.className = 'seen-indicator';
    seenDiv.style.fontSize = '0.75em';
    seenDiv.style.color = '#888';
    seenDiv.style.marginTop = '2px';
    seenDiv.style.marginBottom = '8px';
    seenDiv.style.textAlign = 'right';
    seenDiv.style.width = '100%';
    seenDiv.style.display = 'block';
    seenDiv.textContent = 'Seen';
    msgDiv.parentNode.insertBefore(seenDiv, msgDiv.nextSibling);
  }

  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

socket.on('private_message', (message) => {
  if (
    (message.sender === activeChatUserId && message.receiver === currentUserId) ||
    (message.sender === currentUserId && message.receiver === activeChatUserId)
  ) {
    // Remove any existing seen-indicator when a received message is appended
    if (message.sender === activeChatUserId && message.receiver === currentUserId) {
      const messagesDiv = document.querySelector('.chat-messages');
      const seenIndicators = messagesDiv.querySelectorAll('.seen-indicator');
      seenIndicators.forEach(div => div.remove());
    }

    const messagesDiv = document.querySelector('.chat-messages');
    let lastDate = null;
    for (let i = messagesDiv.childNodes.length - 1; i >= 0; i--) {
      const node = messagesDiv.childNodes[i];
      if (node.classList && node.classList.contains('date-header')) {
        lastDate = node.textContent;
        break;
      }
    }
    const msgDate = formatDateHeader(message.timestamp);
    const showDateHeader = lastDate !== msgDate;
    const type = message.sender === currentUserId ? 'sent' : 'received';
    appendMessage(type, message.content, message.timestamp, showDateHeader);
    // If the message is received and the chat is open, mark as seen immediately
    if (message.sender === activeChatUserId && message.receiver === currentUserId) {
      socket.emit('mark_seen', { userId: currentUserId, contactId: activeChatUserId });
    }
  }
  // Update contact's last message time
  if (message.sender === currentUserId) {
    contactManager.updateLastMessageTime(message.receiver, message.timestamp);
  } else {
    contactManager.updateLastMessageTime(message.sender, message.timestamp);
  }
  renderContacts();
});

document.querySelector('.chat-send button').onclick = sendMessage;

document.getElementById('messagebox').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

document.addEventListener('DOMContentLoaded', function() {
  const backBtn = document.getElementById('back-to-contacts');
  if (backBtn) {
    backBtn.onclick = showContactList;
  }
});

socket.on('message_sent', (data) => {
    const messagesDiv = document.querySelector('.chat-messages');
    let lastDate = null;
    if (messagesDiv.lastChild) {
      for (let i = messagesDiv.childNodes.length - 1; i >= 0; i--) {
        const node = messagesDiv.childNodes[i];
        if (node.classList && (node.classList.contains('message') || node.classList.contains('date-header'))) {
          if (node.classList.contains('date-header')) {
            lastDate = node.textContent;
            break;
          }
        }
      }
    }
    const msgDate = formatDateHeader(data.timestamp);
    const showDateHeader = lastDate !== msgDate;
    appendMessage('sent', data.content, data.timestamp, showDateHeader);
    contactManager.updateLastMessageTime(activeChatUserId, data.timestamp);
    renderContacts();
});

socket.on('message_error', (error) => {
    console.error('Error sending message:', error);
    alert('Failed to send message. Please try again.');
});

// Listen for seen event
socket.on('message_seen', ({ messageId, receiver }) => {
  if (receiver === currentUserId) return; // Only update for sender

  // Mark this message as seen in memory and localStorage
  seenMessages[messageId] = true;
  localStorage.setItem('seenMessages', JSON.stringify(seenMessages));

  // Always reload messages if the chat is open and active, so the seen indicator appears immediately
  if (activeChatUserId) {
    loadMessages(activeChatUserId);
  }
});

// Listen for online users update from server
socket.on('online_users', (users) => {
  onlineUsers = users;
  updateOnlineStatus();
});