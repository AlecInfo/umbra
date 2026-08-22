import mail from '@adonisjs/mail/services/main'
import env from '#start/env'

/*
| Every secret this file mails is also returned to the caller when no mail was
| sent, so a deployment without SMTP keeps working exactly as before. Nothing
| here throws: failing to send an invitation must not fail the invitation.
|
| When a message does go out, the secret is NOT returned to the caller — it has
| a delivery path, and echoing it back only widens where it can be read from.
*/

export function isMailConfigured(): boolean {
  return Boolean(env.get('SMTP_HOST'))
}

function webUrl(path = ''): string {
  const base = (env.get('WEB_PUBLIC_URL') ?? 'http://localhost:3000').replace(/\/+$/, '')
  return `${base}${path}`
}

async function send(to: string, subject: string, body: string): Promise<boolean> {
  if (!isMailConfigured()) return false
  try {
    await mail.send((message) => {
      message.to(to).subject(subject).text(body)
    })
    return true
  } catch (err) {
    // A bounced invitation is not a reason to fail the request that created it.
    // The caller falls back to handing the secret over itself.
    console.error(`Sending "${subject}" to ${to} failed:`, err)
    return false
  }
}

export function sendOrgInvitation(
  to: string,
  orgName: string,
  inviterName: string,
  token: string
): Promise<boolean> {
  return send(
    to,
    `${inviterName} vous invite à rejoindre ${orgName} sur UMBRA`,
    [
      `${inviterName} vous invite à rejoindre l'organisation « ${orgName} » sur UMBRA.`,
      '',
      "Créez un compte ou connectez-vous, puis collez ce code dans Paramètres → Équipe :",
      '',
      `    ${token}`,
      '',
      `UMBRA : ${webUrl()}`,
      '',
      "Cette invitation expire dans 7 jours. Si vous ne l'attendiez pas, ignorez ce message.",
    ].join('\n')
  )
}

export function sendProvisionedAccount(to: string, tempPassword: string): Promise<boolean> {
  return send(
    to,
    'Votre compte UMBRA a été créé',
    [
      'Un compte UMBRA a été créé pour vous.',
      '',
      `    Adresse    : ${to}`,
      `    Mot de passe temporaire : ${tempPassword}`,
      '',
      `Connectez-vous sur ${webUrl('/login')}.`,
      'Il vous sera demandé de choisir un nouveau mot de passe avant de continuer.',
    ].join('\n')
  )
}

export function sendPasswordReset(to: string, tempPassword: string): Promise<boolean> {
  return send(
    to,
    'Votre mot de passe UMBRA a été réinitialisé',
    [
      "Le mot de passe de votre compte UMBRA a été réinitialisé par l'opérateur de l'instance.",
      'Vos sessions en cours ont été fermées.',
      '',
      `    Mot de passe temporaire : ${tempPassword}`,
      '',
      `Connectez-vous sur ${webUrl('/login')} et choisissez un nouveau mot de passe.`,
      "Si vous n'êtes pas à l'origine de cette demande, contactez votre opérateur.",
    ].join('\n')
  )
}
