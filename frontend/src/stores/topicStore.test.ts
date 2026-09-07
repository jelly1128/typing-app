import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTopicStore } from './topicStore'
import * as topicSetApi from '../api/topicSetApi'

describe('topicStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loadTopicSetsはAPIの結果をtopicSetsに反映する', async () => {
    vi.spyOn(topicSetApi, 'listTopicSets').mockResolvedValue([{ id: 1, name: '初級', description: null }])

    const store = useTopicStore()
    await store.loadTopicSets()

    expect(store.topicSets).toEqual([{ id: 1, name: '初級', description: null }])
  })

  it('selectTopicSetはtopicSetIdを設定しお題文を取得する', async () => {
    vi.spyOn(topicSetApi, 'listSentences').mockResolvedValue([{ id: 10, text: 'だいがく', moraList: ['だ', 'い', 'が', 'く'] }])

    const store = useTopicStore()
    await store.selectTopicSet(1)

    expect(store.topicSetId).toBe(1)
    expect(store.sentences).toEqual([{ id: 10, text: 'だいがく', moraList: ['だ', 'い', 'が', 'く'] }])
  })
})
