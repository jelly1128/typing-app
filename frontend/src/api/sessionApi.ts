import { get, post } from './client'
import type { PersonalBest, SessionResult, SessionSubmission, SessionSummary } from '../types/api'

export function submitSession(submission: SessionSubmission): Promise<SessionResult> {
  return post<SessionResult>('/sessions', submission)
}

export function listSessionHistory(userId: number): Promise<SessionSummary[]> {
  return get<SessionSummary[]>(`/users/${userId}/sessions`)
}

export function getPersonalBest(userId: number, topicSetId: number): Promise<PersonalBest> {
  return get<PersonalBest>(`/users/${userId}/best?topicSetId=${topicSetId}`)
}
