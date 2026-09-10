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
      "x": 444,
      "y": 1488,
      "zIndex": 1,
      "type": "frame",
      "title": "Preview DEMO",
      "width": 1336,
      "height": 720,
      "color": "#059669",
      "locked": false
    },
    {
      "id": "i1ic5c0b",
      "type": "frame",
      "x": 1871.9999999999998,
      "y": 252,
      "zIndex": 3,
      "title": "Plans for Upcoming Work",
      "width": 1852.0000000000002,
      "height": 848.75,
      "color": "#FF6B8A",
      "locked": true
    },
    {
      "id": "vrnbdk31",
      "type": "frame",
      "x": 444,
      "y": 252,
      "zIndex": 4,
      "title": "NodexMesh Application Overview",
      "width": 1336,
      "height": 1079,
      "color": "#97B6E7",
      "typography": {
        "fontSize": 14,
        "textAlign": "left"
      },
      "opacity": 0.3,
      "locked": true
    },
    {
      "id": "fz0c7s26",
      "x": 3976,
      "y": 252,
      "zIndex": 5,
      "typography": {
        "fontSize": 14
      },
      "type": "kanban",
      "title": "NodexMesh TODO now",
      "width": 1184,
      "columns": [
        {
          "id": "waafkgha",
          "title": "To Do",
          "color": "#5a8a94",
          "cards": [
            {
              "id": "ag14xie",
              "text": "Check that appropriate animations are used everywhere and add them where needed",
              "done": false
            },
            {
              "id": "yt3uz0x",
              "text": "Check and add appropriate cursors where needed (buttons, etc.)",
              "done": false
            }
          ],
          "width": 362
        },
        {
          "id": "z008qcwm",
          "title": "In Progress",
          "color": "#FFBD65",
          "cards": [
            {
              "id": "l299uq1",
              "text": "Fix timeline after reordering schedule the milestones should also reorder",
              "done": false
            },
            {
              "id": "xa2w1pl",
              "text": "Add column expansion to match the Kanban width",
              "done": false
            },
            {
              "id": "q7m9hcm",
              "text": "Implement moving columns in kanban",
              "done": false
            },
            {
              "id": "17z37a1",
              "text": "Fix kanban add cards buttons to be under last task instead of botton of item",
              "done": false
            },
            {
              "id": "se0mgci",
              "text": "Implement drawing on canvas",
              "done": false
            }
          ],
          "width": 395
        },
        {
          "id": "zgnt2ozl",
          "title": "Done",
          "color": "#7C3AED",
          "cards": [
            {
              "id": "9vzcmlx",
              "text": "Change default font family to better one",
              "done": true
            },
            {
              "id": "yq3wber",
              "text": "Adjust diagramblock",
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
              "id": "jcwk1cz",
              "text": "Add a new Divider item",
              "done": true
            },
            {
              "id": "mzg9w9m",
              "text": "Implement a project trash bin with project deletion and restoration",
              "done": true
            },
            {
              "id": "j989dq3",
              "text": "Add the ability to rename a project",
              "done": true
            },
            {
              "id": "uxtrljz",
              "text": "Add vertical text alignment to item alignment options",
              "done": true
            },
            {
              "id": "0fleed0",
              "text": "Fix the drag preview so it shows the item’s current size instead of its default size",
              "done": true
            },
            {
              "id": "dtkgah5",
              "text": "Change the dark mode background to a grayer shade",
              "done": true
            },
            {
              "id": "a91280v",
              "text": "Add long alignment guides while dragging so items can be aligned vertically and horizontally with distant items",
              "done": true
            },
            {
              "id": "3dpm65t",
              "text": "Show the item center while dragging for easier positioning relative to other items on the board",
              "done": true
            },
            {
              "id": "5g5xe83",
              "text": "Add auto-fit to checklists",
              "done": true
            },
            {
              "id": "2s6ddz0",
              "text": "Fix task height in checklists",
              "done": true
            },
            {
              "id": "yiw3ydt",
              "text": "Increase the default item width",
              "done": true
            }
          ],
          "width": 351
        }
      ],
      "color": "#292929",
      "topColor": "#FF6B8A",
      "tags": [
        "todo"
      ],
      "locked": true,
      "height": 628
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
      "color": "#eff6ff"
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
      "content": "The application is primarily a free and interesting alternative to the well-known Milanote platform.\n\nThe goal is to make it available to everyone and easy to run locally using\nDocker Compose",
      "color": "#fdf4ff",
      "width": 320,
      "locked": false,
      "tags": [],
      "comments": []
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
      "tags": []
    },
    {
      "id": "t2kf54un",
      "x": 1424,
      "y": 816,
      "zIndex": 10,
      "type": "link",
      "url": "https://github.com/Lewan24/NodexMesh",
      "title": "Nodex Mesh",
      "description": "GitHub project",
      "width": 320,
      "height": 144,
      "color": "#F7CAE3",
      "topColor": "#7C3AED",
      "locked": false
    },
    {
      "id": "k2i1bpy4",
      "x": 1424,
      "y": 985.002500250025,
      "zIndex": 11,
      "typography": {
        "textAlign": "center"
      },
      "type": "note",
      "content": "Feel free to fork the project, improve the code, add useful features or fixes, and submit a Pull Request. Contributions and collaboration are welcome.",
      "color": "#fce7f3",
      "width": 320,
      "topColor": "#7C3AED",
      "locked": false
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
      "content": "All required information, commands, and setup recommendations are available on the project page",
      "color": "#FDF4FF",
      "width": 320,
      "locked": false
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
      "locked": false
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
      "content": "NodexMesh is still under active development and continuous improvement. A working demo is currently available to everyone for free and can be opened directly in a browser using the link in the project’s GitHub repository.\n\nAll demo data is stored exclusively in the browser’s local storage, so changes and data created in the DEMO version may disappear after some updates.\n\nTo reset the data, clear local storage in your browser’s developer tools (F12).\nAlternatively, open the user menu in the top-right corner and use the\nReset DEMO\nbutton.",
      "color": "#fff7ed",
      "width": 320,
      "locked": false
    },
    {
      "id": "zk08gdfv",
      "x": 480,
      "y": 1524,
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
      "locked": false
    },
    {
      "id": "u9oshol5",
      "x": 1907.9999999999998,
      "y": 288,
      "zIndex": 16,
      "typography": {
        "fontSize": 16,
        "textAlign": "left"
      },
      "type": "checklist",
      "title": "Future Plans",
      "color": "#f0fdf4",
      "width": 580,
      "entries": [
        {
          "id": "iu56k6t",
          "text": "Custom application color themes",
          "done": false
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
      "locked": true,
      "comments": []
    },
    {
      "id": "92oyuwgd",
      "x": 2184.261725508746,
      "y": 761,
      "zIndex": 17,
      "type": "line",
      "x2": 1934.599797175519,
      "y2": 838.5,
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
      "labelMode": "follow-line"
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
      "content": "The API will be built with\nC# .NET 10\n\nThe API is planned as a secure system designed with the\nOWASP Top 10\nin mind.\n\nThe API will run in a separate container, with the whole system defined in a single\ndocker-compose.yml\nfile so the application can be started easily and containers can be updated without hassle.\n\nAll required instructions, recommendations, and important information are available in the relevant sections of the project’s GitHub page.",
      "color": "#fdf4ff",
      "width": 448,
      "tags": [
        "todo"
      ],
      "locked": false
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
      "color": "#eff6ff",
      "locked": false
    },
    {
      "id": "ltbomker",
      "x": 2528,
      "y": 288,
      "zIndex": 20,
      "type": "checklist",
      "title": "New Tools and Functionalities",
      "color": "#eff6ff",
      "width": 616,
      "entries": [
        {
          "id": "80d2lhr",
          "text": "Drawing - drawing on canvas",
          "done": false
        },
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
        }
      ],
      "topColor": "#059669",
      "tags": [
        "todo"
      ],
      "locked": true,
      "typography": {
        "fontFamily": "sans"
      }
    },
    {
      "id": "kpmbh2p6",
      "x": 444,
      "y": 1350.0025002500252,
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
      "locked": false
    },
    {
      "id": "3pvxvzuq",
      "x": 3192,
      "y": 288,
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
        }
      ],
      "locked": true
    },
    {
      "id": "nq1ujv06",
      "x": 1871.9999999999998,
      "y": 1160,
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
          "done": false,
          "color": "#000000",
          "checklist": [
            {
              "id": "682e44c6-f0d1-41a9-899d-49f134554f44",
              "text": "Timeline",
              "done": false
            },
            {
              "id": "cafcb6a4-1398-4ae6-91d9-4a44b2450f82",
              "text": "Kanban",
              "done": false
            }
          ]
        },
        {
          "id": "20c613f9-eea7-4bc5-956b-309de5a25b6b",
          "title": "Implement drawing on canvas",
          "start": "2026-09-10",
          "end": "2026-09-11",
          "done": false,
          "color": "#000000",
          "checklist": []
        },
        {
          "id": "42ee8a21-df57-4469-b780-57ab0b80d59f",
          "title": "Implement new blocks",
          "start": "2026-09-11",
          "end": "2026-09-12",
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
          "start": "2026-09-13",
          "end": "2026-09-13",
          "done": false,
          "color": "#000000",
          "checklist": []
        },
        {
          "id": "2c951fc5-1c9a-4ef1-9eed-0e8d2336620c",
          "title": "Open Tests",
          "start": "2026-09-14",
          "end": "2026-09-18",
          "done": false,
          "color": "#ed4040",
          "checklist": []
        },
        {
          "id": "d6bdf52e-398a-4e04-845f-09f4512c61cb",
          "title": "API Implementation",
          "start": "2026-09-19",
          "end": "2026-10-04",
          "done": false,
          "color": "#7c40ed",
          "checklist": []
        }
      ],
      "width": 968.0000000000002,
      "height": 552,
      "locked": true,
      "tags": [
        "todo"
      ]
    },
    {
      "id": "pt0s0vqq",
      "x": 1824,
      "y": 224,
      "zIndex": 24,
      "type": "line",
      "divider": true,
      "x2": 1824,
      "y2": 2224,
      "arrowStart": false,
      "arrowEnd": false,
      "color": "#000000",
      "strokeWidth": 5,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "labelFontSize": 11,
      "locked": true
    },
    {
      "id": "ot43ea9e",
      "x": 3244,
      "y": 1160,
      "zIndex": 25,
      "type": "document",
      "title": "Updates info",
      "content": "<h2>             Updates and timeline</h2><p>Updates are made practically everyday. timeline here is the <strong>new block</strong> that should help me <em>(and you for your future projects)</em> to plan the tasks of new features, fixes etc.</p><p>The project is growing and I'm adding new useful things, if you have any new ideas and you think that your new feature would help in creating project, plans etc in this app, just go to my <strong><u>github project</u></strong> <em>(link next to this document) </em>and create the feature improvement issue. Or you can fork the project and create the feature by yourself, so if you would want to have this in official codebase, just create <strong>pull request</strong> and wait for <strong>review</strong>.</p>",
      "width": 480,
      "autoHeight": true,
      "locked": true
    },
    {
      "id": "e541ca6e-b0fd-4a73-90d4-2eb14b0077f0",
      "x": 3424,
      "y": 1584,
      "zIndex": 26,
      "type": "link",
      "url": "https://github.com/Lewan24/NodexMesh",
      "title": "Nodex Mesh",
      "description": "GitHub project",
      "width": 320,
      "height": 144,
      "color": "#ffffff",
      "topColor": "#7C3AED",
      "locked": true
    },
    {
      "id": "hoa4eb8k",
      "x": 1871.9999999999998,
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
      "locked": true
    },
    {
      "id": "vwmgpl6g",
      "x": 1824,
      "y": 1776,
      "zIndex": 28,
      "type": "line",
      "divider": true,
      "x2": 3744,
      "y2": 1776,
      "arrowStart": false,
      "arrowEnd": false,
      "color": "#000000",
      "strokeWidth": 5,
      "label": "Example diagram",
      "labelMode": "horizontal",
      "labelOffset": 0,
      "labelFontSize": 24,
      "locked": true
    }
  ]
};

export const demoProjects: Project[] = [nodexMeshDemoProject];