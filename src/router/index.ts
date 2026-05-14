import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import { useAuthStore } from "../stores/auth";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "Home",
    redirect: () => {
      const authStore = useAuthStore();

      if (authStore.accessToken) {
        return { name: "Dashboard" };
      } else {
        return { name: "Login" };
      }
    },
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("../views/LoginView.vue"),
    meta: {
      title: "Авторизация",
      guestOnly: true,
    },
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    component: () => import("../views/DashboardView.vue"),
    meta: {
      title: "Главная",
      requiresAuth: true,
    },
  },
  {
    path: "/records/:id",
    name: "RecordDetails",
    component: () => import("../views/RecordDetailsView.vue"),
    meta: {
      title: "Детали конспекта",
      requiresAuth: true,
    },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("../views/DashboardView.vue"),
    meta: {
      title: "Страница не найдена",
    },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

router.beforeEach((to, from, next) => {
  document.title = (to.meta.title as string) || "Платформа протоколирования";

  const authStore = useAuthStore();

  const isAuthenticated = !!authStore.accessToken;

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const guestOnly = to.matched.some((record) => record.meta.guestOnly);

  if (requiresAuth && !isAuthenticated) {
    next({ name: "Login", query: { redirect: to.fullPath } });
  } else if (guestOnly && isAuthenticated) {
    next({ name: "Dashboard" });
  } else {
    next();
  }
});

export default router;
