CREATE TABLE `email_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`participant_id` integer NOT NULL,
	`week` integer NOT NULL,
	`status` text NOT NULL,
	`provider_id` text,
	`sent_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_log_participant_week_idx` ON `email_log` (`participant_id`,`week`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`week` integer NOT NULL,
	`start_time` text NOT NULL,
	`home_team` text NOT NULL,
	`away_team` text NOT NULL,
	`home_team_id` text NOT NULL,
	`away_team_id` text NOT NULL,
	`home_sec` integer NOT NULL,
	`away_sec` integer NOT NULL,
	`home_score` integer,
	`away_score` integer,
	`winner_team` text,
	`completed` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'Scheduled' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `games_week_idx` ON `games` (`week`);--> statement-breakpoint
CREATE INDEX `games_start_time_idx` ON `games` (`start_time`);--> statement-breakpoint
CREATE TABLE `participants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`paid` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `participants_email_idx` ON `participants` (`email`);--> statement-breakpoint
CREATE TABLE `picks` (
	`participant_id` integer NOT NULL,
	`game_id` text NOT NULL,
	`selection` text NOT NULL,
	`selected_team` text,
	`points` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`participant_id`, `game_id`),
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `picks_game_idx` ON `picks` (`game_id`);