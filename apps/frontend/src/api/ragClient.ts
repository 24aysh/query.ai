const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export interface RetrievedChunk {
  text: string;
  score: number;
}

export interface UploadQueryResponse {
  answer: string;
  context: RetrievedChunk[];
  meta: {
    totalChunks: number;
    model: string;
    collection: string;
  };
}
export interface CreateCollectionResponse {
  message: string;
  config?: { vectorSize: number; distance: string };
  error?: string;
  detail?: string;
}

export async function uploadAndQuery(
  file: File,
  query: string
): Promise<UploadQueryResponse> {
  const formData = new FormData();
  formData.append("pdf", file);
  formData.append("query", query);

  const response = await fetch(`${API_BASE}/uploads`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      (errorBody as { error?: string }).error ??
      `Server error: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<UploadQueryResponse>;
}

export async function createCollection(): Promise<CreateCollectionResponse> {
  const response = await fetch(`${API_BASE}/create-collection`);
  return response.json() as Promise<CreateCollectionResponse>;
}
