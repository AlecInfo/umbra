export function useTheme() {
  const theme = useCookie('umbra-theme', { default: () => 'dark' })

  function setTheme(t: string) {
    theme.value = t
  }

  return { theme, setTheme }
}