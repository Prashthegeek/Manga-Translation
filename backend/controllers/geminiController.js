// controllers/geminiController.js
import axios from "axios";

// Make sure you’ve set GOOGLE_API_KEY in your env
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL    = "gemini-1.5-flash"; 

/**
 * Send a short prompt to Gemini to translate text into English.
 * @param {string} text Japanese (or other) text to translate
 * @returns {Promise<string>} Translated English
 */
export async function translateWithGemini(text) {
  const apiKey = 'AIzaSyBhzSRE-R6LMJvRQRSGQ4n4oZvok0Gjeo8'
  const url = `${BASE_URL}/${MODEL}:generateText?key=${apiKey}`;
  const payload = {
    prompt: {
      text: `Translate the following text to English, preserving meaning and tone:\n\n"${text}"`,
    },
    temperature: 0.2,
    // you can tweak maxOutputTokens, topP, topK here if needed
  };
  const res = await axios.post(url, payload);
  const candidate = res.data.candidates?.[0]?.output;
  return typeof candidate === "string"
    ? candidate.trim()
    : "";  // fallback if API didn’t return
}
