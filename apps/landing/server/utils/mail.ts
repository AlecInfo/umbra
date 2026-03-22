import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

let transporter: Transporter | null = null

function getTransporter() {
  if (!transporter) {
    const config = useRuntimeConfig()
    transporter = nodemailer.createTransport({
      host: config.smtpHost || 'mail.infomaniak.com',
      port: Number(config.smtpPort) || 587,
      secure: false,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass
      },
      tls: {
        ciphers: 'SSLv3'
      }
    })
  }
  return transporter
}

interface SendMailOptions {
  to: string
  subject: string
  html: string
}

export async function sendMail({ to, subject, html }: SendMailOptions) {
  const config = useRuntimeConfig()
  await getTransporter().sendMail({
    from: `"UMBRA" <${config.smtpUser || 'contact@umbravpn.io'}>`,
    to,
    subject,
    html
  })
}