import { describe, expect, it } from 'vitest'
import { createSequenceJudge } from './sequenceJudge'
import cases from '../../../shared/testdata/romaji-automaton/cases.json'

describe('createSequenceJudge (shared/testdata/romaji-automaton/cases.json)', () => {
  for (const testCase of cases) {
    it(`${testCase.id}: ${testCase.description}`, () => {
      const judge = createSequenceJudge()
      judge.startSentence(testCase.input.moraList)

      const actualSteps = testCase.input.keystrokes.map((key) => judge.handleKeystroke(key))

      expect(actualSteps).toEqual(testCase.expected.steps)
    })
  }
})

describe('createSequenceJudge (お題文をまたぐ状態)', () => {
  it('UT-024: 累計拍インデックスはお題文をまたいでもリセットされない', () => {
    const judge = createSequenceJudge()
    judge.startSentence(['あ'])
    const r1 = judge.handleKeystroke('a')
    expect(r1.confirmedMora?.moraIndex).toBe(0)

    judge.startSentence(['い'])
    const r2 = judge.handleKeystroke('i')
    expect(r2.confirmedMora?.moraIndex).toBe(1)
  })

  it('UT-025: 同じかなが連続する拍(おおきい)でもmoraIndexで区別できる', () => {
    const judge = createSequenceJudge()
    judge.startSentence(['お', 'お', 'き', 'い'])
    const results = ['o', 'o', 'k', 'i', 'i'].map((key) => judge.handleKeystroke(key))

    const confirmed = results.filter((r) => r.confirmedMora !== null).map((r) => r.confirmedMora)
    expect(confirmed).toEqual([
      { kana: 'お', charType: '清音', acceptedPattern: 'o', moraIndex: 0 },
      { kana: 'お', charType: '清音', acceptedPattern: 'o', moraIndex: 1 },
      { kana: 'き', charType: '清音', acceptedPattern: 'ki', moraIndex: 2 },
      { kana: 'い', charType: '清音', acceptedPattern: 'i', moraIndex: 3 },
    ])
  })

  it('UT-026: prevKanaはセッション最初のみnull、以降はお題文をまたいでも維持される', () => {
    const judge = createSequenceJudge()
    judge.startSentence(['し'])
    const missInFirstSentence = judge.handleKeystroke('x')
    expect(missInFirstSentence.miss?.prevKana).toBeNull()
    judge.handleKeystroke('s')
    judge.handleKeystroke('h')
    judge.handleKeystroke('i')

    judge.startSentence(['し'])
    const missInSecondSentence = judge.handleKeystroke('x')
    expect(missInSecondSentence.miss?.prevKana).toBe('し')
  })
})
