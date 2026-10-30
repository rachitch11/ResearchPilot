interface ApiFailure {
  status: number;
  message: string;
  data: unknown;
}

function isApiFailure(error: unknown): error is ApiFailure {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'status' in error &&
      typeof (error as { status?: unknown }).status === 'number' &&
      'message' in error &&
      typeof (error as { message?: unknown }).message === 'string',
  );
}

function payloadMessage(data: unknown): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const value = (data as { error?: unknown }).error;
    return typeof value === 'string' ? value : '';
  }
  return '';
}

export function describeApiError(error: unknown): { title: string; message: string; status?: number } {
  if (isApiFailure(error)) {
    const message = payloadMessage(error.data) || error.message;

    if (error.status === 400) {
      return { title: 'The question could not be used', message, status: 400 };
    }
    if (error.status === 404) {
      return {
        title: 'Research not found',
        message: payloadMessage(error.data) || 'This run is no longer available. Research results are kept in memory and are lost when the API restarts.',
        status: 404,
      };
    }
    if (error.status === 429) {
      return {
        title: 'Too many requests',
        message: payloadMessage(error.data) || 'Please wait before starting another investigation.',
        status: 429,
      };
    }
    if (error.status === 503) {
      return {
        title: 'A required provider is not configured',
        message: payloadMessage(error.data) || 'Gemini or search credentials are missing on the server.',
        status: 503,
      };
    }
    if (error.status >= 500) {
      return {
        title: 'Research could not be completed',
        message: payloadMessage(error.data) || 'The research service reported an error. You can try again.',
        status: error.status,
      };
    }
    return { title: 'Request failed', message, status: error.status };
  }

  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return {
      title: 'The investigation timed out',
      message: 'The research run exceeded the allowed time. Try a narrower question.',
    };
  }

  if (error instanceof Error && /abort|timeout/i.test(error.message)) {
    return {
      title: 'The investigation timed out',
      message: 'The research run exceeded the allowed time. Try a narrower question.',
    };
  }

  return {
    title: 'Something went wrong',
    message: error instanceof Error ? error.message : 'An unexpected error occurred.',
  };
}
