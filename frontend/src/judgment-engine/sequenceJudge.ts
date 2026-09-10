import type { ConfirmedMora, KeystrokeResult, Mora, MissRecord, MoraSequence } from './types'
import { classifyCharType } from './types'
import { getBaseReceptionPatterns, narrowNextMoraCandidates } from './specialMora'
import { narrowCandidates, hasExactMatch } from './moraJudge'

/**
 * 候補集合の中から画面ヒントに使う1件を選ぶ(`romaji-automaton.md` 6.1末尾、最短優先。
 * 同じ文字数なら辞書順で先頭)。入力済み文字列の長さ分を除いた残りを返す。
 */
function pickHint(candidates: string[], inputSoFar: string): string | null {
  if (candidates.length === 0) {
    return null
  }
  const shortest = candidates.reduce((a, b) => {
    if (a.length !== b.length) return a.length < b.length ? a : b
    return a < b ? a : b
  })
  return shortest.slice(inputSoFar.length)
}

/** ミス記録の期待キー(`romaji-automaton.md` 6.1、db-access.md 3章: カンマ区切り・アルファベット順)。 */
function formatExpectedKey(candidates: string[], inputSoFar: string): string {
  const position = inputSoFar.length
  const chars = new Set(candidates.map((pattern) => pattern[position]))
  return Array.from(chars).sort().join(',')
}

/**
 * `romaji-automaton.md` 6.0(拍列全体のループ)・6.1(1拍を確定させるループ)を実装するエントリポイント。
 * `moraJudge.ts`/`specialMora.ts`の無状態ヘルパーを呼び出しながら、キー入力イベントのたびに
 * 状態を1キーずつ進める(`class-design.md` 2.2)。
 */
