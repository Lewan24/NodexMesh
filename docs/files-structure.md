PROJEKT: NodexMesh

Aplikacja SPA do organizowania notatek, dokumentów, zadań, diagramów,
obrazów i rysunków na interaktywnej tablicy. Obsługuje projekty, ramki,
zagnieżdżone kolumny, połączenia, komentarze, tagi, wyszukiwanie i undo.

STACK
React 19, TypeScript, Vite 8, Tailwind CSS 4.
Tiptap — dokumenty; React Flow — diagramy; highlight.js — kod.
Alias @/ wskazuje src/. Architektura podzielona według funkcji.

AKTUALNY STAN

- Frontend ma wspólne interfejsy usług oraz adaptery mock i HTTP.
- src/app/services.ts wybiera źródło przez VITE_DATA_SOURCE=mock|http.
- Domyślny mock zapisuje projekty w localStorage; konta i sesja są w pamięci.
- HTTP oczekuje /api/v1 pod tym samym originem.
- Backend nie jest zaimplementowany. Plan: ASP.NET Core/.NET 10,
  EF Core i PostgreSQL, sesja cookie HttpOnly oraz CSRF.
- UI obsługuje jedną tablicę na projekt. Preferencje wyglądu są lokalne.

STRUKTURA

src/
├── main.tsx
│ Uruchomienie React, AuthProvider, ThemeProvider i globalnych stylów.
│
├── app/
│ ├── App.tsx — wybór ekranu logowania lub tablicy użytkownika.
│ ├── services.ts — składanie usług i przełączanie mock/HTTP.
│ ├── providers/ThemeProvider.tsx — motyw i osobiste ustawienia wyglądu.
│ └── styles/ — style globalne i dostosowanie do urządzeń mobilnych.
│
├── entities/ — modele danych i ich reguły.
│ ├── board/
│ │ ├── types.ts — BoardItem: unia typów bloków używana przez UI.
│ │ ├── records.ts — rekordy zapisu, snapshoty, mutacje, rewizje,
│ │ │ relacje, komentarze i tagi.
│ │ ├── itemSchema.ts — schematy i walidacja 18 typów itemów.
│ │ ├── boardValidation.ts — spójność tablicy i powiązań.
│ │ ├── normalizeNumbers.ts — normalizacja wartości liczbowych.
│ │ └── toolTypes.ts — typy narzędzi.
│ ├── project/
│ │ ├── types.ts — modele projektu dla UI i zapisu.
│ │ └── projectFactory.ts, projectSeeder.ts, demoProjects.ts,
│ │ constants.ts — tworzenie projektów i dane demonstracyjne.
│ └── user/
│ ├── types.ts — publiczny model użytkownika i role.
│ └── mockUsers.ts — użytkownicy demonstracyjni.
│
├── features/
│ ├── auth/
│ │ ├── context/AuthContext.tsx — stan sesji i operacje na kontach.
│ │ ├── services/authService.ts — kontrakt i logowanie mock.
│ │ ├── services/httpAuthService.ts — logowanie przez HTTP.
│ │ ├── pages/ — ekran logowania i panel administratora.
│ │ └── components/, hooks/, utils/ — formularze i walidacja.
│ │
│ ├── board/
│ │ ├── pages/BoardPage.tsx — łączy projekty, canvas, menu i narzędzia.
│ │ └── hooks/useBoardView.ts — narzędzie, zaznaczenie, pan i zoom.
│ │
│ ├── projects/
│ │ ├── hooks/useProjects.ts — projekty, aktywny projekt, kosz,
│ │ │ reset demo i połączenie z kontrolerem.
│ │ ├── hooks/useProjectItems.ts — dodawanie, edycja, usuwanie,
│ │ │ warstwy i normalizacja itemów.
│ │ ├── services/
│ │ │ ├── contracts.ts — interfejsy repozytoriów projektu/tablicy.
│ │ │ ├── workspaceController.ts — stan, kolejka zapisu,
│ │ │ │ debounce, retry i konflikty.
│ │ │ ├── boardAdapter.ts — model UI ↔ rekordy, spłaszczanie
│ │ │ │ kolumn, różnice zmian i mapowanie ID.
│ │ │ ├── mockWorkspace.ts — repozytorium oparte na localStorage.
│ │ │ ├── httpWorkspace.ts — repozytorium wywołujące API.
│ │ │ └── responseValidation.ts — walidacja odpowiedzi.
│ │ └── components/SaveStatus.tsx — status zapisu, błędy,
│ │ konflikty i odzyskiwanie szkicu.
│ │
│ ├── canvas/
│ │ ├── components/
│ │ │ ├── Canvas.tsx — główna powierzchnia i koordynacja interakcji.
│ │ │ ├── CanvasItem.tsx — osadzenie pojedynczego bloku na tablicy.
│ │ │ └── pozostałe — ramki, uchwyty, menu kontekstowe, paski,
│ │ │ podglądy przeciągania i nakładki.
│ │ ├── hooks/ — mysz, dotyk, klawiatura, zoom, drag, resize,
│ │ │ zaznaczanie, schowek, historia, ramki i transfery.
│ │ ├── utils/ — geometria itemów/linii/ramek, siatka, wyrównanie,
│ │ │ automatyczny wzrost, tworzenie, klonowanie i style.
│ │ └── types.ts, constants.ts — wspólne typy i stałe canvasu.
│ │
│ ├── blocks/
│ │ ├── BlockRenderer.tsx — wybiera komponent według BoardItem.type.
│ │ ├── types.ts — wspólne kontrakty komponentów bloków.
│ │ ├── note/, text/, section-title/ — notatki, tekst i nagłówki.
│ │ ├── image/, link/, embed/ — obrazy, linki, strony i wideo.
│ │ ├── checklist/, kanban/, timeline/ — zadania i harmonogramy.
│ │ ├── column/, frame/ — zagnieżdżanie i grupowanie itemów.
│ │ ├── line/ — linie, strzałki i geometria ich renderowania.
│ │ ├── dispenser/ — dozownik nowych notatek.
│ │ ├── document/ — edytor dokumentów Tiptap.
│ │ ├── code/ — blok kodu z podświetlaniem składni.
│ │ ├── diagram/ — diagramy węzłów i połączeń.
│ │ ├── database/ — wizualny edytor schematów baz; bez połączenia z DB.
│ │ ├── drawing/ — rysowanie odręczne i operacje na kreskach.
│ │ ├── editbar/ — sterowanie wyglądem i właściwościami bloków.
│ │ └── shared/, typography/ — wspólne UI, style i typografia.
│ │
│ ├── appearance/ — palety, gradienty, fonty i ustawienia wyglądu.
│ ├── comments/ — dialog, statusy i operacje na komentarzach.
│ ├── tags/utils/tagUtils.ts — operacje na tagach.
│ ├── search/utils/itemSearch.ts — wyszukiwanie w treści bloków.
│ └── inspector/ItemInspector.tsx — panel tagów i komentarzy itemów.
│
├── layout/
│ ├── appbar/ — górny pasek, menu projektów i konta.
│ └── sidebar/ — boczny pasek i katalog narzędzi.
│
└── shared/
├── api/
│ ├── httpClient.ts — transport HTTP, timeout, CSRF i błędy.
│ ├── errors.ts — wspólny model błędów.
│ ├── pendingChanges.ts — ochrona niezapisanych zmian przy wylogowaniu.
│ └── canonicalJson.ts — stabilne porównywanie danych JSON.
└── components/dialogs/ — Modal, ConfirmDialog i MobilePanel.

