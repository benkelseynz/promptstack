'use client';

import { useState } from 'react';
import { Wand2, Sparkles, Check, Mail } from 'lucide-react';

export default function PromptBuilderPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Wand2 className="w-10 h-10 text-primary-600" />
      </div>

      <span className="inline-block bg-amber-100 text-amber-700 text-sm font-medium px-3 py-1 rounded-full mb-4">
        Coming Soon
      </span>

      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        AI-Powered Prompt Builder
      </h1>

      <p className="text-lg text-gray-600 mb-8">
        Create custom, high-quality prompts with the help of AI. Simply describe what you need,
        and our intelligent builder will craft the perfect prompt for you.
      </p>

      <div className="card text-left mb-8">
        <h2 className="font-semibold text-gray-900 mb-4">What to expect:</h2>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <span className="text-gray-600">
              AI-assisted prompt generation based on your requirements
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <span className="text-gray-600">
              Smart suggestions for placeholders and variables
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <span className="text-gray-600">
              Industry and role-specific optimisation
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <span className="text-gray-600">
              One-click save to your custom prompt library
            </span>
          </li>
        </ul>
      </div>

      {submitted ? (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center justify-center gap-2 text-green-700">
            <Check className="w-6 h-6" />
            <span className="font-medium">
              Thanks! We will notify you when Prompt Builder launches.
            </span>
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 className="font-medium text-gray-900 mb-3">
            Get notified when it launches
          </h3>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.co.nz"
              className="input-field flex-1"
              required
            />
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Notify Me
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
