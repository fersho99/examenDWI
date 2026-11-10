CREATE TYPE "public"."candle_interval" AS ENUM('5m', '1h', '1d');--> statement-breakpoint
CREATE TABLE "candles" (
	"coin_id" text NOT NULL,
	"interval" "candle_interval" NOT NULL,
	"open_time" timestamp with time zone NOT NULL,
	"open" double precision NOT NULL,
	"high" double precision NOT NULL,
	"low" double precision NOT NULL,
	"close" double precision NOT NULL,
	"volume" double precision NOT NULL,
	"source" text NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candles_coin_id_interval_open_time_pk" PRIMARY KEY("coin_id","interval","open_time")
);
--> statement-breakpoint
CREATE TABLE "coins" (
	"id" text PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"binance_symbol" text,
	"tint" text NOT NULL,
	"sort_order" smallint DEFAULT 100 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_health" (
	"source" text PRIMARY KEY NOT NULL,
	"last_ok_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"last_error" text,
	"consecutive_failures" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candles" ADD CONSTRAINT "candles_coin_id_coins_id_fk" FOREIGN KEY ("coin_id") REFERENCES "public"."coins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coins_symbol_idx" ON "coins" USING btree ("symbol");