# Budget Tracker prototipas

Tai II užduoties veikiantis prototipas. Įgyvendintas pagrindinis scenarijus: klientas sukuria pasikartojančios pajamų arba išlaidų operacijos taisyklę, o sistema iki pasirinktos datos sugeneruoja faktines operacijas, apskaičiuoja kitą vykdymo datą ir nekuria dublikatų.

Duomenys prototipe laikomi atmintyje ir grąžinami į pradinę būseną perkrovus backend. Prisijungimas, rolės, MongoDB ir diegimas nėra II užduoties dalis.

## Reikalingi įrankiai

- Node.js 22 arba naujesnė LTS versija (kurta ir patikrinta su Node.js 24.13.0).
- npm 10 arba naujesnė versija (patikrinta su npm 11.6.2).
- Moderni naršyklė.

API raktų, `.env` failo ar kitų konfigūracijos parametrų nereikia. Express API ir sukompiliuotas frontend pateikiami adresu `http://localhost:3000`.

## Paruošimas ir paleidimas

Pirmą kartą projekto šakniniame kataloge įdiekite backend ir frontend priklausomybes:

```bash
npm run setup
```

Po pradinio paruošimo visą prototipą paleidžia viena komanda:

```bash
npm run dev
```

Atidarykite naršyklėje `http://localhost:3000`. Sustabdykite serverį su `Ctrl+C`.

## Pavyzdiniai klientai ir duomenys

Prototipe iš anksto paruošti du klientai:

- `Klientas A` (`000000000000000000000001`) turi 45,00 Eur maisto išlaidą.
- `Klientas B` (`000000000000000000000002`) turi 25,00 Eur transporto išlaidą.

Visos klientui priklausančios API užklausos naudoja `x-client-id` antraštę. Backend tikrina klientą ir kiekvieną taisyklių bei operacijų paiešką riboja šiuo identifikatoriumi. Frontend antraštę nustato pagal pasirinktą klientą.

## Demonstravimo žingsniai

1. Paleiskite projektą ir pasirinkite `Klientas A`.
2. Sukurkite mėnesinę taisyklę, kurios pradžios data yra `2026-10-31`.
3. Generavimo datą nustatykite į `2026-11-30` ir spauskite **Generuoti**. Operacijų sąraše atsiras įrašai `2026-10-31` ir `2026-11-30`; taisyklės kita data bus `2026-12-31`.
4. Dar kartą spauskite **Generuoti**. Naujų operacijų nebus, nes jau apdorotos datos nekartojamos.
5. Pasirinkite `Klientas B`. Kliento A taisyklė ir sugeneruotos operacijos nebus matomos. Sukurkite atskirą taisyklę ir parodykite, kad ji lieka tik kliento B kontekste.
6. Klaidos atvejui nurodykite pabaigos datą, ankstesnę už pradžios datą. Sistema parodys konkretų validacijos pranešimą ir taisyklės neišsaugos.

## Testai ir patikros

Backend testai:

```bash
npm test
```

Visa automatinė patikra (backend testai, frontend lint ir production build):

```bash
npm run check
```

Testų rinkinys tikrina įprastą generavimą, 31 dienos perkėlimą į paskutinę trumpesnio mėnesio dieną, taisyklės pabaigos ribą, netinkamą įvestį, dublikatų prevenciją, API scenarijų ir klientų duomenų izoliavimą.

## API santrauka

- `GET /api/clients` - paruošti klientai.
- `GET /api/transactions` - aktyvaus kliento operacijos.
- `POST /api/transactions` - rankinė operacija.
- `PATCH /api/transactions/:transactionId` - aktyvaus kliento operacijos pakeitimas.
- `GET /api/recurring-rules` - aktyvaus kliento taisyklės.
- `POST /api/recurring-rules` - nauja taisyklė.
- `POST /api/recurring-rules/generate` - atėjusių operacijų generavimas iki `throughDate`.

Visiems endpoint'ams, išskyrus `/api/clients` ir `/api/health`, būtina `x-client-id` antraštė.
