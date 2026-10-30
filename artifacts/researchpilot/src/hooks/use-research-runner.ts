import {
  getGetResearchQueryKey,
  getResearch,
  useRunResearch,
  type ResearchRun,
} from '@workspace/api-client-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { saveResearchHistory } from '@/lib/research-history';

const RESEARCH_TIMEOUT_MS = 150_000;

export function useResearchRunner(researchId?: string) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const activeId = researchId?.trim() ?? '';

  const query = useQuery({
    queryKey: getGetResearchQueryKey(activeId),
    queryFn: () => getResearch(activeId),
    enabled: activeId.length >= 8,
    retry: false,
  });

  const mutation = useRunResearch({
    request: {
      signal: AbortSignal.timeout(RESEARCH_TIMEOUT_MS),
    },
    mutation: {
      onSuccess(run: ResearchRun) {
        queryClient.setQueryData(getGetResearchQueryKey(run.researchId), run);
        saveResearchHistory({
          researchId: run.researchId,
          question: run.question,
          status: run.status,
          savedAt: new Date().toISOString(),
        });
        setLocation(`/research/${run.researchId}`);
      },
    },
  });

  const start = (question: string) => {
    if (mutation.isPending) {
      return;
    }
    mutation.mutate({ data: { question } });
  };

  return {
    start,
    isRunning: mutation.isPending,
    mutationError: mutation.error,
    run: query.data,
    queryError: query.error,
    isLoadingRun: Boolean(activeId) && query.isLoading,
  };
}
