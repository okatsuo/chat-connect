#!/usr/bin/env node

'use strict'

import readline from 'node:readline'
import WebSocket from 'ws'
import chalk from 'chalk'

const serverUrl = 'https://chat-connect-930i.onrender.com'

let ws

const connectToServer = (username, room) => {
  if (!username || !room) return console.log('Username and room are required')

  ws = new WebSocket(`${serverUrl}?username=${username}&room=${room}`)

  ws.on('message', (msg) => {
    try {
      const message = JSON.parse(msg)
      if (message.type === msgTypes.joined) console.log(chalk.yellow(`Connected users: ${message.usersInRoom.join(', ')}`))
      if (message.type === msgTypes.newUserConnected) console.log(chalk.green(`${message.username} connected`))
      if (message.type === msgTypes.newMessage) console.log(chalk.magenta(`${message.username}: ${message.msg}`))
      if (message.type === msgTypes.userDisconnected) console.log(chalk.red(`${message.username} disconnected`))
    } catch (error) {
      console.log('Error processing message:', error)
    }
  })

  ws.on('open', () => promptUser(username))
  ws.on('error', (error) => console.log('Error connecting to server:', error))
  ws.on('close', (msg) => cleanup())
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

rl.question('Username: ', (username) => {
  rl.question('Room: ', (room) => {
    connectToServer(username, room)
  })
})

const promptUser = () => {
  rl.question('', (msg) => {
    if (msg === '/exit') return cleanup()
    sendNewMessage(msg)
    promptUser()
  })
}

const assembleMsg = (msg) => {
  return JSON.stringify(msg)
}

const msgTypes = {
  newMessage: 'newMessage',
  newUserConnected: 'newUserConnected',
  joined: 'joined',
  userDisconnected: 'userDisconnected',
}

const sendNewMessage = (msg) => {
  const newMessage = {
    type: msgTypes.newMessage,
    msg,
  }
  ws.send(assembleMsg(newMessage))
}

const cleanup = () => {
  if (ws) ws.close()
    rl.close()
  process.exit(0)
}

// Handle Ctrl+C
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)