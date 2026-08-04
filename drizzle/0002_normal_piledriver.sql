CREATE TABLE `participant_favorites` (
	`participant_id` integer NOT NULL,
	`favorite_participant_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`participant_id`, `favorite_participant_id`),
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`favorite_participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `participant_favorites_owner_idx` ON `participant_favorites` (`participant_id`);