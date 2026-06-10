const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  role: { type: String, required: true }, // "user" or "assistant"
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const ChatSessionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  session_title: { type: String, required: true },
  messages: [ChatMessageSchema],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatSession', ChatSessionSchema, 'coaching_sessions');
