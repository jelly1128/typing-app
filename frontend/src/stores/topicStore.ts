import { defineStore } from 'pinia'
import { listSentences, listTopicSets } from '../api/topicSetApi'
import type { Sentence, TopicSet } from '../types/api'

export const useTopicStore = defineStore('topic', {
  state: () => ({
    topicSetId: null as number | null,
    topicSets: [] as TopicSet[],
    sentences: [] as Sentence[],
  }),
  actions: {
    async loadTopicSets() {
      this.topicSets = await listTopicSets()
    },
    async selectTopicSet(topicSetId: number) {
      this.topicSetId = topicSetId
      this.sentences = await listSentences(topicSetId)
    },
  },
})
