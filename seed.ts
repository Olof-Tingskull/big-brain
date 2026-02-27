import { query, end } from "./lib/db.js";
import { embedBatch } from "./lib/embeddings.js";
import "dotenv/config";

const subjects = [
  // === PEOPLE (10) ===
  {
    name: "Ella",
    type: "person",
    summary:
      "Ella Sandström, 26 år. Jobbar på kaféet Rost i Majorna, Göteborg. Nyligen gjort slut med Kasper efter 3 år. Har en hemlig crush på Joel men vågar inte säga något eftersom Joel är Kaspers bästa kompis. Drömmer om att öppna eget kafé. Bästa kompis med Moa sedan gymnasiet. Älskar att baka, lyssna på vinyl och gå på loppis.",
  },
  {
    name: "Joel",
    type: "person",
    summary:
      "Joel Eriksson, 27 år. Musiker, spelar gitarr och sjunger i bandet Dimljus. Jobbar deltid på skivaffären Bengans. Kaspers bästa kompis sedan barndomen. Vet inte om Ellas crush. Har börjat umgås mycket med Saga som jobbar med Ella. Lite clueless om känslor men genuint snäll. Drömmer om att Dimljus ska spela på Way Out West.",
  },
  {
    name: "Kasper",
    type: "person",
    summary:
      "Kasper Nilsson, 27 år. Programmerare på ett litet techbolag. Ellas ex — fortfarande kär i henne och hanterar separationen dåligt. Började gå i terapi i januari. Bästa kompis med Joel. Har en hemlighet: han hånglade med Wilma på en fest två veckor efter uppbrottet, vilket Ella inte vet om. Bygger på en dejtingapp som sidoprojekt.",
  },
  {
    name: "Moa",
    type: "person",
    summary:
      "Moa Bergqvist, 26 år. Konststudent på HDK-Valand. Ellas bästa kompis sedan gymnasiet men deras relation har blivit ansträngd sedan uppbrottet — Moa är också kompis med Kasper och vill inte välja sida. Ihop med Theo sedan ett år. Har en viktig vernissage i april som hon är stressad över. Noel är hemligt kär i henne.",
  },
  {
    name: "Theo",
    type: "person",
    summary:
      "Theo Dahl, 28 år. Personlig tränare på Nordic Wellness. Moas pojkvän. Har ett hemligt spelproblem — har förlorat ca 80 000 kr på nätcasinon senaste halvåret. Lånat pengar av Kasper (20 000 kr) som han inte kan betala tillbaka. Noel vet om spelproblemen men har lovat att inte berätta. Charmig utåt men kämpar i det tysta.",
  },
  {
    name: "Saga",
    type: "person",
    summary:
      "Saga Holm, 25 år. Ny i Göteborg, flyttade från Stockholm i november. Jobbar på Rost med Ella. Flirtar öppet med Joel vilket skapar spänning med Ella. Vet inte om Ellas crush utan tror de bara är kompisar. Energisk, social och lite naiv. Ella vill inte hata henne men kan inte låta bli att vara svartsjuk.",
  },
  {
    name: "Wilma",
    type: "person",
    summary:
      "Wilma Forsberg, 27 år. DJ:ar på helgerna, jobbar på Systembolaget på vardagar. Gruppens festpransen — alltid sista att gå hem. Vet alla hemligheter. Hånglade med Kasper efter uppbrottet men ångrar sig och har inte berättat för Ella. Freja är orolig för att Wilma dricker för mycket. Har börjat stanna hemma från jobb på måndagar.",
  },
  {
    name: "Noel",
    type: "person",
    summary:
      "Noel Lindgren, 26 år. Spelar bas i Dimljus med Joel. Jobbar på biblioteket. Tyst och eftertänksam, skriver poesi. Hemligt förälskad i Moa men hon är ihop med Theo. Vet om Theos spelproblem och tycker att Moa förtjänar bättre men kan inte säga något utan att avslöja varför han bryr sig. Bästa kompis med Joel i bandet.",
  },
  {
    name: "Freja",
    type: "person",
    summary:
      "Freja Johansson, 27 år. Läkarstuderande, termin 10. Gruppens ansvarsfulla mamma-figur. Försöker medla i konflikter. Planerar en gemensam sommarresa till Grekland. Orolig för Wilmas drickande. Singel sedan 2024, fokuserar på studierna. Är den enda som alla i gruppen litar fullt ut på.",
  },
  {
    name: "Anton",
    type: "person",
    summary:
      "Anton Kaya, 28 år. Theos gymkompis som börjat hänga med gruppen sedan december. Verkar trevlig och charmig men har en komplicerad bakgrund — flyttade från Malmö efter en dålig breakup och nämner aldrig sitt ex. Freja har börjat få feelings för honom men vågar inte erkänna det. Wilma misstänker att Anton döljer något.",
  },

  // === EVENTS/PROJECTS (5) ===
  {
    name: "Sommarresan",
    type: "project",
    summary:
      "Frejas planerade gruppsresa till Grekland i juli. Budget: 15 000 kr per person. Problem: Theo har inte råd (pga spelskulderna), Kasper vill inte åka om Ella åker, Ella vill inte åka om Saga kommer, och Wilma 'glömde' att boka av från jobbet. Freja desperat att få ihop det — det kan vara sista chansen att hålla ihop gruppen.",
  },
  {
    name: "Dimljus",
    type: "project",
    summary:
      "Joels och Noels band. Spelar indiefolk. Tre medlemmar: Joel (gitarr/sång), Noel (bas), och trummisen Erik som precis hoppade av. Har sökt en spelning på Way Out West-festivalen. Behöver hitta ny trummis och spela in en demo. Repar i Joels garage varje onsdag och söndag.",
  },
  {
    name: "Moas vernissage",
    type: "project",
    summary:
      "Moas avgångsutställning på HDK-Valand i april. Temat: 'Mellanrum' — konst om relationer som förändras. Inspirerad av dramat i kompiskretsen (men hon har inte berättat det för någon). Ella lovade hjälpa till med cateringen men de har knappt pratat på sistone. Moa är livrädd att ingen kommer.",
  },
  {
    name: "Kaspers app",
    type: "project",
    summary:
      "Dejtingappen 'Blindspot' som Kasper bygger på kvällar och helger. Konceptet: man matchar baserat på intressen och personlighet, inga bilder förrän efter tredje konversationen. Ironiskt att han bygger en dejtingapp när han fortfarande är kär i sitt ex. Joel tycker det är genialt. Kasper har visat den för Theo som lovade att betatesta.",
  },
  {
    name: "Ellas kafédröm",
    type: "project",
    summary:
      "Ellas dröm om att öppna eget kafé i Linnéstaden. Har sparat 120 000 kr men behöver minst 400 000 för att starta. Funderar på att fråga sin mamma om lån. Har hittat en lokal på Tredje Långgatan men den är dyr. Moa lovade att göra konsten till kaféet. Joel erbjöd sig att spela live ibland. Drömmen håller ihop trots allt annat kaos.",
  },

  // === CONCEPTS (6) ===
  {
    name: "Uppbrottet",
    type: "concept",
    summary:
      "Ella och Kaspers breakup i november 2025 efter 3 år. Ella gjorde slut — kände sig instängd och sa att hon 'tappat fjärilarna'. Kasper blev förstörd. Gruppen delades: Ella, Moa, Freja och Wilma på ena sidan, Joel och Noel (via Joel) på Kaspers. Sedan dess har gruppen aldrig riktigt hängt alla tillsammans. Uppbrottet är det olösta traumat som påverkar allt.",
  },
  {
    name: "Kärlekstriangeln",
    type: "concept",
    summary:
      "Den outtalade triangeln mellan Ella, Joel och Saga. Ella har haft feelings för Joel i månader men vågar inte agera för att Joel är Kaspers bästa kompis. Saga flirtar öppet med Joel utan att veta om Ellas crush. Joel verkar intresserad av Saga men är oblivious om Ella. Wilma och Freja vet om Ellas feelings. Moa vet inte.",
  },
  {
    name: "Theos hemlighet",
    type: "concept",
    summary:
      "Theos spelproblem som eskalerat sedan sommaren 2025. Har förlorat ~80 000 kr på nätcasinon. Ljuger för Moa om vart pengarna tar vägen ('gymmet kostar mer nu', 'jag investerade i crypto'). Lånade 20 000 kr av Kasper med löfte att betala tillbaka i januari — har inte gjort det. Noel vet efter att han av misstag såg Theos telefon. Anton misstänker också något.",
  },
  {
    name: "Wilmas gräns",
    type: "concept",
    summary:
      "Wilmas ökande alkoholkonsumtion. Vad som var festande har blivit ett mönster: dricker ensam på vardagar, missar jobb, vaknar med blackouts. Freja har försökt prata med henne två gånger men Wilma avfärdar det som 'tjatande'. Wilma bär också på skuld över Kasper-hånglet. Joel och Noel har märkt men vet inte hur de ska ta upp det.",
  },
  {
    name: "Gruppdynamiken",
    type: "concept",
    summary:
      "Kompisgängets skiftande dynamik sedan uppbrottet. Innan: tät grupp som hängde varje fredag. Nu: uppdelad i subfraktioner. Ella undviker Kasper, Kasper undviker Ella, Moa sitter i mitten, Saga har rört om i grytan, och Anton är den nya som ingen riktigt känner. Fredagsmiddagarna har blivit sporadiska. Freja kämpar för att hålla ihop alla.",
  },
  {
    name: "Pengastressen",
    type: "concept",
    summary:
      "Pengar som problemkälla i gruppen. Theo sitter i spelskulderna (80 000 kr) och har lånat 20 000 av Kasper. Ella sparar desperat till kaféet. Sommarresan kostar 15 000 per person. Wilma har fått varning på jobbet och riskerar sparken. Noel lever på bibliotekslön. Moa är student utan inkomst. Joel tjänar minimalt på skivaffären. Bara Freja och Kasper har okej ekonomi.",
  },

  // === WORKFLOWS (3) ===
  {
    name: "Fredagsmiddagarna",
    type: "workflow",
    summary:
      "Traditionen att hela gänget lagar middag ihop varje fredag hos den som har störst lägenhet (roterar). Började 2023 och var gruppens höjdpunkt. Sedan uppbrottet har det havererat: Ella och Kasper vill inte vara i samma rum, Theo hittar ursäkter, och Saga har bjudits in men det gör Ella obekväm. Senaste lyckade middagen var i december.",
  },
  {
    name: "Bandrepetitionerna",
    type: "workflow",
    summary:
      "Dimljus repar i Joels garage varje onsdag kl 19 och söndag kl 14. Sedan trummisen Erik slutade är det bara Joel och Noel. De har testat tre ersättare men ingen har passat. Reparna har blivit mer av en hangout — Kasper kommer ibland och hänger, och nyligen har Saga börjat dyka upp, vilket gör det awkward för alla som vet om Ellas feelings.",
  },
  {
    name: "Gymgänget",
    type: "workflow",
    summary:
      "Theo, Anton och ibland Kasper tränar på Nordic Wellness kl 06:30 tisdag-torsdag-lördag. Det är här Theo och Anton blivit nära. Kasper gick med i januari som 'terapi efter breakupen'. Gymmet har blivit den plats där killarna pratar — det var här Kasper berättade att han saknar Ella, och där Anton glömde sig och nämnde sitt ex i Malmö.",
  },
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60));
  return d;
}

