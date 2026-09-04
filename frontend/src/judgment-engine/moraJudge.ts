/**
 * 1拍の受理判定に使う無状態のヘルパー関数群(`romaji-automaton.md` 6.1の部分手順のみ)。
 * キー入力のループ自体は回さない。状態保持・ループ制御は `sequenceJudge.ts` の責務。
 */

/** 候補集合を、試行後文字列(入力済み文字列+今回のキー)で始まるものだけに絞り込む。 */
export function narrowCandidates(candidates: string[], attemptedInput: string): string[] {
  return candidates.filter((pattern) => pattern.startsWith(attemptedInput))
}

/** 入力済み文字列が候補集合のいずれかと完全一致するか判定する。 */
export function hasExactMatch(candidates: string[], input: string): boolean {
  return candidates.includes(input)
}
