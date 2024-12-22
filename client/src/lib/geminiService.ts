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
  console.log('Starting image analysis with Gemini...');

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro-vision-latest' });

    // Clean base64 strings
    const cleanBase64 = (base64: string) => base64.replace(/^data:image\/\w+;base64,/, '');
    const originalClean = cleanBase64(originalImageBase64);
    const implementationClean = cleanBase64(implementationImageBase64);

    console.log('Prepared images for analysis');

    const prompt = `Compare these two UI design images and list their visual differences.
    For each difference found, provide:
    1. Type: either 'spacing', 'margin', 'color', or 'font'
    2. Description: explain the difference in Spanish
    3. Priority: 'high', 'medium', or 'low' based on visual impact

    Format the response as a JSON object with a 'differences' array.`;

    console.log('Sending request to Gemini API...');

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/png',
          data: originalClean
        }
      },
      {
        inlineData: {
          mimeType: 'image/png',
          data: implementationClean
        }
      },
      prompt
    ]);

    console.log('Received response from Gemini API');

    const response = await result.response;
    const text = response.text();

    console.log('Raw Gemini response:', text);

    try {
      const parsedResponse = JSON.parse(text);

      if (!parsedResponse.differences || !Array.isArray(parsedResponse.differences)) {
        console.error('Invalid response format:', parsedResponse);
        return {
          differences: [{
            type: 'spacing',
            description: 'Error: Formato de respuesta inválido del servicio de análisis.',
            priority: 'high'
          }]
        };
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
      console.error('Raw response text:', text);
      return {
        differences: [{
          type: 'spacing',
          description: 'Error al procesar la respuesta del análisis. Por favor, intenta de nuevo.',
          priority: 'high'
        }]
      };
    }
  } catch (error) {
    console.error('Error analyzing images with Gemini:', error);
    return {
      differences: [{
        type: 'spacing',
        description: 'Error de conexión con el servicio de análisis. Por favor, verifica tu conexión e intenta de nuevo.',
        priority: 'high'
      }]
    };
  }
}