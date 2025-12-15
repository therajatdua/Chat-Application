import './style.css'
import { io } from 'socket.io-client'

// ✅ CONNECT TO RENDER BACKEND
const socket = io('https://chat-application-6s01.onrender.com', {
  transports: ['websocket'],
  reconnection: true
})

// DOM elements
const loginForm = document.getElementById('loginForm')
const chatApp = document.getElementById('chatApp')
const usernameInput = document.getElementById('usernameInput')
const joinButton = document.getElementById('joinButton')
const leaveButton = document.getElementById('leaveButton')
const currentUserSpan = document.getElementById('currentUser')
const usersList = document.getElementById('usersList')
const messagesDiv = document.getElementById('messages')
const messageInput = document.getElementById('messageInput')
const sendButton = document.getElementById('sendButton')

let currentUsername = ''

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function addMessage(messageData, type = 'chat') {
  if (type === 'system') {
    const systemMessage = document.createElement('div')
    systemMessage.className = 'message system'
    systemMessage.textContent = messageData.text
    messagesDiv.appendChild(systemMessage)
  } else {
    const messageGroup = document.createElement('div')
    messageGroup.className = `message-group ${messageData.username === currentUsername ? 'own' : ''}`

    const header = document.createElement('div')
    header.className = 'message-header'
    header.textContent = `${messageData.username} • ${formatTime(messageData.timestamp)}`

    const body = document.createElement('div')
    body.className = 'message'
    body.textContent = messageData.text

    messageGroup.appendChild(header)
    messageGroup.appendChild(body)
    messagesDiv.appendChild(messageGroup)
  }

  messagesDiv.scrollTop = messagesDiv.scrollHeight
}

function updateUsersList(users) {
  usersList.innerHTML = ''
  users.forEach(user => {
    const tag = document.createElement('span')
    tag.className = `user-tag ${user === currentUsername ? 'current-user' : ''}`
    tag.textContent = user
    usersList.appendChild(tag)
  })
}

function joinChat() {
  const username = usernameInput.value.trim()

  if (username.length < 2 || username.length > 20) {
    alert('Username must be 2–20 characters')
    return
  }

  currentUsername = username
  socket.emit('join chat', username)
}

function sendMessage() {
  const message = messageInput.value.trim()
  if (!message) return

  socket.emit('chat message', {
    text: message,
    timestamp: new Date().toISOString()
  })

  messageInput.value = ''
}

function leaveChat() {
  socket.emit('leave chat')
  loginForm.style.display = 'block'
  chatApp.style.display = 'none'
  messagesDiv.innerHTML = ''
  currentUsername = ''
}

// SOCKET EVENTS
socket.on('connect', () => {
  console.log('✅ Connected to chat server')
})

socket.on('join success', (data) => {
  loginForm.style.display = 'none'
  chatApp.style.display = 'flex'
  currentUserSpan.textContent = `Welcome, ${currentUsername}!`
  updateUsersList(data.users)
})

socket.on('join error', alert)

socket.on('user joined', (data) => {
  updateUsersList(data.users)
  addMessage({ text: `${data.username} joined the chat` }, 'system')
})

socket.on('user left', (data) => {
  updateUsersList(data.users)
  addMessage({ text: `${data.username} left the chat` }, 'system')
})

socket.on('chat message', addMessage)

socket.on('disconnect', () => {
  alert('Connection lost')
  leaveChat()
})

// UI EVENTS
joinButton.addEventListener('click', joinChat)
leaveButton.addEventListener('click', leaveChat)
sendButton.addEventListener('click', sendMessage)

usernameInput.addEventListener('keypress', e => e.key === 'Enter' && joinChat())
messageInput.addEventListener('keypress', e => e.key === 'Enter' && sendMessage())

console.log('✅ Chat app initialized')
