import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI('AIzaSyDRkpo9omKngxr-4dpMNjvO6HfQYivA8XM');

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
    1. Spacing inconsistencies (padding, margins, gaps)
    2. Color differences (backgrounds, text, borders)
    3. Font variations (size, family, weight)
    4. Layout issues (alignment, positioning)

    For each difference, specify:
    - The type (spacing, margin, color, or font)
    - A clear description in Spanish of what needs to be fixed
    - Priority level (high, medium, low) based on visual impact

    Respond in this exact JSON format:
    {
      "differences": [
        {
          "type": "spacing|margin|color|font",
          "description": "descripción en español",
          "priority": "high|medium|low"
        }
      ]
    }`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/png',
          data: originalImageBase64.replace(/^data:image\/\w+;base64,/, '')
        }
      },
      {
        inlineData: {
          mimeType: 'image/png',
          data: implementationImageBase64.replace(/^data:image\/\w+;base64,/, '')
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();

    try {
      // Parse the JSON response from Gemini
      const parsedResponse = JSON.parse(text);

      // Validate the response structure
      if (!parsedResponse.differences || !Array.isArray(parsedResponse.differences)) {
        throw new Error('Invalid response format from Gemini API');
      }

      return {
        differences: parsedResponse.differences.map((diff: any) => ({
          type: diff.type || 'spacing',
          description: diff.description || 'Diferencia detectada',
          priority: diff.priority || 'medium',
        }))
      };
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      return {
        differences: [{
          type: 'spacing',
          description: 'Error al analizar las diferencias. Por favor, intenta de nuevo.',
          priority: 'high'
        }]
      };
    }
  } catch (error) {
    console.error('Error analyzing images with Gemini:', error);
    return {
      differences: [{
        type: 'spacing',
        description: 'Error al conectar con el servicio de análisis. Por favor, verifica tu conexión e intenta de nuevo.',
        priority: 'high'
      }]
    };
  }
}