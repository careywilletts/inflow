# Inflow - Smart Invoice Automation

## Overview
Inflow is a business invoice management application that helps users design, create, and automate invoices. It supports scheduling invoices on weekly, monthly, or yearly basis. Built as a PWA for iOS/Android installability. Default currency is GBP with 20% VAT.

## Recent Changes
- 2026-03-22: Logo now stored as base64 data URL in DB (persists across deployments)
- 2026-03-22: Mobile sidebar auto-closes when a nav item is tapped
- 2026-03-22: Invoice number prefix customisable via Settings (e.g. BFS → BFS-2026-001)
- 2026-03-22: Added delete button to client cards
- 2026-03-22: Dashboard stat cards are clickable links to filtered views
- 2026-03-11: Enhanced line items with product/service name field, redesigned invoice form as card-based "Products & Services" layout
- 2026-03-11: Added business email field to settings (for invoice email copies)
- 2026-03-11: Updated invoice detail to show product name prominently with description as subtitle
- 2026-02-21: Added VAT number and bank details to settings, redesigned with risograph-inspired olive/pink palette
- 2026-02-21: Changed default currency to GBP (£) with 20% VAT
- 2026-02-21: Added logo upload, settings page, PWA readiness
- 2026-02-21: Initial MVP built with full CRUD for invoices, clients, and schedules
- Database seeded with sample data (3 clients, 4 invoices, 2 schedules)

## Architecture
- **Frontend**: React + Vite, Wouter routing, TanStack Query, Shadcn UI, Tailwind CSS
- **Backend**: Express.js REST API with multer for file uploads
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: shared/schema.ts defines clients, invoices, schedules, settings tables
- **PWA**: manifest.json, service worker (sw.js), iOS meta tags
- **Uploads**: /uploads directory served statically for logo storage

## Design
- **Aesthetic**: Risograph / screen print inspired look
- **Typography**: Space Grotesk (sans), Libre Baskerville (serif), Space Mono (mono)
- **Colors**: Olive green primary (hsl 72 55% 42%), dusty pink secondary (hsl 350 30% 80%), warm cream backgrounds (hsl 48 33% 95%)
- **Style**: Flat design, no shadows, bold typography with tight tracking, round accents

## Project Structure
- `client/src/pages/` - Dashboard, Invoices, InvoiceForm, InvoiceDetail, Clients, Schedules, Settings
- `client/src/components/` - AppSidebar, ThemeToggle, StatusBadge
- `server/routes.ts` - All API routes (CRUD for clients, invoices, schedules, settings + logo upload)
- `server/storage.ts` - DatabaseStorage class with IStorage interface
- `server/db.ts` - Database connection
- `server/seed.ts` - Seed data for initial setup
- `shared/schema.ts` - Drizzle schemas and Zod validation
- `client/public/` - PWA manifest, service worker, app icons

## Key Features
- Invoice CRUD with line items, VAT calculation (20% default), and status tracking
- Enhanced line items with product/service name, description, quantity, unit cost
- Client directory management
- Schedule automation (weekly/monthly/yearly)
- Logo upload with display in sidebar and invoice detail/print
- Business name, business email, VAT number, and bank details via Settings
- VAT number and bank details displayed on invoice detail/print views
- Default currency GBP (£) with Intl.NumberFormat for proper formatting
- PWA installable on iOS/Android
- Dark/light theme toggle
- Sidebar navigation

## Email Integration
- **Status**: CONFIGURED via Gmail SMTP (nodemailer)
- **Secrets**: GMAIL_USER (brockleyfields@gmail.com), GMAIL_APP_PASSWORD stored in Replit Secrets
- **Behaviour**: When an invoice is patched to status "sent", the server automatically emails the invoice to the client and BCCs the business email from Settings
- **Template**: HTML email matching the app's risograph aesthetic — includes logo, line items, totals, bank details
- **Module**: server/email.ts — buildInvoiceHtml() + sendInvoiceEmail()

## Running
- `npm run dev` starts Express + Vite on port 5000
