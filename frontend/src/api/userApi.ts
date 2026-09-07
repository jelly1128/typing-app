import { post } from './client'
import type { User } from '../types/api'

export function identifyUser(name: string): Promise<User> {
  return post<User>('/users', { name })
}
