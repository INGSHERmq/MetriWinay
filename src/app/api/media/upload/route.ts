import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseAdminClient();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 422 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() ?? "jpg";
    const fileName = `${crypto.randomUUID()}.${ext}`;

    const { data, error } = await supabase.storage
      .from("winay")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error("Supabase storage upload error:", error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("winay").getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl, path: data.path });
  } catch (err) {
    console.error("Upload endpoint error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
