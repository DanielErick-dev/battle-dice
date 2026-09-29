import type { Metadata } from "next";
import { SettingsScreen } from "@/features/menu/ui/SettingsScreen";

export const metadata: Metadata = { title: "Configurações · Battle Dice" };

export default function SettingsPage() {
  return <SettingsScreen />;
}
