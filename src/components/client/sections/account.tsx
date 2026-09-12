'use client'

// Client portal — Account (profile, security, preferences, API key, danger zone)

import { useState } from 'react'
import {
  Gift, Globe2, KeyRound, Loader2, Lock, LogOut, Medal, Save, ShieldCheck, Trash2, UserRound,
} from 'lucide-react'
import { useApp } from '@/components/shared/app-context'
import { useI18n, LANGS, type Lang } from '@/lib/i18n'
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { CopyField } from '@/components/shared/chips'
import { api, mutate, useApi } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { formatDate, formatMoney } from '@/lib/format'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardHead } from '../bits'
import type { MePatchResult } from '../types'

/* ------------------------------ referral squad ----------------------------- */

type MeReferrals = {
  friends: { id: string; name: string; createdAt: string; status: string; completedOrders: number; spent: number; bonusPaid: boolean }[]
  totals: { count: number; earned: number; active: number }
  config: { enabled: boolean; bonusLabel: string; welcomeLabel: string }
}

const SQUAD_MEDALS = ['#f59e0b', '#94a3b8', '#b45309'] // gold · silver · bronze

/** Replace the hardcoded "$1"/"$1.00" in i18n copy with the live configured amount. */
function interpolate(s: string, amount: string): string {
  return s.split('$1.00').join(amount).replace(/\$1(?![\d.])/g, amount)
}

