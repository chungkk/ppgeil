// API to generate quiz questions using OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { transcript, vocabulary = [], targetLang = 'vi' } = req.body;

    if (!transcript || !Array.isArray(transcript)) {
      return res.status(400).json({ message: 'Transcript is required' });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ message: 'OPENAI_API_KEY not configured' });
    }

    // Combine transcript into text
    const fullText = transcript.map(item => item.text).join(' ');
    
    // Get vocabulary words
    const vocabList = vocabulary.map(v => `${v.word} (${v.translation})`).join(', ');

    const languageConfig = {
      vi: {
        prompt: `Dựa trên đoạn văn tiếng Đức sau, hãy tạo 5 câu hỏi trắc nghiệm (tiếng Việt) để kiểm tra độ hiểu bài.

Đoạn văn:
"${fullText}"

${vocabList ? `Từ vựng quan trọng: ${vocabList}` : ''}

YÊU CẦU QUAN TRỌNG:
- KHÔNG hỏi về tác giả, nguồn gốc, ai viết bài
- KHÔNG hỏi những thông tin không có trong bài
- CHỈ hỏi về:
  + Nội dung chính của đoạn văn nói về điều gì
  + Ý nghĩa của các câu trong bài
  + Nghĩa của từ vựng quan trọng trong ngữ cảnh
  + Thông tin cụ thể được đề cập trong bài
  + Chủ đề, tình huống trong đoạn văn

- Mỗi câu có 4 đáp án A, B, C, D
- Chỉ có 1 đáp án đúng
- Câu hỏi bằng tiếng Việt, rõ ràng

Trả về JSON (CHỈ JSON):
{
  "questions": [
    {
      "question": "Câu hỏi?",
      "options": ["A. Đáp án 1", "B. Đáp án 2", "C. Đáp án 3", "D. Đáp án 4"],
      "correctIndex": 0,
      "explanation": "Giải thích ngắn"
    }
  ]
}`
      },
      en: {
        prompt: `Based on the following German text, create 5 multiple choice questions (in English) to test comprehension.

Text:
"${fullText}"

${vocabList ? `Important vocabulary: ${vocabList}` : ''}

IMPORTANT REQUIREMENTS:
- DO NOT ask about author, source, who wrote it
- DO NOT ask about information not in the text
- ONLY ask about:
  + Main content/topic of the text
  + Meaning of sentences in context
  + Meaning of important vocabulary words
  + Specific information mentioned in the text
  + Theme, situation described

- Each question has 4 options A, B, C, D
- Only 1 correct answer
- Questions in English, clear

Return JSON (ONLY JSON):
{
  "questions": [
    {
      "question": "Question?",
      "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
      "correctIndex": 0,
      "explanation": "Brief explanation"
    }
  ]
}`
      }
    };

    const config = languageConfig[targetLang] || languageConfig.vi;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert German language teacher creating reading comprehension quizzes. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: config.prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();

    // Parse JSON response
    let result;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse OpenAI response:', content);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to parse quiz questions' 
      });
    }

    return res.status(200).json({
      success: true,
      questions: result.questions || []
    });

  } catch (error) {
    console.error('Generate quiz error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to generate quiz',
      error: error.message 
    });
  }
}
