'use strict'

import { WebSocketServer } from 'ws'
import http from 'node:http'
import url from 'node:url'

const server = http.createServer((req, res) => {
  if (req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('pong')
  }
})
const wss = new WebSocketServer({ server })

const rooms = new Map()

wss.on('connection', (ws, req) => {
  const parameters = url.parse(req.url, true).query
  if (parameters.username === 'undefined' || parameters.room === 'undefined') {
    ws.send(JSON.stringify({ error: 'Username and room are required' }))
    return ws.close()
  }

  const { room, username } = parameters

  createRoomIfNotExists(room)
  joinUserToRoom(parameters.room, parameters.username, ws)

  const { usernames, usersWs } = getUsersInRoom(parameters.room)

  welcomeUser(ws, usernames)
  alertNewUserConnected(ws, usersWs, parameters.username)

  ws.on('message', (msg) => {
    try {
      const message = JSON.parse(msg)
      if (message.type === msgTypes.newMessage) {
        const { usersWs } = getUsersInRoom(room)
        usersWs.forEach((user) => {
          if (user === ws) return
          user.send(assembleMsg({ type: msgTypes.newMessage, username, msg: message.msg }))
        })
      }
    } catch (error) {
      console.log('Error processing message:', error)
    }
  })

  ws.on('close', () => {
    const room = rooms.get(parameters.room)
    const userIndex = room.users.indexOf(ws)
    room.users.splice(userIndex, 1)
    room.connectedUsernames.delete(username)
    userDisconnected(parameters.username, parameters.room)
  })
})

const createRoomIfNotExists = (room) => {
  if (rooms.has(room)) return
  rooms.set(room, {
    users: [],
    connectedUsernames: new Map(),
  })
}

const joinUserToRoom = (room, username, ws) => {
  const createdRoom = rooms.get(room)
  createdRoom.users.push(ws)
  createdRoom.connectedUsernames.set(username, username)
}

const getUsersInRoom = (room) => {
  const usernames = Array.from(rooms.get(room).connectedUsernames.values())
  const usersWs = rooms.get(room).users
  return {
    usernames,
    usersWs,
  }
}

const msgTypes = {
  newMessage: 'newMessage',
  newUserConnected: 'newUserConnected',
  joined: 'joined',
  userDisconnected: 'userDisconnected',
}

const alertNewUserConnected = (ws, connectedUsers, username) => {
  connectedUsers.forEach((user) => {
    if (user === ws) return
    user.send(assembleMsg({ type: msgTypes.newUserConnected, username }))
  })
}

const welcomeUser = (ws, usersInRoom) => {
  ws.send(assembleMsg({ type: msgTypes.joined, usersInRoom }))
}

const userDisconnected = (username, room) => {
  const { usersWs } = getUsersInRoom(room)
  usersWs.forEach((user) => {
    user.send(assembleMsg({ type: msgTypes.userDisconnected, username }))
  })
}

const assembleMsg = (msg) => {
  return JSON.stringify(msg)
}

const port = process.env.PORT || 8000
server.listen(port, () => console.log(`Server started on port ${port}`))