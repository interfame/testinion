import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { setSessionCookie, hashPassword, generateApiKey, jsonError, jsonOk, handle } from '@/lib/auth'
import { notify } from '@/lib/notify'
import { getReferralConfig, usdLabel } from '@/lib/referral'
import { sendTemplateEmail, generateVerifyCode, brandNameOf } from '@/lib/email'

export async function POST(req: NextRequest) {
  return handle(async () => {
    const { name, email, password, currency, language, storefrontSlug, ref } = await req.json()
    if (!name || !email || !password) return jsonError('All fields are required')
    if (typeof password !== 'string' || password.length < 6) return jsonError('Password must be at least 6 characters')
    const cleanEmail = String(email).toLowerCase().trim()
    const exists = await db.user.findUnique({ where: { email: cleanEmail } })
    if (exists) return jsonError('An account with this email already exists')
    const domain = cleanEmail.split('@')[1] ?? ''
    if (domain) {
      const bl = await db.blacklist.findFirst({ where: { platformId: null, type: 'EMAIL', value: { contains: domain } } })
      if (bl) return jsonError('Registrations from this email domain are not accepted')
    }

    // Optional: register under a reseller storefront (white-label sign-up)
    let platformId: string | null = null
    if (storefrontSlug) {
      const storefront = await db.platform.findUnique({ where: { slug: String(storefrontSlug) } })
      if (!storefront || storefront.status !== 'ACTIVE') return jsonError('This storefront is not accepting registrations')
      platformId = storefront.id
    }

    // Referral program config (Admin → Settings → Referral program)
    const refCfg = await getReferralConfig()

    // Optional: referral attribution (Account → Refer & earn links use ?ref=CODE)
    let referredById: string | null = null
    if (ref && refCfg.enabled) {
      const referrer = await db.user.findUnique({ where: { refCode: String(ref).trim().toUpperCase() } })
      if (referrer && referrer.status === 'ACTIVE') referredById = referrer.id
    }

    // Optional: email verification codes for new signups (Admin → Email → toggle)
    const verificationSetting = await db.setting.findUnique({ where: { key: 'verification_required' } })
    const verificationRequired = verificationSetting?.value === '1'

    const user = await db.user.create({
      data: {
        name: String(name).trim(),
        email: cleanEmail,
        password: hashPassword(String(password)),
        apiKey: generateApiKey('gr'),
        currency: currency || 'USD',
        language: language || 'en',
        platformId,
        referredById,
        balance: refCfg.welcomeCredit,
        // Pending until the emailed code is confirmed (welcome credit already granted here)
        ...(verificationRequired ? { status: 'PENDING', verifyCode: generateVerifyCode(), verifyExpires: new Date(Date.now() + 15 * 60 * 1000) } : {}),
      },
    })
    await db.transaction.create({
      data: { userId: user.id, type: 'ADJUSTMENT', amount: refCfg.welcomeCredit, description: `Welcome bonus — ${usdLabel(refCfg.welcomeCredit)} free credit 🎉` },
    })
    await notify(user.id, 'SYSTEM', 'Welcome to GrowthRush! 🎉', `Your ${usdLabel(refCfg.welcomeCredit)} welcome credit is ready — explore the catalog and place your first order.`, 'services')
    if (referredById) {
      await notify(referredById, 'MONEY', 'New referral joined 🤝', `${user.name} signed up with your referral link — you'll earn ${usdLabel(refCfg.bonusAmount)} when their first order completes.`, 'account')
    }

    if (verificationRequired) {
      // Send the 6-digit code (outbox demo mode → return it so the UI can show it)
      const code = user.verifyCode as string
      const platform = await brandNameOf(platformId)
      const res = await sendTemplateEmail(platformId, 'verify_code', cleanEmail, { name: user.name, code, platform })
      // Best-effort heads-up for the platform owner (best-effort, never blocks)
      if (platformId) {
        try {
          const storefront = await db.platform.findUnique({ where: { id: platformId }, select: { ownerId: true, name: true } })
          if (storefront) {
            const owner = await db.user.findUnique({ where: { id: storefront.ownerId }, select: { email: true } })
            if (owner) {
              await sendTemplateEmail(platformId, 'new_client', owner.email, { name: user.name, email: cleanEmail, platform: storefront.name })
            }
            await notify(storefront.ownerId, 'SYSTEM', 'New client on your platform 🥳', `${user.name} (${cleanEmail}) just signed up — pending email verification.`, 'clients')
          }
        } catch { /* never blocks signup */ }
      }
      return jsonOk({ ok: true, verifyRequired: true, ...(res.mode === 'outbox' ? { devCode: code } : {}) })
    }

    await setSessionCookie(user.id)

    // Welcome email + platform-owner heads-up (best-effort — never blocks signup)
    try {
      const platform = await brandNameOf(platformId)
      await sendTemplateEmail(platformId, 'welcome', cleanEmail, { name: user.name, platform })
      if (platformId) {
        const storefront = await db.platform.findUnique({ where: { id: platformId }, select: { ownerId: true, name: true } })
        if (storefront) {
          const owner = await db.user.findUnique({ where: { id: storefront.ownerId }, select: { email: true } })
          if (owner) {
            await sendTemplateEmail(platformId, 'new_client', owner.email, { name: user.name, email: cleanEmail, platform: storefront.name })
          }
          await notify(storefront.ownerId, 'SYSTEM', 'New client on your platform 🥳', `${user.name} (${cleanEmail}) just created an account on ${storefront.name}.`, 'clients')
        }
      }
    } catch { /* never blocks signup */ }

    return jsonOk({ ok: true, role: user.role })
  })
}
