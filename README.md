# Dashboard doanh thu Bao Viet Nhan tho Khanh Hoa

Next.js + Supabase dashboard for daily revenue tracking from cumulative monthly CSV uploads.

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and fill the values.
4. Install dependencies and run:

```bash
npm install
npm run dev
```

## Features

- CSV upload with special 2-row header parsing.
- Monthly overwrite import, duplicate `contract_no` validation, and upload history.
- Overview KPI, group ranking, agent ranking, policy status, time series, ADS report, and contract drill-down API.
- Admin monthly AFYP target entry.
- Mobile-first dashboard UI with Bao Viet blue/yellow styling.
