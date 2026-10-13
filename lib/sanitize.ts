import sanitizeHtml from "sanitize-html";

const styleValue = /^(?:[-#(),.%\w\s]+)$/;

export function summaryPreview(html: string, locale: string) {
  const text = sanitizeHtml(html, {
    allowedTags: [], allowedAttributes: {}, textFilter: (value) => `${value} `,
  }).replace(/\s+/g, " ").trim();
  const segments = Array.from(new Intl.Segmenter(locale, { granularity: "grapheme" }).segment(text));
  return segments.slice(0, 600).map((part) => part.segment).join("") + (segments.length > 600 ? "..." : "");
}

export const sanitizeSummaryHtml = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "h1",
      "h2",
      "h3",
      "h4",
      "span",
    ],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ["href", "name", "target", "rel"],
      div: ["class", "style"],
      h1: ["class", "style"],
      h2: ["class", "style"],
      h3: ["class", "style"],
      h4: ["class", "style"],
      li: ["class", "style"],
      p: ["class", "style"],
      span: ["class", "style"],
      strong: ["class", "style"],
      ul: ["class", "style"],
      ol: ["class", "style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedStyles: {
      "*": {
        "background-color": [styleValue],
        border: [styleValue],
        "border-radius": [styleValue],
        color: [styleValue],
        "font-size": [styleValue],
        "font-weight": [styleValue],
        "line-height": [styleValue],
        margin: [styleValue],
        "margin-bottom": [styleValue],
        "margin-left": [styleValue],
        "margin-right": [styleValue],
        "margin-top": [styleValue],
        padding: [styleValue],
        "padding-left": [styleValue],
        "text-decoration": [styleValue],
      },
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
    },
  });
