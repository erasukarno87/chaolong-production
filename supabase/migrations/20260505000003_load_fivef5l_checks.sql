-- Migration: Load 5F5L Check Items (Part 3)
-- Date: 2026-05-05
-- Purpose: Seed 5F5L (Five First, Five Last) process-specific quality check items
-- These are detailed quality specifications for key manufacturing processes

INSERT INTO "public"."fivef5l_check_items" ("id", "line_id", "process_id", "sort_group", "group_name", "specification", "method", "input_type", "sort_order", "active", "created_at") VALUES
('03f90e4f-f8e8-4eff-83fe-446a8e8a19cf', '63f05394-78b9-4658-8168-38f29467047a', '74b40312-33e3-4471-b7f9-c2bd59c0981f', 3, 'Burning Program (BT official)', 'Programming Success — No error messages', 'Visual', 'ok_ng', 30, true, '2026-05-02 10:12:33.783026+00'),
('050be048-e4d2-4440-9514-4a161d5161d2', '63f05394-78b9-4658-8168-38f29467047a', '883d6360-b1cd-4b16-8d5d-bdcf0a84042c', 6, 'Serial Number', 'SN must be sequential / Cannot be double', 'Visual', 'ok_ng', 10, true, '2026-05-02 10:12:33.783026+00'),
('079c64b0-1772-4570-a12a-50bcf649d677', '63f05394-78b9-4658-8168-38f29467047a', '10aaf274-85f8-4ddc-b237-500837994064', 11, 'Visual Inspection (Refer to YQS RR0021)', 'Check after 3.5 second CCU operation, Value < 70 μA', 'Visual', 'ok_ng', 10, true, '2026-05-02 10:12:33.783026+00'),
('08c92153-1f78-4225-91c7-1a1ac18ef31e', '63f05394-78b9-4658-8168-38f29467047a', 'b7877307-51ae-445d-bbc0-c7b4797bf4c3', 1, 'Burning Program (BETA)', 'Voltage step 2 : 3.0 ~ 3.4 V', 'Visual', 'float', 20, true, '2026-05-02 10:12:33.783026+00'),
('1e066010-22cb-439e-a18a-4a43e6bae670', '63f05394-78b9-4658-8168-38f29467047a', '883d6360-b1cd-4b16-8d5d-bdcf0a84042c', 7, 'Label Printing (Refer to YQS RR0021)', 'Label pasted on correct position', 'Visual', 'ok_ng', 10, true, '2026-05-02 10:12:33.783026+00'),
('23fe8e6f-8d9c-44ce-bf55-1edc3f8ba9f6', '717bbf50-d06b-498a-8956-5c1aad37fa55', '37e3ded4-4a78-4f53-a91b-f472a7b3dc83', 4, 'Current Check', 'Current Spec 28 - 32 mA', 'Visual', 'float', 0, true, '2026-05-02 10:28:09.317694+00'),
('38b9215e-7a9e-48bf-bd42-4ce365e61e8d', '63f05394-78b9-4658-8168-38f29467047a', '883d6360-b1cd-4b16-8d5d-bdcf0a84042c', 7, 'Label Printing (Refer to YQS RR0021)', 'P/N : DH7-H5810-00', 'Visual', 'ok_ng', 50, true, '2026-05-02 10:12:33.783026+00'),
('3d47dfcb-584c-43cf-afed-8a54e7815424', '63f05394-78b9-4658-8168-38f29467047a', 'b7877307-51ae-445d-bbc0-c7b4797bf4c3', 2, 'Semi-Finished function inspection', 'Visual display Result Inspection (PASS)', 'Visual', 'ok_ng', 10, true, '2026-05-02 10:12:33.783026+00'),
('436dfb59-1ff4-4661-8ee2-8a665a4a76ab', '717bbf50-d06b-498a-8956-5c1aad37fa55', '29fb7539-a39d-46f7-9acb-380e38ce09d5', 1, 'Gluing', 'Large components (al-cap) according to pin position, No Insufficient or excess', 'Visual', 'ok_ng', 1, true, '2026-05-02 10:23:34.310192+00'),
('4fc8473c-b8f7-4fe3-a9f1-90f42ef8aade', '63f05394-78b9-4658-8168-38f29467047a', 'c4a980b1-8150-45c0-b84a-90fbb338c7e0', 5, 'First Function Inspection', 'MCU V0.02 BLE V2.E.04', 'Visual', 'ok_ng', 20, true, '2026-05-02 10:12:33.783026+00'),
('51bdc34b-3e7d-4072-915e-3229f3237bf6', '63f05394-78b9-4658-8168-38f29467047a', 'c4a980b1-8150-45c0-b84a-90fbb338c7e0', 4, 'Scanning QR Code PCB & Assembly PCBA with case', 'QR is readable', 'Visual', 'ok_ng', 10, true, '2026-05-02 10:12:33.783026+00'),
('59de7a95-5ed8-4405-b002-71ef3725f6f1', '63f05394-78b9-4658-8168-38f29467047a', '883d6360-b1cd-4b16-8d5d-bdcf0a84042c', 7, 'Label Printing (Refer to YQS RR0021)', 'No chip, No blur, No detorsion, No film particle or dirt, No wrong content or letter missing', 'Visual', 'ok_ng', 20, true, '2026-05-02 10:12:33.783026+00'),
('62cb5bd6-6a0c-42d0-abfb-9a40df77a898', '717bbf50-d06b-498a-8956-5c1aad37fa55', '1edcdd8f-ff04-40c0-bdc7-544ee1c3fb3f', 3, 'Program Install', 'Install version : MCU_V0_13', 'Visual', 'text', 1, true, '2026-05-02 10:26:01.504934+00'),
('687f3050-3021-498a-8a92-196c79288ba9', '717bbf50-d06b-498a-8956-5c1aad37fa55', '1edcdd8f-ff04-40c0-bdc7-544ee1c3fb3f', 3, 'Program Install', 'Visual display show is "OK"', 'Visual', 'ok_ng', 2, true, '2026-05-02 10:27:04.464704+00'),
('6b1377f6-4cd2-4ff7-a628-aae8783fed77', '63f05394-78b9-4658-8168-38f29467047a', '21f3d175-c3ba-47b9-941f-b2b466fd886f', 9, 'PU Dispensing', 'No void between pins / No over flow. PU height range: upper limit must not affect connector fitting, lower limit must contact with side edge of connector', 'Visual', 'ok_ng', 10, true, '2026-05-02 10:12:33.783026+00'),
('733ea98e-e312-4a1b-9888-90d8245abf94', '63f05394-78b9-4658-8168-38f29467047a', '74b40312-33e3-4471-b7f9-c2bd59c0981f', 3, 'Burning Program (BT official)', 'Correct program version — BLE Software V2.E.04', 'Visual', 'text', 10, true, '2026-05-02 10:12:33.783026+00'),
('75da70bb-60d3-4506-8b4e-6d9ed64e1a31', '63f05394-78b9-4658-8168-38f29467047a', 'b7877307-51ae-445d-bbc0-c7b4797bf4c3', 1, 'Burning Program (BETA)', 'Voltage step 1 : 1.5 ~ 1.7 V', 'Visual', 'float', 10, true, '2026-05-02 10:12:33.783026+00'),
('7b3e7111-f22e-4363-a70b-958cc1da664d', '63f05394-78b9-4658-8168-38f29467047a', 'c4a980b1-8150-45c0-b84a-90fbb338c7e0', 5, 'First Function Inspection', 'Test Result (PASS)', 'Visual', 'ok_ng', 30, true, '2026-05-02 10:12:33.783026+00'),
('7c593c0a-c50a-478e-b06f-214ddd658836', '63f05394-78b9-4658-8168-38f29467047a', 'b7877307-51ae-445d-bbc0-c7b4797bf4c3', 1, 'Burning Program (BETA)', 'Programming Success — No error messages', 'Visual', 'ok_ng', 30, true, '2026-05-02 10:12:33.783026+00'),
('945dd4b1-28a0-458a-9c99-ebcc01621b55', '63f05394-78b9-4658-8168-38f29467047a', '21f3d175-c3ba-47b9-941f-b2b466fd886f', 8, 'IPQC weighing results', 'Hardener 50 : PU 100 (± 2)', 'Visual', 'ok_ng', 10, true, '2026-05-02 10:12:33.783026+00'),
('9931e83a-64c8-4845-ad20-a803f342ca14', '717bbf50-d06b-498a-8956-5c1aad37fa55', '67bceaf8-ee55-484c-863f-658bd67fdf17', 2, 'Soldering Connector', 'Soldering no miss
(Refer to IPC-A610)', 'Visual', 'ok_ng', 1, true, '2026-05-02 10:24:43.846189+00'),
('aa4fdc78-3949-421b-9855-265f19dd7b29', '63f05394-78b9-4658-8168-38f29467047a', 'c8d11d1a-38d9-4af7-a016-8969d5557a5d', 10, 'Function Inspection & QR code scanning', 'Judgment: PASS', 'Visual', 'ok_ng', 20, true, '2026-05-02 10:12:33.783026+00'),
('d16b8b31-e3e7-4f36-8fab-60f1c34f26fe', '63f05394-78b9-4658-8168-38f29467047a', '74b40312-33e3-4471-b7f9-c2bd59c0981f', 3, 'Burning Program (BT official)', 'Voltage 2 : 3.0 ~ 3.4 V', 'Visual', 'float', 20, true, '2026-05-02 10:12:33.783026+00'),
('d6a0374a-ccf7-4b28-908a-94ca2b467bac', '63f05394-78b9-4658-8168-38f29467047a', 'c8d11d1a-38d9-4af7-a016-8969d5557a5d', 10, 'Function Inspection & QR code scanning', 'Ampere: 19 - 23 mA', 'Visual', 'float', 10, true, '2026-05-02 10:12:33.783026+00'),
('dcb134f9-29f1-4e7a-9abc-3cef3a40cc00', '63f05394-78b9-4658-8168-38f29467047a', '883d6360-b1cd-4b16-8d5d-bdcf0a84042c', 7, 'Label Printing (Refer to YQS RR0021)', 'Consist of 14 digit', 'Visual', 'ok_ng', 30, true, '2026-05-02 10:12:33.783026+00'),
('e4968a4a-d56f-48a3-a88c-78d8195edb00', '63f05394-78b9-4658-8168-38f29467047a', '883d6360-b1cd-4b16-8d5d-bdcf0a84042c', 7, 'Label Printing (Refer to YQS RR0021)', 'S/N not double', 'Visual', 'ok_ng', 40, true, '2026-05-02 10:12:33.783026+00'),
('f7b5c6bc-8f6c-4d45-9d5e-f4c0143ec832', '63f05394-78b9-4658-8168-38f29467047a', '10aaf274-85f8-4ddc-b237-500837994064', 11, 'Visual Inspection (Refer to YQS RR0021)', 'No liquid bubbles on liquid surface, no spillage outside shell, no scratch on housing and label QR Code, Level PU follow drawing, No chip, No blur, No detorsion, No film particle or dirt, No wrong content or letter missing', 'Visual', 'ok_ng', 20, true, '2026-05-02 10:12:33.783026+00'),
('fd44e5bd-d10c-4c1b-be05-6ec2a5d40a58', '63f05394-78b9-4658-8168-38f29467047a', 'c4a980b1-8150-45c0-b84a-90fbb338c7e0', 5, 'First Function Inspection', 'Broadcast Test (-40 dBm)', 'Visual', 'ok_ng', 10, true, '2026-05-02 10:12:33.783026+00')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Total: 28 5F5L check items loaded
-- Coverage: Process-specific quality specifications for critical manufacturing steps
-- Input Types: ok_ng (Pass/Fail), float (numeric measurements), text (documentation)
-- Status: Ready for production tracking and shift data
