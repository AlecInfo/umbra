import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

/*
| Mail is optional on purpose.
|
| A self-hosted instance may have no SMTP server at all, and the product has to
| stay usable without one: when SMTP_HOST is unset, nothing is sent and the
| secrets that would have been mailed (invitation tokens, temporary passwords)
| are returned to the caller to hand over out of band, exactly as before.
| See services/mailer.ts.
*/
const mailConfig = defineConfig({
  default: 'smtp',
  from: {
    address: env.get('MAIL_FROM', 'umbra@localhost'),
    name: env.get('MAIL_FROM_NAME', 'UMBRA'),
  },
  mailers: {
    smtp: transports.smtp({
      host: env.get('SMTP_HOST', 'localhost'),
      port: env.get('SMTP_PORT', 587),
      secure: env.get('SMTP_SECURE', false),
      auth: env.get('SMTP_USER')
        ? {
            type: 'login',
            user: env.get('SMTP_USER')!,
            pass: env.get('SMTP_PASS', ''),
          }
        : undefined,
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
