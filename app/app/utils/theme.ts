export const THEME_STORAGE_KEY = 'vueuse-color-scheme'
export const THEME_DARK_VALUE = 'dark'
export const THEME_LIGHT_VALUE = 'light'

export type ThemeValue = typeof THEME_DARK_VALUE | typeof THEME_LIGHT_VALUE

export const resolveInitialTheme = (storedTheme: string | null | undefined): ThemeValue => {
  if (storedTheme === THEME_LIGHT_VALUE) {
    return THEME_LIGHT_VALUE
  }

  return THEME_DARK_VALUE
}

export const createThemeBootstrapScript = (storageKey = THEME_STORAGE_KEY) => {
  const darkValue = JSON.stringify(THEME_DARK_VALUE)
  const lightValue = JSON.stringify(THEME_LIGHT_VALUE)
  const encodedStorageKey = JSON.stringify(storageKey)

  return `(() => {
  const root = document.documentElement;
  const storageKey = ${encodedStorageKey};
  const darkTheme = ${darkValue};
  const lightTheme = ${lightValue};

  const applyTheme = (theme) => {
    root.classList.remove(darkTheme);

    if (theme === darkTheme) {
      root.classList.add(darkTheme);
    }

    root.style.colorScheme = theme;
  };

  try {
    applyTheme(localStorage.getItem(storageKey) === lightTheme ? lightTheme : darkTheme);
  } catch {
    applyTheme(darkTheme);
  }
})();`
}
