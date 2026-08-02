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


const attach = (req, res, next) => {
  try {
    if (!req.file) throw Object.assign(new Error('No file was uploaded'), { statusCode: 400 });
    const kind = req.body.kind === 'voice' || /^audio\//.test(req.file.mimetype) ? 'voice' : 'file';
    const result = msgService.attachToThread(
      req.user.id, req.params.counselorId, req.file,
      { kind, duration: req.body.duration }
    );
    return success(res, { message: result.sent }, 'Sent', 201);
  } catch (err) { next(err); }
};

const downloadAttachment = (req, res, next) => {
  try {
    const path = require('path');
    const fs = require('fs');
    const { CHAT_DIR } = require('../services/chat.paths');
    const att = msgService.findAttachment(req.user.id, req.params.counselorId, req.params.attachmentId);
    const full = path.join(CHAT_DIR, att.storedName);
    if (!fs.existsSync(full)) {
      throw Object.assign(new Error('The stored file is missing'), { statusCode: 404 });
    }
    const ascii = att.name.replace(/[^\x20-\x7E]/g, '-').replace(/["\\]/g, '');
    res.setHeader('Content-Type', att.mimeType || 'application/octet-stream');
    // Voice notes must play inline, not download
    const inline = att.kind === 'voice' || req.query.inline === '1';
    res.setHeader('Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(att.name)}`);
    fs.createReadStream(full).pipe(res);
  } catch (err) { next(err); }
};

const markRead = (req, res, next) => {
  try { return success(res, msgService.markThreadRead(req.user.id, req.params.counselorId)); }
  catch (err) { next(err); }
};

module.exports = { getConversations, getMessages, sendMessage, initConversation,
  attach, downloadAttachment, markRead,
};
