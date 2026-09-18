import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const brevoApiKey = Deno.env.get("BREVO_API_KEY") as string;
const rawHookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET") as string;
const hookSecret = rawHookSecret ? rawHookSecret.replace("v1,whsec_", "") : "";

const SENDER_EMAIL = "karolandrearaigosa2009banquet@gmail.com";
const SENDER_NAME = "PQR";

const subjects: Record<string, string> = {
  signup: "Confirma tu correo",
  recovery: "Recupera tu contrasena",
  invite: "Has sido invitado",
  magiclink: "Tu enlace de acceso",
  email_change: "Confirma tu nuevo correo",
  reauthentication: "Tu codigo de verificacion",
};

function buildConfirmationUrl(siteUrl: string, tokenHash: string, actionType: string, redirectTo: string) {
  const params = new URLSearchParams({
    token: tokenHash,
    type: actionType,
    redirect_to: redirectTo || "",
  });
  return `${siteUrl}/auth/v1/verify?${params.toString()}`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("not allowed", { status: 400 });
  }

  if (!brevoApiKey) {
    console.error("Falta el secreto BREVO_API_KEY");
    return new Response(JSON.stringify({ error: { message: "BREVO_API_KEY not configured" } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!hookSecret) {
    console.error("Falta el secreto SEND_EMAIL_HOOK_SECRET");
    return new Response(JSON.stringify({ error: { message: "SEND_EMAIL_HOOK_SECRET not configured" } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  const wh = new Webhook(hookSecret);

  try {
    const { user, email_data } = wh.verify(payload, headers) as {
      user: { email: string; new_email?: string };
      email_data: {
        token: string;
        token_hash: string;
        redirect_to: string;
        email_action_type: string;
        site_url: string;
      };
    };

    const actionType = email_data.email_action_type;
    const subject = subjects[actionType] || "Notificacion";
    const confirmationUrl = buildConfirmationUrl(
      email_data.site_url,
      email_data.token_hash,
      actionType,
      email_data.redirect_to
    );

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>${subject}</h2>
        <p>Hola,</p>
        <p>Haz clic en el siguiente boton para continuar:</p>
        <p>
          <a href="${confirmationUrl}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">
            Confirmar
          </a>
        </p>
        <p>O usa este codigo si te lo pide la app: <b>${email_data.token}</b></p>
        <p>Si el boton no funciona, copia y pega este enlace:</p>
        <p style="word-break:break-all;color:#555;">${confirmationUrl}</p>
        <p>Si tu no solicitaste esto, ignora este mensaje.</p>
      </div>
    `;

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: user.email }],
        subject,
        htmlContent: html,
      }),
    });

    if (!brevoResponse.ok) {
      const errText = await brevoResponse.text();
      console.error("Brevo error:", errText);
      throw new Error(errText);
    }
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: error instanceof Error ? error.message : String(error),
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
