import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Core Ghost Job Analysis Endpoint
app.post("/api/analyze", async (req, res) => {
  try {
    const { title, company, description, posted, platform } = req.body;

    const prompt = `
You are GHOST SCANNER, an agent that detects ghost job postings.

Use the 3-layer, 100-point scoring model:
(40 pts) Structural signals
(35 pts) Org & market signals
(25 pts) Public behavioral signals
Ghost Probability = 100 - total score.

INPUT:
Title: ${title}
Company: ${company}
Platform: ${platform}
Posted: ${posted}
Description: ${description}

Return strict JSON:
{
  "ghostProbability": number,
  "verdict": "Apply" | "Proceed Cautiously" | "Skip",
  "reasoning": "string"
}
    `;

    const result = await client.responses.create({
      model: "gpt-5.1",
      input: prompt,
      max_output_tokens: 800
    });

    const text = result.output_text;
    res.json(JSON.parse(text));
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

app.listen(process.env.PORT, () =>
  console.log("Ghost Detector Server running on port " + process.env.PORT)
);
