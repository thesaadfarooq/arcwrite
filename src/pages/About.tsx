import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

export default function About() {
  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      <SEO
        title="About — Arcwrite"
        description="Arcwrite is an AI-powered interactive fiction platform by Silvergrain. Direct the plot, steer the characters, and craft entire stories without writing a single paragraph."
        canonical="/about"
      />
      <Navbar />

      <main className="pt-28 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-story text-3xl md:text-4xl font-semibold text-foreground mb-8">
            About Arcwrite
          </h1>

          <div className="space-y-5 text-muted-foreground leading-relaxed">
            <p>
              Arcwrite is an AI-powered interactive fiction platform. You direct the plot — choosing
              what happens, who the characters become, and where the story goes — while AI writes
              the prose. Every decision branches into new paths, creating stories that are uniquely yours.
            </p>
            <p>
              Whether you're crafting a sprawling fantasy epic, a tense mystery, or a quiet romance,
              Arcwrite gives you meaningful choices at every turn. No writing experience needed — just
              ideas, instincts, and curiosity.
            </p>
            <p>
              Arcwrite is built by <span className="text-foreground font-medium">Silvergrain</span>.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
