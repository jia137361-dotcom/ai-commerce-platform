export type AccountSettingPlaceholder = {
  slug: string
  title: string
  description: string
  availableNow: string
  unavailable: string
}

export const accountSettingPlaceholders: AccountSettingPlaceholder[] = [
  {
    slug: "security",
    title: "Account & Security",
    description: "Review the current buyer-session boundary without implying production security controls.",
    availableNow: "Email/password sign-in, buyer session refresh, sign out, and buyer-only client-state cleanup.",
    unavailable: "Password reset or change, email verification, MFA, session management, and account deletion.",
  },
]

export const findAccountSettingPlaceholder = (path: string) =>
  accountSettingPlaceholders.find((setting) => path === `/account/${setting.slug}` || path.startsWith(`/account/${setting.slug}?`))
