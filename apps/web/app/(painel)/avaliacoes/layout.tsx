import { ApenasPara } from "@/components/ui/ApenasPara";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ApenasPara papel="profissional">{children}</ApenasPara>;
}
