# Crizon — Android wrapper (Phase 1)

## ⚠️ Pehle yeh dekho — security issue
`api.py` aur `credentials.ts` mein Firebase **Admin SDK private key** aur
OneSignal **REST API key** hardcoded hain. Yeh dono secrets hain — agar yeh
app ke andar (client-side) ya kisi public GitHub repo mein chale gaye, to
koi bhi tumhara poora Firebase project (sara data, sare users) aur OneSignal
account control kar sakta hai.

- `google-services.json` ka `api_key` — yeh fine hai, client apps mein hamesha
  yahi hota hai, koi secret nahi.
- `FIREBASE_ADMIN` private key aur `ONESIGNAL restApiKey` — yeh **kabhi bhi**
  app code, repo, ya frontend mein nahi jaane chahiye. Inhe sirf server-side
  (ek Cloud Function / small backend) mein rakhna hai, jise sirf tum access
  karte ho. Maine is zip mein `credentials.ts`/`api.py` include nahi kiya hai.

Agar GitHub repo public hai to turant private kar do, aur dono keys ko rotate
(regenerate) kar do — kyunki agar yeh kabhi upload hui thi kahin, purani keys
ab bhi kaam karengi jab tak revoke na ho.

## Is zip mein kya hai (Phase 1 — foundation)
Tumne jo bola: "website ko 100% exact design ke sath app banao, permission
mil sake" — uska sahi tarika **Capacitor** hai (WebView + native bridge).
Isse:
- `www/index.html` = tumhari `index_fixed.html` **bilkul waisi ki waisi**,
  ek line bhi change nahi ki.
- Native permissions (mic, camera, notifications, storage) add ho jaate hain
  bina design touch kiye.
- `.github/workflows/build-apk.yml` — GitHub par push karte hi Actions tab
  mein automatic APK ban jaayega (`Actions` → latest run → `crizon-debug-apk`
  artifact download karo).

## Baaki phases (yeh ek zip mein nahi kiya — reason neeche)
Yeh itna bada scope hai (real Agora calling, OneSignal push, offline-first
local storage + auto-delete-after-delivery sync, WhatsApp-style hold-to-record
voice notes, multi-select delete for-me/everyone, last-seen) ki agar sab kuch
ek sath likh ke de deta bina test kiye, to error milne ke chances bohot zyada
hain — aur tumne khud kaha error nahin aana chahiye. Isliye step-by-step,
har piece ko theek se likh kar denge:

1. **Phase 2** — Voice messages: hold-to-record + lock + slide-to-cancel UI
   (exact WhatsApp motion), mic permission via Capacitor, upload to Cloudinary.
2. **Phase 3** — Real calling: Agora integration (audio, ringing/connecting
   states matching tumhari call screens exactly), CallKit-style incoming call
   on lock screen, foreground service so call na kate background mein.
3. **Phase 4** — Notifications: OneSignal wiring for message/call pushes
   (server-side trigger, key kept off the client).
4. **Phase 5** — Offline-first sync engine: local storage (IndexedDB/Capacitor
   Filesystem) + Firestore cleanup-after-delivery + 30-din auto-expiry logic
   jo tumne describe kiya.
5. **Phase 6** — Multi-select delete (for-me / for-everyone), online/last-seen
   status, auto-save media to gallery.

Bolo konsa phase pehle chahiye — main Phase 2 se shuru kar sakta hoon.

## Phase 2 update (this build) — kya fix hua
- App icon: tumhari "C" logo se saare Android launcher sizes + adaptive icon
  generate karke `app-icon/` mein rakh diye; build workflow khud copy kar dega.
- Voice message ⏳ emoji hata diya — ab loading spinner (brand color) dikhta
  hai jab tak audio load ho raha ho, load hote hi WhatsApp-style play button.
- Bug fix: `autoDownload()` function likha to tha par kahin call hi nahi ho
  raha tha — isliye voice/image/video kabhi cache hi nahi hote the, hamesha
  loading state dikhta rehta tha. Ab incoming message aate hi auto-download
  hoke local cache ho jaata hai, aur Cloudinary se turant delete ho jaata hai.
- Sender ka apna bheja voice note ab turant play-able — upload hote hi local
  file cache ho jaati hai, dobara cloud se download nahi karna padta.
