"use client";

import { Wrench } from "lucide-react";
import type { ToolOption } from "@/lib/sai-survey/options";

type ImageLogoSource = {
  kind: "image";
  scaleClassName?: string;
  src: string;
};

type InlineLogoSource = {
  html: string;
  kind: "inline";
  scaleClassName?: string;
};

type SymbolLogoSource = {
  kind: "symbol";
  symbol: string;
};

type ToolLogoSource = ImageLogoSource | InlineLogoSource | SymbolLogoSource;

const HTML_TOOL_ID_BY_NEXT_ID: Record<string, string> = {
  adobe_firefly: "firefly",
  canva_ai: "canva",
  copy_ai: "copyai",
  dall_e: "dalle",
  fireflies_ai: "fireflies",
  google_stitch: "stitch",
  google_workspace_ai: "gworkspace",
  hubspot_ai: "hubspotai",
  julius_ai: "julius",
  m365_copilot: "m365",
  microsoft_copilot: "copilot",
  monday_ai: "monday",
  murf_ai: "murf",
  otter_ai: "otter",
  pipedrive_ai: "pipedrive",
  salesforce_einstein: "sfeinstein",
  tl_dv: "tldv",
  zapier_ai: "zapier",
};

const SIMPLE_ICON_SLUGS: Record<string, string> = {
  canva: "canva",
  chatgpt: "openai",
  claude: "anthropic",
  claude_code: "anthropic",
  copyai: "copyai",
  cursor: "cursor",
  deepseek: "deepseek",
  elevenlabs: "elevenlabs",
  fathom: "fathom",
  fireflies: "firefox",
  firefly: "adobe",
  gamma: "gamma",
  gemini: "googlegemini",
  github_copilot: "githubcopilot",
  google_stitch: "google",
  stitch: "google",
  grammarly: "grammarly",
  gworkspace: "googleworkspace",
  hubspot: "hubspot",
  hubspotai: "hubspot",
  jasper: "jasper",
  make: "make",
  midjourney: "midjourney",
  mistral_le_chat: "mistralai",
  murf: "murf",
  n8n: "n8n",
  notebooklm: "google",
  notion_ai: "notion",
  otter: "otter",
  perplexity: "perplexity",
  pipedrive: "pipedrive",
  runway: "runway",
  salesforce: "salesforce",
  sfeinstein: "salesforce",
  synthesia: "synthesia",
  tabnine: "tabnine",
  zapier: "zapier",
};

const SIMPLE_ICON_COLORS: Record<string, string> = {
  adobe: "ff0000",
  anthropic: "d4a373",
  canva: "00c4cc",
  copyai: "5b6cff",
  cursor: "4f46e5",
  deepseek: "1e3a8a",
  elevenlabs: "7c3aed",
  fathom: "06b6d4",
  firefox: "ff7139",
  gamma: "6e56cf",
  githubcopilot: "8b5cf6",
  google: "4285f4",
  googlegemini: "8e75ff",
  googleworkspace: "4285f4",
  grammarly: "15c39a",
  hubspot: "ff7a59",
  jasper: "ff6b35",
  make: "6d5bd0",
  midjourney: "2563eb",
  mistralai: "ff7000",
  murf: "5b5bff",
  n8n: "ea4b71",
  notion: "4f46e5",
  openai: "10a37f",
  otter: "1f8fff",
  perplexity: "1fb8cd",
  pipedrive: "1f8f63",
  runway: "f43f5e",
  salesforce: "00a1e0",
  synthesia: "635bff",
  tabnine: "5c6cff",
  zapier: "ff4f00",
};

const SPECIAL_IMAGE_LOGOS: Record<string, ImageLogoSource> = {
  deepseek: {
    kind: "image",
    src: "https://cdn.simpleicons.org/deepseek/1e3a8a?v=2",
  },
  gemini: {
    kind: "image",
    scaleClassName: "scale-[1.28]",
    src: "https://cdn.simpleicons.org/googlegemini/8e75ff",
  },
};

