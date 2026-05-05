-- =============================================================================
-- Migration 009 · Tambah nilai baru ke app_role ENUM
--
-- Catatan PostgreSQL: ALTER TYPE ADD VALUE tidak bisa dipakai dalam transaksi
-- yang sama dengan UPDATE data. File ini hanya menambah nilai baru ke ENUM;
-- migrasi data dilakukan di file 000010 (transaksi terpisah).
-- =============================================================================

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
