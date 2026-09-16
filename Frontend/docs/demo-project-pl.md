# Demo, eksport i import

Źródło domyślnego demo to `src/entities/project/demoProjects.ts`, obiekt `nodexMeshDemoProject`.
Można nadal edytować jego nazwę, elementy i układ. Nowa struktura zapisu nie wymaga zmiany
formatu tego pliku: adapter przekształca projekt w rekordy projektu, tablicy i elementów.

W trybie mock aktualny zapis znajduje się pod `nodexmesh_api_mock_v1_<userId>` w localStorage.
Stare klucze projektów nie są odczytywane ani migrowane. Demo jest tworzone dla konta demo,
gdy brakuje aktualnego klucza. Pusta lista projektów w istniejącym zapisie nie uruchamia demo.
Pozostałe konta dostają swój standardowy pusty projekt.

## Aktualizacja demo z aplikacji

1. Przygotuj projekt w edytorze i wybierz **Export JSON** w górnym pasku.
2. Otwórz JSON i skopiuj obiekt z pola `project` jako wartość `nodexMeshDemoProject`
   w `src/entities/project/demoProjects.ts`. Zachowaj importy i eksport tablicy `demoProjects`.
   Ustaw `ownerId: DEMO_USER_ID`.
3. Uruchom `npm run format`, `npm test` i `npm run build`, a następnie opublikuj nową wersję aplikacji.
4. Zamknij pozostałe karty aplikacji i wybierz **Reset demo** w menu konta.
   Po ponownym zalogowaniu na konto demo zostanie wczytany aktualny projekt z pliku.

Sam import JSON dodaje projekt do bieżącego konta; nie zmienia źródła demo w repozytorium.
Import nadaje nowe identyfikatory i zachowuje wewnętrzne powiązania. Nie nadpisuje innych projektów.
Format eksportu to `nodexmesh-project`, wersja 1; import przyjmuje ten format (maksymalnie 20 MB).
Eksport obejmuje aktualną zawartość projektu, także zmiany oczekujące na zapis. Nie obejmuje
ustawień wyglądu użytkownika, historii rewizji ani plików hostowanych pod zewnętrznymi adresami.

## Reset

W trybie mock reset czeka na kończący się zapis, zatrzymuje oczekujące zapisy, wywołuje
`localStorage.clear()` i przeładowuje stronę. Usuwa wszystkie klucze bieżącego originu,
w tym projekty wszystkich lokalnych kont, stare klucze i ustawienia wyglądu.
Nie usuwa danych innych domen, ciasteczek ani sessionStorage. Logowanie mock istnieje
w pamięci, więc przeładowanie wymaga ponownego logowania. Nowy zapis powstaje po zalogowaniu.

W trybie HTTP reset zachowuje dotychczasowe działanie przez API i nie czyści localStorage.
