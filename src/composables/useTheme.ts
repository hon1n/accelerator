import { ref, watch } from "vue";

// Глобальное состояние вынесено за пределы функции,
// чтобы оно было единым (singleton) для всех компонентов
const isDark = ref(false);

export function useTheme() {
  // Инициализация при первой загрузке приложения
  const initTheme = () => {
    // Проверяем localStorage или системные настройки
    if (localStorage.getItem("theme") === "dark" || (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      isDark.value = true;
    } else {
      isDark.value = false;
    }
    applyTheme(isDark.value);
  };

  const toggleTheme = () => {
    isDark.value = !isDark.value;
  };

  // Функция применения стилей
  const applyTheme = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Автоматически реагируем на изменение isDark
  watch(isDark, (newValue) => {
    applyTheme(newValue);
  });

  return {
    isDark,
    toggleTheme,
    initTheme,
  };
}
