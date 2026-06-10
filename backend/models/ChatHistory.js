const mongoose = require('mongoose');

const ChatHistorySchema = new mongoose.Schema({
  conversation_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatSession', required: true },
  session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatSession', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  role: { type: String, required: true },
  message: { type: String, required: true },
  content: { type: String, required: true },
  model: { type: String, default: 'gemini-2.5-flash' },
  token_usage: {
    prompt_tokens: { type: Number, default: 0 },
    completion_tokens: { type: Number, default: 0 },
    total_tokens: { type: Number, default: 0 }
  },
  response_time: { type: Number, default: 0.0 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatHistory', ChatHistorySchema, 'chat_history');
