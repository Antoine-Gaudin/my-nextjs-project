import { redirect } from "next/navigation";

export default function InscriptionRedirect() {
  redirect("/connexion#inscription");
}
