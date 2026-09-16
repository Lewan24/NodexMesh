# NodexMesh — przygotowanie API i bazy danych

Stan analizy: 13.09.2026. Dokument opisuje kod w tym repozytorium i proponowaną architekturę; nie oznacza wdrożenia backendu. Założenie: najpierw aplikacja serwerowa z prywatnymi projektami, później możliwość udostępniania i współpracy. Współedycja w czasie rzeczywistym nie jest warunkiem pierwszej wersji.

Aktualizacja po przygotowaniu frontendu: sekcje opisujące „obecny kod” poniżej są analizą wyjściową. Wdrożone modele rekordów, adaptery mock/HTTP, kolejkę zapisu i ograniczenia opisuje [api-integration-pl.md](api-integration-pl.md). Stare projekty nie są importowane; nowy mock używa osobnego, wersjonowanego klucza storage zgodnie z decyzją o dopuszczalnym resecie danych.

## 1. Rekomendacja

Proponuję PostgreSQL i model hybrydowy: osobne rekordy użytkowników, projektów, tablic, itemów, komentarzy i tagów oraz wersjonowany `JSONB` na treść poszczególnych typów itemów. Pliki należy przechowywać w magazynie obiektowym, a w bazie ich metadane i powiązania.

Każdy item ma wspólną tożsamość, położenie, uprawnienia wynikające z tablicy i numer rewizji. Nowy typ dostaje własny schemat treści i renderer. Dodanie np. bloku audio powinno wymagać nowego modułu i walidatora, a nie przebudowy wszystkich istniejących tabel.

