export default defineAppConfig({
  ui: {
    colors: {
      primary: 'green',
      neutral: 'slate'
    },

    // ── UToast / UToaster ────────────────────────────────────────
    toaster: {
      position: 'bottom-right' as const
    },
    toast: {
      slots: {
        root: 'font-mono text-[13px] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] shadow-lg backdrop-blur-sm',
        title: 'text-[var(--text)] font-semibold',
        description: 'text-[var(--muted)]',
        close: 'text-[var(--muted)] hover:text-[var(--text)]'
      }
    },

    // ── UButton ────────────────────────────────────────────────
    // Variantes personnalisées pour la landing, utilisant les
    // CSS variables du design system via Tailwind arbitrary values.
    button: {
      slots: {
        base: 'font-mono cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none whitespace-nowrap transition-opacity'
      },
      variants: {
        variant: {
          // Bouton CTA principal (fond accent vert)
          landing: 'inline-flex items-center gap-2 bg-[var(--accent)] text-[#0a0a0f] rounded-[var(--r)] px-5 py-2.5 text-[13px] font-semibold hover:opacity-[.88]',
          // Bouton CTA grand format (hero GitHub)
          'landing-lg': 'inline-flex items-center gap-2 bg-[var(--accent)] text-[#0a0a0f] rounded-[var(--r)] px-7 py-3 text-[13px] font-semibold hover:opacity-[.88]',
          // Bouton copy code (discret, texte seul)
          copy: 'text-[var(--muted)] text-[11px] tracking-[.06em] hover:text-[var(--text)] p-0 bg-transparent transition-colors'
        }
      }
    },

    // ── UInput ─────────────────────────────────────────────────
    // Le slot `base` cible l'élément <input> lui-même.
    // Le slot `root` est le wrapper flex.
    input: {
      slots: {
        root: 'flex-1',
        base: [
          'w-full bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)]',
          'px-4 py-2.5 font-mono text-[13px] text-[var(--text)]',
          'outline-none transition-[border-color] placeholder:text-[var(--muted)]',
          'focus:border-[var(--accent)] disabled:opacity-50'
        ].join(' ')
      }
    }
  }
})
