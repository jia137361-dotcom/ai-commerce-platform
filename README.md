# ai-commerce-platform

AI commerce platform built on MedusaJS 2.0.

## Team Workflow

Team members should follow the Git workflow in [docs/team-git-workflow.md](docs/team-git-workflow.md).

## Partner handoff (local, before cloud)

To share a working copy with a collaborator (same admin login, products, orders):

- Guide: [docs/partner-handoff.md](docs/partner-handoff.md)
- Export DB: `bash scripts/partner-export-db.sh`
- Import DB: `bash scripts/partner-import-db.sh exports/ai_commerce-*.dump`

## API & Phase 1 Dev2 self-test

- API: [docs/api.md](docs/api.md)
- Dev2 自测步骤: [docs/phase1-dev2-self-test.md](docs/phase1-dev2-self-test.md)
- 最近一次实测记录: [docs/phase1-dev2-self-test-results.md](docs/phase1-dev2-self-test-results.md)
