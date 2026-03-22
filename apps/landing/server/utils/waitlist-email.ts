const t = {
  fr: {
    title: 'Tu es sur la liste !',
    body: 'Merci de ton intérêt pour UMBRA. Tu seras parmi les premiers informés quand la plateforme sera disponible.',
    desc: 'UMBRA est un gestionnaire VPN open-source et auto-hébergé, construit sur WireGuard. Tes données ne transitent que par des serveurs que tu contrôles.',
    cta: 'Découvrir UMBRA',
    footer: (email: string) => `Cet email a été envoyé à ${email} suite à ton inscription sur la waitlist UMBRA.`
  },
  en: {
    title: "You're on the list!",
    body: 'Thanks for your interest in UMBRA. You\'ll be among the first to know when the platform is available.',
    desc: 'UMBRA is an open-source, self-hosted VPN manager built on WireGuard. Your data only flows through servers you control.',
    cta: 'Discover UMBRA',
    footer: (email: string) => `This email was sent to ${email} following your UMBRA waitlist signup.`
  }
}

export function waitlistSubject(lang: string): string {
  return lang === 'fr' ? 'UMBRA — Tu es sur la liste !' : "UMBRA — You're on the list!"
}

export function waitlistConfirmationHtml(email: string, lang: string = 'fr'): string {
  const l = lang === 'fr' ? t.fr : t.en

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <img src="https://umbravpn.io/email-logo.png" alt="UMBRA" width="140" height="36" style="display:block;border:0;" />
            </td>
          </tr>
          <!-- Title -->
          <tr>
            <td style="padding-bottom:16px;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#e8e8f0;line-height:1.3;">
                ${l.title}
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding-bottom:24px;font-size:14px;line-height:1.8;color:rgba(232,232,240,0.6);">
              ${l.body}<br><br>
              ${l.desc}
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding-bottom:32px;">
              <a href="https://umbravpn.io" style="display:inline-block;background:#4fffb0;color:#0a0a0f;font-size:13px;font-weight:600;padding:10px 24px;border-radius:6px;text-decoration:none;">
                ${l.cta}
              </a>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding-bottom:24px;">
              <div style="height:1px;background:rgba(255,255,255,0.07);"></div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="font-size:11px;color:rgba(232,232,240,0.3);line-height:1.7;">
              ${l.footer(email)}<br>
              &copy; ${new Date().getFullYear()} UMBRA — <a href="https://umbravpn.io" style="color:rgba(232,232,240,0.3);">umbravpn.io</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