const SYMBOL_LOGOS: Record<string, string> = {
  custom: "build",
};

const INLINE_LOGOS: Record<string, string> = {
  akkio:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><defs><linearGradient id="akk1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#c7ddff"/><stop offset="100%" stop-color="#8eb8ff"/></linearGradient><linearGradient id="akk2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#a8c7ff"/><stop offset="100%" stop-color="#5f93f1"/></linearGradient><linearGradient id="akk3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8bb3ff"/><stop offset="100%" stop-color="#3f7de8"/></linearGradient></defs><rect x="9" y="2.8" width="6" height="6" rx="0.9" transform="rotate(45 12 5.8)" fill="url(#akk1)"/><rect x="3.8" y="8" width="6" height="6" rx="0.9" transform="rotate(45 6.8 11)" fill="url(#akk2)"/><rect x="14.2" y="8" width="6" height="6" rx="0.9" transform="rotate(45 17.2 11)" fill="url(#akk2)"/><rect x="9" y="13.2" width="6" height="6" rx="0.9" transform="rotate(45 12 16.2)" fill="url(#akk3)"/></svg>',
  canva:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><defs><linearGradient id="canvaG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#14b8c4"/><stop offset="100%" stop-color="#6d28d9"/></linearGradient></defs><circle cx="12" cy="12" r="9.2" fill="url(#canvaG)"/><path d="M14.6 8.2c-.6-.7-1.6-1.2-2.8-1.2-2.4 0-4.1 1.8-4.1 4.3s1.7 4.3 4.1 4.3c1.1 0 2.1-.4 2.8-1.1l-.9-1.2c-.5.5-1.2.8-1.9.8-1.4 0-2.4-1.1-2.4-2.8s1-2.8 2.4-2.8c.8 0 1.5.3 2 .9z" fill="#fff"/></svg>',
  chatgpt:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path d="M12 2.8a4.5 4.5 0 0 1 4.2 2.9 4.5 4.5 0 0 1 1.6 8.1 4.5 4.5 0 0 1-5.8 6.8 4.5 4.5 0 0 1-6.2-4.3 4.5 4.5 0 0 1-1.6-8.1A4.5 4.5 0 0 1 12 2.8Z" fill="none" stroke="#10a37f" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.7 8.1 12 6.2l3.3 1.9v3.8L12 13.8l-3.3-1.9V8.1Z" fill="none" stroke="#10a37f" stroke-width="1.5" stroke-linejoin="round"/><path d="M8.7 11.9v3.8l3.3 1.9 3.3-1.9v-3.8" fill="none" stroke="#10a37f" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  claude_cowork:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><circle cx="12" cy="12" r="8.7" fill="#d4a373" opacity=".2"/><path d="M7.3 8.1h3.1L12 4.8l1.6 3.3h3.1l-2.4 2.2.9 3.4L12 11.8l-3.2 1.9.9-3.4-2.4-2.2Z" fill="#b77945"/><path d="M6.3 16.1c1.3 1.7 3.3 2.7 5.7 2.7s4.4-1 5.7-2.7" fill="none" stroke="#b77945" stroke-width="1.6" stroke-linecap="round"/></svg>',
  copilot:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><defs><linearGradient id="copiA" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#2563eb"/></linearGradient><linearGradient id="copiB" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#f97316"/><stop offset="100%" stop-color="#fb7185"/></linearGradient><linearGradient id="copiC" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#eab308"/><stop offset="100%" stop-color="#22c55e"/></linearGradient><linearGradient id="copiD" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#a855f7"/><stop offset="100%" stop-color="#ec4899"/></linearGradient></defs><path d="M4.2 8.4A4.2 4.2 0 0 1 8.4 4.2h6.2L13 11H4.2z" fill="url(#copiA)"/><path d="M4.2 11H13v7.2H8.4A4.2 4.2 0 0 1 4.2 14z" fill="url(#copiC)"/><path d="M13 11l1.6-6.8h1A4.2 4.2 0 0 1 19.8 8.4V11z" fill="url(#copiA)" opacity=".95"/><path d="M13 11h6.8V14a4.2 4.2 0 0 1-4.2 4.2h-1z" fill="url(#copiD)"/><path d="M13 11v7.2l-2.2 1.6h2.7L16 11z" fill="#fff" opacity=".95"/><path d="M10.8 19.8 13 18.2V11L8.2 14.4v1.2a4.2 4.2 0 0 0 2.6 4.2z" fill="url(#copiB)"/></svg>',
  copyai:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="#5b4de6"/><path d="M14.6 8.2c-.6-.7-1.6-1.2-2.8-1.2-2.4 0-4.1 1.8-4.1 4.3s1.7 4.3 4.1 4.3c1.1 0 2.1-.4 2.8-1.1l-.9-1.2c-.5.5-1.2.8-1.9.8-1.4 0-2.4-1.1-2.4-2.8s1-2.8 2.4-2.8c.8 0 1.5.3 2 .9z" fill="#fff"/><rect x="12.2" y="10.9" width="3.6" height="1.8" rx="0.9" fill="#fff"/></svg>',
  dalle:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><defs><linearGradient id="dalleg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#2dd4bf"/><stop offset="100%" stop-color="#1d4ed8"/></linearGradient></defs><path d="M8.5 4.5c3.9 0 7 3.1 7 7s-3.1 7-7 7H7.2V5.7c0-.66.54-1.2 1.2-1.2h.1zm0 2.2h-.1v9.6h.1a4.8 4.8 0 0 0 0-9.6z" fill="url(#dalleg)"/><path d="M5.2 7.2a5.3 5.3 0 0 1 5.3-5.3v2.2a3.1 3.1 0 0 0-3.1 3.1H5.2z" fill="url(#dalleg)" opacity=".85"/></svg>',
  fathom:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><rect x="5.2" y="4.4" width="14.8" height="3.7" rx="1.8" transform="rotate(30 12.6 6.25)" fill="#1ea7e1"/><rect x="6" y="11" width="9.6" height="3.7" rx="1.8" transform="rotate(30 10.8 12.85)" fill="#1ea7e1"/><rect x="5.1" y="12.2" width="3.8" height="7.6" rx="1.9" fill="#7ecce8"/></svg>',
  firefly:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="2.2" fill="#ea1000"/><path fill="#fff" d="M6.7 7h8.6v2.4H9.2v2.6h5.4v2.3H9.2V17H6.7z"/><rect x="15.4" y="11.4" width="2.1" height="5.6" fill="#fff"/><circle cx="16.45" cy="9.4" r="1" fill="#fff"/><path fill="#fff" d="m17.5 5.6.8 1.6 1.8.2-1.3 1.2.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.2 1.8-.2z"/></svg>',
  gamma:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><defs><linearGradient id="gammaBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#172a68"/><stop offset="100%" stop-color="#3f5bd8"/></linearGradient></defs><rect x="2.5" y="2.5" width="19" height="19" rx="2.8" fill="url(#gammaBg)"/><path d="M12.8 6.3c2 0 3.8.6 5 1.8l-1.7 1.6c-.8-.8-2-1.2-3.3-1.2-2.3 0-4 1.6-4 3.7s1.7 3.7 4 3.7c1.8 0 3.1-.8 3.5-2.1h-3.8v-2.1h6.2c.1.4.1.8.1 1.2 0 3.2-2.4 5.4-6 5.4-3.6 0-6.3-2.6-6.3-6.1s2.7-6 6.3-6z" fill="#fff"/></svg>',
  gworkspace:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="#fff"/><path d="M3 7a4 4 0 0 1 4-4h5v7H3z" fill="#EA4335"/><path d="M12 3h5a4 4 0 0 1 4 4v5h-9z" fill="#FBBC05"/><path d="M12 12h9v5a4 4 0 0 1-4 4h-5z" fill="#34A853"/><path d="M3 12h9v9H7a4 4 0 0 1-4-4z" fill="#4285F4"/></svg>',
  jamie:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><defs><linearGradient id="jamieG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#312e81"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs><rect x="2.5" y="2.5" width="19" height="19" rx="2.4" fill="url(#jamieG)"/><path fill="#fff" d="M6.7 8.2h2.8v5.3c0 1.8-1 2.9-2.8 2.9-1.6 0-2.5-.9-2.8-2.2h2.1c.2.3.4.5.8.5.5 0 .7-.3.7-.9z"/><path fill="#fff" d="M12.3 5.7h2.8v8.1c0 1.9-1.1 3-3 3-.8 0-1.5-.2-2-.7l1.1-1.4c.2.2.5.3.8.3.6 0 .9-.4.9-1.2z"/></svg>',
  jasper:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><defs><linearGradient id="jaspG" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#ec4899"/><stop offset="50%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#22d3ee"/></linearGradient></defs><path d="M12 3.2c-4.9 0-8.8 3.9-8.8 8.8s3.9 8.8 8.8 8.8 8.8-3.9 8.8-8.8S16.9 3.2 12 3.2z" fill="none" stroke="url(#jaspG)" stroke-width="3.2" stroke-linecap="round"/><path d="M8.8 13.3c1 .9 2 .9 3.2 0 1.2.9 2.2.9 3.2 0" fill="none" stroke="#111827" stroke-width="1.6" stroke-linecap="round"/></svg>',
  julius:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path fill="#000" d="M13 4h2.5v10.2c0 3-1.8 4.8-4.8 4.8-2.5 0-4.1-1.4-4.7-3.7h2.4c.5 1 1.3 1.5 2.4 1.5 1.6 0 2.2-1 2.2-2.7z"/></svg>',
  m365:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><defs><linearGradient id="m365a" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#00A4EF"/><stop offset="100%" stop-color="#0078D4"/></linearGradient><linearGradient id="m365b" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#F25022"/><stop offset="100%" stop-color="#FF8C00"/></linearGradient><linearGradient id="m365c" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7FBA00"/><stop offset="100%" stop-color="#00A300"/></linearGradient><linearGradient id="m365d" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#8E44AD"/><stop offset="100%" stop-color="#C239B3"/></linearGradient></defs><path fill="url(#m365a)" d="M4 7.2C4 5.43 5.43 4 7.2 4h5.1c.78 0 1.42.64 1.42 1.42v2.66H7.2A3.2 3.2 0 0 0 4 11.28z"/><path fill="url(#m365c)" d="M4 11.28A3.2 3.2 0 0 1 7.2 8.08h6.52v4.52H7.2A3.2 3.2 0 0 1 4 9.4z" opacity=".9"/><path fill="url(#m365b)" d="M4 12.6h9.72v5.98c0 .78-.64 1.42-1.42 1.42H7.2A3.2 3.2 0 0 1 4 16.8z"/><path fill="url(#m365d)" d="M13.72 8.08h3.08A3.2 3.2 0 0 1 20 11.28v5.52A3.2 3.2 0 0 1 16.8 20h-3.08z"/></svg>',
  midjourney:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><g fill="none" stroke="#111827" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15.4h16"/><path d="M6.5 15.2 9 5.3c.1-.5.8-.7 1.2-.3 1.8 1.8 2.9 4.3 3.1 7l-6.8 3.2z"/><path d="M13.6 7.2c2.2 1.1 3.9 3.1 4.6 5.5l-3.9 1.8"/><path d="M3.8 17.5c1 .6 1.9.6 2.9 0s1.9-.6 2.9 0 1.9.6 2.9 0 1.9-.6 2.9 0 1.9.6 2.9 0"/></g></svg>',
  monday:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><rect x="4.2" y="5.8" width="4.2" height="12.4" rx="2.1" transform="rotate(30 6.3 12)" fill="#ff3d57"/><rect x="10.2" y="5.8" width="4.2" height="12.4" rx="2.1" transform="rotate(30 12.3 12)" fill="#ffcc00"/><circle cx="18.5" cy="15.8" r="2.3" fill="#00ca72"/></svg>',
  murf:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><g fill="#facc15"><rect x="4" y="4.2" width="4.2" height="15.6" rx="2.1"/><rect x="9.9" y="8.2" width="4.2" height="7.6" rx="2.1"/><rect x="15.8" y="4.2" width="4.2" height="15.6" rx="2.1"/></g></svg>',
  otter:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><g fill="#1a73e8"><path d="M6.3 7.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6zm0 2.6a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z"/><rect x="11.1" y="7.2" width="2.4" height="9.6" rx="1.2"/><rect x="14.7" y="7.2" width="2.4" height="9.6" rx="1.2"/><rect x="18.4" y="9.4" width="2.6" height="5.2" rx="1.3"/></g></svg>',
  perplexity_computer:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path d="M5.2 5.5h5.2l1.6 1.8 1.6-1.8h5.2v8.3h-5.2L12 12l-1.6 1.8H5.2V5.5Z" fill="none" stroke="#1fb8cd" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 7.3v11.2M7.8 18.5h8.4" stroke="#1fb8cd" stroke-width="1.6" stroke-linecap="round"/></svg>',
  pipedrive:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="2.2" fill="#0a7d3b"/><path fill="#fff" d="M8.2 6.5h4.2a4.2 4.2 0 1 1 0 8.4h-1.7v3.6H8.2V6.5zm2.5 2.2v4h1.5a2 2 0 1 0 0-4h-1.5z"/></svg>',
  runway:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path fill="#000" d="M7.2 3C4.9 3 3 4.9 3 7.2v9.6C3 19.1 4.9 21 7.2 21H8V3h-.8zm4.1 0v8.5h4.9c.5 0 .9-.4.9-.9V7.2c0-2.3-1.9-4.2-4.2-4.2h-1.6zm0 10.8V21h1.7c1 0 1.8-.3 2.5-.8l-4.2-6.4zm5.9-1.1c-.4.5-.9.9-1.6 1.1l3 4.5c1.5-1 2.4-2.6 2.4-4.4v-1.2h-3.8z"/></svg>',
  sfeinstein:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path fill="#38bdf8" d="M7.5 18.5a4.5 4.5 0 1 1 .3-8.99A5.5 5.5 0 0 1 18.4 8a4.1 4.1 0 0 1 .1 8.2H7.5z"/><path fill="#bae6fd" d="M8.2 17.3a3.2 3.2 0 0 1 .2-6.39 4.2 4.2 0 0 1 8.1-1.1 3.1 3.1 0 0 1 .1 6.2H8.2z"/></svg>',
  synthesia:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path fill="#3f57d4" d="M4 7.2A3.2 3.2 0 0 1 7.2 4h11.2l-.5 4.2H8.1a1.1 1.1 0 0 0-1.1 1.1v1.4H4z"/><path fill="#3f57d4" d="M20 16.8A3.2 3.2 0 0 1 16.8 20H5.6l.5-4.2h9.8a1.1 1.1 0 0 0 1.1-1.1v-1.4H20z"/></svg>',
  tabnine:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><defs><linearGradient id="tabnineG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#d946ef"/><stop offset="100%" stop-color="#3b82f6"/></linearGradient></defs><path d="M12 3.2 19.2 7.3v9.4L12 20.8 4.8 16.7V7.3z" fill="none" stroke="url(#tabnineG)" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.2 8.9v6.2M8.2 8.9l8.5 4.2M8.2 15.1l8.5-4.2" fill="none" stroke="url(#tabnineG)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  tactiq:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><defs><linearGradient id="tactiqG" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#fb7185"/></linearGradient></defs><path d="M5.2 17.8A3.2 3.2 0 0 1 5.4 11.4a4.6 4.6 0 0 1 8.8-.8 3.1 3.1 0 0 1 .4 6.2H5.2z" fill="none" stroke="url(#tactiqG)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="4.1" cy="9.3" r="1.5" fill="none" stroke="url(#tactiqG)" stroke-width="1.6"/><circle cx="12" cy="5" r="1.5" fill="none" stroke="url(#tactiqG)" stroke-width="1.6"/><circle cx="19.2" cy="9.4" r="1.5" fill="none" stroke="url(#tactiqG)" stroke-width="1.6"/></svg>',
  tldv:
    '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><circle cx="12" cy="12" r="9.2" fill="#2f2df7"/><circle cx="12" cy="8.2" r="1.7" fill="#fff"/><path d="M10.5 12.7a2.3 2.3 0 1 1 2.7 3.6l-1.9 1.4-1.1-1.5 1.7-1.2a.6.6 0 1 0-.8-.9z" fill="#fff"/></svg>',
};

const INLINE_LOGO_SCALES: Record<string, string> = {
  akkio: "scale-[1.24]",
  canva: "scale-[1.22]",
  copilot: "scale-[1.28]",
  copyai: "scale-[1.24]",
  dalle: "scale-[1.58]",
  gamma: "scale-[1.22]",
  midjourney: "scale-[1.38]",
  tabnine: "scale-[1.26]",
  tldv: "scale-[1.28]",
};

export function ToolLogo({
  sizeClassName = "h-8 w-8",
  tool,
}: {
  sizeClassName?: string;
  tool: ToolOption;
}) {
  const logo = getToolLogo(tool);

  return (
    <span
      aria-label={`${tool.name} logo`}
      className={`${sizeClassName} grid shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f1f4f6] text-[#40484e]`}
      role="img"
    >
      {logo.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- Mirrors the HTML reference, which uses Simple Icons URLs directly.
        <img
          alt=""
          className={`h-[56%] w-[56%] object-contain ${logo.scaleClassName ?? ""}`}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/icons/tools/generic.svg";
          }}
          src={logo.src}
        />
      ) : null}
      {logo.kind === "inline" ? (
        <span
          aria-hidden="true"
          className={`inline-flex h-[56%] w-[56%] items-center justify-center ${logo.scaleClassName ?? ""}`}
          dangerouslySetInnerHTML={{ __html: logo.html }}
        />
      ) : null}
      {logo.kind === "symbol" ? (
        <Wrench aria-hidden="true" className="h-[56%] w-[56%]" strokeWidth={2} />
      ) : null}
    </span>
  );
}

function getToolLogo(tool: ToolOption): ToolLogoSource {
  const htmlToolId = HTML_TOOL_ID_BY_NEXT_ID[tool.id] ?? tool.id;
  const specialImage = SPECIAL_IMAGE_LOGOS[htmlToolId];

  if (specialImage) {
    return specialImage;
  }

  const inlineLogo = INLINE_LOGOS[htmlToolId];

  if (inlineLogo) {
    return {
      html: inlineLogo,
      kind: "inline",
      scaleClassName: INLINE_LOGO_SCALES[htmlToolId],
    };
  }

  const simpleIconSlug = SIMPLE_ICON_SLUGS[htmlToolId];

  if (simpleIconSlug) {
    return {
      kind: "image",
      src: `https://cdn.simpleicons.org/${simpleIconSlug}/${SIMPLE_ICON_COLORS[simpleIconSlug] ?? "40484e"}`,
    };
  }

  const symbol = SYMBOL_LOGOS[htmlToolId] ?? SYMBOL_LOGOS[tool.id];

  if (symbol) {
    return { kind: "symbol", symbol };
  }

  return { kind: "image", src: "/icons/tools/generic.svg" };
}
