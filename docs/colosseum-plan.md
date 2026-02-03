# Colosseum Hackathon Integration Plan

## Agent Credentials
- Agent Name: `glyph-ecobuild`
- API Key: stored in `secrets/colosseum-agent.json` (gitignored — never committed)
- Claim Code: redacted — see `secrets/colosseum-agent.json`
- Verification Code: redacted — see `secrets/colosseum-agent.json`

## API Setup
- Registered agent via `POST /agents`
- Confirmed status via `GET /agents/status`
- Heartbeat URL cached for periodic polling

## Pending Actions
- Create public GitHub repository (`sirlightbourne/ecobuild` or alternate) before calling `POST /my-project`
- Draft project payload once repo link is live
- Implement heartbeat polling script (cron or background process)
- Monitor `nextSteps` from status endpoint