- Image/Video fullscreen viewer mein top-right download icon add kiya —
  native app mein seedha gallery mein save hoga (`saveToGallery()`).
- Multi-select delete: kisi bhi message ko hold karo to selection mode on
  hota hai (top par count + trash icon), tap karke aur messages select kar
  sakte ho. "Delete for everyone" sirf tab dikhta hai jab saare selected
  messages khud ke bheje ho.
- Chat scroll-to-bottom pehle se hi sahi tha (dobara verify kiya).

JS syntax poora verify kiya (`node --check`) — koi error nahi mila.

## Abhi bhi baaki
Local-storage-first chat architecture (Phase 5), real Agora calling,
OneSignal push — inhe alag se, ek-ek karke karenge taaki risk na ho.

## Phase 3 update (this build) — kya fix hua
- **Single-device session** (WhatsApp jaisa): login karte hi ek session ID
  Firebase Realtime DB (`sessions/{uid}`) mein likhi jaati hai. Koi aur
  device/browser isi account se login kare to purani jagah turant "Logged
  out — this account was opened on another device" dikha ke logout ho
  jaayega — chahe woh device us waqt offline ho aur baad mein online aaye.
- **Status bar** — Android ka system status bar ab app ke teal color
  (`#075E54`) mein hai, safed nahi — native `colors.xml` aur Capacitor
  `StatusBar` plugin dono se set kiya, taaki "web app jaisa" na lage.
