'use client';

import { useState } from 'react';
import { Users, Building2, Share2, Lock, Check, Mail } from 'lucide-react';

export default function TeamFeaturesPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Users className="w-10 h-10 text-primary-600" />
      </div>

      <span className="inline-block bg-amber-100 text-amber-700 text-sm font-medium px-3 py-1 rounded-full mb-4">
        Coming Soon
      </span>

      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Team & Organisation Features
      </h1>

      <p className="text-lg text-gray-600 mb-8">
        Share prompts across your team and organisation. Collaborate on custom prompts
        and maintain consistency in your AI usage.
      </p>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="card text-left">
          <Building2 className="w-8 h-8 text-primary-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Organisation Workspaces</h3>
          <p className="text-sm text-gray-600">
            Create dedicated workspaces for your company with centralised prompt management.
          </p>
        </div>

        <div className="card text-left">
          <Share2 className="w-8 h-8 text-primary-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Shared Libraries</h3>
          <p className="text-sm text-gray-600">
            Share curated prompt collections with your team for consistent AI interactions.
          </p>
        </div>

        <div className="card text-left">
          <Users className="w-8 h-8 text-primary-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Team Collaboration</h3>
          <p className="text-sm text-gray-600">
            Work together to create, edit, and refine prompts with your colleagues.
          </p>
        </div>

        <div className="card text-left">
          <Lock className="w-8 h-8 text-primary-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Access Controls</h3>
          <p className="text-sm text-gray-600">
            Manage permissions and control who can view, edit, or share prompts.
          </p>
        </div>
      </div>

      {submitted ? (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center justify-center gap-2 text-green-700">
            <Check className="w-6 h-6" />
            <span className="font-medium">
              Thanks! We will notify you when Team features launch.
            </span>
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 className="font-medium text-gray-900 mb-3">
            Interested in team features?
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Leave your email and we will let you know when team and organisation
            features become available.
          </p>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@company.co.nz"
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
