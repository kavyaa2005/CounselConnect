const { v4: uuidv4 } = require('uuid');
const { readStoreObj, writeStoreObj } = require('../utils/fileStore.utils');
const { getAllCounselors } = require('./counselors.service');

// Messages stored as: { [userId]: { [counselorId]: Message[] } }
// Message flags: isMe = sent by the user; read = seen by the user;
//                readByDoctor = seen by the doctor.

const fmtTime = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const getConversations = (userId) => {
  const store = readStoreObj('messages.json');
  const userConvs = store[userId] || {};
  const counselors = getAllCounselors();

  return Object.entries(userConvs).map(([counselorId, messages]) => {
    const counselor = counselors.find(c => c.id === counselorId);
    const lastMsg = messages[messages.length - 1];
    const unread = messages.filter(m => !m.isMe && !m.read).length;
    return {
      id: counselorId,
      counselorId,
      name: counselor ? counselor.name : 'Support Team',
      avatar: counselor ? counselor.image : '',
      online: counselor ? counselor.available : true,
      lastMsg: lastMsg ? lastMsg.text : '',
      time: lastMsg ? lastMsg.time : '',
      unread,
    };
  });
};

const getMessages = (userId, counselorId) => {
  const store = readStoreObj('messages.json');
  const userConvs = store[userId] || {};
  const msgs = userConvs[counselorId] || [];

  // Mark counselor messages as read by the user
  msgs.forEach(m => { if (!m.isMe) m.read = true; });
  if (!store[userId]) store[userId] = {};
  store[userId][counselorId] = msgs;
  writeStoreObj('messages.json', store);

  return msgs;
};

// Real messaging: the user's message is stored and the doctor replies from
// the doctor panel. No mock auto-replies.
const sendMessage = (userId, { counselorId, text }) => {
  const store = readStoreObj('messages.json');
  if (!store[userId]) store[userId] = {};
  if (!store[userId][counselorId]) store[userId][counselorId] = [];

  const msg = {
    id: uuidv4(),
    text,
    time: fmtTime(),
    isMe: true,
    read: true,
    readByDoctor: false,
    createdAt: new Date().toISOString(),
  };

  store[userId][counselorId].push(msg);
  writeStoreObj('messages.json', store);
  return { sent: msg, reply: null };
};

const initConversation = (userId, counselorId) => {
  const store = readStoreObj('messages.json');
  if (!store[userId]) store[userId] = {};
  if (!store[userId][counselorId]) {
    const counselor = getAllCounselors().find(c => c.id === counselorId);
    store[userId][counselorId] = [{
      id: uuidv4(),
      text: `Hi! I'm ${counselor ? counselor.name : 'your counselor'}. How can I help you today? 😊`,
      time: fmtTime(),
      isMe: false,
      read: false,
      readByDoctor: true,
      createdAt: new Date().toISOString(),
    }];
    writeStoreObj('messages.json', store);
  }
};

module.exports = { getConversations, getMessages, sendMessage, initConversation };
