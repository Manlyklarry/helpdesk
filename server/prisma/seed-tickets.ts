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

async function main() {
  console.log('Clearing existing tickets...')
  await prisma.ticketMessage.deleteMany()
  await prisma.ticket.deleteMany()

  console.log('Seeding 100 tickets...')
  for (const t of tickets) {
    await prisma.ticket.create({
      data: {
        subject: t.subject,
        status: t.status,
        category: t.category ?? undefined,
        fromName: t.fromName,
        fromEmail: t.fromEmail,
        createdAt: t.createdAt,
      },
    })
  }

  console.log(`Done — ${tickets.length} tickets created.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => { prisma.$disconnect(); process.exit(0) })
