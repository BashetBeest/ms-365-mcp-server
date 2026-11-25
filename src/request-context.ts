import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  accessToken: string;
  /**
   * Read app's Graph token (Files.SelectedOperations.Selected).
   * Absent, together with selectedFilesError, when dual-app OBO is not configured.
   */
  selectedFilesToken?: string;
  /** Dual-app OBO is configured and the read-app exchange failed. File tools must not fall back. */
  selectedFilesError?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestTokens(): RequestContext | undefined {
  return requestContext.getStore();
}
