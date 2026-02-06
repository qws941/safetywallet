# SafetyWallet Rollback Procedures

## Quick Reference

| Component         | Rollback Method        | Time   |
| ----------------- | ---------------------- | ------ |
| API Worker        | `wrangler rollback`    | ~30s   |
| Admin App (Pages) | Cloudflare Dashboard   | ~1min  |
| Worker App (R2)   | Re-deploy from git tag | ~5min  |
| D1 Database       | Manual backup restore  | ~10min |

## API Worker Rollback

### Using Wrangler CLI

```bash
cd apps/api-worker
npx wrangler rollback
```

This will show recent deployments and allow selection of version to rollback to.

### Via Cloudflare Dashboard

1. Go to Workers & Pages → safework2-api
2. Click "Deployments" tab
3. Find the working version
4. Click "Rollback to this version"

## Admin App (Cloudflare Pages) Rollback

1. Go to Workers & Pages → safework2-admin
2. Click "Deployments" tab
3. Find the working deployment
4. Click "..." → "Rollback to this deployment"

## Worker App (R2 Static) Rollback

R2 doesn't have built-in versioning. To rollback:

1. Checkout the working git tag/commit

```bash
git checkout <working-tag>
```

2. Rebuild and redeploy

```bash
cd apps/worker-app
npm run build
# Manually upload or trigger deploy workflow
```

## D1 Database Rollback

### If you have a backup

```bash
cd apps/api-worker
npx wrangler d1 execute safework2-db --file=backup.sql
```

### If no backup exists

Contact platform team for point-in-time recovery options.

**Prevention**: Always backup before migrations

```bash
npx wrangler d1 export safework2-db --output=backup-$(date +%Y%m%d).sql
```

## Emergency Contacts

- Platform Team: [Add contact]
- On-call: [Add contact]

## Post-Rollback Checklist

- [ ] Verify API health: `curl https://api.safework.example.com/health`
- [ ] Verify Admin App loads
- [ ] Verify Worker App loads
- [ ] Check error rates in monitoring
- [ ] Notify stakeholders
- [ ] Create incident report
