import 'dotenv/config'
import { prisma } from '../src/lib/db.js'

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

const tickets = [
  // ── TECHNICAL ───────────────────────────────────────────────────────────────
  { subject: 'Login page returns 500 error after password reset', status: 'open',     category: 'technical', fromName: 'Amara Osei',        fromEmail: 'amara.osei@techcorp.io',      createdAt: daysAgo(1) },
  { subject: 'Two-factor authentication code not arriving via SMS', status: 'open',   category: 'technical', fromName: 'Jonas Weber',        fromEmail: 'jonas.weber@netmail.de',      createdAt: daysAgo(2) },
  { subject: 'API rate limit hit — getting 429 on every request', status: 'open',     category: 'technical', fromName: 'Priya Shankar',      fromEmail: 'priya.shankar@devhub.io',     createdAt: daysAgo(2) },
  { subject: 'Dashboard charts not loading in Safari 17', status: 'open',             category: 'technical', fromName: 'Chloe Nguyen',       fromEmail: 'chloe.n@designstudio.co',     createdAt: daysAgo(3) },
  { subject: 'Webhook events stop firing after 24 hours', status: 'open',             category: 'technical', fromName: 'Tariq Al-Rashid',    fromEmail: 'tariq@buildit.ae',            createdAt: daysAgo(3) },
  { subject: 'CSV export downloads empty file', status: 'open',                       category: 'technical', fromName: 'Sofia Reyes',        fromEmail: 'sofia.reyes@analytix.mx',    createdAt: daysAgo(4) },
  { subject: 'OAuth redirect URI mismatch on production', status: 'open',             category: 'technical', fromName: 'Liam Fitzgerald',    fromEmail: 'liam.fitz@cloudops.ie',       createdAt: daysAgo(4) },
  { subject: 'Notification emails going to spam folder', status: 'open',              category: 'technical', fromName: 'Yuki Tanaka',        fromEmail: 'yuki.tanaka@medialab.jp',     createdAt: daysAgo(5) },
  { subject: 'Search returning no results for exact keyword matches', status: 'open', category: 'technical', fromName: 'Mia Kowalski',       fromEmail: 'mia.kowalski@datavault.pl',   createdAt: daysAgo(5) },
  { subject: 'File upload silently fails above 10 MB', status: 'open',                category: 'technical', fromName: 'Kwame Asante',       fromEmail: 'kwame.a@infrastack.gh',       createdAt: daysAgo(6) },
  { subject: 'Markdown editor loses formatting on save', status: 'open',              category: 'technical', fromName: 'Elena Vasquez',      fromEmail: 'elena.v@contentops.es',       createdAt: daysAgo(7) },
  { subject: 'Mobile app crashes when opening large attachments', status: 'open',     category: 'technical', fromName: 'Hassan Diallo',      fromEmail: 'hassan.d@mobileworks.sn',     createdAt: daysAgo(8) },
  { subject: 'GraphQL subscription disconnects every 30 seconds', status: 'open',    category: 'technical', fromName: 'Ingrid Holm',        fromEmail: 'ingrid.holm@nordicapi.no',    createdAt: daysAgo(9) },
  { subject: 'Date picker shows wrong month on initial render', status: 'resolved',   category: 'technical', fromName: 'Raj Patel',          fromEmail: 'raj.patel@uicraft.in',        createdAt: daysAgo(10) },
  { subject: 'Password complexity rules not enforced at sign-up', status: 'resolved', category: 'technical', fromName: 'Fatima Al-Zahra',    fromEmail: 'fatima.z@secureops.ma',       createdAt: daysAgo(11) },
  { subject: 'Bulk delete removes wrong records', status: 'resolved',                 category: 'technical', fromName: 'Marco Pellegrini',   fromEmail: 'marco.p@dataclean.it',        createdAt: daysAgo(12) },
  { subject: 'Session expires immediately after login on Firefox', status: 'resolved',category: 'technical', fromName: 'Anika Johansson',    fromEmail: 'anika.j@weblab.se',           createdAt: daysAgo(14) },
  { subject: 'Sort order resets to default after page refresh', status: 'resolved',   category: 'technical', fromName: 'Carlos Mendoza',     fromEmail: 'carlos.m@apptribe.cl',        createdAt: daysAgo(15) },
  { subject: 'API key rotation breaks existing integrations', status: 'resolved',     category: 'technical', fromName: 'Nadia Rousseau',     fromEmail: 'nadia.r@integratech.fr',      createdAt: daysAgo(17) },
  { subject: 'Real-time collaboration cursor out of sync', status: 'resolved',        category: 'technical', fromName: 'Tobias Brandt',      fromEmail: 'tobias.b@collabtools.de',     createdAt: daysAgo(18) },
  { subject: 'Image thumbnails not regenerating after crop', status: 'resolved',      category: 'technical', fromName: 'Xiomara Cruz',       fromEmail: 'xiomara.c@pixelworks.co',     createdAt: daysAgo(20) },
  { subject: 'Timezone offset wrong for UTC−3 users', status: 'resolved',             category: 'technical', fromName: 'Felipe Carvalho',    fromEmail: 'felipe.c@devhouse.br',        createdAt: daysAgo(22) },
  { subject: 'SAML SSO logout does not invalidate session', status: 'closed',         category: 'technical', fromName: 'Olusegun Bello',     fromEmail: 'olusegun.b@enterplex.ng',     createdAt: daysAgo(30) },
  { subject: 'Table pagination jumps to page 1 on any filter change', status: 'closed', category: 'technical', fromName: 'Hana Novakova',   fromEmail: 'hana.n@appworks.cz',          createdAt: daysAgo(35) },
  { subject: 'Dark mode toggle resets on hard refresh', status: 'closed',             category: 'technical', fromName: 'Samuel Okafor',      fromEmail: 'samuel.o@uxlabs.ng',          createdAt: daysAgo(40) },
  { subject: 'Import from Zapier fails with schema mismatch error', status: 'closed', category: 'technical', fromName: 'Beatriz Lima',       fromEmail: 'beatriz.l@automate.pt',       createdAt: daysAgo(45) },
  { subject: 'PDF report font rendering broken on Windows', status: 'closed',         category: 'technical', fromName: 'Igor Sorokin',       fromEmail: 'igor.s@reportgen.ru',         createdAt: daysAgo(50) },
  { subject: 'Scroll position lost when navigating back', status: 'closed',           category: 'technical', fromName: 'Leila Ahmadi',       fromEmail: 'leila.a@frontdev.ir',         createdAt: daysAgo(55) },

  // ── REFUND ──────────────────────────────────────────────────────────────────
  { subject: 'Charged twice for the same invoice in March', status: 'open',           category: 'refund',    fromName: 'David Kim',          fromEmail: 'david.kim@startup.kr',        createdAt: daysAgo(1) },
  { subject: 'Cancel subscription and refund remaining days', status: 'open',         category: 'refund',    fromName: 'Olivia Hartmann',    fromEmail: 'olivia.h@freelance.at',       createdAt: daysAgo(2) },
  { subject: 'Downgrade processed but still billed at Pro rate', status: 'open',      category: 'refund',    fromName: 'Emeka Nwosu',        fromEmail: 'emeka.n@biztools.ng',         createdAt: daysAgo(3) },
  { subject: 'Annual plan purchased by mistake — need monthly', status: 'open',       category: 'refund',    fromName: 'Zoe Papadopoulos',   fromEmail: 'zoe.p@agency.gr',             createdAt: daysAgo(4) },
  { subject: 'Trial extended but credit card was still charged', status: 'open',      category: 'refund',    fromName: 'Antoine Martin',     fromEmail: 'antoine.m@studio.fr',         createdAt: daysAgo(5) },
  { subject: 'Duplicate seat added during checkout — remove one', status: 'open',     category: 'refund',    fromName: 'Yemi Adeyemi',       fromEmail: 'yemi.a@growthco.ng',          createdAt: daysAgo(6) },
  { subject: 'Refund for unused add-on cancelled within 48 hours', status: 'open',    category: 'refund',    fromName: 'Nour Khalil',        fromEmail: 'nour.k@techops.lb',           createdAt: daysAgo(7) },
  { subject: 'Wrong plan tier applied after team upgrade', status: 'open',            category: 'refund',    fromName: 'Sara Lindqvist',     fromEmail: 'sara.l@cloudteam.se',         createdAt: daysAgo(8) },
  { subject: 'Account hacked — unauthorised charges on card', status: 'open',         category: 'refund',    fromName: 'Arjun Mehta',        fromEmail: 'arjun.m@secops.in',           createdAt: daysAgo(9) },
  { subject: 'VAT applied incorrectly to EU business account', status: 'open',        category: 'refund',    fromName: 'Katarzyna Nowak',    fromEmail: 'katarzyna.n@bizeu.pl',        createdAt: daysAgo(10) },
  { subject: 'Charged after account deletion request submitted', status: 'resolved',  category: 'refund',    fromName: 'Michael Torres',     fromEmail: 'michael.t@consult.mx',        createdAt: daysAgo(12) },
  { subject: 'Black Friday promo code discount not applied', status: 'resolved',      category: 'refund',    fromName: 'Adaeze Obi',         fromEmail: 'adaeze.o@ecomstudio.ng',      createdAt: daysAgo(14) },
  { subject: 'Refund not received after 14 business days', status: 'resolved',        category: 'refund',    fromName: 'Pascal Beaumont',    fromEmail: 'pascal.b@digital.fr',         createdAt: daysAgo(16) },
  { subject: 'Seat count reduced but invoice unchanged', status: 'resolved',          category: 'refund',    fromName: 'Chioma Eze',         fromEmail: 'chioma.e@hrtools.ng',         createdAt: daysAgo(18) },
  { subject: 'Plan automatically renewed after cancellation email', status: 'resolved', category: 'refund',  fromName: 'Aleksei Petrov',     fromEmail: 'aleksei.p@saasdev.ru',        createdAt: daysAgo(21) },
  { subject: 'Charged for 12 seats but team only has 8', status: 'closed',            category: 'refund',    fromName: 'Wanjiru Kamau',      fromEmail: 'wanjiru.k@techke.co.ke',      createdAt: daysAgo(28) },
  { subject: 'Refund requested due to service downtime in February', status: 'closed',category: 'refund',    fromName: 'Pieter De Vries',    fromEmail: 'pieter.dv@cloudops.nl',       createdAt: daysAgo(33) },
  { subject: 'Currency conversion charged at wrong rate', status: 'closed',           category: 'refund',    fromName: 'Aiko Yamamoto',      fromEmail: 'aiko.y@payments.jp',          createdAt: daysAgo(38) },
  { subject: 'Legacy plan no longer available — want refund', status: 'closed',       category: 'refund',    fromName: 'Brendan Murphy',     fromEmail: 'brendan.m@devshop.ie',        createdAt: daysAgo(44) },
  { subject: 'Subscription price increased without notice — refund', status: 'closed',category: 'refund',    fromName: 'Valentina Russo',    fromEmail: 'valentina.r@media.it',        createdAt: daysAgo(52) },

  // ── GENERAL ─────────────────────────────────────────────────────────────────
  { subject: 'How do I transfer account ownership to a colleague?', status: 'open',   category: 'general',   fromName: 'James Ogunleye',     fromEmail: 'james.o@ops.ng',              createdAt: daysAgo(1) },
  { subject: 'Request to increase API rate limit for enterprise plan', status: 'open',category: 'general',   fromName: 'Lin Wei',            fromEmail: 'lin.wei@techfirm.cn',         createdAt: daysAgo(2) },
  { subject: 'How long is audit log data retained?', status: 'open',                  category: 'general',   fromName: 'Miriam Goldstein',   fromEmail: 'miriam.g@legalops.il',        createdAt: daysAgo(3) },
  { subject: 'Can we get a W-9 form for tax purposes?', status: 'open',               category: 'general',   fromName: 'Tyler Johnson',      fromEmail: 'tyler.j@finance.us',          createdAt: daysAgo(4) },
  { subject: 'Feature request: bulk tag assignment for tickets', status: 'open',      category: 'general',   fromName: 'Rania Hassan',       fromEmail: 'rania.h@support.eg',          createdAt: daysAgo(5) },
  { subject: 'Onboarding call not scheduled after sign-up', status: 'open',           category: 'general',   fromName: 'Nicholas Osei',      fromEmail: 'nicholas.o@growth.gh',        createdAt: daysAgo(6) },
  { subject: 'Requesting SOC 2 Type II compliance report', status: 'open',            category: 'general',   fromName: 'Astrid Bergmann',    fromEmail: 'astrid.b@compliance.de',      createdAt: daysAgo(7) },
  { subject: 'Where can I find my invoice history?', status: 'open',                  category: 'general',   fromName: 'Taiwo Adesanya',     fromEmail: 'taiwo.a@smetools.ng',         createdAt: daysAgo(8) },
  { subject: 'Add custom domain to branded email notifications', status: 'open',      category: 'general',   fromName: 'Emma Christensen',   fromEmail: 'emma.c@brand.dk',             createdAt: daysAgo(9) },
  { subject: 'What data is included in the GDPR export?', status: 'open',             category: 'general',   fromName: 'Frederic Dupont',    fromEmail: 'frederic.d@privacyops.fr',    createdAt: daysAgo(10) },
  { subject: 'Referral programme — when is commission paid?', status: 'resolved',     category: 'general',   fromName: 'Chinwe Obiora',      fromEmail: 'chinwe.o@partnerco.ng',       createdAt: daysAgo(13) },
  { subject: 'How to set up IP allowlisting for SSO?', status: 'resolved',            category: 'general',   fromName: 'Magnus Eriksson',    fromEmail: 'magnus.e@itsec.se',           createdAt: daysAgo(15) },
  { subject: 'Requesting a formal quote for 50-seat enterprise plan', status: 'resolved', category: 'general', fromName: 'Priscilla Owusu', fromEmail: 'priscilla.o@procurement.gh',  createdAt: daysAgo(19) },
  { subject: 'Can agents reply to tickets from their own email?', status: 'resolved', category: 'general',   fromName: 'Andrei Ionescu',     fromEmail: 'andrei.i@supportops.ro',      createdAt: daysAgo(23) },
  { subject: 'Training materials for new support team agents', status: 'resolved',    category: 'general',   fromName: 'Yetunde Adebayo',    fromEmail: 'yetunde.a@teamhq.ng',         createdAt: daysAgo(26) },
  { subject: 'How to export all contacts as CSV?', status: 'closed',                  category: 'general',   fromName: 'Clara Bonnet',       fromEmail: 'clara.b@marketer.fr',         createdAt: daysAgo(31) },
  { subject: 'Need SLA documentation for our procurement team', status: 'closed',     category: 'general',   fromName: 'Ibrahim Al-Farsi',   fromEmail: 'ibrahim.f@govtech.ae',        createdAt: daysAgo(36) },
  { subject: 'Request to whitelist our domain for inbound email', status: 'closed',   category: 'general',   fromName: 'Patricia Okoye',     fromEmail: 'patricia.o@mailops.ng',       createdAt: daysAgo(42) },
  { subject: 'Notification settings not saving for admin role', status: 'closed',     category: 'general',   fromName: 'Sven Larsson',       fromEmail: 'sven.l@saasplatform.se',      createdAt: daysAgo(47) },
  { subject: 'How do I delete my account and all associated data?', status: 'closed', category: 'general',   fromName: 'Abigail Mensah',     fromEmail: 'abigail.m@user.gh',           createdAt: daysAgo(60) },

  // ── NULL CATEGORY (uncategorised) ───────────────────────────────────────────
  { subject: 'Received a suspicious email claiming to be from your team', status: 'open',  category: null, fromName: 'Victor Nkosi',       fromEmail: 'victor.n@enduser.za',         createdAt: daysAgo(1) },
  { subject: 'App feels slow after the latest update', status: 'open',                    category: null, fromName: 'Mei Lin',            fromEmail: 'mei.lin@startup.cn',          createdAt: daysAgo(3) },
  { subject: 'Button label says "Save" but action is "Publish"', status: 'open',          category: null, fromName: 'Darius Popescu',     fromEmail: 'darius.p@uxfeedback.ro',      createdAt: daysAgo(5) },
  { subject: 'Terms of service link on sign-up page is broken', status: 'open',           category: null, fromName: 'Amira Saleh',        fromEmail: 'amira.s@legalcheck.eg',       createdAt: daysAgo(7) },
  { subject: 'Help centre article is outdated — steps no longer match UI', status: 'open',category: null, fromName: 'Pilar Garcia',       fromEmail: 'pilar.g@docwriter.es',        createdAt: daysAgo(9) },
  { subject: 'Cannot find option to change notification language', status: 'resolved',    category: null, fromName: 'Olumide Adekunle',   fromEmail: 'olumide.a@globeops.ng',       createdAt: daysAgo(20) },
  { subject: 'Status page showed no incident during yesterday\'s outage', status: 'resolved', category: null, fromName: 'Katrin Bauer',  fromEmail: 'katrin.b@monitoring.de',      createdAt: daysAgo(25) },
  { subject: 'Accessibility: screen reader skips table column headers', status: 'closed', category: null, fromName: 'Rohan Das',          fromEmail: 'rohan.d@a11y.in',             createdAt: daysAgo(32) },
  { subject: 'Wrong timezone shown in automated email footers', status: 'closed',         category: null, fromName: 'Funmilayo Bello',    fromEmail: 'funmilayo.b@emailops.ng',     createdAt: daysAgo(41) },
  { subject: 'Logo blurry on retina displays in the web app', status: 'closed',           category: null, fromName: 'Takeshi Nakamura',   fromEmail: 'takeshi.n@pixelfix.jp',       createdAt: daysAgo(58) },

  // ── EXTRA TECHNICAL (mixed ages & statuses to fill to 100) ──────────────────
  { subject: 'Integration with Slack not posting to correct channel', status: 'open',     category: 'technical', fromName: 'Bola Adegoke',      fromEmail: 'bola.a@teamflow.ng',      createdAt: daysAgo(2) },
  { subject: 'Cannot revoke access for a deactivated team member', status: 'open',        category: 'technical', fromName: 'Camille Moreau',    fromEmail: 'camille.m@hrtech.fr',     createdAt: daysAgo(4) },
  { subject: 'REST API returns 401 despite valid Bearer token', status: 'open',           category: 'technical', fromName: 'Tomasz Wójcik',     fromEmail: 'tomasz.w@devops.pl',      createdAt: daysAgo(6) },
  { subject: 'Broken layout on iPad landscape orientation', status: 'open',               category: 'technical', fromName: 'Adaora Chukwu',     fromEmail: 'adaora.c@uilabs.ng',      createdAt: daysAgo(8) },
  { subject: 'Email notifications sent in wrong language after locale change', status: 'open', category: 'technical', fromName: 'Pavel Novák', fromEmail: 'pavel.n@locale.cz',       createdAt: daysAgo(10) },
  { subject: 'Custom domain SSL certificate expired warning showing', status: 'open',     category: 'technical', fromName: 'Blessing Okafor',   fromEmail: 'blessing.o@sslops.ng',    createdAt: daysAgo(11) },
  { subject: 'Prisma migration failed on staging after deploy', status: 'resolved',       category: 'technical', fromName: 'Nikolaj Hansen',    fromEmail: 'nikolaj.h@dbops.dk',      createdAt: daysAgo(13) },
  { subject: 'Autosave overwrites manual edits during conflict', status: 'resolved',      category: 'technical', fromName: 'Adisa Coker',       fromEmail: 'adisa.c@collab.ng',       createdAt: daysAgo(16) },
  { subject: 'Search index not updated after record deletion', status: 'resolved',        category: 'technical', fromName: 'Mei-Ling Zhao',     fromEmail: 'meiling.z@searchops.cn',  createdAt: daysAgo(19) },
  { subject: 'Team invitation email lands in promotions tab', status: 'resolved',         category: 'technical', fromName: 'Obinna Okonkwo',    fromEmail: 'obinna.o@devhub.ng',      createdAt: daysAgo(22) },
  { subject: 'Zapier trigger fires duplicate events on update', status: 'resolved',       category: 'technical', fromName: 'Luisa Ferrari',     fromEmail: 'luisa.f@zapdev.it',       createdAt: daysAgo(27) },
  { subject: 'Chart tooltip shows NaN for null data points', status: 'resolved',          category: 'technical', fromName: 'Jin-Ho Park',       fromEmail: 'jinho.p@analytics.kr',    createdAt: daysAgo(29) },
  { subject: 'Rate limit counter not resetting on plan upgrade', status: 'closed',        category: 'technical', fromName: 'Olawale Oduola',    fromEmail: 'olawale.o@apigw.ng',      createdAt: daysAgo(37) },
  { subject: 'Stripe webhook signature validation failing intermittently', status: 'closed', category: 'technical', fromName: 'Anastasia Volkova', fromEmail: 'anastasia.v@payments.ru', createdAt: daysAgo(43) },
  { subject: 'Mobile push notifications not arriving on Android 14', status: 'closed',    category: 'technical', fromName: 'Chiamaka Ejike',    fromEmail: 'chiamaka.e@mobileng.ng',  createdAt: daysAgo(48) },
  { subject: 'Old password still works after successful reset', status: 'closed',         category: 'technical', fromName: 'Lars Petersen',     fromEmail: 'lars.p@seclab.dk',        createdAt: daysAgo(56) },
  { subject: 'CORS policy blocks requests from custom subdomain', status: 'closed',       category: 'technical', fromName: 'Ngozi Eze',          fromEmail: 'ngozi.e@infra.ng',        createdAt: daysAgo(62) },
  { subject: 'Background job queue stuck after Redis restart', status: 'closed',          category: 'technical', fromName: 'Hugo Leclerc',      fromEmail: 'hugo.l@queuesys.fr',      createdAt: daysAgo(70) },

  // ── EXTRA REFUND ────────────────────────────────────────────────────────────
  { subject: 'Non-profit discount not applied at checkout', status: 'open',               category: 'refund',    fromName: 'Folake Adewale',    fromEmail: 'folake.a@nonprofit.ng',   createdAt: daysAgo(3) },
  { subject: 'Partner discount removed without explanation on renewal', status: 'open',   category: 'refund',    fromName: 'Soren Madsen',      fromEmail: 'soren.m@partner.dk',      createdAt: daysAgo(6) },
  { subject: 'Requested downgrade did not take effect this billing cycle', status: 'resolved', category: 'refund', fromName: 'Chukwuemeka Ilo', fromEmail: 'chukwuemeka.i@sme.ng',  createdAt: daysAgo(24) },
  { subject: 'Billed for Enterprise features on Starter plan', status: 'resolved',        category: 'refund',    fromName: 'Simone Bernard',    fromEmail: 'simone.b@finance.fr',     createdAt: daysAgo(30) },
  { subject: 'Credit note issued but not applied to next invoice', status: 'closed',      category: 'refund',    fromName: 'Aya Nakagawa',      fromEmail: 'aya.n@billing.jp',        createdAt: daysAgo(46) },
  { subject: 'Education discount expired mid-year without warning', status: 'closed',     category: 'refund',    fromName: 'Chidi Okeke',       fromEmail: 'chidi.o@edu.ng',          createdAt: daysAgo(65) },

  // ── EXTRA GENERAL ───────────────────────────────────────────────────────────
  { subject: 'Can two admins manage the same workspace simultaneously?', status: 'open',  category: 'general',   fromName: 'Adaeze Nwachukwu',  fromEmail: 'adaeze.n@collab.ng',      createdAt: daysAgo(2) },
  { subject: 'Request demo for enterprise procurement evaluation', status: 'open',        category: 'general',   fromName: 'Maximilian Schröder', fromEmail: 'max.s@enterprise.de',   createdAt: daysAgo(5) },
  { subject: 'How to archive a workspace without deleting data?', status: 'resolved',     category: 'general',   fromName: 'Yewande Olatunji',  fromEmail: 'yewande.o@dataops.ng',    createdAt: daysAgo(17) },
  { subject: 'Reseller asking about white-label options', status: 'closed',               category: 'general',   fromName: 'Dmitri Sobolevsky', fromEmail: 'dmitri.s@reseller.ru',    createdAt: daysAgo(53) },
] as const

