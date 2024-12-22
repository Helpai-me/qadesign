import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const getOpenAIInstance = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_OPENAI_API_KEY is not set. Please provide your OpenAI API key.');
  }
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
  });
};

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
  console.log('Starting image analysis with OpenAI...');

  try {
    const openai = getOpenAIInstance();

    // Clean base64 strings
    const cleanBase64 = (base64: string) => base64.replace(/^data:image\/\w+;base64,/, '');
    const originalClean = cleanBase64(originalImageBase64);
    const implementationClean = cleanBase64(implementationImageBase64);

    console.log('Prepared images for analysis');

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision",  // Updated to use the current vision model
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Compare these two UI design images and list their visual differences.
              For each difference found, provide:
              1. Type: either 'spacing', 'margin', 'color', or 'font'
              2. Description: explain the difference in Spanish
              3. Priority: 'high', 'medium', or 'low' based on visual impact

              Format the response as a JSON object with a 'differences' array.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${originalClean}`
              }
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${implementationClean}`
              }
            }
          ]
        }
      ],
      max_tokens: 4096,
      response_format: { type: "json_object" }
    });

    console.log('Received response from OpenAI');

    if (!response.choices[0].message.content) {
      throw new Error('No content in OpenAI response');
    }

    const result = JSON.parse(response.choices[0].message.content);
    console.log('Parsed OpenAI response:', result);

    if (!result.differences || !Array.isArray(result.differences)) {
      console.error('Invalid response format:', result);
      return {
        differences: [{
          type: 'spacing',
          description: 'Error: Formato de respuesta inválido del servicio de análisis.',
          priority: 'high'
        }]
      };
    }

    return {
      differences: result.differences.map((diff: any) => ({
        type: diff.type || 'spacing',
        description: diff.description || 'Diferencia detectada',
        priority: diff.priority || 'medium',
      }))
    };
  } catch (error) {
    console.error('Error analyzing images with OpenAI:', error);

    if ((error as Error).message.includes('VITE_OPENAI_API_KEY is not set')) {
      return {
        differences: [{
          type: 'spacing',
          description: 'Error: Se requiere una API key válida de OpenAI para analizar las diferencias. Por favor, configura la variable de entorno VITE_OPENAI_API_KEY.',
          priority: 'high'
        }]
      };
    }

    return {
      differences: [{
        type: 'spacing',
        description: 'Error de conexión con el servicio de análisis. Por favor, verifica tu conexión e intenta de nuevo.',
        priority: 'high'
      }]
    };
  }
}