# Personal Production Deployment Options

AppFinanzas will remain local while the MVP is validated through real daily use. Cloud deployment should happen only after the local workflow is stable and should prioritize financial-data durability over convenience.

## Recommended path

1. Use the MVP locally at no infrastructure cost.
2. Validate the product through real usage and record missing capabilities.
3. Test the deployment process on free cloud tiers.
4. Move to the USD 13/month configuration once the application becomes operationally important.

## Deployment options

| Stage | Frontend | API | PostgreSQL | Estimated monthly cost | Main tradeoff |
|---|---|---|---|---:|---|
| Local validation | Local | Local | Local | USD 0 | Available only on the local machine |
| Free cloud trial | Vercel Hobby or Render Static Site | Render Free Web Service | Neon Free | USD 0 | Cold starts, no SLA, and limited recovery |
| Data-first minimum | Free static hosting | Render Free Web Service | Render Basic | USD 6 | Durable database, but the API can take about one minute to wake up |
| Experience-first minimum | Free static hosting | Render Starter | Neon Free | USD 7 | Responsive API, but database recovery remains limited |
| Balanced personal production | Free static hosting | Render Starter | Render Basic | USD 13 | Small recurring cost; best minimum balance for dependable personal use |

## Preferred production baseline

The preferred baseline is the **balanced personal production** option:

- Static React/Vite frontend on a free hosting tier.
- Express API on Render Starter for approximately USD 7/month.
- PostgreSQL on Render Basic for approximately USD 6/month.
- Provider-managed HTTPS and deployment from the Git repository.
- Optional custom domain as a separate expense.

This configuration avoids the API cold start and the expiration of a temporary database while keeping the architecture close to the existing React, Express, Prisma, and PostgreSQL stack.

## Free-tier limitations

- Render free web services sleep after inactivity and can take approximately one minute to wake up.
- Render free PostgreSQL databases expire after 30 days and are not acceptable for financial records.
- Neon Free is permanent but has storage, compute, transfer, and recovery limits.
- Free services do not provide a production uptime SLA.
- Local service files are ephemeral in most free application containers; financial data must remain in PostgreSQL.

## Non-negotiable data safeguards

Cloud deployment is not complete until all items below are verified:

- [ ] Production secrets are stored in provider-managed environment variables.
- [ ] The application has a dedicated production database and credentials.
- [ ] Database migrations run through a controlled release step.
- [ ] A financial-data export or backup procedure exists.
- [ ] At least one restoration test has succeeded.
- [ ] Health checks and basic error visibility are configured.
- [ ] The production deployment can be rolled back.

Availability can be temporarily reduced at this stage; unrecoverable financial-data loss is not acceptable.

## Future SDD artifact policy

Future product changes should use **both OpenSpec and Engram**:

- **OpenSpec** keeps proposals, specifications, designs, and tasks visible and versioned in the repository.
- **Engram** preserves cross-session context, decisions, discoveries, and implementation continuity.
- Product ideas should be written into a repository-visible backlog or proposal before implementation so they are not dependent on conversational memory.

The exact artifact-store choice must still be confirmed during each SDD session preflight, but `both` should be the default recommendation for substantial future changes.

## Decision trigger

Move from local usage to cloud deployment when at least one condition is true:

- The application is used consistently enough that local availability becomes inconvenient.
- Access is needed from more than one device or location.
- Losing recent records would materially disrupt personal financial tracking.
- A second user or externally accessible environment is required.

Before deployment, revalidate provider pricing and free-tier restrictions because cloud plans change over time.