type MsgSpec = { direction: 'inbound' | 'outbound'; body: string; minutesAfter: number }

// Messages keyed by ticket index (matches `tickets` array above).
// Each conversation starts with the customer's opening message (inbound),
// then alternates with agent replies (outbound).
const threadsByIndex: Record<number, MsgSpec[]> = {
  // "Login page returns 500 error after password reset" — technical/open
  0: [
    { direction: 'inbound',  minutesAfter: 0,   body: 'Hi, I just reset my password but every time I try to log in I get a 500 internal server error. I\'ve tried three times and it keeps failing. Could you please look into this urgently?' },
    { direction: 'outbound', minutesAfter: 25,  body: 'Hi Amara, thanks for reaching out. I\'ve reproduced the issue — the password reset token is not being invalidated correctly, which causes the session creation to fail. I\'ve escalated this to our engineering team. As a temporary workaround, please try clearing your browser cache and cookies and attempt the login again.' },
    { direction: 'inbound',  minutesAfter: 60,  body: 'I cleared the cache and cookies as you suggested, but I\'m still seeing the 500 error. Is there a way to clear the token manually on your end?' },
    { direction: 'outbound', minutesAfter: 85,  body: 'Absolutely — I\'ve just manually invalidated the stale token from our side. Please try logging in again now. Let us know immediately if the error persists and we\'ll loop in the backend team directly.' },
  ],
  // "Two-factor authentication code not arriving via SMS" — technical/open
  1: [
    { direction: 'inbound',  minutesAfter: 0,   body: 'Hello, my two-factor authentication codes are no longer arriving via SMS. I\'ve double-checked that my phone number is correct in my profile and my carrier confirms there are no delivery issues on their end.' },
    { direction: 'outbound', minutesAfter: 30,  body: 'Hi Jonas, thanks for the detail. We\'re currently experiencing intermittent delays with our SMS gateway provider for certain European carriers. As a reliable workaround, you can switch to an authenticator app (e.g. Google Authenticator or Authy) under Security → Two-Factor Authentication → Change method. Would you like step-by-step guidance?' },
    { direction: 'inbound',  minutesAfter: 75,  body: 'I set up the authenticator app and that works fine. However, SMS should still be an option — it\'s what our team has been using for months. Is there an ETA on when the SMS provider issue will be resolved?' },
    { direction: 'outbound', minutesAfter: 100, body: 'Completely understood, and I apologise for the disruption. Our provider has acknowledged the issue and expects a fix within 24–48 hours. I\'ve added your ticket to our monitoring list so you\'ll receive an update as soon as SMS delivery is restored for your region.' },
  ],
  // "API rate limit hit — getting 429 on every request" — technical/open
  2: [
    { direction: 'inbound',  minutesAfter: 0,   body: 'We\'re hitting 429 Too Many Requests on literally every API call even though our dashboard shows we\'re well under our monthly quota. This is blocking our entire production pipeline. Please help urgently.' },
    { direction: 'outbound', minutesAfter: 20,  body: 'Hi Priya, I can see the issue. Your account\'s per-minute rate limit counter appears to have gotten out of sync after a backend deployment earlier today. I\'ve temporarily increased your burst limit by 5× while our infrastructure team investigates the root cause. Can you confirm requests are going through now?' },
    { direction: 'inbound',  minutesAfter: 45,  body: 'Yes, requests are flowing again — thank you for the quick response! Is there an estimated time for a permanent fix? We\'d like to know before rolling back the burst limit.' },
  ],
  // "Date picker shows wrong month on initial render" — technical/resolved (index 13)
  13: [
    { direction: 'inbound',  minutesAfter: 0,   body: 'The date picker component always opens on the previous month instead of the current one. For example, today is in June but it opens in May. Very confusing for our customers who need to select today\'s date.' },
    { direction: 'outbound', minutesAfter: 40,  body: 'Hi Raj, thanks for the clear description. We tracked this down to a UTC-offset bug in how we initialise the calendar — the component was subtracting the timezone offset from the current date before determining the display month. A fix has been deployed. Could you do a hard refresh and let us know if the picker now opens on the correct month?' },
    { direction: 'inbound',  minutesAfter: 90,  body: 'Hard refreshed and yes — the calendar now opens on the correct month. Thank you for the speedy fix!' },
    { direction: 'outbound', minutesAfter: 95,  body: 'Glad to hear it, Raj! I\'ve marked this ticket as resolved. Feel free to reopen it or start a new ticket if anything else comes up.' },
  ],
  // "Charged twice for the same invoice in March" — refund/open (index 28)
  28: [
    { direction: 'inbound',  minutesAfter: 0,   body: 'Hello, I was charged twice for my March invoice. My credit card statement shows two identical charges of $49.00 on March 15th, both described as "Helpdesk Pro Monthly". I need one of these refunded immediately.' },
    { direction: 'outbound', minutesAfter: 35,  body: 'Hi David, I can confirm in our billing records that there are indeed two charges processed for your March invoice — this appears to be caused by a webhook retry that triggered a duplicate payment. I\'m initiating a full refund of $49.00 for the second charge right now. It will appear on your statement within 5–7 business days. The refund reference is RF-2024-0315-KIM.' },
    { direction: 'inbound',  minutesAfter: 80,  body: 'Thank you for sorting this so quickly. I\'ll keep an eye on my statement. Should I contact you if it hasn\'t appeared after 7 days?' },
    { direction: 'outbound', minutesAfter: 90,  body: 'Absolutely — if you don\'t see the refund within 7 business days please reply here with your card\'s last 4 digits and I\'ll escalate directly with our payment processor. We\'re also putting a fix in place to prevent duplicate webhook retries on future billing runs.' },
  ],
  // "Cancel subscription and refund remaining days" — refund/open (index 29)
  29: [
    { direction: 'inbound',  minutesAfter: 0,   body: 'Hi, I\'d like to cancel my subscription effective immediately. I still have 18 days left in my current billing cycle. I understand you offer pro-rated refunds — could you process one for the unused days?' },
    { direction: 'outbound', minutesAfter: 50,  body: 'Hi Olivia, of course. I\'ve cancelled your subscription and I\'m processing a pro-rated refund for the 18 unused days. Based on your monthly rate of €24.90, that\'s a refund of €14.87. You\'ll see it on your card within 3–5 business days. Your data will remain accessible in read-only mode for 30 days if you\'d like to export anything.' },
    { direction: 'inbound',  minutesAfter: 80,  body: 'That\'s perfect, thank you for making this so easy. I\'ll export my data before the 30 days are up.' },
  ],
  // "How do I transfer account ownership to a colleague?" — general/open (index 48)
  48: [
    { direction: 'inbound',  minutesAfter: 0,   body: 'Hi there! I need to transfer my account ownership to my colleague Sarah Odu (sarah.odu@ops.ng). She\'ll be taking over as the workspace admin. How do I do this?' },
    { direction: 'outbound', minutesAfter: 20,  body: 'Hi James! You can transfer ownership from Settings → Team → Members. Find Sarah in the list, click the three-dot menu next to her name, and select "Make Owner". You\'ll be prompted to confirm. Note: once transferred, you\'ll be moved to a Member role — this action cannot be self-reversed. Is Sarah already a member of the workspace?' },
    { direction: 'inbound',  minutesAfter: 55,  body: 'Thanks! Sarah is already a member but when I follow those steps the "Make Owner" option is greyed out. She\'s currently on the free tier — does she need to be on a paid plan first?' },
    { direction: 'outbound', minutesAfter: 80,  body: 'Good catch — yes, ownership transfer requires the incoming owner to be on a paid plan. Once Sarah upgrades her account, the option will become active. If you\'d like, I can apply a one-month trial of the Pro plan to her account so you can complete the transfer straight away. Just let me know!' },
  ],
  // "Charged after account deletion request submitted" — refund/resolved (index 38)
  38: [
    { direction: 'inbound',  minutesAfter: 0,   body: 'I submitted an account deletion request on March 28th and received a confirmation email, but I was still charged $99 on April 1st. This is frustrating — I explicitly cancelled before the renewal date. I need a full refund.' },
    { direction: 'outbound', minutesAfter: 45,  body: 'Hi Michael, I sincerely apologise for this. I can see your deletion request was received on March 28th; unfortunately our system processes billing 3 days in advance and the April 1st charge had already been queued before your request was picked up. This is clearly a failure on our part. I\'m issuing a full refund of $99.00 immediately — you should see it within 5 business days. I\'ve also expedited the account deletion.' },
    { direction: 'inbound',  minutesAfter: 300, body: 'Thank you for acknowledging the error and acting so quickly. Refund received on my statement. This is now resolved as far as I\'m concerned.' },
    { direction: 'outbound', minutesAfter: 310, body: 'I\'m glad it\'s sorted, Michael. Again, I apologise for the inconvenience. We\'re reviewing our deletion-and-billing workflow to ensure this can\'t happen again. Take care!' },
  ],
}

