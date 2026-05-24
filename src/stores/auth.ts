import { defineStore } from "pinia";
import { ref } from "vue";
import {
  authService,
  clearStoredTokens,
  extractApiErrorMessage,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUserRole,
  setStoredTokens,
  setStoredUserRole,
} from "../api";
import router from "../router";
import { roleFromAccessToken } from "../utils/jwt";

const REQUIRES_PASSWORD_CHANGE_KEY = "requires_password_change";

function readRequiresPasswordChange(): boolean {
  return sessionStorage.getItem(REQUIRES_PASSWORD_CHANGE_KEY) === "1";
}

function persistRequiresPasswordChange(value: boolean): void {
  if (value) {
    sessionStorage.setItem(REQUIRES_PASSWORD_CHANGE_KEY, "1");
  } else {
    sessionStorage.removeItem(REQUIRES_PASSWORD_CHANGE_KEY);
  }
}

/**
 * DEV-only: позволяет переопределить роль пользователя через VITE_DEV_ROLE в .env.
 * Используется только для тестирования UI админских вкладок. Бекенд продолжит
 * проверять реальную роль из JWT.
 */
function devRoleOverride(): string | null {
  const raw = (import.meta.env.VITE_DEV_ROLE ?? "").toString().trim().toLowerCase();
  if (raw === "") return null;
  if (raw !== "creator" && raw !== "admin" && raw !== "user") return null;
  return raw;
}

function resolveInitialRole(): string | null {
  const override = devRoleOverride();
  if (override) return override;
  return getStoredUserRole() ?? roleFromAccessToken(getStoredAccessToken());
}

export const useAuthStore = defineStore("auth", () => {
  const accessToken = ref<string | null>(getStoredAccessToken());
  const refreshToken = ref<string | null>(getStoredRefreshToken());
  const role = ref<string | null>(resolveInitialRole());
  const requiresPasswordChange = ref(readRequiresPasswordChange());

  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const setTokens = (access: string, refresh: string, rememberMe = true) => {
    accessToken.value = access;
    refreshToken.value = refresh;
    setStoredTokens(access, refresh, rememberMe);
    const resolvedRole = devRoleOverride() ?? roleFromAccessToken(access);
    if (resolvedRole) {
      role.value = resolvedRole;
      setStoredUserRole(resolvedRole, rememberMe);
    }
  };

  const setRole = (nextRole: string | null | undefined, rememberMe = true) => {
    const finalRole = devRoleOverride() ?? nextRole;
    if (!finalRole) return;
    role.value = finalRole;
    setStoredUserRole(finalRole, rememberMe);
  };

  const setRequiresPasswordChange = (value: boolean) => {
    requiresPasswordChange.value = value;
    persistRequiresPasswordChange(value);
  };

  const login = async (email: string, pass: string, rememberMe: boolean) => {
    isLoading.value = true;
    error.value = null;

    try {
      const data = await authService.login({ login: email, password: pass });
      const refresh = data.refresh_token ?? "";
      setTokens(data.access_token, refresh, rememberMe);
      setRole(data.role, rememberMe);

      if (data.temporary_password) {
        setRequiresPasswordChange(true);
        await router.push({ name: "ChangePassword" });
        return;
      }

      setRequiresPasswordChange(false);
      const redirectPath = router.currentRoute.value.query.redirect as string | undefined;
      await router.push(redirectPath || { name: "Dashboard" });
    } catch (err: unknown) {
      error.value = extractApiErrorMessage(err, "Неправильные данные для авторизации");
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const changeTempPassword = async (password: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      await authService.changeTempPassword({ password });
      setRequiresPasswordChange(false);
      await router.push({ name: "Dashboard" });
    } catch (err: unknown) {
      error.value = extractApiErrorMessage(err, "Не удалось сменить пароль");
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const logout = () => {
    accessToken.value = null;
    refreshToken.value = null;
    role.value = null;
    error.value = null;
    setRequiresPasswordChange(false);
    clearStoredTokens();
    void router.push({ name: "Login" });
  };

  return {
    accessToken,
    refreshToken,
    role,
    requiresPasswordChange,
    isLoading,
    error,
    setTokens,
    setRole,
    setRequiresPasswordChange,
    login,
    changeTempPassword,
    logout,
  };
});
