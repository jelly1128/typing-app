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

describe('createSequenceJudge (isSentenceComplete、REV-014 B1対応)', () => {
  it('1キーで2拍が同時に確定するケース(既知の制限)でも、isSentenceCompleteは正しくtrueになる', () => {
    const judge = createSequenceJudge()
    judge.startSentence(['ん', 'ー'])

    const afterN = judge.handleKeystroke('n')
    expect(afterN.isSentenceComplete).toBe(false)

    // "-"は「ん」の"n"/"nn"どちらにも延長できないため押し戻しが発生し、
    // 押し戻されたキーがそのまま次拍「ー」の唯一の候補("-")と完全一致するため、
    // 1回のキー入力で「ん」「ー」の両方が確定する(confirmedMoraは「ん」側の1件しか通知されない)
    const afterHyphen = judge.handleKeystroke('-')
    expect(afterHyphen.confirmedMora?.kana).toBe('ん')
    expect(afterHyphen.isSentenceComplete).toBe(true)
  })

  it('通常の完了(1キー1拍確定)ではお題文の最後の拍が確定した回だけtrueになる', () => {
    const judge = createSequenceJudge()
    judge.startSentence(['あ', 'い'])

    expect(judge.handleKeystroke('a').isSentenceComplete).toBe(false)
    expect(judge.handleKeystroke('i').isSentenceComplete).toBe(true)
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
