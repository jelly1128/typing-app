import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TypingDisplay from './TypingDisplay.vue'

describe('TypingDisplay', () => {
  it('確定済み・現在・未入力の拍にクラスを振り分ける', () => {
    const wrapper = mount(TypingDisplay, {
      props: {
        sentenceText: 'あい',
        moraList: ['あ', 'い'],
        confirmedCount: 1,
        pendingInput: '',
        nextHint: 'i',
        hasMiss: false,
      },
    })

    const spans = wrapper.findAll('.reading span')
    expect(spans[0].classes()).toContain('confirmed')
    expect(spans[1].classes()).toContain('current')
    expect(spans[1].classes()).not.toContain('miss')
  })

  it('ミス発生中は現在の拍にmissクラスを付ける', () => {
    const wrapper = mount(TypingDisplay, {
      props: {
        sentenceText: 'あ',
        moraList: ['あ'],
        confirmedCount: 0,
        pendingInput: '',
        nextHint: 'a',
        hasMiss: true,
      },
    })

    expect(wrapper.findAll('.reading span')[0].classes()).toContain('miss')
    expect(wrapper.get('.hint').classes()).toContain('miss')
  })

  it('nextHintがnull(拍列終了)ならヒント行を表示しない', () => {
    const wrapper = mount(TypingDisplay, {
      props: {
        sentenceText: 'あ',
        moraList: ['あ'],
        confirmedCount: 1,
        pendingInput: '',
        nextHint: null,
        hasMiss: false,
      },
    })

    expect(wrapper.find('.hint').exists()).toBe(false)
  })
})
