import { Project } from "@/entities/project/types";
import { DEMO_USER_ID } from "@/entities/user/mockUsers";

export const nodexMeshDemoProject: Project = {
  "id": "proj-ky59535z",
  "name": "NodexMesh",
  "color": "#059669",
  "ownerId": DEMO_USER_ID,
  "items": [
    {
      "id": "jhoo2wm3",
      "x": 2060,
      "y": 1212,
      "zIndex": 1,
      "type": "frame",
      "title": "Preview DEMO",
      "width": 1272,
      "height": 692,
      "color": "#059669"
    },
    {
      "id": "8n9j475u",
      "x": 988,
      "y": 1436,
      "zIndex": 2,
      "type": "frame",
      "title": "Większe plany na przyszłość",
      "width": 792,
      "height": 472,
      "color": "#FFBD65"
    },
    {
      "id": "i1ic5c0b",
      "type": "frame",
      "x": 1820,
      "y": 252,
      "zIndex": 3,
      "title": "Plany na najbliższe prace",
      "width": 2008,
      "height": 673.5,
      "color": "#FF6B8A"
    },
    {
      "id": "vrnbdk31",
      "type": "frame",
      "x": 444,
      "y": 252,
      "zIndex": 4,
      "title": "Opis Aplikacji NodexMesh",
      "width": 1336,
      "height": 1076,
      "color": "#97B6E7",
      "typography": {
        "fontSize": 14,
        "textAlign": "left"
      },
      "opacity": 0.3
    },
    {
      "id": "fz0c7s26",
      "x": 1856,
      "y": 288,
      "zIndex": 5,
      "typography": {
        "fontSize": 14
      },
      "type": "kanban",
      "title": "NodexMesh TODO",
      "width": 1184,
      "columns": [
        {
          "id": "waafkgha",
          "title": "To Do",
          "color": "#5a8a94",
          "cards": [
            {
              "id": "ag14xie",
              "text": "Sprawdzić czy wszędzie są odpowiednie animacje i je w razie potrzeby dodać",
              "done": false
            },
            {
              "id": "yt3uz0x",
              "text": "Sprawdzić i dodać gdzie trzeba odpowiednie kursory (Do przycisków itd)",
              "done": false
            },
            {
              "id": "xa2w1pl",
              "text": "Dodać rozszerzenie kolumn do szerokości kanban",
              "done": false
            },
            {
              "id": "mzg9w9m",
              "text": "Zaimplementować śmietnik dla projektów oraz usuwanie i przywracanie projektów",
              "done": false
            },
            {
              "id": "j989dq3",
              "text": "Dodać możliwość zmiany nazwy projektu",
              "done": false
            },
            {
              "id": "jcwk1cz",
              "text": "Dodać nowy item Divider",
              "done": false
            },
            {
              "id": "lc89o0h",
              "text": "Czasem się buguje appbar i znika",
              "done": false
            },
            {
              "id": "dtkgah5",
              "text": "Zmienić dark mode background na bardziej szary",
              "done": false
            }
          ],
          "width": 349
        },
        {
          "id": "z008qcwm",
          "title": "In Progress",
          "color": "#FFBD65",
          "cards": [
            {
              "id": "uxtrljz",
              "text": "Do allign itemow dodac allign tekstu na srodku kartki ale z wertylaknej strony",
              "done": false
            },
            {
              "id": "0fleed0",
              "text": "Naprawić przenoszenie i spodziewanie się gdzie wyląduje item, aby pokazywało bieżący rozmiar, a nie ten domyślny",
              "done": false
            },
            {
              "id": "a91280v",
              "text": "Dodać długie kreski przy przenoszeniu na bokach, aby móc dostosować pion i poziom względem odległych innych itemów",
              "done": false
            },
            {
              "id": "5g5xe83",
              "text": "Dodać do checklist auto fit",
              "done": false
            },
            {
              "id": "2s6ddz0",
              "text": "Naprawić wysokość taska w checklisćie",
              "done": false
            },
            {
              "id": "yiw3ydt",
              "text": "Zwiększyć domyślną szerokość itemów na większą",
              "done": false
            },
            {
              "id": "3dpm65t",
              "text": "Podgląd środka itemu podczas przenoszenia dla wygodniejszego ustawienia względem reszty itemów na planszy",
              "done": false
            }
          ],
          "width": 395
        },
        {
          "id": "zgnt2ozl",
          "title": "Done",
          "color": "#7C3AED",
          "cards": [],
          "width": 351
        }
      ],
      "color": "#292929",
      "topColor": "#FF6B8A"
    },
    {
      "id": "c7hevjx8",
      "x": 1424,
      "y": 64,
      "zIndex": 6,
      "typography": {
        "textAlign": "center",
        "fontSize": 30,
        "italic": true
      },
      "type": "text",
      "content": "Aplikacja jako darmowa alternatywa dla Milanote",
      "size": "lg",
      "width": 720,
      "textAlign": "center",
      "height": 60,
      "color": "#eff6ff"
    },
    {
      "id": "knd7gvxt",
      "x": 1616,
      "y": -5.329070518200751e-15,
      "zIndex": 7,
      "typography": {
        "fontSize": 40,
        "textAlign": "center",
        "bold": true
      },
      "type": "text",
      "content": "NodexMesh",
      "size": "lg",
      "width": 336,
      "textAlign": "center",
      "height": 74,
      "color": "#fefce8"
    },
    {
      "id": "dviwz17p",
      "x": 1024,
      "y": 288,
      "zIndex": 8,
      "typography": {
        "textAlign": "center"
      },
      "type": "note",
      "content": "Aplikacja jest przede wszystkim ciekawą alternatywą dla znanego systemu\nMilanote\n\nDocelowo ma to być dostępne dla każdego i łatwe do uruchomienia w lokalnym środowisku przy pomocy\nDocker Compose",
      "color": "#fdf4ff",
      "width": 320
    },
    {
      "id": "7linteq0",
      "x": 1424,
      "y": 288,
      "zIndex": 9,
      "typography": {
        "bold": false,
        "fontSize": 14,
        "textAlign": "center"
      },
      "type": "note",
      "content": "NodexMesh\nposiadać będzie bardzo podobne funkcjonalności, tak aby przyjemnie i wygodnie używało się systemu.\nNatomiast będą tu zaimplementowane dodatkowe narzędzia i QoL funkcjonalności takie jak:\n\n- Rozszerzalny Kanban\n- Ładne animacje i status tasków i innych\n- Grupowanie\n- Edit bar z wieloma możliwościami\n\nAplikacja będzie cały czas rozwijana i wspierana oraz darmowa, co oznacza, że można zgłaszać błędy i spodziewać się aktualizacji z poprawkami.\nMożna również dołączyć do współtworzenia systemu i na stronie projektu",
      "color": "#fce7f3",
      "width": 320
    },
    {
      "id": "t2kf54un",
      "x": 1424,
      "y": 816,
      "zIndex": 10,
      "type": "link",
      "url": "https://github.com/Lewan24/NodexMesh",
      "title": "Nodex Mesh",
      "description": "Github project",
      "width": 320,
      "height": 144,
      "color": "#F7CAE3",
      "topColor": "#7C3AED"
    },
    {
      "id": "k2i1bpy4",
      "x": 1424,
      "y": 960,
      "zIndex": 11,
      "typography": {
        "textAlign": "center"
      },
      "type": "note",
      "content": "można ściągnąć swój FORK, ulepszyć kod, dodać potrzebne funkcjonalności, czy poprawki i poprosić o\nPull Request",
      "color": "#fce7f3",
      "width": 320,
      "topColor": "#7C3AED"
    },
    {
      "id": "5zgnx7u7",
      "x": 1024,
      "y": 560,
      "zIndex": 12,
      "typography": {
        "textAlign": "center"
      },
      "type": "note",
      "content": "Wszystkie potrzebne informacje, komendy i zalecenia do i podczas uruchomienia są na stronie projektu",
      "color": "#FDF4FF",
      "width": 320
    },
    {
      "id": "wnlimxmh",
      "x": 1311.7281932048302,
      "y": 691,
      "zIndex": 13,
      "type": "line",
      "x2": 1424,
      "y2": 856.7291932966494,
      "arrowStart": false,
      "arrowEnd": true,
      "color": "#7C3AED",
      "strokeWidth": 3,
      "startItemId": "5zgnx7u7",
      "endItemId": "t2kf54un"
    },
    {
      "id": "ma7sbdlx",
      "x": 1024,
      "y": 752,
      "zIndex": 14,
      "typography": {
        "textAlign": "center"
      },
      "type": "note",
      "content": "Aplikacja nie jest idealna, jest cały czas w trakcie tworzenia i ulepszania, ale ma potencjał, jest aktualnie działające demo, które może uruchomić każdy na swojej przeglądarce.\n\nWszystkie dane w demo są trzymane tylko i wyłącznie w pamięci przeglądarki, więc jest możliwość, że przy którejś aktualizacji wprowadzone zmiany i dane w wersji DEMO, znikną.\n\nJeżeli chcemy zresetować dane wystarczy wyczyścić pamięć lokalną w narzędziach dewelopera lub pod przyciskiem F12\nEwentualnie w menu użytkownika w \nPrawym górnym rogu jest przycisk\nResetuj DEMO",
      "color": "#fff7ed",
      "width": 320
    },
    {
      "id": "zk08gdfv",
      "x": 2096,
      "y": 1248,
      "zIndex": 15,
      "typography": {
        "textAlign": "center"
      },
      "type": "image",
      "url": "https://github.com/Lewan24/NodexMesh/blob/main/Assets/Preview.png?raw=true",
      "caption": "https://github.com/Lewan24/NodexMesh/blob/main/Assets/Preview.png",
      "width": 1200,
      "imgHeight": 592,
      "color": "#ffffff",
      "variant": "card",
      "height": 592
    },
    {
      "id": "u9oshol5",
      "x": 1024,
      "y": 1472,
      "zIndex": 16,
      "typography": {
        "fontSize": 16,
        "textAlign": "left"
      },
      "type": "checklist",
      "title": "Plany na przyszłość",
      "color": "#f0fdf4",
      "width": 720,
      "entries": [
        {
          "id": "ocr2hdf",
          "text": "Kolaboracja (SignalR czy coś w tym rodzaju)",
          "done": false
        },
        {
          "id": "l5nz2sg",
          "text": "API w C# dotnet 10",
          "done": false
        },
        {
          "id": "v6yxm1r",
          "text": "OWASP top 10 przy implementacji API",
          "done": false
        },
        {
          "id": "orzndok",
          "text": "Zarządzanie projektami",
          "done": false
        },
        {
          "id": "iu56k6t",
          "text": "Własne motywy kolorów aplikacji",
          "done": false
        },
        {
          "id": "d7lzmx1",
          "text": "Dodanie ogólnego śmietnika na itemy, z którego można przywrócić wcześniej usunięte elementy",
          "done": false
        },
        {
          "id": "oulcpo7",
          "text": "Implementacja exportu i importu projektów między instancjami NodexMesh",
          "done": false
        },
        {
          "id": "djyv3l0",
          "text": "Udostępnianie projektu tylko do odczytu",
          "done": false
        },
        {
          "id": "9dbhmvw",
          "text": "Wyświetlanie zdjęć z swojej biblioteki, zamiast linka (link opcjonalnie)",
          "done": false
        }
      ],
      "height": 400,
      "topColor": "#7C3AED"
    },
    {
      "id": "92oyuwgd",
      "x": 1584,
      "y": 1248,
      "zIndex": 17,
      "type": "line",
      "x2": 1878.599797175519,
      "y2": 838.5,
      "arrowStart": true,
      "arrowEnd": true,
      "color": "#7C3AED",
      "strokeWidth": 3,
      "startItemId": "u9oshol5",
      "endItemId": "fz0c7s26"
    },
    {
      "id": "8hmoxq25",
      "x": 480,
      "y": 560,
      "zIndex": 18,
      "typography": {
        "textAlign": "center"
      },
      "type": "note",
      "content": "API stworzone będzie w\nC# .NET 10\n\nAPI przewiduje implementację bezpiecznego systemu, wykorzystującego listę\nOWASP Top 10\n\nAPI stworzone będzie jako osobny kontener, będzie wszystko zawarte w jednym pliku\ndocker-compose.yml\naby w łatwy sposób uruchomić cały system, bez problemu aktualizować kontenery itd.\n\nCała potrzebna instrukcja, zalecenia, ważne informacje itd. są zawarte w projekcie w odpowiednich miejscach na stronie github.",
      "color": "#fdf4ff",
      "width": 448
    },
    {
      "id": "uiusigoi",
      "x": 608,
      "y": 496,
      "zIndex": 19,
      "typography": {
        "textAlign": "center",
        "bold": true,
        "fontSize": 32
      },
      "type": "text",
      "content": "Api",
      "size": "lg",
      "width": 192,
      "textAlign": "center",
      "topColor": "#7C3AED",
      "color": "#eff6ff"
    },
    {
      "id": "ltbomker",
      "x": 3104,
      "y": 288,
      "zIndex": 20,
      "type": "checklist",
      "title": "Nowe narzędzia",
      "color": "#eff6ff",
      "width": 688,
      "entries": [
        {
          "id": "bpsxu1m",
          "text": "Divider",
          "done": false
        },
        {
          "id": "3t7tqwo",
          "text": "Komentarze ogólne oraz takie do konkretnych itemów",
          "done": false
        },
        {
          "id": "o60omj0",
          "text": "Napisy na strzałkach",
          "done": false
        },
        {
          "id": "amauumq",
          "text": "Mind Map coś z połączeniami, auto układem itd",
          "done": false
        },
        {
          "id": "pvgvj3s",
          "text": "Tagi do przypisywania do itemów oraz podświetlanie itemów gdy zaznaczymy dany tag",
          "done": false
        },
        {
          "id": "c56kuez",
          "text": "Filtr i szukanie na planszy konkretnych napisów, tagów itd",
          "done": false
        },
        {
          "id": "zy10hcl",
          "text": "Zakładki, do zapisania istotnego miejsca na później, które jest na liście gdzieś obok",
          "done": false
        },
        {
          "id": "nei5eao",
          "text": "IconBlock - jak nazwa mówi, własne ikonki do wyboru lub z linka",
          "done": false
        },
        {
          "id": "gyivr8p",
          "text": "CodeBlock - do ładnego wyświetlenia kodu z wyborem języka i jego domy,slnymi kolorami",
          "done": false
        },
        {
          "id": "c66tsis",
          "text": "EmbedBlock - do wyświetlnenia np filmu z yt, obrazu czy strony internetowej",
          "done": false
        },
        {
          "id": "598ijs7",
          "text": "Menu z wyborem typu kopiuj, wklej, duplikuj, usun itd",
          "done": false
        },
        {
          "id": "72063ld",
          "text": "Blokowanie itemu, żeby przypadkiem go nie przesunąć",
          "done": false
        },
        {
          "id": "qr6jjla",
          "text": "Ulepszenie Note dodając source dla linku i auto otwarcie",
          "done": false
        },
        {
          "id": "m6h1l06",
          "text": "Sub Board node / portal do otworzenia nowego canvasu, lub przejscie do innego projektu",
          "done": false
        },
        {
          "id": "so2i57x",
          "text": "Auto strzalki do utworzenia przy danym itemie",
          "done": false
        }
      ],
      "topColor": "#059669",
      "height": 592
    }
  ]
};

export const demoProjects: Project[] = [ nodexMeshDemoProject ]