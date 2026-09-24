# Demo, eksport i import

## Źródło i aktualizacja demo

Źródłem domyślnego projektu jest **cały eksport** `Frontend/docs/NodexMesh.json`.
`src/entities/project/demoProjects.ts` importuje ten plik bezpośrednio, ustawia właściciela
na `DEMO_USER_ID` i wybiera główną tablicę według `project.boardId`. Nie trzeba już
przepisywać JSON do TypeScript ani ręcznie zmieniać identyfikatorów.

Aktualny plik ma format `nodexmesh-project`, wersję 2 i trzy tablice: `Board`,
`Database Plan`, `Backend API Plan`. Zawiera obrazy pod adresami HTTPS, emoji i SVG
zapisane w blokach; nie wymaga biblioteki serwerowej. Poprawiono zdublowany adres GIF.

1. Przygotuj projekt w edytorze i wybierz **Export JSON** w górnym pasku.
   Eksport czeka na zapis zmian; przy błędzie zapisu nie pobiera nieaktualnego projektu.
2. Zastąp `Frontend/docs/NodexMesh.json` całym pobranym plikiem w wersji 2.
   Zachowaj obiekt opakowujący (`format`, `version`, `project`) i wszystkie `project.boards`.
   Nie kopiuj samego `project.items`: to tylko główna tablica. Jeśli pole występuje,
   musi odpowiadać elementom głównej tablicy w `boards`.
3. Demo mock powinno używać publicznych adresów HTTPS, wbudowanych ikon, emoji lub SVG.
   Odwołania `library://…` wymagają serwera i dostępu do oryginalnego projektu;
   przed eksportem zastąp je przenośnymi źródłami. Sprawdź też dostępność zewnętrznych mediów.
4. W katalogu `Frontend` uruchom `npm run format`, `npm run format:check`, `npm test`
   i `npm run build`. Testy transferu sprawdzają poprawność pliku, brak odwołań do biblioteki
   w demo, inicjalizację wszystkich tablic oraz eksport i ponowny import.
5. Opublikuj aplikację. Zamknij pozostałe karty i wybierz **Reset demo** w menu konta.
   Po ponownym zalogowaniu na konto demo zostanie utworzony projekt z aktualnego pliku.
   Istniejące dane lokalne nie są automatycznie nadpisywane po wdrożeniu nowej wersji.

Sam import JSON dodaje projekt do bieżącego konta; nie zmienia źródła demo w repozytorium.
Import nadaje nowe identyfikatory projektowi, tablicom, elementom i komentarzom, zachowując
wewnętrzne powiązania. Nie nadpisuje innych projektów. Przy nieudanym zapisie importu
aplikacja próbuje przenieść częściowo utworzony projekt do kosza.

## Biblioteka i pliki w trybie mock

Tryb lokalny włącza `VITE_DATA_SOURCE=mock`. Biblioteka serwerowa jest wtedy wyłączona:
przycisk w pasku aplikacji jest nieaktywny, bloki obrazów nie pokazują przycisku biblioteki,
a wybór biblioteki w edytorze ikon jest nieaktywny. Nadal działają obrazy z URL,
ikony wbudowane, emoji i własny SVG. Pliki nie są przesyłane ani zapisywane w localStorage.
Zaimportowane odwołania do prywatnej biblioteki pozostają w danych, lecz w mock nie można
ich pobrać; należy zmienić źródło obrazu lub ikony.

Projekty są zapisywane pod `nodexmesh_api_mock_v1_<userId>` w localStorage.
Stare klucze projektów nie są odczytywane ani migrowane. Demo jest tworzone dla konta demo,
gdy brakuje aktualnego klucza. Pusta lista projektów w istniejącym zapisie nie uruchamia demo.
Pozostałe konta dostają swój standardowy pusty projekt.

## Zakres eksportu

Import przyjmuje wersję 1 i 2 (maksymalnie 20 MB). Eksport projektu z kolekcją tablic używa
wersji 2; wersja 1 obsługuje starsze projekty z jedną tablicą. Karty do nieobecnych tablic
w wersji 1 są odłączane, ponieważ taki plik nie zawiera ich treści.

Wersja 2 zachowuje nazwy i kolejność aktywnych tablic, ich elementy (również wewnątrz kolumn),
układ, style, treść dokumentów, komentarze, tagi i powiązania elementów oraz tablic.
Nie eksportuje kosza; karty prowadzące do usuniętych tablic stają się niepowiązanymi kartami.
Nie obejmuje ustawień wyglądu użytkownika, domyślnego projektu, członkostwa i uprawnień,
historii rewizji ani pełnych metadanych audytowych. Import nie odtwarza autorstwa komentarzy.

**JSON nie jest archiwum plików biblioteki.** Zapisuje adresy obrazów i źródła ikon,
w tym `library://<projectId>/<assetId>`, ale nie zawartość plików, listę biblioteki,
jej nieużywane pliki ani ustawienia udostępniania. Import nie kopiuje biblioteki do nowego
projektu i nie zmienia jej odwołań. W trybie HTTP takie obrazy wymagają nadal dostępu
do oryginalnej biblioteki i istniejącego pliku. Aplikacja pokazuje informację przy
imporcie lub eksporcie projektu z takimi odwołaniami. Zewnętrzne URL również pozostają
zależne od hostingu; SVG zapisany bezpośrednio w ikonie jest częścią JSON.

Do niezależnej kopii projektu z biblioteką potrzebny byłby osobny format archiwum plików
oraz odtwarzanie biblioteki i mapowanie jej identyfikatorów podczas importu.
Obecny format wersji 2 tego nie realizuje.

## Reset

W trybie mock reset czeka na kończący się zapis, zatrzymuje oczekujące zapisy, wywołuje
`localStorage.clear()` i przeładowuje stronę. Usuwa wszystkie klucze bieżącego originu,
w tym projekty wszystkich lokalnych kont, stare klucze i ustawienia wyglądu.
Nie usuwa danych innych domen, ciasteczek ani sessionStorage. Logowanie mock istnieje
w pamięci, więc przeładowanie wymaga ponownego logowania. Nowy zapis powstaje po zalogowaniu.

W trybie HTTP reset zachowuje dotychczasowe działanie przez API i nie czyści localStorage.
