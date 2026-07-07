import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Navigatie" className="breadcrumb">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {index > 0 ? <span className="breadcrumb-sep">›</span> : null}
          {item.href ? (
            <Link className="breadcrumb-link" href={item.href}>
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="breadcrumb-current">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
