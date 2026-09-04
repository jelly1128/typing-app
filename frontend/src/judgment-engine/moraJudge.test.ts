import { describe, expect, it } from 'vitest'
import { hasExactMatch, narrowCandidates } from './moraJudge'

describe('narrowCandidates', () => {
  it('試行後文字列で始まる候補だけを残す', () => {
    expect(narrowCandidates(['si', 'shi', 'ci'], 's')).toEqual(['si', 'shi'])
  })

  it('一致する候補が無ければ空配列になる', () => {
    expect(narrowCandidates(['si', 'shi', 'ci'], 'x')).toEqual([])
  })

  it('候補が1件に絞られた後、さらに1文字進めても残り続ける', () => {
    const afterS = narrowCandidates(['si', 'shi'], 's')
    expect(narrowCandidates(afterS, 'si')).toEqual(['si'])
  })
})

describe('hasExactMatch', () => {
  it('入力済み文字列が候補のいずれかと完全一致すればtrue', () => {
    expect(hasExactMatch(['si', 'shi'], 'si')).toBe(true)
  })

  it('部分一致のみではfalse', () => {
    expect(hasExactMatch(['si', 'shi'], 's')).toBe(false)
  })

  it('候補が空ならfalse', () => {
    expect(hasExactMatch([], 'si')).toBe(false)
  })
})

describe('「し」を1キーずつ打つ例(6.2 例1)', () => {
  it('s→shiではなくsiで確定するケースを段階的に再現する', () => {
    let candidates = ['si', 'shi', 'ci']
    let input = ''

    input += 's'
    candidates = narrowCandidates(candidates, input)
    expect(candidates).toEqual(['si', 'shi'])
    expect(hasExactMatch(candidates, input)).toBe(false)

    input += 'i'
    candidates = narrowCandidates(candidates, input)
    expect(candidates).toEqual(['si'])
    expect(hasExactMatch(candidates, input)).toBe(true)
  })
})
