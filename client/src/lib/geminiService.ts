import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

interface AnalysisResult {
  differences: Array<{
    type: 'spacing' | 'margin' | 'color' | 'font';
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export async function analyzeImageDifferences(
  originalImageBase64: string,
  implementationImageBase64: string
): Promise<AnalysisResult> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

    const prompt = `Analyze these two UI design images and identify the visual differences between them. 
    Focus on:
    1. Spacing inconsistencies
    2. Color differences
    3. Font variations
    4. Margin/padding issues

    For each difference, specify:
    - The type (spacing, margin, color, or font)
    - A clear description of what needs to be fixed
    - Priority level (high, medium, low) based on visual impact

    Format your response as a structured JSON array of differences.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/png',
          data: originalImageBase64.split(',')[1]
        }
      },
      {
        inlineData: {
          mimeType: 'image/png',
          data: implementationImageBase64.split(',')[1]
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();

    // Parse the JSON response from Gemini
    const differences = JSON.parse(text);

    return {
      differences: differences.map((diff: any) => ({
        type: diff.type,
        description: diff.description,
        priority: diff.priority,
      }))
    };
  } catch (error) {
    console.error('Error analyzing images with Gemini:', error);
    throw error;
  }
}