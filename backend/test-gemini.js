require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  try {
    console.log("Model:", process.env.GEMINI_MODEL);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL,
    });

    const result = await model.generateContent("Hello");
    console.log(result.response.text());
  } catch (e) {
    console.error(e);
  }
}

test();