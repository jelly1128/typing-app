export type CharType = '清音' | '拗音' | '撥音ん' | '促音っ' | '長音'

export interface Mora {
  kana: string
  charType: CharType
}

export type MoraSequence = Mora[]

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
}
