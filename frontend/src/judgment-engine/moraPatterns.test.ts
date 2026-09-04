import { describe, expect, it } from 'vitest'
import { MORA_PATTERNS, lookupMoraPatterns } from './moraPatterns'

describe('lookupMoraPatterns', () => {
  it('清音: 単一表記の代表例', () => {
    expect(lookupMoraPatterns('あ')).toEqual(['a'])
    expect(lookupMoraPatterns('か')).toEqual(['ka'])
    expect(lookupMoraPatterns('な')).toEqual(['na'])
    expect(lookupMoraPatterns('わ')).toEqual(['wa'])
    expect(lookupMoraPatterns('を')).toEqual(['wo'])
    expect(lookupMoraPatterns('ぱ')).toEqual(['pa'])
  })

  it('清音: 複数表記(表記ゆれ)の代表例', () => {
    expect(lookupMoraPatterns('し')).toEqual(['si', 'shi', 'ci'])
    expect(lookupMoraPatterns('ち')).toEqual(['ti', 'chi'])
    expect(lookupMoraPatterns('つ')).toEqual(['tu', 'tsu'])
    expect(lookupMoraPatterns('ふ')).toEqual(['hu', 'fu'])
    expect(lookupMoraPatterns('じ')).toEqual(['zi', 'ji'])
  })

  it('清音: ぢ/づ は zi/zu との重複を避けdi/duのみ(8章判断#2)', () => {
    expect(lookupMoraPatterns('ぢ')).toEqual(['di'])
    expect(lookupMoraPatterns('づ')).toEqual(['du'])
  })

  it('拗音: 単一表記の代表例', () => {
    expect(lookupMoraPatterns('きゃ')).toEqual(['kya'])
    expect(lookupMoraPatterns('にゃ')).toEqual(['nya'])
  })

  it('拗音: 複数表記の代表例', () => {
    expect(lookupMoraPatterns('しゃ')).toEqual(['sya', 'sha'])
    expect(lookupMoraPatterns('しゅ')).toEqual(['syu', 'shu'])
    expect(lookupMoraPatterns('しょ')).toEqual(['syo', 'sho'])
    expect(lookupMoraPatterns('ちゃ')).toEqual(['tya', 'cha'])
    expect(lookupMoraPatterns('じゃ')).toEqual(['zya', 'ja', 'jya'])
    expect(lookupMoraPatterns('じゅ')).toEqual(['zyu', 'ju', 'jyu'])
    expect(lookupMoraPatterns('じょ')).toEqual(['zyo', 'jo', 'jyo'])
  })

  it('ぢゃ/ぢゅ/ぢょは受理表から除外されている(8章判断#3)', () => {
    expect(lookupMoraPatterns('ぢゃ')).toEqual([])
  })

  it('未知のかな(撥音ん/促音っ/長音ー等)は空配列を返す', () => {
    expect(lookupMoraPatterns('ん')).toEqual([])
    expect(lookupMoraPatterns('っ')).toEqual([])
    expect(lookupMoraPatterns('ー')).toEqual([])
  })

  it('4章の表は清音70件+拗音33件=103件を保持する', () => {
    expect(Object.keys(MORA_PATTERNS)).toHaveLength(103)
  })
})
