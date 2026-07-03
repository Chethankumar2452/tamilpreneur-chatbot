const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const { generateSessionId } = require("../utils/sessionId");
const {
  generateResponse,
  detectFallback,
  detectCallRequest,
} = require("../services/gemini");

const logger = require("../utils/logger");

const prisma = new PrismaClient();

/**
 * Create Session
 */
async function createSession(req, res) {
  try {
    const sessionId = await generateSessionId();
    const browserId = req.body.browserId || uuidv4();

    const session = await prisma.chatSession.create({
      data: {
        sessionId,
        browserId,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        device: detectDevice(req.headers["user-agent"]),
      },
    });

    res.json({
      sessionId: session.sessionId,
      browserId,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({
      error: "Failed to create session",
    });
  }
}

/**
 * Chat Streaming
 */
async function streamChat(req, res) {
  const { sessionId, message } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({
      error: "sessionId and message required",
    });
  }

  try {
    const session = await prisma.chatSession.findUnique({
      where: {
        sessionId,
      },
    });

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    await prisma.chatMessage.create({
      data: {
        sessionId,
        sender: "user",
        message,
      },
    });

    const history = await prisma.chatMessage.findMany({
      where: {
        sessionId,
      },
      orderBy: {
        timestamp: "asc",
      },
      take: 20,
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let fullResponse = "";

    try {
      const stream = await generateResponse(
        message,
        history.slice(0, -1)
      );

      for await (const chunk of stream) {
        const text =
          chunk.choices?.[0]?.delta?.content || "";

        if (!text) continue;

        fullResponse += text;

        res.write(
          `data: ${JSON.stringify({
            text,
            done: false,
          })}\n\n`
        );
      }
    } catch (err) {
      console.error(err);

      fullResponse =
        "I'm having trouble connecting right now. Please try again in a moment.";

      res.write(
        `data: ${JSON.stringify({
          text: fullResponse,
          done: false,
        })}\n\n`
      );
    }

    await prisma.chatMessage.create({
      data: {
        sessionId,
        sender: "bot",
        message: fullResponse,
      },
    });

    const shouldCollectLead =
      detectFallback(fullResponse) ||
      detectCallRequest(message);

    res.write(
      `data: ${JSON.stringify({
        done: true,
        shouldCollectLead,
        fullResponse,
      })}\n\n`
    );

    res.end();
  } catch (err) {
    console.error(err);

    if (!res.headersSent) {
      return res.status(500).json({
        error: "Internal server error",
      });
    }

    res.end();
  }
}

/**
 * History
 */
async function getChatHistory(req, res) {
  try {
    const messages =
      await prisma.chatMessage.findMany({
        where: {
          sessionId: req.params.sessionId,
        },
        orderBy: {
          timestamp: "asc",
        },
      });

    res.json({
      messages,
    });
  } catch (err) {
    logger.error(err);

    res.status(500).json({
      error: "Failed to fetch history",
    });
  }
}

/**
 * End Session
 */
async function endSession(req, res) {
  try {
    const session =
      await prisma.chatSession.findUnique({
        where: {
          sessionId: req.params.sessionId,
        },
      });

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    const duration = Math.floor(
      (Date.now() -
        session.startTime.getTime()) /
        1000
    );

    await prisma.chatSession.update({
      where: {
        sessionId: req.params.sessionId,
      },
      data: {
        status: "completed",
        endTime: new Date(),
        duration,
      },
    });

    res.json({
      success: true,
    });
  } catch (err) {
    logger.error(err);

    res.status(500).json({
      error: "Failed to end session",
    });
  }
}

/**
 * Suggested Questions
 */
function getSuggestedQuestions(req, res) {
  res.json({
    suggestions: [
      { id: 1, text: "What is Grand Sangamam?" },
      { id: 2, text: "When is the event?" },
      { id: 3, text: "Where is the venue?" },
      { id: 4, text: "How do I register?" },
      { id: 5, text: "What is the ticket price?" },
      { id: 6, text: "Who are the speakers?" },
      { id: 7, text: "Can startups participate?" },
      { id: 8, text: "Can investors attend?" },
      { id: 9, text: "What are sponsorship opportunities?" },
      { id: 10, text: "How can I contact the organizers?" },
    ],
  });
}

function detectDevice(userAgent = "") {
  if (!userAgent) return "unknown";

  if (/mobile|android|iphone|ipad/i.test(userAgent))
    return "mobile";

  if (/tablet/i.test(userAgent))
    return "tablet";

  return "desktop";
}

module.exports = {
  createSession,
  streamChat,
  getChatHistory,
  endSession,
  getSuggestedQuestions,
};