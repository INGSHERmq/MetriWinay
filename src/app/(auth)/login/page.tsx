import { Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/app/(auth)/login/auth-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) redirect("/");

  return (
    <main className="grid min-h-screen place-items-center bg-panel px-4">
      <section className="w-full max-w-md rounded-md border border-line bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-teal text-white">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Entrar a MetriWinay</h1>
            <p className="text-sm text-muted">Gestiona redes, posts y reportes.</p>
          </div>
        </div>
        <AuthForm />
      </section>
    </main>
  );
}
