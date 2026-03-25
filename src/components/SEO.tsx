import { Helmet } from "react-helmet-async";

const BASE_URL = "https://arcwrite.app";
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  faqItems?: FAQItem[];
}

export default function SEO({ title, description, canonical, noindex, breadcrumbs, faqItems }: SEOProps) {
  const fullUrl = canonical ? `${BASE_URL}${canonical}` : undefined;

  const breadcrumbLd = breadcrumbs
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: `${BASE_URL}${item.url}`,
        })),
      }
    : null;

  const faqLd = faqItems
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }
    : null;

  return (
    <Helmet>
      <title>{title}</title>
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {description && <meta name="description" content={description} />}
      {fullUrl && <link rel="canonical" href={fullUrl} />}
      {description && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      {fullUrl && <meta property="og:url" content={fullUrl} />}
      {description && <meta property="og:type" content="website" />}
      {description && <meta property="og:site_name" content="Arcwrite" />}
      {description && <meta property="og:image" content={DEFAULT_IMAGE} />}
      {description && <meta name="twitter:card" content="summary_large_image" />}
      {description && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      {description && <meta name="twitter:image" content={DEFAULT_IMAGE} />}
      {breadcrumbLd && (
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
      )}
      {faqLd && (
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
      )}
    </Helmet>
  );
}
