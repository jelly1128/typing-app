import { get } from './client'
import type { MissAnalysis } from '../types/api'

export function getMissAnalysis(userId: number): Promise<MissAnalysis> {
  return get<MissAnalysis>(`/users/${userId}/miss-analysis`)
}
