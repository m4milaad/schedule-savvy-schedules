// Sends one user_notifications row to the user's devices through Firebase Cloud Messaging (HTTP v1).
// Called by the push_user_notification trigger (pg_net), never by browsers.
//
// Secrets: PUSH_WEBHOOK_SECRET (same value as vault secret 'push_webhook_secret'),
//          FCM_SERVICE_ACCOUNT (the Firebase service-account JSON key).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.50.2";

interface ServiceAccount { project_id: string; client_email: string; private_key: string }

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

let cached: { token: string; expires: number } | null = null;

const b64url = (data: ArrayBuffer | string) =>
  btoa(typeof data === "string" ? data : String.fromCharCode(...new Uint8Array(data)))
    .replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

/** OAuth token for FCM from the service account (signed JWT grant), reused until shortly before expiry. */
async function accessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expires > now + 60) return cached.token;

  const pem = sa.private_key.replace(/-----[^-]+-----|\s/g, "");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }))}`;
  const jwt = `${unsigned}.${b64url(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!res.ok) throw new Error(`OAuth token request failed: ${res.status} ${await res.text()}`);
  const { access_token, expires_in } = await res.json();
  cached = { token: access_token, expires: now + expires_in };
  return access_token;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-push-secret") !== secret) return new Response("Forbidden", { status: 403 });

  const { record } = await req.json();
  if (!record?.user_id) return new Response("No record", { status: 400 });

  const { data: devices, error } = await supabase.from("device_tokens").select("token").eq("user_id", record.user_id);
  if (error) return new Response(error.message, { status: 500 });
  if (!devices?.length) return Response.json({ sent: 0 });

  let sa = JSON.parse(Deno.env.get("FCM_SERVICE_ACCOUNT") ?? "null");
  if (typeof sa === "string") sa = JSON.parse(sa); // pasted with surrounding quotes
  if (!sa?.private_key || !sa?.client_email || !sa?.project_id) {
    // Names only, never values: this is a private key.
    console.error(`FCM_SERVICE_ACCOUNT is not a Firebase service-account key (fields: ${Object.keys(sa ?? {}).join(", ")})`);
    return new Response("FCM_SERVICE_ACCOUNT misconfigured", { status: 500 });
  }
  const auth = await accessToken(sa as ServiceAccount);
  let sent = 0;

  for (const { token } of devices) {
    // With a notification part, Android shows it itself while the app is closed or in the background; many phones
    // never wake a swiped-away app for data-only messages. In the foreground PushService gets it and stays quiet
    // (the dashboard shows it). The tag makes a repeat of the same row replace, not stack.
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: String(record.title), body: String(record.message) },
          android: {
            priority: "HIGH",
            notification: { channel_id: "notifications", icon: "ic_notification", tag: String(record.id) },
          },
          data: { id: String(record.id), title: String(record.title), message: String(record.message), type: String(record.type ?? "info") },
        },
      }),
    });
    if (res.ok) sent++;
    // The app was uninstalled or the token rotated: forget it.
    else if (res.status === 404 || (await res.text()).includes("UNREGISTERED")) {
      await supabase.from("device_tokens").delete().eq("token", token);
    }
  }
  return Response.json({ sent });
});
