import assert from "node:assert/strict";
import sharp from "sharp";

const logo = await sharp("public/assets/icons/logo.svg").resize({ width: 480 }).png().toBuffer();
for (const [orientation, width, height] of [["portrait", 1206, 2622], ["landscape", 2622, 1206]]) {
  const path = `public/assets/icons/startup-iphone17-${orientation}.png`;
  await sharp({ create: { width, height, channels: 4, background: "#101112" } }).composite([{ input: logo, gravity: "centre" }]).png().toFile(path);
  const image = await sharp(path).metadata();
  assert.equal(image.width, width);
  assert.equal(image.height, height);
  console.log(`${path}: ${width}x${height}`);
}
