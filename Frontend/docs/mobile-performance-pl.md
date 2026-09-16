# Wydajność dużych plansz na telefonach

Audyt kodu: 14 września 2026. Zakres: przesuwanie i skalowanie głównej planszy, renderowanie bloków, pomiary geometrii i koszt ciężkich komponentów. Nie wykonano profilowania na fizycznym telefonie ani pomiaru FPS przed/po. Poniższe priorytety wynikają z kodu; rzeczywisty udział CPU, malowania i pamięci trzeba potwierdzić profilem przeglądarki.

## Wprowadzone usprawnienia

- `createId.ts`: wspólny generator UUID v4 we wszystkich miejscach tworzenia identyfikatorów (projekty, demo, zapis, import, komentarze i bloki). Używa `crypto.randomUUID()` tam, gdzie jest dostępne, a na HTTP korzysta z `crypto.getRandomValues()` i ustawia bity wersji/wariantu UUID. Nie zmienia istniejących ID ani danych użytkownika.
- `YouTubeVideo.tsx`: przed aktywacją pokazuje miniaturę zamiast tworzyć odtwarzacz i ładować YouTube API. Pierwsze kliknięcie „Load video” ładuje kontrolki; odtwarzanie uruchamia użytkownik. Tryb interakcji również aktywuje odtwarzacz. Powrót do przesuwania bloku zachowuje już załadowany odtwarzacz; zmiana filmu resetuje jego stan.
- `ImageBlock.tsx`: obrazy mają `loading="lazy"` i `decoding="async"`. Miniatury filmów korzystają z tych samych wskazówek. Rozmiary bloków są nadal określone niezależnie od pobrania obrazu. Nie dodano wariantów rozdzielczości dla dowolnych zewnętrznych URL.
- `useCanvasMeasurements.ts`: robocza mapa rozmiarów zbiera pomiary, a React otrzymuje jeden niezależny snapshot na klatkę. Początkowy pomiar każdego bloku nie kopiuje już całej mapy. Osobna kopia poprzednich rozmiarów powstaje, gdy faktyczny wzrost treści wymaga auto-layoutu. Odmontowanie anuluje oczekującą publikację. `useProjectItems.ts` zachowuje referencję ramki, która już ma poprawny `zIndex`.
- `CanvasItem.tsx`: zachowanie poddrzewa `ItemWatcher` / `BlockRenderer` przez `useMemo`. Przesunięcie widoku, skala i animacja opakowania nie muszą renderować ponownie zawartości niezmienionego bloku. Wyjątkiem są tytuły sekcji, które celowo dostosowują etykiety do skali. Uchwyt przesuwania nadal skaluje się odwrotnie do zoomu. Zmiany treści, wyboru, wyszukiwania i lokalnego stanu edytora nadal są obsługiwane.
- `Canvas.tsx`: pamiętanie wyników wyszukiwania, dopasowań wewnątrz kolumn, kolejności bloków, rozwiązanej geometrii linii i blokady ruchu ramek. Przesuwanie i zoom nie unieważniają tych wyników. Aktualizacja elementów lub ich zmierzonych rozmiarów nadal odświeża właściwe obliczenia.
- `useCanvasZoom.ts`: stabilna funkcja przeliczania współrzędnych, odczytująca aktualny widok z referencji. Zmiana widoku nie tworzy nowych zależnych funkcji i nie przepina z tego powodu listenerów przeciągania narzędzi.
- `useCanvasTouch.ts`: seria ruchów palca publikuje najnowszy stan kamery przez `requestAnimationFrame`. Pan i zoom z pinch są publikowane razem. Koniec/anulowanie gestu dopina pozycję; odmontowanie planszy usuwa oczekującą aktualizację. To ograniczenie częstotliwości publikacji, a nie gwarancja 60 FPS.

