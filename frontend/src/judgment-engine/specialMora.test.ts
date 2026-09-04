import { describe, expect, it } from 'vitest'
import type { Mora } from './types'
import {
  longVowelReceptionPatterns,
  narrowNextMoraCandidates,
  nReceptionPatterns,
  tsuReceptionPatterns,
} from './specialMora'

function mora(kana: string, charType: Mora['charType']): Mora {
  return { kana, charType }
}

describe('nReceptionPatterns(撥音ん、5.1)', () => {
  it('文末(次の拍が無い)場合はn/nn両方を許容する', () => {
    expect(nReceptionPatterns(null)).toEqual(['n', 'nn'])
  })

  it('次拍が母音行の場合はnnのみ許容する', () => {
    expect(nReceptionPatterns(mora('あ', '清音'))).toEqual(['nn'])
  })

  it('次拍がや行の場合はnnのみ許容する', () => {
    expect(nReceptionPatterns(mora('や', '清音'))).toEqual(['nn'])
  })

  it.each(['な', 'に', 'ぬ', 'ね', 'の'])(
    '次拍がな行(%s)の場合はnnのみ許容する(B6対応)',
    (kana) => {
      expect(nReceptionPatterns(mora(kana, '清音'))).toEqual(['nn'])
    },
  )

  it('次拍が子音行(な行以外)の場合はn/nn両方を許容する', () => {
    expect(nReceptionPatterns(mora('か', '清音'))).toEqual(['n', 'nn'])
    expect(nReceptionPatterns(mora('ば', '清音'))).toEqual(['n', 'nn'])
  })

  it('次拍が長音ーの場合(先頭文字がハイフン)はn/nn両方を許容する', () => {
    expect(nReceptionPatterns(mora('ー', '長音'))).toEqual(['n', 'nn'])
  })
})

describe('tsuReceptionPatterns(促音っ、5.2)', () => {
  it('次拍の表記が単一の場合、子音重ね候補は1件+独立表記4件', () => {
    expect(tsuReceptionPatterns(mora('こ', '清音'))).toEqual(['k', 'xtu', 'xtsu', 'ltu', 'ltsu'])
  })

  it('次拍の表記が複数の場合、子音重ね候補は先頭文字の重複除去(し=si/shi/ci→s,c)', () => {
    expect(tsuReceptionPatterns(mora('し', '清音'))).toEqual(['s', 'c', 'xtu', 'xtsu', 'ltu', 'ltsu'])
  })
})

describe('narrowNextMoraCandidates(促音っ確定後の次拍絞り込み、5.2)', () => {
  it('子音重ね方式(1文字)で確定した場合、先頭文字で絞り込む', () => {
    expect(narrowNextMoraCandidates(['si', 'shi', 'ci'], 's')).toEqual(['si', 'shi'])
  })

  it('独立表記方式(3〜4文字)で確定した場合、絞り込まない', () => {
    expect(narrowNextMoraCandidates(['si', 'shi', 'ci'], 'xtu')).toEqual(['si', 'shi', 'ci'])
    expect(narrowNextMoraCandidates(['si', 'shi', 'ci'], 'ltsu')).toEqual(['si', 'shi', 'ci'])
  })
})

describe('longVowelReceptionPatterns(長音ー、5.3、ADR-004)', () => {
  it('ハイフン1文字のみを受理する', () => {
    expect(longVowelReceptionPatterns()).toEqual(['-'])
  })
})
