import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function generateText(prompt: string) {
  if (!genAI) {
    console.error('GEMINI_API_KEY is missing');
    throw new Error('AI機能の設定（APIキー）が不足しています。');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw new Error('AIとの通信に失敗しました。時間をおいて再度お試しください。');
  }
}

export async function generateDiaryTitle(content: string) {
  const prompt = `
以下の日記の内容を読んで、思わず読み返したくなるような短いタイトルを1つだけ生成してください。
タイトルのみを出力し、余計な説明や記号（「」など）は含めないでください。

内容：
${content}
`;

  return generateText(prompt);
}

export async function generateHakoDescription(name: string) {
  const prompt = `
「${name}」という名前の新しいクローズドコミュニティ（箱）を作ろうとしています。
このコミュニティの魅力を伝える、親しみやすく、かつ特別な空間であることを感じさせる紹介文を200文字程度で生成してください。
紹介文のみを出力し、余計な説明は含めないでください。
`;

  return generateText(prompt);
}
