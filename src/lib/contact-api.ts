import { supabase } from "@/integrations/supabase/client";

export interface ContactMessageInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function submitContactMessage(data: ContactMessageInput) {
  const { error } = await supabase.from("contact_messages").insert({
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    subject: data.subject.trim(),
    message: data.message.trim(),
  });

  if (error) {
    throw error;
  }

  return true;
}