import { createRouter, createWebHashHistory } from 'vue-router';
import ClipListView from '@/views/ClipListView.vue';
import ReviewView from '@/views/ReviewView.vue';
import PlanListView from '@/views/PlanListView.vue';
import PlanDetailView from '@/views/PlanDetailView.vue';

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
  {
    path: '/plans',
    name: 'plans',
    component: PlanListView,
  },
  {
    path: '/plans/:id',
    name: 'plan-detail',
    component: PlanDetailView,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