export function createSequenceJudge() {
  // セッション全体を通して持ち回る状態(お題文をまたいでもリセットしない)
  let lastConfirmedMora: ConfirmedMora | null = null
  let cumulativeMoraIndex = 0
  let missAt: string | null = null

  // お題文の境界でリセットしてよい状態
  let sequence: MoraSequence = []
  let indexInSequence = 0
  let confirmedTextForSentence = ''

  // 1拍の判定中だけ使う状態
  let inputSoFar = ''
  let candidates: string[] = []
  let pendingConfirmed: string | null = null

  function currentMora(): Mora | null {
    return indexInSequence < sequence.length ? sequence[indexInSequence] : null
  }

  function nextMoraOf(index: number): Mora | null {
    return index + 1 < sequence.length ? sequence[index + 1] : null
  }

  /** 現在の拍の判定状態を初期化する。`narrowed`があれば事前絞り込み候補として使う(5.2)。 */
  function initMoraState(narrowed: string[] | null): void {
    inputSoFar = ''
    pendingConfirmed = null
    const mora = currentMora()
    if (!mora) {
      candidates = []
      return
    }
    candidates = narrowed ?? getBaseReceptionPatterns(mora, nextMoraOf(indexInSequence))
  }

  /**
   * 新しいお題文の判定を開始する。1つのお題文につき1回呼ぶ(`romaji-automaton.md` 6.0)。
   * `kanaList`は`api-spec.yaml` `Sentence.moraList`(拍ごとに区切られたかな文字列の配列、charTypeなし)を
   * そのまま渡す。文字種への分類はここで行う(2026-09-06、CL-018対応)。
   *
   * 戻り値は最初の拍の初期状態を表す`KeystrokeResult`(2026-09-10、CL-022対応)。
   * 1打鍵もしていない時点でも`TypingView`が「次に打つべき文字」を表示できるようにするためのもので、
   * 実際のキー入力の結果ではないため`sessionStore.recordKeystroke`には渡さない。
   */
  function startSentence(kanaList: string[]): KeystrokeResult {
    sequence = kanaList.map((kana): Mora => ({ kana, charType: classifyCharType(kana) }))
    indexInSequence = 0
    confirmedTextForSentence = ''
    initMoraState(null)
    return buildResult(null, null)
  }

  /** 現在の拍を`acceptedPattern`で確定させ、次の拍の状態を初期化する(`この拍を確定する`)。 */
  function confirmCurrentMora(acceptedPattern: string): ConfirmedMora {
    const mora = currentMora() as Mora
    const confirmed: ConfirmedMora = {
      kana: mora.kana,
      charType: mora.charType,
      acceptedPattern,
      moraIndex: cumulativeMoraIndex,
    }
    lastConfirmedMora = confirmed
    confirmedTextForSentence += acceptedPattern

    let narrowedForNext: string[] | null = null
    if (mora.charType === '促音っ') {
      const nextMora = nextMoraOf(indexInSequence)
      const nextCandidates = nextMora ? getBaseReceptionPatterns(nextMora, null) : []
      narrowedForNext = narrowNextMoraCandidates(nextCandidates, acceptedPattern)
    }

    cumulativeMoraIndex += 1
    indexInSequence += 1
    initMoraState(narrowedForNext)
    return confirmed
  }

  function buildResult(confirmedMora: ConfirmedMora | null, miss: MissRecord | null): KeystrokeResult {
    const mora = currentMora()
    return {
      confirmedText: confirmedTextForSentence,
      pendingInput: inputSoFar,
      nextHint: mora ? pickHint(candidates, inputSoFar) : null,
      missAt,
      currentKana: mora ? mora.kana : (lastConfirmedMora?.kana ?? ''),
      moraIndex: cumulativeMoraIndex,
      confirmedMora,
      miss,
    }
  }

  /** キー入力を1つ処理する(`romaji-automaton.md` 6.1)。呼び出しごとに1キーだけ渡す。 */
  function handleKeystroke(key: string): KeystrokeResult {
    let pushedBackConfirm: ConfirmedMora | null = null
    let attemptKey = key

    while (true) {
      const mora = currentMora()
      if (!mora) {
        throw new Error('拍列の判定が既に終了しています')
      }

      const attempted = inputSoFar + attemptKey
      const narrowed = narrowCandidates(candidates, attempted)

      if (narrowed.length === 0) {
        if (pendingConfirmed !== null) {
          // 保留していた短い方を確定し、今回のキーは次の拍の1手目として押し戻す
          pushedBackConfirm = confirmCurrentMora(pendingConfirmed)
          missAt = null
          continue
        }
        // ミス: 正しいキーが入力されるまで先に進めない
        missAt = mora.kana
        const miss: MissRecord = {
          kana: mora.kana,
          expectedKey: formatExpectedKey(candidates, inputSoFar),
          actualKey: attemptKey,
          prevKana: lastConfirmedMora?.kana ?? null,
          charType: mora.charType,
        }
        return buildResult(pushedBackConfirm, miss)
      }

      missAt = null
      inputSoFar = attempted
      candidates = narrowed

      if (!hasExactMatch(candidates, inputSoFar)) {
        return buildResult(pushedBackConfirm, null)
      }

      const nextMora = nextMoraOf(indexInSequence)
      if (candidates.length === 1 || !nextMora) {
        const confirmed = confirmCurrentMora(inputSoFar)
        // pushedBackConfirmもconfirmedも非nullな場合(押し戻しと次拍の即時確定が1キーで両方起きた)、
        // confirmedMoraは1件しか保持できないため片方の確定通知が失われる。
        // romaji-automaton.md 6.1末尾「既知の制限」に記録済み、対応不要と合意済み(2026-09-07)。
        return buildResult(pushedBackConfirm ?? confirmed, null)
      }

      // 完全一致はしたが、まだ長い候補が残っている(例: "n"に対する"nn") → 確定を保留
      pendingConfirmed = inputSoFar
      return buildResult(pushedBackConfirm, null)
    }
  }

  /**
   * お題文の判定が最後まで終わっているか(`indexInSequence`が唯一の正、CL-024)。
   * `KeystrokeResult.confirmedMora`の発生回数では判定しない(6.1「既知の制限」により
   * 1キーで2拍同時確定した場合に通知が1件失われ、カウンタ方式だと完了を検知し損ねるため)。
   */
  function isSentenceComplete(): boolean {
    return indexInSequence >= sequence.length
  }

  return { startSentence, handleKeystroke, isSentenceComplete }
}

export type SequenceJudge = ReturnType<typeof createSequenceJudge>
