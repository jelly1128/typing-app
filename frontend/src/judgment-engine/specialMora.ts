import type { Mora } from './types'
import { lookupMoraPatterns } from './moraPatterns'

const N_COLLISION_STARTS = ['a', 'i', 'u', 'e', 'o', 'y', 'n']

/**
 * 拍の受理パターン一覧を返す汎用ディスパッチャ(`romaji-automaton.md` 6.1「受理パターン集合」の
 * 事前絞り込み候補を除いた分岐)。撥音ん/促音っの受理パターン計算が「次の拍」自身の基本パターンを
 * 必要とするため、ここに置いて両者から再利用する。
 *
 * 制約: 次の拍がさらに特殊カテゴリ(ん/っ/ー)の場合、そのまた次の拍までは遡らない
 * (`nextOfNextMora`は常にnullとして扱う)。仕様上、促音は子音行の拍の直前にのみ出現するため
 * (5.2の前提)、この簡略化が問題になる組み合わせはお題データ側で発生しない。
 */
export function getBaseReceptionPatterns(mora: Mora, nextMora: Mora | null): string[] {
  switch (mora.charType) {
    case '撥音ん':
      return nReceptionPatterns(nextMora)
    case '促音っ':
      return tsuReceptionPatterns(nextMora)
    case '長音':
      return longVowelReceptionPatterns()
    default:
      return lookupMoraPatterns(mora.kana)
  }
}

/** 撥音「ん」の受理パターン(5.1)。 */
export function nReceptionPatterns(nextMora: Mora | null): string[] {
  if (!nextMora) {
    return ['n', 'nn']
  }
  const nextPatterns = getBaseReceptionPatterns(nextMora, null)
  const nextFirstChars = new Set(nextPatterns.map((pattern) => pattern[0]))
  const collides = N_COLLISION_STARTS.some((ch) => nextFirstChars.has(ch))
  return collides ? ['nn'] : ['n', 'nn']
}

/** 促音「っ」の受理パターン(5.2)。子音重ね方式 ∪ 独立表記方式。 */
export function tsuReceptionPatterns(nextMora: Mora | null): string[] {
  const nextPatterns = nextMora ? getBaseReceptionPatterns(nextMora, null) : []
  const consonantDoublingCandidates = Array.from(new Set(nextPatterns.map((pattern) => pattern[0])))
  const independentCandidates = ['xtu', 'xtsu', 'ltu', 'ltsu']
  return [...consonantDoublingCandidates, ...independentCandidates]
}

/**
 * 促音っの確定結果を受けて次の拍の候補を絞り込む(5.2)。子音重ね方式(1文字で確定)の場合のみ
 * 先頭文字で絞り込み、独立表記方式(3〜4文字で確定)の場合は絞り込まない。
 */
export function narrowNextMoraCandidates(nextMoraCandidates: string[], confirmedTsuPattern: string): string[] {
  if (confirmedTsuPattern.length !== 1) {
    return nextMoraCandidates
  }
  return nextMoraCandidates.filter((pattern) => pattern[0] === confirmedTsuPattern)
}

/** 長音「ー」の受理パターン(5.3、ADR-004)。 */
export function longVowelReceptionPatterns(): string[] {
  return ['-']
}
