/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const OpenAI = require('openai');

// Initialize OpenAI with your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.searchHVAC = onRequest(async (request, response) => {
  // Enable CORS
  response.set('Access-Control-Allow-Origin', '*');
  
  if (request.method === 'OPTIONS') {
    response.set('Access-Control-Allow-Methods', 'GET, POST');
    response.set('Access-Control-Allow-Headers', 'Content-Type');
    response.status(204).send('');
    return;
  }

  try {
    const query = request.query.q || request.body.query;
    
    if (!query) {
      response.status(400).json({ error: 'Query parameter is required' });
      return;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are a helpful assistant specialized in HVAC parts and services." 
        },
        {
          role: "user",
          content: `Provide a list of up to 5 HVAC parts or services related to: "${query}". 
                   Please respond in raw JSON format as an array of objects with 'name', 
                   'description', and 'price' fields only.`
        }
      ],
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;
    let suggestions;
    
    try {
      suggestions = JSON.parse(aiResponse);
    } catch (error) {
      logger.error('Failed to parse AI response:', error);
      response.status(500).json({ error: 'Invalid response format from AI' });
      return;
    }

    response.json(suggestions);

  } catch (error) {
    logger.error('Error processing request:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
});
