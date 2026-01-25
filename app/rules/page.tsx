import type { Metadata } from "next";
import { RulesContent } from "./content";

export const metadata: Metadata = {
  title: "Game Rules | Armory",
  description: "Complete rules for the Armory GitHub RPG - HP drain, XP rewards, difficulty levels, and more.",
};

export default function RulesPage() {
  return <RulesContent />;
}