const chunks: {
  content: string;
  type: string;
  source: string;
  metadata: object;
  created_at: Date;
  subjectNames: string[];
}[] = [
  // ===== UPPBROTTET ARC =====
  {
    content:
      "Ella gjorde slut med Kasper igår kväll. Hon sa att hon 'inte känner det längre' och att hon 'behöver hitta sig själv'. Kasper grät. De har varit ihop i tre år. Moa ringde mig efteråt — hon visste inte vad hon skulle säga, hon älskar dem båda. Joel fick veta av Kasper vid midnatt, sa att Kasper var helt förstörd.",
    type: "note",
    source: "manual",
    metadata: { emotional: true, life_event: "breakup" },
    created_at: daysAgo(120),
    subjectNames: ["Ella", "Kasper", "Moa", "Joel", "Uppbrottet"],
  },
  {
    content:
      "Första fredagsmiddagen efter uppbrottet. Ella kom, Kasper kom inte. Stämningen var tryckt. Joel verkade stressad över att vara mitt emellan sin bästa kompis och resten av gruppen. Moa försökte hålla konversationen igång men det var jobbigt. Wilma drack för mycket och sa högt 'det är ju skönt att slippa den elefanten i rummet' vilket fick Ella att gråta.",
    type: "note",
    source: "manual",
    metadata: { dinner: true, awkward: true },
    created_at: daysAgo(115),
    subjectNames: ["Ella", "Kasper", "Joel", "Moa", "Wilma", "Fredagsmiddagarna", "Uppbrottet", "Gruppdynamiken"],
  },
  {
    content:
      "Kasper berättade för Joel att han fortfarande älskar Ella. Säger att han vill 'kämpa för att få henne tillbaka'. Joel rådde honom att ge henne utrymme. Kasper har börjat kolla terapi — sin mamma föreslog det. Joel sa till mig efteråt att han tycker det är jättejobbigt att vara Kaspers bästa kompis och samtidigt hänga med Ella i gruppen.",
    type: "note",
    source: "manual",
    metadata: { confidential: true },
    created_at: daysAgo(110),
    subjectNames: ["Kasper", "Joel", "Ella", "Uppbrottet"],
  },
  {
    content:
      "Kasper började i terapi idag. Psykologen heter Maria. Han sa att det kändes bra att prata med någon neutral. Pratar om uppbrottet men också om att han alltid har haft svårt att vara ensam. Joel följde med till väntrummet som stöd.",
    type: "note",
    source: "manual",
    metadata: { therapy: true },
    created_at: daysAgo(95),
    subjectNames: ["Kasper", "Joel", "Uppbrottet"],
  },

  // ===== KASPER-WILMA HEMLIGHETEN =====
  {
    content:
      "Shit. Kasper och Wilma hånglade på Wilmas efterfest förra lördagen. Kasper var full och ledsen, Wilma var full som vanligt. Det 'bara hände'. Båda ångrar sig. Wilma ringde mig på söndagen och var livrädd att Ella ska få veta. Kasper bad henne att aldrig berätta. Jag lovade att hålla tyst men det känns hemskt.",
    type: "note",
    source: "manual",
    metadata: { secret: true, drama: true },
    created_at: daysAgo(100),
    subjectNames: ["Kasper", "Wilma", "Ella", "Uppbrottet"],
  },
  {
    content:
      "Wilma mår dåligt över Kasper-grejen. Hon sa att hon 'förstörde den osynliga kompiskoden' och att Ella aldrig skulle förlåta henne om det kom ut. Jag frågade om hon hade feelings för Kasper — hon sa absolut inte, det var bara fylla och dåligt omdöme. Hon har undvikit Ella i en vecka nu och hittar på ursäkter.",
    type: "note",
    source: "manual",
    metadata: { guilt: true },
    created_at: daysAgo(95),
    subjectNames: ["Wilma", "Kasper", "Ella", "Uppbrottet"],
  },

  // ===== KÄRLEKSTRIANGELN ARC =====
  {
    content:
      "Jag tror att Ella har feelings för Joel. Märkte det på nyårsfesten — hon kunde inte sluta titta på honom när han spelade gitarr. Sen när Joel gav henne sin jacka för att hon frös blev hon alldeles röd. Frågade henne rakt ut nästa dag. Hon nekade först men erkände sen: 'Okej ja, men det spelar ingen roll. Han är Kaspers bästa kompis. Det kan aldrig hända.'",
    type: "note",
    source: "manual",
    metadata: { crush: true, secret: true },
    created_at: daysAgo(85),
    subjectNames: ["Ella", "Joel", "Kasper", "Kärlekstriangeln"],
  },
  {
    content:
      "Saga har börjat på Rost! Hon är ny i Göteborg, kom från Stockholm. Jättetrevlig, energisk. Ella gillar henne. De jobbar samma skift på tisdagar och torsdagar. Saga frågade direkt om kompiskretsen och blev inbjuden att hänga med på fredagsmiddagen.",
    type: "note",
    source: "manual",
    metadata: { new_person: true },
    created_at: daysAgo(80),
    subjectNames: ["Saga", "Ella", "Fredagsmiddagarna"],
  },
  {
    content:
      "Saga träffade Joel för första gången på fredagsmiddagen hos Freja. De klickade direkt — pratade om musik i timmar. Saga är tydligen stor indiefan. Joel var mer energisk än jag sett honom på länge. Ella satt bredvid och jag såg hur hennes leende dog lite inuti. Efteråt sa Ella till mig: 'Typiskt. Precis när jag bestämt mig för att vara modig.'",
    type: "note",
    source: "manual",
    metadata: { turning_point: true },
    created_at: daysAgo(75),
    subjectNames: ["Saga", "Joel", "Ella", "Freja", "Kärlekstriangeln", "Fredagsmiddagarna"],
  },
  {
    content:
      "Saga dök upp på Dimljus repp igår. Joel hade tydligen bjudit in henne. Noel berättade att det var awkward — Saga satt och filmade Joel med sin telefon. Kasper var där också och verkade inte bry sig men Noel sa att stämningen var 'konstig'. Joel verkar helt blind för att det finns spänningar.",
    type: "note",
    source: "manual",
    metadata: {},
    created_at: daysAgo(60),
    subjectNames: ["Saga", "Joel", "Noel", "Kasper", "Dimljus", "Bandrepetitionerna", "Kärlekstriangeln"],
  },
  {
    content:
      "Ella kom hem till mig och grät igår. Hon hade sett på Instagram att Joel och Saga hade ätit lunch ihop. 'Det är inte som att vi är tillsammans, jag har ingen rätt att vara arg.' Men hon är arg. Och ledsen. Och frustrerad på sig själv att hon aldrig sa något. Jag (Freja) föreslog att hon kanske borde prata med Joel, men Ella vägrade: 'Om han gillar Saga så gillar han Saga. Jag vill inte vara den som förstör.'",
    type: "note",
    source: "manual",
    metadata: { emotional: true },
    created_at: daysAgo(50),
    subjectNames: ["Ella", "Joel", "Saga", "Freja", "Kärlekstriangeln"],
  },
  {
    content:
      "Intressant twist: Joel frågade Noel om han tror att Ella 'agerar konstigt mot honom'. Noel sa att Joel märkt att Ella blivit tystare och undviker ögonkontakt. Noel ville säga sanningen men visste inte om det var hans att berätta. Nöjde sig med: 'Prata med henne.' Joel sa: 'Om vad? Jag vet inte ens vad problemet är.'",
    type: "note",
    source: "manual",
    metadata: { clueless_joel: true },
    created_at: daysAgo(40),
    subjectNames: ["Joel", "Noel", "Ella", "Kärlekstriangeln"],
  },

  // ===== THEOS HEMLIGHET ARC =====
  {
    content:
      "Theo berättade att han är 'lite knapert just nu' när Moa frågade varför han aldrig vill äta ute längre. Han skyller på att gymmet höjde priserna och att han 'investerade lite i crypto som gick åt helvete'. Sanningen: han har spelat bort nästan 80 000 kr på nätcasino sedan i somras. Moa verkade köpa förklaringen.",
    type: "note",
    source: "manual",
    metadata: { lie: true, gambling: true },
    created_at: daysAgo(90),
    subjectNames: ["Theo", "Moa", "Theos hemlighet", "Pengastressen"],
  },
  {
    content:
      "Theo lånade 20 000 kr av Kasper. Sa att det var till 'en investering som skulle betala tillbaka sig dubbelt'. Kasper litade på honom. Lovade att betala tillbaka i januari. Det är nu februari och Theo har inte nämnt det. Kasper har inte frågat ännu men börjar undra.",
    type: "note",
    source: "manual",
    metadata: { debt: true, amount: 20000 },
    created_at: daysAgo(70),
    subjectNames: ["Theo", "Kasper", "Theos hemlighet", "Pengastressen"],
  },
  {
    content:
      "Noel berättade att han av misstag såg Theos telefon på gymmet — en notis från ett nätcasino: 'Välkommen tillbaka! Sätt in 500 kr och få 500 kr bonus.' Noel blev iskall. Konfronterade Theo i omklädningsrummet. Theo bröt ihop och erkände allt: 80 000 kr borta, lånet från Kasper, att han ljuger för Moa. Bad Noel att inte berätta. Noel lovade motvilligt.",
    type: "note",
    source: "manual",
    metadata: { revelation: true, confidential: true },
    created_at: daysAgo(55),
    subjectNames: ["Noel", "Theo", "Kasper", "Moa", "Theos hemlighet", "Gymgänget"],
  },
  {
    content:
      "Noel är i en omöjlig sits. Han vet att Theo spelar, vet att Moa blir lurad, och kan inte säga något utan att bryta sitt löfte. Han frågade mig (Freja) hypotetiskt: 'Om du visste att en kompis partner ljög om något stort, skulle du berätta?' Jag sa ja utan att tveka. Noel sa bara 'hmm' och bytte ämne. Jag undrar vad han vet.",
    type: "note",
    source: "manual",
    metadata: { moral_dilemma: true },
    created_at: daysAgo(45),
    subjectNames: ["Noel", "Freja", "Theo", "Moa", "Theos hemlighet"],
  },
  {
    content:
      "Theo kunde inte betala sin del av middagen igår och sa att han 'glömt plånboken'. Anton lade ut för honom. Sen på vägen hem sa Anton till mig: 'Theo har sagt att han glömt plånboken tre gånger nu. Antingen har han världens sämsta minne eller så har han problem.' Jag tror Anton börjar fatta.",
    type: "note",
    source: "manual",
    metadata: { suspicious: true },
    created_at: daysAgo(30),
    subjectNames: ["Theo", "Anton", "Theos hemlighet", "Pengastressen"],
  },
  {
    content:
      "TODO: Prata med Theo om pengasituationen. Kasper vill ha tillbaka sina 20 000 och börjar bli frustrerad. Theo undviker hans meddelanden. Det här kan bli en grej som sprider sig i gruppen.",
    type: "todo",
    source: "manual",
    metadata: { priority: "high" },
    created_at: daysAgo(20),
    subjectNames: ["Theo", "Kasper", "Theos hemlighet", "Pengastressen"],
  },

  // ===== WILMAS GRÄNS ARC =====
  {
    content:
      "Wilma var för full igen på lördagen. Spillde rödvin på Moas vita soffa och skrattade bara åt det. Ella fick köra hem henne. På vägen hem i bilen sa Wilma plötsligt: 'Vet du att jag hånglade med Kasper?' Ella trodde hon skojade. Wilma somnade innan hon kunde svara. På söndagen sa Wilma att hon inte mindes nåt från kvällen.",
    type: "note",
    source: "manual",
    metadata: { close_call: true, drinking: true },
    created_at: daysAgo(65),
    subjectNames: ["Wilma", "Ella", "Kasper", "Moa", "Wilmas gräns"],
  },
  {
    content:
      "Freja tog Wilma åt sidan efter söndagsbrunchen. 'Jag är orolig för dig. Du dricker varje helg, du missar jobb, du verkade inte minnas igår.' Wilma blev defensiv: 'Sluta mamma mig, jag är 27, jag har kul.' Freja: 'Det ser inte ut som kul längre.' Wilma gick. De har inte pratat ordentligt sedan dess.",
    type: "note",
    source: "manual",
    metadata: { confrontation: true, friendship_strain: true },
    created_at: daysAgo(62),
    subjectNames: ["Freja", "Wilma", "Wilmas gräns"],
  },
  {
    content:
      "Wilma missade jobbet på Systembolaget igen på måndagen. Tredje gången denna månad. Chefen sa att nästa gång blir det en skriftlig varning. Wilma berättade det för mig som om det var ett skämt men jag hörde att hon var rädd.",
    type: "note",
    source: "manual",
    metadata: { work_issue: true },
    created_at: daysAgo(35),
    subjectNames: ["Wilma", "Wilmas gräns", "Pengastressen"],
  },
  {
    content:
      "Joel och Noel pratade om Wilma efter reppet. Joel: 'Har du märkt att Wilma alltid är full nu? Inte bara på fester utan typ hela tiden?' Noel: 'Ja. Freja försökte prata med henne men det gick inte bra.' Joel kände sig skyldig: 'Vi borde göra nåt. Vi kan inte bara titta på.' De bestämde sig för att prata med Freja om en gemensam intervention.",
    type: "note",
    source: "manual",
    metadata: { concern: true },
    created_at: daysAgo(25),
    subjectNames: ["Joel", "Noel", "Wilma", "Freja", "Wilmas gräns", "Bandrepetitionerna"],
  },

  // ===== NOEL ÄR KÄR I MOA =====
  {
    content:
      "Noel skrev en låt som uppenbarligen handlar om Moa. Texten börjar: 'Du målar världen i färger jag aldrig sett.' Joel frågade vem den handlade om. Noel sa 'ingen speciell'. Joel köpte det inte men pressade inte. Låten är vacker dock — den bästa Noel skrivit.",
    type: "note",
    source: "manual",
    metadata: { music: true, unrequited_love: true },
    created_at: daysAgo(70),
    subjectNames: ["Noel", "Moa", "Joel", "Dimljus"],
  },
  {
    content:
      "Moa bad Noel om hjälp med texterna till sin vernissage — hon vill ha poesi brevid tavlorna. Noel sa ja direkt (såklart). De har suttit på kaféer och jobbat tillsammans tre gånger nu. Theo verkar inte bry sig, han vet inte ens att de ses. Noel sa till mig: 'Jag vet att det aldrig kan hända. Men de här stunderna räcker.' Det bröt mitt hjärta lite.",
    type: "note",
    source: "manual",
    metadata: { bittersweet: true },
    created_at: daysAgo(40),
    subjectNames: ["Noel", "Moa", "Theo", "Moas vernissage"],
  },

  // ===== ANTON MYSTERIET =====
  {
    content:
      "Anton berättade att han flyttade från Malmö 'för att det inte funkade med mitt ex'. Men han vägrar ge detaljer. När Wilma frågade vad exet hette tittade Anton bort och sa 'det spelar ingen roll'. Wilma sa efteråt: 'Folk som inte vill prata om sina ex döljer nåt. Trust me.'",
    type: "note",
    source: "manual",
    metadata: { mysterious: true },
    created_at: daysAgo(55),
    subjectNames: ["Anton", "Wilma", "Gruppdynamiken"],
  },
  {
    content:
      "Freja och Anton hade en lång promenad längs kanalen igår. De pratade i tre timmar. Anton öppnade sig lite — sa att hans ex 'kontrollerade allting' och att han 'tappade sig själv'. Freja kände igen det från sin egen förra relation. Hon sa att hon kände sig trygg med Anton på ett sätt hon inte känt på länge. Men hon sa inget om sina feelings.",
    type: "note",
    source: "manual",
    metadata: { romantic_tension: true },
    created_at: daysAgo(35),
    subjectNames: ["Freja", "Anton", "Gruppdynamiken"],
  },
  {
    content:
      "Jag (Ella) googlade Anton lite — hittade inget konstigt men hans Instagram är skapad i november, samma månad han flyttade. Inga bilder äldre än 3 månader. Wilma säger att det är en 'red flag' men jag tycker hon överdriver. Freja verkar verkligen gilla honom och hon förtjänar nån bra.",
    type: "note",
    source: "manual",
    metadata: { investigation: true },
    created_at: daysAgo(28),
    subjectNames: ["Anton", "Ella", "Wilma", "Freja"],
  },
  {
    content:
      "Anton berättade hela historien för Freja. Hans ex hette Daniella, de var ihop i 4 år. Hon var psykiskt kontrollerande — kollade hans telefon, bestämde vilka han fick träffa, blev aggressiv om han kom hem sent. Anton till slut lyckades lämna med hjälp av sin syster. Raderade sociala medier för att hon inte skulle kunna spåra honom. Freja grät när han berättade. De kramades länge.",
    type: "note",
    source: "manual",
    metadata: { vulnerability: true, backstory: true },
    created_at: daysAgo(15),
    subjectNames: ["Anton", "Freja"],
  },

  // ===== SOMMARRESAN =====
  {
    content:
      "Freja skickade ut förslaget om Grekland-resan i gruppchaten. Reaktioner: Joel — 'Hell yes!', Moa — 'Om jag har råd', Ella — 'Vilka åker?', Noel — 'Jag är med', Wilma — 'GREKLAND BABY', Kasper — läste meddelandet men svarade inte, Theo — 'Ska kolla schemat', Saga — '🎉🎉', Anton — 'Låter kul!'. Frånvaron av Kaspers svar säger allt.",
    type: "note",
    source: "manual",
    metadata: { group_chat: true, trip_planning: true },
    created_at: daysAgo(45),
    subjectNames: ["Freja", "Joel", "Moa", "Ella", "Noel", "Wilma", "Kasper", "Saga", "Anton", "Theo", "Sommarresan", "Gruppdynamiken"],
  },
  {
    content:
      "Ella sa till mig att hon inte vill åka på resan om Saga åker. 'En vecka i Grekland och se Joel och Saga flörta? Nej tack.' Men hon vill inte heller vara den som ställer ett ultimatum. Freja suckade: 'Kan vi inte bara ha det kul som vi brukade?' Ella: 'Det var innan allt blev komplicerat.'",
    type: "note",
    source: "manual",
    metadata: { trip_drama: true },
    created_at: daysAgo(40),
    subjectNames: ["Ella", "Saga", "Joel", "Freja", "Sommarresan", "Kärlekstriangeln"],
  },
  {
    content:
      "Kasper meddelade att han inte åker på Grekland-resan. Sa att han 'har för mycket att göra med appen'. Alla vet att det är för att Ella åker. Joel försökte övertala honom privat men Kasper sa: 'Jag klarar inte av att se henne ha kul utan mig ännu. Ge mig tid.' Joel respekterade det men var ledsen.",
    type: "note",
    source: "manual",
    metadata: {},
    created_at: daysAgo(35),
    subjectNames: ["Kasper", "Ella", "Joel", "Sommarresan", "Uppbrottet"],
  },
  {
    content:
      "TODO: Boka flygbiljetter till Grekland senast 15 mars. Freja har hittat billiga biljetter Göteborg-Aten för 2 800 kr tur/retur. Bekräftade deltagare: Joel, Noel, Ella, Freja, Anton, Saga. Osäkra: Moa (pengar), Wilma (jobb), Theo (säger att han 'ska kolla'). Kasper åker inte.",
    type: "todo",
    source: "manual",
    metadata: { priority: "medium", deadline: "2026-03-15", budget_pp: 15000 },
    created_at: daysAgo(32),
    subjectNames: ["Freja", "Sommarresan", "Pengastressen"],
  },

  // ===== DIMLJUS / BANDET =====
  {
    content:
      "Erik, Dimljus trummis, meddelade att han slutar i bandet. Flyttar till Berlin med sin tjej. Joel och Noel är förstörda — de har spelat ihop i 3 år. Way Out West-ansökan skickades in förra månaden med Erik som trummis. Nu behöver de hitta ersättare ASAP och spela in en ny demo.",
    type: "note",
    source: "manual",
    metadata: { band_crisis: true },
    created_at: daysAgo(50),
    subjectNames: ["Joel", "Noel", "Dimljus"],
  },
  {
    content:
      "Dimljus har testat tre trummisar. Första: tekniskt bra men spelade för högt. Andra: nice kille men kunde bara spela punk. Tredje: fantastisk men bor i Borås och kan inte komma på varje repp. Joel börjar bli desperat. Deadline för Way Out West-demon är i slutet av mars.",
    type: "note",
    source: "manual",
    metadata: { auditions: true },
    created_at: daysAgo(25),
    subjectNames: ["Joel", "Noel", "Dimljus"],
  },
  {
    content:
      "Plot twist: Anton nämnde att han spelade trummor i ett band i Malmö. Joel fick helt galna ögon. Anton provade på söndagens repp och det lät SJUKT BRA. Noel sa efteråt: 'Det var som att han alltid hade spelat med oss.' Joel vill ha honom i bandet permanent. Anton sa att han behöver tänka på det — 'låt mig inte commita till nåt igen för snabbt.'",
    type: "note",
    source: "manual",
    metadata: { breakthrough: true },
    created_at: daysAgo(12),
    subjectNames: ["Anton", "Joel", "Noel", "Dimljus", "Bandrepetitionerna"],
  },

  // ===== MOAS VERNISSAGE =====
  {
    content:
      "Moa visade mig sina tavlor till utställningen. Temat 'Mellanrum' — det handlar om luckor i relationer, saker man inte säger. En tavla föreställer två personer som sitter bredvid varandra men tittar åt varsitt håll. En annan är ett halvt telefonsamtal. Jag frågade om det var inspirerat av verkligheten. Hon sa: 'Allt är det ju.' Jag tror det handlar om henne och Ella.",
    type: "note",
    source: "manual",
    metadata: { art: true, emotional: true },
    created_at: daysAgo(30),
    subjectNames: ["Moa", "Ella", "Moas vernissage", "Gruppdynamiken"],
  },
  {
    content:
      "Moa och Ella hade en riktig pratstund för första gången på veckor. Moa bad Ella om hjälp med cateringen till vernissagen. Ella sa ja men det var stelt. Moa sa efteråt: 'Det känns som att vi pratar genom en glasvägg. Allt är artigt men ingenting är äkta längre.' Ella har inte berättat om sin crush på Joel för Moa.",
    type: "note",
    source: "manual",
    metadata: { friendship: true, distance: true },
    created_at: daysAgo(22),
    subjectNames: ["Moa", "Ella", "Moas vernissage", "Kärlekstriangeln", "Gruppdynamiken"],
  },
  {
    content:
      "TODO: Hjälpa Moa med vernissage-cateringen den 12 april. Ella bakar, Freja fixar dryck. Noel levererar texterna senast 5 april. Gästlista: ~60 personer. Moa vill att alla i gänget kommer — inklusive Kasper. Det blir första gången alla är i samma rum sedan november.",
    type: "todo",
    source: "manual",
    metadata: { priority: "medium", date: "2026-04-12" },
    created_at: daysAgo(18),
    subjectNames: ["Moa", "Ella", "Freja", "Noel", "Kasper", "Moas vernissage"],
  },

  // ===== KASPERS APP =====
  {
    content:
      "Kasper visade mig Blindspot-appen. Den är faktiskt riktigt snygg. Konceptet: du svarar på personlighetsfrågor och matchas baserat på kompatibilitet. Inga bilder förrän efter 3 konversationer. Han sa: 'Jag vill att folk ska bli kära i personen, inte i utseendet.' Jag tänkte att det var ganska uppenbart att han pratar om Ella.",
    type: "note",
    source: "manual",
    metadata: { app_demo: true },
    created_at: daysAgo(45),
    subjectNames: ["Kasper", "Ella", "Kaspers app"],
  },
  {
    content:
      "Kasper frågade Theo om att betatesta Blindspot. Theo sa ja men har inte ens laddat ner den. Kasper frågade Joel också — Joel sa: 'Jag dejtingappar inte, men jag ska ge feedback på UX:en.' Kasper har lagt ner typ 200 timmar på appen vid det här laget. Jag tror det är hans sätt att hantera uppbrottet — att koda istället för att känna.",
    type: "note",
    source: "manual",
    metadata: { coping_mechanism: true },
    created_at: daysAgo(30),
    subjectNames: ["Kasper", "Theo", "Joel", "Kaspers app", "Uppbrottet"],
  },

  // ===== ELLAS KAFÉDRÖM =====
  {
    content:
      "Ella hittade en lokal på Tredje Långgatan som skulle vara perfekt för kaféet! 55 kvm, bra läge, men hyran är 18 000/mån. Hon har sparat 120 000 kr men behöver minst 400 000 för att komma igång (utrustning, renovering, första månadernas hyra). Funderar på att fråga sin mamma om resten.",
    type: "note",
    source: "manual",
    metadata: { dream: true, budget: true },
    created_at: daysAgo(38),
    subjectNames: ["Ella", "Ellas kafédröm", "Pengastressen"],
  },
  {
    content:
      "Joel erbjöd sig att spela akustiskt på Ellas kafé om hon öppnar det. 'Varje torsdag, gratis, för evigt.' Ella blev rörd till tårar. Moa sa att hon vill göra konsten till väggarna. Freja sa att hon kan hjälpa med bokföringen. Det var en av de där stunderna där gruppen kändes som förr — alla vill hjälpa Ella nå sin dröm.",
    type: "note",
    source: "manual",
    metadata: { heartwarming: true, group_support: true },
    created_at: daysAgo(20),
    subjectNames: ["Ella", "Joel", "Moa", "Freja", "Ellas kafédröm", "Gruppdynamiken"],
  },

  // ===== RECENT EVENTS / LOOSE THREADS =====
  {
    content:
      "Fredagsmiddagen hos Joel. Alla utom Kasper kom — till och med Saga och Anton. Det var faktiskt mysigt. Theo och Anton lagade thaimat. Joel spelade lite gitarr. Ella och Saga pratade normalt (ytligt men utan spänning). Freja och Anton satt bredvid varandra hela kvällen. Wilma drack bara öl istället för shots — ett framsteg. Moa sa: 'Det här var nice. Vi borde göra det oftare.'",
    type: "note",
    source: "manual",
    metadata: { positive: true, progress: true },
    created_at: daysAgo(10),
    subjectNames: ["Joel", "Ella", "Saga", "Anton", "Freja", "Wilma", "Moa", "Theo", "Fredagsmiddagarna", "Gruppdynamiken"],
  },
  {
    content:
      "Joel sa en konstig sak till Noel igår: 'Vet du, jag tror inte jag gillar Saga på det sättet egentligen. Hon är cool men det saknas nåt.' Noel frågade vad han menade. Joel: 'Jag vet inte. Det känns inte som med...' och sen tystnade han. Noel tror han tänkte säga 'som med Ella' men fångade sig. KAN DET VARA SÅ att Joel har feelings för Ella också?!",
    type: "note",
    source: "manual",
    metadata: { plot_twist: true, maybe_mutual: true },
    created_at: daysAgo(5),
    subjectNames: ["Joel", "Noel", "Saga", "Ella", "Kärlekstriangeln"],
  },
  {
    content:
      "Kasper ringde mig (Freja) och sa att han mår bättre. Terapin hjälper. Han sa: 'Jag tror jag börjar acceptera att det är över med Ella. Men jag vill inte tappa gruppen.' Han frågade om vernissagen — 'Tror du det vore okej om jag kom?' Jag sa absolut. Han lät lättad. Kanske det börjar läka nu.",
    type: "note",
    source: "manual",
    metadata: { healing: true, progress: true },
    created_at: daysAgo(3),
    subjectNames: ["Kasper", "Freja", "Ella", "Moas vernissage", "Uppbrottet"],
  },
  {
    content:
      "Sammanfattning av läget just nu: Ella gillar Joel men tror han gillar Saga. Joel kanske gillar Ella men vet det inte själv. Saga gillar Joel. Kasper börjar komma över Ella. Noel gillar Moa som är med Theo som spelar bort deras pengar. Freja gillar Anton som nyss öppnat upp sig. Wilma kämpar med alkoholen och bär på hemligheten om Kasper. Moas vernissage om 6 veckor kan bli antingen det som enar gruppen eller det som spränger den.",
    type: "note",
    source: "manual",
    metadata: { status_update: true, overview: true },
    created_at: daysAgo(1),
    subjectNames: ["Ella", "Joel", "Saga", "Kasper", "Noel", "Moa", "Theo", "Freja", "Anton", "Wilma", "Kärlekstriangeln", "Theos hemlighet", "Wilmas gräns", "Moas vernissage", "Gruppdynamiken"],
  },
];

