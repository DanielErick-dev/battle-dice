import type { Metadata } from "next";
import { VfxLab } from "@/features/lab/VfxLab";

export const metadata: Metadata = {
  title: "Laboratório de efeitos · Battle Dice",
};

export default function LabPage() {
  return <VfxLab />;
}
