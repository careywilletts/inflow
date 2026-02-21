# Inflo - Smart Invoice Automation

## Overview
Inflo is a business invoice management application that helps users design, create, and automate invoices. It supports scheduling invoices on weekly, monthly, or yearly basis.

## Recent Changes
- 2026-02-21: Initial MVP built with full CRUD for invoices, clients, and schedules
- Database seeded with sample data (3 clients, 4 invoices, 2 schedules)

## Architecture
- **Frontend**: React + Vite, Wouter routing, TanStack Query, Shadcn UI, Tailwind CSS
- **Backend**: Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: shared/schema.ts defines clients, invoices, schedules tables

## Project Structure
- `client/src/pages/` - Dashboard, Invoices, InvoiceForm, InvoiceDetail, Clients, Schedules
- `client/src/components/` - AppSidebar, ThemeToggle, StatusBadge
- `server/routes.ts` - All API routes (CRUD for clients, invoices, schedules)
- `server/storage.ts` - DatabaseStorage class with IStorage interface
- `server/db.ts` - Database connection
- `server/seed.ts` - Seed data for initial setup
- `shared/schema.ts` - Drizzle schemas and Zod validation

## Key Features
- Invoice CRUD with line items, tax calculation, and status tracking
- Client directory management
- Schedule automation (weekly/monthly/yearly)
- Dark/light theme toggle
- Sidebar navigation

## Running
- `npm run dev` starts Express + Vite on port 5000