async function seed() {
  console.log("Clearing existing data...");
  await query("DELETE FROM chunk_subjects");
  await query("DELETE FROM chunks");
  await query("DELETE FROM subjects");

  console.log("Generating subject embeddings...");
  const summaryTexts = subjects.map((s) => `${s.name}: ${s.summary}`);
  const summaryEmbeddings = await embedBatch(summaryTexts);

  console.log("Inserting subjects...");
  const subjectIdMap: Record<string, string> = {};

  for (let i = 0; i < subjects.length; i++) {
    const s = subjects[i];
    const vec = `[${summaryEmbeddings[i].join(",")}]`;
    const rows = await query(
      `INSERT INTO subjects (name, type, summary, summary_embedding, last_consolidated_at, created_at)
       VALUES ($1, $2, $3, $4::vector, now(), now())
       RETURNING id`,
      [s.name, s.type, s.summary, vec]
    );
    subjectIdMap[s.name] = rows[0].id;
    console.log(`  + Subject: ${s.name} (${rows[0].id})`);
  }

  console.log("Generating chunk embeddings...");
  const chunkTexts = chunks.map((c) => c.content);
  const chunkEmbeddings = await embedBatch(chunkTexts);

  console.log("Inserting chunks...");
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const vec = `[${chunkEmbeddings[i].join(",")}]`;
    const rows = await query(
      `INSERT INTO chunks (content, type, source, embedding, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4::vector, $5, $6, $6)
       RETURNING id`,
      [c.content, c.type, c.source, vec, JSON.stringify(c.metadata), c.created_at]
    );
    const chunkId = rows[0].id;

    for (const name of c.subjectNames) {
      const subjectId = subjectIdMap[name];
      if (subjectId) {
        await query(
          `INSERT INTO chunk_subjects (chunk_id, subject_id) VALUES ($1, $2)`,
          [chunkId, subjectId]
        );
      }
    }
    console.log(`  + Chunk ${i + 1}/${chunks.length}: ${c.type} (${c.subjectNames.join(", ")})`);
  }

  console.log("\nSeed complete!");
  console.log(`  Subjects: ${subjects.length}`);
  console.log(`  Chunks: ${chunks.length}`);

  await end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
