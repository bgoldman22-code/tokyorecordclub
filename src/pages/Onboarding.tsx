import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { ONBOARDING_QUESTIONS } from '../../functions/onboarding-questions';
import type { OnboardingAnswers } from '../types';

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    q1_texture: [],
    q1_custom: '',
    q2_atmosphere: [],
    q2_custom: '',
    q3_tempo: [],
    q3_custom: '',
    q4_instrumentation: [],
    q4_custom: '',
    q5_avoid: [],
    q5_custom: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const questions = ONBOARDING_QUESTIONS;
  const question = questions[currentQuestion];

  const toggleOption = (optionValue: string) => {
    const key = question.answerKey as keyof OnboardingAnswers;
    const current = answers[key] as string[];
    
    if (current.includes(optionValue)) {
      setAnswers({
        ...answers,
        [key]: current.filter((v: string) => v !== optionValue)
      });
    } else {
      setAnswers({
        ...answers,
        [key]: [...current, optionValue]
      });
    }
  };

  const handleCustomChange = (value: string) => {
    const customKey = `${question.answerKey}_custom` as keyof OnboardingAnswers;
    setAnswers({
      ...answers,
      [customKey]: value
    });
  };

  const canContinue = () => {
    const key = question.answerKey as keyof OnboardingAnswers;
    const customKey = `${question.answerKey}_custom` as keyof OnboardingAnswers;
    const selected = answers[key] as string[];
    const custom = answers[customKey] as string;
    
    return selected.length > 0 || custom.trim().length > 0;
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      // Get seed IDs from session storage
      const seedIdsStr = sessionStorage.getItem('seedTrackIds');
      if (!seedIdsStr) {
        throw new Error('No seed tracks found');
      }
      const seedTrackIds = JSON.parse(seedIdsStr);

      // Start world building
      const res = await fetch('/api/build-world', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedTrackIds,
          onboardingAnswers: answers
        })
      });

      if (!res.ok) {
        throw new Error('Failed to start world building');
      }

      const data = await res.json();
      
      // Store job ID and navigate to world preview/status page
      sessionStorage.setItem('worldJobId', data.jobId);
      navigate('/world');

    } catch (error) {
      console.error('Failed to submit:', error);
      alert('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="grain-overlay" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-neutral-400 mb-2">
              <span>Question {currentQuestion + 1} of {questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question card */}
          <Card className="bg-neutral-900 border-neutral-800 p-8 mb-6">
            <h2 className="text-2xl font-bold mb-6">{question.question}</h2>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {question.options.map((option) => {
                const key = question.id as keyof OnboardingAnswers;
                const selected = (answers[key] as string[]).includes(option.value);

                return (
                  <button
                    key={option.value}
                    onClick={() => toggleOption(option.value)}
                    className={`w-full p-4 rounded-lg border text-left transition ${
                      selected
                        ? 'bg-emerald-900/30 border-emerald-600'
                        : 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        selected
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'border-neutral-600'
                      }`}>
                        {selected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium mb-1">{option.label}</div>
                        {option.examples && (
                          <div className="text-sm text-neutral-400">
                            Examples: {option.examples}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom input */}
            <div className="pt-4 border-t border-neutral-800">
              <Label htmlFor="custom-input" className="text-neutral-400 mb-2 block">
                Or describe in your own words:
              </Label>
              <Input
                id="custom-input"
                value={answers[`${question.id}_custom` as keyof OnboardingAnswers] as string}
                onChange={(e) => handleCustomChange(e.target.value)}
                placeholder="Type your own answer..."
                className="bg-neutral-800 border-neutral-700"
              />
            </div>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              onClick={handleBack}
              variant="outline"
              disabled={currentQuestion === 0}
            >
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={!canContinue() || isLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isLoading
                ? 'Building your world...'
                : currentQuestion === questions.length - 1
                ? 'Build My World'
                : 'Next'}
            </Button>
          </div>

          {/* Tip */}
          <div className="mt-8 text-center text-sm text-neutral-500">
            💡 Tip: Select multiple options or write your own to help us understand your taste better
          </div>
        </div>
      </div>
    </div>
  );
}
