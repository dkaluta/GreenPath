# 3. Passkey sign-in

People sign in to GreenPath with a **passkey**: their fingerprint, face or
device PIN, with no password. This page turns passkeys on in Supabase and
explains how the pieces fit. Do [2. Supabase setup](02-supabase-setup.markdown)
first.

The starter kit's password and "Sign in with Google" are gone. Passkeys replaced
them.

## How it works

| Step               | What the person does                                                        |
| ------------------ | --------------------------------------------------------------------------- |
| Sign up            | Types an email, types the code sent to it, gets a username, makes a passkey |
| Sign in            | Types the email, then uses the passkey                                      |
| Lost the passkey   | Types the email and a new code, then makes a new passkey                    |
| New phone/computer | Same as a lost passkey, or use a passkey synced from another device         |

- **The email is only for recovery.** It lives in Supabase Auth (`auth.users`)
  and is used for the sign-up and recovery codes. It is never shown on screen,
  never copied into `profiles`, and the server never returns it. The auth
  middleware drops it from the token before any route sees the user.
- **The username is generated**: three English words, re-rollable, never typed.
  The server creates it on the first `GET /api/me` (`server/lib/profiles.ts`).
- When signing in, the browser lets the person pick any passkey it has for the
  site. The app then checks that the passkey's account has the email they typed,
  and if not signs out again and says so (`client/lib/auth.tsx`).

The passkey ceremony is Supabase's own (`signInWithPasskey()` and
`registerPasskey()` in `@supabase/supabase-js`). It is still marked
**experimental** in Supabase, which is why `client/lib/supabase.ts` sets
`experimental: { passkey: true }`. Pin the `@supabase/supabase-js` version and
test sign-in again whenever you upgrade it.

Supabase only lets a confirmed email user register a passkey, which is why
signing up starts with an email code.

## Turn on passkeys

In Supabase: **Authentication** -> **Passkeys**, and switch on **Enable Passkey
authentication**. Fill in:

| Field                      | Set it to                                                      |
| -------------------------- | -------------------------------------------------------------- |
| Relying Party Display Name | `GreenPath`                                                    |
| Relying Party ID           | your domain with nothing else, e.g. `your-address.workers.dev` |
| Relying Party Origins      | `https://your-address.workers.dev,http://localhost:3000`       |

- The **Relying Party ID** is the domain passkeys are tied to. **Changing it
  later makes every existing passkey stop working**, so pick the real domain
  before people sign up. For local-only work use `localhost`.
- A passkey made on `localhost` only works on `localhost`, and one made on the
  deployed site only works there.
- Origins must be `https`, except `localhost`.

If the switch seems not to take effect (sign-in says passkeys are switched off),
people have reported that changing any other Auth setting and changing it back
makes it apply.

## Send codes, not links

Signing up and recovery use a 6-digit code typed into the app, not a link to
click. Supabase sends a link unless the email template asks for the code.

In Supabase: **Authentication** -> **Emails** -> **Templates** -> **Magic
Link**, and make the body show the code:

```html
<h2>Your GreenPath code</h2>
<p>Type this code in the app: <strong>{{ .Token }}</strong></p>
<p>If you did not ask for it, ignore this email.</p>
```

Do the same in **Confirm signup**. Leave **Confirm email** on: the code is the
confirmation.

The free plan sends only a few emails an hour, and they often land in spam. For
real use, set up your own SMTP server under **Authentication** -> **Emails** ->
**SMTP Settings**.

## Try it

Open **http://localhost:3000/signin**, choose **Create an account**, and go
through the steps. You should end up on the home page with your username in the
footer.

Sign out, then sign in again with the same email and the passkey.

Things that commonly go wrong:

| What you see                              | Why                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| "This browser does not support passkeys"  | An old browser, or an in-app browser without WebAuthn                     |
| "Passkeys only work over https"           | You opened the site by IP address or plain `http`                         |
| "Passkeys aren't set up for this address" | The Relying Party ID or Origins do not match the address                  |
| "Passkey sign-in is switched off"         | The toggle above is off, or has not applied yet                           |
| "We couldn't verify the passkey"          | Some password managers' passkeys fail with Supabase; try the device's own |

## Next

[4. Deploy](04-deploy.markdown).
