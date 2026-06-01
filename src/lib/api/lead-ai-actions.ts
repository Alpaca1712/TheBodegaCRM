export interface ApiErrorBody {
  error?: string;
  message?: string;
  code?: string;
}

async function parseErrorBody(response: Response): Promise<ApiErrorBody> {
  try {
    const body = await response.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

export async function postLeadAiAction<TResponse>(
  endpoint: string,
  leadId: string,
  extraBody: Record<string, unknown> = {}
): Promise<TResponse> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId, ...extraBody }),
  });

  if (!response.ok) {
    const errorBody = await parseErrorBody(response);
    throw new Error(errorBody.error || errorBody.message || `Failed (${response.status})`);
  }

  return response.json() as Promise<TResponse>;
}
