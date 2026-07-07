import { Breadcrumb } from "@/components/learning/admin/Breadcrumb";
import { ContentEditorShell } from "@/components/learning/admin/ContentEditorShell";
import { requireContentEditor } from "@/lib/learning-admin-data";

const blockGroups = [
  {
    description: "Voor uitleg, structuur en belangrijkste inzichten.",
    title: "Basis",
    blocks: [
      { label: "Hero", purpose: "Startpagina of hoofdstukopening" },
      { label: "Heading", purpose: "Kop H1-H6 op de pagina" },
      { label: "Sectielijn", purpose: "Lijn met sectienaam" },
      { label: "Tekst", purpose: "Uitleg of context" },
      { label: "Quote", purpose: "Kernzin of normatieve formulering" },
      { label: "Callout", purpose: "Let op, tip of waarschuwing" },
      { label: "Kernpunten", purpose: "Samenvatting in bullets" },
      { label: "Checklist", purpose: "Controlelijst voor toepassing" },
    ],
  },
  {
    description: "Voor externe of downloadbare leerobjecten.",
    title: "Media",
    blocks: [
      { label: "Video", purpose: "Instructie of uitlegvideo" },
      { label: "Iframe", purpose: "Embedded tool of externe pagina" },
      { label: "Download", purpose: "PDF, template of handout" },
      { label: "Afbeelding", purpose: "Schema, visual of voorbeeld" },
    ],
  },
  {
    description: "Voor kennischeck, toetsing en scenario completion evidence.",
    title: "Vragen",
    blocks: [
      { label: "Meerkeuze", purpose: "Een correct antwoord" },
      { label: "Multi-select", purpose: "Meerdere juiste antwoorden" },
      { label: "Waar/onwaar", purpose: "Snelle conceptcheck" },
      { label: "Invulvraag", purpose: "Korte vrije invoer" },
      { label: "Essay", purpose: "Reflectie of bewijsstuk" },
    ],
  },
  {
    description: "Voor praktijkgerichte AI literacy en microlearning scenario's.",
    title: "Toepassen",
    blocks: [
      { label: "Casus", purpose: "Situatie met context" },
      { label: "Reflectie", purpose: "Eigen afweging formuleren" },
      { label: "Scenario", purpose: "Keuze in werksituatie" },
      { label: "Evidence prompt", purpose: "Bewijs van afronding" },
    ],
  },
];

export default async function AdminBlocksPage() {
  await requireContentEditor();

  return (
    <ContentEditorShell active="blocks">
      <div className="admin-page-header compact-header">
        <div>
          <Breadcrumb
            items={[
              { label: "Content Editor", href: "/learning/admin" },
              { label: "Contentblokken" },
            ]}
          />
          <h1>Contentblokken</h1>
        </div>
      </div>

      <section className="admin-table-card block-library-overview">
        <div className="admin-section-heading">
          <div>
            <h2>Blokkenbibliotheek</h2>
            <p>De modulaire bouwstenen waaruit lessen, toetsvragen en microlearnings bestaan.</p>
          </div>
        </div>
        <div className="block-library-grid">
          {blockGroups.map((group) => (
            <article className="block-type-card" key={group.title}>
              <div className="block-type-heading">
                <span>{group.blocks.length}</span>
                <div>
                  <h2>{group.title}</h2>
                  <p>{group.description}</p>
                </div>
              </div>
              <div className="block-chip-grid">
                {group.blocks.map((block) => (
                  <div className="block-chip" key={block.label}>
                    <strong>{block.label}</strong>
                    <span>{block.purpose}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </ContentEditorShell>
  );
}
