import { Liveblocks } from "@liveblocks/node";
import { currentUser } from "@clerk/nextjs/server";
import { syncUser } from "@/app/actions";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 10;

const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY || "sk_test_dummy_key_please_replace",
});

export async function POST(request: Request) {
    const timeoutPromise = new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error("Liveblocks auth timeout")), 9000)
    );

    const authPromise = (async (): Promise<Response> => {
        try {
            // Parse room from request body first (doesn't need auth)
            const body = await request.json();
            const { room } = body;
            const notebookId = room?.replace("notebook-", "");

            // Fetch user and sync to DB (single call)
            const [user, dbUser] = await Promise.all([
                currentUser(),
                syncUser(),
            ]);

            if (!user || !dbUser) {
                return new Response("Unauthorized", { status: 401 });
            }

            const session = liveblocks.prepareSession(dbUser.id, {
                userInfo: {
                    name: user.fullName || user.emailAddresses[0]?.emailAddress || "Anonymous",
                    avatar: user.imageUrl || "",
                },
            });

            // Check notebook ownership directly (avoid extra syncUser call in checkNotebookAccess)
            let canEdit = false;
            if (notebookId) {
                const [notebookResult, accessRequestResult] = await Promise.all([
                    supabaseAdmin.from("Notebook").select("userId").eq("id", notebookId).single(),
                    supabaseAdmin.from("RoomAccessRequest").select("status").eq("notebookId", notebookId).eq("userId", dbUser.id).maybeSingle(),
                ]);
                const isOwner = notebookResult.data?.userId === dbUser.id;
                const isApprovedCollaborator = accessRequestResult.data?.status === "approved";
                canEdit = isOwner || isApprovedCollaborator;
            }

            session.allow(room, canEdit ? session.FULL_ACCESS : session.READ_ACCESS);

            const { status: authStatus, body: authBody } = await session.authorize();
            return new Response(authBody, { status: authStatus });
        } catch (error) {
            console.error("Liveblocks Auth Error:", error);
            return new Response("Internal Server Error", { status: 500 });
        }
    })();

    try {
        return await Promise.race([authPromise, timeoutPromise]);
    } catch {
        console.warn("Liveblocks auth timed out after 9s, returning 503");
        return new Response("Service temporarily unavailable", { status: 503 });
    }
}