function openingBody(subject: string, category: string | null): string {
  const i = subject.length % 3
  if (category === 'technical') {
    return [
      `Hi, I'm writing to report a technical issue: "${subject}". This is affecting my ability to use the platform and I haven't been able to resolve it on my own. Could you please look into this?`,
      `Hello, I need help with the following problem: "${subject}". I've already tried the usual troubleshooting steps without success. Any guidance would be greatly appreciated.`,
      `Hi there, I wanted to flag this bug I've encountered — "${subject}". Please let me know what additional information you need from my end to investigate.`,
    ][i]
  }
  if (category === 'refund') {
    return [
      `Hi, I'm contacting you about a billing matter: "${subject}". Could you please review my account and help me get this resolved?`,
      `Hello, I need assistance with the following billing issue: "${subject}". I'd appreciate it if you could look into this at your earliest convenience.`,
      `Hi team, I'm reaching out regarding "${subject}". Please help me get this sorted as soon as possible.`,
    ][i]
  }
  if (category === 'general') {
    return [
      `Hi, I have a question I was hoping you could help with: "${subject}". Please let me know what information you need from me.`,
      `Hello, I'm reaching out regarding "${subject}". Any help you can provide would be much appreciated.`,
      `Hi there, I wanted to get in touch about "${subject}". Looking forward to your response.`,
    ][i]
  }
  return [
    `Hi, I just wanted to bring this to your attention: "${subject}". Happy to provide more details if needed.`,
    `Hello, I'm writing to flag the following: "${subject}". Please let me know if you can help.`,
    `Hi there, I noticed something I thought you should know about: "${subject}". Let me know how to proceed.`,
  ][i]
}

