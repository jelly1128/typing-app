import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TypingView from './TypingView.vue'
import { useUserStore } from '../stores/userStore'
import { useSessionStore } from '../stores/sessionStore'
import * as topicSetApi from '../api/topicSetApi'
import * as sessionApi from '../api/sessionApi'
import type { EndConditionType, SessionResult } from '../types/api'

interface TypingViewProps {
  topicSetId: number
  endConditionType: EndConditionType
  endConditionValue: number
}

const props: TypingViewProps = { topicSetId: 1, endConditionType: 'sentence_count', endConditionValue: 2 }

function pressKey(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }))
}

// TypingViewはwindowにkeydownリスナーを張るため、unmount漏れは後続テストのイベントを拾ってしまう
let wrappers: VueWrapper[] = []
function mountTypingView(mountProps: TypingViewProps = props) {
  const wrapper = mount(TypingView, { props: mountProps })
  wrappers.push(wrapper)
  return wrapper
}

describe('TypingView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    const userStore = useUserStore()
    userStore.setUser({ id: 1, name: 'kazuki' })
    vi.spyOn(topicSetApi, 'listSentences').mockResolvedValue([
      { id: 1, text: 'あ', moraList: ['あ'] },
      { id: 2, text: 'い', moraList: ['い'] },
    ])
  })

  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers = []
  })

  it('お題文取得失敗時は汎用エラー表示に切り替える(NFR-09)', async () => {
    vi.spyOn(topicSetApi, 'listSentences').mockRejectedValue(new Error('server error'))
    const wrapper = mountTypingView()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('読み込みに失敗しました')
  })

  it('マウント時に1文目を表示し、進捗(お題番号)を出す', async () => {
    const wrapper = mountTypingView()
    await flushPromises()

    expect(wrapper.text()).toContain('あ')
    expect(wrapper.text()).toContain('1 / 2文')
  })

  it('1文を打ち終えると次の文へローテーションする', async () => {
    const wrapper = mountTypingView()
    await flushPromises()

    pressKey('a')
    await flushPromises()

    expect(wrapper.text()).toContain('2 / 2文')
    expect(wrapper.text()).toContain('い')
  })

  it('誤入力では確定が進まず、正しいキーで確定するまで先に進まない(FR-04)', async () => {
    mountTypingView()
    await flushPromises()
    const sessionStore = useSessionStore()

    pressKey('x')
    expect(sessionStore.missRecords).toHaveLength(1)
    expect(sessionStore.correctKeyCount).toBe(0)

    pressKey('a')
    expect(sessionStore.correctKeyCount).toBe(1)
  })

  it('終了条件達成でセッションを送信しfinishedをemitする', async () => {
    const fakeResult: SessionResult = {
      sessionId: 1,
      netKpm: 100,
      rawKpm: 100,
      accuracy: 100,
      consistency: 0,
      durationSeconds: 0,
      playedAt: '2026-09-08T00:00:00Z',
      previousBest: null,
      isNetKpmBest: true,
      isAccuracyBest: true,
    }
    const submitSpy = vi.spyOn(sessionApi, 'submitSession').mockResolvedValue(fakeResult)
    const wrapper = mountTypingView()
    await flushPromises()

    pressKey('a') // 1文目「あ」確定 → 2文目へ
    await flushPromises()
    pressKey('i') // 2文目「い」確定 → 終了条件(2文)達成
    await flushPromises()

    expect(submitSpy).toHaveBeenCalledOnce()
    expect(wrapper.emitted('finished')).toHaveLength(1)
  })

  it('time_limitモードでは残り秒数を表示する', async () => {
    const timeLimitProps = { topicSetId: 1, endConditionType: 'time_limit' as const, endConditionValue: 60 }
    const wrapper = mountTypingView(timeLimitProps)
    await flushPromises()

    expect(wrapper.text()).toContain('残り60秒')
  })
})
