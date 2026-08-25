/**
 * クライアントコンポーネントからのfetch結果は、必ずこの関数を通して読むこと。
 * res.json() を直接呼ぶと、サーバー側でエラーが起きてHTMLが返ってきた場合に
 * 「Unexpected token '<' ... is not valid JSON」という分かりにくいエラーになる。
 */
export async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`サーバーから予期しない応答がありました（status: ${res.status}）`);
  }
  if (!res.ok) {
    const message = (parsed as { error?: string })?.error ?? `リクエストに失敗しました（status: ${res.status}）`;
    throw new Error(message);
  }
  return parsed as T;
}

/** SWR用の共通fetcher。GET専用。 */
export async function jsonFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return readJson<T>(res);
}
