// The changes appshots_edit accepts: everything the editor lets a user do by
// hand. The editor checks every value against its own catalogs and ranges —
// this schema only tells the agent the shape, so ids and limits live in the
// `options` that appshots_read returns, not here.

import { z } from "zod";

const position = z.number().int().min(1);
const set = position.describe("Section position, from 1");
const slide = position.describe("Screenshot position within its section, from 1");
const unit = z.number().min(0).max(1);
const orientation = z.enum(["portrait", "landscape"]);
const upload = z.string().describe("Id returned by the upload endpoint");

const slideInput = z.object({
  headline: z.string(),
  subheadline: z.string().optional(),
  template: z.string().optional().describe("Only if this screenshot leaves its section's composition"),
  screenshot: upload.optional().describe("Without it, an empty slot the user fills by dragging"),
});

const textStyle = z.object({
  size: z.number().optional().describe("Pixels at the section's export height, as the editor shows; range in style.sizeRange"),
  weight: z.number().int().optional().describe("One of options.weights"),
  align: z.enum(["left", "center", "right"]).optional(),
  lineHeight: z.number().optional(),
});

const note = {
  variant: z.string().optional().describe("One of options.notes; each lists the fields it takes"),
  label: z.string().optional(),
  value: z.string().optional().describe("The figure of a stat, the data of a card, the number of a step, the stars of a rating, the message of a notification"),
  icon: z.string().optional().describe("One of options.noteIcons"),
  x: unit.optional().describe("0–1 across the whole canvas; for an arrow, where it points"),
  y: unit.optional(),
  source: z.object({ x: unit, y: unit }).optional().describe("zoom: what it magnifies; arrow: where it starts"),
  scale: z.number().optional().describe("zoom magnification"),
  shape: z.enum(["circle", "rect"]).optional().describe("zoom"),
  ratio: z.number().optional().describe("Width over height: rectangular zoom, highlight"),
  color: z.string().optional().describe("#rrggbb: arrow, highlight, cursor"),
  size: z.number().optional().describe("Multiplier over its natural size"),
  image: upload.optional().describe("media: the picture it shows"),
};

export const edit = z.discriminatedUnion("op", [
  // Screenshots and sections
  z.object({ op: z.literal("set_text"), set, slide, headline: z.string().optional(), subheadline: z.string().optional() }),
  z.object({ op: z.literal("add_slides"), set, slides: z.array(slideInput).min(1), at: position.optional() }),
  z.object({ op: z.literal("set_screenshot"), set, slide, screenshot: upload }),
  z.object({ op: z.literal("remove_slide"), set, slide }),
  z.object({ op: z.literal("move_slide"), set, from: position, to: position }),
  z.object({
    op: z.literal("set_template"),
    set,
    slide: slide.optional(),
    template: z.string().nullable().describe("A template id; null returns a screenshot to its section's"),
  }),
  z.object({ op: z.literal("set_device"), set, device: z.string().optional(), orientation: orientation.optional() }),
  z.object({
    op: z.literal("add_set"),
    family: z.enum(["iphone", "ipad", "mac", "watch"]),
    device: z.string().optional(),
    orientation: orientation.optional(),
    template: z.string().optional(),
    slides: z.array(slideInput).optional(),
  }),
  z.object({ op: z.literal("remove_set"), set }),
  z.object({
    op: z.literal("reset_project"),
    keepDesign: z.boolean().optional().describe("Empty the screenshots but keep sections and design; without it, a new project"),
  }),
  z.object({ op: z.literal("select"), set, slide: slide.optional() }).describe("Moves the user's view; changes nothing"),

  // Look
  z.object({ op: z.literal("set_theme"), theme: z.string() }),
  z.object({
    op: z.literal("set_style"),
    set,
    headline: textStyle.optional(),
    subheadline: textStyle.optional(),
    spacing: z
      .object({ margin: z.number().optional(), gap: z.number().optional(), textGap: z.number().optional() })
      .optional()
      .describe("margin and gap in fractions of the canvas height; textGap in subheadline sizes"),
    rotation: z.number().optional().describe("Device tilt in degrees"),
    shadow: z.boolean().optional(),
    frame: z.enum(["auto", "portrait", "landscape"]).optional().describe("How the device is drawn; auto follows the screenshot"),
    reset: z.boolean().optional().describe("Back to what the template says, before applying the rest"),
  }),
  z.object({ op: z.literal("set_font"), font: z.string().describe("One of options.fonts") }),
  z
    .object({ op: z.literal("set_colors"), background: z.string().optional(), text: z.string().optional(), frame: z.string().optional() })
    .describe("#rrggbb"),

  // Notes over a screenshot
  z.object({ op: z.literal("add_note"), set, slide, ...note }),
  z.object({ op: z.literal("update_note"), set, slide, note: position.describe("Note position, from 1"), ...note }),
  z.object({ op: z.literal("remove_note"), set, slide, note: position }),

  // The App Store listing the editor simulates
  z.object({
    op: z.literal("set_app"),
    name: z.string().optional(),
    subtitle: z.string().optional(),
    developer: z.string().optional(),
    category: z.string().optional(),
    age: z.string().optional(),
    rating: z.number().optional().describe("0–5"),
    ratingCount: z.string().optional().describe("As shown, e.g. '1,2 mil'"),
    description: z.string().optional(),
    icon: upload.nullable().optional().describe("null removes it"),
  }),
]);
