import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";

const root = process.cwd();
const read = (...parts) => readFileSync(join(root, ...parts), "utf8");

test("le macro destinazioni mantengono route reali e gli hub desktop sono cliccabili", () => {
  const header = read("src", "app", "components", "Header.tsx");
  assert.match(header, /href: "\/", label: "Home"/);
  assert.match(header, /href: "\/coppe", label: "Coppa Fanta a 20"/);
  for (const route of ["/campionati-live-preview", "/coppe", "/societa"]) assert.match(header, new RegExp(route.replaceAll("/", "\\/")));
  for (const [label, hub] of [["Gioca", "/giochi"], ["Record", "/record"], ["Regolamento", "/regole"]]) {
    assert.match(header, new RegExp(`label: "${label}"[\\s\\S]*hub: "${hub.replaceAll("/", "\\/")}"`));
  }
  assert.match(header, /<Link href=\{menu\.hub\}[\s\S]*\{menu\.label\}<\/Link>/);
  assert.match(header, /desktop-\$\{key\}-menu/);
});

test("avatar apre direttamente il profilo e non esiste il menu account", () => {
  const header = read("src", "app", "components", "Header.tsx");
  assert.match(header, /const profileHref = account\?\.username \? `\/user\/\$\{encodeURIComponent\(account\.username\)\}` : "\/account"/);
  assert.match(header, /<Link href=\{profileHref\} aria-label="Apri il profilo"[\s\S]*<ProfileAvatar/);
  assert.doesNotMatch(header, /account-menu|Apri menu account|Centro Admin/);
  assert.equal((header.match(/<form action=\{logoutAction\}/g) ?? []).length, 2);
  assert.match(header, /className="hidden lg:block"/);
  assert.match(header, /mt-auto border-t border-slate-200 pt-4/);
  assert.match(header, /: <Link href="\/account\/accedi"/);
});

test("Coppe usa il catalogo reale e separa il prototipo competitivo locale", () => {
  const server = read("src", "app", "coppe", "MobileCoppeHub.tsx");
  const client = read("src", "app", "coppe", "CoppaFantaPrototype.tsx");
  assert.match(server, /getActiveSocietaCatalog/); assert.match(server, /catalog\.slice\(0, 100\)/);
  assert.match(client, />La Coppa<\/span>[\s\S]*>Fanta a 20<\/span>/); assert.match(client, /Dati demo · nessuna scrittura Supabase/);
  assert.doesNotMatch(client, /Dati competitivi simulati/);
  assert.match(client, /Cerca squadra\.\.\./); assert.match(client, /Espandi classifica/);
});

test("Gioca e un hub responsive con due card cliccabili e asset approvati", () => {
  const source = read("src", "app", "giochi", "page.tsx");
  assert.match(source, /PageHeader eyebrow="Mettiti alla prova" title="I Giochi"/);
  assert.match(source, /grid grid-cols-2/);
  assert.match(source, /sm:min-h-\[30rem\][\s\S]*lg:min-h-\[36rem\]/);
  for (const value of ["/fantabet", "/gioca", "/images/gioca/fantabet.png", "/images/gioca/arcade.png", "Pronostica e sfida gli altri", "Divertiti e scala le classifiche"]) assert.ok(source.includes(value));
  assert.doesNotMatch(source, /NavigationHub|hidden lg:block|lg:hidden/);
});

