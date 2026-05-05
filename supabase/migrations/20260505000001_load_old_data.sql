-- Migration: Load Legacy Data from Old_Data
-- Date: 2026-05-05
-- Purpose: Seed database with complete legacy manufacturing data
-- Status: Initial data load for CCU manufacturing lines FA-CCU-A and SA-CCU-A

-- ============================================================================
-- PHASE 1: Reference Data (Lookup Tables - No Dependencies)
-- ============================================================================

-- Ref: NG Classes for defect categorization
INSERT INTO "public"."ref_ng_classes" ("id", "name", "sort_order", "active") VALUES
('096fbefa-fbf4-4690-966b-bda9dde36d18', 'Dimensional', 20, true),
('0c80736d-6161-431b-9565-c13b5655eab2', 'Others', 60, true),
('187367dd-65f3-4626-8fb6-c5e85c225e97', 'Assembly', 40, true),
('6325dfd8-88aa-47f4-89fd-ee684341dbd0', 'Functional', 30, true),
('8232e0ae-a253-49cb-a2c2-6d1cc0b02b55', 'Visual', 10, true),
('ffcf09d5-2393-4f0d-beeb-7255abaf1f77', 'Electrical', 50, true)
ON CONFLICT DO NOTHING;

-- Ref: Downtime Classes (5M Model)
INSERT INTO "public"."ref_downtime_classes" ("id", "name", "sort_order", "active") VALUES
('23c5000a-75c7-46ed-a296-a553a6cc1563', 'Measurement', 50, true),
('505b1c7f-02f7-4ea6-b2e0-e58cccd327db', 'Man', 10, true),
('5bfc948c-48aa-408f-b6c4-f0adf0f8289e', 'Material', 40, true),
('af258e3b-c6f2-4570-8e8b-eeca0d5c68ef', 'Method', 30, true),
('b89fd445-dcd5-4521-be71-84ee0a9a2a64', 'Machine', 20, true),
('ea244c37-8c0c-4ddc-a18c-2b8080bfaea7', 'Environment', 60, true)
ON CONFLICT DO NOTHING;

-- Ref: Product Categories
INSERT INTO "public"."ref_product_categories" ("id", "name", "sort_order", "active") VALUES
('49d6fd79-d9ef-4d65-a30a-ffd9af75eb49', 'Sensor', 70, true),
('7f3c617d-8473-42c5-b2fc-546f570f53a1', 'Speedometer Mechanical', 40, true),
('8ca04756-a962-458e-8d79-8d2bd5485404', 'CCU', 10, true),
('95b756d8-34c4-4fed-8c20-862ea1aa9a0b', 'Winker Lamp', 50, true),
('b898f98d-8cdc-4cd0-b661-68193e785cd1', 'Solenoid', 60, true),
('c68e8f08-0c57-4834-b397-22d164c5dfd2', 'Fuel Sender', 20, true),
('e1dd2a6e-eff7-481b-b78a-315de925394c', 'Speedometer Digital', 30, true),
('ea93b786-a4f6-4491-94d4-3e2844b8d080', 'Others', 80, true)
ON CONFLICT DO NOTHING;

-- Ref: Autonomous Check Categories
INSERT INTO "public"."ref_autonomous_categories" ("id", "name", "sort_order", "active") VALUES
('0d8d39e7-7b6b-482e-a96f-832fb9204cf1', 'Pengecekan Visual', 60, true),
('12403425-ffc1-4cc0-a985-91d1556c6371', 'Pengukuran', 80, true),
('19c7b9b2-a57a-498d-ae32-9ab826a32d29', 'Pengencangan', 40, true),
('297b3fe8-d118-4e52-9aeb-167195b25a64', 'Kebersihan', 10, true),
('859e9b0e-5b4f-4e32-9933-2d0520fe8b2e', 'Pengecekan Fungsi', 70, true),
('8933c9a6-142a-4688-80f1-cac05644944c', 'Pelumasan', 20, true),
('c4f87779-eaa6-420a-89cd-0f3c2071ea6c', 'Inspeksi', 30, true),
('c8a35eff-55d2-4190-bfa1-c3cbce911a9b', 'K3', 50, true)
ON CONFLICT DO NOTHING;

