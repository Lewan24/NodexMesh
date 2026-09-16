# Przygotowanie frontendu do API .NET 10

Stan: 13.09.2026. Ten dokument opisuje wdrożone przygotowanie frontendu. Analiza wyjściowa znajduje się w [api-database-readiness-pl.md](api-database-readiness-pl.md). Backend, PostgreSQL, magazyn plików i zabezpieczenia serwerowe nie są jeszcze zaimplementowane.

## Uruchomienie i przełączenie źródła

Domyślnie aplikacja korzysta z `VITE_DATA_SOURCE=mock`. Skopiuj `.env.example` do `.env.local`. Po implementacji poniższego kontraktu ustaw `VITE_DATA_SOURCE=http` i uruchom ponownie Vite / wykonaj nowy build. Nieprawidłowa wartość powoduje błąd konfiguracji; tryb HTTP nigdy nie przechodzi automatycznie na mock.

Punkt składania zależności: [src/app/services.ts](../src/app/services.ts). Kontrakty: `AuthService`, `ProjectRepository`, `BoardRepository`. Adaptery mock i HTTP realizują te same interfejsy. Komponenty canvasu nie importują klienta HTTP ani localStorage projektów.

HTTP używa `/api/v1` pod originem SPA. Development wymaga proxy `/api` albo serwowania frontendu i backendu pod wspólnym originem. Nie skonfigurowano fikcyjnego portu backendu. Hosting musi obsługiwać HTTPS i fallback SPA. Zmienne `VITE_*` są publiczne.

Mock przechowuje znormalizowane rekordy w `nodexmesh_api_mock_v1_<userId>`. Dawny klucz `nodexmesh_projects_<userId>` nie jest odczytywany ani migrowany. Zgodnie z decyzją właściciela projektu stary stan można porzucić. Dane demonstracyjne otrzymują nowe UUID wraz z przepisanymi referencjami. `Reset demo` tworzy nowy zestaw, a poprzedni usuwa poprzez repozytorium. Uszkodzony lub nieobsługiwany nowy format powoduje błąd, nigdy cichy reset.

Konta mock: `admin / admin123`, `demo / demo123`. Hasła mock istnieją wyłącznie w kodzie demonstracyjnym i pamięci serwisu. Sesja oraz nowo dodane konta mock nie przetrwają odświeżenia; projekty przetrwają. Publiczny `User` nie ma hasła. Usunięto poprzedni moduł zapisu kont i identyfikatora sesji w localStorage. Istniejące stare klucze kont nie są już używane. Mock nie jest mechanizmem ochrony danych przed użytkownikiem przeglądarki.

## Model danych

| Model                    | Odpowiedzialność                                                               |
| ------------------------ | ------------------------------------------------------------------------------ |
| `ProjectRecord`          | UUID, właściciel, nazwa, kolor, kosz, rewizja, audyt                           |
| `BoardRecord`            | UUID, `projectId`, nazwa, kolejność, rewizja, audyt                            |
| `ItemRecord`             | UUID, `boardId`, typ i wersja, geometria, `appearance`, typowane `data`, audyt |
| `ItemLink`               | `line_start`, `line_end`, `created_from`; bez kopii referencji w `data`        |
| `CommentRecord`          | Osobny rekord z itemem, autorem, datami, statusem, rewizją i koszem            |
| `TagRecord` / `itemTags` | Tagi normalizowane przez NFKC i małe litery; powiązania z itemami              |
| `Project` / `BoardItem`  | Model widoku canvasu składany przez adapter; nie jest DTO zapisu               |

Definicje: [records.ts](../src/entities/board/records.ts), [project/types.ts](../src/entities/project/types.ts). Adapter: [boardAdapter.ts](../src/features/projects/services/boardAdapter.ts).

Kolumny zapisują tylko własne ustawienia. Dzieci są niezależnymi rekordami z `parentItemId` i `sortOrder`; ich obecne `x/y` są zachowywane, bez zmiany układu współrzędnych. `frameId` jest osobną relacją nullable. Wyjęcie dziecka z kolumny zachowuje jego ID. Nowe ID projektów, itemów, komentarzy i dzieci checklist/kanbanów są UUID. Diagramy i schematy bazy zachowują lokalne wewnętrzne referencje.

Rewizje są dodatnimi dziesiętnymi **stringami** w JSON, mapowanymi do C# `long` i PostgreSQL `bigint`. Dzięki temu wartości większe niż `Number.MAX_SAFE_INTEGER` nie tracą precyzji. Daty audytu są ISO 8601 UTC, daty timeline mają format `YYYY-MM-DD`. `schemaVersion` nie jest rewizją rekordu.