test("Record riusa card Ranking Hall e l'esposizione Emblemi Home", () => {
  const page = read("src", "app", "record", "page.tsx");
  const cards = read("src", "app", "components", "RecordPathCards.tsx");
  const emblems = read("src", "app", "components", "HomeEmblemShowcase.tsx");
  const home = read("src", "app", "page.tsx");
  assert.match(page, /PageHeader eyebrow="Storia e prestigio" title="I Record"/);
  assert.match(page, /<RecordPathCards \/>/); assert.match(page, /<HomeEmblemShowcase emblems=\{emblems\}/);
  assert.match(cards, /\/statistiche#ranking/); assert.match(cards, /\/statistiche#hall-of-fame/); assert.match(cards, /vetrina-trofei/); assert.match(cards, />2<\/div>[\s\S]*>1<\/div>[\s\S]*>3<\/div>/);
  assert.match(emblems, /home-emblem-marquee/); assert.match(home, /<HomeEmblemShowcase emblems=\{emblemiVetrina\} \/>/);
});

test("Regolamento riusa le card Competizioni e separa gli anchor descrittivi", () => {
  const page = read("src", "app", "regole", "page.tsx");
  const cards = read("src", "app", "components", "CompetitionPathCards.tsx");
  const competitions = read("src", "app", "competizioni", "page.tsx");
  assert.match(page, /PageHeader eyebrow="Come funziona" title="Il Regolamento"/);
  for (const anchor of ["#campionati", "#coppe", "#scatto-promozione"]) assert.ok(cards.includes(anchor));
  for (const id of ["campionati", "coppe", "scatto-promozione"]) assert.match(competitions, new RegExp(`id="${id}"`));
  for (const asset of ["/competizioni/serie-a-b-c.png", "/competizioni/champions-europa-conference.png", "/scatto-promozione/background.png"]) assert.ok(cards.includes(asset));
  assert.match(page, /href: "\/regolamento"/);
  assert.match(page, /eyebrow: "Le regole ufficiali"[\s\S]*image: "\/images\/regolamento\/regolamento\.png"/);
  assert.doesNotMatch(page, /Le regole ufficiali del Fanta a 20/);
});

test("Statistiche inizia dal Ranking e gli anchor includono i titoli definitivi", () => {
  const statistics = read("src", "app", "statistiche", "page.tsx");
  const hall = read("src", "app", "hall-of-fame", "page.tsx");
  assert.doesNotMatch(statistics, /Numeri e storia|Le Statistiche|RecordPathCards|Esplora la sezione/);
  assert.match(statistics, /<section id="ranking" className="scroll-mt-28">[\s\S]*La gerarchia delle societ\\u00e0[\s\S]*Il Ranking Storico[\s\S]*<RankingSmart/);
  assert.match(statistics, /<section id="hall-of-fame" className="scroll-mt-28[\s\S]*I vincitori del passato[\s\S]*L&apos;Hall of Fame/);
  assert.match(hall, /id=\{embedded \? undefined : "hall-of-fame"\}/);
  assert.match(statistics, /<AnchorScroll \/>/);
});

test("Competizioni inizia dalle sezioni descrittive senza hub duplicato", () => {
  const source = read("src", "app", "competizioni", "page.tsx");
  assert.doesNotMatch(source, /La struttura di campionati e coppe|CompetitionPathCards|<PageHeader/);
  assert.match(source, /id="campionati"[\s\S]*La piramide sportiva[\s\S]*I Campionati/);
  assert.match(source, /id="coppe"[\s\S]*Il palcoscenico dei trofei[\s\S]*Le Coppe/);
  assert.match(source, /id="scatto-promozione"[\s\S]*La corsa finale[\s\S]*<span className="block leading-\[1\.08\] sm:inline sm:leading-none">Lo Scatto<\/span><span className="mt-1 block leading-\[1\.08\] sm:ml-2 sm:mt-0 sm:inline sm:leading-none">Promozione<\/span>/);
  assert.match(source, /<AnchorScroll \/>/);
});

test("titoli definitivi e ordine delle card Gioca sono applicati senza logica nuova", () => {
  const championships = read("src", "app", "campionati-live-preview", "live-client.tsx");
  const fantabet = read("src", "app", "fantabet", "FantaBetClient.tsx");
  const games = read("src", "app", "giochi", "page.tsx");
  const emblems = read("src", "app", "emblemi", "page.tsx");
  const rules = read("src", "app", "regolamento", "page.tsx");
  assert.match(championships, /PageHeader eyebrow="Risultati e classifiche" title="I Campionati"/);
  assert.match(fantabet, /section-eyebrow">Pronostica e sfida gli altri<[\s\S]*>Il FantaBet</);
  assert.match(games, /<h2[\s\S]*\{game\.title\}<\/h2>[\s\S]*<Image[\s\S]*\{game\.eyebrow\}<\/p>/);
  assert.match(emblems, /I simboli pi\\u00f9 prestigiosi[\s\S]*Gli Emblemi/);
  assert.match(rules, /eyebrow="Le regole ufficiali"[\s\S]*title="Il Regolamento"/);
});

test("header conserva struttura classi e comportamento anonimo preesistenti", () => {
  const header = read("src", "app", "components", "Header.tsx");
  assert.match(header, /mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6/);
  assert.match(header, /hidden items-center gap-1 text-sm font-bold text-slate-600 lg:flex/);
  assert.match(header, /rounded-full px-4 py-2 text-sm font-bold text-slate-600 transition/);
  assert.match(header, /href="\/account\/accedi"[\s\S]*>Accedi<\/Link>/);
  assert.doesNotMatch(header, /Accesso Admin|service_role|user\.email/i);
});

test("scroll hash attende il DOM rispetta reduced motion e mantiene offset sticky", () => {
  const scroll = read("src", "app", "components", "AnchorScroll.tsx");
  const statistics = read("src", "app", "statistiche", "page.tsx");
  const competitions = read("src", "app", "competizioni", "page.tsx");
  assert.match(scroll, /window\.location\.hash[\s\S]*document\.getElementById/);
  assert.match(scroll, /requestAnimationFrame[\s\S]*setTimeout/);
  assert.match(scroll, /\[100, 300, 700\][\s\S]*document\.fonts\?\.ready/);
  assert.match(scroll, /prefers-reduced-motion[\s\S]*scrollIntoView/);
  for (const id of ["ranking", "hall-of-fame"]) assert.match(statistics, new RegExp(`id="${id}" className="scroll-mt-28`));
  for (const id of ["campionati", "coppe", "scatto-promozione"]) assert.match(competitions, new RegExp(`id="${id}" className="scroll-mt-28`));
});

test("gli anchor aggregati sono unici e il drawer non ripristina lo scroll dopo la navigazione", () => {
  const header = read("src", "app", "components", "Header.tsx");
  const championships = read("src", "app", "campionati", "page.tsx");
  const cups = read("src", "app", "coppe", "page.tsx");
  const promotion = read("src", "app", "scatto-promozione", "page.tsx");
  for (const [source, id] of [[championships, "campionati"], [cups, "coppe"], [promotion, "scatto-promozione"]]) {
    assert.match(source, new RegExp(`id=\\{embedded \\? undefined : "${id}"\\}`));
  }
  assert.match(header, /skipMobileScrollRestore\.current = true; setMobileOpen\(false\)/);
  assert.match(header, /if \(!skipMobileScrollRestore\.current\) window\.scrollTo\(0, currentScroll\)/);
  assert.match(header, /onClick=\{closeMobileMenuForNavigation\}/);
});

test("titoloni hub usano ONDER e gli hero compatti eliminano spazio duplicato", () => {
  for (const path of ["giochi", "record", "regole"]) {
    const page = read("src", "app", path, "page.tsx");
    assert.match(page, /<PageHeader[\s\S]*onderTitle compact/);
  }
  const pageHeader = read("src", "app", "components", "PageHeader.tsx");
  assert.match(pageHeader, /compact \? "mb-5 pb-4 sm:mb-8 sm:pb-6 lg:mb-10 lg:pb-8"/);
});
