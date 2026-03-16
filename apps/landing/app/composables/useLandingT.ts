// ─── Translations ────────────────────────────────────────────────────────────
// Composable Nuxt auto-importé : gère la langue (SSR-safe via useState +
// useCookie) et expose t() pour les templates.
// ─────────────────────────────────────────────────────────────────────────────

export type Lang = 'fr' | 'en'

const TR: Record<Lang, Record<string, string>> = {
  fr: {
    banner_text: 'UMBRA est en développement actif', banner_cta: 'Rejoindre la bêta →',

    nav_why: 'Pourquoi UMBRA', nav_terminal: 'CLI', nav_how: 'Comment ça marche',
    nav_opensource: 'Open-source', nav_pricing: 'Tarifs', nav_cta: 'Rejoindre la waitlist →',

    hero_eyebrow: 'Bêta privée · WireGuard · Mesh networking',
    hero_t1: 'Tes données.', hero_t2: 'Ton réseau.', hero_t3: 'Zéro compromis.',
    hero_sub: 'UMBRA est un client VPN open-source qui se connecte à ton infrastructure. Pas la nôtre. Tes données ne transitent que par des serveurs que tu contrôles.',
    email_ph: 'ton@email.com',
    hero_cta: 'Rejoindre la waitlist →', hero_sent: '✓ Tu es sur la liste',
    hero_note: 'Gratuit en self-hosted · Open-source · Accès anticipé bientôt disponible',

    strip_proto: 'Protocole', strip_enc: 'Chiffré E2E', strip_lat: 'Latence typique', strip_self: 'Auto-hébergeable',

    prob_eyebrow: 'Le problème',
    prob_t1: 'Un VPN classique ne te protège pas.', prob_t2: 'Il déplace juste ta confiance.',
    prob_1t: 'Ton trafic passe par leurs serveurs.', prob_1d: 'Tu ne sais pas ce qu\'ils en font, qui y a accès, ni combien de temps ils le conservent.',
    prob_2t: 'Leurs clients sont des boîtes noires.', prob_2d: 'Aucun audit indépendant du code. Tu fais confiance à une société, pas à une cryptographie vérifiable.',
    prob_3t: 'En cas de fuite, de rachat ou de demande légale —', prob_3d: 'tu n\'es pas consulté. Tes données sont sur leurs serveurs, pas les tiens.',
    prob_transition: 'Il existe une autre façon de faire.',

    term_eyebrow: 'Interface CLI', term_title: 'Conçu pour les devs.',
    term_sub: 'Une commande pour connecter ton noeud. Tout le reste se configure depuis le dashboard.',

    pill_eyebrow: 'Fonctionnalités', pill_title: 'Conçu pour ceux qui ne font pas confiance par défaut.',
    pill_1t: 'Zéro tiers de confiance', pill_1d: 'UMBRA se connecte à tes serveurs. On ne touche jamais à tes données — physiquement impossible.',
    pill_1_tag1: 'Tes serveurs uniquement', pill_1_tag2: 'Zéro relais',
    pill_2t: 'WireGuard natif', pill_2d: 'Le protocole le plus rapide et le plus audité. Intégré directement dans le noyau Linux.',
    pill_2_tag1: 'Natif noyau',
    pill_3t: '100% open-source', pill_3d: 'Client, agent, API — tout sera public à la sortie. Lis chaque commit, signale un bug, propose une PR.',
    pill_3_tag2: 'Auditable à la v1',
    pill_4t: 'Une interface, partout', pill_4d: 'Dashboard web, app desktop et mobile. Même codebase, même expérience.',

    ss_eyebrow: 'Aperçu', ss_title: 'L\'interface en un coup d\'oeil.',
    ss_caption: 'Interface en développement actif.',

    dm_nav: 'Navigation', dm_compte: 'Compte',
    dm_dashboard: 'Dashboard', dm_nodes: 'Noeuds', dm_connections: 'Connexions',
    dm_alerts: 'Alertes', dm_apikeys: 'Clés API', dm_settings: 'Paramètres',
    dm_vpnmgr: 'VPN Manager', dm_freeplan: 'Plan gratuit',
    dm_addnode: 'Nouveau nœud', dm_card_nodes: 'Nœuds',
    dm_nodes_online: 'nœuds en ligne',
    dm_status_online: 'En ligne', dm_status_connected: 'Connecté',
    dm_status_warning: 'Avert.', dm_status_offline: 'Hors ligne',
    dm_connect: 'Connecter', dm_cut: 'Couper', dm_disconnect: 'Déconnecter',
    dm_latency: 'Latence', dm_upload: 'Upload', dm_download: 'Download',

    how_note_label: 'Note',
    how_step3_status: 'connecté',
    how_eyebrow: 'Comment ça fonctionne', how_title: 'Zéro configuration manuelle.',
    how_sub: 'Pas d\'échange de clés. Pas de fichier de config. Un copier-coller suffit pour tout mettre en place.',
    how_1t: 'Déploie Umbra sur ton serveur', how_1d: 'Lance le script d\'installation sur ton VPS ou serveur perso. Headscale, WireGuard, l\'API et le dashboard se configurent et démarrent automatiquement.',
    how_2t: 'Ajoute un nœud en une commande', how_2d: 'Depuis le dashboard ou la CLI, renseigne le nom et la catégorie de ton nœud. UMBRA génère une commande curl — colle-la dans le terminal de la machine cible. L\'agent s\'installe, WireGuard et l\'authentification se configurent tous seuls. Rien d\'autre à faire.',
    how_3t: 'Connecte-toi depuis n\'importe où', how_3d: 'Client web, app desktop, mobile ou CLI — parcours tes nœuds et connecte-toi en un clic. Ton trafic transite uniquement par tes serveurs.',
    how_note: 'UMBRA ne fournit aucun serveur. Tu apportes ton infrastructure, UMBRA s\'occupe du reste.',

    os_eyebrow: 'Transparence', os_title: 'Publié en open-source à la v1.',
    os_desc: 'Le code sera publié sur GitHub à la sortie de la première version. Dashboard, agent Go, API, apps desktop et mobile — tout sera public et auditable. Lis chaque commit, signale un bug, propose une PR.',
    os_btn: 'Bientôt sur GitHub →',
    os_devices: 'Vos appareils', os_servers: 'Vos serveurs',
    os_encrypted: 'chiffré E2E', os_via_infra: 'via votre infra',
    os_notp_txt: 'Zéro tiers de confiance — vos données ne transitent que par vos serveurs.',
    os_trust: 'Pas besoin de nous faire confiance.', os_code: 'Lis le code.',

    pr_eyebrow: 'Tarifs', pr_title: 'Les tarifs arrivent.',
    pr_sub: 'Pas de pricing tant que l\'application n\'est pas terminée. Rejoins la waitlist pour être notifié en premier.',

    use_eyebrow: 'Cas d\'usage', use_title: 'Pour qui ?',
    use_1_label: 'Développeur', use_1_name: 'Le dev en remote',
    use_1_quote: 'Connecte ton laptop à ton homelab depuis n\'importe où. Sans exposer de port, sans VPN d\'entreprise opaque.',
    use_2_label: 'Équipe technique', use_2_name: 'L\'équipe distribuée',
    use_2_quote: 'Un noeud par région, un dashboard pour tout voir. Chaque membre de l\'équipe sur le même réseau privé.',
    use_3_label: 'Privacy', use_3_name: 'Le passionné de privacy',
    use_3_quote: 'Ton trafic passe par ton VPS. Personne d\'autre n\'y a accès — ni ton FAI, ni une entreprise VPN.',

    cta_t1: 'Sois parmi les premiers', cta_t2: 'à tester UMBRA.',
    cta_sub: 'UMBRA est en développement actif. Rejoins la liste et on te prévient quand la bêta ouvre.',
    cta_btn: 'Rejoindre la waitlist →', cta_sent: '✓ Tu es sur la liste. À bientôt.',
    cta_note: 'Aucun spam · Se désinscrire à tout moment',

    footer_sub: 'Client VPN self-hosted construit sur WireGuard et Headscale.',
    footer_col1: 'Produit', footer_col2: 'Développeurs', footer_col3: 'Société',
    footer_docs: 'Documentation', footer_api: 'Référence API', footer_agent: 'Agent', footer_changelog: 'Changelog',
    footer_about: 'À propos', footer_contact: 'Contact', footer_privacy: 'Vie privée', footer_terms: 'Conditions',
    footer_copy: '© 2025-2026 UMBRA · Open-source · Politique de confidentialité'
  },
  en: {
    banner_text: 'UMBRA is in active development', banner_cta: 'Join the beta →',

    nav_why: 'Why UMBRA', nav_terminal: 'CLI', nav_how: 'How it works',
    nav_opensource: 'Open-source', nav_pricing: 'Pricing', nav_cta: 'Join the waitlist →',

    hero_eyebrow: 'Private beta · WireGuard · Mesh networking',
    hero_t1: 'Your data.', hero_t2: 'Your network.', hero_t3: 'Zero compromise.',
    hero_sub: 'UMBRA is an open-source VPN client that connects to your infrastructure. Not ours. Your traffic only flows through servers you control.',
    email_ph: 'your@email.com',
    hero_cta: 'Join the waitlist →', hero_sent: '✓ You\'re on the list',
    hero_note: 'Free to self-host · Open-source · Early access coming soon',

    strip_proto: 'Protocol', strip_enc: 'E2E Encrypted', strip_lat: 'Typical latency', strip_self: 'Self-hostable',

    prob_eyebrow: 'The problem',
    prob_t1: 'A classic VPN doesn\'t protect you.', prob_t2: 'It just moves your trust.',
    prob_1t: 'Your traffic goes through their servers.', prob_1d: 'You have no idea what they do with it, who has access, or how long they keep it.',
    prob_2t: 'Their clients are black boxes.', prob_2d: 'No independent code audit. You\'re trusting a company, not verifiable cryptography.',
    prob_3t: 'In case of a breach, acquisition, or legal request —', prob_3d: 'you\'re not consulted. Your data is on their servers, not yours.',
    prob_transition: 'There\'s another way.',

    term_eyebrow: 'CLI', term_title: 'Built for devs.',
    term_sub: 'One command to connect your node. Everything else is configured from the dashboard.',

    pill_eyebrow: 'Features', pill_title: 'Built for those who don\'t trust by default.',
    pill_1t: 'Zero third-party', pill_1d: 'UMBRA connects to your servers. We never touch your data — physically impossible.',
    pill_1_tag1: 'Your servers only', pill_1_tag2: 'Zero relay',
    pill_2t: 'Native WireGuard', pill_2d: 'The fastest and most audited protocol. Built directly into the Linux kernel.',
    pill_2_tag1: 'Kernel-native',
    pill_3t: '100% open-source', pill_3d: 'Client, agent, API — everything goes public at launch. Read every commit, file an issue, open a PR.',
    pill_3_tag2: 'Auditable at v1',
    pill_4t: 'One interface, everywhere', pill_4d: 'Web dashboard, desktop and mobile app. Same codebase, same experience.',

    ss_eyebrow: 'Preview', ss_title: 'The interface at a glance.',
    ss_caption: 'Interface in active development.',

    dm_nav: 'Navigation', dm_compte: 'Account',
    dm_dashboard: 'Dashboard', dm_nodes: 'Nodes', dm_connections: 'Connections',
    dm_alerts: 'Alerts', dm_apikeys: 'API Keys', dm_settings: 'Settings',
    dm_vpnmgr: 'VPN Manager', dm_freeplan: 'Free plan',
    dm_addnode: 'New node', dm_card_nodes: 'Nodes',
    dm_nodes_online: 'nodes online',
    dm_status_online: 'Online', dm_status_connected: 'Connected',
    dm_status_warning: 'Warning', dm_status_offline: 'Offline',
    dm_connect: 'Connect', dm_cut: 'Cut', dm_disconnect: 'Disconnect',
    dm_latency: 'Latency', dm_upload: 'Upload', dm_download: 'Download',

    how_note_label: 'Note',
    how_step3_status: 'connected',
    how_eyebrow: 'How it works', how_title: 'Zero manual configuration.',
    how_sub: 'No key exchange. No config files. One paste is all it takes to get everything running.',
    how_1t: 'Deploy Umbra on your server', how_1d: 'Run the install script on your VPS or personal server. Headscale, WireGuard, the API and the dashboard configure and start automatically.',
    how_2t: 'Add a node with one command', how_2d: 'From the dashboard or CLI, enter your node\'s name and category. UMBRA generates a curl command — paste it in the target machine\'s terminal. The agent installs, WireGuard and auth configure themselves. Nothing else to do.',
    how_3t: 'Connect from anywhere', how_3d: 'Web client, desktop app, mobile or CLI — browse your nodes and connect in one click. Your traffic flows only through your servers.',
    how_note: 'UMBRA doesn\'t provide any servers. You bring the infrastructure, UMBRA handles the rest.',

    os_eyebrow: 'Transparency', os_title: 'Open-sourced at v1 launch.',
    os_desc: 'The code will be published on GitHub at v1 launch. Dashboard, Go agent, API, desktop and mobile apps — everything will be public and auditable. Read every commit, file an issue, open a PR.',
    os_btn: 'Coming to GitHub →',
    os_devices: 'Your devices', os_servers: 'Your servers',
    os_encrypted: 'E2E encrypted', os_via_infra: 'via your infra',
    os_notp_txt: 'Zero third party — your data only flows through servers you control.',
    os_trust: 'No need to trust us.', os_code: 'Read the code.',

    pr_eyebrow: 'Pricing', pr_title: 'Pricing is coming.',
    pr_sub: 'No pricing plans until the app is finished. Join the waitlist to be notified first.',

    use_eyebrow: 'Use cases', use_title: 'Who is it for?',
    use_1_label: 'Developer', use_1_name: 'The remote dev',
    use_1_quote: 'Connect your laptop to your homelab from anywhere. No exposed port, no opaque corporate VPN.',
    use_2_label: 'Engineering team', use_2_name: 'The distributed team',
    use_2_quote: 'One node per region, one dashboard to see it all. Every team member on the same private network.',
    use_3_label: 'Privacy', use_3_name: 'The privacy enthusiast',
    use_3_quote: 'Your traffic goes through your VPS. Nobody else has access — not your ISP, not a VPN company.',

    cta_t1: 'Be among the first', cta_t2: 'to try UMBRA.',
    cta_sub: 'UMBRA is in active development. Join the list and we\'ll reach out when the beta opens.',
    cta_btn: 'Join the waitlist →', cta_sent: '✓ You\'re on the list. See you soon.',
    cta_note: 'No spam · Unsubscribe anytime',

    footer_sub: 'Self-hosted mesh VPN built on WireGuard and Headscale.',
    footer_col1: 'Product', footer_col2: 'Developers', footer_col3: 'Company',
    footer_docs: 'Documentation', footer_api: 'API reference', footer_agent: 'Agent', footer_changelog: 'Changelog',
    footer_about: 'About', footer_contact: 'Contact', footer_privacy: 'Privacy', footer_terms: 'Terms',
    footer_copy: '© 2025-2026 UMBRA · Open-source · Privacy Policy'
  }
}

export function useLandingT() {
  const langCookie = useCookie<Lang>('umbra-lang', {
    default: () => 'fr',
    maxAge: 60 * 60 * 24 * 365,
    path: '/'
  })
  // useState partage l'état entre SSR et client, et entre composants
  const lang = useState<Lang>('umbra-lang', () => langCookie.value ?? 'fr')

  function t(k: string): string {
    return TR[lang.value][k] ?? k
  }

  function setLang(l: Lang) {
    lang.value = l
    langCookie.value = l
  }

  return { lang: readonly(lang), t, setLang }
}
