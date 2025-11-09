/**
 * Onboarding questions with guided options + freeform input
 */

export interface QuestionOption {
  value: string;
  label: string;
  examples?: string[];
}

export interface OnboardingQuestion {
  id: string;
  question: string;
  subtitle?: string;
  type: 'multi-select' | 'single-select' | 'text-with-suggestions';
  options: QuestionOption[];
  allowCustom: boolean;
  minSelections?: number;
  maxSelections?: number;
}

/**
 * Question 1: Texture & Production Quality
 */
export const QUESTION_1: OnboardingQuestion = {
  id: 'texture',
  question: 'What textures or production qualities draw you in?',
  subtitle: 'Select all that resonate, or describe your own',
  type: 'multi-select',
  allowCustom: true,
  minSelections: 1,
  maxSelections: 5,
  options: [
    {
      value: 'warm-analog',
      label: 'Warm & Analog',
      examples: ['tape hiss', 'dusty', 'vinyl warmth'],
    },
    {
      value: 'grainy-textured',
      label: 'Grainy & Textured',
      examples: ['rough', 'unpolished', 'lo-fi'],
    },
    {
      value: 'clean-crisp',
      label: 'Clean & Crisp',
      examples: ['hi-fi', 'polished', 'precise'],
    },
    {
      value: 'spacious-reverb',
      label: 'Spacious & Reverberant',
      examples: ['cathedral space', 'echo', 'ambient'],
    },
    {
      value: 'intimate-close',
      label: 'Intimate & Close',
      examples: ['whispered', 'bedroom', 'dry'],
    },
    {
      value: 'saturated-dense',
      label: 'Saturated & Dense',
      examples: ['layered', 'thick', 'lush'],
    },
    {
      value: 'sparse-minimal',
      label: 'Sparse & Minimal',
      examples: ['quiet', 'space between notes', 'restrained'],
    },
    {
      value: 'handmade-organic',
      label: 'Handmade & Organic',
      examples: ['human imperfection', 'live feel', 'breathing'],
    },
  ],
};

/**
 * Question 2: Emotional Posture & Atmosphere
 */
export const QUESTION_2: OnboardingQuestion = {
  id: 'atmosphere',
  question: 'What kind of emotional space do these songs create?',
  subtitle: 'Pick the moods that fit best',
  type: 'multi-select',
  allowCustom: true,
  minSelections: 1,
  maxSelections: 4,
  options: [
    {
      value: 'melancholic-contemplative',
      label: 'Melancholic & Contemplative',
      examples: ['sad but beautiful', 'reflective', 'wistful'],
    },
    {
      value: 'warm-nostalgic',
      label: 'Warm & Nostalgic',
      examples: ['golden hour', 'late summer', 'gentle memory'],
    },
    {
      value: 'dark-mysterious',
      label: 'Dark & Mysterious',
      examples: ['nocturnal', 'shadowy', 'haunting'],
    },
    {
      value: 'spiritual-transcendent',
      label: 'Spiritual & Transcendent',
      examples: ['sacred', 'meditative', 'otherworldly'],
    },
    {
      value: 'energetic-uplifting',
      label: 'Energetic & Uplifting',
      examples: ['euphoric', 'driving', 'hopeful'],
    },
    {
      value: 'calm-serene',
      label: 'Calm & Serene',
      examples: ['peaceful', 'still', 'clear morning'],
    },
    {
      value: 'tense-anxious',
      label: 'Tense & Anxious',
      examples: ['uneasy', 'restless', 'building pressure'],
    },
    {
      value: 'dreamy-hazy',
      label: 'Dreamy & Hazy',
      examples: ['shoegaze blur', 'hypnotic', 'half-asleep'],
    },
  ],
};

/**
 * Question 3: Tempo & Movement
 */
export const QUESTION_3: OnboardingQuestion = {
  id: 'tempo',
  question: 'How should the music move?',
  subtitle: 'Choose the pace and rhythm that feels right',
  type: 'multi-select',
  allowCustom: true,
  minSelections: 1,
  maxSelections: 3,
  options: [
    {
      value: 'slow-patient',
      label: 'Slow & Patient',
      examples: ['unhurried', 'meditative', 'breath-like'],
    },
    {
      value: 'mid-groove',
      label: 'Mid-Tempo Groove',
      examples: ['steady', 'head-nod', 'walking pace'],
    },
    {
      value: 'driving-energetic',
      label: 'Driving & Energetic',
      examples: ['propulsive', 'motorik', 'relentless'],
    },
    {
      value: 'gentle-sway',
      label: 'Gentle Sway',
      examples: ['lilting', 'rolling', 'rocking'],
    },
    {
      value: 'dynamic-shifting',
      label: 'Dynamic & Shifting',
      examples: ['builds and releases', 'crescendos', 'contrasts'],
    },
    {
      value: 'minimal-sparse',
      label: 'Minimal Rhythm',
      examples: ['almost still', 'ambient', 'timeless'],
    },
  ],
};

