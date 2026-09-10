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

describe('createSequenceJudge (startSentenceの初期ヒント、CL-022)', () => {
  it('1打鍵もしていない時点で最初の拍のヒントを返す', () => {
    const judge = createSequenceJudge()
    const initial = judge.startSentence(['し'])

    expect(initial.confirmedText).toBe('')
    expect(initial.pendingInput).toBe('')
    expect(initial.nextHint).toBe('ci')
    expect(initial.missAt).toBeNull()
    expect(initial.currentKana).toBe('し')
    expect(initial.confirmedMora).toBeNull()
    expect(initial.miss).toBeNull()
  })
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

describe('createSequenceJudge (isSentenceComplete、REV-014 B1/CL-024対応)', () => {
  it('最後の拍が確定するまではfalse、確定した時点でtrueを返す', () => {
    const judge = createSequenceJudge()
    judge.startSentence(['あ', 'い'])
    expect(judge.isSentenceComplete()).toBe(false)

    judge.handleKeystroke('a')
    expect(judge.isSentenceComplete()).toBe(false)

    judge.handleKeystroke('i')
    expect(judge.isSentenceComplete()).toBe(true)
  })

  it('1キーで2拍同時確定するケース(既知の制限)でもconfirmedMoraの通知数に関わらずtrueを返す', () => {
    // 「ん」の直後に「ー」が続く場合のみ起こりうる既知の制限(romaji-automaton.md 6.1)。
    // "n"で「ん」を保留 → "-"で「ん」を確定しつつ「ー」へ押し戻し、同じキーで「ー」も即確定する。
    // confirmedMoraは1件しか通知されないが、indexInSequenceは正しく末尾まで進む
    const judge = createSequenceJudge()
    judge.startSentence(['ん', 'ー'])
    const r1 = judge.handleKeystroke('n')
    expect(r1.confirmedMora).toBeNull() // 保留中、まだ確定しない
    expect(judge.isSentenceComplete()).toBe(false)

    const r2 = judge.handleKeystroke('-')
    expect(r2.confirmedMora?.kana).toBe('ん') // ーの確定通知は失われる(既知の制限)
    expect(judge.isSentenceComplete()).toBe(true) // だが内部の拍列位置は正しく末尾まで進んでいる
  })
})
