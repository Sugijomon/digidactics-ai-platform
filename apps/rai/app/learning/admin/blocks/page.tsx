import { ContentEditorShell } from "@/components/learning/admin/ContentEditorShell";
import { requireContentEditor } from "@/lib/learning-admin-data";

const blockGroups = [
  {
    title: "Basis",
    blocks: ["Hero", "Sectietitel", "Tekst", "Quote", "Callout", "Kernpunten", "Checklist"],
  },
  {
    title: "Media",
    blocks: ["Video", "Iframe", "Download", "Afbeelding"],
  },
  {
    title: "Vragen",
    blocks: ["Meerkeuze", "Multi-select", "Waar/onwaar", "Invulvraag", "Essay"],
  },
  {
    title: "Toepassen",
    blocks: ["Casus", "Reflectie", "Scenario", "Evidence prompt"],
  },
];

export default async function AdminBlocksPage() {
  await requireContentEditor();

  return (
    <ContentEditorShell active="blocks">
      <div className="admin-page-header compact-header">
        <div>
          <p className="breadcrumb">Content Editor / Contentblokken</p>
          <h1>Contentblokken</h1>
        </div>
      </div>

      <section className="admin-table-card">
        <div className="admin-section-heading">
          <div>
            <h2>Blokkenbibliotheek</h2>
            <p>Dit is de modulaire set waaruit lessen worden opgebouwd.</p>
          </div>
        </div>
        <div className="block-library-grid">
          {blockGroups.map((group) => (
            <article className="block-type-card" key={group.title}>
              <h2>{group.title}</h2>
              <div>
                {group.blocks.map((block) => (
                  <span className="pill" key={block}>
                    {block}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </ContentEditorShell>
  );
}