Pamiętanie węzłów JSX pozwala Reactowi pominąć ponowne renderowanie niezmienionego poddrzewa: [dokumentacja React](https://react.dev/reference/react/useMemo#memoizing-individual-jsx-nodes). Harmonogram aktualizacji korzysta z [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), powiązanego z odświeżaniem ekranu.

## Co nadal ogranicza wydajność

`Canvas.tsx` nadal montuje wszystkie elementy projektu. Przy oddaleniu rośnie liczba widocznych szczegółów: pól tekstowych, wierszy list, kart, ścieżek SVG, obrazów i odtwarzaczy. Pamiętanie renderu React nie usuwa tych węzłów z DOM ani nie eliminuje kosztu ich malowania i pamięci.

`DocumentBlock.tsx` tworzy instancję Tiptap również w trybie podglądu. `DiagramBlock.tsx` ma widok React Flow. Filmy tworzą odtwarzacz dopiero po aktywacji. Lazy import bloków już istnieje, lecz gdy blok jest zamontowany, jego kod i zasoby nadal mogą być potrzebne.

LOD i pomijanie bloków poza ekranem pozostają kolejnym etapem. Wymagają zachowania stanu aktywnych edytorów, rzeczywistych wymiarów bloków oraz przywracania DOM dla wyników wyszukiwania. Obecne zmiany nie odmontowują bloków w zależności od kamery.

## Błąd danych podczas testów na telefonie przez HTTP

Użytkownik potwierdził otwieranie aplikacji przez HTTP. Wszystkie trzy ścieżki — inicjalizacja demo, tworzenie projektu i zapis mutacji — wywoływały bezpośrednio `crypto.randomUUID()`. API wymaga bezpiecznego kontekstu, więc adres HTTP w sieci lokalnej może go nie udostępniać, mimo że localhost na komputerze działa. Fallback `getRandomValues()` działa także w niezabezpieczonym kontekście: [randomUUID](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID), [getRandomValues](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues).

Test regresji usuwa dostęp do `randomUUID`, zachowując kryptograficzny generator losowy. Przed poprawką odtwarzał stan błędu przy ładowaniu demo. Po poprawce sprawdza demo, nowy projekt ze wszystkimi typami bloków, zapis, ponowne wczytanie i zgodność UUID v4. Nie jest to test na fizycznym telefonie ani potwierdzenie dostępności pamięci przeglądarki na każdym urządzeniu.

## Kolejność dalszych prac

| Priorytet | Zmiana                                         | Plan i ograniczenia                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Uproszczony podgląd przy oddaleniu (LOD)       | Gdy blok ma niewiele pikseli na ekranie, pokazać jego kolor, tytuł i skrót zamiast całej zawartości. Zacząć od dokumentów, diagramów, kanbanów i długich checklist. Przykładowy próg 30–40% jest punktem do eksperymentu, nie gotową wartością. Lepiej uwzględniać też rozmiar bloku na ekranie. Dodać różne progi wejścia/wyjścia, aby uniknąć migotania przy granicy. Pełna treść wraca przy zbliżeniu lub rozpoczęciu edycji.                                                                                          |
| 2         | Pomijanie bloków poza ekranem                  | Wyliczać prostokąt widoku w układzie planszy i dodać zapas na płynny przesuw. W pierwszej wersji wystarczy filtrowanie; indeks przestrzenny dopiero przy wykazanym koszcie skanowania. Zachować aktywnie edytowane/przeciągane bloki i ich stan. Linie oceniać według obu rozwiązanych końców, również gdy oba połączone bloki są poza ekranem. Ramka przecinająca widok i wysunięta etykieta też muszą pozostać widoczne. Przy widoku całej planszy ta zmiana pomoże mniej niż LOD.                                      |
| 3         | Lekkie podglądy, ciężkie edytory na żądanie    | Dokument wyświetlać jako bezpiecznie przygotowany podgląd, Tiptap montować podczas edycji. Diagram pokazywać jako SVG/miniaturę i przełączać na edytor po wejściu w edycję. Film może początkowo pokazywać miniaturę z przyciskiem odtwarzania. Ustalić zachowanie trwającego odtwarzania po wyjściu poza ekran. Zachować wygląd, fokus i niezapisane zmiany przy przełączeniach.                                                                                                                                         |
| 4         | Oddzielenie kamery od całego drzewa strony     | Pan/zoom żyją obecnie w `BoardPage`, więc gest rozpoczyna render od strony. Rozważyć wydzielony stan widoku i warstwę transformacji aktualizowaną raz na klatkę. Rzadziej odświeżać warstwę zawartości. Zachować wspólne źródło współrzędnych dla drop, resize, lasso i wyszukiwania. Najpierw profiler powinien potwierdzić, ile czasu po obecnych zmianach zajmują opakowania i reszta strony.                                                                                                                          |
| 5         | Aktualizacje danych i geometria podczas edycji | `useProjectItems.ts` normalizuje całą tablicę przy aktualizacji, a `ItemHistory` serializuje zmienione snapshoty. Zachowywać referencje niezmienionych elementów i grupować zmiany wielu bloków. `resolveLineItem` szuka końców przez `find`; wspólna mapa ID → blok może ograniczyć koszt przy wielu liniach. `useCanvasMeasurements` kopiuje mapę rozmiarów przy każdej zmianie: rozważyć jeden zbiorczy zapis pomiarów na klatkę. To dotyczy głównie edycji i montowania, nie samego pan/zoom z niezmienionymi danymi. |
| 6         | Obrazy i koszt malowania                       | `ImageBlock.tsx` używa oryginalnego URL bez wariantów miniatur. Wprowadzić dobrane rozdzielczości, asynchroniczne dekodowanie i ładowanie według widoczności. Przy małej skali ograniczyć drobne detale, cienie i filtry po potwierdzeniu ich kosztu w profilu. Rozważyć rzadszą siatkę przy dużym oddaleniu. Nie wymuszać osobnej warstwy GPU przez `will-change` na każdym bloku, bo zwiększa to zapotrzebowanie na pamięć.                                                                                             |

Najpierw wdrożyłbym LOD dla najcięższych bloków, następnie pomijanie obiektów poza ekranem. Przepisanie całej aplikacji na Canvas/WebGL nie jest potrzebne do pierwszych etapów.

## Pułapki przy pomijaniu i upraszczaniu bloków

Obecny `ItemWatcher` dostarcza rozmiary do układania elementów i powiększania ramek. Placeholder musi zachować ostatni rzeczywisty rozmiar; nie wolno potraktować miniatury jako nowego rozmiaru dokumentu i uruchomić na tej podstawie auto-layoutu. Potrzebne są rozmiary przybliżone dla bloków jeszcze niezmierzonych oraz ich późniejsze uzupełnienie.

Nie odmontowywać edytowanego pola bez przeniesienia lokalnego stanu. Nawigacja do wyniku wyszukiwania w kolumnie korzysta obecnie z elementu DOM: po wirtualizacji musi najpierw przywrócić właściwy blok lub korzystać z modelu geometrii. Należy też przetestować druk/eksport, zaznaczanie, linie przecinające ekran, undo oraz wejście do edytora po przybliżeniu.

`content-visibility: auto` można zbadać jako eksperyment pośredni: [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility). Pozostawia elementy w DOM i nie zastępuje uproszczonego widoku wielu elementów widocznych jednocześnie. Nie dodano go w ciemno ze względu na zależności od pomiarów i zawartość wychodzącą poza obrys bloku.

## Jak zmierzyć efekt

1. Używać produkcyjnego buildu przez `npm run build` i `npm run preview`, z tą samą planszą oraz urządzeniem przed i po zmianie.
2. Przygotować kopie testowe: 100, 300 i 1000 bloków. Osobno proste notatki, dokumenty/diagramy i obrazy. Uwzględnić jedną dużą kolumnę z setkami dzieci, bo sama liczba bloków najwyższego poziomu nie opisuje kosztu DOM.
3. Powtórzyć kilkukrotnie kilkusekundowe przesuwanie przy 100%, 50% i 25%, a następnie pinch. Osobno zmierzyć pierwszy widok i widok z załadowanymi zasobami.
4. Na rzeczywistym Androidzie/iPhonie zebrać czasy klatek, długie zadania, scripting, layout/paint, liczbę węzłów DOM i pamięć. Emulacja rozmiaru telefonu na komputerze nie odtwarza mobilnego GPU i limitów pamięci.
5. W React Profiler sprawdzić, czy niezmienione `BlockRenderer` pomijają render przy pan/zoom; przy tytułach sekcji zmiana podczas zoomu jest celowa. Następnie odróżnić koszt renderowania React od malowania przeglądarki.
6. Sprawdzić kliknięcie/edycję po geście, chwytanie i zmianę rozmiaru, przeciąganie z paska narzędzi, przewijanie wnętrza bloków, przejście do wyników wyszukiwania i undo. Dla 60 Hz punktem odniesienia jest około 16,7 ms na całą klatkę; wynik oceniać także po najwolniejszych klatkach, nie tylko średnim FPS.

Tabela priorytetów opisuje kierunki audytu; części z punktów 3, 5 i 6 są już wdrożone zgodnie z listą powyżej. Normalizacja liczb ma już pamięć opartą o `WeakMap`, a członkostwo ramek zachowuje niezmienione referencje; dalsze usprawnienia tej ścieżki należy oprzeć na pomiarach.

## Weryfikacja wykonanych zmian

- `npm test`: 97/97 testów przeszło, w tym scenariusz HTTP bez `randomUUID` oraz wcześniejsze testy grupowania ruchów kamery, końcowej pozycji i czyszczenia oczekujących aktualizacji.
- `npm run format` i `npm run format:check`: wykonano formatowanie i sprawdzenie zgodności.
- `npm run build`: sukces. Główny JS ma około 562 kB przed gzip i 168 kB po gzip; Vite zgłasza ostrzeżenie rozmiaru. Podział paczki to osobna optymalizacja uruchamiania aplikacji, nie rozwiązanie kosztu malowania oddalonej planszy.
- `npm run lint`: nie uruchamia analizy, ponieważ repozytorium nie zawiera `eslint.config.*` wymaganego przez zainstalowany ESLint.
- Testy wypisały konflikt portu WebSocket 24678; zakończyły się kodem 0, bez nieudanych testów.
- Brak pomiaru FPS przed/po i testu gestów na fizycznym urządzeniu. Testy automatyczne potwierdzają logikę gestów, nie rzeczywistą płynność przeglądarki.
