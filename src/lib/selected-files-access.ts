import { getRequestTokens } from '../request-context.js';

/** Tools that must use the read app's token when dual-app OBO is configured. */
export const SELECTED_FILES_TOOLS = new Set([
  'list-folder-files',
  'get-drive-item',
  'get-download-url',
  'download-bytes',
]);

export interface SelectedFilesAccess {
  /** Set when this call must send the folder-scoped token. */
  token?: string;
  /** Set when the folder-scoped token is required and the exchange failed. */
  error?: string;
}

/**
 * Which token a tool may send.
 *
 * When the request has neither a selected token nor a selected-token error,
 * dual-app mode is off and the caller keeps its normal token. A configured
 * read app that failed to exchange must not fall back to the search token.
 */
export function selectedFilesAccess(toolName: string): SelectedFilesAccess {
  if (!SELECTED_FILES_TOOLS.has(toolName)) return {};
  const ctx = getRequestTokens();
  if (!ctx || (ctx.selectedFilesToken === undefined && ctx.selectedFilesError === undefined)) {
    return {};
  }
  if (ctx.selectedFilesToken) return { token: ctx.selectedFilesToken };
  return {
    error: ctx.selectedFilesError ?? 'The folder-scoped file token is not available.',
  };
}
