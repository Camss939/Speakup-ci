import Groq from 'groq-sdk';

let _groq;
function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

const LESSON_SYSTEM = `You are an English coach generating a short lesson for a Francophone African learner.
Return ONLY valid JSON with this exact shape:
{
  "title": "short lesson title in French",
  "points": [
    { "expression": "...", "meaning": "...", "example": "..." },
    { "expression": "...", "meaning": "...", "example": "..." },
    { "expression": "...", "meaning": "...", "example": "..." }
  ],
  "tip": "one practical coaching tip in French, 1 sentence"
}
Rules:
- expressions must be real English phrases used in the topic context
- meaning in French, short (max 8 words)
- example is a complete English sentence using the expression
- tip is in French
- no markdown, no extra text, only the JSON object`;

export async function generateLesson(req, res) {
  const { moduleTitle, vocab = [], topicLabel, level = 'beginner' } = req.body;
  if (!moduleTitle) return res.status(400).json({ error: 'moduleTitle required' });

  const prompt = `Module: "${moduleTitle}" (topic: ${topicLabel || 'general'})
Level: ${level}
Available vocabulary: ${vocab.slice(0, 12).join(', ') || 'general English'}

Generate a mini-lesson with 3 key expressions the student will use in this conversation session.`;

  try {
    const response = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 400,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: LESSON_SYSTEM },
        { role: 'user', content: prompt },
      ],
    });
    const lesson = JSON.parse(response.choices[0].message.content);
    res.json(lesson);
  } catch (err) {
    console.error('[lesson] error:', err.message);
    res.status(500).json({ error: 'Lesson generation failed' });
  }
}
