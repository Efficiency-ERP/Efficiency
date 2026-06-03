import { redirect } from "next/navigation"
import { createServerClientInstance } from "@/lib/supabase/server"

export default async function Home() {
  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  } else {
    redirect("/login")
  }
}