`ItemWrite` nie zawiera audytu. Autor i czas komentarza są nadawane przez serwis, nie przez canvas. W mock nowe komentarze otrzymują czas zapisu; nie jest to importer historii starych komentarzy. `data` jest unią zależną od typu; zawartość kolumn, tagi, komentarze, wygląd i zewnętrzne relacje są wyłączone z tej części.

Rejestr [itemSchema.ts](../src/entities/board/itemSchema.ts) obejmuje 18 typów, schematy treści i dozwolone dzieci kolumn. Sprawdzane są podstawowe typy, kształt zagnieżdżonych struktur, protokoły URL, skończona geometria, rozmiary, UUID, liczba elementów i limit wielkości itemu. Osobna walidacja sprawdza rodziców, ramki i końce relacji w tej samej tablicy. Nieobsługiwany typ lub wersja blokuje załadowanie tablicy do edycji i zachowuje dane w źródle. Nie ma jeszcze renderera zastępczego umożliwiającego edycję pozostałej części takiej tablicy.

Świadome etapy przejściowe:

- Dokument nadal ma HTML Tiptap z jawnym `contentFormat: tiptap-html`, `contentVersion: 1`. JSON edytora, migracja i serwerowa polityka dozwolonych węzłów wymagają osobnego wdrożenia. Walidacja długości HTML nie jest sanitizacją XSS.
- Starsze ustawienia notatek są w `appearance`, obok `typography`, aby zachować obecne renderowanie. Ich ostateczne połączenie wymaga migracji wyglądu; nie usunięto ich przez utratę wartości.
- `imgHeight` pozostaje wersjonowanym parametrem zawartości obrazu. Nie jest traktowany jak wysokość całej karty.
- Checklisty, karty Kanbana, timeline, diagramy i schematy bazy pozostają wewnątrz JSON itemu. Nie utworzono współdzielonego systemu zadań.
- UI i `ProjectSnapshot` obsługują obecnie jedną tablicę projektu. Osobne `boardId` umożliwia późniejszą rozbudowę; selektor wielu tablic wymaga dodatkowej pracy.
- Preferencje wyglądu pozostają osobiste i lokalne. Udostępnianie, upload i synchronizacja preferencji nie zostały włączone.

## Cykl zapisu i konflikty

[WorkspaceController](../src/features/projects/services/workspaceController.ts) utrzymuje lokalny widok i ostatnie potwierdzone rekordy. Aktualizacje są grupowane po 500 ms bez kolejnej zmiany. Różnica generuje tylko zmienione itemy oraz usunięcia, a repozytorium wykonuje atomową mutację tablicy. To również droga zapisu undo/redo: lokalny snapshot jest porównywany z potwierdzonym stanem, a nie wysyłany jako podmiana całej tablicy.

Każda mutacja ma `clientMutationId`, `expectedBoardRevision` i oczekiwane rewizje dotkniętych itemów. Mock wymaga rewizji tablicy przy każdej zmianie, co daje konserwatywne konflikty także przy edycji różnych itemów. Backend może później zawęzić ten wymóg do zmian strukturalnych wraz ze zmianą kontraktu i testów.

Kolejka wysyła operacje kolejno, zapamiętuje dokładne niepotwierdzone żądanie i ponawia je z tym samym ID. Zmiany dokonane podczas requestu pozostają w widoku i trafiają do następnej mutacji. Odpowiedź nie zastępuje nowszego lokalnego stanu. Nazwy pól JSON są porównywane niezależnie od kolejności kluczy.

UI pokazuje ładowanie, oczekujące zmiany, zapis, sukces, błąd i konflikt. Błąd zatrzymuje automatyczny zapis. Można pobrać kopię lokalnego szkicu i ponowić request; przy konflikcie można pobrać szkic oraz jawnie odrzucić zmiany i wczytać zapisany stan. Nie ma automatycznego scalania ani porównania side-by-side. Pobrany szkic jest kopią ratunkową modelu widoku, nie gotowym importerem do API.

Zmiana aktywnego projektu nie usuwa jego zmian z kolejki. Wylogowanie najpierw czeka na zapis i pozostaje na stronie, jeśli zapis się nie uda. `beforeunload` ostrzega o oczekujących zmianach. Nie zaimplementowano trwałego outboxa IndexedDB; awaria procesu lub wymuszone zamknięcie może utracić niezapisany szkic. Debounce nie jest jeszcze ścisłą granicą pointer-up: zatrzymanie ruchu na ponad 500 ms może zapisać pośrednią geometrię gestu.

Usunięcie itemu zapisuje tombstone. Usunięcie kolumny obejmuje brakujące dzieci jako osobne usunięcia w tej samej mutacji. Usunięcie ramki odłącza członkostwo. Odłączenie linii zachowuje wyliczone współrzędne końca; usunięcie dozownika odłącza pochodzenie notatek. Kosz projektu zachowuje zawartość i blokuje jej edycję; purge wymaga projektu w koszu i właściwej rewizji.

