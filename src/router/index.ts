import { createRouter, createWebHashHistory } from 'vue-router';
import ClipListView from '@/views/ClipListView.vue';
import ReviewView from '@/views/ReviewView.vue';

const routes = [
  {
    path: '/',
    name: 'clips',
    component: ClipListView,
  },
  {
    path: '/review',
    name: 'review',
    component: ReviewView,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