- **Splash screen flash fix** — app open hote hi jo default Capacitor blue
  logo ek pal ke liye dikh raha tha, usko hata diya. Ab native launch splash
  bilkul wahi background color (#050505) use karta hai jo tumhare apne
  Crizon splash screen ka hai, isliye transition seamless hai — koi alag
  logo flash nahi hoga.
- **Voice message real seek bar** — ab WhatsApp jaisi chhoti progress line
  hai jo play hote hi aage badhti hai, tap/drag karke aage-peeche seek kar
  sakte ho, aur ek speed button (1x → 1.5x → 2x) hai. Khatam hone par line
  automatic wapas 0 par aa jaati hai.

JS syntax poora verify kiya (`node --check`) — koi error nahi mila.

## Abhi bhi baaki
Local-storage-first chat architecture (Phase 5), real Agora calling,
OneSignal push — inhe alag se karenge.

## Phase 4 update (this build) — root-cause fixes

**Gallery-save aur status-bar pehle kyun nahi chal rahe the:** dono CDN se
runtime par dynamically import ho rahe the (`cdn.jsdelivr.net`). Agar wahan
version/path thoda bhi mismatch ho to import chup-chaap fail ho jaata hai aur
koi error bhi nahi dikhta — bilkul wahi symptom jo tumne dekha (kuch hota hi
nahi, na error na save).

**Fix:** ab `src/native-bridge-src.js` naam ki ek chhoti file hai jo
`esbuild` se **build ke time** (`npm run build:bridge`, GitHub Actions mein)
seedha usi `node_modules` se bundle hoti hai jise `cap sync` ne native side
se jodha — matlab version hamesha exact match hoga, koi CDN dependency nahi,
koi silent failure nahi. Yeh `www/native-bridge.js` ban kar seedha app mein
chali jaati hai.

- Gallery save: ab `@capacitor-community/media` ko `androidGalleryMode: true`
  ke saath configure kiya (WhatsApp jaisa simple mode — koi custom album
  nahi banana padta), aur zaroori permissions (`READ_MEDIA_IMAGES/VIDEO`,
  purane Android ke liye `WRITE_EXTERNAL_STORAGE`) manifest mein add ki.
- Status bar: same native-bridge se call hota hai, CDN import nahi.
- **Chat list / chat load delay** — ab dono jagah ek chhota localStorage
  cache hai: chat list aur khula hua chat, dono turant **pichli dafa dikhi
  hui state** se paint hote hain (koi loading nahi), aur Firestore se fresh
  data background mein aake use silently update/refresh kar deta hai. Poora
  local-storage-only rewrite nahi kiya (woh risky hai), par jo asal problem
  thi — "delay dikhna" — woh isse solve ho jaani chahiye.

JS syntax poora verify kiya (`node --check`) — koi error nahi mila. esbuild
bundling command bhi stub Capacitor packages ke against test kiya — sahi se
kaam karta hai.

## Abhi bhi baaki
Real Agora calling, OneSignal push, full offline-first rewrite (agar upar
wala cache-layer kaafi na lage) — yeh alag se karenge.

## Phase 4.1 — voice message stuck-loading bug (race condition)

**Bug:** kabhi voice message turant play-able dikhta, kabhi hamesha ke liye
loading spinner mein atka reh jaata — halanki message successfully send ho
chuka hota (tick mark dikhta).

**Root cause:** message pehle Firestore mein likha jaata tha, uske BAAD local
cache set hoti thi. Agar Firestore ka apna "local echo" (jo turant snapshot
listener ko notify karta hai) hamari cache-set line se PEHLE fire ho jaaye,
to us pehli render mein bubble "not cached" dikhta — spinner. Yeh ek race
condition thi, isliye kabhi hoti thi kabhi nahi.

**Fix:** ab doc ka ID Firestore mein likhne se PEHLE generate karte hain, aur
cache bhi likhne se pehle set kar dete hain — matlab jab bhi yeh message
pehli baar kahin bhi render ho, cache hamesha already ready hoti hai. Race
poori tarah khatam.

JS syntax verify kiya (`node --check`) — koi error nahi.

## Phase 6 update — "looks like a web app" + gallery save root cause

**Native-style dialogs** — saare `confirm()` (browser popup — sabse bada
"web app" giveaway) hata diye. Ab delete message, delete chat, logout, clear
AI chat — sab apne custom teal-styled dialog use karte hain.

**Voice/image/video "stuck loading" after reopening chat/app** — root cause:
cache sirf uss session ke liye thi (blob URL), app band karte hi gayab ho
jaati thi. Ab IndexedDB-based **persistent local store** hai — sender aur
receiver dono taraf, restart ke baad bhi turant available.

**Gallery save "Could not save" — asli wajah mili:** `@capacitor-community/media`
par Android par `albumIdentifier` zaroori hai, jo pehle pass hi nahi ho raha
tha (documented nahi hai obviously, isliye miss ho gaya tha). Ab ek "Crizon"
album khud create/reuse hota hai aur uska identifier pass hota hai. Error
message ab specific bhi dikhega agar phir bhi fail ho.

**Status bar ab per-screen** — chat list/chat = teal, AI chat/profile/login/
splash = apna sahi color, ek fixed color nahi.

**Bottom navigation bar** — pehle white tha (WhatsApp mein bhi ek giveaway),
ab `AppTheme.NoActionBar` mein `navigationBarColor` add kiya, teal ho jaayega.

**Crizon title** chat list screen par bada kiya (23px → 28px).

JS + native-bridge syntax dono verify kiye, esbuild bundle command bhi
dobara test kiya updated album-handling code ke saath.

## Abhi bhi baaki — agla phase
Real Agora calling, real push notifications (OneSignal) — yeh nahi hue is
message mein, yeh agla bada chunk hai.

## Phase 7 update

**Gallery save real fix (asli root cause):** error message khud bata raha
tha — `WRITE_EXTERNAL_STORAGE` manifest mein maxSdkVersion se restrict thi
(sirf purane Android ke liye), isliye plugin ko missing dikh rahi thi. Ab
unrestricted daal di.

**Status bar race condition fix:** pehle DO alag calls thi (ek boot-time
fixed-teal, ek per-screen) jo aapas mein race karti thi — isiliye splash
kabhi black kabhi teal dikhta tha. Ab sirf EK call hai, per-screen, koi race
nahi.

**Bottom navigation bar (white wala bug):** confirmed OS-level system nav bar
tha (splash black hone ke bawajood safed tha). `@capgo/capacitor-navigation-bar`
plugin add kiya — status bar ke saath saath ab yeh bhi per-screen color set
karega.

**Call button hata diya** chat screen se — jab tak Agora real calling nahi
ban jaata, ek non-working button dikhana hi "fake app" wala feel deta hai.

**Database delivery-only architecture — status:**
- Media (image/video/voice): already ho raha hai — receive hote hi local
  device pe save, Cloudinary se delete.
- 30-din tak deliver na hone wale messages: already ho raha hai
  (`sweepExpiry`) — automatic clean ho jaate hain.
- **Text messages ko bhi delivery ke turant baad Firestore se delete
  karna:** yeh maine jaan-bujh kar nahi kiya — isse "delete for everyone"
  wale feature se conflict hota hai (dono cases mein Firestore se doc
  gayab hota hai, app fark nahi bata sakta "auto-archive hua" vs "sender ne
  delete kiya", jisse sender ki apni bheji hui chat ghalti se gayab ho
  sakti hai). Agar yeh chahiye to ek extra status field ke saath sahi
  tarike se karna hoga — bata do to agla step ismein lagata hoon.

JS + native-bridge syntax dono verify kiye, esbuild bundle dobara test kiya
naye NavigationBar plugin stub ke saath.

## Phase 8 — big one: real notifications, real database-delivery model, navigation & document fixes

### 1. Real push notifications (WhatsApp jaisi — app band ho tab bhi aati hain)
Firebase Cloud Messaging use kiya (naya OneSignal account nahi chahiye —
aapka Firebase already hai):
- App login/signup/resume par khud FCM token le kar apne profile
  (`users/{uid}.fcmToken`) mein save kar leta hai.
- `functions/index.js` — ek Cloud Function jo har naye message par turant
  fire hoti hai aur recipient ko real push bhejti hai (sender ka naam +
  preview: text, ya "📷 Photo" / "🎤 Voice message" / "📄 filename").
- Notification tap karne par seedha sahi chat khulti hai.
- App khula ho par us chat mein na ho, to bhi local notification dikhti hai.

**⚠️ Yeh deploy karna padega — APK build isse deploy nahi karta:**
```
npm install -g firebase-tools
firebase login
cd crizon-app
firebase deploy --only functions
```
Isके liye Firebase project **Blaze (pay-as-you-go) plan** par hona zaroori
hai (Cloud Functions free plan par nahi chalte) — free tier bahut generous
hai, normal use mein bill nahi aayega. Pehli baar deploy karte waqt agar
Firestore collection-group query ke liye index maangey, terminal mein diya
gaya link click karke "Create Index" daba dena.

### 2. Database delivery-only model — ab sahi se implement kiya
Bahut baar bataya gaya architecture ab poora hai:
- Message deliver hote hi (recipient ne chat khol li, `status:'read'`) —
  ek scheduled Cloud Function (`cleanupDeliveredMessages`, har 15 min)
  Firestore se us message ko hata deta hai.
- 30 din tak koi receive na kare to bhi khud delete ho jaata hai.
- **Dono taraf ka data local storage mein hi bacha rehta hai** — kyunki
  message Firestore se gayab hone se pehle hi dono devices apne
  localStorage/IndexedDB cache mein save kar chuke hote hain. Jab live
  Firestore se message "gayab" hota hai to app use apne local cache se hi
  dikhata rehta hai (dono taraf) — bilkul jaisa tumne bataya tha.
- "Delete for everyone" ab real Firestore delete nahi karta — ek flag
  (`deletedForEveryone`) set karta hai taaki upar wale auto-cleanup se
  conflict na ho (dono jagah se message gayab hona ek jaisa dikhta,
  isliye flag se fark pata chalta hai).

### 3. Document open/download — asli fix
Pehle sirf `<a download>` try kar raha tha jo app ke WebView mein kaam hi
nahi karta. Ab `@capacitor/filesystem` se Documents folder mein save karta
hai aur `@capacitor-community/file-opener` se seedha khol deta hai — WhatsApp
jaisa.

### 4. Back button — asli root cause mila
Har screen ka back button HARDCODED tha ek fix screen pe (jaise
contactProfile ka back hamesha `chat` pe jaata tha, kahin se bhi aaye ho) —
isliye WhatsApp jaisa "jahan se aaye wahi wapas jao" nahi ho raha tha. Ab
saare back buttons real `history.back()` use karte hain — jahan se aaye
thे wahi jaata hai, chahe kahin se bhi navigate kiya ho.

### 5. Status bar / nav bar — alag kiya
Pehli baar dono ek hi color set kar rahe the. Ab WhatsApp jaisa: status bar
(upar) us screen ke header se match karta hai, navigation bar (neeche) us
screen ke sabse neeche wale hisse se — chat/chat-list pe upar green, neeche
white, bilkul WhatsApp jaisa.

JS + native-bridge + Cloud Function syntax sab verify kiya. `patch-android.sh`
ko synthetic Android files ke against poora test kiya, patched XML files
ko parse karke confirm kiya ki valid rahi (ek bug pakda aur fix kiya isi
process mein — `<application>` tag multi-line hone ki wajah se pehla
version invalid XML bana raha tha).

## Phase 9 — login bug, session bug, unread badge, notification auto-deploy

### 1. Login "Incorrect username or password" on pehli try — asli root cause mila
Username → email lookup ka timeout sirf 1800ms tha. App cold-start par
Firestore connection warm hone mein isse zyada waqt lag sakta hai — isliye
pehli try mein lookup timeout ho jaata, galat fallback email try hoti, aur
sahi password ke bawajood error aata. Doosri try tak connection warm ho
chuka hota isliye chal jaata. Ab timeout 6000ms + ek retry hai.

### 2. App reopen karne par kabhi-kabhi login screen dikhna — asli root cause mila
`auth.currentUser` ko turant (synchronously) check kar rahe the, lekin
Firebase Auth ka apna restore asynchronous hai — cold start par kabhi
kabhi yeh time par ready nahi hota tha, isliye ek logged-in user ko galti
se login screen pe bhej diya jaata. Ab Firebase ke apne signal
(`onAuthStateChanged`) ka poora wait karte hain, race khatam.

### 3. Unread badge delay — fix
Chat padhte hi (status 'read' set hone ke turant baad) chat-list ke cached
unread count ko bhi seedha patch kar dete hain, bina chat-list screen ke
apne listener ke wapas sync hone ka wait kiye. Ab badge turant chala jaana
chahiye, 15-20 second/1 minute ka wait nahi.

### 4. Message ticks (single/double-grey/double-blue) — already tha
Yeh feature pehle se implement hai: message send hote hi single tick,
recipient ka app usse receive karte hi (unka chat-list active hote hi)
double-grey "delivered" tick, aur unke chat kholte hi double-blue "read"
tick. Agar yeh sahi nahi dikh raha to zaroor batana — lekin code mein yeh
pehle se maujood hai.

### 5. Push notifications — auto-deploy add kiya
Pichli baar bataya tha ki Cloud Function deploy karni padegi — yeh manual
step hi shayad wajah hai ki notification kaam nahi kar raha (code ban chuka
hai, deploy nahi hua). Ab GitHub Actions khud deploy kar dega — **ek baar**
yeh setup karna hoga:

1. Firebase project ko **Blaze plan** par upgrade karo (Console → Usage and
   billing) — free tier generous hai, chhoti app ke liye bill nahi aayega.
2. Google Cloud Console → IAM & Admin → Service Accounts → naya service
   account banao, role **"Firebase Admin"** do, aur uski JSON key download
   karo.
3. GitHub repo → Settings → Secrets and variables → Actions → naya secret:
   naam `FIREBASE_SERVICE_ACCOUNT`, value mein poori JSON file ka content
   paste karo.
4. Bas — ab jab bhi `functions/` folder mein kuch change hoga aur push
   karoge, `.github/workflows/deploy-functions.yml` khud deploy kar dega.
   Pehli baar chalane ke liye ek chhota sa dummy change karke push kar do,
   ya GitHub → Actions tab → "Deploy Cloud Functions" → "Run workflow"
   (manual trigger) use karo.

Agar pehli deploy fail ho (log mein index missing ka error), Firebase log
mein diya gaya link click karke "Create Index" daba dena — ek baar ka kaam
hai.

### 6. App minimize karke rakhne par jaldi band hona
Yeh mostly Android OS khud karta hai (kam RAM wale devices par background
apps ko memory ke liye band kar deta hai) — app ka code isko poori tarah
control nahi kar sakta. Lekin ab jo session-resume bug fix hua (#2), uski
wajah se agar Android app ko background mein band bhi kare, dobara khulne
par turant sahi chat-list pe aa jaana chahiye, login screen pe nahi — isse
yeh "band hona" kam mehsoos hoga.

JS syntax poora verify kiya.

---

## Database delivery model — kaise kaam karta hai (explanation)

1. Message bhejte ho → Firestore mein jaata hai (`status: 'sent'`).
2. Recipient ka app (chat list active hone par) use turant "dekh" leta hai
   → status `'delivered'` ho jaata hai (double grey tick).
3. Recipient us specific chat ko kholta hai → status `'read'` ho jaata hai
   (double blue tick) — isi waqt uska app us message ka poora data (text
   ya media file) apni **local storage** (IndexedDB/localStorage) mein bhi
   save kar chuka hota hai — is point ke baad Firestore ki zaroorat nahi.
4. Har 15 minute mein ek Cloud Function (`cleanupDeliveredMessages`) chalta
   hai jo Firestore se woh saare messages **hamesha ke liye delete** kar
   deta hai jinka status `'read'` ho chuka hai. Yeh automatic hai — tumhein
   kuch delete nahi karna padta, na hi woh apne aap Firestore mein baithe
   rehte hain.
5. Isi function mein: 30 din tak koi receive na kare (status abhi bhi
   `'sent'`) to woh bhi khud delete ho jaata hai.
6. **Dono devices** (sender aur receiver) ke paas apna-apna sthai copy
   already local storage mein hota hai jab yeh delete hota hai — isliye
   chat history dono taraf bani rehti hai, sirf Firestore (jo sirf
   "beech mein delivery ke liye" hai) khaali ho jaata hai. Manually clear
   data ya delete karne se hi local wala data jaata hai, Firestore ke
   auto-cleanup se nahi.

Yeh poora automatic hai, kahin bhi manually "delete" click nahi karna
padta — bas ek baar Cloud Function deploy ho jaaye (upar #5 dekho).

## Phase 10 — ek hi file mein sab kuch (icon, document, back button, launch flash, notifications)

### 1. App icon galat dikhna (recents/task-switcher mein purple "C")
Root cause: Android 13+ ka "Themed Icons" feature ek `monochrome` layer
maangta hai adaptive icon mein. Humare paas woh nahi tha, isliye kuch
launchers khud apna fallback bana rahe the (accent-color square + letter)
jab unka theming system humare icon ko process nahi kar paaya. Ab poora
icon set dobara banaya — legacy + adaptive (background/foreground) +
**monochrome** teeno properly. Poora synthetic test karke XML valid
confirm kiya.

### 2. Document "Could not open: FILE_NOTCREATED" — asli wajah mili
`Directory.Documents` Android 11+ par scoped-storage restrictions ki wajah
se likhne layak nahi raha (public folders block ho gaye hain) — isliye
writeFile() fail ho raha tha. Ab `Directory.Cache` use karta hai (hamesha
likhne layak, extra permission nahi chahiye) — document open/download ab
kaam karna chahiye.

### 3. Image/video ya multi-select ke andar back dabane par chat se bahar nikal jaana
Fix kiya — ab fullscreen image/video viewer aur multi-select mode dono
history-based hain: back (hardware ho ya gesture) pehle sirf unhe band
karega, chat ke andar hi rakhega. Chat se bahar sirf tab jaoge jab koi
overlay khula na ho.

### 4. App launch par "black → green → splash" flash
Root cause mila: `capacitor.config.json` mein WebView ka apna background
color hi green (`#075E54`) set tha, jo native black splash ke turant baad,
hamari JS ke render hone se pehle, ek pal ke liye dikh jaata tha. Ab woh
bhi black (`#050505`) hai — splash se match karta huaa, seamless.

### 5. Notifications — ab error bhi dikhega agar fail ho
Pehle permission deny hone ya registration fail hone par chup-chaap kuch
nahi hota tha. Ab agar notification setup fail ho (permission off, ya koi
aur wajah) to app turant ek toast dikhayega jisme asli wajah likhi hogi —
taaki pata chale ki code ka masla hai ya sirf phone settings mein
permission off hai. **Agar abhi bhi notification nahi aa rahe, pehle yeh
check karo:**
- App open karke dekho koi toast "notifications are off" ya "could not set
  up notifications: ..." to nahi dikha?
- Phone Settings → Apps → Crizon → Notifications → ON hai na?
- GitHub → Actions tab → "Deploy Cloud Functions" workflow run hui aur
  **green tick** se pass hui? (agar red cross hai, uske logs khol ke
  dekhna, wahi exact error batayega)
- Firebase Console → us project mein Blaze plan active hai?

JS + native-bridge syntax dono verify kiye, esbuild bundle poore plugin
stubs ke against test kiya, icon files aur unke XML ko synthetic Android
project ke against test karke valid confirm kiya.
