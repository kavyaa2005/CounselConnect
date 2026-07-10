const msgService = require('../services/messages.service');
const { success } = require('../utils/response.utils');

const getConversations = (req, res, next) => {
  try {
    const conversations = msgService.getConversations(req.user.id);
    return success(res, { conversations });
  } catch (err) { next(err); }
};

const getMessages = (req, res, next) => {
  try {
    const messages = msgService.getMessages(req.user.id, req.params.conversationId);
    return success(res, { messages });
  } catch (err) { next(err); }
};

const sendMessage = (req, res, next) => {
  try {
    const result = msgService.sendMessage(req.user.id, req.body);
    return success(res, result, 'Message sent', 201);
  } catch (err) { next(err); }
};

const initConversation = (req, res, next) => {
  try {
    msgService.initConversation(req.user.id, req.params.counselorId);
    return success(res, {}, 'Conversation initialized');
  } catch (err) { next(err); }
};

module.exports = { getConversations, getMessages, sendMessage, initConversation };
