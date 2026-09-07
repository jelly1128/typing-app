import type { CharType } from '../judgment-engine/types'

export interface ErrorResponse {
  timestamp: string
  status: number
  code: string
  message: string
  traceId: string
}

export interface User {
  id: number
  name: string
}

export interface TopicSet {
  id: number
  name: string
  description: string | null
}

export interface Sentence {
  id: number
  text: string
  moraList: string[]
}

export interface MissRecordInput {
  kanaOccurrenceNo: number
  kana: string
  expectedKey: string
  actualKey: string
  prevKana: string | null
  charType: CharType
}

export interface KanaCountInput {
  kana: string
  charType: CharType
  totalCount: number
}

export type EndConditionType = 'sentence_count' | 'time_limit'

export interface SessionSubmission {
  userId: number
  topicSetId: number
  endConditionType: EndConditionType
  endConditionValue: number
  correctKeyCount: number
  durationSeconds: number
  keystrokeIntervalsMs: number[]
  missRecords: MissRecordInput[]
  kanaCounts: KanaCountInput[]
}

export interface PersonalBest {
  topicSetId: number
  netKpmBest: number | null
  accuracyBest: number | null
}

export interface SessionResult {
  sessionId: number
  netKpm: number
  rawKpm: number
  accuracy: number
  consistency: number
  durationSeconds: number
  playedAt: string
  previousBest: PersonalBest | null
  isNetKpmBest: boolean
  isAccuracyBest: boolean
}

export interface SessionSummary {
  id: number
  topicSetName: string
  endConditionType: EndConditionType
  endConditionValue: number
  playedAt: string
  netKpm: number
  accuracy: number
  durationSeconds: number
}

export interface KanaMissStat {
  kana: string
  missCount: number
  occurrenceCount: number
  missRate: number
}

export interface ErrorPatternStat {
  expectedKey: string
  actualKey: string
  count: number
}

export interface PrevKanaMissStat {
  prevKana: string
  missRate: number
}

export interface CharTypeStat {
  charType: CharType
  occurrenceCount: number
  accuracyRate: number
}

export interface MissAnalysis {
  byKana: KanaMissStat[]
  byErrorPattern: ErrorPatternStat[]
  byPrevKana: PrevKanaMissStat[]
  byCharType: CharTypeStat[]
  advice: string[]
}
