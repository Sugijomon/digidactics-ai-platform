export type LearningCourseVisualKey = "literacy" | "proficiency" | "mastery";
export type LearningMicroVisualKey = "privacy" | "prompting" | "client" | "governance" | "default";

export const LEARNING_COURSE_IMAGES: Record<LearningCourseVisualKey, string> = {
  literacy:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAKLObBNqCDPk8CZGknAsbfW9OrLgkx-Sz3YdYp_uuYbDsWZrNEXwxiRk-ueH-8BZ84eiOMdvop85As88v3ZSRUVIme6_xYzRbHosgyvBnoQ2uzvFi8eh9B8pZgh5EtY0ZbuQPzpE6rk7Sar9mYVcDXw-dpneNSxbkwRKvJnWkKlv1NOJsvyJS1jKIyQA_eUm-SF9kJHrvpXm65t9G8iJzDpto11ZrrEfK8jUQAmkOUR686WXTGEPNb4RF-Y-roAgNYtqC-gbp_4SY",
  proficiency:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCvbJ1G9853ATMcaaWZhoKDb86KkE5pajY8WEgRWP9NrkWdBJn6l_vYLIMhQPiHRefRf7lhH8pmnlLwon9n9Oc97Dzapt1tkF_wChyKTsbmC9FJurk3ZGHm8bcEyoqw2_Vv9zIYXzLjZWeTNMd_zzBUj9z0yaatQH8rPujT2hyx1duT-bxUFt_t1aXuA6loyAZ33AukxqZqKc8lVVZQazPZ8dN_2BiuY7CTDCUuYM8sO-SQWh7yeR0C-hgZVqtWsBw8L30XG_codjY",
  mastery:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBdW5o2YTnbaU79eSj8wxNIdL52bhlULb6zGiPHYrXQFVho-iCmL23qpMwo43tpnOEK1_uaRJttkSexhwLNp1xUlyLYyNSQ92s27rIp13IVO2lSRo6AD4z1hqP3EqF7jBqXccpPNqrFP7MD8s3l-XKPh9auE_Qf0gh21NYi5TQeiw4mDmeZbqDmWav1wr6S-LqR5DaUFnOXRT0GcPJ64tKV5259GjlUmcthbxu-m0hYDa0q6UnFgxzH90pcLGC3QO1jgfp2RdC4E_k",
};

export function getLearningCourseVisualKey({
  courseCode,
  difficultyLevel,
  title,
}: {
  courseCode?: string | null;
  difficultyLevel?: string | null;
  title?: string | null;
}): LearningCourseVisualKey {
  const value = `${courseCode ?? ""} ${title ?? ""} ${difficultyLevel ?? ""}`.toLowerCase();

  if (value.includes("mastery") || value.includes("advanced")) return "mastery";
  if (value.includes("proficiency") || value.includes("intermediate")) return "proficiency";
  return "literacy";
}

export function getLearningCourseImage(input: {
  courseCode?: string | null;
  difficultyLevel?: string | null;
  title?: string | null;
}) {
  return LEARNING_COURSE_IMAGES[getLearningCourseVisualKey(input)];
}

export function getLearningCourseLevelNumber(input: {
  courseCode?: string | null;
  difficultyLevel?: string | null;
  title?: string | null;
}) {
  const key = getLearningCourseVisualKey(input);
  if (key === "mastery") return 3;
  if (key === "proficiency") return 2;
  return 1;
}

const MICRO_VISUALS: Record<LearningMicroVisualKey, { accent: string; dark: string; label: string; shape: string }> = {
  privacy: {
    accent: "#20d6c7",
    dark: "#062b35",
    label: "Privacy",
    shape: "M94 70h76v54c0 42-30 71-76 84-46-13-76-42-76-84V70l76-30 76 30",
  },
  prompting: {
    accent: "#68abff",
    dark: "#0b2338",
    label: "Prompting",
    shape: "M48 78h160v90H91l-43 32V78",
  },
  client: {
    accent: "#93c942",
    dark: "#102c24",
    label: "Klantcontact",
    shape: "M72 86c0-24 20-44 44-44h24c24 0 44 20 44 44v22c0 24-20 44-44 44h-8l-36 31v-31h-20c-24 0-44-20-44-44V86",
  },
  governance: {
    accent: "#7dd0ff",
    dark: "#061d2c",
    label: "Governance",
    shape: "M44 84h168M64 84l48-42 48 42M82 84v92M142 84v92M202 84v92M56 176h160",
  },
  default: {
    accent: "#4da8c7",
    dark: "#071f2f",
    label: "Microlearning",
    shape: "M76 64h104v104H76zM102 90h52M102 116h52M102 142h34",
  },
};

export function getLearningMicroVisualKey(input: {
  code?: string | null;
  summary?: string | null;
  title?: string | null;
}): LearningMicroVisualKey {
  const value = `${input.code ?? ""} ${input.title ?? ""} ${input.summary ?? ""}`.toLowerCase();

  if (value.includes("privacy") || value.includes("data") || value.includes("security")) return "privacy";
  if (value.includes("prompt")) return "prompting";
  if (value.includes("klant") || value.includes("client") || value.includes("communicatie") || value.includes("support")) {
    return "client";
  }
  if (value.includes("governance") || value.includes("beleid") || value.includes("compliance")) return "governance";
  return "default";
}

export function getLearningMicroImage(input: {
  code?: string | null;
  summary?: string | null;
  title?: string | null;
}) {
  const visual = MICRO_VISUALS[getLearningMicroVisualKey(input)];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${visual.dark}"/>
        <stop offset="1" stop-color="#0b4a5a"/>
      </linearGradient>
      <radialGradient id="glow" cx="72%" cy="32%" r="56%">
        <stop offset="0" stop-color="${visual.accent}" stop-opacity=".55"/>
        <stop offset=".58" stop-color="${visual.accent}" stop-opacity=".12"/>
        <stop offset="1" stop-color="${visual.accent}" stop-opacity="0"/>
      </radialGradient>
      <pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse">
        <path d="M34 0H0v34" fill="none" stroke="${visual.accent}" stroke-opacity=".14"/>
      </pattern>
    </defs>
    <rect width="640" height="320" fill="url(#bg)"/>
    <rect width="640" height="320" fill="url(#grid)"/>
    <rect width="640" height="320" fill="url(#glow)"/>
    <g fill="none" stroke="${visual.accent}" stroke-linecap="round" stroke-linejoin="round">
      <path d="${visual.shape}" stroke-width="9" opacity=".92" transform="translate(340 50) scale(.82)"/>
      <path d="M38 242c96-86 155-34 240-112 72-66 135-44 210-90" stroke-width="3" opacity=".52"/>
      <path d="M42 274c98-60 178-48 248-90 90-54 140-28 250-92" stroke-width="2" opacity=".32"/>
    </g>
    <g fill="${visual.accent}" opacity=".82">
      <circle cx="104" cy="82" r="5"/>
      <circle cx="178" cy="126" r="4"/>
      <circle cx="262" cy="78" r="6"/>
      <circle cx="554" cy="72" r="5"/>
      <circle cx="516" cy="222" r="4"/>
    </g>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
