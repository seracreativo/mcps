// What an uploaded image is, told by its bytes. The editor takes PNG, JPEG and
// WebP for screenshots and also SVG for media notes; anything else is refused
// before it reaches Redis.

export function imageType(bytes: Buffer): string | null {
  if (bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return "image/png";
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  if (bytes.toString("latin1", 0, 4) === "RIFF" && bytes.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  // SVG is text: an XML prolog, a comment or the tag itself may come first.
  if (/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/.test(bytes.toString("utf8", 0, 1024))) return "image/svg+xml";
  return null;
}
