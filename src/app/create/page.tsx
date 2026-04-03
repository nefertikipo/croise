import { CreationWizard } from "@/components/creation/creation-wizard";

export const metadata = {
  title: "Create a Crossword | Croise",
  description: "Create a personalized crossword puzzle",
};

export default function CreatePage() {
  return (
    <main className="flex-1 px-4 py-12">
      <CreationWizard />
    </main>
  );
}
