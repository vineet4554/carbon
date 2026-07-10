const ChatSession = require('../models/ChatSession');
const ChatHistory = require('../models/ChatHistory');
const User = require('../models/User');
const ai = require('../config/gemini');

const getSessions = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit || '100', 10);
    const offset = parseInt(req.query.offset || '0', 10);

    const sessions = await ChatSession.find({ user_id: userId })
      .sort({ updated_at: -1 })
      .skip(offset)
      .limit(limit);

    const formatted = sessions.map(s => {
      const sObj = s.toObject();
      sObj._id = sObj._id.toString();
      sObj.user_id = sObj.user_id.toString();
      if (sObj.created_at) sObj.created_at = sObj.created_at.toISOString();
      if (sObj.updated_at) sObj.updated_at = sObj.updated_at.toISOString();
      return {
        _id: sObj._id,
        session_title: sObj.session_title,
        updated_at: sObj.updated_at
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Get coaching sessions error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const createSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const welcomeText = 
      "Hello! I am EcoPilot, your AI Sustainability Coach. " +
      "How can I help you reduce your carbon footprint, audit utility drawers, or simulate offsets today?";
    
    const newSession = new ChatSession({
      user_id: userId,
      session_title: `Conversation thread - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      messages: [{
        role: 'assistant',
        content: welcomeText,
        timestamp: new Date()
      }]
    });

    const saved = await newSession.save();

    const historyEntry = new ChatHistory({
      conversation_id: saved._id,
      session_id: saved._id,
      user_id: userId,
      timestamp: saved.messages[0].timestamp,
      role: 'assistant',
      message: welcomeText,
      content: welcomeText,
      model: 'gemini-2.5-flash',
      token_usage: { prompt_tokens: 0, completion_tokens: Math.floor(welcomeText.length / 4), total_tokens: Math.floor(welcomeText.length / 4) },
      response_time: 0.0,
      metadata: {}
    });
    await historyEntry.save();

    const resObj = saved.toObject();
    resObj._id = resObj._id.toString();
    resObj.user_id = resObj.user_id.toString();
    resObj.messages[0].timestamp = resObj.messages[0].timestamp.toISOString();
    resObj.created_at = resObj.created_at.toISOString();
    resObj.updated_at = resObj.updated_at.toISOString();

    res.json(resObj);
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const assessHabits = async (req, res) => {
  try {
    const userId = req.user._id;
    const { travel, food, electricity, waste, water, session_id } = req.body;

    const prompt = `
You are an expert carbon footprint auditor and environmental scientist.
Analyze the user's habits profile:
- Travel: ${travel}
- Food: ${food}
- Electricity: ${electricity}
- Waste: ${waste}
- Water: ${water}

Provide structured recommendations.
`;

    let assessmentJson;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              top_emission_sources: {
                type: 'ARRAY',
                items: { type: 'STRING' }
              },
              personalized_recommendations: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    recommendation: { type: 'STRING' },
                    expected_savings: { type: 'STRING' },
                    co2_reduction: { type: 'STRING' },
                    difficulty_level: { type: 'STRING' }
                  },
                  required: ['recommendation', 'expected_savings', 'co2_reduction', 'difficulty_level']
                }
              },
              expected_savings: { type: 'STRING' },
              co2_reduction: { type: 'STRING' },
              difficulty_level: { type: 'STRING' }
            },
            required: ['top_emission_sources', 'personalized_recommendations', 'expected_savings', 'co2_reduction', 'difficulty_level']
          }
        }
      });
      assessmentJson = JSON.parse(response.text);
    } catch (err) {
      console.error('Failed to get habits assessment from Gemini:', err.message);
      return res.status(502).json({ detail: 'Gemini AI service error.' });
    }

    let activeSessionId = session_id;
    let session;

    if (activeSessionId) {
      session = await ChatSession.findById(activeSessionId);
      if (!session || session.user_id.toString() !== userId.toString()) {
        return res.status(404).json({ detail: 'Coaching session not found.' });
      }
    } else {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      session = new ChatSession({
        user_id: userId,
        session_title: `Eco Profile - ${dateStr}`,
        messages: []
      });
      await session.save();
      activeSessionId = session._id.toString();
    }

    const userMessageContent = 
      `Here is my sustainability profile:\n` +
      `- 🚗 Travel: ${travel}\n` +
      `- 🥗 Food: ${food}\n` +
      `- ⚡ Electricity: ${electricity}\n` +
      `- 🗑️ Waste: ${waste}\n` +
      `- 💧 Water: ${water}`;

    const userMsg = {
      role: 'user',
      content: userMessageContent,
      timestamp: new Date()
    };

    session.messages.push(userMsg);
    session.updated_at = new Date();
    await session.save();

    const userHistory = new ChatHistory({
      conversation_id: session._id,
      session_id: session._id,
      user_id: userId,
      timestamp: userMsg.timestamp,
      role: 'user',
      message: userMessageContent,
      content: userMessageContent,
      model: 'gemini-2.5-flash',
      token_usage: { prompt_tokens: Math.floor(userMessageContent.length / 4), completion_tokens: 0, total_tokens: Math.floor(userMessageContent.length / 4) },
      response_time: 0.0
    });
    await userHistory.save();

    let md = "### 🌱 Sustainability Assessment Report\n\n";
    md += "#### 🚨 Top Emission Sources\n";
    for (const src of (assessmentJson.top_emission_sources || [])) {
      md += `- ${src}\n`;
    }
    md += "\n";
    
    md += "#### 💡 Personalized Recommendations\n";
    (assessmentJson.personalized_recommendations || []).forEach((rec, idx) => {
      md += `${idx + 1}. **${rec.recommendation}**\n`;
      md += `   - 💰 Savings: ${rec.expected_savings}\n`;
      md += `   - 🌱 CO2 Reduction: ${rec.co2_reduction}\n`;
      md += `   - ⚡ Difficulty: ${rec.difficulty_level}\n`;
    });
    md += "\n";
    
    md += "#### 📊 Summary\n";
    md += `- **Expected Savings (Overall)**: ${assessmentJson.expected_savings || ''}\n`;
    md += `- **CO2 Reduction (Overall)**: ${assessmentJson.co2_reduction || ''}\n`;
    md += `- **Difficulty Level**: ${assessmentJson.difficulty_level || 'Easy'}\n`;
    
    const assistantMsg = {
      role: 'assistant',
      content: md,
      timestamp: new Date()
    };

    session.messages.push(assistantMsg);
    await session.save();

    const assistantHistory = new ChatHistory({
      conversation_id: session._id,
      session_id: session._id,
      user_id: userId,
      timestamp: assistantMsg.timestamp,
      role: 'assistant',
      message: md,
      content: md,
      model: 'gemini-2.5-flash',
      token_usage: { prompt_tokens: Math.floor(userMessageContent.length / 4), completion_tokens: Math.floor(md.length / 4), total_tokens: Math.floor((userMessageContent.length + md.length) / 4) },
      response_time: 0.5
    });
    await assistantHistory.save();

    res.json({
      session_id: activeSessionId,
      top_emission_sources: assessmentJson.top_emission_sources || [],
      personalized_recommendations: assessmentJson.personalized_recommendations || [],
      expected_savings: assessmentJson.expected_savings || "",
      co2_reduction: assessmentJson.co2_reduction || "",
      difficulty_level: assessmentJson.difficulty_level || "Easy"
    });
  } catch (error) {
    console.error('Assess habits error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const getSessionDetail = async (req, res) => {
  try {
    const { session_id } = req.params;
    const userId = req.user._id;

    const session = await ChatSession.findById(session_id);
    if (!session || session.user_id.toString() !== userId.toString()) {
      return res.status(404).json({ detail: 'Coaching session not found' });
    }

    const messages = await ChatHistory.find({ session_id }).sort({ timestamp: 1 });

    const sessionObj = session.toObject();
    sessionObj._id = sessionObj._id.toString();
    sessionObj.user_id = sessionObj.user_id.toString();
    sessionObj.created_at = sessionObj.created_at.toISOString();
    sessionObj.updated_at = sessionObj.updated_at.toISOString();

    sessionObj.messages = messages.map(msg => {
      const msgObj = msg.toObject();
      return {
        role: msgObj.role,
        content: msgObj.content || msgObj.message,
        timestamp: msgObj.timestamp.toISOString()
      };
    });

    res.json(sessionObj);
  } catch (error) {
    console.error('Get session detail error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const updateSession = async (req, res) => {
  try {
    const { session_id } = req.params;
    const { title } = req.query;
    const userId = req.user._id;

    if (!title) {
      return res.status(400).json({ detail: 'Title query parameter is required.' });
    }

    const session = await ChatSession.findById(session_id);
    if (!session || session.user_id.toString() !== userId.toString()) {
      return res.status(404).json({ detail: 'Coaching session not found' });
    }

    session.session_title = title;
    session.updated_at = new Date();
    await session.save();

    res.json({
      message: 'Coaching session title updated successfully.',
      session_id,
      session_title: title
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const deleteSession = async (req, res) => {
  try {
    const { session_id } = req.params;
    const userId = req.user._id;

    const session = await ChatSession.findById(session_id);
    if (!session || session.user_id.toString() !== userId.toString()) {
      return res.status(404).json({ detail: 'Coaching session not found' });
    }

    await ChatSession.deleteOne({ _id: session_id });
    await ChatHistory.deleteMany({ session_id });

    res.json({ message: 'Coaching thread deleted successfully.' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const streamCoachMessage = async (req, res) => {
  try {
    const { session_id } = req.params;
    const { message } = req.body;
    const userId = req.user._id;

    if (!message) {
      return res.status(400).json({ detail: 'Message content is required.' });
    }

    const session = await ChatSession.findById(session_id);
    if (!session || session.user_id.toString() !== userId.toString()) {
      return res.status(404).json({ detail: 'Coaching session not found' });
    }

    const messages = await ChatHistory.find({ session_id }).sort({ timestamp: 1 });
    const trimmedHistory = messages.slice(-10);
    const historyPayload = trimmedHistory.map(m => ({
      role: m.role,
      content: m.content || m.message
    }));

    const olderHistory = messages.slice(0, -10);
    let historySummary = session.history_summary || '';
    let summarizedCount = session.summarized_count || 0;
    const newCount = olderHistory.length;

    if (newCount > 0 && (!historySummary || newCount >= summarizedCount + 4)) {
      try {
        const olderHistoryText = olderHistory.map(m => `${m.role}: ${m.content || m.message}`).join("\n");
        const summaryPrompt = `
Summarize the core themes and topics discussed in this conversation history. Keep the summary under 3 sentences.
Conversation:
${olderHistoryText}
`;
        const summaryRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: summaryPrompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                summary: { type: 'STRING' }
              },
              required: ['summary']
            }
          }
        });
        const summaryData = JSON.parse(summaryRes.text);
        historySummary = summaryData.summary || '';
        session.history_summary = historySummary;
        session.summarized_count = newCount;
        await session.save();
      } catch (err) {
        console.error('Error generating older history summary:', err.message);
      }
    }

    // Save user message to database
    const userMsg = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    session.messages.push(userMsg);
    session.updated_at = new Date();
    await session.save();

    const inputTokenEst = Math.floor((message.length + historyPayload.reduce((sum, h) => sum + h.content.length, 0)) / 4);

    const userHistory = new ChatHistory({
      conversation_id: session._id,
      session_id: session._id,
      user_id: userId,
      timestamp: userMsg.timestamp,
      role: 'user',
      message,
      content: message,
      model: 'gemini-2.5-flash',
      token_usage: { prompt_tokens: inputTokenEst, completion_tokens: 0, total_tokens: inputTokenEst },
      response_time: 0.0
    });
    await userHistory.save();

    // Setup headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let accumulatedResponse = '';
    const startTime = Date.now();

    // Format chat history for Gemini SDK
    const contents = [];
    historyPayload.forEach(h => {
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      });
    });
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    try {
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction: "You are EcoPilot, a friendly, encouraging, and expert AI Sustainability Coach. Your goal is to guide the user in lowering their carbon footprint, audit their habits, analyze utility bills, and suggest actions." + (historySummary ? ` Here is a summary of your previous conversation: ${historySummary}` : "")
        }
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        accumulatedResponse += text;
        res.write(text);
      }

      const responseTimeSec = (Date.now() - startTime) / 1000;
      const completionTokenEst = Math.floor(accumulatedResponse.length / 4);

      // Save assistant response to DB
      const assistantMsg = {
        role: 'assistant',
        content: accumulatedResponse,
        timestamp: new Date()
      };

      session.messages.push(assistantMsg);
      await session.save();

      const assistantHistory = new ChatHistory({
        conversation_id: session._id,
        session_id: session._id,
        user_id: userId,
        timestamp: assistantMsg.timestamp,
        role: 'assistant',
        message: accumulatedResponse,
        content: accumulatedResponse,
        model: 'gemini-2.5-flash',
        token_usage: {
          prompt_tokens: inputTokenEst,
          completion_tokens: completionTokenEst,
          total_tokens: inputTokenEst + completionTokenEst
        },
        response_time: responseTimeSec
      });
      await assistantHistory.save();
      res.end();

    } catch (err) {
      console.error('Streaming connection error:', err.message);
      const errMsg = "\n\n[Coach Connection Error. Swapping commute modes or swap bulbs parameters to reduce draws.]";
      accumulatedResponse += errMsg;
      res.write(errMsg);
      res.end();

      const assistantMsg = {
        role: 'assistant',
        content: accumulatedResponse,
        timestamp: new Date()
      };

      session.messages.push(assistantMsg);
      await session.save();

      const assistantHistory = new ChatHistory({
        conversation_id: session._id,
        session_id: session._id,
        user_id: userId,
        timestamp: assistantMsg.timestamp,
        role: 'assistant',
        message: accumulatedResponse,
        content: accumulatedResponse,
        model: 'gemini-2.5-flash',
        token_usage: { prompt_tokens: inputTokenEst, completion_tokens: Math.floor(accumulatedResponse.length / 4), total_tokens: inputTokenEst + Math.floor(accumulatedResponse.length / 4) },
        response_time: 1.0
      });
      await assistantHistory.save();
    }
  } catch (error) {
    console.error('Stream coach message error:', error);
    if (!res.headersSent) {
      res.status(500).json({ detail: 'Internal Server Error' });
    } else {
      res.end();
    }
  }
};

const searchChatHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { q } = req.query;
    const limit = parseInt(req.query.limit || '50', 10);

    if (!q) {
      return res.status(400).json({ detail: 'Search query q is required.' });
    }

    const messages = await ChatHistory.find({
      user_id: userId,
      message: { $regex: q, $options: 'i' }
    })
      .sort({ timestamp: -1 })
      .limit(limit);

    const formatted = messages.map(msg => {
      const msgObj = msg.toObject();
      return {
        id: msgObj._id.toString(),
        conversation_id: msgObj.conversation_id.toString(),
        session_id: msgObj.session_id.toString(),
        user_id: msgObj.user_id.toString(),
        timestamp: msgObj.timestamp.toISOString(),
        role: msgObj.role,
        message: msgObj.message,
        content: msgObj.content,
        model: msgObj.model,
        token_usage: msgObj.token_usage,
        response_time: msgObj.response_time,
        metadata: msgObj.metadata
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Search chat history error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

module.exports = {
  getSessions,
  createSession,
  assessHabits,
  getSessionDetail,
  updateSession,
  deleteSession,
  streamCoachMessage,
  searchChatHistory
};
