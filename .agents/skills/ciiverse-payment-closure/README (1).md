# Ciiverse Payment Closure Skill

This package contains a project-specific Codex skill for finishing the Stripe and PayPal transaction loop in `ai-commerce-platform`.

## Files

```text
SKILL.md
```

## Recommended repository location

Copy the skill to one of these locations, depending on how your Codex setup discovers project skills:

```text
.agents/skills/ciiverse-payment-closure/SKILL.md
```

or:

```text
skills/ciiverse-payment-closure/SKILL.md
```

You can also keep it under:

```text
docs/codex-skills/ciiverse-payment-closure/SKILL.md
```

and explicitly tell Codex to read it.

## Suggested command

From the repository root:

```bash
mkdir -p .agents/skills/ciiverse-payment-closure
cp /path/to/ciiverse-payment-closure-skill/SKILL.md \
  .agents/skills/ciiverse-payment-closure/SKILL.md
```

Then start Codex and provide the prompt in Section 23 of `SKILL.md`.

## Scope

The skill covers:

```text
Medusa payment collection and payment sessions
Stripe PaymentIntent and Payment Element
PayPal Orders v2 custom Medusa provider
cart completion and order creation
webhooks and signature verification
idempotency and duplicate-event handling
payment-to-fulfillment handoff
refunds
test/sandbox E2E
deployment and operations checks
```

It deliberately keeps seller Stripe Connect separate from buyer checkout.
