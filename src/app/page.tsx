import { TutorWorkspace } from "@/components/tutor-workspace";
import { noteSets } from "@/lib/seed-data";

export default function Home() {
  return <TutorWorkspace noteSets={noteSets} />;
}
