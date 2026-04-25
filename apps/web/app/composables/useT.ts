export type Lang = 'fr' | 'en'

const TR: Record<Lang, Record<string, string>> = {
  fr: {
    // Auth
    auth_tagline_login_1: 'Vos noeuds VPN,',
    auth_tagline_login_2: 'sous votre contrôle.',
    auth_desc_login: 'Déploiement en une commande. Interface unifiée. Aucune dépendance à un service tiers.',
    auth_tagline_register_1: 'Prêt en',
    auth_tagline_register_2: 'une commande.',
    auth_desc_register: 'Créez votre compte, ajoutez un noeud, connectez-vous. Tout en moins de 5 minutes.',
    auth_login_title: 'Connexion à votre espace',
    auth_register_title: 'Créer un compte gratuit',
    auth_oauth_notice: 'OAuth disponible après la sortie du backend.',
    auth_oauth_github: 'Continuer avec GitHub',
    auth_oauth_google: 'Continuer avec Google',
    auth_or_email: 'ou par email',
    auth_email: 'Email',
    auth_email_ph: 'ex: vous@example.com',
    auth_password: 'Mot de passe',
    auth_password_confirm: 'Confirmer le mot de passe',
    auth_password_forgot: 'Mot de passe oublié ?',
    auth_password_mismatch: 'Les mots de passe ne correspondent pas',
    auth_username: "Nom d'utilisateur",
    auth_username_ph: 'ex: John Doe',
    auth_login_btn: 'Connexion →',
    auth_register_btn: 'Créer le compte →',
    auth_no_account: 'Pas encore de compte ?',
    auth_register_link: 'Inscription gratuite',
    auth_have_account: 'Déjà un compte ?',
    auth_login_link: 'Se connecter',
    auth_strength_0: '',
    auth_strength_1: 'Faible',
    auth_strength_2: 'Moyen',
    auth_strength_3: 'Fort',
    auth_strength_4: 'Très fort',
    auth_err_fill: 'Remplis tous les champs.',
    auth_err_invalid: 'Identifiants invalides.',
    auth_err_register: 'Impossible de créer le compte.',
    auth_err_forgot_email: 'Entre ton email pour recevoir le lien de réinitialisation.',
    auth_forgot_sent: 'Lien de réinitialisation envoyé à',

    // Sidebar
    side_sub: 'VPN Manager',
    side_nav: 'Navigation',
    side_account: 'Compte',
    side_dashboard: 'Dashboard',
    side_nodes: 'Noeuds',
    side_connections: 'Connexions',
    side_alerts: 'Alertes',
    side_api_keys: 'Clés API',
    side_settings: 'Paramètres',
    side_account_label: 'Compte',
    side_logout: 'Déconnexion',
  },
  en: {
    // Auth
    auth_tagline_login_1: 'Your VPN nodes,',
    auth_tagline_login_2: 'in your control.',
    auth_desc_login: 'One-command deployment. Unified interface. No third-party dependency.',
    auth_tagline_register_1: 'Ready in',
    auth_tagline_register_2: 'one command.',
    auth_desc_register: 'Create your account, add a node, connect. All in under 5 minutes.',
    auth_login_title: 'Sign in to your account',
    auth_register_title: 'Create a free account',
    auth_oauth_notice: 'OAuth available once the backend ships.',
    auth_oauth_github: 'Continue with GitHub',
    auth_oauth_google: 'Continue with Google',
    auth_or_email: 'or with email',
    auth_email: 'Email',
    auth_email_ph: 'e.g. you@example.com',
    auth_password: 'Password',
    auth_password_confirm: 'Confirm password',
    auth_password_forgot: 'Forgot password?',
    auth_password_mismatch: 'Passwords do not match',
    auth_username: 'Username',
    auth_username_ph: 'e.g. JohnDoe',
    auth_login_btn: 'Sign in →',
    auth_register_btn: 'Create account →',
    auth_no_account: 'No account yet?',
    auth_register_link: 'Free signup',
    auth_have_account: 'Already have an account?',
    auth_login_link: 'Sign in',
    auth_strength_0: '',
    auth_strength_1: 'Weak',
    auth_strength_2: 'Medium',
    auth_strength_3: 'Strong',
    auth_strength_4: 'Very strong',
    auth_err_fill: 'Fill in all fields.',
    auth_err_invalid: 'Invalid credentials.',
    auth_err_register: 'Could not create account.',
    auth_err_forgot_email: 'Enter your email to receive the reset link.',
    auth_forgot_sent: 'Reset link sent to',

    // Sidebar
    side_sub: 'VPN Manager',
    side_nav: 'Navigation',
    side_account: 'Account',
    side_dashboard: 'Dashboard',
    side_nodes: 'Nodes',
    side_connections: 'Connections',
    side_alerts: 'Alerts',
    side_api_keys: 'API keys',
    side_settings: 'Settings',
    side_account_label: 'Account',
    side_logout: 'Sign out',
  },
}

export function useT() {
  const cookie = useCookie<Lang>('umbra-lang', {
    default: () => 'fr',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  const lang = useState<Lang>('umbra-lang', () => cookie.value || 'fr')

  function setLang(l: Lang) {
    lang.value = l
    cookie.value = l
  }

  function t(key: string): string {
    return TR[lang.value]?.[key] ?? TR.fr[key] ?? key
  }

  return { lang, setLang, t }
}
