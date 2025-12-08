// API to explain Nomen-Verb-Verbindung phrases using OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { phrase, meaning, example, targetLang = 'vi' } = req.body;

    if (!phrase) {
      return res.status(400).json({ message: 'Phrase is required' });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ message: 'OPENAI_API_KEY not configured' });
    }

    const languageConfig = {
      vi: {
        name: 'Tiếng Việt',
        prompt: `Bạn là một giáo viên tiếng Đức giàu kinh nghiệm. Hãy giải thích chi tiết cụm Nomen-Verb-Verbindung sau cho người học tiếng Việt:

Cụm từ: "${phrase}"
Nghĩa tương đương: ${meaning}
Ví dụ: "${example}"

Hãy giải thích theo format sau (viết ngắn gọn, dễ hiểu):

**Nghĩa:** [dịch nghĩa chính xác sang tiếng Việt]

**Cách dùng:** [giải thích ngắn gọn khi nào dùng cụm này, ngữ cảnh phù hợp]

**Cấu trúc:** [giải thích cấu trúc ngữ pháp, ví dụ: "jd/etw + Akk"]

**Ví dụ thêm:**
1. [1 ví dụ tiếng Đức] → [dịch tiếng Việt]
2. [1 ví dụ tiếng Đức] → [dịch tiếng Việt]

**Mẹo nhớ:** [1 cách nhớ dễ dàng]`
      },
      en: {
        name: 'English',
        prompt: `You are an experienced German teacher. Explain the following Nomen-Verb-Verbindung in detail for English speakers:

Phrase: "${phrase}"
Equivalent meaning: ${meaning}
Example: "${example}"

Explain using this format (keep it concise and clear):

**Meaning:** [accurate English translation]

**Usage:** [briefly explain when to use this phrase, appropriate context]

**Structure:** [explain grammatical structure, e.g., "jd/etw + Akk"]

**More examples:**
1. [German example] → [English translation]
2. [German example] → [English translation]

**Memory tip:** [one easy way to remember]`
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
            content: `You are an expert German language teacher specializing in Nomen-Verb-Verbindungen. Provide clear, practical explanations in ${config.name}.`,
          },
          {
            role: 'user',
            content: config.prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    const explanation = data.choices[0]?.message?.content?.trim();

    return res.status(200).json({
      success: true,
      phrase,
      explanation,
      targetLang,
    });

  } catch (error) {
    console.error('Explain phrase error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to explain phrase',
      error: error.message 
    });
  }
}
