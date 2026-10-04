import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const destination = new URL("../public/assets/icons/", import.meta.url);
await mkdir(destination, { recursive: true });
// Reuse the chart mark on the right of the existing StockMarket wordmark.
const cropped = await sharp(fileURLToPath(new URL("logo.svg", destination)))
  .extract({ left: 930, top: 0, width: 208, height: 218 }).png().toBuffer();
const mark = await sharp(cropped).trim()
  .resize(288, 288, { fit: "inside" }).tint("#e8ba40").png().toBuffer();
const base = await sharp({ create: { width: 512, height: 512, channels: 4, background: "#101112" } })
  .composite([{ input: mark, gravity: "centre" }]).png().toBuffer();
for (const [name, size] of [["app-192.png", 192], ["app-512.png", 512], ["app-maskable.png", 512], ["apple-touch-icon.png", 180]]) {
  await sharp(base).resize(size, size).png().toFile(fileURLToPath(new URL(name, destination)));
}