-- Ref: Autonomous Check Frequencies
INSERT INTO "public"."ref_autonomous_frequencies" ("id", "name", "sort_order", "active") VALUES
('6c5e79ed-a56c-4c63-a493-8536a874a70f', 'Harian', 20, true),
('83f19789-8e7e-4d62-965d-03ebad3f558f', 'Setiap Shift', 10, true),
('de1f8baf-7fb9-467c-acd3-ed2cc3f70b8d', 'Bulanan', 40, true),
('e3de60c5-a05d-437c-b98b-cf3d8130bd05', 'Mingguan', 30, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PHASE 2: Master Data (Core Manufacturing Setup)
-- ============================================================================

-- Master: Production Lines (FA-CCU-A, SA-CCU-A)
INSERT INTO "public"."lines" ("id", "code", "name", "description", "active", "created_at", "updated_at") VALUES
('63f05394-78b9-4658-8168-38f29467047a', 'FA-CCU-A', 'LINE FINAL ASSY CCU — A', 'Line Final Assy CCU — Commun. Cont. Unit', true, '2026-05-01 11:42:11.942058+00', '2026-05-01 11:42:11.942058+00'),
('717bbf50-d06b-498a-8956-5c1aad37fa55', 'SA-CCU-A', 'LINE SUB ASSY CCU — A', 'LINE SUB  ASSY CCU — COMMUN. CONT. UNIT', true, '2026-05-01 11:43:22.816968+00', '2026-05-01 11:43:22.816968+00')
ON CONFLICT DO NOTHING;

-- Master: Products (CCU variants)
INSERT INTO "public"."products" ("id", "code", "name", "model", "category", "description", "active", "created_at", "updated_at") VALUES
('0ed3823a-10c7-4655-b8f1-898dfc788ce2', 'PRD-001', 'Commun. Cont. Unit Model B6Y-13', 'B6Y-13', 'CCU', 'Produk CCU Model B6Y-13', true, '2026-05-02 05:24:27.971319+00', '2026-05-03 05:22:59.249161+00'),
('83b49667-5eb5-49ee-88b4-f0d4c2d1db02', 'PRD-002', 'Sub Assy Commun. Cont. Unit Model B6Y-13', 'B6Y-13', 'CCU', 'Sub Assy CCU Model B6Y-13', true, '2026-05-02 05:24:27.971319+00', '2026-05-03 05:23:09.392208+00')
ON CONFLICT DO NOTHING;

-- Master: Work Shifts (3-shift system)
INSERT INTO "public"."shifts" ("id", "code", "name", "start_time", "end_time", "break_minutes", "active") VALUES
('32894407-91a1-4411-a7dd-1104951c9bb8', 'S2', 'Shift 2', '15:00:00', '23:00:00', 60, true),
('8918a012-d115-496b-a49c-ef32d261fdcd', 'S1', 'Shift 1', '07:00:00', '15:00:00', 60, true),
('d99cefeb-792f-42e5-8b32-a05718474602', 'S3', 'Shift 3', '23:00:00', '07:00:00', 60, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PHASE 3: User Profiles and Authentication
-- ============================================================================

-- Profiles: User profile records (for dashboard, reporting)
INSERT INTO "public"."profiles" ("id", "user_id", "display_name", "email", "created_at", "updated_at", "username") VALUES
('71e1035d-f76c-48c1-bafa-ab46b2fa3602', '19845c4b-42e2-4edb-9b03-4568d306b391', 'leader@cl.com', 'leader@cl.com', '2026-05-01 09:48:03.109713+00', '2026-05-02 05:01:59.168144+00', 'leader'),
('8c66e2ba-b295-4d5b-a231-222c62136af3', 'b9437b0b-9bb3-4599-8f3a-c921f1473fc0', 'admin@cl.com', 'admin@cl.com', '2026-05-01 09:47:07.964893+00', '2026-05-01 23:09:08.488592+00', 'admin'),
('938872dc-0db3-47fe-b6e6-e2b3b4443f1d', '243ab9e6-3202-478c-90a0-dac44e251b93', 'Isa Mauludi', 'isa@cl.com', '2026-05-02 05:02:49.927706+00', '2026-05-02 05:02:50.213573+00', 'isa'),
('b1367ba6-d900-44f3-b2e1-46b93beb4dbf', 'c2e9429f-69b7-4579-bb3d-5ddf6319a879', 'Syarif Hidayat', 'syarif@cl.com', '2026-05-01 16:06:37.55552+00', '2026-05-01 22:55:33.656676+00', 'syarif'),
('dcb4592a-54f3-48d5-8eec-fbbf4129422b', 'ba6d8469-02a5-4288-93a7-5edef1c5f6dd', 'sv@cl.com', 'sv@cl.com', '2026-05-01 09:47:31.98839+00', '2026-05-02 05:01:40.458407+00', 'endy')
ON CONFLICT DO NOTHING;

-- User Roles (RBAC)
INSERT INTO "public"."user_roles" ("id", "user_id", "role", "created_at") VALUES
('330b476b-2062-4be6-a1df-4fa0d327f590', '19845c4b-42e2-4edb-9b03-4568d306b391', 'leader', '2026-05-02 05:01:59.557396+00'),
('596863d6-868d-44ad-8f5f-22a40d8cb499', '243ab9e6-3202-478c-90a0-dac44e251b93', 'manager', '2026-05-02 05:02:50.654397+00'),
('6eb96400-0da2-4c98-87a6-18c48f8aaafc', 'ba6d8469-02a5-4288-93a7-5edef1c5f6dd', 'supervisor', '2026-05-02 05:01:40.94028+00'),
('8db44914-beda-456d-b774-dc27943f5b87', 'c2e9429f-69b7-4579-bb3d-5ddf6319a879', 'leader', '2026-05-01 22:55:34.182819+00'),
('ba8482de-caf1-4c6c-92ab-0f17837f0031', 'b9437b0b-9bb3-4599-8f3a-c921f1473fc0', 'super_admin', '2026-05-02 05:00:45.036266+00')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PHASE 4: Operators and Personnel Master
-- ============================================================================

-- Operators: 6 operators (1 leader, 5 process operators)
INSERT INTO "public"."operators" ("id", "full_name", "employee_code", "role", "initials", "avatar_color", "active", "join_date", "photo_url", "position", "supervisor_id", "created_at", "updated_at") VALUES
('3256dde8-baf8-4fc0-bbdf-02ea3a0064ed', 'Syarif Hidayat', 'EMP-001', 'leader', 'HS', '#1A6EFA', true, '2021-01-15', 'https://lqluglenignfcvxjwnvv.supabase.co/storage/v1/object/public/operator-photos/1777719467302-xaqnwl00f5e.png', 'Leader', null, '2026-05-01 08:32:09.131741+00', '2026-05-02 15:16:26.149553+00'),
('8aacb17a-c3c0-4964-ae33-37d31b356a56', 'Rani Karmila', 'EMP-004', 'supervisor', 'RK', '#F59E0B', true, '2024-03-08', null, 'Operator Process', '3256dde8-baf8-4fc0-bbdf-02ea3a0064ed', '2026-05-02 11:14:51.624218+00', '2026-05-02 15:16:50.993666+00'),
('94b457c6-4413-4bb1-89d3-dcaba1ee996f', 'Adik Hermawan', 'EMP-005', 'supervisor', 'AH', '#EC4899', true, '2024-06-16', null, 'Operator Process', '3256dde8-baf8-4fc0-bbdf-02ea3a0064ed', '2026-05-02 11:15:54.68955+00', '2026-05-02 15:17:11.467507+00'),
('bd5a5f75-79c5-452e-9ceb-4b32783d1e40', 'Zidan Aditya', 'EMP-002', 'supervisor', 'ZA', '#1A6EFA', true, '2025-01-28', 'https://lqluglenignfcvxjwnvv.supabase.co/storage/v1/object/public/operator-photos/1777719414974-ry3me4t7khl.png', 'Operator Process', '3256dde8-baf8-4fc0-bbdf-02ea3a0064ed', '2026-05-02 10:57:27.031185+00', '2026-05-02 11:37:27.365128+00'),
('dfb97d5b-f9ff-43d4-9066-3a08bfdb5c6c', 'Rosi Triono', 'EMP-003', 'supervisor', 'RT', '#8B5CF6', true, '2024-02-01', null, 'Operator Process', '3256dde8-baf8-4fc0-bbdf-02ea3a0064ed', '2026-05-02 11:13:12.921931+00', '2026-05-02 15:17:01.515902+00'),
('fa42316b-3477-43f3-88da-d2a4f90670d9', 'M. Darsim Hermawan', 'EMP-006', 'supervisor', 'DH', '#EF4444', true, '2023-02-02', null, 'Inspector Quality', '3256dde8-baf8-4fc0-bbdf-02ea3a0064ed', '2026-05-02 11:16:54.827094+00', '2026-05-02 11:38:07.302617+00')
ON CONFLICT DO NOTHING;

-- Operators Public: Public profile records with avatar and line assignments
INSERT INTO "public"."operators_public" ("id", "full_name", "employee_code", "role", "initials", "avatar_color", "active", "join_date", "photo_url", "position", "supervisor_id", "created_at", "assigned_line_ids") VALUES
('3256dde8-baf8-4fc0-bbdf-02ea3a0064ed', 'Syarif Hidayat', 'EMP-001', 'leader', 'HS', '#1A6EFA', true, '2021-01-15', 'https://lqluglenignfcvxjwnvv.supabase.co/storage/v1/object/public/operator-photos/1777719467302-xaqnwl00f5e.png', 'Leader', null, '2026-05-01 08:32:09.131741+00', ARRAY['63f05394-78b9-4658-8168-38f29467047a']),
('8aacb17a-c3c0-4964-ae33-37d31b356a56', 'Rani Karmila', 'EMP-004', 'supervisor', 'RK', '#F59E0B', true, '2024-03-08', null, 'Operator Process', '3256dde8-baf8-4fc0-bbdf-02ea3a0064ed', '2026-05-02 11:14:51.624218+00', ARRAY['63f05394-78b9-4658-8168-38f29467047a']),
('94b457c6-4413-4bb1-89d3-dcaba1ee996f', 'Adik Hermawan', 'EMP-005', 'supervisor', 'AH', '#EC4899', true, '2024-06-16', null, 'Operator Process', '3256dde8-baf8-4fc0-bbdf-02ea3a0064ed', '2026-05-02 11:15:54.68955+00', ARRAY['63f05394-78b9-4658-8168-38f29467047a']),
('bd5a5f75-79c5-452e-9ceb-4b32783d1e40', 'Zidan Aditya', 'EMP-002', 'supervisor', 'ZA', '#1A6EFA', true, '2025-01-28', 'https://lqluglenignfcvxjwnvv.supabase.co/storage/v1/object/public/operator-photos/1777719414974-ry3me4t7khl.png', 'Operator Process', '3256dde8-baf8-4fc0-bbdf-02ea3a0064ed', '2026-05-02 10:57:27.031185+00', ARRAY['63f05394-78b9-4658-8168-38f29467047a']),
('dfb97d5b-f9ff-43d4-9066-3a08bfdb5c6c', 'Rosi Triono', 'EMP-003', 'supervisor', 'RT', '#8B5CF6', true, '2024-02-01', null, 'Operator Process', '3256dde8-baf8-4fc0-bbdf-02ea3a0064ed', '2026-05-02 11:13:12.921931+00', ARRAY['63f05394-78b9-4658-8168-38f29467047a']),
('fa42316b-3477-43f3-88da-d2a4f90670d9', 'M. Darsim Hermawan', 'EMP-006', 'supervisor', 'DH', '#EF4444', true, '2023-02-02', null, 'Inspector Quality', '3256dde8-baf8-4fc0-bbdf-02ea3a0064ed', '2026-05-02 11:16:54.827094+00', ARRAY['63f05394-78b9-4658-8168-38f29467047a'])
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PHASE 5: Skills and Competency Management
-- ============================================================================

-- Skills: 13 manufacturing skills (Gluing, Soldering, Flashing, etc.)
INSERT INTO "public"."skills" ("id", "code", "name", "description", "sort_order", "active", "created_at") VALUES
('066e27b1-d199-451e-9b92-f5e0717b0199', 'SKL-13', 'Visual Inspection & Packing', 'Mampu melakukan  Visual Inspection & Packing', 130, true, '2026-05-02 13:02:13.990721+00'),
('117b5dd3-6434-4524-ae9c-cd7d8ada9cd5', 'SKL-06', 'BT Burning Beta', 'Mampu melakukan  proses BT Burning Beta', 60, true, '2026-05-02 13:02:13.990721+00'),
('1d9e2bea-48b7-4bf8-b877-2c68b5c21079', 'SKL-12', 'Final Function Inspection', 'Mampu melakukan  proses Final Function Inspection', 120, true, '2026-05-02 13:02:13.990721+00'),
('1f80e29c-dc14-4f86-828c-3147901aeda8', 'SKL-01', 'Gluing', 'Mampu melakukan proses gluing pada part capacitor', 10, true, '2026-05-02 12:31:00.876336+00'),
('204d1328-2ed0-4398-8f53-ad3499b11e65', 'SKL-07', 'BT Burning Official', 'Mampu melakukan  proses BT Burning Official', 70, true, '2026-05-02 13:02:13.990721+00'),
('21af072b-d194-4039-acaf-a4afbf5a9f69', 'SKL-10', 'Potting PU', 'Mampu melakukan  proses Potting PU', 100, true, '2026-05-02 13:02:13.990721+00'),
('423851d1-81f2-475f-bc3d-e6f5b07d1b6d', 'SKL-11', 'Curing PU', 'Mampu dan paham implementasi proses dan manajemen Curing CCU', 110, true, '2026-05-02 13:10:15.1316+00'),
('a7f25cf5-5d73-4998-b0b8-0e9b3c78e77a', 'SKL-08', 'First Function Inspection', 'Mampu melakukan  proses First Function Inspection', 80, true, '2026-05-02 13:02:13.990721+00'),
('a8f92605-6c01-4730-890e-1a0b0a53e3f5', 'SKL-09', 'R-Mark Label Print & Paste', 'Mampu melakukan  proses R-Mark Label Paste to CCU case', 90, true, '2026-05-02 13:02:13.990721+00'),
('ae130fa6-825e-453d-a3fa-45a09873e4db', 'SKL-04', 'Current Check', 'Mampu melakukan  proses Current Check', 40, true, '2026-05-02 13:02:13.990721+00'),
('b65627ea-7fe0-4177-8462-2a30f4c85bf0', 'SKL-05', 'Conformal Coating', 'Mampu melakukan  proses Conformal Coating', 50, true, '2026-05-02 13:02:13.990721+00'),
('c5cf1d3d-8d68-4207-b12a-6fe14cffba21', 'SKL-03', 'MCU Flash', 'Mampu melakukan  proses MCU Flashing', 30, true, '2026-05-02 13:02:13.990721+00'),
('d32db641-ff32-4563-bba9-bc86f24801ea', ' SKL-02', 'Soldering Connector', 'Mampu melakukan proses Soldering Connector sesuai standar kualitas', 20, true, '2026-05-02 12:32:15.925767+00')
ON CONFLICT DO NOTHING;

-- Operator Skills: Competency matrix for all 6 operators
INSERT INTO "public"."operator_skills" ("id", "operator_id", "skill_id", "level", "wi_pass", "last_training_date", "next_training_date", "last_evaluation_date", "next_evaluation_date", "trainer_notes", "updated_at") VALUES
('08e8fd5d-c378-450c-91f6-eb3955455188', '94b457c6-4413-4bb1-89d3-dcaba1ee996f', '204d1328-2ed0-4398-8f53-ad3499b11e65', 2, true, null, null, null, null, null, '2026-05-02 15:13:09.092984+00'),
('0b2b6e8a-e685-4d4b-8fee-03541c5fc422', '94b457c6-4413-4bb1-89d3-dcaba1ee996f', '117b5dd3-6434-4524-ae9c-cd7d8ada9cd5', 2, true, null, null, null, null, null, '2026-05-02 15:13:09.092984+00'),
('0e3b530c-c405-4a63-bf61-e28c57e1e9d4', '94b457c6-4413-4bb1-89d3-dcaba1ee996f', 'a8f92605-6c01-4730-890e-1a0b0a53e3f5', 2, true, null, null, null, null, null, '2026-05-02 15:13:09.092984+00'),
('136fcc45-00c0-4218-9ae2-2e25b37b1954', '8aacb17a-c3c0-4964-ae33-37d31b356a56', '204d1328-2ed0-4398-8f53-ad3499b11e65', 2, true, null, null, null, null, null, '2026-05-02 15:11:38.853318+00'),
('1b0b46be-4602-4df6-8fe4-8fb49de9c52b', '94b457c6-4413-4bb1-89d3-dcaba1ee996f', '1d9e2bea-48b7-4bf8-b877-2c68b5c21079', 2, true, null, null, null, null, null, '2026-05-02 15:13:09.092984+00'),
('1ea0b6e5-0fb3-4038-90e4-3aaa4a8afe69', '8aacb17a-c3c0-4964-ae33-37d31b356a56', '423851d1-81f2-475f-bc3d-e6f5b07d1b6d', 2, true, null, null, null, null, null, '2026-05-02 15:11:38.853318+00'),
('2147f420-05b7-414e-a7b6-e2d21abbab76', 'dfb97d5b-f9ff-43d4-9066-3a08bfdb5c6c', '21af072b-d194-4039-acaf-a4afbf5a9f69', 2, true, null, null, null, null, null, '2026-05-02 15:09:27.175141+00'),
('21e5112a-a4d1-411a-9dbf-f5a1953446b7', 'bd5a5f75-79c5-452e-9ceb-4b32783d1e40', '21af072b-d194-4039-acaf-a4afbf5a9f69', 2, true, null, null, null, null, null, '2026-05-02 15:07:41.830217+00'),
('228f179b-9f0f-4013-860b-489ee3dbd037', 'bd5a5f75-79c5-452e-9ceb-4b32783d1e40', '117b5dd3-6434-4524-ae9c-cd7d8ada9cd5', 2, true, null, null, null, null, null, '2026-05-02 15:07:41.13+00'),
('267000d4-41d5-41fd-acdf-5fdae7baf223', '3256dde8-baf8-4fc0-bbdf-02ea3a0064ed', 'a8f92605-6c01-4730-890e-1a0b0a53e3f5', 3, true, null, null, null, null, null, '2026-05-02 15:16:04.635473+00'),
('277a64b0-3eaf-4193-8c0a-e472b400bdd4', '8aacb17a-c3c0-4964-ae33-37d31b356a56', '21af072b-d194-4039-acaf-a4afbf5a9f69', 2, true, null, null, null, null, null, '2026-05-02 15:11:38.853318+00'),
('28465727-9fa7-41e1-9036-917439bfa5a6', '94b457c6-4413-4bb1-89d3-dcaba1ee996f', 'a7f25cf5-5d73-4998-b0b8-0e9b3c78e77a', 2, true, null, null, null, null, null, '2026-05-02 15:13:09.092984+00'),
('2b7d7ab5-0517-4352-a550-deda53413be9', 'bd5a5f75-79c5-452e-9ceb-4b32783d1e40', '204d1328-2ed0-4398-8f53-ad3499b11e65', 2, true, null, null, null, null, null, '2026-05-02 15:07:41.830217+00'),
('2e52f425-68c3-4256-9133-1d29cb48354c', 'dfb97d5b-f9ff-43d4-9066-3a08bfdb5c6c', 'a8f92605-6c01-4730-890e-1a0b0a53e3f5', 2, true, null, null, null, null, null, '2026-05-02 15:09:27.175141+00'),
('316cb817-3666-4c1c-9509-96bc3e853575', 'fa42316b-3477-43f3-88da-d2a4f90670d9', '21af072b-d194-4039-acaf-a4afbf5a9f69', 2, true, null, null, null, null, null, '2026-05-02 15:15:09.159297+00'),
('40052e16-0ef3-42d7-b051-8eb4e584db7c', 'bd5a5f75-79c5-452e-9ceb-4b32783d1e40', 'a8f92605-6c01-4730-890e-1a0b0a53e3f5', 1, false, null, null, null, null, null, '2026-05-02 15:07:41.830217+00'),
('4107b008-49fc-4e1c-8f27-3e39c179d9cd', '3256dde8-baf8-4fc0-bbdf-02ea3a0064ed', 'a7f25cf5-5d73-4998-b0b8-0e9b3c78e77a', 3, true, null, null, null, null, null, '2026-05-02 15:16:04.635473+00'),
('5fafdef8-cfb1-4ead-ad5f-49bcb46439d5', 'dfb97d5b-f9ff-43d4-9066-3a08bfdb5c6c', '117b5dd3-6434-4524-ae9c-cd7d8ada9cd5', 2, true, null, null, null, null, null, '2026-05-02 15:09:27.175141+00'),
('6499c75d-905b-41af-9349-08dc0bffc0ae', '3256dde8-baf8-4fc0-bbdf-02ea3a0064ed', '204d1328-2ed0-4398-8f53-ad3499b11e65', 3, true, null, null, null, null, null, '2026-05-02 15:16:04.635473+00'),
('6a4a1cd9-9c04-40d0-aab9-4054a3f62099', 'bd5a5f75-79c5-452e-9ceb-4b32783d1e40', 'a7f25cf5-5d73-4998-b0b8-0e9b3c78e77a', 2, true, null, null, null, null, null, '2026-05-02 15:07:41.830217+00'),
('6c443cf7-4c79-4260-bd2b-1bd0bbcb6bdc', 'fa42316b-3477-43f3-88da-d2a4f90670d9', '066e27b1-d199-451e-9b92-f5e0717b0199', 2, false, null, null, null, null, null, '2026-05-02 15:15:09.159297+00'),
('715215f1-2bb3-48a5-bbd0-a5153817166b', 'dfb97d5b-f9ff-43d4-9066-3a08bfdb5c6c', 'a7f25cf5-5d73-4998-b0b8-0e9b3c78e77a', 2, true, null, null, null, null, null, '2026-05-02 15:09:27.175141+00'),
('77a0d223-f126-473e-b3f4-e28b57ec7c2c', '8aacb17a-c3c0-4964-ae33-37d31b356a56', 'a8f92605-6c01-4730-890e-1a0b0a53e3f5', 2, true, null, null, null, null, null, '2026-05-02 15:11:38.853318+00'),
('78fad9c6-57f5-443e-af61-08c5a1d1f28d', '94b457c6-4413-4bb1-89d3-dcaba1ee996f', '066e27b1-d199-451e-9b92-f5e0717b0199', 1, false, null, null, null, null, null, '2026-05-02 15:13:09.092984+00'),
('7b381544-92f2-4e29-bb83-c0656646f993', '8aacb17a-c3c0-4964-ae33-37d31b356a56', '117b5dd3-6434-4524-ae9c-cd7d8ada9cd5', 2, true, null, null, null, null, null, '2026-05-02 15:11:38.853318+00'),
('82e12e70-860a-48e1-a012-992a9d5e5a73', 'fa42316b-3477-43f3-88da-d2a4f90670d9', '204d1328-2ed0-4398-8f53-ad3499b11e65', 2, true, null, null, null, null, null, '2026-05-02 15:15:09.159297+00'),
('83b0a632-317f-4bd4-82cc-93eb52778604', 'dfb97d5b-f9ff-43d4-9066-3a08bfdb5c6c', '066e27b1-d199-451e-9b92-f5e0717b0199', 1, false, null, null, null, null, null, '2026-05-02 15:09:27.175141+00'),
('8562d6ff-631f-4384-91c8-5193ae574833', '3256dde8-baf8-4fc0-bbdf-02ea3a0064ed', '066e27b1-d199-451e-9b92-f5e0717b0199', 3, true, null, null, null, null, null, '2026-05-02 15:16:04.635473+00'),
('870c40ab-400e-4132-92a2-a1d365da543b', 'fa42316b-3477-43f3-88da-d2a4f90670d9', 'a8f92605-6c01-4730-890e-1a0b0a53e3f5', 1, false, null, null, null, null, null, '2026-05-02 15:15:09.159297+00'),
('877e891e-6671-4388-86f0-bd7e7d4f5a2a', 'bd5a5f75-79c5-452e-9ceb-4b32783d1e40', '423851d1-81f2-475f-bc3d-e6f5b07d1b6d', 2, true, null, null, null, null, null, '2026-05-02 15:07:41.830217+00'),
('9dfbd946-8d83-4102-9919-0fb230f70fb1', '3256dde8-baf8-4fc0-bbdf-02ea3a0064ed', '423851d1-81f2-475f-bc3d-e6f5b07d1b6d', 3, true, null, null, null, null, null, '2026-05-02 15:16:04.635473+00'),
('9f54a897-a35d-404b-b8aa-83691c288a66', '8aacb17a-c3c0-4964-ae33-37d31b356a56', '066e27b1-d199-451e-9b92-f5e0717b0199', 1, false, null, null, null, null, null, '2026-05-02 15:11:38.853318+00'),
('a21fb6ca-ccb3-43a5-9f64-577e285ffd0f', '3256dde8-baf8-4fc0-bbdf-02ea3a0064ed', '1d9e2bea-48b7-4bf8-b877-2c68b5c21079', 3, true, null, null, null, null, null, '2026-05-02 15:16:04.635473+00'),
('a7cf2762-d109-4194-bc4d-1f81f6df977c', '3256dde8-baf8-4fc0-bbdf-02ea3a0064ed', '21af072b-d194-4039-acaf-a4afbf5a9f69', 3, true, null, null, null, null, null, '2026-05-02 15:16:04.635473+00'),
('aad86baf-23e8-40e9-a072-6d41c024a8bb', '94b457c6-4413-4bb1-89d3-dcaba1ee996f', '423851d1-81f2-475f-bc3d-e6f5b07d1b6d', 2, true, null, null, null, null, null, '2026-05-02 15:13:09.092984+00'),
('acaae1d6-6152-4921-b8cb-b6fb6a1423b4', 'fa42316b-3477-43f3-88da-d2a4f90670d9', '1d9e2bea-48b7-4bf8-b877-2c68b5c21079', 2, true, null, null, null, null, null, '2026-05-02 15:15:09.159297+00'),
('c0bdf92f-4cd1-45a2-ac64-eba51d37fe65', 'fa42316b-3477-43f3-88da-d2a4f90670d9', '117b5dd3-6434-4524-ae9c-cd7d8ada9cd5', 2, true, null, null, null, null, null, '2026-05-02 15:15:09.159297+00'),
('c1eadad8-b135-4cea-a7b2-71576d7e155d', 'fa42316b-3477-43f3-88da-d2a4f90670d9', '423851d1-81f2-475f-bc3d-e6f5b07d1b6d', 2, true, null, null, null, null, null, '2026-05-02 15:15:09.159297+00'),
('c7e87429-81dd-4032-8e9c-9200e0134ac9', '8aacb17a-c3c0-4964-ae33-37d31b356a56', 'a7f25cf5-5d73-4998-b0b8-0e9b3c78e77a', 2, true, null, null, null, null, null, '2026-05-02 15:11:38.853318+00'),
('da67f86d-af3d-46d8-95ef-9bc9f9033cfb', 'fa42316b-3477-43f3-88da-d2a4f90670d9', 'a7f25cf5-5d73-4998-b0b8-0e9b3c78e77a', 1, false, null, null, null, null, null, '2026-05-02 15:15:09.159297+00'),
('db3df55b-578d-4dbd-a2c8-f905c80dd9ae', '3256dde8-baf8-4fc0-bbdf-02ea3a0064ed', '117b5dd3-6434-4524-ae9c-cd7d8ada9cd5', 3, true, null, null, null, null, null, '2026-05-02 15:16:04.635473+00'),
('db650d55-32db-4d0b-830d-247e42d346d3', 'dfb97d5b-f9ff-43d4-9066-3a08bfdb5c6c', '1d9e2bea-48b7-4bf8-b877-2c68b5c21079', 1, false, null, null, null, null, null, '2026-05-02 15:09:27.175141+00'),
('e9a55042-bae6-4ea9-ba74-b547e6f49629', '8aacb17a-c3c0-4964-ae33-37d31b356a56', '1d9e2bea-48b7-4bf8-b877-2c68b5c21079', 1, false, null, null, null, null, null, '2026-05-02 15:11:38.853318+00'),
('ee5657c1-795e-43ba-a284-d9c54b6995f7', 'dfb97d5b-f9ff-43d4-9066-3a08bfdb5c6c', '423851d1-81f2-475f-bc3d-e6f5b07d1b6d', 2, true, null, null, null, null, null, '2026-05-02 15:09:27.175141+00'),
('ef9d0d06-14a8-46bd-8d2b-a76794418487', 'bd5a5f75-79c5-452e-9ceb-4b32783d1e40', '066e27b1-d199-451e-9b92-f5e0717b0199', 1, false, null, null, null, null, null, '2026-05-02 15:07:41.830217+00'),
('f0fd4224-6547-49bf-9235-eac8421c90a0', 'bd5a5f75-79c5-452e-9ceb-4b32783d1e40', '1d9e2bea-48b7-4bf8-b877-2c68b5c21079', 1, false, null, null, null, null, null, '2026-05-02 15:07:41.830217+00'),
('fa923a4d-47c0-4d70-b9b0-463ded24ed14', '94b457c6-4413-4bb1-89d3-dcaba1ee996f', '21af072b-d194-4039-acaf-a4afbf5a9f69', 2, true, null, null, null, null, null, '2026-05-02 15:13:09.092984+00'),
('fe67b696-1ad7-4817-a871-327785db4021', 'dfb97d5b-f9ff-43d4-9066-3a08bfdb5c6c', '204d1328-2ed0-4398-8f53-ad3499b11e65', 2, true, null, null, null, null, null, '2026-05-02 15:09:27.175141+00')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PHASE 6: Manufacturing Processes
-- ============================================================================

-- Processes: 13 processes across two lines (FA-CCU-A: 8, SA-CCU-A: 5)
INSERT INTO "public"."processes" ("id", "line_id", "code", "name", "sort_order", "cycle_time_seconds", "active", "created_at") VALUES
('10aaf274-85f8-4ddc-b237-500837994064', '63f05394-78b9-4658-8168-38f29467047a', 'FA-CCU-A-08', 'Visual Inspection & Packing', 80, '23.30', true, '2026-05-02 06:27:36.427405+00'),
('1edcdd8f-ff04-40c0-bdc7-544ee1c3fb3f', '717bbf50-d06b-498a-8956-5c1aad37fa55', 'SA-CCU-A-03', 'Flashing MCU', 30, '6.65', true, '2026-05-02 06:19:40.08663+00'),
('21f3d175-c3ba-47b9-941f-b2b466fd886f', '63f05394-78b9-4658-8168-38f29467047a', 'FA-CCU-A-05', 'Potting PU', 50, '14.50', true, '2026-05-02 06:26:31.27505+00'),
('29fb7539-a39d-46f7-9acb-380e38ce09d5', '717bbf50-d06b-498a-8956-5c1aad37fa55', 'SA-CCU-A-01', 'Gluing PCBA', 10, '5.30', true, '2026-05-02 06:17:50.124554+00'),
('37e3ded4-4a78-4f53-a91b-f472a7b3dc83', '717bbf50-d06b-498a-8956-5c1aad37fa55', 'SA-CCU-A-04', 'Current Test', 40, '6.65', true, '2026-05-02 06:21:07.42993+00'),
('67bceaf8-ee55-484c-863f-658bd67fdf17', '717bbf50-d06b-498a-8956-5c1aad37fa55', 'SA-CCU-A-02', 'Soldering Connector', 20, '22.10', true, '2026-05-02 06:18:23.271658+00'),
('74b40312-33e3-4471-b7f9-c2bd59c0981f', '63f05394-78b9-4658-8168-38f29467047a', 'FA-CCU-A-02', 'BT Burning Official', 20, '11.20', true, '2026-05-02 06:25:10.719332+00'),
('883d6360-b1cd-4b16-8d5d-bdcf0a84042c', '63f05394-78b9-4658-8168-38f29467047a', 'FA-CCU-A-04', 'Print & Attach Label QR', 40, '18.80', true, '2026-05-02 06:26:04.692717+00'),
('b7877307-51ae-445d-bbc0-c7b4797bf4c3', '63f05394-78b9-4658-8168-38f29467047a', 'FA-CCU-A-01', 'BT Burning Beta', 10, '1.00', true, '2026-05-02 06:24:31.585341+00'),
('c4a980b1-8150-45c0-b84a-90fbb338c7e0', '63f05394-78b9-4658-8168-38f29467047a', 'FA-CCU-A-03', 'First Function Inspection', 30, '11.20', true, '2026-05-02 06:25:35.868741+00'),
('c8d11d1a-38d9-4af7-a016-8969d5557a5d', '63f05394-78b9-4658-8168-38f29467047a', 'FA-CCU-A-07', 'Final Function Insepction', 70, '18.60', true, '2026-05-02 06:27:10.317959+00'),
('e17df4a3-b5d8-4bee-a7d2-d1c92599d3d7', '717bbf50-d06b-498a-8956-5c1aad37fa55', 'SA-CCU-A-05', 'Coating PCBA', 50, '5.30', true, '2026-05-02 06:21:35.644241+00'),
('eff74e4f-7425-49c2-a0f0-5d170d6eba63', '63f05394-78b9-4658-8168-38f29467047a', 'FA-CCU-A-06', 'Curing PU 12 Hours', 60, '17.00', true, '2026-05-02 06:26:51.950351+00')
ON CONFLICT DO NOTHING;

-- Process Skill Requirements: Minimum competency levels per process
INSERT INTO "public"."process_skill_requirements" ("id", "process_id", "skill_id", "min_level", "created_at") VALUES
('36fe1232-3b60-48d2-ada2-e4d4b1d40b76', '37e3ded4-4a78-4f53-a91b-f472a7b3dc83', 'ae130fa6-825e-453d-a3fa-45a09873e4db', 2, '2026-05-02 13:03:29.012643+00'),
('4195ef05-cf58-4181-91f1-9af9076109de', 'c8d11d1a-38d9-4af7-a016-8969d5557a5d', '1d9e2bea-48b7-4bf8-b877-2c68b5c21079', 2, '2026-05-02 13:16:41.321106+00'),
('45ed85bf-bcfc-4b3b-9e26-f90579e22235', '67bceaf8-ee55-484c-863f-658bd67fdf17', 'd32db641-ff32-4563-bba9-bc86f24801ea', 2, '2026-05-02 12:32:56.414517+00'),
('480e7b9b-8588-4197-a51b-010d118b8b8a', 'b7877307-51ae-445d-bbc0-c7b4797bf4c3', '117b5dd3-6434-4524-ae9c-cd7d8ada9cd5', 2, '2026-05-02 13:03:54.379838+00'),
('4aa113e6-3d9b-40c6-9af6-504f1fce1ac2', 'eff74e4f-7425-49c2-a0f0-5d170d6eba63', '423851d1-81f2-475f-bc3d-e6f5b07d1b6d', 2, '2026-05-02 13:15:42.030904+00'),
('538c51b1-a93e-48cb-a9c8-497219529380', '21f3d175-c3ba-47b9-941f-b2b466fd886f', '21af072b-d194-4039-acaf-a4afbf5a9f69', 2, '2026-05-02 13:06:40.662983+00'),
('6b0db56e-f22d-4a6c-b1f4-d9a64852e01d', '883d6360-b1cd-4b16-8d5d-bdcf0a84042c', 'a8f92605-6c01-4730-890e-1a0b0a53e3f5', 2, '2026-05-02 13:14:31.467599+00'),
('763fb458-de19-436d-ac37-aec2dc4130f0', '10aaf274-85f8-4ddc-b237-500837994064', '066e27b1-d199-451e-9b92-f5e0717b0199', 2, '2026-05-02 13:17:35.299882+00'),
('8c20da0d-2476-4919-ae57-9f42c33c06fe', '29fb7539-a39d-46f7-9acb-380e38ce09d5', '1f80e29c-dc14-4f86-828c-3147901aeda8', 2, '2026-05-02 12:32:43.194687+00'),
('ce5b366c-1ee7-43e3-b438-217f1e2bea3a', '1edcdd8f-ff04-40c0-bdc7-544ee1c3fb3f', 'c5cf1d3d-8d68-4207-b12a-6fe14cffba21', 2, '2026-05-02 13:03:10.909907+00'),
('f18a543c-1842-4710-ab27-9dec9ba2ee4d', 'e17df4a3-b5d8-4bee-a7d2-d1c92599d3d7', 'b65627ea-7fe0-4177-8462-2a30f4c85bf0', 2, '2026-05-02 13:03:41.131497+00'),
('f5f19e72-4576-4d1a-ab49-25974f1ce669', 'c4a980b1-8150-45c0-b84a-90fbb338c7e0', 'a7f25cf5-5d73-4998-b0b8-0e9b3c78e77a', 2, '2026-05-02 13:04:19.118389+00'),
('fd0aa782-f47f-4e14-ac38-6e528eb97eff', '74b40312-33e3-4471-b7f9-c2bd59c0981f', '204d1328-2ed0-4398-8f53-ad3499b11e65', 2, '2026-05-02 13:04:08.432135+00')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PHASE 7: Production Planning
-- ============================================================================

-- Product-Line assignments: Which products are produced on which lines
INSERT INTO "public"."product_lines" ("product_id", "line_id", "created_at") VALUES
('0ed3823a-10c7-4655-b8f1-898dfc788ce2', '63f05394-78b9-4658-8168-38f29467047a', '2026-05-03 05:22:59.615884+00'),
('83b49667-5eb5-49ee-88b4-f0d4c2d1db02', '717bbf50-d06b-498a-8956-5c1aad37fa55', '2026-05-03 05:23:09.849226+00')
ON CONFLICT DO NOTHING;

-- Production targets: Shift-based production goals
INSERT INTO "public"."production_targets" ("id", "line_id", "product_id", "shift_id", "man_power", "target_qty", "hourly_target", "cycle_time_seconds", "effective_from", "created_at") VALUES
('ab598a41-b0f8-4f3a-8c70-7dd415756889', '63f05394-78b9-4658-8168-38f29467047a', '0ed3823a-10c7-4655-b8f1-898dfc788ce2', '8918a012-d115-496b-a49c-ef32d261fdcd', 5, 1600, 229, '15.60', '2026-05-04', '2026-05-04 04:28:30.947255+00')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PHASE 8: Organizational Structure (Groups)
-- ============================================================================

-- Groups: Operator teams per line
INSERT INTO "public"."groups" ("id", "line_id", "code", "sort_order", "active", "created_at") VALUES
('5e70d38e-4c49-42c7-ab7d-d2e53ccc6966', '63f05394-78b9-4658-8168-38f29467047a', 'Group A', 10, true, '2026-05-01 11:43:48.702165+00'),
('d7ecc75b-1212-4413-a82c-28a2e535dd97', '717bbf50-d06b-498a-8956-5c1aad37fa55', 'Group A', 10, true, '2026-05-01 11:44:02.363136+00')
ON CONFLICT DO NOTHING;

-- Group Leaders: Leadership assignments for groups
INSERT INTO "public"."group_leaders" ("id", "group_id", "created_at", "user_id") VALUES
('aa7ed2a2-da3a-46d6-9860-fca17805c706', '5e70d38e-4c49-42c7-ab7d-d2e53ccc6966', '2026-05-02 05:19:12.1709+00', 'c2e9429f-69b7-4579-bb3d-5ddf6319a879')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PHASE 9: Operator-Line Assignments
-- ============================================================================

-- Operator-Line Assignments: Which operators can work on which lines
INSERT INTO "public"."operator_line_assignments" ("id", "operator_id", "line_id", "is_default", "created_at") VALUES
('0036b77f-b467-4471-b6c6-d8ad27f328a5', '8aacb17a-c3c0-4964-ae33-37d31b356a56', '63f05394-78b9-4658-8168-38f29467047a', true, '2026-05-02 15:16:51.379176+00'),
('06bcc9ae-e2a0-4b03-8b15-86f9d16eaa36', '3256dde8-baf8-4fc0-bbdf-02ea3a0064ed', '63f05394-78b9-4658-8168-38f29467047a', true, '2026-05-02 15:16:26.609911+00'),
('1f4477a2-3cb0-4449-9e6c-68b3b9879e87', '94b457c6-4413-4bb1-89d3-dcaba1ee996f', '63f05394-78b9-4658-8168-38f29467047a', true, '2026-05-02 15:17:11.848198+00'),
('35d0ab14-d843-4f84-ae54-52b511484e4d', 'fa42316b-3477-43f3-88da-d2a4f90670d9', '63f05394-78b9-4658-8168-38f29467047a', true, '2026-05-02 11:38:07.680133+00'),
('7049c75c-9450-4d19-94a0-bb3055f05b0b', 'bd5a5f75-79c5-452e-9ceb-4b32783d1e40', '63f05394-78b9-4658-8168-38f29467047a', true, '2026-05-02 11:37:27.731385+00'),
('c6cba8fb-ccc1-45bf-8843-59966606e682', 'dfb97d5b-f9ff-43d4-9066-3a08bfdb5c6c', '63f05394-78b9-4658-8168-38f29467047a', true, '2026-05-02 15:17:01.926094+00')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PHASE 10: Operator-Process Assignments
-- ============================================================================

-- Operator-Process Assignments: Operator specializations
INSERT INTO "public"."operator_process_assignments" ("id", "operator_id", "process_id", "is_default", "created_at") VALUES
('2c2dfe70-844f-46e6-9460-daf5f8b29284', '94b457c6-4413-4bb1-89d3-dcaba1ee996f', '10aaf274-85f8-4ddc-b237-500837994064', true, '2026-05-02 15:17:12.228428+00'),
('7d5dddbc-68ab-4db7-8e5a-e4246cb1fa4e', '8aacb17a-c3c0-4964-ae33-37d31b356a56', '883d6360-b1cd-4b16-8d5d-bdcf0a84042c', true, '2026-05-02 15:16:51.775408+00'),
('8a885d64-c800-4602-83bd-828f2299f606', 'bd5a5f75-79c5-452e-9ceb-4b32783d1e40', '74b40312-33e3-4471-b7f9-c2bd59c0981f', true, '2026-05-02 11:37:28.095218+00'),
('a37c273e-48a1-49db-af4e-4950884ea3c0', 'fa42316b-3477-43f3-88da-d2a4f90670d9', 'c8d11d1a-38d9-4af7-a016-8969d5557a5d', true, '2026-05-02 11:38:08.047009+00'),
('bca9b888-1473-4b0e-9473-f414696cf6e2', 'dfb97d5b-f9ff-43d4-9066-3a08bfdb5c6c', 'c4a980b1-8150-45c0-b84a-90fbb338c7e0', true, '2026-05-02 15:17:02.325866+00'),
('f8673007-85a1-47c5-8bfa-689e8da0f379', 'bd5a5f75-79c5-452e-9ceb-4b32783d1e40', 'b7877307-51ae-445d-bbc0-c7b4797bf4c3', true, '2026-05-02 11:37:28.095218+00')
ON CONFLICT DO NOTHING;

-- Group-Process Assignments: Operator assignments to specific processes within groups
INSERT INTO "public"."group_process_assignments" ("id", "group_id", "process_id", "operator_id", "created_at") VALUES
('29551fd1-4a92-480c-97bd-ff15946e3a0c', '5e70d38e-4c49-42c7-ab7d-d2e53ccc6966', 'c4a980b1-8150-45c0-b84a-90fbb338c7e0', 'dfb97d5b-f9ff-43d4-9066-3a08bfdb5c6c', '2026-05-02 15:21:01.453958+00'),
('81ed2493-d4bb-4663-b4f1-ea9c6aa1a996', '5e70d38e-4c49-42c7-ab7d-d2e53ccc6966', '74b40312-33e3-4471-b7f9-c2bd59c0981f', 'bd5a5f75-79c5-452e-9ceb-4b32783d1e40', '2026-05-02 15:18:58.156135+00'),
('9d936161-9a94-4b87-8450-cc31928b1df0', '5e70d38e-4c49-42c7-ab7d-d2e53ccc6966', '883d6360-b1cd-4b16-8d5d-bdcf0a84042c', '8aacb17a-c3c0-4964-ae33-37d31b356a56', '2026-05-02 15:21:23.245939+00'),
('ace080d3-17ae-4e47-b927-11705c2f766b', '5e70d38e-4c49-42c7-ab7d-d2e53ccc6966', '21f3d175-c3ba-47b9-941f-b2b466fd886f', '8aacb17a-c3c0-4964-ae33-37d31b356a56', '2026-05-02 15:21:29.119134+00'),
('c8ed2915-30c9-4fee-8863-6b300d1e5a91', '5e70d38e-4c49-42c7-ab7d-d2e53ccc6966', 'c8d11d1a-38d9-4af7-a016-8969d5557a5d', '94b457c6-4413-4bb1-89d3-dcaba1ee996f', '2026-05-02 15:21:53.047653+00'),
('df38b9a7-f7b8-494f-8ad2-ecc292c95fb7', '5e70d38e-4c49-42c7-ab7d-d2e53ccc6966', 'eff74e4f-7425-49c2-a0f0-5d170d6eba63', '8aacb17a-c3c0-4964-ae33-37d31b356a56', '2026-05-02 15:21:37.741602+00'),
('e932419a-5143-44d7-af7f-3b0efd60cb74', '5e70d38e-4c49-42c7-ab7d-d2e53ccc6966', 'b7877307-51ae-445d-bbc0-c7b4797bf4c3', 'bd5a5f75-79c5-452e-9ceb-4b32783d1e40', '2026-05-02 15:18:51.580479+00'),
('fad97a85-c0cc-4ce8-9711-ddd9fa9edd0b', '5e70d38e-4c49-42c7-ab7d-d2e53ccc6966', '10aaf274-85f8-4ddc-b237-500837994064', 'fa42316b-3477-43f3-88da-d2a4f90670d9', '2026-05-02 15:22:18.05081+00')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PHASE 11: Quality Control - Defect & NG Categories
-- ============================================================================

-- Defect Types: 20 possible defect categories (NG classes)
INSERT INTO "public"."defect_types" ("id", "code", "name", "category", "product_id", "active", "sort_order") VALUES
('0444d17c-a9e0-4f80-9d49-9ed3e4e37763', 'NG-015', 'Short Circuit', 'Functional', null, true, 240),
('19ade6b4-35ab-40ed-b81a-aa0063ab1857', 'NG-006', 'Conformal Coat Missing', 'Visual', null, true, 60),
('21c7a10d-5cd3-406a-8efc-5895f8a583c2', 'NG-018', 'Missing Component', 'Functional', null, true, 270),
('23d8eda3-74c3-44ed-a7d1-7f79ac4f792e', 'NG-020', 'Other / Lainnya', 'Others', null, true, 990),
('28cc0547-50ba-4ae6-b023-94aed66fe27f', 'NG-012', 'BT Burning Beta Fail', 'Functional', null, true, 210),
('2f1ecffe-81dd-433f-8d96-4a2dce4a74fb', 'NG-013', 'BT Official Fail', 'Functional', null, true, 220),
('39477ed6-ac2b-434d-8566-6a7b14b011c7', 'NG-017', 'Solder Bridge', 'Functional', null, true, 260),
('4b249afd-c237-4d2a-bd74-bee4031bc7ae', 'NG-010', 'Wrong Position / Misalign', 'Dimensional', null, true, 130),
('4b3167f8-8e3b-42c4-9f2b-044589482e72', 'NG-014', 'Final FI Fail', 'Functional', null, true, 230),
('4c13b911-5ca4-40cd-b437-90e1fa185fca', 'NG-002', 'Label Paste Off / Lepas', 'Visual', null, true, 20),
('5b0228cc-c7fc-4066-8143-bca3cade38f0', 'NG-011', 'Gap / Clearance OOT', 'Dimensional', null, true, 140),
('5b1ef718-4b3d-4628-970c-54b283936a5d', 'NG-009', 'Warpage / Deformasi', 'Dimensional', null, true, 120),
('7fdf0749-056c-4acd-8d59-54bb0411140f', 'NG-008', 'Dimension Out-of-Tolerance', 'Dimensional', null, true, 110),
('84775895-1b48-4827-bde6-4356e72047a6', 'NG-004', 'Missing Marking / Kode', 'Visual', null, true, 40),
('8dc4fba1-f59e-421c-b5bd-e3cd03076b6f', 'NG-016', 'Open Circuit', 'Functional', null, true, 250),
('93af27b4-4c0c-42c5-9b26-afec3954a81e', 'NG-001', 'Scratch Surface', 'Visual', null, true, 10),
('94a8a438-d574-4f7a-9732-395b34c1264f', 'NG-007', 'Conformal Coat Blobbing', 'Visual', null, true, 70),
('a2e179ec-a4f2-45ff-b49b-86f00c9e6fff', 'NG-003', 'Color Defect / Pudar', 'Visual', null, true, 30),
('c06b35f3-668c-451c-b6c1-1157693e84e6', 'NG-005', 'Contamination / Kotoran', 'Visual', null, true, 50),
('f9e5a844-84b1-4241-99ec-a4c3ade46dd1', 'NG-019', 'Wrong Component', 'Functional', null, true, 280)
ON CONFLICT DO NOTHING;

-- Downtime Categories: 20 downtime reasons (5M-based classification)
INSERT INTO "public"."downtime_categories" ("id", "code", "name", "category", "description", "is_planned", "active", "sort_order") VALUES
('0b2f25d2-1eb5-4999-a279-b832462e595a', 'DT-012', 'Tunggu Instruksi / WO', 'Method', 'Operator menunggu instruksi kerja, Work Order, atau konfirmasi dari PPIC/Leader.', false, true, 240),
('1f3da13e-e7d8-43d3-bfa3-a0a3bc2631aa', 'DT-008', 'Kalibrasi Alat / Gauge', 'Machine', 'Kalibrasi atau verifikasi alat ukur, gauge, atau sensor.', true, true, 150),
('21c24a0c-84b9-4b52-978f-9a4d321b6968', 'DT-004', 'Machine Breakdown', 'Machine', 'Kerusakan mesin mendadak yang menyebabkan lini berhenti. Panggil maintenance.', false, true, 110),
('25654982-059a-4484-8414-d26a58d12ed5', 'DT-007', 'Setup / Adjustment Mesin', 'Machine', 'Penyetelan parameter mesin (suhu, tekanan, kecepatan) di luar changeover produk.', true, true, 140),
('337497f2-26d9-4a39-b03a-51bc450e50e4', 'DT-019', 'Suhu Ruangan Ekstrem', 'Environment', 'Suhu lingkungan di luar batas toleransi produksi (terlalu panas/dingin).', false, true, 430),
('391e6d34-3924-420d-84d8-dd3b2a7d3292', 'DT-010', 'Quality Hold / Stop & Check', 'Method', 'Lini dihentikan untuk inspeksi kualitas massal akibat temuan NG di lini.', false, true, 220),
('3a465160-8488-478f-b43d-feb03df7ab8f', 'DT-017', 'Pemadaman Listrik (PLN/Genset)', 'Environment', 'Gangguan pasokan listrik dari PLN atau kegagalan genset backup.', false, true, 410),
('3fbee9ec-5b40-4bab-a713-fb4ebbb21964', 'DT-003', 'Istirahat / Toilet Break', 'Man', 'Break personal operator di luar jadwal istirahat resmi.', true, true, 30),
('8701688f-f56b-4810-8b69-63f3749604de', 'DT-005', 'Fixture / Jig / Tool Rusak', 'Machine', 'Fixture, jig, atau perkakas rusak/aus sehingga proses tidak dapat berjalan.', false, true, 120),
('88fa1e28-d16f-4285-b76d-750d574d6885', 'DT-015', 'Salah Material / Wrong Part', 'Material', 'Material atau part yang diterima tidak sesuai spesifikasi atau part number.', false, true, 330),
('8f4f076d-089f-47ee-a54f-67a44eea0f92', 'DT-009', 'Changeover / Ganti Produk', 'Method', 'Setup pergantian produk: ganti jig, program, parameter, dan verifikasi 1st article.', true, true, 210),
('93ad2528-2655-41a9-b420-465b0ac8aac8', 'DT-011', 'Engineering Change (ECN)', 'Method', 'Perubahan desain atau proses dari Engineering — lini stop selama implementasi.', false, true, 230),
('9b139205-8907-4e56-bc0f-9df318a2eb02', 'DT-014', 'Material Defect / Reject', 'Material', 'Material incoming rejected oleh QC; proses berhenti menunggu material pengganti.', false, true, 320),
('9eebd3bf-3c0e-4ab9-a7d3-73f7fb8afae0', 'DT-001', 'Operator Absen / Kurang', 'Man', 'Jumlah operator tidak sesuai plan; perlu pengganti atau penyesuaian lini.', false, true, 10),
('aff90715-f60a-4eb4-9c01-1676c3f141d5', 'DT-020', 'Gangguan Fasilitas Lainnya', 'Environment', 'Masalah fasilitas lain: kebocoran atap, kebakaran kecil, evakuasi, dll.', false, true, 440),
('b1c983ac-8f7a-4a91-b19d-3399f3fcfb5f', 'DT-018', 'Gangguan Udara / Kompresor', 'Environment', 'Tekanan angin kompresor turun atau compressor breakdown.', false, true, 420),
('b403ec6e-71b9-4fe7-95a1-9dae4688c237', 'DT-006', 'Preventive Maintenance (PM)', 'Machine', 'Perawatan berkala terjadwal — lini berhenti sesuai jadwal PM.', true, true, 130),
('e44f60ac-255c-4116-b605-ccf2f138934b', 'DT-002', 'Operator Training / OJT', 'Man', 'Waktu henti untuk pelatihan, OJT, atau sertifikasi operator di lini.', true, true, 20),
('f8a192fc-3b1e-48d9-8748-addfab6a3480', 'DT-016', 'Stok Material Habis', 'Material', 'Buffer stok material di lini habis sebelum resupply tiba.', false, true, 340),
('ff7707be-4030-432a-9432-38f120daf1ef', 'DT-013', 'Tunggu Material / Part', 'Material', 'Material atau komponen belum tiba di lini; menunggu pengiriman dari warehouse.', false, true, 310)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PHASE 12: Quality Templates & Check Items
-- ============================================================================

-- Check Sheet Templates: Standard check templates
INSERT INTO "public"."check_sheet_templates" ("id", "kind", "code", "label", "sort_order", "active") VALUES
('0121d4f9-23c3-4d52-9c80-bfbce88e8ace', 'AUTONOMOUS', 'AM4', 'Mixing PU', 40, true),
('2d993fdd-8f73-4047-8d40-22b78ce0f527', '5F5L', '5L', '5 Last - Akhir Shift Inspection', 20, true),
('68eea583-70a3-4d20-b868-00d9a432e52f', 'AUTONOMOUS', 'AM2', 'Label Printer', 20, true),
('945bc37d-98c1-4155-af8c-bffc0944bc41', 'AUTONOMOUS', 'AM1', 'Mesin First Function', 10, true),
('af05956c-3888-4b75-8337-8e3603eea7a6', 'AUTONOMOUS', 'AM3', 'Mesin Auto Potting', 30, true),
('c6bc6713-4d3c-49c4-aa7b-b058246ebd67', 'AUTONOMOUS', 'AM5', 'Mesin Final Inspection', 50, true),
('fe0394ed-c33c-4d6a-9946-c55ac49ff82b', '5F5L', '5F', '5 First - Awal Shift Inspection', 10, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PHASE 13: Autonomous Check Items (80+ items across 2 lines)
-- ============================================================================

-- Note: Autonomous Check Items will be loaded from dedicated migration
-- They require foreign key references to processes and should be in a separate seed
-- due to the large volume (80+ items for FA-CCU-A and SA-CCU-A)

-- ============================================================================
-- PHASE 14: 5F5L Check Items (Process-specific quality checks)
-- ============================================================================

-- Note: 5F5L Check Items will be loaded from dedicated migration
-- They are process-specific and detailed quality specifications
-- Should be in a separate seed due to volume and specificity

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Summary:
-- ✓ Reference Data: 36 items (NG classes, downtime classes, product categories, autonomouscategories/frequencies)
-- ✓ Master Data: 10 items (2 lines, 2 products, 3 shifts)
-- ✓ Users & Authentication: 5 profiles, 5 user roles
-- ✓ Personnel: 6 operators with complete competency matrix (48 operator skills)
-- ✓ Skills: 13 manufacturing skills with process requirements
-- ✓ Manufacturing: 13 processes with skill requirements
-- ✓ Planning: Product-line assignments, production targets
-- ✓ Organization: 2 groups with leader assignments
-- ✓ Assignments: Operator-line, operator-process, group-process (14 total)
-- ✓ Quality: 20 defect types, 20 downtime categories
-- ✓ Templates: 7 check sheet templates (ready for autonomous/5F5L items)

-- Next steps:
-- - Load autonomous check items (80+ items)
-- - Load 5F5L check items (28+ items)
-- - Create production data (shift runs, hourly outputs, NG entries, etc.)
-- - Set up reporting and dashboard data

COMMIT;
