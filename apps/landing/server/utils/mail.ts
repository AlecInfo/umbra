import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.infomaniak.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'contact@umbravpn.io',
    pass: process.env.SMTP_PASS || ''
  },
  tls: {
    ciphers: 'SSLv3'
  }
})

interface SendMailOptions {
  to: string
  subject: string
  html: string
}

export async function sendMail({ to, subject, html }: SendMailOptions) {
  await transporter.sendMail({
    from: '"UMBRA" <contact@umbravpn.io>',
    to,
    subject,
    html
  })
}