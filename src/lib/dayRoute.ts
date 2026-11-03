import type { RouteLocationRaw } from 'vue-router'
import { todayKey } from '@/lib/readingPlan'

/** Route for a plan day; today gets the plain home URL. */
export function dayRoute(date: string): RouteLocationRaw {
  return date === todayKey() ? { name: 'today' } : { name: 'day', params: { date } }
}
