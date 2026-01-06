'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import type { PersonalWorkflow } from '@/types';
import PersonalWorkflowBuilder from '@/components/PersonalWorkflowBuilder';

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const workflowId = params.workflowId as string;

  const [workflow, setWorkflow] = useState<PersonalWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isPremium = user?.tier === 'professional' || user?.tier === 'enterprise';

  const loadData = useCallback(async () => {
    if (!isPremium) {
      router.push('/dashboard/workflows');
      return;
    }

    try {
      const data = await api.getPersonalWorkflow(workflowId);
      setWorkflow(data.workflow);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflow');
    } finally {
      setLoading(false);
    }
  }, [workflowId, isPremium, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleWorkflowUpdated = () => {
    loadData();
  };

  const handleWorkflowDeleted = () => {
    router.push('/dashboard/workflows');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/dashboard/workflows')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workflows
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error || 'Workflow not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <button
        onClick={() => router.push('/dashboard/workflows')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Workflows
      </button>

      {/* Workflow Builder */}
      <PersonalWorkflowBuilder
        workflow={workflow}
        onUpdated={handleWorkflowUpdated}
        onDeleted={handleWorkflowDeleted}
      />
    </div>
  );
}
