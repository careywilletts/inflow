# Inflo - Smart Invoice Automation

## Overview
Inflo is a business invoice management application that helps users design, create, and automate invoices. It supports scheduling invoices on weekly, monthly, or yearly basis. Built as a PWA for iOS/Android installability.

## Recent Changes
- 2026-02-21: Added logo upload, settings page, PWA readiness, minimalist screen print aesthetic
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
- **Aesthetic**: Minimalist screen print / risograph look
- **Typography**: Space Grotesk (sans), Libre Baskerville (serif), Space Mono (mono)
- **Colors**: Warm cream/off-white backgrounds, terracotta/burnt orange primary (hsl 12 80% 52%)
- **Style**: Flat design, no shadows, bold typography with tight tracking

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
- Invoice CRUD with line items, tax calculation, and status tracking
- Client directory management
- Schedule automation (weekly/monthly/yearly)
- Logo upload with display in sidebar and invoice detail/print
- Business name customization via Settings
- PWA installable on iOS/Android
- Dark/light theme toggle
- Sidebar navigation

## Running
- `npm run dev` starts Express + Vite on port 5000
