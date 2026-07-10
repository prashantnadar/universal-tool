import "dotenv/config";
console.log("URL:", process.env.SUPABASE_URL);
console.log(
    "Service Key:",
    process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20)
);
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    }
);

// CHANGE THIS ONLY IF YOU WANT TO MAKE A DIFFERENT USER THE FIRST ADMIN
const email = "prashantnadar18@gmail.com";

async function main() {
    const { data: users, error: userError } =
        await supabase.auth.admin.listUsers();

    if (userError) throw userError;

    const user = users.users.find((u) => u.email === email);

    if (!user) {
        throw new Error(`User not found: ${email}`);
    }

    const { error } = await supabase
        .from("user_roles")
        .upsert(
            {
                user_id: user.id,
                role: "admin",
            },
            {
                onConflict: "user_id,role",
            }
        );

    if (error) throw error;

    console.log(`✅ ${email} is now an admin.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});