To propozycja wynikająca z obecnej struktury aplikacji. PostgreSQL wspiera indeksowanie `JSONB`, ale aktualizacja fragmentu JSON nadal blokuje cały wiersz. Dlatego jednostką zapisu powinien być item, a nie cały projekt. [Dokumentacja JSONB](https://www.postgresql.org/docs/current/datatype-json.html).

Na początek wystarczy jeden backend podzielony na moduły: auth, projekty i dostęp, tablice i itemy, komentarze, pliki. Frontend React może pozostać aplikacją SPA. Wersja serwerowa z API nie wymaga przenoszenia renderowania canvasu na serwer ani wdrażania SSR. Wybór frameworka backendowego jest wtórny wobec kontraktu danych, autoryzacji i transakcji.

## 2. Jak aplikacja działa dzisiaj

### Architektura i zapis

- React 19, TypeScript, Vite, Tailwind; Tiptap do dokumentów, React Flow do diagramów, highlight.js do kodu. Wersje i zależności: [package.json](../package.json).
- `App` pokazuje login albo `BoardPage`; zmiana użytkownika montuje tablicę od nowa przez `key={currentUser.id}`.
- `useProjects` ładuje projekty użytkownika, trzyma je w stanie React i zapisuje całą ich tablicę po zmianie stanu.
- `useProjectItems` aktualizuje itemy wewnątrz projektu oraz normalizuje liczby, warstwy i przynależność do ramek.
- Zapis projektów to jeden JSON pod `nodexmesh_projects_<userId>`. Nie ma backendowego repozytorium projektów ani trwałej sesji serwerowej.
- Odczyt sprawdza przede wszystkim, czy JSON jest tablicą; rzutowanie TypeScript nie waliduje rzeczywistego kształtu danych. Są migracje normalizujące geometrię i ramki, ale nie ma pełnego, wersjonowanego formatu projektów.
- Błąd odczytu może skończyć się załadowaniem danych demonstracyjnych. Następny automatyczny zapis może zastąpić nieprawidłowe dane. Przed migracją trzeba wprowadzić tryb odzyskiwania zamiast cichego resetu.

Źródła: [App](../src/app/App.tsx), [useProjects](../src/features/projects/hooks/useProjects.ts), [projectStorage](../src/features/projects/storage/projectStorage.ts), [useProjectItems](../src/features/projects/hooks/useProjectItems.ts).

### Logowanie i użytkownicy

Obecny `User` zawiera `id`, `username`, jawne `password`, `name`, `role: admin | user`. Lista kont jest w `nodexmesh_users`, a sesja to samo ID w `nodexmesh_session_user_id`. Login porównuje hasło w przeglądarce. Istnieją dodawanie i usuwanie kont oraz panel administratora; walidacja nowego konta sprawdza wymagane pola i zajętą nazwę.

To mechanizm demonstracyjny, nie granica bezpieczeństwa. Zmiana lokalnych danych pozwala zmienić tożsamość lub rolę. `addUser` i `removeUser` w kontekście nie egzekwują samodzielnie roli administratora. Ukrycie panelu w UI nie zastąpi autoryzacji endpointu. Nie ma serwerowej polityki haseł, unieważniania sesji ani procesu odzyskiwania konta.

Źródła: [User](../src/entities/user/types.ts), [AuthContext](../src/features/auth/context/AuthContext.tsx), [authStorage](../src/features/auth/storage/authStorage.ts), [walidacja](../src/features/auth/utils/authValidation.ts).

### Aktualne funkcje

| Obszar              | Stan w kodzie                                                                                                | Znaczenie dla API                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Projekty            | Tworzenie, wybór, zmiana nazwy, kosz przez `deletedAt`, przywracanie, opróżnianie kosza, reset demo          | Trwałe metadane, właściciel, kontrola dostępu i zasady usuwania                   |
| Canvas              | Przesuwanie, skalowanie widoku, zaznaczanie, zmiana rozmiaru, warstwy, wyrównywanie, skróty i obsługa dotyku | Oddzielić lokalny stan gestu od zatwierdzonej zmiany danych                       |
| Organizacja         | Ramki, kolumny, łączenie liniami, blokady, kopiowanie itemów i stylu                                         | Transakcje obejmujące wiele itemów i poprawne mapowanie ID                        |
| Cofanie             | Historia zmian w pamięci dla aktywnego projektu; przywracanie tablicy itemów                                 | Nie jest historią serwerową; nie wolno nadpisywać cudzych zmian starym snapshotem |
| Komentarze          | Tekst, data utworzenia i opcjonalny status; przypisane do itemu                                              | Brakuje autora, daty edycji i odrębnego rekordu                                   |
| Tagi i wyszukiwanie | Tagi jako teksty, lokalne wyszukiwanie treści różnych bloków                                                 | Docelowo indeks wyszukiwania i normalizacja tagów                                 |
| Wygląd              | Jasne/ciemne palety, gradienty, fonty, ustawienia użytkownika i nadpisania projektu                          | Określić, które ustawienia są osobiste, a które wspólne                           |
| Obrazy              | Adres URL, podpis, wariant karta/naklejka                                                                    | Brak kompletnego procesu uploadu i zarządzania plikami                            |
| Embed               | URL, obsługa adresów YouTube/Vimeo i innych HTTP(S)                                                          | Polityka dozwolonych źródeł i konfiguracja iframe                                 |

Źródła: katalogi `features/canvas`, `features/blocks`, `features/comments`, `features/search`, `features/appearance`; [historia](../src/features/canvas/hooks/useCanvasHistory.ts), [preferencje](../src/features/appearance/appearanceModel.ts).

## 3. Itemy — obecny model i docelowy zapis

Wspólny `BaseItem`: `id`, `x`, `y`, `zIndex`, opcjonalne `width`, `height`, `frameId`, `color`, `colorRole`, `gradient`, `topColor`, `typography`, `tags`, `locked`, `comments`. Brakuje `boardId`, autora, dat aktualizacji, wersji schematu i rewizji do wykrywania konfliktów.

Poniższe pola są dodatkami do wspólnej części. Pełne definicje: [types.ts](../src/entities/board/types.ts).

| Typ             | Aktualna treść / struktura                                                                                          | Proponowany zapis początkowy                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `section-title` | `content`                                                                                                           | `data.content`                                                                      |
| `note`          | `content`, `color`, opcjonalne `dispenserId`, stare pola wyrównania/fontu/pogrubienia/kursywy                       | Treść w `data`, styl w `appearance`, pochodzenie w relacji                          |
| `text`          | `content`, `size`, opcjonalne wyrównanie/pogrubienie/kursywa                                                        | `data.content`, ujednolicony styl                                                   |
| `document`      | `title`, `content` jako HTML z Tiptap, `autoHeight`                                                                 | Docelowo struktura edytora w JSON i jawny format/wersja                             |
| `code`          | `content`, `language`, `autoHeight`                                                                                 | Tekst kodu i język w `data`; nigdy nie wykonywać tego kodu na serwerze              |
| `image`         | `url`, `caption`, `variant`, starsze `imgHeight`                                                                    | Podpis i wariant w `data`; upload przez `item_assets`; URL zewnętrzny nadal możliwy |
| `link`          | `url`, `title`, `description`                                                                                       | `data` z walidacją protokołu i długości                                             |
| `embed`         | `url`, `title`, `showLabel`                                                                                         | `data`; iframe wyliczany z zatwierdzonego adresu                                    |
| `checklist`     | `title`, `entries[{id,text,done}]`                                                                                  | Początkowo `data.entries`; osobne rekordy po dodaniu przypisań/raportów             |
| `kanban`        | `title`, `columns[{id,title,color,width,cards}]`; karta `{id,text,done}`                                            | Początkowo `data.columns`; rozdzielić na tabele, gdy karty staną się zadaniami      |
| `timeline`      | `title`, `mode`, `taskColumnWidth`, `tasks[{id,title,start,end,done,color,checklist}]`                              | Początkowo `data.tasks`; daty dzienne `YYYY-MM-DD`                                  |
| `column`        | `title`, `items: BoardItem[]`, `layout`, `gridColumns`, `gap`, szerokość                                            | Ustawienia w `data`, dzieci jako osobne itemy z `parent_item_id` i kolejnością      |
| `frame`         | `title`, szerokość/wysokość, `color`, `opacity`                                                                     | Normalny item; członkostwo innych itemów przez `frame_id`                           |
| `line`          | `x2`, `y2`, strzałki, krzywizna, grubość, zakończenia, etykieta, tryb etykiety, divider, `startItemId`, `endItemId` | Geometria i etykieta w `data`; końce powiązane przez `item_links`                   |
| `dispenser`     | `title`, `color`; tworzenie nowych karteczek                                                                        | Ustawienia w `data`; pochodzenie karteczki jako relacja                             |
| `drawing`       | Punkty z naciskiem, wymiary widoku, grubość/kolor; opcjonalne kreski `strokes` z transformacją                      | `data` z limitem punktów i rozmiaru; duże rysunki później osobno                    |
| `diagram`       | `title`, węzły `{id,position,data,type}`, krawędzie `{id,source,target,handles,label,type}`                         | `data.nodes/edges` jako jeden dokument diagramu                                     |
| `database`      | `title`, tabele z polami i pozycjami, relacje z polami i krotnością                                                 | `data.tables/relations`; to rysunek schematu, nie rzeczywiste tabele aplikacji      |

Kolumna jest rekurencyjna w typach, ale obecne opcje dodawania dzieci obejmują osiem typów: note, checklist, link, text, image, document, code, embed. API powinno respektować aktualne dozwolone typy; szersze zagnieżdżanie włączać świadomie. [columnItems](../src/features/blocks/column/utils/columnItems.ts).

### Trzy różne rodzaje relacji

1. **Zagnieżdżenie w kolumnie:** wpływa na renderowanie, układ i kolejność. Zapis `parent_item_id`.
2. **Przynależność do ramki:** obecne trwałe przypisanie `frameId`, niezależne od zagnieżdżenia. Zapis `frame_id`.
3. **Powiązanie między itemami:** końce linii i źródło karteczki. Zapis `item_links`.

Nie należy zastępować tych trzech znaczeń jednym ogólnym `parentId`. Obecne `frameId: undefined` i `frameId: null` również nie są równoważne: `null` oznacza jawny brak przypisania. Import najpierw uruchamia normalizację starego modelu, dopiero potem zapisuje docelowe nullable `frame_id`. Geometrię elementów kolumn trzeba przenosić przez adapter zgodny z obecnym układem, a nie automatycznie interpretować każde `x/y` jako położenie względem rodzica.

## 4. Proponowane tabele

To projekt logiczny, nie gotowa migracja SQL. `PK` oznacza klucz główny, `FK` powiązanie z tabelą, `?` pole dopuszczające NULL. Nowe identyfikatory: UUID; daty zdarzeń: `timestamptz`; daty dzienne zadań: `date`. Serwer nadaje autora i znaczniki czasu. Zwykłe tabele domenowe mają `created_at`, `updated_at`; wyjątki zaznaczono niżej.

### Konta, dostęp i projekty — pierwsza wersja

| Tabela                 | Pola                                                                                                                                                                     | Reguły                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `users`                | `id uuid PK`, `username text`, `username_normalized text`, `display_name text`, `email text?`, `email_verified_at timestamptz?`, `system_role text`, `status text`, daty | Unikalny znormalizowany login; role systemowe `admin/user`; status np. `active/disabled`                     |
| `password_credentials` | `user_id uuid PK/FK users`, `password_hash text`, `password_changed_at timestamptz`                                                                                      | Tylko backend; oddzielone od publicznego profilu                                                             |
| `sessions`             | `id uuid PK`, `user_id FK`, `token_hash text UNIQUE`, `created_at`, `expires_at`, `last_seen_at`, `revoked_at?`                                                          | Losowy sekret sesji po stronie klienta, w bazie jego hash; indeks po użytkowniku i terminie wygaśnięcia      |
| `projects`             | `id uuid PK`, `owner_id FK users`, `name text`, `color text`, `revision bigint`, `deleted_at?`, daty                                                                     | Zachowuje obecną semantykę właściciela i kosza                                                               |
| `project_members`      | `project_id FK`, `user_id FK`, `role text`, daty                                                                                                                         | PK `(project_id,user_id)`; role `editor/commenter/viewer`; właściciel wynika wyłącznie z `projects.owner_id` |
| `boards`               | `id uuid PK`, `project_id FK`, `name text`, `sort_order bigint`, `revision bigint`, `deleted_at?`, daty                                                                  | Na początku jedna tablica na projekt; później wiele bez przebudowy itemów                                    |

Właściciel ma pełny dostęp i nie potrzebuje osobnego wpisu członkostwa. Transfer właściciela to dedykowana transakcja. Administrator systemowy zarządza kontami; dostęp do treści cudzych projektów nie powinien wynikać automatycznie z roli `admin`. Wyjątek administracyjny, jeżeli potrzebny, musi mieć jawną regułę i audyt.

Przy logowaniu przez zewnętrznego dostawcę można później dodać `auth_identities(id, user_id, provider, provider_subject, created_at)` z unikalnym `(provider,provider_subject)`. Nie trzeba zmieniać identyfikatorów użytkowników ani itemów.

### `items` — wspólna tabela wszystkich typów

| Pole                                     | Typ                              | Cel                                                        |
| ---------------------------------------- | -------------------------------- | ---------------------------------------------------------- |
| `id`                                     | `uuid PK`                        | Stabilne ID elementu                                       |
| `board_id`                               | `uuid FK boards`                 | Zakres danych i dostępu                                    |
| `type`                                   | `text`                           | Np. `note`, `diagram`; kontrolowany rejestrem aplikacji    |
| `schema_version`                         | `integer`                        | Wersja struktury `data` danego typu                        |
| `revision`                               | `bigint`                         | Rosnąca wersja rekordu, niezależna od wersji schematu      |
| `parent_item_id`                         | `uuid?`                          | Rodzic układu, obecnie kolumna                             |
| `frame_id`                               | `uuid?`                          | Przypisana ramka                                           |
| `sort_order`                             | `bigint`                         | Kolejność w kontenerze; początkowo wartości z odstępami    |
| `x`, `y`                                 | `double precision`               | Współrzędne w ustalonym układzie; mogą być ujemne          |
| `width`, `height`                        | `double precision?`              | Jawny rozmiar; NULL oznacza wymiar automatyczny/domniemany |
| `z_index`                                | `integer`                        | Warstwa rysowania, niezależna od kolejności w kolumnie     |
| `appearance`                             | `jsonb`                          | Kolory, role kolorów, gradient, typografia, topColor       |
| `data`                                   | `jsonb`                          | Wersjonowana treść konkretnego typu                        |
| `locked`                                 | `boolean`                        | Blokada edycji wynikająca z funkcji produktu               |
| `created_by`, `updated_by`               | `uuid? FK users`                 | Autorzy; NULL m.in. dla nieznanej historii importu         |
| `created_at`, `updated_at`, `deleted_at` | `timestamptz`, ostatnie nullable | Historia czasu i kosz                                      |

`data` nie zawiera drugiej kopii pól wspólnych, dzieci kolumn, komentarzy, tagów ani referencji przeniesionych do tabel relacyjnych. `title` i `content` pozostają polami właściwymi dla typu. Adapter frontendowy składa z tego obecny `BoardItem` podczas stopniowej migracji.

Nie używałbym SQL ENUM dla `items.type`: nowy typ powinien dać się zarejestrować w kodzie. Nie oznacza to akceptowania dowolnej struktury przesłanej przez klienta — zapis musi przejść walidator konkretnego typu i wersji.

### Relacje, komentarze i wygląd — pierwsza wersja

| Tabela                     | Pola                                                                                                                                                                                 | Reguły                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `item_links`               | `id uuid PK`, `board_id FK`, `source_item_id`, `target_item_id`, `kind text`, `metadata jsonb`, daty                                                                                 | Rodzaje początkowe `line_start`, `line_end`, `created_from`; źródło to linia lub notatka |
| `comments`                 | `id uuid PK`, `board_id FK`, `item_id`, `author_id uuid? FK users`, `body text`, `status text`, `revision bigint`, `resolved_by uuid? FK users`, `resolved_at?`, `deleted_at?`, daty | Statusy obecne: `open/todo/in-progress/resolved`; autor z sesji, nie z payloadu          |
| `tags`                     | `id uuid PK`, `project_id FK`, `name text`, `normalized_name text`, `color text?`, daty                                                                                              | UNIQUE `(project_id,normalized_name)`                                                    |
| `item_tags`                | `item_id FK`, `tag_id FK`, `created_at`                                                                                                                                              | PK `(item_id,tag_id)`; API sprawdza wspólny projekt                                      |
| `user_preferences`         | `user_id PK/FK`, `schema_version integer`, `settings jsonb`, daty                                                                                                                    | Domyślne palety i preferencje interfejsu                                                 |
| `user_project_preferences` | `user_id FK`, `project_id FK`, `schema_version integer`, `appearance jsonb`, daty                                                                                                    | PK `(user_id,project_id)`; zachowuje osobisty charakter dzisiejszych nadpisań            |
| `board_user_state`         | `board_id FK`, `user_id FK`, `pan_x`, `pan_y`, `zoom`, `updated_at`                                                                                                                  | PK `(board_id,user_id)`; opcjonalne zapamiętanie widoku, bez wspólnego zaznaczenia       |

Na pierwszą wersję zachowałbym obecny osobisty wygląd projektu. Jeśli paleta ma być wspólna dla zespołu, dodać `boards.appearance jsonb` i jawny model dziedziczenia: domyślna paleta użytkownika → paleta tablicy → osobiste nadpisanie. Migracja nie powinna niejawnie zmieniać prywatnych ustawień we wspólne.

### Integralność i indeksy

- `items` ma dodatkowe UNIQUE `(board_id,id)`. Złożone FK `(board_id,parent_item_id)` i `(board_id,frame_id)` odnoszą się do `(board_id,id)`. Analogicznie zabezpieczyć oba końce `item_links` oraz item komentarza. Sam FK po ID nie wyklucza referencji do obcej tablicy.
- Walidacja transakcyjna dodatkowo sprawdza typ rodzica/ramki, brak cyklu, limit zagnieżdżenia, istniejące aktywne cele oraz zgodność typu relacji. Przy równoległych przenosinach blokować strukturę tablicy w ustalonej kolejności, aby dwie poprawne osobno operacje nie stworzyły cyklu.
- Częściowy UNIQUE `(source_item_id,kind)` dla `line_start`, `line_end`, `created_from` zapobiega dwóm przypisaniom tego samego rodzaju. Wewnętrzne ID diagramu są lokalne dla jego `data`, a nie FK do `items`.
- CHECK: `schema_version > 0`, `revision > 0`, dodatnie jawne rozmiary, JSON będący obiektem; API odrzuca `NaN`, nieskończoności i wartości poza ustalonym limitem. Ramki zachowują obecną warstwę 0.
- Indeksy startowe: `projects(owner_id)`, `project_members(user_id,project_id)`, `boards(project_id,sort_order)`, `items(board_id,parent_item_id,sort_order)` dla aktywnych itemów, `items(board_id,z_index)`, `items(board_id,frame_id)`, `comments(item_id,created_at)`, `item_links(target_item_id)`, `item_tags(tag_id)`.
- Indeksy treści dodawać pod rzeczywiste zapytania. Nie indeksować automatycznie całego `data` każdego rysunku. Serwerowe wyszukiwanie można oprzeć o pochodny `search_text`/indeks pełnotekstowy, aktualizowany przez ekstraktor danego typu i zawsze ograniczony uprawnieniami.

PostgreSQL zapewnia FK, CHECK i UNIQUE, ale reguły obejmujące inne rekordy wymagają właściwych relacji lub dodatkowej logiki; nie należy wkładać takich reguł w zwykły CHECK. [Dokumentacja constraints](https://www.postgresql.org/docs/current/ddl-constraints.html).

### Pliki — kiedy pojawi się upload

`assets`: `id uuid PK`, `project_id FK`, `uploaded_by FK users`, `storage_key text UNIQUE`, `original_name text`, `mime_type text`, `byte_size bigint`, `checksum text`, `width integer?`, `height integer?`, `status text`, `created_at`, `deleted_at?`.

`item_assets`: `item_id FK`, `asset_id FK`, `role text`, `sort_order bigint`, `created_at`; PK `(item_id,asset_id,role)`. Sprawdzenie wspólnego projektu po stronie API. To samo zdjęcie może być użyte przez kilka itemów.

Baza przechowuje klucz obiektu, a nie wygasający podpisany URL. Backend wydaje uprawniony dostęp do pliku. Upload ma limit rozmiaru, sprawdzenie zawartości i stan `pending/ready/rejected`. Usunięcie itemu nie usuwa od razu współdzielonego pliku; sprzątanie uwzględnia inne referencje, kosz i retencję. Operacje bazy oraz magazynu plików wymagają ponawialnego procesu, bo nie tworzą jednej transakcji SQL.

### Tabele późniejszych funkcji

| Kiedy                      | Tabele i najważniejsze pola                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Historia przywracania      | `board_snapshots(id,board_id,revision,schema_version,storage_key,created_by,created_at)`                                                         |
| Audyt administracyjny      | `audit_events(id,actor_id,project_id?,action,entity_type,entity_id,metadata,created_at)`; zapis append-only, bez haseł i sekretów                |
| Ponawianie mutacji         | `mutation_receipts(id,user_id,board_id,client_mutation_id,request_hash,result_json,created_at,expires_at)`; UNIQUE zakresu użytkownik/tablica/ID |
| Przyrostowa synchronizacja | `board_changes(board_id,revision,mutation_id,entity_type,entity_id,operation,payload,created_at)`; uporządkowany dziennik zmian i usunięć        |
| Zespoły/organizacje        | `workspaces(id,name,owner_id,created_at)`, `workspace_members(workspace_id,user_id,role)` i `projects.workspace_id`                              |
| Zaproszenia / odzyskiwanie | Osobne rekordy zaproszeń lub resetów: ID, odbiorca/użytkownik, hash tokenu, termin ważności, data użycia; token jednorazowy                      |

Nie trzeba implementować wszystkich tabel teraz. Rewizje, stabilne ID, autoryzacja i wersjonowanie schematu są potrzebne od pierwszego API. Audyt administracyjny i potwierdzenia mutacji warto wdrożyć razem z odpowiednimi operacjami.

## 5. Kiedy wyciągnąć zadania z JSONB

Na starcie checklisty, karty Kanbana i zadania timeline mogą pozostać wewnątrz itemu, jeśli są edytowane jako jego treść. Konsekwencja: dwóch użytkowników edytujących różne karty tego samego Kanbana może mieć konflikt rewizji itemu. JSONB sam tego nie rozwiązuje.

Jeżeli już w pierwszej wersji mają być „moje zadania”, przypisani użytkownicy, terminy, przypomnienia lub ta sama karta widoczna w Kanbanie i timeline, wydzielić od razu:

- `tasks(id, project_id, title, description, status, start_date?, due_date?, color?, revision, created_by, created_at, updated_at, deleted_at?)`;
- `task_assignees(task_id, user_id)` z kluczem złożonym;
- `task_checklist_entries(id, task_id, text, done, sort_order, revision)`;
- `kanban_columns(id, item_id, title, color, width?, sort_order, revision)`;
- `task_placements(id, task_id, item_id, kanban_column_id?, sort_order)`; zgodność itemu i kolumny sprawdzana w transakcji.

Kanban i timeline są wtedy widokami tych samych zadań. Migracja starej karty mapuje `text → title`, `done → status`; zadania timeline zachowują `start/end` jako daty. Nie należy wprowadzać drugiego, niezależnie edytowanego źródła prawdy w `items.data`. Przy przejściu z JSON do tabel zwiększyć `schema_version` i zastąpić osadzone zadania referencjami lub projekcją generowaną przez API.

Diagramy i rysunki mogą nadal być JSON-em, dopóki nie potrzebują niezależnych uprawnień, raportowania lub intensywnej współedycji ich części.

## 6. Zmiany w frontendzie przed podłączeniem API

### Warstwa danych

Wydzielić kontrakty `AuthService`, `ProjectRepository`, `BoardRepository` i adaptery `local` / `http`. Komponenty bloków nadal zgłaszają zmiany, ale nie powinny decydować, jak cała lista projektów trafia do storage. Przejście na asynchroniczne API wymaga stanów ładowania, błędu, pustych danych i ponawiania.

Stan canvasu podczas przesuwania pozostaje lokalny. Zatwierdzenie gestu wysyła końcową geometrię; edycję tekstu grupować, np. z opóźnieniem 500 ms, z obsługą oczekujących zmian przy zmianie projektu. Pokazywać „zapisywanie”, „zapisano”, „błąd zapisu” i „konflikt”. Zamknięcie karty nie gwarantuje dostarczenia ostatniego żądania; lokalna kolejka w IndexedDB może chronić niezapisane zmiany, jeśli taki poziom odporności jest wymagany.

Nie przenosić obecnego `saveProjects(userId, projects)` bezpośrednio na `PUT` całej listy. Zmiana jednego tekstu powinna zapisywać jeden item, a przeniesienie ramki z zawartością — jeden atomowy zestaw zmian.

### Rejestr typów itemów

Dla każdego typu zdefiniować: `type`, bieżącą wersję schematu, fabrykę domyślnego itemu, walidator danych, migracje, renderer, ekstraktor tekstu wyszukiwania, reguły klonowania referencji i możliwości edycji/zagnieżdżania.

Obecna obsługa jest rozproszona m.in. pomiędzy `types.ts`, `createCanvasItem`, `BlockRenderer`, `itemSearch`, narzędzia sidebaru, geometrię, schowek i edytory. Rejestr ograniczy liczbę miejsc, o których trzeba pamiętać przy dodawaniu nowego typu.

Stary klient, który odczyta nieznany typ lub nowszą wersję, pokazuje blok zastępczy z zachowaniem surowych danych i bez możliwości ich nadpisania. Nie usuwa go przy zapisie sąsiadującej notatki. Serwer odrzuca zapis nieobsługiwanej wersji, zamiast cicho usuwać nieznane pola.

### Uporządkowanie obecnego modelu

- Ujednolicić generowanie ID. Klonowanie korzysta już z `crypto.randomUUID()`, ale część fabryk i komentarzy używa `Math.random()`.
- Przenieść stare pola typografii notatek/tekstu do jednego modelu `appearance.typography`, zachowując wygląd przez test migracji.
- Ustalić docelowe znaczenie `imgHeight`, `height` oraz `autoHeight`; migracja nie może utożsamić wysokości obrazu z wysokością całej karty.
- Dokument Tiptap: rozważyć JSON edytora jako źródło prawdy, z dozwolonym zestawem węzłów/atrybutów. Stary HTML konwertować kontrolowanie; zachować kopię źródłową importu. Renderowany HTML musi przejść politykę bezpiecznej treści.
- Utrzymać stabilne ID dzieci checklist, Kanbana, timeline i diagramów. Klonowanie musi znać referencje danego typu; obecne rozpoznawanie nazw pól nie obejmie automatycznie przyszłych relacji.
- Blokada `locked` musi mieć zdefiniowany zakres: co blokuje, kto może odblokować, czy dopuszcza komentarze. Serwer egzekwuje tę regułę.

## 7. Logowanie i autoryzacja serwerowa

1. `POST /api/v1/auth/login` weryfikuje konto na backendzie. Hasło przechowywane jako hash Argon2id z parametrami dobranymi do serwera, nigdy jawnie ani jako odwracalnie zaszyfrowany tekst. [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
2. Backend tworzy sesję i ustawia cookie `HttpOnly`, `Secure` oraz świadomie dobrane `SameSite` — dla prostego wdrożenia pod jedną domeną zwykle `Lax` lub `Strict`. Mutacje wymagają ochrony CSRF; uwzględnić token i kontrolę Origin odpowiednią do architektury. Nie trzymać sekretu sesji w localStorage. [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
3. `GET /api/v1/auth/me` zwraca publiczny profil i uprawnienia; `POST /api/v1/auth/logout` unieważnia sesję w bazie i usuwa cookie.
4. Każde żądanie sprawdza sesję, stan konta i dostęp do projektu zawierającego tablicę/item. `ownerId`, `authorId` i rola przysłane przez klienta nie są dowodem uprawnień.
5. Dodać limity prób logowania, wygaśnięcie i rotację sesji, unieważnianie po zmianie hasła/wyłączeniu konta oraz bezpieczny proces tworzenia pierwszego administratora.
6. Nie migrować haseł demonstracyjnych. Utworzyć prawdziwe konta i jawnie przypisać im importowane projekty. Dane demonstracyjne nie potwierdzają rzeczywistej tożsamości właściciela.

Minimalna macierz uprawnień:

| Czynność                                      | Właściciel | Editor | Commenter | Viewer |
| --------------------------------------------- | ---------- | ------ | --------- | ------ |
| Odczyt tablicy                                | Tak        | Tak    | Tak       | Tak    |
| Edycja itemów                                 | Tak        | Tak    | Nie       | Nie    |
| Dodawanie komentarzy                          | Tak        | Tak    | Tak       | Nie    |
| Zapraszanie / zmiana ról / usunięcie projektu | Tak        | Nie    | Nie       | Nie    |
| Transfer własności                            | Tak        | Nie    | Nie       | Nie    |

Edycja i usuwanie komentarzy: autor albo właściciel według jawnej reguły; moderatorów można dodać później. Usunięcie konta posiadającego projekty wymaga decyzji o transferze lub usunięciu danych. Samo usunięcie rekordu użytkownika nie może przypadkowo skasować zespołowych projektów.

## 8. Kontrakt API i konflikty

Proponowany zakres:

| Endpoint                                             | Cel                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `GET/POST /api/v1/projects`                          | Lista metadanych bez wszystkich itemów / utworzenie projektu |
| `PATCH/DELETE /api/v1/projects/:id`                  | Edycja metadanych / przeniesienie do kosza                   |
| `POST /api/v1/projects/:id/restore`                  | Przywrócenie                                                 |
| `GET/POST /api/v1/projects/:id/boards`               | Tablice projektu                                             |
| `GET /api/v1/boards/:id`                             | Spójny snapshot tablicy, rewizja, itemy i relacje            |
| `POST /api/v1/boards/:id/mutations`                  | Atomowy zestaw operacji create/update/move/delete/reorder    |
| `GET/POST /api/v1/items/:id/comments`                | Paginowane komentarze / dodawanie                            |
| `PATCH/DELETE /api/v1/comments/:id`                  | Edycja lub usunięcie z kontrolą autora i rewizji             |
| `GET/POST/PATCH/DELETE /api/v1/projects/:id/members` | Członkostwo; konkretne operacje wskazują użytkownika         |
| `POST /api/v1/projects/:id/assets/uploads`           | Rozpoczęcie uploadu                                          |
| `POST /api/v1/assets/:id/complete`                   | Weryfikacja i zatwierdzenie pliku                            |
| `GET/PATCH /api/v1/me/preferences`                   | Preferencje użytkownika                                      |

Adresy są propozycją. Zdefiniować kontrakt OpenAPI i współdzielone schematy walidacji, limity payloadu oraz błędy maszynowe. Brak sesji: 401; brak dostępu: 403 lub konsekwentne 404 dla ukrytych zasobów; nieprawidłowy payload: 422; konflikt rewizji: 409.

Każda mutacja zawiera `clientMutationId`, operacje i oczekiwane rewizje zmienianych itemów. Backend atomowo sprawdza dostęp i rewizje, stosuje zmiany, zwiększa rewizje itemów oraz tablicy i zapisuje wynik deduplikacji. To samo ID z inną treścią jest odrzucane. Ponowienie identycznego żądania po utracie odpowiedzi zwraca poprzedni wynik zamiast tworzyć duplikaty.

Przykład: Anna i Piotr wczytali notatkę w rewizji 7. Anna zapisuje rewizję 8. Zapis Piotra z `expectedRevision: 7` dostaje konflikt z aktualnym stanem. UI umożliwia porównanie i ponowne zastosowanie własnej zmiany; nie nadpisuje automatycznie rewizji 8.

Zwykła aktualizacja może używać `UPDATE ... WHERE id = ... AND revision = ...` z inkrementacją rewizji w tej samej transakcji. Przeniesienie itemu między kolumnami, przesunięcie ramki z zawartością i klonowanie powiązanego zestawu wymagają jednej transakcji. Strukturalne zmiany kolejności dodatkowo sprawdzają rewizję kontenera/tablicy. Frontend musi odrzucać odpowiedzi starsze od już zastosowanej rewizji.

Undo w pierwszej wersji serwerowej powinno tworzyć operację odwrotną sprawdzającą rewizje. Obecnego odtworzenia całej tablicy z pamięci nie można bezpośrednio wysłać jako zapis. WebSocket może później dostarczać zdarzenia zmian, ale nie rozwiązuje scalania jednoczesnej edycji; CRDT/OT rozważyć dopiero wraz z wymaganiem współedycji dokumentów.

## 9. Usuwanie i migracja danych

### Zasady usuwania do ustalenia przed API

- Projekt/tablica w koszu: niewidoczne w normalnym odczycie i nieedytowalne, bez natychmiastowego fizycznego kasowania dzieci.
- Item w koszu: `deleted_at`; transakcja odłącza relacje wymagające aktywnego celu. Linie zachowują ostatnie rozwiązane współrzędne końca, aby nie przeskakiwały po odpięciu.
- Ramka: osobne operacje „usuń ramkę, zachowaj zawartość” oraz „usuń z zawartością”, jeśli produkt ma obsługiwać oba warianty.
- Kolumna: jawna decyzja, czy dzieci trafiają do kosza, czy są wyciągane na canvas z wyliczoną geometrią. Nie zostawiać tego przypadkowemu `ON DELETE CASCADE`.
- Twarde usuwanie: osobny proces po okresie retencji. Przywracanie uwzględnia referencje, rodziców i pliki. Jeśli relacje mają być odtwarzane, trzeba zachować ich tombstone lub zapis operacji.

### Plan importu obecnego localStorage

1. Przygotować eksport JSON projektów i preferencji z każdej używanej przeglądarki. Backend sam nie ma dostępu do localStorage. Nie eksportować sekretów demonstracyjnego logowania.
2. Zachować nienaruszoną kopię wejścia i wygenerować raport walidacji: liczba projektów, itemów każdego typu, dzieci, komentarzy, relacji i problemów.
3. Dodać wersję formatu eksportu. Uruchomić kontrolowane migracje starych liczb, ramek, typografii i wymiarów. Nie resetować błędnych danych do demo.
4. Każdy projekt mapować na projekt plus jedną tablicę. Dotychczasowe krótkie/stringowe ID mapować na UUID. Mapa musi uwzględniać plik importu, projekt i rodzaj encji, bo ID z demo mogą powtarzać się między użytkownikami.
5. Najpierw zebrać wszystkie ID, potem przepisać referencje `frameId`, `dispenserId`, końce linii i relacje wewnętrzne. Kolumny spłaszczyć do rekordów itemów z zachowaniem kolejności dzieci.
6. Komentarze przenieść do osobnych wierszy. Nie zgadywać autora: dotychczasowe komentarze nie mają `authorId`; zapisać NULL i oznaczyć w UI jako importowane. Zachować rzeczywiste `createdAt`; nieznane daty itemów oznaczać jako czas importu, nie udawać historycznych.
7. Tagi znormalizować i zdeduplikować w projekcie, zachowując nazwy. URL-e obrazów zachować jako źródła zewnętrzne; nie pobierać ich automatycznie podczas importu.
8. Importować transakcyjnie per projekt z kluczem idempotencji i raportem mapowania. Ponowny import nie powinien dublować danych.
9. Sprawdzić odczyt przez API i odtworzenie wizualne wszystkich 18 typów, zagnieżdżeń, ramek i połączeń. Dopiero po potwierdzeniu przełączyć źródło danych. Zachować eksport do czasu sprawdzonego backupu serwera.

## 10. Co przygotować i sprawdzić

### Decyzje produktowe przed implementacją

- Czy pierwsza wersja obejmuje udostępnianie projektów, czy tylko prywatne konta? Proponowany model obsłuży oba warianty.
- Czy Kanban i timeline mają pokazywać te same zadania? Jeśli tak, tabele zadań wdrożyć od początku.
- Czy potrzebna jest praca offline i jednoczesna edycja? Na start proponuję zapis online z wykrywaniem konfliktów, bez automatycznego scalania.
- Czy palety projektu są osobiste czy wspólne? W pierwszej migracji zachować osobiste.
- Jakie są limity tablicy, dokumentu, rysunku i uploadu? Ustalić na podstawie próbek rzeczywistych danych i pomiaru renderowania.
- Jak długo działa kosz, kto może usuwać projekty i jak odzyskuje się konto? Zapisać te reguły przed tworzeniem endpointów.

### Testy wymagane dla wersji serwerowej

| Scenariusz                                                | Oczekiwany wynik                                              |
| --------------------------------------------------------- | ------------------------------------------------------------- |
| Użytkownik A podaje ID projektu/itemu/pliku B             | Brak odczytu i zapisu, również przy endpointach zbiorczych    |
| Viewer wywołuje mutację ręcznie                           | Backend odmawia niezależnie od UI                             |
| Klient podmienia autora lub rolę                          | Wartości odrzucane albo wyznaczane przez serwer               |
| Dwie edycje tej samej rewizji                             | Jedna akceptowana, druga daje widoczny konflikt               |
| Timeout po zatwierdzeniu transakcji i retry               | Dokładnie jeden efekt operacji                                |
| Zmiana konta/projektu przy trwającym zapisie              | Odpowiedź nie trafia do innego kontekstu; brak wycieku danych |
| Przeniesienie dziecka, usunięcie ramki/kolumny/celu linii | Spójne relacje i przewidywalny wygląd                         |
| Nieznany typ/nowszy schemat/stary klient                  | Zachowanie danych i blokada niezgodnej edycji                 |
| Nieprawidłowy JSON, ogromny rysunek, cykl rodziców        | Kontrolowany błąd bez częściowego zapisu                      |
| Dokument z niebezpieczną treścią, niedozwolony URL        | Bezpieczne odrzucenie lub oczyszczenie zgodnie z polityką     |
| Wylogowanie, wyłączenie konta, zmiana hasła               | Sesja serwerowa faktycznie przestaje działać                  |
| Restore backupu na czyste środowisko                      | Odzyskane projekty, powiązania i dostępne pliki               |

Istniejące testy w `tests/blocks.test.mjs` i `tests/canvas-touch.test.mjs` obejmują m.in. operacje bloków, historię, geometrię, preferencje i dotyk. Są bazą do regresji, ale nie dowodzą działania sesji, transakcji, bezpieczeństwa API ani odtwarzania backupów. Warto dodać integracyjne testy API z prawdziwym PostgreSQL oraz kilka E2E: login → edycja → odświeżenie → drugi użytkownik → konflikt → ponowny odczyt.

### Przygotowanie środowiska

- Osobne środowiska development, staging i production; jawne migracje bazy i próba na staging.
- HTTPS; najlepiej frontend i `/api` pod jednym originem. Sekrety wyłącznie w backendzie; zmienne `VITE_*` traktować jako publiczne.
- Backendowy limit body, rate limiting, polityka źródeł embedów i konfiguracja CSP. Jeśli powstanie serwerowe pobieranie podglądów URL, osobno zabezpieczyć je przed SSRF, prywatnymi adresami i niekontrolowanymi przekierowaniami.
- Backup PostgreSQL i plików, retencja oraz przećwiczone odtwarzanie. Ustalić akceptowalną utratę danych i czas odzyskania.
- Logi z identyfikatorem żądania, metryki błędów i opóźnień, alarmy nieudanych zapisów; bez haseł, cookie i pełnych prywatnych dokumentów w logach.
- Plan wdrożeń kompatybilnych wstecz: najpierw rozszerzenie schematu, potem nowy kod, na końcu usuwanie starych pól po migracji danych.

## 11. Kolejność prac

1. **Zabezpieczyć obecne dane:** eksport, walidacja, wersjonowanie formatu i testy migracji; rozdzielić repozytorium od UI.
2. **Zbudować fundament backendu:** PostgreSQL, migracje, konta, sesje, projekty, członkostwo i tablice; test izolacji dwóch użytkowników.
3. **Podłączyć itemy:** wspólne rekordy + walidowane `data`, relacje, transakcje, rewizje i stany zapisu w UI. Najpierw proste bloki, potem kolumny, ramki i diagramy.
4. **Domknąć istniejące funkcje:** komentarze, tagi, wygląd, wyszukiwanie, kosz, bezpieczne undo; import wszystkich typów.
5. **Przygotować produkcję:** testy E2E, obciążenie na reprezentatywnych tablicach, backup/restore, monitoring i próbne wdrożenie.
6. **Rozwijać według potrzeb:** upload, wspólne zadania, powiadomienia, zespoły i współedycja. Model danych ma umożliwiać ten rozwój, ale nie trzeba implementować go całego przed pierwszym uruchomieniem.

Największe ryzyka obecnej migracji to logowanie demonstracyjne, zapis całych projektów, zagnieżdżone itemy i utrata zmian przy równoczesnym zapisie. Rozwiązanie tych czterech obszarów da większą korzyść niż wcześniejsze dodawanie kolejnych typów bloków.

## 12. Weryfikacja podczas przygotowania dokumentu

- `npm run format` i `npm run format:check`: zakończone poprawnie.
- `npm test`: 65 testów zaliczonych, 0 błędów. W logu pojawił się komunikat o zajętym porcie WebSocket 24678; nie przerwał testów. Warto odizolować porty/HMR serwerów testowych, aby log był jednoznaczny.
- `npm run build`: kompilacja TypeScript i build Vite zakończone poprawnie.
- Analiza obejmowała kod i powyższe kontrole, bez ręcznego sprawdzania wszystkich ekranów w przeglądarce i bez testów backendu, którego jeszcze nie wdrożono.
