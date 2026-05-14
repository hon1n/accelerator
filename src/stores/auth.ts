import { defineStore } from "pinia";
import { ref } from "vue";
import { AuthService } from "../api/auth.service";
import router from "../router";

export const useAuthStore = defineStore("auth", () => {
  const accessToken = ref<string | null>(localStorage.getItem("access_token") || sessionStorage.getItem("access_token"));
  const refreshToken = ref<string | null>(localStorage.getItem("refresh_token") || sessionStorage.getItem("refresh_token"));

  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const setTokens = (access: string, refresh: string, rememberMe?: boolean) => {
    accessToken.value = access;
    refreshToken.value = refresh;

    clearStorage();

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("access_token", access);
    storage.setItem("refresh_token", refresh);
  };

  const clearStorage = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
  };

  const login = async (email: string, pass: string, rememberMe: boolean) => {
    isLoading.value = true;
    error.value = null;

    try {
      // const data = await AuthService.login(email, pass);
      // setTokens(data.access_token, data.refresh_token);

      await new Promise((resolve) => setTimeout(resolve, 500));

      setTokens("dev_dummy_access_token", "dev_dummy_refresh_token", rememberMe);

      const redirectPath = router.currentRoute.value.query.redirect as string;

      router.push(redirectPath || "/dashboard");
    } catch (err: any) {
      console.error("Login failed", err);
      error.value = err.response?.data?.error || "Неправильные данные для авторизации";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const logout = () => {
    accessToken.value = null;
    refreshToken.value = null;
    error.value = null;

    clearStorage();

    router.push("/login");
  };

  return {
    accessToken,
    refreshToken,
    isLoading,
    error,
    setTokens,
    login,
    logout
  };
});