DOKUMENTACJA

- README.md — funkcje, uruchomienie i ogólna architektura;
  część opisów API jest już nieaktualna.
- docs/api-integration-pl.md — aktualne przygotowanie frontendu do API,
  kontrakt HTTP, model zapisu i ograniczenia; główny dokument integracji.
- docs/api-database-readiness-pl.md — wcześniejszy audyt i plan bazy,
  migracji oraz backendu; opisy starego kodu nie są stanem aktualnym.
- docs/block-history-audit.md — zasady i zakres historii undo.

TESTY I KONFIGURACJA

- tests/blocks.test.mjs — logika bloków, geometria, historia i wygląd.
- tests/canvas-touch.test.mjs — interakcje dotykowe.
- tests/api-readiness.test.mjs — modele, adaptery, zapis, konflikty,
  idempotencja, walidacja i transport.
- package.json / package-lock.json — zależności i komendy npm.
- vite.config.ts / tsconfig.json — konfiguracja Vite i TypeScript.
- index.html — dokument startowy SPA.
- .env.example — wybór mock/HTTP.
- AGENTS.md, .prettierrc.json, .editorconfig — zasady pracy i formatowania.
- Assets/Preview.png — grafika podglądu.
- dist/, node_modules/, tsconfig.tsbuildinfo — pliki generowane.

WAŻNE ZALEŻNOŚCI
UI → hooki → WorkspaceController → repozytorium mock/HTTP.
CanvasItem → BlockRenderer → komponent konkretnego bloku.
BoardItem to model UI; records.ts opisuje osobny format trwałego zapisu.
boardAdapter.ts łączy te modele i wylicza mutacje.

Zapis grupuje zmiany po 500 ms i wysyła zmienione itemy/usunięcia.
Rewizje wykrywają konflikty, clientMutationId umożliwia idempotentny retry.
Historia tablicy jest lokalna; odtworzony stan zapisuje się przez różnice.
Pan, zoom i zaznaczenie są stanem UI, nie historią danych.

ZASADY ZMIAN
Logikę interakcji umieszczaj w canvas/, logikę konkretnego bloku w blocks/,
a zapis w services/. Canvas nie powinien bezpośrednio wywoływać API.
Nowy typ bloku wymaga sprawdzenia modelu, schematu, renderera,
tworzenia itemów oraz katalogu narzędzi.

Format: 2 spacje, pojedyncze cudzysłowy, średniki, LF, szerokość 120.
Po edycji: npm run format; przed zakończeniem: npm run format:check.
Przy zmianach kodu: npm test oraz npm run build.
npm run lint istnieje, ale repozytorium nie ma konfiguracji ESLint.