async function main() {
  console.log('Clearing existing tickets...')
  await prisma.ticketMessage.deleteMany()
  await prisma.ticket.deleteMany()

  console.log(`Seeding ${tickets.length} tickets with messages...`)
  const created: { id: number; createdAt: Date; fromName: string; fromEmail: string }[] = []
  for (const t of tickets) {
    const ticket = await prisma.ticket.create({
      data: {
        subject: t.subject,
        status: t.status,
        category: t.category ?? undefined,
        fromName: t.fromName,
        fromEmail: t.fromEmail,
        createdAt: t.createdAt,
      },
      select: { id: true, createdAt: true, fromName: true, fromEmail: true },
    })
    created.push(ticket)
  }

  let totalMessages = 0
  for (let idx = 0; idx < created.length; idx++) {
    const ticket = created[idx]
    const t = tickets[idx]
    const thread = threadsByIndex[idx]

    if (thread) {
      // Use curated inbound messages for this ticket
      for (let i = 0; i < thread.length; i++) {
        const spec = thread[i]
        if (spec.direction === 'outbound') continue
        await prisma.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            messageId: `seed-${ticket.id}-${i}`,
            direction: 'inbound',
            fromName: ticket.fromName,
            fromEmail: ticket.fromEmail,
            body: spec.body,
            createdAt: new Date(ticket.createdAt.getTime() + spec.minutesAfter * 60_000),
          },
        })
        totalMessages++
      }
    } else {
      // Generate a single opening message for every other ticket
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          messageId: `seed-${ticket.id}-0`,
          direction: 'inbound',
          fromName: ticket.fromName,
          fromEmail: ticket.fromEmail,
          body: openingBody(t.subject, t.category),
          createdAt: ticket.createdAt,
        },
      })
      totalMessages++
    }
  }

  console.log(`Done — ${tickets.length} tickets and ${totalMessages} messages created.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => { prisma.$disconnect(); process.exit(0) })
