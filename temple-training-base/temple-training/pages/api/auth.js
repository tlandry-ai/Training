import { setCookie } from 'cookies-next'

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { password } = req.body

  if (password === process.env.APP_PASSWORD) {
    setCookie('auth', process.env.APP_PASSWORD, {
      req, res,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    })
    return res.status(200).json({ ok: true })
  }

  return res.status(401).json({ ok: false })
}
