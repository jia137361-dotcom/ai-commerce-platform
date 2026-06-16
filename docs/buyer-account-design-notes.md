# Buyer Account Design Notes

Date: 2026-06-16

Branch: `feature/buyer-frontend-integration`

## Source Images Checked

Login/register:

- `designs/buyer-ui/登录注册/Group 72.png`
- `designs/buyer-ui/登录注册/Group 73.png`
- `designs/buyer-ui/登录注册/Group 74.png`
- `designs/buyer-ui/登录注册/Group 75.png`
- `designs/buyer-ui/登录注册/Group 76.png`
- `designs/buyer-ui/登录注册/Group 77.png`
- `designs/buyer-ui/登录注册/Group 78.png`
- `designs/buyer-ui/登录注册/Group 79.png`
- `designs/buyer-ui/登录注册/Group 80.png`
- `designs/buyer-ui/登录注册/Group 81.png`

Profile:

- `designs/buyer-ui/Profile/Profile.png`
- `designs/buyer-ui/Profile/Profile-1.png`
- `designs/buyer-ui/Profile/Profile-2.png`
- `designs/buyer-ui/Profile/Profile-3.png`
- `designs/buyer-ui/Profile/Profile-4.png`

Account security:

- `designs/buyer-ui/Account & Security/Group 60.png`
- `designs/buyer-ui/Account & Security/Group 61.png`
- `designs/buyer-ui/Account & Security/Group 62.png`
- `designs/buyer-ui/Account & Security/Group 63.png`
- `designs/buyer-ui/Account & Security/Group 64.png`

## Visual Interpretation

### Sign In / Register

`Group 72.png` and `Group 73.png` are the clearest auth entry references. They show a centered white authentication card, Sign in / Sign up tabs, restrained form controls, and an orange primary action.

Batch 9 implements this direction for:

- `/account/sign-in`
- `/account/register`

The current implementation supports email/password only. Phone/SMS and third-party auth variants shown in later login/register images are not implemented.

### Profile

`Profile/Profile.png` through `Profile/Profile-4.png` cover profile and avatar/edit modal states. Batch 9 implements only basic editable profile fields:

- first name
- last name
- phone
- read-only email

Avatar upload, image cropping, and modal editing are not implemented.

### Account & Security

`Account & Security/Group 60.png` through `Group 64.png` appear to cover security settings, password/account operations, and related modal states. Batch 9 does not implement these flows.

## Batch 9 Scope

Implemented:

- Auth entry pages.
- Basic account home.
- Basic profile form.
- Auth-required state for account areas.

Not implemented:

- Password reset.
- Email verification.
- Phone/SMS login.
- Social login.
- Avatar upload.
- Account security settings.
- Address book.
- Saved payment methods.
- Authenticated order list.

## Style Choice

Where a direct PNG is incomplete, pages continue the existing buyer storefront visual system:

- white panels
- light gray background
- 4-8px radii
- orange primary actions
- compact account navigation

The design deliberately avoids admin-dashboard styling.
