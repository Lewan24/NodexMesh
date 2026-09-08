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
      "x": 2188,
      "y": 1360,
      "zIndex": 1,
      "type": "frame",
      "title": "Preview DEMO",
      "width": 1272,
      "height": 692,
      "color": "#059669",
      "locked": true
    },
    {
      "id": "8n9j475u",
      "x": 988,
      "y": 1436,
      "zIndex": 2,
      "type": "frame",
      "title": "Larger Future Plans",
      "width": 792,
      "height": 435.25,
      "color": "#FFBD65",
      "locked": true,
      "tags": []
    },
    {
      "id": "i1ic5c0b",
      "type": "frame",
      "x": 1820,
      "y": 252,
      "zIndex": 3,
      "title": "Plans for Upcoming Work",
      "width": 1992,
      "height": 672.5,
      "color": "#FF6B8A"
    },
    {
      "id": "vrnbdk31",
      "type": "frame",
      "x": 444,
      "y": 252,
      "zIndex": 4,
      "title": "NodexMesh Application Overview",
      "width": 1336,
      "height": 1075,
      "color": "#97B6E7",
      "typography": {
        "fontSize": 14,
        "textAlign": "left"
      },
      "opacity": 0.3,
      "locked": false
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
              "text": "Check that appropriate animations are used everywhere and add them where needed",
              "done": false
            },
            {
              "id": "mzg9w9m",
              "text": "Implement a project trash bin with project deletion and restoration",
              "done": false
            },
            {
              "id": "jcwk1cz",
              "text": "Add a new Divider item",
              "done": false
            },
            {
              "id": "lc89o0h",
              "text": "Fix the app bar occasionally bugging out and disappearing",
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
              "id": "j989dq3",
              "text": "Add the ability to rename a project",
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
      "height": 592,
      "tags": [
        "todo"
      ]
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
      "content": "A free alternative to Milanote",
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
      "x": 2224,
      "y": 1396,
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
      "height": 592,
      "locked": true
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
      "title": "Future Plans",
      "color": "#f0fdf4",
      "width": 720,
      "entries": [
        {
          "id": "ocr2hdf",
          "text": "Real-time collaboration (SignalR or something similar)",
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
          "id": "djyv3l0",
          "text": "Read-only project sharing",
          "done": false
        },
        {
          "id": "9dbhmvw",
          "text": "Display images from the user’s library instead of requiring a link (link optional)",
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
      "x": 1584,
      "y": 1248,
      "zIndex": 17,
      "type": "line",
      "x2": 1878.599797175519,
      "y2": 838.5,
      "arrowStart": true,
      "arrowEnd": true,
      "color": "#02A0A0",
      "strokeWidth": 3,
      "startItemId": "u9oshol5",
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
      "x": 3088,
      "y": 288,
      "zIndex": 20,
      "type": "checklist",
      "title": "New Tools",
      "color": "#eff6ff",
      "width": 688,
      "entries": [
        {
          "id": "orzndok",
          "text": "Project management",
          "done": false
        },
        {
          "id": "598ijs7",
          "text": "Context menu with actions such as copy, paste, duplicate, delete, etc.",
          "done": false
        },
        {
          "id": "amauumq",
          "text": "Mind Map with connections, automatic layout, etc.",
          "done": false
        },
        {
          "id": "bpsxu1m",
          "text": "Divider",
          "done": false
        },
        {
          "id": "zy10hcl",
          "text": "Bookmarks for saving important board locations for quick access later",
          "done": false
        },
        {
          "id": "nei5eao",
          "text": "IconBlock - selectable custom icons or icons loaded from a link",
          "done": false
        },
        {
          "id": "gyivr8p",
          "text": "CodeBlock - nicely formatted code display with language selection and default syntax highlighting",
          "done": false
        },
        {
          "id": "c66tsis",
          "text": "EmbedBlock - display content such as a YouTube video, image, or website",
          "done": false
        },
        {
          "id": "qr6jjla",
          "text": "Improve Note by adding a source link with automatic opening",
          "done": false
        },
        {
          "id": "m6h1l06",
          "text": "Sub-board node / portal for opening a new canvas or navigating to another project",
          "done": false
        },
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
          "id": "c56kuez",
          "text": "Filter and search the board for specific text, tags, etc.",
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
        }
      ],
      "topColor": "#059669",
      "tags": [
        "todo"
      ],
      "locked": false
    },
    {
      "id": "kpmbh2p6",
      "x": 2160,
      "y": 1070,
      "zIndex": 21,
      "typography": {
        "fontSize": 32,
        "textAlign": "center",
        "verticalAlign": "middle"
      },
      "type": "text",
      "content": "Search for #todo in the app bar to display all items marked as tasks",
      "size": "lg",
      "width": 1328,
      "height": 98,
      "color": "#0d2a35",
      "locked": true
    }
  ]
};

export const demoProjects: Project[] = [nodexMeshDemoProject];