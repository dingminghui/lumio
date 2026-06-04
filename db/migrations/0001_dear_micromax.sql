CREATE TABLE "canvas_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"source_item_id" uuid NOT NULL,
	"target_item_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "canvas_edges" ADD CONSTRAINT "canvas_edges_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_edges" ADD CONSTRAINT "canvas_edges_source_item_id_canvas_items_id_fk" FOREIGN KEY ("source_item_id") REFERENCES "public"."canvas_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_edges" ADD CONSTRAINT "canvas_edges_target_item_id_canvas_items_id_fk" FOREIGN KEY ("target_item_id") REFERENCES "public"."canvas_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "canvas_edges_project_id_idx" ON "canvas_edges" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "canvas_edges_source_item_id_idx" ON "canvas_edges" USING btree ("source_item_id");--> statement-breakpoint
CREATE INDEX "canvas_edges_target_item_id_idx" ON "canvas_edges" USING btree ("target_item_id");