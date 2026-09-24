CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `item_tags` (
	`item_id` text NOT NULL,
	`tag` text NOT NULL,
	PRIMARY KEY(`item_id`, `tag`),
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_item_tags_tag` ON `item_tags` (`tag`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`type` text NOT NULL,
	`subtype` text,
	`title` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`search_text` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "items_type_check" CHECK("items"."type" in ('inspiration','character','world')),
	CONSTRAINT "items_status_check" CHECK("items"."status" in ('inbox','seed','growing','ready','archived'))
);
--> statement-breakpoint
CREATE INDEX `idx_items_project_id` ON `items` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_items_type_status` ON `items` (`type`,`status`);--> statement-breakpoint
CREATE INDEX `idx_items_updated_at` ON `items` (`updated_at`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`genre` text DEFAULT '' NOT NULL,
	`logline` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "projects_status_check" CHECK("projects"."status" in ('warming','forming','writing','revising','paused','completed','archived'))
);
--> statement-breakpoint
CREATE INDEX `idx_projects_updated_at` ON `projects` (`updated_at`);--> statement-breakpoint
CREATE TABLE `relations` (
	`id` text PRIMARY KEY NOT NULL,
	`source_item_id` text NOT NULL,
	`target_item_id` text NOT NULL,
	`relation_type` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`source_item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "relations_type_check" CHECK("relations"."relation_type" in ('related','appears_in','influences','conflicts_with','belongs_to','generated_by')),
	CONSTRAINT "relations_not_self" CHECK("relations"."source_item_id" <> "relations"."target_item_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_relations_edge_type` ON `relations` (`source_item_id`,`target_item_id`,`relation_type`);--> statement-breakpoint
CREATE INDEX `idx_relations_source_item_id` ON `relations` (`source_item_id`);--> statement-breakpoint
CREATE INDEX `idx_relations_target_item_id` ON `relations` (`target_item_id`);