Mock wykonuje walidację na kopii danych przed jednym `setItem`, więc błąd nie zatwierdza części operacji. Web Locks serializuje transakcje między kartami w obsługujących go przeglądarkach. Bez niego nie ma gwarancji transakcji między kartami. Przechowywanie całego mocka w jednym localStorage jest szczegółem adaptera; żądania HTTP nie zapisują całej listy projektów. Mock przechowuje ostatnie 100 potwierdzeń mutacji; nie zastępuje to serwerowej retencji i idempotencji.

## Kontrakt HTTP do implementacji

JSON używa camelCase i stringowych wartości enum. Błędy używają `application/problem+json`: `type`, `title`, `status`, `code`, opcjonalne `traceId` oraz `errors`. Klient nie prezentuje surowych szczegółów wyjątków serwera.

| Metoda i ścieżka `/api/v1`                       | Żądanie / odpowiedź                                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `GET /auth/csrf`                                 | `{ token }`; backend ustawia cookie antiforgery, również dla anonimowego logowania        |
| `POST /auth/login`                               | `{ username, password }` → publiczny `User`, cookie sesji                                 |
| `GET /auth/me`                                   | publiczny `User` lub 401                                                                  |
| `POST /auth/logout`                              | unieważnienie sesji, 204                                                                  |
| `GET /users`                                     | publiczne profile; wyłącznie admin                                                        |
| `POST /users`                                    | `AddUserInput`; wyłącznie admin                                                           |
| `DELETE /users/{id}`                             | wyłącznie admin; serwer musi zdefiniować los projektów użytkownika                        |
| `GET /projects`                                  | `ProjectSnapshot[]`, również kosz; początkowy agregowany odczyt jednej tablicy na projekt |
| `POST /projects`                                 | `{ id, name, color, clientMutationId }` → `ProjectSnapshot`; właściciel z sesji           |
| `PATCH /projects/{id}`                           | `{ name, color, deletedAt, expectedRevision, clientMutationId }` → `ProjectRecord`        |
| `POST /projects/{id}/purge`                      | `{ expectedRevision, clientMutationId }` → 204                                            |
| `GET /projects/{id}/boards/{boardId}`            | `BoardSnapshot`                                                                           |
| `POST /projects/{id}/boards/{boardId}/mutations` | `BoardMutation` → potwierdzony `BoardSnapshot`                                            |

`deletedAt` w żądaniu projektu jest obecnie nullable wartością modelu widoku. Backend powinien traktować ją jako żądanie kosza/przywrócenia, nie wiarygodny czas audytu. Kontroler porównuje stan kosza, a nie równość znaczników czasu, więc backend może nadać własny czas. Obecny mock zachowuje przesłany znacznik kosza.

Mutacja zawiera `upserts: ItemMutation[]` i `deletes: { id, expectedRevision }[]`. Upsert zawiera `item: ItemWrite`, `expectedRevision` (null przy utworzeniu lub przywróceniu tombstone), relacje tego itemu, jego komentarze `{ id, text, status }` oraz nazwy tagów. Rewizja tablicy chroni także odtworzenie itemu przez undo. Późniejsze niezależne endpointy komentarzy będą potrzebne dla roli commenter i niezależnych konfliktów komentarzy; pierwsza implementacja jest prywatna, właścicielska.

Przed zatwierdzeniem API powinno atomowo sprawdzić właściciela/dostęp, stan projektu, rewizje, integralność i limity, a następnie zapisać rekordy oraz potwierdzenie mutacji. Ten sam identyfikator z inną treścią → 409. Identyczne ponowienie → poprzedni wynik. Brak sesji → 401, brak dostępu → konsekwentne 404 lub 403, zły payload → 422, konflikt → 409. Serwer nie powinien ignorować nieznanych pól mutacji.

HTTP ma timeout 30 s, obsługę `AbortSignal`, `credentials: same-origin`, brak cache, brak śledzenia przekierowań i nagłówek `X-CSRF-TOKEN` dla mutacji. Token CSRF pozostaje w pamięci i jest odświeżany po login/logout. Nie ma automatycznego retry transportu; za idempotentne ponowienie zapisu odpowiada kolejka.

Agregowany odczyt i pełna odpowiedź tablicy są prostym kontraktem pierwszej wersji. Przed dużymi zbiorami należy dodać paginację projektów, ładowanie wyłącznie aktywnej tablicy i odpowiedzi przyrostowe. Nie zmieniać kształtu endpointów jednostronnie: najpierw zaktualizować DTO/adapter i testy.

