export type CharType = '清音' | '拗音' | '撥音ん' | '促音っ' | '長音'

export interface Mora {
  kana: string
  charType: CharType
}

export type MoraSequence = Mora[]

/**
 * かな文字列1つ(既に1拍に区切られたもの)を文字種に分類する(`romaji-automaton.md` 2章の5分類)。
 * `api-spec.yaml` `Sentence.moraList`はかな文字列の配列(charTypeを持たない)なので、
 * `sequenceJudge.startSentence`がこの関数で`MoraSequence`に変換してから判定を始める。
 */
export function classifyCharType(kana: string): CharType {
  if (kana === 'ん') return '撥音ん'
  if (kana === 'っ') return '促音っ'
  if (kana === 'ー') return '長音'
  if (kana.length === 2) return '拗音'
  return '清音'
}

export interface ConfirmedMora {
  kana: string
  charType: CharType
  acceptedPattern: string
  moraIndex: number
}

export interface MissRecord {
  kana: string
  expectedKey: string
  actualKey: string
  prevKana: string | null
  charType: CharType
}

export interface KeystrokeResult {
  confirmedText: string
  pendingInput: string
  nextHint: string | null
  missAt: string | null
  currentKana: string
  moraIndex: number
  confirmedMora: ConfirmedMora | null
  miss: MissRecord | null
  /** お題文の全ての拍が確定済みかどうか(REV-014 B1対応、`class-design.md` 2.2参照) */
  isSentenceComplete: boolean
}
