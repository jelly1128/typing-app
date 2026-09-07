import { get } from './client'
import type { Sentence, TopicSet } from '../types/api'

export function listTopicSets(): Promise<TopicSet[]> {
  return get<TopicSet[]>('/topic-sets')
}

export function listSentences(topicSetId: number): Promise<Sentence[]> {
  return get<Sentence[]>(`/topic-sets/${topicSetId}/sentences`)
}
