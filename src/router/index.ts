import { createRouter, createWebHistory } from 'vue-router'
import ReadingView from '../views/ReadingView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'today',
      component: ReadingView,
    },
    {
      path: '/day/:date',
      name: 'day',
      component: ReadingView,
      props: true,
    },
    {
      path: '/calendar',
      name: 'calendar',
      component: () => import('../views/CalendarView.vue'),
    },
    {
      path: '/library',
      name: 'library',
      component: () => import('../views/LibraryView.vue'),
    },
    {
      path: '/library/:id',
      name: 'book',
      component: () => import('../views/ReaderView.vue'),
      props: true,
    },
    {
      path: '/tongue-twister',
      name: 'twister',
      component: () => import('../views/TwisterView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  // The reader restores its own saved place, so don't reset its scroll position
  scrollBehavior: (to) => (to.name === 'book' ? false : { top: 0 }),
})

export default router
