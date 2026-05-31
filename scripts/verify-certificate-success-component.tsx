import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CourseCertificateSuccess } from "../apps/rai/components/learning/CourseCertificateSuccess";

const variants = [
  { variant: "literacy", title: "AI Literacy Foundation" },
  { variant: "proficiency", title: "AI Proficiency" },
  { variant: "mastery", title: "AI Mastery" },
] as const;

for (const { variant, title } of variants) {
  const html = renderToStaticMarkup(
    <CourseCertificateSuccess learnerName="Test Cursist" variant={variant} />,
  );

  assert.match(html, new RegExp(`certificate-${variant}`));
  assert.match(html, new RegExp(title));
  assert.match(html, /Certificaat behaald/);
  assert.match(html, /Test Cursist/);
  assert.match(html, /Dit is geen externe licentie, wettelijke vrijwaring of formele AI Act-certificering/);
  assert.doesNotMatch(html, /onclick=/i);
}

console.log(
  JSON.stringify(
    {
      status: "ok",
      certificateVariantsChecked: variants.map(({ variant }) => variant),
    },
    null,
    2,
  ),
);
