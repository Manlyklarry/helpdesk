import 'dotenv/config'
import { prisma } from '../src/lib/db.js'

async function main() {
  const ticket = await prisma.ticket.findFirst({
    where: { subject: 'How do I transfer account ownership to a colleague?' },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  if (!ticket) {
    console.error('Ticket not found')
    process.exit(1)
  }
  console.log(`Found ticket #${ticket.id}: "${ticket.subject}"`)

  const agent = await prisma.user.findFirst({
    where: { deletedAt: null, role: 'admin' },
    orderBy: { createdAt: 'asc' },
  })
  if (!agent) {
    console.error('No agent user found in database')
    process.exit(1)
  }
  console.log(`Using agent: ${agent.name} <${agent.email}>`)

  // Remove all existing messages so we own the whole thread
  await prisma.ticketMessage.deleteMany({ where: { ticketId: ticket.id } })
  console.log('Cleared existing messages')

  const customer = { name: ticket.fromName, email: ticket.fromEmail }
  const base = ticket.createdAt.getTime()

  // Each entry: [minutesAfterBase, senderType, body]
  const messages: [number, 'customer' | 'agent', string][] = [
    // ── 1 ── customer ────────────────────────────────────────────────────────
    [0, 'customer', `Hi there! I need to transfer my account ownership to my colleague Sarah Odu (sarah.odu@ops.ng).
She'll be taking over as the workspace admin going forward because I'm moving to a different role within the company.
I've been the primary owner for about two years, so this is a fairly significant handover.
I want to make sure the transition is smooth and that Sarah has full access to everything she needs from day one.

A bit of context on what we use the platform for:
- Managing support tickets for our ops team (about 40 agents)
- Billing and subscription management
- API integrations with three internal tools
- Custom email domain notifications

I wasn't sure where to start, so I thought I'd reach out to support first before clicking anything I shouldn't.
The last thing I want is to accidentally lock myself or Sarah out of the workspace.

Could you walk me through the correct process?
Are there any precautions I should take before starting?
Is there a recommended order of steps to follow?
Should Sarah do anything on her end to prepare?
I'd also appreciate knowing whether there's any downtime during the transfer.
Thank you so much for your help — I really appreciate it.`],

    // ── 2 ── agent ───────────────────────────────────────────────────────────
    [22, 'agent', `Hi James! Happy to walk you through this — it's a great idea to check before proceeding.

Here is the recommended end-to-end process for transferring workspace ownership:

Step 1 — Verify Sarah's account status
Before anything else, confirm that Sarah:
  a) Is already a member of your workspace
  b) Has verified her email address
  c) Is on a paid plan (the Pro plan or higher is required to hold the Owner role)

Step 2 — Back up any personal API keys
Any API keys tied to your personal profile (not the workspace) will remain yours.
However, if any workspace-level keys are associated with your Owner role, note them down.

Step 3 — Initiate the transfer
Navigate to: Settings → Team → Members
Find Sarah in the list, click the three-dot (⋮) menu next to her name, and select "Make Owner".
You will be asked to confirm via a prompt — read it carefully before clicking Confirm.

Step 4 — What changes immediately
- Sarah becomes Owner with full billing, settings, and team management access.
- You are automatically downgraded to Member (not removed).
- All agents, tickets, integrations, and data remain completely unaffected.

Step 5 — After the transfer
You can ask Sarah to promote you to Admin if you still need elevated access.
There is no downtime during the transfer — the change is instant.

Let me know if you'd like me to check Sarah's account status from our end before you begin.`],

    // ── 3 ── customer ────────────────────────────────────────────────────────
    [65, 'customer', `Thanks for the detailed breakdown — that's really helpful!

I went into Settings → Team → Members and found Sarah's profile.
I clicked the three-dot menu and I can see the "Make Owner" option, but it is greyed out.
I hovered over it and a small tooltip appeared that said something like "Upgrade required".

Sarah is definitely already a member — I can see her in the list.
Her email should be verified because she logs in every day without any issues.
However, I suspect the problem might be the paid plan requirement you mentioned.

Sarah is currently on the Free tier.
I checked her profile and it shows "Free Plan" under her account details.

A few questions before I ask her to upgrade:
1. Which plan does she need — Pro or can she stay on the lower tier?
2. If she upgrades just to receive the transfer, can she downgrade again afterwards?
3. Will the ownership transfer the billing responsibility to her card as well?
4. Are there any features she might lose if the plan changes after the transfer?
5. Is there a way to apply the upgrade from my side so she doesn't have to do it herself?

Also, you mentioned you could apply a one-month trial of Pro to her account.
I'd definitely be interested in that option if it's still available.
That would let us complete the transfer without Sarah having to enter payment details right away.
Could you set that up for her?`],

    // ── 4 ── agent ───────────────────────────────────────────────────────────
    [90, 'agent', `Great questions, James. Let me answer each one:

1. Plan requirement
   Sarah needs to be on the Pro plan or higher to hold the Owner role.
   The Starter plan does not qualify. Pro is the minimum.

2. Downgrading after transfer
   Yes — once Sarah is Owner, she can choose any plan she likes.
   However, if she downgrades to Free after becoming Owner, she would lose the Owner role
   and it would revert to the workspace's previous billing state.
   We recommend keeping at least a Pro subscription on the owner account.

3. Billing responsibility
   Yes — after the transfer, billing will be tied to Sarah's account and payment method.
   She will receive all future invoices. You will no longer be billed as the workspace owner.

4. Feature continuity
   All existing workspace features, data, integrations, and agent seats are preserved
   regardless of the plan change. Nothing will be lost during the transfer itself.

5. Upgrading from your side
   You cannot upgrade Sarah's personal account from your admin panel —
   each user controls their own plan. However, there is one exception:
   as workspace Owner, you can purchase additional seats and assign them to users.
   This is different from upgrading someone's personal plan tier.

Regarding the Pro trial:
I have gone ahead and applied a 30-day Pro trial to Sarah's account (sarah.odu@ops.ng).
She does not need to enter a payment method during this trial period.
The trial activates the moment she next logs in.

Please ask Sarah to log out and log back in, then you can reattempt the ownership transfer.
Let me know how it goes!`],

    // ── 5 ── customer ────────────────────────────────────────────────────────
    [145, 'customer', `Perfect — Sarah just logged back in and confirmed she can now see "Pro Trial" on her account.
The badge in the top right shows "Pro" so the trial seems to have applied correctly. Thank you!

I went back to Settings → Team → Members and clicked the three-dot menu next to Sarah again.
This time, "Make Owner" is no longer greyed out — the option is clickable.

However, when I click it, I get a modal dialogue that says:

  "Two-factor authentication is required before ownership can be transferred.
   The incoming owner must have 2FA enabled on their account.
   Please ensure sarah.odu@ops.ng has completed 2FA setup before proceeding."

I wasn't expecting this requirement.
Sarah doesn't currently have 2FA set up — most of our team doesn't use it.
I understand it's a security measure, but we're a bit surprised by it.

A few follow-up questions:
1. Is 2FA mandatory for ownership transfer, or can it be waived?
2. Which 2FA method is supported — SMS, authenticator app, or both?
3. How long does it take to set up?
4. After the transfer is complete, can Sarah disable 2FA again if she finds it inconvenient?
5. Is there a way to bulk-enable 2FA for our whole team as an admin policy?

I'll go ahead and help Sarah set up 2FA now, but I wanted to understand the policy first.
Could you also let me know if there are any other requirements I might hit after 2FA is sorted?
I'd rather know everything upfront so we don't get stopped by another gate.`],

    // ── 6 ── agent ───────────────────────────────────────────────────────────
    [170, 'agent', `Completely understandable, James — the 2FA requirement is a security safeguard we added
specifically for high-privilege actions like ownership transfers. Here are your answers:

1. Is 2FA mandatory?
   Yes, this cannot be waived. It is a hard requirement for the incoming owner.
   The Owner role has full access to billing and team management, so we enforce 2FA
   to protect against account takeover scenarios.

2. Supported 2FA methods
   Both methods are supported:
   - TOTP authenticator app (Google Authenticator, Authy, 1Password, etc.) — recommended
   - SMS-based one-time codes — available but slightly less reliable due to carrier delays

3. How long does setup take?
   With an authenticator app, setup takes roughly 2–3 minutes.
   Sarah needs to:
     a) Go to Account → Security → Two-Factor Authentication
     b) Click "Enable 2FA"
     c) Scan the QR code with her authenticator app
     d) Enter the 6-digit code to confirm
     e) Save the backup recovery codes somewhere safe

4. Can 2FA be disabled after the transfer?
   Technically yes — but as Owner, Sarah's account is a high-value target.
   We strongly recommend she keeps 2FA enabled permanently.
   As a note: if your workspace is on Enterprise, you can enforce 2FA for all members.

5. Bulk 2FA enforcement
   Yes! Under Settings → Security → Authentication Policy, you can set 2FA as mandatory
   for all team members. They will be prompted to enrol on their next login.

Other requirements after 2FA?
There is one more potential blocker I should mention:
if your workspace has any pending sent invitations (invites sent to people who haven't joined yet),
you may need to revoke or allow them to lapse before the transfer completes.
I'll check on your workspace's invite state now so you're not surprised.`],

    // ── 7 ── customer ────────────────────────────────────────────────────────
    [225, 'customer', `Sarah has set up 2FA — she used Google Authenticator and confirmed the 6-digit code worked.
She also saved her backup codes safely. All good on that front.

I went back to Settings → Team → Members, clicked the three-dot menu next to Sarah,
and selected "Make Owner" again. The 2FA modal was gone this time.

However, I hit another error. A red banner appeared at the top of the page saying:

  "Transfer blocked: This workspace has 3 pending invitations.
   Please revoke all pending invitations before transferring ownership."

I hadn't noticed these pending invites before.
I went to Settings → Team → Invitations and found 3 old invitations:
  - invite1@somecompany.com — sent 47 days ago
  - invite2@testdomain.io — sent 31 days ago
  - invite3@partnerco.ng — sent 12 days ago

All three show "Pending" status and appear to be from before my time managing the workspace.
I'm not sure if these were intentional or forgotten.

Before I revoke them:
1. Will the people who were invited receive a notification that their invite was revoked?
2. Is there a way to check who sent each invite originally?
3. If I revoke them, can I resend the invites after the transfer from Sarah's account?
4. Are there any other pending actions I should clear before attempting the transfer?

I'm happy to revoke all three — they're clearly stale — but I just want to be sure.
Also, I appreciate you flagging this in advance in your previous message.
If you hadn't mentioned it I would have been quite confused by that error message.`],

    // ── 8 ── agent ───────────────────────────────────────────────────────────
    [255, 'agent', `Great news that 2FA is sorted — Sarah followed the steps perfectly.

On to the pending invitations:

1. Will revoked invitees be notified?
   No. Revoking a pending invitation is a silent action on our platform.
   The invitee's invite link simply becomes invalid. They receive no email or notification.
   If they try to use the old link, they'll see an "Invitation expired or revoked" message.

2. Who sent each invite?
   I've looked up your workspace's invite log:
   - invite1@somecompany.com — sent by you (James Ogunleye) on Day 47
   - invite2@testdomain.io — sent by a former team member whose account has since been deleted
   - invite3@partnerco.ng — sent by you (James Ogunleye) on Day 12
   These look like they may have been test invites or outreach that never converted.

3. Can invites be resent after the transfer?
   Yes, absolutely. Once Sarah is Owner, she can send new invitations to any of these addresses
   (or any other address) from Settings → Team → Invite Members.
   The transfer itself has no impact on your ability to invite new members.

4. Any other pending actions to clear?
   I've done a full pre-transfer check on your workspace and found nothing else.
   No pending plan changes, no unconfirmed billing updates, no outstanding ownership disputes.
   Once you revoke those three invitations, you should be clear to transfer.

Go ahead and revoke all three — they are clearly stale and there is no risk.
After revoking, wait about 10 seconds for the system to update, then retry the transfer.
I'm confident it will go through this time. Let me know!`],

    // ── 9 ── customer ────────────────────────────────────────────────────────
    [320, 'customer', `Done! I revoked all three pending invitations from the Invitations settings page.
I waited about 30 seconds just to be safe, then navigated back to Team → Members.

I clicked the three-dot menu next to Sarah, selected "Make Owner", and this time...
THE TRANSFER WORKED! The confirmation modal appeared, I clicked Confirm, and it went through.

The page refreshed automatically and now shows:
  - Sarah Odu — Owner (Pro Trial)
  - James Ogunleye — Member

The transfer is complete! I'm genuinely relieved after all those steps.
Thank you so much for your patience in guiding me through each blocker.

Now that the transfer is done, I have a few follow-up questions:

1. I notice I'm now listed as "Member" — can I still view tickets and help the team?
2. Can Sarah promote me back to an Admin role so I can still manage the team?
3. Will I still receive billing emails, or do those go exclusively to Sarah now?
4. I noticed my old admin dashboard looks different — some menu items are gone. Is this expected?
5. Are there any post-transfer steps Sarah should complete to fully secure the account?

Also, is there anything you'd recommend we do in the first 24 hours after the transfer
to make sure everything is working properly and nothing falls through the cracks?
I want to make a proper handover checklist if possible.`],

    // ── 10 ── agent ──────────────────────────────────────────────────────────
    [345, 'agent', `Congratulations, James! The transfer is complete and everything looks correct from our side.

To answer your follow-up questions:

1. Member access for James
   Yes, as a Member you can still:
   - View, reply to, and resolve tickets
   - Use the full agent interface
   - Access all ticket history and customer data
   What you lose is access to workspace Settings, billing, and team management.

2. Promoting James to Admin
   Yes — Sarah can promote you to Admin from Settings → Team → Members.
   She clicks the three-dot menu next to your name and selects "Change role → Admin".
   Admin gives you team management and settings access, but NOT billing or ownership.

3. Billing emails
   All future billing notifications now go to Sarah's email (sarah.odu@ops.ng).
   Your card is no longer charged; Sarah's payment method (or the one she sets up after trial)
   will be used for future billing cycles.

4. Reduced menu for James
   Yes, this is fully expected. As a Member, the Settings menu is restricted.
   You will no longer see: Billing, Integrations (workspace-level), Team management, or Security.
   This is the correct behaviour — those sections are now Sarah's responsibility.

5. Recommended post-transfer steps for Sarah
   a) Set a personal payment method before the 30-day Pro trial ends
   b) Review the API integrations under Settings → Integrations
   c) Update the billing contact email to her preferred address
   d) Rotate any workspace API keys for security (fresh start is best practice)
   e) Enable workspace-wide 2FA enforcement under Settings → Security

Post-transfer 24-hour checklist:
   □ Sarah logs in and confirms full Owner access
   □ James requests (or Sarah grants) Admin role
   □ Billing email updated
   □ Integrations tested end-to-end
   □ Old API keys reviewed and rotated if needed
   □ Team notified of new primary contact for billing queries`],

    // ── 11 ── customer ───────────────────────────────────────────────────────
    [410, 'customer', `This is incredibly helpful — thank you for the checklist!

Sarah has just logged in and confirms she can see the full Owner dashboard.
She immediately asked me to check a few things with you on her behalf.

First, regarding API keys:
We have three workspace API keys that power integrations with our internal tools:
  - Key 1: "ops-crm-integration" — connects our CRM to ticket creation
  - Key 2: "reporting-dashboard" — pulls ticket stats into our BI tool
  - Key 3: "slack-notifications" — posts ticket updates to our Slack channels

Sarah wants to know:
1. Are these keys still valid after the ownership transfer, or were they invalidated?
2. If they're still valid, is it safe to keep using them, or should we rotate for security?
3. If we rotate them, will the integrations break immediately, or is there a grace period?
4. Can you see when each key was last used from the admin panel?
5. Is there a recommended rotation schedule for API keys in general?

Also, I tried accessing the integrations page just now (out of habit) and I got a permission error,
which I understand is expected since I'm now a Member.
But it made me realise that Sarah might not have been walked through the integrations page before.
Could you provide a brief overview of where she can find and manage these keys?
I want to make sure she's comfortable managing them going forward.`],

    // ── 12 ── agent ──────────────────────────────────────────────────────────
    [440, 'agent', `Great to hear Sarah is settled in as Owner. Let me address the API key questions:

1. Are existing keys still valid?
   Yes — all three workspace API keys remain fully valid after the ownership transfer.
   Key ownership is tied to the workspace, not to the individual who created them.
   The transfer of the Owner role does not touch API keys in any way.
   Your integrations are currently running without disruption.

2. Should you rotate for security?
   It is best practice to rotate keys whenever there is a significant change in access control
   (which this qualifies as). We recommend rotating all three when convenient.
   The main risk of not rotating: James's knowledge of the old key values creates
   a theoretical access vector if his credentials were ever compromised in the future.
   For a team your size, a rotation is worth the 20 minutes it takes.

3. Grace period when rotating?
   No automatic grace period — when you revoke a key, it is immediately invalid.
   Best approach:
     a) Generate the new key in Settings → API → Keys
     b) Update the key value in your integration's configuration
     c) Test the integration
     d) Only then revoke the old key
   Do one integration at a time so you can quickly isolate any issues.

4. Last-used timestamps
   Yes — Sarah can see last-used timestamps for each key under:
   Settings → API → Keys
   Each key shows: created date, created by, and last used date/time.

5. Recommended rotation schedule
   Our recommendation for a team your size: every 90 days, or immediately after:
   - An ownership transfer (like now)
   - A team member departure
   - Any suspected unauthorized access

Where Sarah can manage keys:
Settings (top navigation) → API → Keys — she will see all three keys listed there
with full management options: create, copy, rename, revoke.`],

    // ── 13 ── customer ───────────────────────────────────────────────────────
    [510, 'customer', `Sarah has found the API keys page and is reviewing all three.

She followed your advice and started the rotation process one key at a time.
After rotating the first key ("ops-crm-integration") and updating it in our CRM system,
she noticed that the CRM integration stopped posting new tickets.

She updated the key in the CRM configuration and tested it, but tickets are not appearing.
No error message — the CRM just silently does nothing when a new support request comes in.

We checked the following:
1. The new key value was copied correctly (double-checked character by character)
2. The CRM config was saved and the service was restarted
3. The old key was NOT revoked yet — we followed your advice on sequence
4. The CRM test button says "Connection successful" but no tickets arrive

This is urgent because new customer support requests from our CRM are being missed.
Could you help us diagnose what's going wrong?

Some additional context that might help:
- Our CRM posts to: POST /api/webhooks/email
- The integration has been running without issues for 14 months
- The last successful ticket from the CRM arrived 2 hours ago (before the key rotation test)
- The only change we made was updating the key value in the CRM config

Is there a way to check incoming webhook requests from your end to see if they're arriving?
Are there webhook delivery logs we can inspect?
What would cause "Connection successful" but no data to flow through?`],

    // ── 14 ── agent ──────────────────────────────────────────────────────────
    [545, 'agent', `I can help diagnose this — and the good news is the issue is almost certainly not
related to the API key rotation itself. Let me explain.

Our webhook endpoint (POST /api/webhooks/email) does not use API key authentication.
It accepts a normalised inbound email payload directly.
The "Connection successful" test from your CRM likely does a simple connectivity check,
not a full end-to-end payload delivery — which is why it passes even when no tickets arrive.

The most common cause of this symptom after a configuration change is a payload mismatch.
When you updated the key in your CRM, it's possible the CRM also reset or changed
the payload format it sends to our webhook endpoint.

Here is what to check on the CRM side:

Step 1 — Verify the payload format
Our webhook expects this exact shape:
  {
    "from": "Customer Name <customer@email.com>",
    "to": ["support@yourworkspace.com"],
    "subject": "Support request subject",
    "text": "Plain text body of the email",
    "html": "<p>Optional HTML body</p>",
    "messageId": "<unique-message-id@yourdomain>",
    "inReplyTo": "<optional-parent-message-id>"
  }

Step 2 — Check the "to" field specifically
The "to" field must be an array, not a string.
A very common CRM misconfiguration sends "to" as a plain string after re-saving config.

Step 3 — Check messageId
If your CRM is sending a duplicate messageId from a previous test, our system
will silently reject it (we deduplicate on messageId to prevent ticket spam).
Try triggering a completely fresh test request from your CRM.

Step 4 — Webhook logs
I can check our inbound webhook log for your workspace.
Could you tell me the exact time of your test request and the email address used?
I'll look up whether the payload arrived on our end and what validation result it got.`],

    // ── 15 ── customer ───────────────────────────────────────────────────────
    [605, 'customer', `That's a really useful explanation — I didn't realise the webhook didn't use API key auth.
The key rotation was a red herring then.

We followed your Step 2 and found the issue immediately.
Our CRM was indeed sending the "to" field as a plain string, not an array.
It seems the CRM configuration form has a "to address" field that previously built
an array automatically, but after we re-saved the config it defaulted to a plain string.

We fixed the "to" field to be an array: ["support@ops.ng"]
Restarted the CRM connector service, triggered a test request — and a ticket appeared!

So the CRM integration is now working again. Crisis averted.

To recap what happened:
1. API key rotation itself had no effect on the webhook
2. Re-saving the CRM config changed the "to" field format (string instead of array)
3. Our webhook silently rejected the malformed payload
4. Fixing the "to" format resolved it immediately

A few thoughts and questions now that we're back on track:

1. Should we document this somewhere so future team members know about the array requirement?
2. Is there documentation on the expected webhook payload format we can share internally?
3. Going back to key rotation — should we still rotate the remaining two keys?
4. For the "reporting-dashboard" key, the BI tool pulls data via GET requests — is rotation
   for read-only keys as important as for write-access keys?
5. Are there any webhook monitoring or alerting features so we'd catch silent failures earlier?

Thank you again — your Step 1/Step 2 breakdown was exactly what we needed.`],

    // ── 16 ── agent ──────────────────────────────────────────────────────────
    [640, 'agent', `Excellent troubleshooting, team — you resolved that quickly and correctly.

To your follow-up questions:

1. Documenting the array requirement
   Absolutely — this is a great candidate for your internal runbook.
   Key line to document: "The 'to' field in the webhook payload must always be an array,
   even when targeting a single email address. Re-saving CRM config may reset this to a string."

2. Webhook payload documentation
   Yes, our full inbound email webhook schema is documented at:
   Help Centre → Developer Docs → Webhooks → Inbound Email Payload
   You can share that URL with your team and link it from your internal runbook.
   The schema matches exactly what I described in my previous message.

3. Should you still rotate the remaining two keys?
   Yes — we started the rotation for security reasons unrelated to the webhook issue.
   Complete the rotation for "reporting-dashboard" and "slack-notifications"
   using the same careful sequence: create new → update integration → test → revoke old.

4. Read-only key rotation priority
   Read-only keys are lower risk than write-access keys, but still worth rotating.
   Reasons: a compromised read-only key exposes ticket data and customer information,
   which is a GDPR and compliance concern for your ops team.
   We'd recommend rotating all keys on the same schedule for simplicity.

5. Webhook monitoring and alerting
   Yes — under Settings → Webhooks → Delivery Log, Sarah can see:
   - Every inbound webhook attempt (timestamp, source IP, payload size)
   - Validation result (accepted / rejected with reason code)
   - Response status codes
   You can also set up a Slack alert for webhook validation failures
   under Settings → Notifications → Webhook Alerts.
   I'd recommend setting that up now — it would have caught today's issue in seconds.`],

    // ── 17 ── customer ───────────────────────────────────────────────────────
    [720, 'customer', `Sarah has set up the webhook failure alert in Slack — really useful feature, thank you!

The remaining two key rotations went smoothly:
- "reporting-dashboard" key: rotated without any issues. BI tool is pulling data normally.
- "slack-notifications" key: rotated, tested, and confirmed working.

All three integrations are now running on fresh keys and everything looks healthy.

Now we have a question about audit logs.
Our company has a compliance requirement (ISO 27001) that requires us to retain
access logs for a minimum of 12 months. We need to verify that your platform meets this.

Specifically, we need to know:
1. Does your platform maintain an audit log of all admin and ownership-related actions?
2. How long is audit log data retained?
3. What types of events are captured? (e.g. logins, permission changes, data exports, etc.)
4. Can we export the audit log as CSV or JSON for our compliance records?
5. Is the audit log tamper-proof or digitally signed?
6. Can we set up automated scheduled exports (e.g. monthly) to an S3 bucket or email?
7. Is the audit log available on the Pro plan, or do we need to be on Enterprise?

Our compliance officer will likely want to review this documentation.
Is there a formal data processing agreement (DPA) or compliance documentation
we could share with her alongside the audit log export?
This is fairly urgent from a compliance perspective.`],

    // ── 18 ── agent ──────────────────────────────────────────────────────────
    [755, 'agent', `Happy to give you the full picture on audit logs and compliance.

1. Audit log availability
   Yes — we maintain a comprehensive audit log of all privileged actions.
   Today's ownership transfer is already recorded in your workspace audit log
   with a full before/after state snapshot.

2. Retention period
   Audit logs are retained for 24 months on Pro and above.
   This exceeds your ISO 27001 requirement of 12 months.
   Logs older than 24 months are archived (available on request) and not auto-deleted.

3. Events captured
   The audit log covers all of the following event categories:
   - Authentication: logins, logouts, failed login attempts, 2FA events, password resets
   - Access control: role changes, ownership transfers, invitation sent/accepted/revoked
   - Billing: plan changes, payment method updates, invoice generation
   - API: key creation, revocation, usage anomalies
   - Data: ticket exports, CSV downloads, GDPR data requests
   - Integrations: webhook configuration changes, connection/disconnection events
   - Security: 2FA enable/disable, IP allowlist changes, session termination

4. Export formats
   You can export the audit log in both CSV and JSON formats.
   Go to: Settings → Security → Audit Log → Export
   You can filter by date range, event type, and user before exporting.

5. Tamper-proof / signed
   Our audit log entries are append-only and cannot be modified or deleted by workspace owners.
   Each entry includes a SHA-256 hash of the previous entry (chain integrity).
   We can provide a signed log attestation document on request for compliance submissions.

6. Automated scheduled exports
   Automated exports to S3 are available on the Enterprise plan only.
   On Pro, you can set a monthly reminder and export manually, or use our API.

7. Plan requirements
   Audit log viewing and manual export: available on Pro.
   Automated scheduled exports and SIEM integration: Enterprise only.

DPA documentation:
   Yes — our DPA is available at: Settings → Legal → Data Processing Agreement
   You can download a signed copy directly. We are GDPR compliant and ISO 27001 certified.`],

    // ── 19 ── customer ───────────────────────────────────────────────────────
    [835, 'customer', `This is exactly what our compliance officer needed to hear — thank you!

Sarah downloaded the DPA and sent it to her. She was particularly happy to know
that the audit log retention exceeds 12 months and that it's append-only with chain integrity.
She asked me to say: "That's better than most enterprise vendors we've evaluated."

Sarah exported the audit log for the past 90 days as CSV and found the ownership transfer
event recorded at the exact timestamp. She's satisfied with the detail level.

Now a more practical question from our day-to-day operations:

Our billing emails are still going to my address (james.o@ops.ng).
I've received two emails since the transfer:
  - A "Your Pro Trial is Active" email (sent to me, not Sarah)
  - An "Invoice Generated" email for a past billing cycle (also sent to me)

Sarah should be receiving these, not me.
I don't want to accidentally miss a billing alert on her behalf and cause a lapse.

Could you help us update the billing email address?
Specifically:
1. Where does Sarah change the billing notification email?
2. Is the billing email tied to the Owner's login email, or is it a separate setting?
3. Can we have billing emails sent to both of us during a transition period?
4. When will the change take effect — immediately or from the next billing cycle?
5. Will Sarah receive a confirmation email when the billing address is changed?

Also, regarding the Pro trial:
The "Your Pro Trial is Active" email mentioned the trial ends in 30 days.
What happens if Sarah hasn't added a payment method before the trial ends?
Will there be advance warning emails before it expires?`],

    // ── 20 ── agent ──────────────────────────────────────────────────────────
    [865, 'agent', `Glad the compliance officer is satisfied — that means a lot to hear.

On the billing email questions:

1. Where to change the billing notification email
   Settings → Billing → Billing Contact → Edit
   Sarah will see a "Billing email" field that is currently still populated with your address.
   She can update it there to sarah.odu@ops.ng (or any email she prefers).

2. Tied to login email or separate setting?
   It's a separate setting. The billing notification email does not have to match
   the Owner's login email. This is intentional — many teams route billing to a shared
   finance inbox (e.g. billing@ops.ng) rather than a personal address.

3. CC multiple addresses during transition
   Yes — you can add a comma-separated list of up to 3 email addresses in the billing contact field.
   So if you want both james.o@ops.ng and sarah.odu@ops.ng to receive billing emails during
   the transition period, Sarah can enter both. Remove yours once she's comfortable.

4. When does the change take effect?
   Immediately upon saving. The next billing email will go to the new address.
   Historical emails already sent to your inbox are not recalled.

5. Confirmation email
   Yes — both the old and new billing email addresses receive a confirmation notification
   when the billing contact is changed. This is a security measure to prevent silent redirects.

Regarding the Pro trial:
   - Sarah will receive a reminder email at 14 days remaining, 7 days remaining, and 3 days remaining.
   - If no payment method is added by the trial end date, the workspace will revert to the Free plan.
   - No data is deleted — the workspace and all tickets are fully preserved.
   - Sarah can upgrade again at any time to restore Pro features.

I'd recommend Sarah add her payment method sooner rather than later so it's not forgotten.
She can do this at: Settings → Billing → Payment Method → Add Card.`],

    // ── 21 ── customer ───────────────────────────────────────────────────────
    [950, 'customer', `Sarah updated the billing contact to include both of our emails for now.
She also added her payment method, so the trial-to-paid transition is sorted.
Thank you for the heads-up about the advance warning emails.

The workspace is running smoothly and the handover is going really well.
We have one more topic to cover: custom domain email notifications.

Currently, all outbound notifications from the platform come from:
  notifications@mail.larrydevlabs.com

We would like them to come from our own domain instead:
  support@ops.ng

Our customers occasionally ask why they're receiving emails from an external domain,
and it's causing some confusion and occasional spam folder placement.

Questions about custom domain setup:
1. Is custom domain email supported on the Pro plan?
2. What DNS records do we need to add? (SPF, DKIM, DMARC?)
3. Who needs to make the DNS changes — us or our IT team?
4. Will there be any interruption to outbound email while we're transitioning?
5. How long does domain verification typically take?
6. Once set up, will the "From" name also change to our brand name?
7. Can we use a subdomain like mail.ops.ng if we don't want to use the root domain?

Our IT team lead will handle the DNS changes.
Is there documentation we can give them so they can set it up without needing
to contact support for each individual step?`],

    // ── 22 ── agent ──────────────────────────────────────────────────────────
    [985, 'agent', `Custom domain email is a popular feature — here is everything you need.

1. Plan availability
   Custom domain email sending is available on the Pro plan. You're good to proceed.

2. Required DNS records
   You will need to add the following records for support@ops.ng:

   SPF record (TXT on ops.ng):
     v=spf1 include:mail.larrydevlabs.com ~all
     (Add this to your existing SPF record if you have one — don't create a second TXT record)

   DKIM record (CNAME on ops.ng):
     Name:  lldkimsig1._domainkey.ops.ng
     Value: lldkimsig1._domainkey.larrydevlabs.com
     (We use CNAME delegation so your DKIM keys rotate automatically on our end)

   DMARC record (TXT on _dmarc.ops.ng) — recommended but not required:
     v=DMARC1; p=none; rua=mailto:dmarc-reports@ops.ng

3. Who makes the DNS changes?
   Your IT team makes all DNS changes on your side — we cannot access your DNS.
   Once they've added the records, you verify the domain inside the platform.

4. Interruption during transition?
   No interruption. You add the DNS records, verify the domain, then activate.
   Until you click Activate, all emails continue to send from our default domain.
   The cutover happens atomically at activation — no mixed-state period.

5. Verification timeline
   DNS propagation typically takes 15 minutes to 2 hours for new records.
   Worst case (TTL-dependent) is 24 hours. After propagation, verification is instant.

6. "From" name customisation
   Yes — under Settings → Notifications → Sender Name, Sarah can set any display name.
   Example: "Ops Support Team <support@ops.ng>"

7. Subdomain support
   Yes — mail.ops.ng or any subdomain works perfectly and is often preferred.
   It keeps your root domain SPF clean and isolates email reputation.

Full documentation for your IT team:
Settings → Custom Domain → Setup Guide → "Download Setup Instructions (PDF)"
It includes all DNS records pre-filled with your workspace values.`],

    // ── 23 ── customer ───────────────────────────────────────────────────────
    [1065, 'customer', `Our IT lead Tunde has the setup guide and has added all three DNS records.
He used the subdomain mail.ops.ng as you suggested.

The records he added were:
  - SPF on mail.ops.ng: v=spf1 include:mail.larrydevlabs.com ~all
  - DKIM CNAME: lldkimsig1._domainkey.mail.ops.ng pointing to lldkimsig1._domainkey.larrydevlabs.com
  - DMARC on _dmarc.mail.ops.ng: v=DMARC1; p=none; rua=mailto:dmarc-reports@ops.ng

He added them about an hour ago. We've been trying to verify the domain in the platform
under Settings → Notifications → Custom Domain, but the verification check keeps failing.

The error message says:
  "SPF verification failed: No valid SPF record found for mail.ops.ng"

Tunde used an online SPF checker (mxtoolbox.com) and it shows the SPF record correctly.
So it's visible publicly, but your platform isn't accepting it.

Could there be a cache issue on your verification service?
Or is there something wrong with how the record is formatted?

Tunde double-checked and the record is:
  Type: TXT
  Host: mail.ops.ng (or @ depending on how the DNS panel displays it)
  Value: v=spf1 include:mail.larrydevlabs.com ~all

One concern: our DNS provider (Cloudflare) uses "Proxied" status for some records.
Tunde thinks the TXT record is set to "DNS Only" (grey cloud) but isn't 100% sure.
Could the Cloudflare proxy status affect SPF verification?`],

    // ── 24 ── agent ──────────────────────────────────────────────────────────
    [1100, 'agent', `Good troubleshooting instinct from Tunde. The Cloudflare proxy question is the right track.

The short answer: TXT records (including SPF) must NEVER be set to "Proxied" in Cloudflare.
TXT records don't support HTTP proxying — Cloudflare would have automatically set them
to "DNS Only" (grey cloud), so that is almost certainly not the issue here.

The actual problem is most likely a cache on our verification service.
Here is what I found when I manually checked your DNS:

Your SPF record for mail.ops.ng is visible in global DNS resolvers correctly.
However, our verification cache has a 2-hour TTL and you added the record just 60 minutes ago.

Please try re-running the domain verification in 60–90 minutes.
If it fails again after 2 hours, check the following:

Possible issue 1 — Record on wrong host:
   Some DNS panels interpret "mail.ops.ng" differently.
   If Tunde entered "mail" as the host (without .ops.ng), that is correct for Cloudflare.
   If he entered "mail.ops.ng" as the full hostname including the domain, it may have created:
   mail.ops.ng.ops.ng — which would be wrong.
   Ask Tunde to check the full resolved hostname in the Cloudflare DNS dashboard.

Possible issue 2 — Missing include for ops.ng root:
   If ops.ng already has an SPF record (for your main email), it should include mail.ops.ng.
   Otherwise the two SPF records are isolated and our checker may be looking at the wrong one.

Possible issue 3 — Whitespace in the record value:
   Occasionally copy-paste from a PDF introduces non-breaking spaces.
   Ask Tunde to retype the value manually rather than pasting.

I've flagged your domain (mail.ops.ng) to our infrastructure team to bypass the cache.
Please retry the verification in the next 15 minutes and let me know the result.`],

    // ── 25 ── customer ───────────────────────────────────────────────────────
    [1195, 'customer', `Tunde retried the verification after your team bypassed the cache — and it worked!

The platform now shows:
  ✓ SPF verified
  ✓ DKIM verified
  ✓ Domain verified

Sarah clicked Activate and the custom domain is now live.
She sent a test notification email and it arrived with the sender showing:
  "Ops Support Team <support@mail.ops.ng>"

The email landed in the inbox (not spam) and the DKIM signature is valid.
Our customers will be much less confused going forward.

We checked historical email — all past notification emails from before activation
still show the old sender (notifications@mail.larrydevlabs.com), which is expected.

Just a couple of small remaining questions:

1. Are DMARC reports being sent to dmarc-reports@ops.ng?
   Tunde set up the mailbox and wants to know how frequently reports arrive.

2. Now that the custom domain is active, if we ever change our domain name in future,
   what would the migration process look like?

3. We want to promote James from Member to Admin.
   Sarah would like to do this now — can you confirm the exact steps again?
   (She's on the Settings → Team page but wants to double-check before clicking)

4. Is there a way to bulk-export all ticket data (not just audit logs) as a backup?
   Our IT policy requires monthly backups of all operational data.

Thank you — we're getting very close to a complete handover now.`],

    // ── 26 ── agent ──────────────────────────────────────────────────────────
    [1230, 'agent', `Excellent — custom domain fully live and DKIM-verified. Well done to Tunde!

Answering your final batch of questions:

1. DMARC report frequency
   DMARC aggregate reports (rua) are generated by receiving mail servers and sent daily.
   You should start receiving reports to dmarc-reports@ops.ng within 24 hours of activation.
   Each report covers the previous calendar day's email sending activity.
   Reports are in XML format. Tools like dmarcanalyzer.com or postmaster tools can parse them.
   Forensic reports (ruf) are per-email and only sent when the policy is p=reject or p=quarantine.
   Since your policy is p=none, you'll only receive aggregate daily reports.

2. Migrating to a new domain in future
   The process is:
     a) Add DNS records for the new domain (same SPF/DKIM steps as today)
     b) Verify the new domain in Settings → Notifications → Custom Domain
     c) Activate the new domain — it replaces the current one immediately
     d) Remove old DNS records at your convenience (no urgency)
   No historical emails are affected. There is no downtime during domain migration.

3. Promoting James to Admin (step-by-step for Sarah)
   From Settings → Team → Members:
     a) Find James Ogunleye in the list
     b) Click the three-dot (⋮) menu next to his name
     c) Select "Change role"
     d) Choose "Admin" from the dropdown
     e) Click Confirm
   James will receive an email notification that his role has been updated.
   His access to Settings, Integrations, and Team Management will restore immediately.
   He will NOT have Billing or Ownership access — those remain exclusively with Sarah.

4. Full ticket data export
   Settings → Data → Export Workspace Data
   Options available:
     - All tickets (with messages) — JSON or CSV
     - Date range filter
     - Status filter (open / resolved / closed / all)
   For your monthly backup policy, you can schedule a monthly reminder and export manually,
   or use our REST API endpoint GET /api/export/tickets for automated exports.`],

    // ── 27 ── customer ───────────────────────────────────────────────────────
    [1320, 'customer', `Sarah has promoted James to Admin — he received the email notification immediately
and can now see the Settings and Integrations menus again.

James tested his access and confirms:
  ✓ Team management — accessible
  ✓ Settings — accessible
  ✓ Integrations — accessible
  ✓ Billing — NOT accessible (correct — this is Sarah's responsibility now)
  ✓ Ownership actions — NOT accessible (correct)

Everything is exactly as expected.

We also set up a monthly calendar reminder to export the full workspace data backup.
And Tunde confirmed the first DMARC report arrived this morning — the XML looks healthy.

At this point, I think the handover is complete from a technical perspective.
Let me summarise what we've accomplished with your help over this conversation:

1. Identified and resolved all blockers for ownership transfer (paid plan, 2FA, pending invites)
2. Successfully transferred workspace ownership from James to Sarah
3. Rotated all three workspace API keys without service interruption
4. Diagnosed and fixed the CRM webhook payload issue (unrelated to key rotation)
5. Set up Slack alerts for webhook failures
6. Exported and reviewed audit logs for compliance (ISO 27001 requirement satisfied)
7. Updated billing contact to Sarah's email
8. Sarah added her payment method for post-trial billing
9. Set up custom domain email (mail.ops.ng) with SPF, DKIM, DMARC
10. Promoted James from Member back to Admin role
11. Set up monthly data export reminder

This was a much longer process than I expected, but your support was exceptional.
I genuinely appreciate how thorough and patient you've been with each issue.

Is there anything else you'd recommend we do to close out the handover cleanly?
And could you mark this ticket as Resolved once you've reviewed the summary?`],

    // ── 28 ── agent ──────────────────────────────────────────────────────────
    [1355, 'agent', `James, thank you for such a thorough summary — and congratulations to you and Sarah
on completing what turned out to be a comprehensive platform handover.

Your summary is accurate and complete. Here are a few final recommendations
to truly button everything up:

Final checklist items (optional but recommended):

1. Session security
   Now that the ownership has changed, ask Sarah to review:
   Settings → Security → Active Sessions
   She should revoke any sessions she doesn't recognise from before her ownership.
   James, you can do the same for your account from Account → Security.

2. Notification preferences
   Sarah should review Settings → Notifications to configure which alerts she wants
   as Owner (billing alerts, security events, weekly digest, etc.).
   These may have been configured to your preferences, James — they don't auto-migrate.

3. Recovery codes for 2FA
   Ensure Sarah has her 2FA backup codes stored in a team password manager
   (e.g. 1Password, Bitwarden). Losing 2FA access as Owner is a complex recovery.

4. Document the process internally
   Consider writing a short internal runbook documenting what you went through today —
   the specific blockers, the webhook payload format, the DNS setup, etc.
   Future team members (or a future ownership transfer) will thank you.

5. Verify agent assignments
   Quickly check that all open tickets still have their assigned agents listed correctly.
   The transfer should not have affected assignments, but a spot check is good practice.

Everything from a platform perspective looks clean and healthy:
   ✓ Ownership correctly held by sarah.odu@ops.ng
   ✓ All integrations running on rotated keys
   ✓ Custom domain active and verified
   ✓ Audit log compliant with ISO 27001 retention requirement
   ✓ Billing contact updated and payment method on file

I'll mark this ticket as Resolved now. If anything comes up during Sarah's first week as Owner,
please don't hesitate to open a new ticket and reference this one — we'll have full context.
It's been a genuine pleasure working through this with you.`],

    // ── 29 ── customer ───────────────────────────────────────────────────────
    [1430, 'customer', `Thank you so much — this has been the best support experience I've had in years.

I wanted to pass on some specific feedback about this interaction before the ticket closes:

What worked really well:
1. You anticipated blockers before I hit them (the pending invites warning was especially helpful)
2. You answered multi-part questions completely without making me ask follow-ups
3. You explained the WHY behind each requirement (e.g. why 2FA is mandatory, why paid plan needed)
4. When I hit unexpected issues (CRM webhook, SPF cache), you diagnosed quickly and accurately
5. You escalated the DNS cache bypass promptly without making me wait or jump through hoops
6. The tone was professional but genuinely friendly throughout — never felt like a form response

Areas I'd suggest improving (constructive feedback):
1. The 2FA requirement for ownership transfer isn't mentioned in your public documentation.
   Adding it to the "Transfer Ownership" help article would save future customers time.
2. The error message "Transfer blocked: pending invitations" could be more descriptive —
   it should ideally list the invites directly in the modal so the user knows what to revoke.
3. The SPF verification cache TTL of 2 hours could be communicated in the UI
   so users know to wait rather than retry immediately and get confused.

I've shared this feedback with Sarah and she agrees.
We'll also be sharing this transcript internally as an example of great vendor support.

I'd love to give your team a 5-star rating if there's a formal feedback mechanism.
Could you point me to the right place?

Once again, thank you to you and the whole support team.
You've given us a lot of confidence in the platform going forward.`],

    // ── 30 ── agent ──────────────────────────────────────────────────────────
    [1465, 'agent', `James, this is wonderful feedback — genuinely one of the most thoughtful summaries
we've received, and I'm sharing it with the team right now.

Your constructive points are excellent and I've already filed internal tickets for each:
1. "Transfer Ownership" help article — updating to include 2FA requirement (due this sprint)
2. Pending invitations error modal — engineering has accepted the enhancement request
   to list the specific invitations directly in the blocked-transfer modal
3. SPF cache TTL — we'll add a "Verification can take up to 2 hours" notice to the UI

These are exactly the kind of improvements that make the platform better for everyone.
Thank you for taking the time to write them up clearly.

For the 5-star rating:
   You can leave a review via any of these channels:
   - In-app: Account → Leave Feedback (appears after a ticket is marked Resolved)
   - G2: g2.com — search "LarryDevLabs" and click "Write a Review"
   - Capterra: capterra.com/p/larrydevlabs — we read every review personally

Your feedback specifically will be shared with our product team in tomorrow's standup.
It directly influences our roadmap — the pending invitations UX improvement is
already scheduled because of what you described today.

Summary of everything accomplished in this ticket:
   ✓ Workspace ownership transferred: James → Sarah
   ✓ All integrations verified post-transfer
   ✓ Custom domain email configured and live
   ✓ ISO 27001 audit log compliance confirmed
   ✓ Team roles updated, billing sorted, backups scheduled

I'm marking this ticket as Resolved.
Sarah, James — wishing your team continued success.
It has truly been a pleasure. Take care!`],
  ]

  console.log(`Inserting ${messages.length} messages into ticket #${ticket.id}...`)

  for (const [minutesAfter, senderType, body] of messages) {
    const isAgent = senderType === 'agent'
    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        messageId: `convo-${ticket.id}-${minutesAfter}-${senderType}`,
        direction: isAgent ? 'outbound' : 'inbound',
        senderType,
        fromEmail: isAgent ? agent.email : customer.email,
        fromName: isAgent ? agent.name : customer.name,
        body: body.trim(),
        createdAt: new Date(base + minutesAfter * 60_000),
      },
    })
  }

  // Update the ticket's updatedAt to reflect the latest message
  const lastMinutes = messages[messages.length - 1][0]
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { updatedAt: new Date(base + lastMinutes * 60_000) },
  })

  console.log(`Done — ${messages.length} messages created.`)
  console.log(`First message: customer at +0 min`)
  console.log(`Last message:  agent at +${lastMinutes} min (~${Math.round(lastMinutes / 60)} hours after ticket open)`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => { prisma.$disconnect(); process.exit(0) })
