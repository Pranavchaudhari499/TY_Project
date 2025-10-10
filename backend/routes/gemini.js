const express = require('express');
const Groq = require('groq-sdk');
const auth = require('../middleware/auth'); 
const router = express.Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY; 

if (!GROQ_API_KEY) {
  console.error("CRITICAL: GROQ_API_KEY is not set in your .env file.");
}

// Initialize Groq client only if API key exists
let groq;
if (GROQ_API_KEY) {
  try {
    groq = new Groq({ apiKey: GROQ_API_KEY });
    console.log('✅ Groq client initialized successfully');
  } catch (initError) {
    console.error('❌ Error initializing Groq client:', initError);
  }
}

router.post('/chat', auth, async (req, res) => {
  const { prompt } = req.body;

  console.log('Received chat request from user:', req.user.id);
  console.log('Prompt:', prompt);

  if (!prompt) {
    return res.status(400).json({ error: 'A prompt is required to chat.' });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({ 
      error: 'Server is not configured for AI chat. Missing API Key.' 
    });
  }

  if (!groq) {
    return res.status(500).json({ 
      error: 'Groq client not initialized properly.' 
    });
  }

  try {
    const contextualPrompt = `
      You are an expert AI assistant for "BloodBridge", a full-stack web application designed to solve blood donation challenges in India.
      Your primary goal is to provide helpful, encouraging, and accurate information to users.

      Here is the information you must use to answer questions:
      - **Application Name:** BloodBridge
      - **Mission:** To tackle the persistent challenges of blood donation and availability in India by creating a seamless digital ecosystem.
      - **Core Functionality:** The platform connects verified blood donors, recipients needing blood, and blood banks, all in real-time.
      
      Your tone should always be supportive, positive, and clear.
      
      Important: Keep your responses concise and conversational. Avoid markdown formatting.
      
      User's question: ${prompt}
    `;

    console.log('Sending request to Groq API...');
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant for BloodBridge, a blood donation platform in India. Provide supportive, positive, and clear responses."
        },
        {
          role: "user",
          content: contextualPrompt
        }
      ],
      model: "gemma2-9b-it", // You can change this to other Groq models like "mixtral-8x7b-32768"
      temperature: 0.7,
      max_tokens: 1024,
      stream: false
    });

    const response = chatCompletion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response received from Groq API');
    }

    console.log('Successfully received response from Groq API');
    
    res.json({ response });

  } catch (error) {
    console.error('❌ Error while calling Groq API:', error);
    
    // Groq API specific error handling
    if (error.status === 401) {
      return res.status(500).json({ 
        error: 'Invalid Groq API key. Please check your configuration.' 
      });
    } else if (error.status === 429) {
      return res.status(500).json({ 
        error: 'API rate limit exceeded. Please try again later.' 
      });
    } else if (error.status === 403) {
      return res.status(500).json({ 
        error: 'API permission denied. Please check your API key permissions.' 
      });
    } else {
      return res.status(500).json({ 
        error: 'An error occurred while communicating with the AI assistant.' 
      });
    }
  }
});

module.exports = router;