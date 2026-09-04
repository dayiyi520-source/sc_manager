# Production Deployment Runbook

Status: draft

Canonical deployment script:

```bash
scripts/deploy-production.sh
```

Rules:

- Use the canonical deployment script for production deploys once it is ready.
- If the script is still a draft, perform the first successful deploy carefully, then replace the draft script with the verified repeatable commands.
- Do not hard-code server passwords, database passwords, tokens, or access keys.
- Load deployment values from `.enterprise-app-factory/secrets/runtime.env` or existing environment variables.
- After a deployment succeeds, update this runbook with the verified command, required preconditions, rollback notes, and last success date.

Last successful deploy: TBD
