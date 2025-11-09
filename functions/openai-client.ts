/**
 * OpenAI API client wrapper
 */
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate text embeddings
 * Batches automatically, max 2048 inputs per call
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const embeddings: number[][] = [];

  // OpenAI allows max 2048 inputs per request
  const batchSize = 2048;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
      encoding_format: 'float',
    });

    embeddings.push(...response.data.map((d) => d.embedding));
  }

  return embeddings;
}

/**
 * Extract emotional geometry and world name from user answers
 */
export async function extractWorldDefinition(
  userAnswers: string,
  seedMetadata: {
    topGenres: string[];
    topArtists: string[];
    audioFeatureSummary: Record<string, number>;
  }
): Promise<{
  emotional_geometry: {
    darkness_warmth: number;
    intimate_expansive: number;
    acoustic_electronic: number;
  };
  keywords: string[];
  exclude_keywords: string[];
  world_name: string;
  description: string;
  intersections: Array<{
    name: string;
    description: string;
    bias_description: string;
  }>;
}> {
  const systemPrompt = `You are an expert music curator analyzing a user's taste profile. 

The user has selected music seeds and answered questions about their preferences. 
Your job is to extract the deep emotional geometry of their taste and generate a world name.

Based on their answers, generate:

1. **Emotional Geometry** (numeric values from -1 to 1):
   - darkness_warmth: -1 (dark/cold) to +1 (warm/bright)
   - intimate_expansive: -1 (close/intimate) to +1 (spacious/expansive)
   - acoustic_electronic: -1 (fully acoustic) to +1 (fully electronic)

2. **Keywords**: 5-10 descriptive words that capture the aesthetic (e.g., "dusty", "reverent", "handmade")

3. **Exclude Keywords**: 3-5 qualities to avoid (e.g., "polished", "aggressive", "sterile")

4. **World Name**: A 2-4 word poetic name that captures the paradox/duality of their taste
   - Think: "Velvet Dirt Cathedral", "Neon Dusk Chapel", "Amber Rust Garden"
   - Combine texture + atmosphere + space in an evocative way

5. **Description**: A 2-3 sentence prose description of their world in second person
   - Template: "Your center of gravity sits in [tone] with [space] space and [texture] texture. 
     The music leans [bias1], occasionally breaking toward [bias2] to keep discovery alive."

6. **Intersection Names**: Generate 3-5 playlist intersection names that sit at different points in this world
   - Each should feel like a different "room" in the same house
   - Examples for "Velvet Dirt Cathedral": 
     * "Ruined Cathedral" (darker/slower)
     * "Late Summer Drift" (warmer/patient)
     * "Clear Winter Interior" (sparse/minimal)
     * "Kinetic Glass" (rhythmic/electronic tilt)

Return ONLY valid JSON with this structure:
{
  "emotional_geometry": { "darkness_warmth": number, "intimate_expansive": number, "acoustic_electronic": number },
  "keywords": string[],
  "exclude_keywords": string[],
  "world_name": string,
  "description": string,
  "intersections": [
    { "name": string, "description": string, "bias_description": string }
  ]
}`;

  const userPrompt = `User's selected seeds:
- Top genres: ${seedMetadata.topGenres.join(', ')}
- Top artists: ${seedMetadata.topArtists.join(', ')}
- Audio features: valence ${seedMetadata.audioFeatureSummary.valence?.toFixed(2)}, energy ${seedMetadata.audioFeatureSummary.energy?.toFixed(2)}, acousticness ${seedMetadata.audioFeatureSummary.acousticness?.toFixed(2)}

User's questionnaire answers:
${userAnswers}

Generate their world definition:`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.8,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return JSON.parse(content);
}

/**
 * Generate cover art using DALL-E (optional, premium feature)
 */
export async function generateCoverArt(
  playlistName: string,
  worldKeywords: string[]
): Promise<string> {
  const prompt = `Abstract minimalist album artwork for a playlist called "${playlistName}". 
Style: ${worldKeywords.slice(0, 3).join(', ')}. 
Aesthetic: textured, grainy, subtle, sophisticated. 
Color palette: muted, earthy tones. 
No text, no faces, no literal imagery.`;

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    size: '1024x1024',
    quality: 'standard',
    n: 1,
  });

  if (!response.data || !response.data[0]) {
    throw new Error('Failed to generate image');
  }

  return response.data[0].url!;
}

export { openai };