## Backend .NET 10 i bezpieczeństwo

OWASP Top 10 jest katalogiem ryzyk, nie biblioteką do jednorazowego „zaimplementowania”. Obecna wersja to [OWASP Top 10:2025](https://top10.owasp.org/2025/). Poniższa tabela jest zakresem prac i dowodów wymaganych przed wdrożeniem, a nie deklaracją spełnienia wymagań.

| Ryzyko 2025                                | Wymagana implementacja i weryfikacja backendu                                                                                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 Broken Access Control                  | Autoryzacja zasobów na każdym endpointcie i w batchu; sesja wyznacza tożsamość; admin kont nie uzyskuje automatycznie dostępu do projektów. Testy A→B i wszystkich ról.            |
| A02 Security Misconfiguration              | HTTPS, ścisłe originy, CSP dopasowane do Tiptap/embedów i fontów, wyłączone debug/stacktrace, sekrety w środowisku backendu. Test konfiguracji staging/production.                 |
| A03 Software Supply Chain Failures         | Przegląd zależności NuGet/npm, wersje i lockfile, skan podatności, kontrola artefaktów i procesu CI/CD.                                                                            |
| A04 Cryptographic Failures                 | Hasła hashowane przez sprawdzony mechanizm, TLS, ochrona kluczy i backupów, losowe sesje, rotacja/revokacja. Żadnych haseł demo importowanych do produkcji.                        |
| A05 Injection                              | Parametryzowane zapytania/EF Core, walidacja JSON dla wszystkich typów, polityka sanitizacji treści, brak wykonywania kodu z itemów. Testy XSS/SQL injection.                      |
| A06 Insecure Design                        | Model zagrożeń, limity tablic/rysunków/uploadów, macierz dostępu, transakcje, kosz/retencja, zasady blokady `locked`, kontrola SSRF przed jakimkolwiek serwerowym pobieraniem URL. |
| A07 Authentication Failures                | Wygasanie i unieważnianie sesji, rate limiting logowania, polityka haseł/resetów, bezpieczny bootstrap admina, cookie HttpOnly/Secure/SameSite i CSRF.                             |
| A08 Software or Data Integrity Failures    | Walidowane i wersjonowane DTO, odrzucanie nieznanych pól, ograniczone importy, sprawdzanie uploadów, idempotencja i integralność relacji w transakcjach.                           |
| A09 Security Logging and Alerting Failures | Zdarzenia autoryzacji i administracji, identyfikatory żądań, alarmy; bez sekretów i prywatnej treści itemów w logach.                                                              |
| A10 Mishandling of Exceptional Conditions  | Jednolite ProblemDetails, rollback, timeouty i anulowanie, limity zasobów, brak fail-open i testy błędów zależności/bazy/magazynu plików.                                          |

W ASP.NET Core 10 skonfiguruj token antiforgery dla rzeczywistych mutacji JSON, włącznie z logowaniem. Nie zakładaj, że obecność middleware automatycznie chroni każdy endpoint JSON. Zasady i dostępne mechanizmy opisuje [dokumentacja Microsoft dotycząca antiforgery](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-10.0).

Zachowaj model PostgreSQL z dokumentu wyjściowego: relacyjne projekty/tablice/itemy, JSONB dla treści, złożone FK w zakresie tablicy i osobne rekordy plików. W C# rozdziel DTO wejściowe od encji EF; `ownerId`, autorów i audyt nadaje backend. Nie serializuj encji użytkownika/poświadczeń wprost do klienta. Generowanie OpenAPI i klienta TypeScript po stabilizacji endpointów ograniczy dryf kontraktu.

## Weryfikacja i pozostałe prace

Testy `tests/api-readiness.test.mjs` sprawdzają normalizację, typy itemów, kolumny, różnice, konflikty, idempotencję, odrzucanie nieprawidłowych zapisów, izolację kontekstu, uszkodzony storage, utraconą odpowiedź, kolejne zmiany podczas zapisu, undo, publiczny profil i transport CSRF. Pozostałe testy bloków/canvasu nadal chronią dotychczasowe zachowanie. Wyłączono HMR w serwerach testowych, aby nie konkurowały o port 24678.

Przed produkcją pozostają: rzeczywisty backend i migracje, pełna walidacja semantyczna wszystkich treści, sanitizacja dokumentów, role i udostępnianie, polityka `locked`, zarządzanie kontami i sesjami, uploady, scenariusze HTTP 401/403/409/422/429, testy integracyjne z PostgreSQL, E2E z dwiema sesjami, CSP, testy obciążeniowe, backup/restore i monitoring. `npm run lint` obecnie nie działa, ponieważ repozytorium nie ma konfiguracji ESLint; nie jest to zaliczona kontrola.