function initialsOf(name: string): string {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function AccountSection({ onLogout }: { onLogout: () => void }) {
  const { user, setUser, refresh, currencies, currencyOf } = useApp()
  const { t, lang, setLang } = useI18n()

  // Profile
  const [name, setName] = useState(user.name)
  const [savingProfile, setSavingProfile] = useState(false)

  // Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const [savingPrefs, setSavingPrefs] = useState(false)

  // Referral squad (friends who joined via my link) + live program config
  const { data: refData } = useApi<MeReferrals>('/api/me/referrals')
  const bonusLabel = refData?.config.bonusLabel ?? '$1'
  const welcomeLabel = refData?.config.welcomeLabel ?? '$1'
  const squad = [...(refData?.friends ?? [])].sort(
    (a, b) => b.completedOrders - a.completedOrders || Number(b.bonusPaid) - Number(a.bonusPaid),
  )
  const squadMax = Math.max(1, ...squad.map((f) => f.completedOrders))

  async function applyUser(res: MePatchResult | null) {
    if (res?.user) setUser(res.user)
    else refresh()
  }

  async function saveProfile() {
    setSavingProfile(true)
    const res = await mutate(() => api.patch<MePatchResult>('/api/me', { name }), { success: t('cacc.profileUpdated') })
    setSavingProfile(false)
    await applyUser(res)
  }

  async function savePassword() {
    if (newPassword !== confirmPassword) {
      toast({ title: t('cacc.pwMismatch'), variant: 'destructive' })
      return
    }
    setSavingPassword(true)
    const res = await mutate(
      () => api.patch<MePatchResult>('/api/me', { currentPassword, newPassword }),
      { success: t('cacc.pwChanged') },
    )
    setSavingPassword(false)
    if (res) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  async function updatePref(body: Record<string, unknown>) {
    setSavingPrefs(true)
    const res = await mutate(() => api.patch<MePatchResult>('/api/me', body), { silent: true })
    setSavingPrefs(false)
    if (res?.user) {
      setUser({ ...user, currency: res.user.currency, language: res.user.language, twoFactorEnabled: res.user.twoFactorEnabled })
    } else {
      refresh()
    }
  }

  async function regenerateKey() {
    await mutate(() => api.patch<MePatchResult>('/api/me', { regenerateApiKey: true }), { success: t('cacc.keyRegenerated') })
    refresh()
  }

  return (
    <div className="mx-auto max-w-[900px] p-4 sm:p-6 lg:p-8">
      <PanelPageHeader
        title={t('common.account')}
        description={t('cacc.memberSince').replace('{d}', user.createdAt ? formatDate(user.createdAt) : t('cacc.today'))}
      />

      <div className="space-y-4">
        {/* Profile */}
        <Card>
          <CardHead icon={UserRound} title={t('cacc.profile')} sub={t('cacc.profileSub')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="acc-name">{t('auth.name')}</Label>
              <Input id="acc-name" className="min-h-[40px]" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-email">{t('auth.email')}</Label>
              <Input id="acc-email" className="min-h-[40px] bg-zinc-50 dark:bg-zinc-900/60" value={user.email} disabled />
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{t('cacc.emailFixed')}</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              className="min-h-[40px] gap-1.5 text-[var(--on-brand)]"
              style={{ background: 'var(--brand)' }}
              onClick={saveProfile}
              disabled={savingProfile || name.trim() === user.name || !name.trim()}
            >
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('common.save')}
            </Button>
          </div>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHead icon={Globe2} title={t('cacc.prefs')} sub={t('cacc.prefsSub')} />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{t('cacc.currency')}</Label>
              <Select
                value={user.currency}
                onValueChange={(v) => updatePref({ currency: v })}
              >
                <SelectTrigger className="min-h-[40px] w-full"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="flex items-center gap-2"><span className="w-5 text-zinc-400 dark:text-zinc-500">{c.symbol}</span> {c.code}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{t('cacc.currencyHint')}</p>
            </div>
            <div className="space-y-1.5">
              <Label>{t('cacc.language')}</Label>
              <Select
                value={user.language as string}
                onValueChange={(v) => {
                  setLang(v as Lang)
                  updatePref({ language: v })
                }}
              >
                <SelectTrigger className="min-h-[40px] w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGS.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      <span className="flex items-center gap-2">{l.flag} {l.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
              <div>
                <Label htmlFor="acc-2fa" className="text-[13px]">{t('cacc.twoFa')}</Label>
                <p className="mt-0.5 text-[11px] leading-snug text-zinc-400 dark:text-zinc-500">{t('cacc.twoFaSub')}</p>
              </div>
              <Switch
                id="acc-2fa"
                checked={user.twoFactorEnabled}
                onCheckedChange={(v) => updatePref({ twoFactorEnabled: v })}
                disabled={savingPrefs}
              />
            </div>
          </div>
        </Card>

        {/* Security: password */}
        <Card>
          <CardHead icon={Lock} title={t('cacc.changePw')} sub={t('cacc.changePwSub')} />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-curpass">{t('cacc.currentPw')}</Label>
              <Input id="acc-curpass" type="password" className="min-h-[40px]" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-newpass">{t('cacc.newPw')}</Label>
              <Input id="acc-newpass" type="password" className="min-h-[40px]" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-confpass">{t('cacc.confirmPw')}</Label>
              <Input id="acc-confpass" type="password" className="min-h-[40px]" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              className="min-h-[40px] gap-1.5"
              onClick={savePassword}
              disabled={savingPassword || !currentPassword || newPassword.length < 6 || !confirmPassword}
            >
              {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {t('cacc.updatePw')}
            </Button>
          </div>
        </Card>

        {/* API key */}
        <Card>
          <CardHead
            icon={KeyRound}
            title={t('cacc.apiKey')}
            sub={t('cacc.apiKeySub')}
            right={
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 min-h-[32px] gap-1 rounded-full text-[12px] font-bold">
                    <KeyRound className="h-3 w-3" /> {t('cacc.regenerate')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('cacc.regenerateQ')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('cacc.regenerateDesc')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction className="text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} onClick={regenerateKey}>
                      {t('cacc.regenerateYes')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            }
          />
          <CopyField value={user.apiKey} />
        </Card>

        {/* Refer & earn */}
        <Card>
          <CardHead
            icon={Gift}
            title={t('account.refTitle')}
            sub={interpolate(t('account.refSub'), bonusLabel)}
            right={
              refData && !refData.config.enabled ? (
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-extrabold text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
                  {t('account.refPaused')}
                </span>
              ) : undefined
            }
          />
          <div className="grid gap-3 sm:grid-cols-5">
            <div
              className="relative overflow-hidden rounded-xl p-4 text-white sm:col-span-2"
              style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark, var(--brand)))' }}
            >
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-white/[0.07]" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">{t('account.refEarnedLabel')}</p>
              <p className="mt-1 text-[26px] font-black leading-tight tracking-tight">
                {formatMoney(user.referralEarned ?? 0, currencyOf(user.currency), lang)}
              </p>
              <p className="mt-1 text-[12px] font-semibold text-white/85">
                {user.referralCount ?? 0} {t('account.refFriends')}
              </p>
              <div className="mt-3 flex items-center gap-1.5 border-t border-white/20 pt-2.5 text-[11px] font-bold text-white/90">
                <Medal className="h-3.5 w-3.5" />
                {refData ? t('account.refActive').replace('{n}', String(refData.totals.active)) : '…'}
              </div>
            </div>
            <div className="flex flex-col justify-center gap-2 sm:col-span-3">
              <Label className="text-[12px] text-zinc-500 dark:text-zinc-400">{t('account.refLink')}</Label>
              <CopyField
                value={typeof window !== 'undefined' && user.refCode ? `${window.location.origin}/?ref=${user.refCode}` : '…'}
              />
              {refData?.config.enabled !== false && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11.5px] font-semibold text-zinc-400 dark:text-zinc-500">{t('account.refShare')}</span>
                  {(() => {
                    const link = typeof window !== 'undefined' && user.refCode ? `${window.location.origin}/?ref=${user.refCode}` : ''
                    const msg = encodeURIComponent(interpolate(t('account.refShareMsg'), welcomeLabel))
                    const url = encodeURIComponent(link)
                    const shares = [
                      { label: 'WhatsApp', href: `https://wa.me/?text=${msg}%20${url}` },
                      { label: 'Telegram', href: `https://t.me/share/url?url=${url}&text=${msg}` },
                      { label: 'X', href: `https://twitter.com/intent/tweet?url=${url}&text=${msg}` },
                    ]
                    return shares.map((s) => (
                      <a
                        key={s.label}
                        href={s.href}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-zinc-200 dark:border-zinc-800 px-2.5 py-1 text-[11px] font-bold text-zinc-600 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                      >
                        {s.label}
                      </a>
                    ))
                  })()}
                </div>
              )}
              {refData && refData.config.enabled === false && (
                <p className="text-[11.5px] leading-relaxed text-zinc-400 dark:text-zinc-500">{t('account.refPausedNote')}</p>
              )}
            </div>
          </div>
          <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-3 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            <Gift className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--brand)' }} />
            {interpolate(t('account.refHow'), bonusLabel)}
          </p>

          {/* My squad — friends who joined with my link, ranked by activity */}
          {squad.length > 0 && (
            <div className="mt-4 border-t border-zinc-100 dark:border-zinc-800/70 pt-4">
              <div className="mb-3 flex items-center justify-between gap-2 px-0.5">
                <div>
                  <p className="flex items-center gap-1.5 text-[13.5px] font-extrabold">
                    <Medal className="h-4 w-4" style={{ color: 'var(--brand)' }} />
                    {t('account.refSquad')}
                    <span className="rounded-full bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-px text-[10.5px] font-black text-zinc-500 dark:text-zinc-400">{squad.length}</span>
                  </p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{t('account.refSquadSub')}</p>
                </div>
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto gr-scroll pr-1">
                {squad.map((f, i) => {
                  const rank = f.bonusPaid ? i : squad.length // active friends first, pending ones unranked visually
                  return (
                    <div key={f.id} className="group flex items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 transition hover:border-zinc-200 hover:bg-zinc-50 dark:hover:border-zinc-800 dark:hover:bg-zinc-900/60">
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black"
                        style={
                          f.bonusPaid && i < 3
                            ? { background: SQUAD_MEDALS[i], color: 'white' }
                            : { background: 'color-mix(in srgb, var(--brand) 12%, transparent)', color: 'var(--brand)' }
                        }
                      >
                        {i + 1}
                      </span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white" style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-2))' }}>
                        {initialsOf(f.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-bold">{f.name}</p>
                        <p className="truncate text-[10.5px] text-zinc-400 dark:text-zinc-500">
                          {t('account.refJoined')} {formatDate(f.createdAt, lang)}
                        </p>
                      </div>
                      <div className="hidden w-20 sm:block">
                        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(6, (f.completedOrders / squadMax) * 100)}%`, background: 'var(--brand)' }} />
                        </div>
                        <p className="mt-0.5 text-right text-[9.5px] font-bold text-zinc-400 dark:text-zinc-500">{f.completedOrders}/1 {t('account.refFirstOrder')}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          f.bonusPaid
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}
                      >
                        {f.bonusPaid ? `✓ ${interpolate(t('account.refBonusEarned'), bonusLabel)}` : t('account.refPending')}
                      </span>
                      <span className="sr-only">{t('cacc.rankSr').replace('{n}', String(rank + 1))}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Danger zone */}
        <Card className="border-rose-200 dark:border-rose-900/60">
          <CardHead
            icon={Trash2}
            title={t('cacc.danger')}
            sub={t('cacc.dangerSub')}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 p-4">
            <div>
              <p className="text-[13.5px] font-extrabold text-rose-800">{t('cacc.logoutDevice')}</p>
              <p className="text-[12px] text-rose-600/80">{t('cacc.logoutDeviceSub')}</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="min-h-[40px] gap-1.5 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60">
                  <LogOut className="h-4 w-4" /> {t('auth.logout')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('cacc.logoutQ')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('cacc.logoutDesc')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={onLogout}>
                    {t('auth.logout')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
      </div>
    </div>
  )
}
