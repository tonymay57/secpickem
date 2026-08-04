CREATE TABLE `message_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`participant_id` integer NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	`deleted_by` text,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `message_posts_created_idx` ON `message_posts` (`created_at`);--> statement-breakpoint
ALTER TABLE `participants` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `participants` ADD `tiebreaker` integer;--> statement-breakpoint
ALTER TABLE `participants` ADD `submitted_at` text;--> statement-breakpoint
ALTER TABLE `participants` ADD `payment_claimed_at` text;--> statement-breakpoint
ALTER TABLE `participants` ADD `payment_verified_at` text;--> statement-breakpoint
ALTER TABLE `participants` ADD `payment_verified_by` text;--> statement-breakpoint
ALTER TABLE `participants` ADD `payment_note` text;