/**
 * Question 4: Instrumentation & Sonic Palette
 */
export const QUESTION_4: OnboardingQuestion = {
  id: 'instrumentation',
  question: 'What sonic palette appeals to you?',
  subtitle: 'Select the sounds you gravitate toward',
  type: 'multi-select',
  allowCustom: true,
  minSelections: 1,
  maxSelections: 4,
  options: [
    {
      value: 'acoustic-organic',
      label: 'Acoustic & Organic',
      examples: ['guitars', 'piano', 'strings', 'wood'],
    },
    {
      value: 'electronic-synthetic',
      label: 'Electronic & Synthetic',
      examples: ['synths', 'drum machines', 'digital'],
    },
    {
      value: 'hybrid-blended',
      label: 'Hybrid & Blended',
      examples: ['electronic + acoustic', 'processed organic'],
    },
    {
      value: 'vocal-forward',
      label: 'Vocal-Forward',
      examples: ['lyrics matter', 'voice as instrument', 'storytelling'],
    },
    {
      value: 'instrumental-textural',
      label: 'Instrumental & Textural',
      examples: ['no vocals needed', 'atmosphere over words'],
    },
    {
      value: 'guitar-centric',
      label: 'Guitar-Centric',
      examples: ['jangly', 'distorted', 'fingerpicked'],
    },
    {
      value: 'keyboard-synth',
      label: 'Keyboard & Synth-Heavy',
      examples: ['pads', 'arpeggios', 'warm analog keys'],
    },
    {
      value: 'rhythmic-percussion',
      label: 'Rhythmic & Percussion',
      examples: ['drums front and center', 'polyrhythmic', 'groove-first'],
    },
  ],
};

/**
 * Question 5: What to Avoid
 */
export const QUESTION_5: OnboardingQuestion = {
  id: 'avoid',
  question: 'What should we avoid?',
  subtitle: 'Help us understand what breaks the mood',
  type: 'multi-select',
  allowCustom: true,
  maxSelections: 5,
  options: [
    {
      value: 'too-polished',
      label: 'Too Polished',
      examples: ['over-produced', 'radio-ready', 'plastic'],
    },
    {
      value: 'too-aggressive',
      label: 'Too Aggressive',
      examples: ['harsh', 'abrasive', 'in-your-face'],
    },
    {
      value: 'too-poppy',
      label: 'Too Poppy',
      examples: ['bubblegum', 'saccharine', 'mainstream hooks'],
    },
    {
      value: 'too-dark',
      label: 'Too Dark',
      examples: ['doom', 'oppressive', 'bleak'],
    },
    {
      value: 'too-upbeat',
      label: 'Too Upbeat',
      examples: ['chipper', 'major key happy', 'bouncy'],
    },
    {
      value: 'too-slow',
      label: 'Too Slow',
      examples: ['droning', 'glacial', 'sleep-inducing'],
    },
    {
      value: 'too-busy',
      label: 'Too Busy',
      examples: ['cluttered', 'frenetic', 'overstimulating'],
    },
    {
      value: 'overly-electronic',
      label: 'Overly Electronic',
      examples: ['EDM', 'pure digital', 'no human warmth'],
    },
  ],
};

/**
 * All questions in order
 */
export const ONBOARDING_QUESTIONS = [
  QUESTION_1,
  QUESTION_2,
  QUESTION_3,
  QUESTION_4,
  QUESTION_5,
];

/**
 * System prompt for GPT-4 to extract emotional geometry
 */
export const WORLD_EXTRACTION_PROMPT = `You are an expert music curator analyzing a user's taste profile. 

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

/**
 * Convert user selections to conversation format for GPT
 */
export function formatAnswersForGPT(answers: Record<string, string[]>): string {
  const formatted: string[] = [];

  ONBOARDING_QUESTIONS.forEach((question) => {
    const userAnswers = answers[question.id] || [];
    if (userAnswers.length === 0) return;

    formatted.push(`${question.question}`);
    formatted.push(`→ ${userAnswers.join(', ')}`);
    formatted.push('');
  });

  return formatted.join('\n');
}
