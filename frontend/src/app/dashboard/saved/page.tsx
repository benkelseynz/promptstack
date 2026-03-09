'use client';

import Link from 'next/link';
import { Library, HelpCircle, ArrowRight, Bookmark, Zap } from 'lucide-react';

export default function SavedPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Saved</h1>
        <p className="text-gray-600">
          Manage your saved and custom prompts, questions, and skills in one place
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
        {/* Prompts Card */}
        <Link
          href="/dashboard/saved/prompts"
          className="card hover:shadow-lg transition-shadow group"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-100 rounded-xl group-hover:bg-primary-200 transition-colors">
              <Library className="w-8 h-8 text-primary-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                My Saved Prompts
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                View prompts you've saved from the library and manage your custom prompts
              </p>
              <div className="flex items-center text-primary-600 font-medium text-sm">
                View Prompts
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </Link>

        {/* Questions Card */}
        <Link
          href="/dashboard/saved/questions"
          className="card hover:shadow-lg transition-shadow group"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
              <HelpCircle className="w-8 h-8 text-purple-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                My Saved Questions
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                View questions you've saved from the library and manage your custom questions
              </p>
              <div className="flex items-center text-purple-600 font-medium text-sm">
                View Questions
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </Link>

        {/* Skills Card */}
        <Link
          href="/dashboard/saved/skills"
          className="card hover:shadow-lg transition-shadow group"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-colors">
              <Zap className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors">
                My Skills
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Create and manage AI skills — structured instructions you can attach to any AI agent
              </p>
              <div className="flex items-center text-emerald-600 font-medium text-sm">
                View Skills
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Quick stats or tips section */}
      <div className="mt-8 p-6 bg-gray-50 rounded-xl max-w-6xl">
        <div className="flex items-start gap-3">
          <Bookmark className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Organise Your Content</h3>
            <p className="text-sm text-gray-600">
              Save prompts, questions, and skills from the library for quick access, or create your own custom versions
              tailored to your specific needs. Skills can be downloaded as Markdown files and attached to any AI agent or tool.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
