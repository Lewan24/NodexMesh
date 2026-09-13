import { Project } from '@/entities/project/types';
import { DEMO_USER_ID } from '@/entities/user/mockUsers';

export const nodexMeshDemoProject: Project = {
  "id": "proj-ky59535z",
  "name": "NodexMesh",
  "color": "#059669",
  "ownerId": DEMO_USER_ID,
  "items": [
    {
      "id": "jhoo2wm3",
      "x": 444,
      "y": 1760,
      "zIndex": 0,
      "type": "frame",
      "title": "Preview DEMO",
      "width": 1336,
      "height": 720,
      "color": "#059669",
      "locked": false,
      "frameId": null
    },
    {
      "id": "i1ic5c0b",
      "type": "frame",
      "x": 1872,
      "y": 1088,
      "zIndex": 0,
      "title": "Plans for Upcoming Work",
      "width": 1852.0000000000002,
      "height": 644,
      "color": "#FF6B8A",
      "locked": false,
      "frameId": null
    },
    {
      "id": "vrnbdk31",
      "type": "frame",
      "x": 444,
      "y": 252,
      "zIndex": 0,
      "title": "NodexMesh Application Overview",
      "width": 1336,
      "height": 1268,
      "color": "#97B6E7",
      "typography": {
        "fontSize": 14,
        "textAlign": "left"
      },
      "opacity": 0.3,
      "locked": true,
      "frameId": null
    },
    {
      "id": "fz0c7s26",
      "x": 1884,
      "y": 252,
      "zIndex": 5,
      "typography": {
        "fontSize": 14
      },
      "type": "kanban",
      "title": "NodexMesh TODO now",
      "width": 1208,
      "columns": [
        {
          "id": "waafkgha",
          "title": "Nice to do",
          "color": "#5a8a94",
          "cards": [
            {
              "id": "zzpz9d8",
              "text": "Implement IconBlock",
              "done": false
            },
            {
              "id": "2u90eht",
              "text": "Implement MindMapBlock",
              "done": false
            },
            {
              "id": "4zx3e5p",
              "text": "Make in timeline tasks show and dissappear when moving to the left or right",
              "done": true
            },
            {
              "id": "yzvh7c8",
              "text": "Implement copy style and paste style on items like color or typography and font size",
              "done": true
            },
            {
              "id": "rayp8gu",
              "text": "Change default theme colors to better ones",
              "done": true
            },
            {
              "id": "tzqmat3",
              "text": "Implement arrows flexibility",
              "done": true
            },
            {
              "id": "yiw3ydt",
              "text": "Increase the default item width",
              "done": true
            },
            {
              "id": "dtkgah5",
              "text": "Change the dark mode background to a grayer shade",
              "done": true
            },
            {
              "id": "ag14xie",
              "text": "Check that appropriate animations are used everywhere and add them where needed",
              "done": true
            },
            {
              "id": "cpim6er",
              "text": "Add changing colors in kanban columns",
              "done": true
            },
            {
              "id": "mb8wakd",
              "text": "Implement multi selected drawing to change color and width for all of them",
              "done": true
            },
            {
              "id": "vc8w7n5",
              "text": "Add more funny and nice hand writting fonts",
              "done": true
            },
            {
              "id": "slimjtc",
              "text": "Change new items to be more squares instead of rounded",
              "done": true
            },
            {
              "id": "jcwk1cz",
              "text": "Add a new Divider item",
              "done": true
            }
          ],
          "width": 362
        },
        {
          "id": "z008qcwm",
          "title": "Important",
          "color": "#FFBD65",
          "cards": [
            {
              "id": "0b1svgc",
              "text": "One click on arrow to cleate siblin items dont work on mobile device",
              "done": false
            },
            {
              "id": "xa2w1pl",
              "text": "Add column expansion to match the Kanban width",
              "done": false
            },
            {
              "id": "yt3uz0x",
              "text": "Check and add appropriate cursors where needed (buttons, etc.)",
              "done": false
            },
            {
              "id": "freen8p",
              "text": "Implement horizontal layout for diagram",
              "done": true
            },
            {
              "id": "p76czgy",
              "text": "Check all the code and files and make them better readable for humans",
              "done": true
            },
            {
              "id": "s6m2wv5",
              "text": "Implement column resizing of tasks in timeline",
              "done": true
            },
            {
              "id": "50s1mdp",
              "text": "Implement reordering fields in database block",
              "done": true
            },
            {
              "id": "wqf1aae",
              "text": "Fix Database diagram preview, not working properly connections",
              "done": true
            },
            {
              "id": "dqce2a3",
              "text": "Change editbar colors to accents and make them theme related",
              "done": true
            },
            {
              "id": "2s6ddz0",
              "text": "Fix task height in checklists",
              "done": true
            },
            {
              "id": "49z3gfy",
              "text": "Implement DbDiagramBlock",
              "done": true
            },
            {
              "id": "wxcfqbw",
              "text": "Implement manual cleaning projects trash",
              "done": true
            },
            {
              "id": "6w2tdll",
              "text": "Update readme",
              "done": true
            },
            {
              "id": "5g5xe83",
              "text": "Add auto-fit to checklists",
              "done": true
            },
            {
              "id": "uxtrljz",
              "text": "Add vertical text alignment to item alignment options",
              "done": true
            },
            {
              "id": "yq3wber",
              "text": "Adjust diagramblock",
              "done": true
            },
            {
              "id": "l299uq1",
              "text": "Fix timeline after reordering schedule the milestones should also reorder",
              "done": true
            },
            {
              "id": "jvxy7r4",
              "text": "Fix youtube embed video to edit video settings and captions",
              "done": true
            },
            {
              "id": "zc8c1pm",
              "text": "Add compability to moving checklist items to kanban, and from kanban to checklist (.items are basicaly the same)",
              "done": true
            },
            {
              "id": "43390s8",
              "text": "Fix data-scroll in timeline",
              "done": true
            },
            {
              "id": "q7m9hcm",
              "text": "Implement moving columns in kanban",
              "done": true
            },
            {
              "id": "17z37a1",
              "text": "Fix kanban add cards buttons to be under last task instead of botton of item",
              "done": true
            }
          ],
          "width": 395
        },
        {
          "id": "5g5el7q",
          "title": "Must have",
          "color": "#02A0A0",
          "cards": [
            {
              "id": "o68l4d2",
              "text": "Fix on mobile devices moving items like kanban, now it opens the context menu instead of moving",
              "done": false
            },
            {
              "id": "w9g7qzz",
              "text": "Implement mobile devices compability",
              "done": true
            },
            {
              "id": "kpjus07",
              "text": "Plan database scheme",
              "done": true
            },
            {
              "id": "k8vmx7x",
              "text": "Plan backend",
              "done": true
            },
            {
              "id": "3dpm65t",
              "text": "Show the item center while dragging for easier positioning relative to other items on the board",
              "done": true
            },
            {
              "id": "samse29",
              "text": "Implement theme colors changing and saving that data",
              "done": true
            },
            {
              "id": "a91280v",
              "text": "Add long alignment guides while dragging so items can be aligned vertically and horizontally with distant items",
              "done": true
            },
            {
              "id": "0fleed0",
              "text": "Fix the drag preview so it shows the item’s current size instead of its default size",
              "done": true
            },
            {
              "id": "j989dq3",
              "text": "Add the ability to rename a project",
              "done": true
            },
            {
              "id": "se0mgci",
              "text": "Implement drawing on canvas",
              "done": true
            },
            {
              "id": "9vzcmlx",
              "text": "Change default font family to better one",
              "done": true
            },
            {
              "id": "2a3qdom",
              "text": "Fix timelineblock (implement reordering rows)",
              "done": true
            },
            {
              "id": "2or4ty9",
              "text": "Fix embedBlock for yt videos to instant interact instead of clicking interract",
              "done": true
            },
            {
              "id": "h6dxlug",
              "text": "Fix document block error",
              "done": true
            },
            {
              "id": "lc89o0h",
              "text": "Fix the app bar occasionally bugging out and disappearing",
              "done": true
            },
            {
              "id": "mzg9w9m",
              "text": "Implement a project trash bin with project deletion and restoration",
              "done": true
            }
          ],
          "width": 362
        }
      ],
      "color": "#2E2E2E",
      "topColor": "#FF6B8A",
      "tags": [
        "todo"
      ],
      "locked": false,
      "height": 628,
      "frameId": null,
      "gradient": {
        "from": "#000000",
        "to": "#2d006b",
        "angle": 135,
        "kind": "radial"
      }
    },
    {
      "id": "c7hevjx8",
      "x": 1472,
      "y": 64,
      "zIndex": 6,
      "typography": {
        "textAlign": "center",
        "fontSize": 30,
        "italic": true
      },
      "type": "text",
      "content": "A free alternative to Milanote",
      "size": "lg",
      "width": 720,
      "textAlign": "center",
      "height": 60,
      "color": "#eff6ff",
      "frameId": null
    },
    {
      "id": "knd7gvxt",
      "x": 1664,
      "y": 4,
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
      "color": "#fefce8",
      "frameId": null
    },
    {
      "id": "dviwz17p",
      "x": 1024,
      "y": 288,
      "zIndex": 8,
      "typography": {
        "textAlign": "center",
        "fontFamily": "short-stack"
      },
      "type": "note",
      "content": "The application is primarily a free and interesting alternative to the well-known Milanote platform.\n\nThe goal is to make it available to everyone and easy to run locally using\nDocker Compose",
      "color": "#fdf4ff",
      "width": 320,
      "locked": false,
      "tags": [],
      "comments": [],
      "frameId": "vrnbdk31",
      "colorRole": "default"
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
      "content": "NodexMesh\nThe application will offer many familiar features to make the system pleasant and convenient to use.\nIt will also include additional tools and quality-of-life features such as:\n\n- Expandable Kanban boards\n- Smooth animations and task/item statuses\n- Grouping\n- An edit bar with extensive customization options\n- And much more\n\nThe application will remain free, actively developed, and supported, so you can report bugs and expect updates with fixes.\nYou can also contribute to the project using the project page below:",
      "color": "#fce7f3",
      "width": 320,
      "locked": false,
      "tags": [],
      "frameId": "vrnbdk31",
      "colorRole": "accent4"
    },
    {
      "id": "t2kf54un",
      "x": 1424,
      "y": 896,
      "zIndex": 10,
      "type": "link",
      "url": "https://github.com/Lewan24/NodexMesh",
      "title": "Nodex Mesh",
      "description": "GitHub project",
      "width": 320,
      "height": 144,
      "color": "#F7CAE3",
      "topColor": "#7C3AED",
      "locked": false,
      "frameId": "vrnbdk31",
      "colorRole": "accent3"
    },
    {
      "id": "k2i1bpy4",
      "x": 1424,
      "y": 1088,
      "zIndex": 11,
      "typography": {
        "textAlign": "center"
      },
      "type": "note",
      "content": "Feel free to fork the project, improve the code, add useful features or fixes, and submit a Pull Request. Contributions and collaboration are welcome.",
      "color": "#fce7f3",
      "width": 320,
      "topColor": "#7C3AED",
      "locked": false,
      "frameId": "vrnbdk31",
      "colorRole": "accent4"
    },
    {
      "id": "5zgnx7u7",
      "x": 1024,
      "y": 608,
      "zIndex": 12,
      "typography": {
        "textAlign": "center"
      },
      "type": "note",
      "content": "All required information, commands, and setup recommendations are available on the project page",
      "color": "#FDF4FF",
      "width": 320,
      "locked": false,
      "frameId": "vrnbdk31",
      "colorRole": "accent3"
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
      "endItemId": "t2kf54un",
      "locked": false,
      "frameId": "vrnbdk31"
    },
    {
      "id": "ma7sbdlx",
      "x": 1024,
      "y": 811,
      "zIndex": 14,
      "typography": {
        "textAlign": "center"
      },
      "type": "note",
      "content": "NodexMesh is still under active development and continuous improvement. A working demo is currently available to everyone for free and can be opened directly in a browser using the link in the project’s GitHub repository.\n\nAll demo data is stored exclusively in the browser’s local storage, so changes and data created in the DEMO version may disappear after some updates.\n\nTo reset the data, clear local storage in your browser’s developer tools (F12).\nAlternatively, open the user menu in the top-right corner and use the\nReset DEMO\nbutton.",
      "color": "#fff7ed",
      "width": 320,
      "locked": false,
      "frameId": "vrnbdk31",
      "colorRole": "accent2"
    },
    {
      "id": "zk08gdfv",
      "x": 480,
      "y": 1796,
      "zIndex": 15,
      "typography": {
        "textAlign": "center"
      },
      "type": "image",
      "url": "https://github.com/Lewan24/NodexMesh/blob/main/Assets/Preview.png?raw=true",
      "caption": "https://github.com/Lewan24/NodexMesh/blob/main/Assets/Preview.png",
      "width": 1264,
      "imgHeight": 620,
      "color": "#ffffff",
      "variant": "card",
      "height": 620,
      "locked": false,
      "frameId": "jhoo2wm3"
    },
    {
      "id": "u9oshol5",
      "x": 1908,
      "y": 1124,
      "zIndex": 16,
      "typography": {
        "fontSize": 16,
        "textAlign": "left"
      },
      "type": "checklist",
      "title": "Future Plans",
      "color": "#ffffff",
      "width": 580,
      "entries": [
        {
          "id": "iu56k6t",
          "text": "Custom application color themes",
          "done": true
        },
        {
          "id": "d7lzmx1",
          "text": "Add a global trash bin for items so previously deleted elements can be restored",
          "done": false
        },
        {
          "id": "oulcpo7",
          "text": "Implement project export and import between NodexMesh instances",
          "done": false
        },
        {
          "id": "l5nz2sg",
          "text": "API in C# .NET 10",
          "done": false
        },
        {
          "id": "v6yxm1r",
          "text": "Follow the OWASP Top 10 when implementing the API",
          "done": false
        },
        {
          "id": "9dbhmvw",
          "text": "Display images from the user’s library instead of requiring a link (link optional)",
          "done": false
        },
        {
          "id": "ocr2hdf",
          "text": "Real-time collaboration (SignalR or something similar)",
          "done": false
        },
        {
          "id": "djyv3l0",
          "text": "Read-only project sharing",
          "done": false
        }
      ],
      "topColor": "#7C3AED",
      "tags": [
        "todo"
      ],
      "locked": false,
      "comments": [],
      "frameId": "i1ic5c0b"
    },
    {
      "id": "92oyuwgd",
      "x": 2184.261725508746,
      "y": 1597,
      "zIndex": 17,
      "type": "line",
      "x2": 1934.5997971755196,
      "y2": 1674.5,
      "arrowStart": true,
      "arrowEnd": true,
      "color": "#02A0A0",
      "strokeWidth": 3,
      "startItemId": "i1ic5c0b",
      "endItemId": "fz0c7s26",
      "locked": false,
      "label": "TODO Lists",
      "labelOffset": 21,
      "labelFontSize": 21,
      "labelMode": "follow-line",
      "frameId": "i1ic5c0b"
    },
    {
      "id": "8hmoxq25",
      "x": 480,
      "y": 560,
      "zIndex": 18,
      "typography": {
        "textAlign": "center",
        "fontFamily": "short-stack"
      },
      "type": "note",
      "content": "The API will be built with\nC# .NET 10\n\nThe API is planned as a secure system designed with the\nOWASP Top 10\nin mind.\n\nThe API will run in a separate container, with the whole system defined in a single\ndocker-compose.yml\nfile so the application can be started easily and containers can be updated without hassle.\n\nAll required instructions, recommendations, and important information are available in the relevant sections of the project’s GitHub page.",
      "color": "#fdf4ff",
      "width": 448,
      "tags": [
        "todo"
      ],
      "locked": false,
      "frameId": "vrnbdk31",
      "colorRole": "default"
    },
    {
      "id": "uiusigoi",
      "x": 608,
      "y": 500,
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
      "locked": false,
      "frameId": "vrnbdk31",
      "colorRole": "accent5"
    },
    {
      "id": "ltbomker",
      "x": 2528,
      "y": 1124,
      "zIndex": 20,
      "type": "checklist",
      "title": "New Tools and Functionalities",
      "color": "#ffffff",
      "width": 616,
      "entries": [
        {
          "id": "nei5eao",
          "text": "IconBlock - selectable custom icons or icons loaded from a link",
          "done": false
        },
        {
          "id": "amauumq",
          "text": "Mind Map with connections, automatic layout, etc.",
          "done": false
        },
        {
          "id": "qr6jjla",
          "text": "Improve Note by adding a source link with automatic opening",
          "done": false
        },
        {
          "id": "zy10hcl",
          "text": "Bookmarks for saving important board locations for quick access later",
          "done": false
        },
        {
          "id": "m6h1l06",
          "text": "Sub-board node / portal for opening a new canvas or navigating to another project",
          "done": false
        },
        {
          "id": "21ythq7",
          "text": "DbDiagramBlock - item to plan and prepare version of database like tables, relations etc",
          "done": true
        }
      ],
      "topColor": "#059669",
      "tags": [
        "todo"
      ],
      "locked": false,
      "typography": {
        "fontFamily": "short-stack"
      },
      "frameId": "i1ic5c0b"
    },
    {
      "id": "kpmbh2p6",
      "x": 444,
      "y": 1568,
      "zIndex": 21,
      "typography": {
        "fontSize": 32,
        "textAlign": "center",
        "verticalAlign": "middle"
      },
      "type": "text",
      "content": "Search for #todo in the app bar to display all items marked as tasks",
      "size": "lg",
      "width": 1336,
      "height": 98,
      "color": "#0d2a35",
      "locked": false,
      "frameId": null
    },
    {
      "id": "3pvxvzuq",
      "x": 3191.999999999999,
      "y": 1124,
      "zIndex": 22,
      "type": "checklist",
      "title": "Done",
      "color": "#ffffff",
      "width": 496,
      "entries": [
        {
          "id": "72063ld",
          "text": "Lock items to prevent accidental movement",
          "done": true
        },
        {
          "id": "pvgvj3s",
          "text": "Assign tags to items and highlight items when a tag is selected",
          "done": true
        },
        {
          "id": "o60omj0",
          "text": "Labels on arrows",
          "done": true
        },
        {
          "id": "so2i57x",
          "text": "Automatically create arrows from a selected item",
          "done": true
        },
        {
          "id": "3t7tqwo",
          "text": "General comments and comments attached to specific items",
          "done": true
        },
        {
          "id": "c56kuez",
          "text": "Filter and search the board for specific text, tags, etc.",
          "done": true
        },
        {
          "id": "bpsxu1m",
          "text": "Divider",
          "done": true
        },
        {
          "id": "60ud6af",
          "text": "Something like cards dispenser in miro - block with cards, label and card color, dragging card is creating a note with center justify in vertical and horizontal",
          "done": true
        },
        {
          "id": "38tk5lp",
          "text": "One click on arrow creates same empy item like note creates a note with its color and settings etc and attachted arrow",
          "done": true
        },
        {
          "id": "byei7z5",
          "text": "DocumentBlock - more advanced note with specific lines and text styles etc",
          "done": true
        },
        {
          "id": "c66tsis",
          "text": "EmbedBlock - display content such as a YouTube video, image, or website",
          "done": true
        },
        {
          "id": "y63zrkm",
          "text": "DiagramBlock",
          "done": true
        },
        {
          "id": "gyivr8p",
          "text": "CodeBlock - nicely formatted code display with language selection and default syntax highlighting",
          "done": true
        },
        {
          "id": "orzndok",
          "text": "Project management",
          "done": true
        },
        {
          "id": "w46u0a1",
          "text": "TimelineBlock - version simple with just date and label and more advances with weeks, tasks etc",
          "done": true
        },
        {
          "id": "598ijs7",
          "text": "Context menu with actions such as copy, paste, duplicate, delete, etc.",
          "done": true
        },
        {
          "id": "qtwpqqz",
          "text": "Add more font families, more funny ones, some for like hand writing or sans serif etc",
          "done": true
        },
        {
          "id": "80d2lhr",
          "text": "Drawing - drawing on canvas",
          "done": true
        }
      ],
      "locked": false,
      "height": 544,
      "frameId": "i1ic5c0b"
    },
    {
      "id": "nq1ujv06",
      "x": 4560,
      "y": 252,
      "zIndex": 23,
      "type": "timeline",
      "title": "NodexMesh todo timeline",
      "mode": "schedule",
      "tasks": [
        {
          "id": "ef360f79-b293-4239-8cae-d64f9d28c901",
          "title": "Fix now problems (kanban)",
          "start": "2026-09-10",
          "end": "2026-09-10",
          "done": true,
          "color": "#000000",
          "checklist": [
            {
              "id": "dd9ab26f-e7f1-470a-b02e-351c8c1957ad",
              "text": "DocumentBlock is throwing error",
              "done": true
            },
            {
              "id": "6e75d746-5ee3-49b6-9f93-f2bf448df615",
              "text": "Add more fonts to app",
              "done": true
            }
          ]
        },
        {
          "id": "f19ebac5-60ca-46d2-addd-78ca016d4098",
          "title": "Implement context menu",
          "start": "2026-09-10",
          "end": "2026-09-10",
          "done": true,
          "color": "#000000",
          "checklist": []
        },
        {
          "id": "a59f123b-989e-4a9c-84ce-395b407d467d",
          "title": "Fixes from kanban",
          "start": "2026-09-10",
          "end": "2026-09-10",
          "done": true,
          "color": "#000000",
          "checklist": [
            {
              "id": "682e44c6-f0d1-41a9-899d-49f134554f44",
              "text": "Timeline",
              "done": true
            },
            {
              "id": "cafcb6a4-1398-4ae6-91d9-4a44b2450f82",
              "text": "Kanban",
              "done": true
            }
          ]
        },
        {
          "id": "20c613f9-eea7-4bc5-956b-309de5a25b6b",
          "title": "Implement drawing on canvas",
          "start": "2026-09-10",
          "end": "2026-09-11",
          "done": true,
          "color": "#000000",
          "checklist": []
        },
        {
          "id": "61b1f135-0e6b-49d7-89b7-c04448b3d750",
          "title": "Test #1",
          "start": "2026-09-10",
          "end": "2026-09-10",
          "done": true,
          "color": "#ff0000",
          "checklist": []
        },
        {
          "id": "c77d18ea-d6fb-473d-bb4c-129865e6c1f7",
          "title": "Test #1 Fixes",
          "start": "2026-09-11",
          "end": "2026-09-14",
          "done": true,
          "color": "#000000",
          "checklist": []
        },
        {
          "id": "ae44f9e4-5bdc-40cb-90ac-1c2af1abf69b",
          "title": "Implement Database Diagram",
          "start": "2026-09-11",
          "end": "2026-09-12",
          "done": true,
          "color": "#000000",
          "checklist": []
        },
        {
          "id": "04a8ca0c-1eb2-47e4-9581-c925cd6021f4",
          "title": "hotfixes from kanban",
          "start": "2026-09-11",
          "end": "2026-09-11",
          "done": true,
          "color": "#000000",
          "checklist": [
            {
              "id": "59dc0e1c-2bc5-430f-a98d-73ab5188687d",
              "text": "Implement editbar for drawing to change colors and size when multi selected",
              "done": true
            },
            {
              "id": "f679bcf2-70fa-4415-86c9-4e06908bd054",
              "text": "Auto Adjust columns width in kanban when resizing kanban",
              "done": true
            }
          ]
        },
        {
          "id": "789cdbc8-0186-4a0e-8e9f-43febff0e139",
          "title": "Kanban fixes",
          "start": "2026-09-12",
          "end": "2026-09-14",
          "done": true,
          "color": "#000000",
          "checklist": []
        },
        {
          "id": "42ee8a21-df57-4469-b780-57ab0b80d59f",
          "title": "Implement new blocks",
          "start": "2026-09-15",
          "end": "2026-09-16",
          "done": false,
          "color": "#000000",
          "checklist": [
            {
              "id": "24e0da0b-2d06-4455-93c8-28d4cf7606d0",
              "text": "IconBlock",
              "done": false
            },
            {
              "id": "72670dbe-1b80-4c01-a3bd-8d508a16803d",
              "text": "MindmapBlock",
              "done": false
            }
          ]
        },
        {
          "id": "126eea78-41d8-42ce-8060-0a1eaef41d11",
          "title": "Upgrade note (Implement source and open link function)",
          "start": "2026-09-16",
          "end": "2026-09-16",
          "done": false,
          "color": "#000000",
          "checklist": []
        },
        {
          "id": "2c951fc5-1c9a-4ef1-9eed-0e8d2336620c",
          "title": "Test #2",
          "start": "2026-09-17",
          "end": "2026-09-17",
          "done": false,
          "color": "#ed4040",
          "checklist": []
        },
        {
          "id": "220670a3-6e23-4543-a93a-0ed888fc3ed6",
          "title": "Implement mobile devices compability",
          "start": "2026-09-16",
          "end": "2026-09-21",
          "done": false,
          "color": "#0d39e7",
          "checklist": []
        },
        {
          "id": "d6bdf52e-398a-4e04-845f-09f4512c61cb",
          "title": "API Planning",
          "start": "2026-09-10",
          "end": "2026-09-22",
          "done": false,
          "color": "#7c40ed",
          "checklist": []
        },
        {
          "id": "92f25192-dcf0-4d73-aa2f-16cc7ca10e4c",
          "title": "API Implementation",
          "start": "2026-09-20",
          "end": "2026-10-06",
          "done": false,
          "color": "#7c3aed",
          "checklist": []
        }
      ],
      "width": 1440,
      "locked": false,
      "tags": [
        "todo"
      ],
      "color": "#ffffff",
      "frameId": null,
      "taskColumnWidth": 304
    },
    {
      "id": "pt0s0vqq",
      "x": 1824,
      "y": 224,
      "zIndex": 24,
      "type": "line",
      "divider": true,
      "x2": 1824,
      "y2": 2480,
      "arrowStart": false,
      "arrowEnd": false,
      "color": "#000000",
      "strokeWidth": 5,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "labelFontSize": 11,
      "locked": true,
      "frameId": null
    },
    {
      "id": "ot43ea9e",
      "x": 3930.8180137353884,
      "y": 1068,
      "zIndex": 25,
      "type": "document",
      "title": "Updates info",
      "content": "<h2>        Updates and timeline</h2><p>Updates are made practically everyday. timeline here is the <strong>new block</strong> that should help me <em>(and you for your future projects)</em> to plan the tasks of new features, fixes etc.</p><p>The project is growing and I'm adding new useful things, if you have any new ideas and you think that your new feature would help in creating project, plans etc in this app, just go to my <strong><u>github project</u></strong> <em>(link next to this document) </em>and create the feature improvement issue. Or you can fork the project and create the feature by yourself, so if you would want to have this in official codebase, just create <strong>pull request</strong> and wait for <strong>review</strong>.</p>",
      "width": 480,
      "autoHeight": true,
      "locked": false,
      "typography": {
        "fontSize": 16
      },
      "frameId": null
    },
    {
      "id": "e541ca6e-b0fd-4a73-90d4-2eb14b0077f0",
      "x": 4110.8180137353875,
      "y": 1644.8125,
      "zIndex": 26,
      "type": "link",
      "url": "https://github.com/Lewan24/NodexMesh",
      "title": "Nodex Mesh",
      "description": "GitHub project",
      "width": 320,
      "height": 144,
      "color": "#fdf4ff",
      "topColor": "#7C3AED",
      "locked": false,
      "frameId": null
    },
    {
      "id": "hoa4eb8k",
      "x": 1998,
      "y": 1824,
      "zIndex": 27,
      "type": "diagram",
      "title": "Example diagram of some simple in-system operation",
      "nodes": [
        {
          "id": "0468d693-1d20-48ba-b511-16ba39709ec9",
          "position": {
            "x": 0,
            "y": 240
          },
          "data": {
            "label": "Request input",
            "shape": "input",
            "color": "#0f766e"
          },
          "type": "shape"
        },
        {
          "id": "a8141310-f005-4025-91f5-b0601514d326",
          "position": {
            "x": 0,
            "y": 360
          },
          "data": {
            "label": "Valid request?",
            "shape": "decision",
            "color": "#b45309"
          },
          "type": "shape"
        },
        {
          "id": "6540bd8f-3d57-4a4d-9579-900d2a6af356",
          "position": {
            "x": 0,
            "y": 540
          },
          "data": {
            "label": "Process request",
            "shape": "process",
            "color": "#7c3aed"
          },
          "type": "shape"
        },
        {
          "id": "c1908212-10e8-41ca-aedd-5f2f77569a31",
          "position": {
            "x": 220,
            "y": 540
          },
          "data": {
            "label": "Return error",
            "shape": "process",
            "color": "#7c3aed"
          },
          "type": "shape"
        },
        {
          "id": "c7a197a0-db38-407b-8da9-1497299f64bb",
          "position": {
            "x": 0,
            "y": 656
          },
          "data": {
            "label": "Save result",
            "shape": "service",
            "color": "#0369a1"
          },
          "type": "shape"
        },
        {
          "id": "e9ecc59e-fd3e-4f26-b8ce-9b1d6d16c407",
          "position": {
            "x": 0,
            "y": 112
          },
          "data": {
            "label": "Start",
            "shape": "terminal",
            "color": "#ff4d4d"
          },
          "type": "shape"
        },
        {
          "id": "1fabc133-6206-4591-be8c-0be5545eb398",
          "position": {
            "x": 224,
            "y": 672
          },
          "data": {
            "label": "End",
            "shape": "terminal",
            "color": "#ff4d4d"
          },
          "type": "shape"
        },
        {
          "id": "cc9706b7-b9bb-4980-868f-f7469624e45c",
          "position": {
            "x": 0,
            "y": 1120
          },
          "data": {
            "label": "End",
            "shape": "terminal",
            "color": "#ff4d4d"
          },
          "type": "shape"
        },
        {
          "id": "8885e8f4-b455-4463-b703-e96400ff8a8d",
          "position": {
            "x": 0,
            "y": 768
          },
          "data": {
            "label": "Validator service",
            "shape": "service",
            "color": "#0369a1"
          },
          "type": "shape"
        },
        {
          "id": "15551786-1de6-4266-951b-4b0d5d53ec0e",
          "position": {
            "x": 0,
            "y": 992
          },
          "data": {
            "label": "Show result to user",
            "shape": "process",
            "color": "#7c3aed"
          },
          "type": "shape"
        },
        {
          "id": "d835d705-c899-45b9-a647-292585eb08f1",
          "position": {
            "x": 0,
            "y": 880
          },
          "data": {
            "label": "Database",
            "shape": "database",
            "color": "#40b3ed"
          },
          "type": "shape"
        }
      ],
      "edges": [
        {
          "id": "5547eb16-6dda-4ba3-9273-b42494c6b757",
          "source": "0468d693-1d20-48ba-b511-16ba39709ec9",
          "target": "a8141310-f005-4025-91f5-b0601514d326",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        },
        {
          "id": "3065d686-bc57-43ca-b50f-4d4d1b868f95",
          "source": "a8141310-f005-4025-91f5-b0601514d326",
          "target": "6540bd8f-3d57-4a4d-9579-900d2a6af356",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": "Yes"
        },
        {
          "id": "7669888b-45a7-43e5-b9ae-e272e61fa3f7",
          "source": "a8141310-f005-4025-91f5-b0601514d326",
          "target": "c1908212-10e8-41ca-aedd-5f2f77569a31",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": "No"
        },
        {
          "id": "82591c9d-0971-4a4b-8ca1-14e986bae5e6",
          "source": "6540bd8f-3d57-4a4d-9579-900d2a6af356",
          "target": "c7a197a0-db38-407b-8da9-1497299f64bb",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        },
        {
          "id": "0ab1db8f-ecde-4025-8fbb-63dccea8634e",
          "source": "e9ecc59e-fd3e-4f26-b8ce-9b1d6d16c407",
          "target": "0468d693-1d20-48ba-b511-16ba39709ec9",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        },
        {
          "id": "39dd9955-0232-4661-95b2-1cdc894df77a",
          "source": "15551786-1de6-4266-951b-4b0d5d53ec0e",
          "target": "cc9706b7-b9bb-4980-868f-f7469624e45c",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        },
        {
          "id": "8e93cf6c-b0cb-4c39-bcdd-b030ad7c0799",
          "source": "c1908212-10e8-41ca-aedd-5f2f77569a31",
          "target": "1fabc133-6206-4591-be8c-0be5545eb398",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        },
        {
          "id": "43814c93-a270-48d0-ac4c-b1d4eeb8a23a",
          "source": "c7a197a0-db38-407b-8da9-1497299f64bb",
          "target": "8885e8f4-b455-4463-b703-e96400ff8a8d",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        },
        {
          "id": "71b1f834-4c93-4280-8f68-64f657a8f07d",
          "source": "d835d705-c899-45b9-a647-292585eb08f1",
          "target": "15551786-1de6-4266-951b-4b0d5d53ec0e",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        },
        {
          "id": "b6ad615e-371e-4801-82ab-901bbf41b9e5",
          "source": "8885e8f4-b455-4463-b703-e96400ff8a8d",
          "target": "d835d705-c899-45b9-a647-292585eb08f1",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        }
      ],
      "width": 800,
      "height": 1168,
      "locked": true,
      "color": "#ffffff",
      "frameId": null
    },
    {
      "id": "vwmgpl6g",
      "x": 1824,
      "y": 1776,
      "zIndex": 28,
      "type": "line",
      "divider": true,
      "x2": 2976,
      "y2": 1776,
      "arrowStart": false,
      "arrowEnd": false,
      "color": "#000000",
      "strokeWidth": 5,
      "label": "Example diagram",
      "labelMode": "horizontal",
      "labelOffset": 0,
      "labelFontSize": 24,
      "locked": true,
      "frameId": null
    },
    {
      "id": "78656c30-2f9d-4451-a8f0-9e795a3feaca",
      "type": "drawing",
      "x": 3801.517836496122,
      "y": 1453.4326551891743,
      "width": 278.4821635038779,
      "height": 289.13468962165143,
      "viewWidth": 278.4821635038779,
      "viewHeight": 289.13468962165143,
      "points": [],
      "color": "#7C3AED",
      "strokeWidth": 3,
      "zIndex": 30,
      "strokes": [
        {
          "points": [
            {
              "x": 122.70108234177678,
              "y": 6,
              "pressure": 1
            },
            {
              "x": 121.6690740370218,
              "y": 6.516004152377263,
              "pressure": 1.0863335250721269
            },
            {
              "x": 118.91858592267681,
              "y": 6.8326512376766,
              "pressure": 1.1338240255994916
            },
            {
              "x": 114.42171496653782,
              "y": 8.145543749822764,
              "pressure": 1.1430102846586978
            },
            {
              "x": 107.82140782399756,
              "y": 10.047585311348257,
              "pressure": 1.140157949864428
            },
            {
              "x": 101.02059836420949,
              "y": 12.93632591281903,
              "pressure": 1.122673336163943
            },
            {
              "x": 93.97290128747363,
              "y": 17.35546633542117,
              "pressure": 1.1191564973738772
            },
            {
              "x": 85.15346181590166,
              "y": 24.574596070181997,
              "pressure": 1.0821668853794393
            },
            {
              "x": 74.25408219721703,
              "y": 34.625275775225646,
              "pressure": 1.038974040534171
            },
            {
              "x": 61.6719516683429,
              "y": 48.25101233119085,
              "pressure": 0.9969396253444468
            },
            {
              "x": 48.96124308809249,
              "y": 62.139999891206344,
              "pressure": 0.9678473940942354
            },
            {
              "x": 37.6467001735773,
              "y": 76.14285136925218,
              "pressure": 0.9478119894832966
            },
            {
              "x": 28.897222933416742,
              "y": 89.41894861817605,
              "pressure": 0.947243033839873
            },
            {
              "x": 21.66669987108162,
              "y": 101.98165876370877,
              "pressure": 0.9565539793837117
            },
            {
              "x": 15.988880454574428,
              "y": 115.78933951982731,
              "pressure": 0.9546573374220337
            },
            {
              "x": 11.308772932632564,
              "y": 129.67829135508623,
              "pressure": 0.9549264686679537
            },
            {
              "x": 7.72171996021325,
              "y": 144.45143421643843,
              "pressure": 0.9537271054243337
            },
            {
              "x": 6,
              "y": 160.57809916072347,
              "pressure": 0.9477822411237662
            },
            {
              "x": 8.022818409925549,
              "y": 177.28183912117197,
              "pressure": 0.9398319894075127
            },
            {
              "x": 13.261543286869255,
              "y": 193.5546774601255,
              "pressure": 0.9303684211507461
            },
            {
              "x": 19.43005916613174,
              "y": 206.93033795968358,
              "pressure": 0.9406348290429508
            },
            {
              "x": 27.18757737233591,
              "y": 220.22968366273813,
              "pressure": 0.9439378136253831
            },
            {
              "x": 38.17598232655564,
              "y": 233.95964774035883,
              "pressure": 0.9343860779156028
            },
            {
              "x": 51.0442501906482,
              "y": 245.888240260291,
              "pressure": 0.9254249749101571
            },
            {
              "x": 63.400566148833605,
              "y": 255.76593738577685,
              "pressure": 0.9281685205299396
            },
            {
              "x": 73.55470040610908,
              "y": 263.6350273572798,
              "pressure": 0.9572179643709575
            },
            {
              "x": 84.74983467402944,
              "y": 270.38202834430035,
              "pressure": 0.9681758391108835
            },
            {
              "x": 97.72278112209005,
              "y": 275.79193671016446,
              "pressure": 0.9695281078144689
            },
            {
              "x": 113.35787605584392,
              "y": 279.92914261167243,
              "pressure": 0.9583528411514042
            },
            {
              "x": 131.17627638139402,
              "y": 281.92481231244665,
              "pressure": 0.9387982080715616
            },
            {
              "x": 150.1935595529103,
              "y": 282.79697596114397,
              "pressure": 0.9210334557464464
            },
            {
              "x": 166.59313697236485,
              "y": 283.13468962165143,
              "pressure": 0.9248966863492452
            },
            {
              "x": 180.95757925044018,
              "y": 282.6232652387582,
              "pressure": 0.941449850734704
            },
            {
              "x": 191.24398472581106,
              "y": 281.8192708431002,
              "pressure": 0.9913041640980421
            },
            {
              "x": 199.49963145926222,
              "y": 281.3944939255198,
              "pressure": 1.0389129148686296
            },
            {
              "x": 207.42626405569536,
              "y": 280.6008887071955,
              "pressure": 1.0767544256536143
            },
            {
              "x": 217.28670855150676,
              "y": 278.87624476328983,
              "pressure": 1.0676979692502948
            },
            {
              "x": 226.41132542498826,
              "y": 276.2251672771156,
              "pressure": 1.0728755558476228
            },
            {
              "x": 232.48406268265717,
              "y": 273.3120145852895,
              "pressure": 1.1151353125327415
            },
            {
              "x": 238.17007151692496,
              "y": 269.45984012664735,
              "pressure": 1.1442052419279696
            },
            {
              "x": 243.61447734507783,
              "y": 266.15419405403395,
              "pressure": 1.1654669808094331
            },
            {
              "x": 248.35466979684497,
              "y": 262.645380802898,
              "pressure": 1.1838879184828954
            },
            {
              "x": 252.03758459624942,
              "y": 259.65217811094817,
              "pressure": 1.2171975061092228
            },
            {
              "x": 254.70259711713697,
              "y": 256.386128624574,
              "pressure": 1.2525077791932948
            },
            {
              "x": 256.72907913706695,
              "y": 254.01082473379302,
              "pressure": 1.3067014488514448
            },
            {
              "x": 259.00382737620066,
              "y": 252.0027189004652,
              "pressure": 1.331356777806539
            },
            {
              "x": 261.4155698726113,
              "y": 250.7471869746969,
              "pressure": 1.342174463752619
            },
            {
              "x": 263.33327195279344,
              "y": 249.5188290667195,
              "pressure": 1.3694681280429717
            },
            {
              "x": 266.54901452775175,
              "y": 247.45902902645776,
              "pressure": 1.3694681280429717
            }
          ],
          "x": 0,
          "y": 0,
          "scaleX": 1,
          "scaleY": 1,
          "color": "#7C3AED",
          "strokeWidth": 3
        },
        {
          "points": [
            {
              "x": 6,
              "y": 6,
              "pressure": 1
            },
            {
              "x": 6,
              "y": 6.452645187828921,
              "pressure": 1.1740687679137118
            },
            {
              "x": 6.484725455473381,
              "y": 7.2512645279045955,
              "pressure": 1.2449887400478743
            },
            {
              "x": 7.266220812701704,
              "y": 7.745307732971469,
              "pressure": 1.298864999389444
            },
            {
              "x": 7.7316702534039905,
              "y": 8.498522639786415,
              "pressure": 1.371859130857527
            },
            {
              "x": 8.503788511659423,
              "y": 8.991532333933492,
              "pressure": 1.4087785489225244
            },
            {
              "x": 9.456765922283012,
              "y": 9.303278168945099,
              "pressure": 1.4390270803438692
            },
            {
              "x": 10.556292972485153,
              "y": 9.507159162457356,
              "pressure": 1.4423189562407084
            },
            {
              "x": 11.22715177362079,
              "y": 10.093428252028161,
              "pressure": 1.467285139872093
            },
            {
              "x": 12.129227762599385,
              "y": 10.473327486941116,
              "pressure": 1.4757359615468286
            },
            {
              "x": 13.203449332343098,
              "y": 11.204846730913005,
              "pressure": 1.4596132019827703
            },
            {
              "x": 14.311680662484832,
              "y": 11.64394461803954,
              "pressure": 1.4767894823756742
            },
            {
              "x": 15.080589553452683,
              "y": 12.45163750547158,
              "pressure": 1.4341372530475873
            },
            {
              "x": 15.952295990242419,
              "y": 12.892833630571204,
              "pressure": 1.4797477805394639
            },
            {
              "x": 16.97294891719048,
              "y": 13.179940304002002,
              "pressure": 1.5085003331700775
            },
            {
              "x": 18.260050349472294,
              "y": 13.918573733579024,
              "pressure": 1.4343692899383136
            },
            {
              "x": 18.93402045621997,
              "y": 14.768772081724592,
              "pressure": 1.4591187439445545
            },
            {
              "x": 19.353075584263024,
              "y": 15.748205373068458,
              "pressure": 1.4989256613228874
            },
            {
              "x": 19.639288200374722,
              "y": 16.891568970329445,
              "pressure": 1.4870030648983206
            },
            {
              "x": 19.345978342459148,
              "y": 18.08451479199516,
              "pressure": 1.4801408179368911
            },
            {
              "x": 19.15244320597958,
              "y": 19.366406848014776,
              "pressure": 1.4463232918438655
            },
            {
              "x": 18.559605338280562,
              "y": 20.60557503686414,
              "pressure": 1.4450712788188436
            },
            {
              "x": 18.188624968823206,
              "y": 21.857291983897767,
              "pressure": 1.4465498951731905
            },
            {
              "x": 17.96458279786748,
              "y": 23.070397658827005,
              "pressure": 1.4784068444294522
            },
            {
              "x": 17.356108267632862,
              "y": 24.323301395115095,
              "pressure": 1.4914938481713422
            },
            {
              "x": 16.972152066525723,
              "y": 25.569979343695877,
              "pressure": 1.5118212842711207
            },
            {
              "x": 16.726067753922052,
              "y": 26.822259994981096,
              "pressure": 1.531193941177141
            },
            {
              "x": 16.056632842606632,
              "y": 27.707920813547616,
              "pressure": 1.4812675770058168
            },
            {
              "x": 15.680845911091637,
              "y": 28.657789931547768,
              "pressure": 1.5108464478729433
            },
            {
              "x": 15.430187362067954,
              "y": 29.75771027488031,
              "pressure": 1.5078795948846684
            },
            {
              "x": 14.792526521342097,
              "y": 30.94636603520462,
              "pressure": 1.4923502508078563
            },
            {
              "x": 14.391870153614036,
              "y": 32.166891489413956,
              "pressure": 1.4835193479457343
            },
            {
              "x": 13.706139224248545,
              "y": 34.2558438222452,
              "pressure": 1.4835193479457343
            }
          ],
          "x": 252.8428753035032,
          "y": 227.33110711533504,
          "scaleX": 1,
          "scaleY": 1,
          "color": "#7C3AED",
          "strokeWidth": 3
        }
      ],
      "locked": true,
      "frameId": null
    },
    {
      "id": "oxhv2p6f",
      "x": 3168,
      "y": 252,
      "zIndex": 37,
      "color": "#ffffff",
      "typography": {
        "fontSize": 16
      },
      "type": "kanban",
      "title": "Tests #1 problems",
      "width": 1176,
      "columns": [
        {
          "id": "uyt62rab",
          "title": "Nice to do",
          "color": "#5a8a94",
          "cards": [
            {
              "id": "6e9add0",
              "text": "Change editing kanban columns to dialog",
              "done": true
            },
            {
              "id": "y40friq",
              "text": "Implement manual deleting trash with projects",
              "done": true
            },
            {
              "id": "dxmhev5",
              "text": "Show checklist completion percentage based on completed tasks",
              "done": true
            },
            {
              "id": "py8u27l",
              "text": "Implement arrow flexibility",
              "done": true
            },
            {
              "id": "lzatvlo",
              "text": "Fix and improve DiagramBlock so it reacts better to moving items and handles arrows and connections more reliably",
              "done": true
            },
            {
              "id": "8e95zbe",
              "text": "Edit timeline tasks in a dialog",
              "done": true
            },
            {
              "id": "xulj7wc",
              "text": "Dropping a checklist item or Kanban card onto the canvas creates a new checklist",
              "done": true
            },
            {
              "id": "5h4w698",
              "text": "ImageBlock also looks inconsistent with the rest of the app and needs styling improvements",
              "done": true
            },
            {
              "id": "qg5egfz",
              "text": "Review and adjust colors and item styles so the overall UI is visually consistent",
              "done": true
            },
            {
              "id": "96s4rt6",
              "text": "Fix arrow and line thickness so arrowheads scale correctly with the selected stroke width",
              "done": true
            },
            {
              "id": "ipel663",
              "text": "Add a lock icon to locked items so their locked state is clearly visible",
              "done": true
            },
            {
              "id": "2lwvu8c",
              "text": "Prevent a frame from moving when it contains a locked item",
              "done": true
            }
          ],
          "width": 387
        },
        {
          "id": "0ribgkj9",
          "title": "Important",
          "color": "#FFBD65",
          "cards": [
            {
              "id": "lmcydly",
              "text": "Update this column after adding new features",
              "done": true
            },
            {
              "id": "zuivw2r",
              "text": "When an item is resized and starts overlapping other items, push those items away and cascade the movement if they overlap additional items",
              "done": true
            },
            {
              "id": "bxx2949",
              "text": "Check TimelineBlock and the other new items because they are not being added to frames",
              "done": true
            },
            {
              "id": "o0tjfta",
              "text": "Review fonts across the app and fix any inconsistent usage",
              "done": true
            },
            {
              "id": "e6wjobr",
              "text": "Allow TextBlock to support multiple lines instead of a single line",
              "done": true
            },
            {
              "id": "lyyf6zr",
              "text": "Fix vertical alignment in NoteBlock",
              "done": true
            },
            {
              "id": "kd4ghd4",
              "text": "Make checklist item font size configurable in the edit bar and apply it in the textarea when adding a new task",
              "done": true
            }
          ],
          "width": 341
        },
        {
          "id": "f6ukr8rp",
          "title": "Must have",
          "color": "#7C3AED",
          "cards": [
            {
              "id": "f8s0y47",
              "text": "Handle overlapping frames so when one frame overlaps another and tries to capture its items, the newer frame does not take items that already belong to the existing frame",
              "done": true
            },
            {
              "id": "lizmrj5",
              "text": "Review and improve Ctrl+Z support, including the existing issue with Kanban cards and tasks",
              "done": true
            },
            {
              "id": "myi6igu",
              "text": "Fix inconsistent item dimensions and sizing",
              "done": true
            },
            {
              "id": "80vciuf",
              "text": "Set the default zIndex to 1 and all frames to 0",
              "done": true
            }
          ],
          "width": 358
        }
      ],
      "height": 742.9998038774188,
      "locked": false,
      "frameId": null
    },
    {
      "id": "db67e899-16cc-4585-81d2-dc3039b9f8bf",
      "x": 2976,
      "y": 1776,
      "zIndex": 38,
      "type": "line",
      "divider": true,
      "x2": 2976,
      "y2": 2992,
      "arrowStart": false,
      "arrowEnd": false,
      "color": "#000000",
      "strokeWidth": 5,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "labelFontSize": 11,
      "locked": true,
      "frameId": null
    },
    {
      "id": "b16f19e4-557e-427c-9b61-8e37b791155a",
      "x": 2976,
      "y": 1776,
      "zIndex": 39,
      "type": "line",
      "divider": true,
      "x2": 5552,
      "y2": 1776,
      "arrowStart": false,
      "arrowEnd": false,
      "color": "#000000",
      "strokeWidth": 5,
      "label": "Bakend plan",
      "labelMode": "horizontal",
      "labelOffset": 0,
      "labelFontSize": 24,
      "locked": true,
      "frameId": null
    },
    {
      "id": "jw1muxjd",
      "x": 3733.6360274707768,
      "y": 1984,
      "zIndex": 40,
      "color": "#ffffff",
      "type": "link",
      "url": "https://dotnet.microsoft.com/en-us/",
      "title": ".NET",
      "description": "",
      "width": 320,
      "frameId": null
    },
    {
      "id": "qyiu9i6n",
      "x": 3057.63883894169,
      "y": 2007.9999999999998,
      "zIndex": 41,
      "color": "#ffffff",
      "type": "link",
      "url": "https://top10.owasp.org/2025/",
      "title": "OWASP TOP 10 2025",
      "description": "",
      "width": 320,
      "frameId": null
    },
    {
      "id": "7ww3ydsc",
      "x": 3061.6360274707768,
      "y": 2264,
      "zIndex": 42,
      "color": "#ffffff",
      "type": "image",
      "url": "https://owasp.github.io/www-project-smart-contract-top-10/assets/images/Top10mapping2025-2026.png",
      "caption": "",
      "width": 970.3639725292232,
      "imgHeight": 528,
      "variant": "sticker",
      "height": 528,
      "frameId": null
    },
    {
      "id": "3u053vou",
      "type": "line",
      "x": 3216,
      "y": 2221.25,
      "x2": 3289.6000395887945,
      "y2": 2264,
      "zIndex": 43,
      "arrowStart": false,
      "arrowEnd": true,
      "color": "#7C3AED",
      "strokeWidth": 2,
      "startItemId": "qyiu9i6n",
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "endItemId": "7ww3ydsc",
      "frameId": null,
      "curve": 0.2
    },
    {
      "id": "gf6ms9im",
      "x": 3420,
      "y": 2130,
      "zIndex": 44,
      "typography": {
        "verticalAlign": "top",
        "textAlign": "center"
      },
      "type": "text",
      "content": "Upcoming changes 2025 => 2026",
      "size": "lg",
      "width": 320,
      "frameId": null
    },
    {
      "id": "s97xly2v",
      "x": 4208,
      "y": 2481,
      "zIndex": 45,
      "color": "#ffffff",
      "type": "link",
      "url": "https://github.com/Lewan24/SampleWarehouseApi",
      "title": "Secure .NET project template",
      "description": "My custom project created as template for new .NET projects with already implemented OWASP TOP 10 security features",
      "width": 320,
      "frameId": null
    },
    {
      "id": "7vxmhes3",
      "x": 4144,
      "y": 1862,
      "zIndex": 46,
      "color": "#ffffff",
      "type": "note",
      "content": "There will be all prepared information needed to prepare and implement backend in .NET 10.\n\nAfter frontend and app upcoming updates, there will be also database diagram with example of data in database how its gonna be stored.",
      "width": 448,
      "frameId": null,
      "typography": {
        "bold": true
      }
    },
    {
      "id": "tsdo8gm6",
      "x": 3210.8180137353884,
      "y": 2842,
      "zIndex": 47,
      "color": "#ffffff",
      "type": "embed",
      "title": "",
      "url": "https://www.youtube.com/watch?v=Jzr0Jdnq_EI",
      "showLabel": false,
      "width": 672,
      "height": 384,
      "frameId": null
    },
    {
      "id": "wik5gau5",
      "x": 3061.6360274707768,
      "y": 3488,
      "zIndex": 48,
      "color": "#ffffff",
      "typography": {
        "fontSize": 14
      },
      "type": "code",
      "content": "builder.Services.AddIdentityCore<ApplicationUser>(options =>\n    {\n        // Password policy (OWASP ASVS-aligned: length over complexity \n        // gymnastics, but we do both here for the demo)\n        options.Password.RequiredLength = 12;\n        options.Password.RequireDigit = true;\n        options.Password.RequireUppercase = true;\n        options.Password.RequireLowercase = true;\n        options.Password.RequireNonAlphanumeric = true;\n\n        // Account lockout after repeated failed attempts — \n        // mitigates credential stuffing / brute force.\n        options.Lockout.MaxFailedAccessAttempts = 5;\n        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);\n        options.Lockout.AllowedForNewUsers = true;\n\n        options.User.RequireUniqueEmail = true;\n    })\n        .AddRoles<IdentityRole>()\n        .AddEntityFrameworkStores<AppDbContext>()\n        .AddSignInManager()\n        .AddDefaultTokenProviders();",
      "language": "csharp",
      "width": 624,
      "frameId": null,
      "autoHeight": true
    },
    {
      "id": "lie4z8qf",
      "type": "line",
      "x": 4552,
      "y": 2709,
      "x2": 4552,
      "y2": 3047.5,
      "zIndex": 49,
      "arrowStart": false,
      "arrowEnd": true,
      "color": "#7C3AED",
      "strokeWidth": 2,
      "startItemId": "wik5gau5",
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "frameId": null,
      "endItemId": "f375126b-35ee-4121-b2b9-04e621aa8a00"
    },
    {
      "id": "f375126b-35ee-4121-b2b9-04e621aa8a00",
      "x": 3738.8180137353884,
      "y": 3488,
      "zIndex": 50,
      "color": "#ffffff",
      "type": "code",
      "content": "builder.Services.AddAuthentication(options =>\n    {\n        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;\n        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;\n    })\n        .AddJwtBearer(options =>\n        {\n            options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();\n            options.SaveToken = false;\n            options.TokenValidationParameters = new TokenValidationParameters\n            {\n                ValidateIssuer = true,\n                ValidIssuer = jwtSection[\"Issuer\"],\n                ValidateAudience = true,\n                ValidAudience = jwtSection[\"Audience\"],\n                ValidateLifetime = true,\n                ClockSkew = TimeSpan.FromSeconds(30),\n                ValidateIssuerSigningKey = true,\n                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))\n            };\n        });\n\n    builder.Services.AddAuthorizationBuilder()\n        .AddPolicy(Policies.AdminOnly, p => p.RequireRole(Roles.Admin))\n        .AddPolicy(Policies.ManagerOrAdmin, p => p.RequireRole(Roles.Manager, Roles.Admin))\n        .AddPolicy(Policies.ViewerOrAbove, p => p.RequireRole(Roles.Viewer, Roles.Manager, Roles.Admin));",
      "language": "csharp",
      "width": 864,
      "frameId": null,
      "autoHeight": true,
      "locked": false
    },
    {
      "id": "mgxbrqjo",
      "type": "line",
      "x": 5024,
      "y": 3114.5,
      "x2": 5560,
      "y2": 3042.5,
      "zIndex": 51,
      "arrowStart": false,
      "arrowEnd": true,
      "color": "#7C3AED",
      "strokeWidth": 2,
      "startItemId": "f375126b-35ee-4121-b2b9-04e621aa8a00",
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "frameId": null,
      "endItemId": "a2ccffb8-d988-4c55-b1b7-a3c75b96ccc1"
    },
    {
      "id": "a2ccffb8-d988-4c55-b1b7-a3c75b96ccc1",
      "x": 3057.63883894169,
      "y": 4208,
      "zIndex": 52,
      "color": "#ffffff",
      "type": "code",
      "content": "builder.Services.AddRateLimiter(options =>\n    {\n        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;\n\n        options.OnRejected = async (context, token) =>\n        {\n            context.HttpContext.Response.Headers.RetryAfter = \"60\";\n            await context.HttpContext.Response.WriteAsJsonAsync(\n                new { error = \"Too many requests. Please try again later.\" }, token);\n        };\n\n        // Global limiter applied to every request: partitioned per authenticated user and per ip\n        // (so one noisy user can't starve others) or per IP for anonymous traffic.\n        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>\n        {\n            var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);\n\n            var key = !string.IsNullOrWhiteSpace(userId)\n                ? $\"user:{userId}\"\n                : $\"ip:{httpContext.Connection.RemoteIpAddress?.ToString() ?? \"unknown\"}\";\n\n            return RateLimitPartition.GetSlidingWindowLimiter(\n                key,\n                _ => new SlidingWindowRateLimiterOptions\n                {\n                    PermitLimit = 300,\n                    Window = TimeSpan.FromMinutes(1),\n                    SegmentsPerWindow = 6,\n                    QueueLimit = 0\n                });\n        });",
      "language": "csharp",
      "width": 784,
      "frameId": null,
      "autoHeight": true,
      "locked": false
    },
    {
      "id": "52qdlm0b",
      "type": "line",
      "x": 5560,
      "y": 3581,
      "x2": 5560,
      "y2": 3919.5,
      "zIndex": 53,
      "arrowStart": false,
      "arrowEnd": true,
      "color": "#7C3AED",
      "strokeWidth": 2,
      "startItemId": "a2ccffb8-d988-4c55-b1b7-a3c75b96ccc1",
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "frameId": null,
      "endItemId": "119042d0-4205-4691-8874-527f50352f93"
    },
    {
      "id": "119042d0-4205-4691-8874-527f50352f93",
      "x": 3898.8180137353884,
      "y": 4208,
      "zIndex": 54,
      "color": "#ffffff",
      "type": "code",
      "content": "options.AddPolicy(\"auth-strict\", httpContext =>\n        {\n            var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? \"unknown\";\n            return RateLimitPartition.GetSlidingWindowLimiter(\n                partitionKey: $\"ip:{ip}\",\n                _ => new SlidingWindowRateLimiterOptions\n            {\n                PermitLimit = 5,\n                Window = TimeSpan.FromMinutes(1),\n                SegmentsPerWindow = 6,\n                QueueLimit = 0\n            });\n        });\n        \n        options.AddPolicy(\"auth-refresh\", httpContext =>\n        {\n            var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? \"unknown\";\n\n            return RateLimitPartition.GetTokenBucketLimiter(\n                partitionKey: $\"ip:{ip}\",\n                factory: _ => new TokenBucketRateLimiterOptions\n                {\n                    TokenLimit = 30,\n                    TokensPerPeriod = 30,\n                    ReplenishmentPeriod = TimeSpan.FromMinutes(1),\n                    AutoReplenishment = true,\n                    QueueLimit = 0\n                });\n        });\n    });",
      "language": "csharp",
      "width": 704,
      "frameId": null,
      "autoHeight": true,
      "locked": false
    },
    {
      "id": "a6j5xe2f",
      "type": "line",
      "x": 3728,
      "y": 2072,
      "x2": 4080,
      "y2": 2261.485779701884,
      "zIndex": 55,
      "arrowStart": true,
      "arrowEnd": true,
      "color": "#7C3AED",
      "strokeWidth": 3,
      "startItemId": "s97xly2v",
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "frameId": null,
      "endItemId": "wik5gau5",
      "curve": -0.25,
      "lineCap": "round"
    },
    {
      "id": "m2scw64s",
      "x": 3119.999999999999,
      "y": 3276,
      "zIndex": 56,
      "typography": {
        "textAlign": "center"
      },
      "type": "text",
      "content": "Example code of \nidentity\nauth\nrate limiter\nlimiter policies",
      "size": "lg",
      "width": 320,
      "frameId": null
    },
    {
      "id": "jocuo1x5",
      "type": "line",
      "x": 4712.121894794581,
      "y": 2248,
      "x2": 3395.1930328540147,
      "y2": 3712,
      "zIndex": 57,
      "arrowStart": false,
      "arrowEnd": true,
      "color": "#7C3AED",
      "strokeWidth": 2,
      "startItemId": "m2scw64s",
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "frameId": null,
      "curve": 0.7,
      "endItemId": "wik5gau5"
    },
    {
      "id": "4qqcbprg",
      "x": 4778.818013735388,
      "y": 2018,
      "zIndex": 58,
      "color": "#ffffff",
      "type": "document",
      "title": "Database preview plan",
      "content": "<h2>               Database plan #1</h2><p></p><p><u>Below is the first fun preview of upcoming database.</u></p><p>It is still in <strong>planning</strong> and preparing until most of <strong><em>functionallities</em></strong> are already <strong><em>implemented</em></strong> in frontend.</p><p></p><p><strong>Projects</strong></p><p>- Id<br>- Name<br>- Color<br>- OwnerId<br>- CreatedAt<br>- UpdatedAt<br>- Version</p><p><strong>BoardItems</strong></p><p>- Id<br>- ProjectId<br>- Type<br>- X<br>- Y<br>- ZIndex<br>- Width<br>- Height<br>- Locked<br>- Data JSONB (specific data of item)<br>- UpdatedAt<br>- Version</p>",
      "width": 480,
      "autoHeight": true,
      "frameId": null,
      "colorRole": "default"
    },
    {
      "id": "lc6a9mh2",
      "x": 5376,
      "y": 2618,
      "zIndex": 59,
      "color": "#1c1917",
      "type": "database",
      "title": "NodexMesh Database preview schema",
      "tables": [
        {
          "id": "c620b13f-3913-4d39-8183-acb189258c01",
          "name": "Users",
          "position": {
            "x": -688,
            "y": 0
          },
          "fields": [
            {
              "id": "c6f0c35d-01e7-4017-b20c-becdd3abf16d",
              "name": "id",
              "dataType": "Guid",
              "primaryKey": true,
              "nullable": false,
              "unique": true,
              "defaultValue": ""
            },
            {
              "id": "3fc6e76f-0906-44c8-b00d-c1d1c4920887",
              "name": "Email",
              "dataType": "string",
              "primaryKey": false,
              "nullable": false,
              "unique": true,
              "defaultValue": ""
            },
            {
              "id": "3598fa20-71ba-4592-92b9-3fb346caeba8",
              "name": "PasswordHash",
              "dataType": "string",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            }
          ]
        },
        {
          "id": "f5feeec9-bef7-4a01-a0c1-e0b77ba3d2f1",
          "name": "Roles",
          "position": {
            "x": -688,
            "y": 288
          },
          "fields": [
            {
              "id": "4e894bb4-3932-405e-a0d7-5717eb365d94",
              "name": "id",
              "dataType": "Guid",
              "primaryKey": true,
              "nullable": false,
              "unique": true,
              "defaultValue": ""
            },
            {
              "id": "7f95f241-d141-4d4d-820d-0ec12d2709f4",
              "name": "RoleName",
              "dataType": "string",
              "primaryKey": false,
              "nullable": false,
              "unique": true,
              "defaultValue": ""
            }
          ]
        },
        {
          "id": "6614fee6-8fdc-4d62-8eb1-849c1eadce93",
          "name": "UsersRoles",
          "position": {
            "x": -304,
            "y": 256
          },
          "fields": [
            {
              "id": "92e093ca-9e55-43a9-be8a-cf061c8b6647",
              "name": "User_ID",
              "dataType": "Guid",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "b6d1b7f4-3c86-4d76-b194-5872af97b956",
              "name": "Role_ID",
              "dataType": "Guid",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            }
          ]
        },
        {
          "id": "352fe5aa-272f-4f5e-b4df-8b3b016e1642",
          "name": "Projects",
          "position": {
            "x": 16,
            "y": 16
          },
          "fields": [
            {
              "id": "9752b188-2ed7-4a22-a2eb-3a0fe993f416",
              "name": "id",
              "dataType": "Guid",
              "primaryKey": true,
              "nullable": false,
              "unique": true,
              "defaultValue": ""
            },
            {
              "id": "f0b2d439-9223-4526-9ee9-c8461b739e84",
              "name": "Name",
              "dataType": "string",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "fb410f7d-14b7-426c-9507-c6b8faa9a034",
              "name": "Color",
              "dataType": "string",
              "primaryKey": false,
              "nullable": true,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "1b73d2d9-ee4a-4c9a-b0d5-576106f80e98",
              "name": "OwnerUser_ID",
              "dataType": "Guid",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "089cc902-2142-4ac4-8849-d512ceb9addb",
              "name": "CreatedAt",
              "dataType": "DateTime",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "ea4d52ef-675b-43bf-9660-788394681209",
              "name": "UpdatedAt",
              "dataType": "DateTime",
              "primaryKey": false,
              "nullable": true,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "ed42ff33-3222-4135-b868-a41c25eeae60",
              "name": "Version",
              "dataType": "string",
              "primaryKey": false,
              "nullable": true,
              "unique": false,
              "defaultValue": ""
            }
          ]
        },
        {
          "id": "2339aa36-7a9e-484c-9269-ee31bd8df818",
          "name": "BoardItems",
          "position": {
            "x": 400,
            "y": 0
          },
          "fields": [
            {
              "id": "9e1500e2-99ad-4ef3-afe8-73c2e98fded7",
              "name": "id",
              "dataType": "Guid",
              "primaryKey": true,
              "nullable": false,
              "unique": true,
              "defaultValue": ""
            },
            {
              "id": "c62fa175-0d07-4376-b29d-a59bfce171f5",
              "name": "Project_ID",
              "dataType": "Guid",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "69847d19-73bd-4f4c-9d89-4940b38047e5",
              "name": "Type",
              "dataType": "enum",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "24bdef3a-5d5d-400d-98b0-e1b1c24a3663",
              "name": "Pos_X",
              "dataType": "float",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "e1dea5fe-2efd-4fa6-9738-38f119b1c6b5",
              "name": "Pos_Y",
              "dataType": "float",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "fae81ef0-4eda-4b43-a9ac-1ae76d9f35d5",
              "name": "ZIndex",
              "dataType": "integer",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "0301f873-7ac8-437f-b6f8-79ca6beb4d07",
              "name": "Width",
              "dataType": "integer",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "41f50e64-1311-4c0c-9472-96bf3bd2be63",
              "name": "Height",
              "dataType": "integer",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "db53cb05-5061-462f-a98d-12a670316db3",
              "name": "Locked",
              "dataType": "boolean",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "c6dbcaae-8b97-4ff9-837c-fe59c635b6a7",
              "name": "Item_Data",
              "dataType": "JSONB",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "86dbecf1-85a3-4212-8990-222148eb7593",
              "name": "UpdatedAt",
              "dataType": "DateTime",
              "primaryKey": false,
              "nullable": true,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "45b5e61c-7e0d-4a14-a8c2-b9b93aa5e2fc",
              "name": "Version",
              "dataType": "string",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            }
          ]
        },
        {
          "id": "8bca42dd-9292-4047-aea8-2bf47746b131",
          "name": "UsersProjectsSettings",
          "position": {
            "x": -352,
            "y": -288
          },
          "fields": [
            {
              "id": "232b284a-47e4-4026-a290-70c37ba28f55",
              "name": "Project_ID",
              "dataType": "Guid",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "0fb2046f-f7e7-433f-9e98-7e09b119397d",
              "name": "User_ID",
              "dataType": "Guid",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "5eee34fb-ccc5-4528-9704-7cd568275db4",
              "name": "Settings_ID",
              "dataType": "Guid",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            }
          ]
        },
        {
          "id": "7ddaf113-9726-4853-b58c-791e9565dcd5",
          "name": "ProjectSettings",
          "position": {
            "x": 128,
            "y": -256
          },
          "fields": [
            {
              "id": "13f63485-022d-46db-ab61-2d39cfff077f",
              "name": "id",
              "dataType": "Guid",
              "primaryKey": true,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "98ad3099-7815-4c2e-bafa-39a68197e8bc",
              "name": "ThemeSettings",
              "dataType": "JSONB",
              "primaryKey": false,
              "nullable": true,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "22c9406f-f737-4e8f-ba26-405f2f31ea8c",
              "name": "UIFont",
              "dataType": "string",
              "primaryKey": false,
              "nullable": true,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "1a69721b-3cdc-4c36-9341-48c66013476e",
              "name": "BoardItemsFont",
              "dataType": "string",
              "primaryKey": false,
              "nullable": true,
              "unique": false,
              "defaultValue": ""
            }
          ]
        }
      ],
      "relations": [
        {
          "id": "5979589d-b48c-4d65-95ec-e4286575e53b",
          "source": "6614fee6-8fdc-4d62-8eb1-849c1eadce93",
          "target": "f5feeec9-bef7-4a01-a0c1-e0b77ba3d2f1",
          "sourceField": "b6d1b7f4-3c86-4d76-b194-5872af97b956",
          "targetField": "4e894bb4-3932-405e-a0d7-5717eb365d94",
          "cardinality": "1:1"
        },
        {
          "id": "c5f16725-5d3a-4a34-8959-4cd30e3466fb",
          "source": "6614fee6-8fdc-4d62-8eb1-849c1eadce93",
          "target": "c620b13f-3913-4d39-8183-acb189258c01",
          "sourceField": "92e093ca-9e55-43a9-be8a-cf061c8b6647",
          "targetField": "c6f0c35d-01e7-4017-b20c-becdd3abf16d",
          "cardinality": "1:1"
        },
        {
          "id": "2e023a2b-ac29-4725-a642-9d4f0b38057f",
          "source": "352fe5aa-272f-4f5e-b4df-8b3b016e1642",
          "target": "c620b13f-3913-4d39-8183-acb189258c01",
          "sourceField": "1b73d2d9-ee4a-4c9a-b0d5-576106f80e98",
          "targetField": "c6f0c35d-01e7-4017-b20c-becdd3abf16d",
          "cardinality": "N:1"
        },
        {
          "id": "6e920d6d-3eea-4604-b11c-2f921f035002",
          "source": "2339aa36-7a9e-484c-9269-ee31bd8df818",
          "target": "352fe5aa-272f-4f5e-b4df-8b3b016e1642",
          "sourceField": "c62fa175-0d07-4376-b29d-a59bfce171f5",
          "targetField": "9752b188-2ed7-4a22-a2eb-3a0fe993f416",
          "cardinality": "1:N"
        },
        {
          "id": "b0dc8a02-fa06-4a53-a4f5-feff27dcace3",
          "source": "8bca42dd-9292-4047-aea8-2bf47746b131",
          "target": "352fe5aa-272f-4f5e-b4df-8b3b016e1642",
          "sourceField": "232b284a-47e4-4026-a290-70c37ba28f55",
          "targetField": "9752b188-2ed7-4a22-a2eb-3a0fe993f416",
          "cardinality": "1:1"
        },
        {
          "id": "f2d16fd0-547c-4109-a49e-13f45546f88a",
          "source": "8bca42dd-9292-4047-aea8-2bf47746b131",
          "target": "c620b13f-3913-4d39-8183-acb189258c01",
          "sourceField": "0fb2046f-f7e7-433f-9e98-7e09b119397d",
          "targetField": "c6f0c35d-01e7-4017-b20c-becdd3abf16d",
          "cardinality": "1:1"
        },
        {
          "id": "23f2a4da-a3c2-4a3d-bac3-d75b32bda927",
          "source": "8bca42dd-9292-4047-aea8-2bf47746b131",
          "target": "7ddaf113-9726-4853-b58c-791e9565dcd5",
          "sourceField": "5eee34fb-ccc5-4528-9704-7cd568275db4",
          "targetField": "13f63485-022d-46db-ab61-2d39cfff077f",
          "cardinality": "1:1"
        }
      ],
      "width": 1920,
      "height": 928,
      "frameId": null,
      "colorRole": "default"
    },
    {
      "id": "h44mckmy",
      "type": "line",
      "x": 5584,
      "y": 2130.5,
      "x2": 5751.385087796792,
      "y2": 2368,
      "zIndex": 60,
      "arrowStart": false,
      "arrowEnd": true,
      "color": "#7C3AED",
      "strokeWidth": 3,
      "startItemId": "4qqcbprg",
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "frameId": null,
      "endItemId": "lc6a9mh2",
      "curve": -0.25
    },
    {
      "id": "wjciisxx",
      "x": 5552,
      "y": 1952,
      "zIndex": 61,
      "color": "#ffffff",
      "type": "code",
      "content": "public abstract class BoardItemData\n{\n}\n\npublic sealed class NoteData : BoardItemData\n{\n    public string Content { get; set; } = \"\";\n    public string? Color { get; set; }\n    public TypographyOptions? Typography { get; set; }\n}\n\npublic sealed class ChecklistData : BoardItemData\n{\n    public string Title { get; set; } = \"\";\n    public List<ChecklistEntry> Entries { get; set; } = [];\n}",
      "language": "csharp",
      "width": 480,
      "frameId": null,
      "autoHeight": true
    },
    {
      "id": "8kmj9xst",
      "x": 4704,
      "y": 1888,
      "zIndex": 62,
      "color": "#000000",
      "type": "line",
      "divider": true,
      "x2": 4704,
      "y2": 3392,
      "arrowStart": false,
      "arrowEnd": false,
      "strokeWidth": 3,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "labelFontSize": 11,
      "frameId": null
    },
    {
      "id": "6at7mp5r",
      "type": "line",
      "x": 3520,
      "y": 2232,
      "x2": 3522.6357937538464,
      "y2": 2260,
      "zIndex": 64,
      "arrowStart": false,
      "arrowEnd": true,
      "color": "#7C3AED",
      "strokeWidth": 2,
      "startItemId": "gf6ms9im",
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "frameId": null,
      "endItemId": "7ww3ydsc",
      "curve": -0.4
    },
    {
      "id": "ofc9bpfn",
      "type": "line",
      "x": 3888,
      "y": 1989.2500000000002,
      "x2": 4274.484561084746,
      "y2": 2560,
      "zIndex": 65,
      "arrowStart": false,
      "arrowEnd": true,
      "color": "#7C3AED",
      "strokeWidth": 2,
      "startItemId": "jw1muxjd",
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "frameId": null,
      "endItemId": "s97xly2v",
      "curve": -0.25
    },
    {
      "id": "wq2vad7k",
      "type": "line",
      "x": 5120,
      "y": 2256,
      "x2": 5152,
      "y2": 2258.8554852638345,
      "zIndex": 66,
      "arrowStart": false,
      "arrowEnd": true,
      "color": "#5a8a94",
      "strokeWidth": 3,
      "startItemId": "4qqcbprg",
      "label": "Example data C# boxing",
      "labelMode": "follow-line",
      "labelOffset": 15,
      "frameId": null,
      "endItemId": "wjciisxx",
      "curve": 0,
      "typography": {
        "fontSize": 13
      },
      "labelFontSize": 13
    },
    {
      "id": "32f31e8e-4585-41e5-be6b-cab0cefdeaf4",
      "type": "drawing",
      "x": 4430.8180137353875,
      "y": 1167.9230869802286,
      "width": 417.1193998589233,
      "height": 180.15382603954276,
      "frameId": null,
      "viewWidth": 417.1193998589233,
      "viewHeight": 180.15382603954276,
      "points": [],
      "color": "#7C3AED",
      "strokeWidth": 3,
      "zIndex": 68,
      "strokes": [
        {
          "points": [
            {
              "x": 6,
              "y": 165.33232169954476,
              "pressure": 1
            },
            {
              "x": 6.538560836654142,
              "y": 165.33232169954476,
              "pressure": 1.1682163187869112
            },
            {
              "x": 7.620308399243186,
              "y": 165.33232169954476,
              "pressure": 1.1683764231508378
            },
            {
              "x": 11.596504819245638,
              "y": 166.00259329911455,
              "pressure": 1.1606566819890693
            },
            {
              "x": 22.690265125538644,
              "y": 166.43534822842798,
              "pressure": 1.1073377262176904
            },
            {
              "x": 42.24919173444141,
              "y": 166.6781382281199,
              "pressure": 1.0380035411742639
            },
            {
              "x": 69.11528941895358,
              "y": 165.83054500525395,
              "pressure": 0.9760474528708146
            },
            {
              "x": 98.90331052038891,
              "y": 163.5496142084462,
              "pressure": 0.9285199673373736
            },
            {
              "x": 130.00676036752066,
              "y": 159.68380944127398,
              "pressure": 0.8903019660834965
            },
            {
              "x": 163.40212091624744,
              "y": 153.1891784958416,
              "pressure": 0.8600168816709971
            },
            {
              "x": 192.17536307155933,
              "y": 144.34481945637367,
              "pressure": 0.8467462386749021
            },
            {
              "x": 218.5849327898395,
              "y": 134.51102733764924,
              "pressure": 0.8401629446115294
            },
            {
              "x": 249.10525748955024,
              "y": 121.56183869801362,
              "pressure": 0.8269614944976327
            },
            {
              "x": 282.1413313234725,
              "y": 107.44860191730231,
              "pressure": 0.8105029474495462
            },
            {
              "x": 309.53885950325093,
              "y": 91.37415262270406,
              "pressure": 0.8071966260755825
            },
            {
              "x": 329.7489548822623,
              "y": 77.33376486153497,
              "pressure": 0.821297168798571
            },
            {
              "x": 350.53156942323767,
              "y": 60.809157243287245,
              "pressure": 0.8316560424732109
            },
            {
              "x": 369.4695557581481,
              "y": 45.33676348385529,
              "pressure": 0.8417818211320809
            },
            {
              "x": 379.4453836808643,
              "y": 34.28782595238249,
              "pressure": 0.8973487465851364
            },
            {
              "x": 386.07171350805856,
              "y": 25.825985479117435,
              "pressure": 0.9714797093678036
            },
            {
              "x": 391.06308932418597,
              "y": 18.493834507658676,
              "pressure": 1.0274717386138092
            },
            {
              "x": 394.21249406779407,
              "y": 13.548511625635228,
              "pressure": 1.1136459422328573
            },
            {
              "x": 399.0197268588772,
              "y": 6,
              "pressure": 1.1136459422328573
            }
          ],
          "x": 0,
          "y": 7.475687811422858,
          "scaleX": 1,
          "scaleY": 1,
          "color": "#7C3AED",
          "strokeWidth": 3
        },
        {
          "points": [
            {
              "x": 6,
              "y": 19.54549054283416,
              "pressure": 1
            },
            {
              "x": 6.537894191067608,
              "y": 19.54549054283416,
              "pressure": 1.1692374350097772
            },
            {
              "x": 7.485415481602104,
              "y": 18.969674484337247,
              "pressure": 1.2380886632997155
            },
            {
              "x": 8.626613643910787,
              "y": 18.054656005056586,
              "pressure": 1.2993070388379384
            },
            {
              "x": 11.80138250102209,
              "y": 16.839027158511954,
              "pressure": 1.3021919483413837
            },
            {
              "x": 16.413861328938765,
              "y": 14.129184033092997,
              "pressure": 1.2721112869158917
            },
            {
              "x": 21.787520399999266,
              "y": 11.863660645264417,
              "pressure": 1.2393180631539733
            },
            {
              "x": 26.343934573457773,
              "y": 9.501678385189734,
              "pressure": 1.2626780820070158
            },
            {
              "x": 30.9169385745181,
              "y": 8.067672177440045,
              "pressure": 1.2768185826385559
            },
            {
              "x": 36.287411579449326,
              "y": 7.1687365930740725,
              "pressure": 1.2667040423297475
            },
            {
              "x": 40.520313392224125,
              "y": 6.060267597560141,
              "pressure": 1.2805777971178522
            },
            {
              "x": 42.78284202377381,
              "y": 6,
              "pressure": 1.3745929060571755
            },
            {
              "x": 43.8684708625442,
              "y": 7.805043109052349,
              "pressure": 1.342491061272395
            },
            {
              "x": 43.89633460854384,
              "y": 11.382958877647525,
              "pressure": 1.314469022727504
            },
            {
              "x": 42.66206899092322,
              "y": 15.997566589309145,
              "pressure": 1.2935174528498958
            },
            {
              "x": 41.92577488979441,
              "y": 20.654095306748104,
              "pressure": 1.2718646560193172
            },
            {
              "x": 41.53090510853963,
              "y": 24.321197741801143,
              "pressure": 1.3001357677235426
            },
            {
              "x": 40.70843997195516,
              "y": 28.30475137546796,
              "pressure": 1.3237335949402
            },
            {
              "x": 40.217714335047276,
              "y": 31.24375047280023,
              "pressure": 1.3622563736104394
            },
            {
              "x": 39.39080244527668,
              "y": 32.99998562964424,
              "pressure": 1.4294311649342863
            },
            {
              "x": 37.866464339908816,
              "y": 36.237448054215065,
              "pressure": 1.4294311649342863
            }
          ],
          "x": 367.2230652503795,
          "y": 0,
          "scaleX": 1,
          "scaleY": 1,
          "color": "#7C3AED",
          "strokeWidth": 3
        }
      ],
      "locked": true
    },
    {
      "id": "i5o8quj3",
      "x": 3056,
      "y": 1840,
      "zIndex": 69,
      "color": "#7C3AED",
      "type": "section-title",
      "content": "Backend Plan",
      "width": 320,
      "frameId": null
    },
    {
      "id": "e7efnpd5",
      "x": 4784,
      "y": 1856,
      "zIndex": 70,
      "color": "#7C3AED",
      "type": "section-title",
      "content": "NodexMesh Database Scheme Plan",
      "width": 320,
      "frameId": null
    },
    {
      "id": "m9p17zg3",
      "x": 2772,
      "y": 176,
      "zIndex": 71,
      "color": "#FFBD65",
      "type": "section-title",
      "content": "NodexMesh TODO Section",
      "width": 320,
      "frameId": null
    }
  ]
};

export const demoProjects: Project[] = [nodexMeshDemoProject];
