// API to check German sentence using OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sentence, vocabulary, targetLang = 'vi' } = req.body;

    if (!sentence) {
      return res.status(400).json({ message: 'Sentence is required' });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ message: 'OPENAI_API_KEY not configured' });
    }

    const languageConfig = {
      vi: {
        prompt: `Bạn là giáo viên tiếng Đức. Hãy kiểm tra câu tiếng Đức sau của học sinh:

Từ vựng cần dùng: "${vocabulary}"
Câu của học sinh: "${sentence}"

Hãy đánh giá và trả lời theo format JSON sau (CHỈ trả về JSON, không có text khác):
{
  "isCorrect": true/false (câu đúng ngữ pháp và tự nhiên),
  "hasVocabulary": true/false (có chứa từ vựng yêu cầu),
  "grammarScore": 1-10 (điểm ngữ pháp),
  "errors": ["lỗi cụ thể 1", "lỗi cụ thể 2"] (mảng rỗng nếu không có lỗi),
  "corrections": "câu đã sửa hoàn chỉnh" (CHỈ điền nếu có lỗi cần sửa, nếu câu đúng thì để trống ""),
  "suggestion": "một câu ví dụ hay và tự nhiên hơn sử dụng từ vựng này",
  "explanation": "giải thích ngắn gọn về ngữ pháp hoặc cách dùng từ"
}

Lưu ý: 
- Nếu câu đã đúng, corrections phải để trống ""
- suggestion luôn gợi ý một câu khác hay hơn, tự nhiên hơn`
      },
      en: {
        prompt: `You are a German teacher. Check the following German sentence from a student:

Vocabulary to use: "${vocabulary}"
Student's sentence: "${sentence}"

Evaluate and respond in this JSON format (ONLY return JSON, no other text):
{
  "isCorrect": true/false (grammatically correct and natural),
  "hasVocabulary": true/false (contains required vocabulary),
  "grammarScore": 1-10,
  "errors": ["specific error 1", "specific error 2"] (empty array if no errors),
  "corrections": "fully corrected sentence" (ONLY fill if there are errors to fix, leave empty "" if correct),
  "suggestion": "a better, more natural example sentence using this vocabulary",
  "explanation": "brief explanation about grammar or word usage"
}

Note:
- If sentence is correct, corrections must be empty ""
- suggestion should always provide a different, better sentence`
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
            content: 'You are an expert German language teacher. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: config.prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
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
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse OpenAI response:', content);
      result = {
        isCorrect: false,
        hasVocabulary: true,
        grammarScore: 5,
        errors: [],
        corrections: sentence,
        suggestion: '',
        explanation: content
      };
    }

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Check sentence error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to check sentence',
      error: error.message 
    });
  }
}
