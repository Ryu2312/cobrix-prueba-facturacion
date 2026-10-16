CREATE TABLE `company` (
	`id` integer PRIMARY KEY,
	`name` text DEFAULT '' NOT NULL,
	`tax_id` text DEFAULT '' NOT NULL,
	`collection_email` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`external_id` integer PRIMARY KEY,
	`customer_id` text NOT NULL,
	`code` text NOT NULL,
	`status` text NOT NULL,
	`plan` text NOT NULL,
	`price` real NOT NULL,
	`currency` text NOT NULL,
	`branch` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_contracts_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`document_type` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`origin` text DEFAULT 'ISP' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`external_contract_id` integer NOT NULL,
	`external_installment_id` text NOT NULL,
	`period` text NOT NULL,
	`due_at` text NOT NULL,
	`cut_at` text NOT NULL,
	`currency` text NOT NULL,
	`total` real NOT NULL,
	`balance` real NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`paid_at` text,
	`payer_invoice_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_invoices_external_contract_id_contracts_external_id_fk` FOREIGN KEY (`external_contract_id`) REFERENCES `contracts`(`external_id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE `provider` (
	`id` integer PRIMARY KEY,
	`base_url` text DEFAULT 'http://127.0.0.1:4310' NOT NULL,
	`username` text DEFAULT 'cobrix' NOT NULL,
	`password` text DEFAULT 'cobrix-sandbox' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `run_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`run_id` integer NOT NULL,
	`external_contract_id` integer,
	`external_installment_id` text,
	`customer_id` text,
	`period` text,
	`outcome` text NOT NULL,
	`reason` text NOT NULL,
	`amount` real,
	`details` text DEFAULT '{}' NOT NULL,
	CONSTRAINT `fk_run_items_run_id_runs_id_fk` FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`kind` text NOT NULL,
	`simulation` integer NOT NULL,
	`status` text DEFAULT 'RUNNING' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`error` text,
	`started_at` text NOT NULL,
	`finished_at` text
);
--> statement-breakpoint
CREATE TABLE `sync_settings` (
	`id` integer PRIMARY KEY,
	`statuses` text DEFAULT '["ACTIVO","CORTADO"]' NOT NULL,
	`import_window_months` integer,
	`max_installments_per_contract` integer,
	`grace_days` integer DEFAULT 0 NOT NULL,
	`max_new_invoices` integer,
	`max_new_amount` real,
	`excluded_document_types` text DEFAULT '[]' NOT NULL,
	`schedule_enabled` integer DEFAULT false NOT NULL,
	`schedule_time` text DEFAULT '02:00' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contracts_customer_idx` ON `contracts` (`customer_id`);--> statement-breakpoint
CREATE INDEX `contracts_status_idx` ON `contracts` (`status`);--> statement-breakpoint
CREATE INDEX `customers_name_idx` ON `customers` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_external_installment_unique` ON `invoices` (`external_contract_id`,`external_installment_id`);--> statement-breakpoint
CREATE INDEX `invoices_status_due_idx` ON `invoices` (`status`,`due_at`);--> statement-breakpoint
CREATE INDEX `invoices_contract_idx` ON `invoices` (`external_contract_id`);--> statement-breakpoint
CREATE INDEX `run_items_run_idx` ON `run_items` (`run_id`);--> statement-breakpoint
CREATE INDEX `run_items_installment_idx` ON `run_items` (`external_contract_id`,`external_installment_id`);--> statement-breakpoint
CREATE INDEX `runs_started_idx` ON `runs` (`started_at`);