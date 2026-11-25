/**
 * Splits one --obo sign-in assertion into two Graph tokens.
 *
 * The search app exchanges the assertion for Files.Read.All, and again for a
 * token whose audience is the read app. The read app then exchanges that for
 * Files.SelectedOperations.Selected. MSAL caches each result on the long-lived
 * confidential client that requested it.
 */

export interface TokenExchanger {
  exchangeToken(userAssertion: string, scopes?: string[]): Promise<string>;
}

export interface DualOboScopes {
  filesReadAll: string;
  readApi: string;
  selectedFiles: string;
}

export interface DualOboResult {
  accessToken: string;
  selectedFilesToken?: string;
  selectedFilesError?: string;
}

export function dualOboScopes(graphResource: string, readClientId: string): DualOboScopes {
  const resource = graphResource.replace(/\/$/, '');
  return {
    filesReadAll: `${resource}/Files.Read.All`,
    readApi: `api://${readClientId}/access_as_user`,
    selectedFiles: `${resource}/Files.SelectedOperations.Selected`,
  };
}

export async function exchangeDualObo(
  search: TokenExchanger,
  read: TokenExchanger | null,
  userAssertion: string,
  scopes: DualOboScopes
): Promise<DualOboResult> {
  // Without a read app, the search client keeps its own default scope (.default).
  const accessToken = read
    ? await search.exchangeToken(userAssertion, [scopes.filesReadAll])
    : await search.exchangeToken(userAssertion);
  if (!read) return { accessToken };

  try {
    const readAssertion = await search.exchangeToken(userAssertion, [scopes.readApi]);
    const selectedFilesToken = await read.exchangeToken(readAssertion, [scopes.selectedFiles]);
    return { accessToken, selectedFilesToken };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      accessToken,
      selectedFilesError: `The folder-scoped file token could not be acquired: ${message}`,
    };
  }
}
