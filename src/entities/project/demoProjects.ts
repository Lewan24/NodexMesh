import { Project } from '@/entities/project/types';
import { DEMO_USER_ID } from '@/entities/user/mockUsers';

export const nodexMeshDemoProject: Project = {
  "id": "da96cf7e-18bc-4e86-9b8a-32e13c0bac0b",
  "ownerId": DEMO_USER_ID,
  "name": "NodexMesh",
  "color": "#059669",
  "items": [
    {
      "title": "Preview DEMO",
      "color": "#059669",
      "id": "02bbd06e-fd96-444c-8df5-a43448e30a41",
      "type": "frame",
      "x": 444,
      "y": 1760,
      "zIndex": 0,
      "width": 1336,
      "height": 720,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "title": "Plans for Upcoming Work",
      "color": "#FF6B8A",
      "id": "fcf7d5c5-0f12-466a-b7e8-ec7908901720",
      "type": "frame",
      "x": 1872,
      "y": 1088,
      "zIndex": 0,
      "width": 1852,
      "height": 644,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "title": "NodexMesh Application Overview",
      "opacity": 0.3,
      "color": "#97B6E7",
      "typography": {
        "fontSize": 14,
        "textAlign": "left"
      },
      "id": "4c4f3e69-1d63-4948-ab38-faaabc7b1585",
      "type": "frame",
      "x": 444,
      "y": 252,
      "zIndex": 0,
      "width": 1336,
      "height": 1268,
      "frameId": null,
      "locked": true,
      "comments": [],
      "tags": []
    },
    {
      "title": "NodexMesh TODO now",
      "columns": [
        {
          "id": "a214c6b6-bcb2-4c89-9765-cafab5e8f4a2",
          "title": "Nice to do",
          "color": "#5a8a94",
          "cards": [
            {
              "id": "24763eb0-ffc8-40a1-bcb7-88f1110fed3b",
              "text": "Implement MindMapBlock",
              "done": false
            },
            {
              "id": "05d0d64e-b580-4f03-8222-936b5d51d5af",
              "text": "Make in timeline tasks show and dissappear when moving to the left or right",
              "done": true
            },
            {
              "id": "a5386ae7-f1c7-4367-a1a3-48b2e1968a31",
              "text": "Implement IconBlock",
              "done": true
            },
            {
              "id": "2e572682-dccc-4e6d-8cca-41059a45d9d2",
              "text": "Add column expansion to match the Kanban width",
              "done": true
            },
            {
              "id": "4ee48b92-3cf9-4285-8a15-37e15e62401f",
              "text": "Check and add appropriate cursors where needed (buttons, etc.)",
              "done": true
            },
            {
              "id": "7f0560e2-bea9-41c6-b00b-98629ed65cc7",
              "text": "Implement copy style and paste style on items like color or typography and font size",
              "done": true
            },
            {
              "id": "a0855ef3-95c6-4f00-84f9-f8becd07a338",
              "text": "Change default theme colors to better ones",
              "done": true
            },
            {
              "id": "f2f1499d-7642-46fe-a808-9b1ead34b34f",
              "text": "Implement arrows flexibility",
              "done": true
            },
            {
              "id": "5b8b8932-7a57-4453-bacd-da9382792cf4",
              "text": "Increase the default item width",
              "done": true
            },
            {
              "id": "8a973214-de82-441a-b3fb-997210c305bb",
              "text": "Change the dark mode background to a grayer shade",
              "done": true
            },
            {
              "id": "1d14d48d-02cd-4a83-9a23-d508fe00c02a",
              "text": "Check that appropriate animations are used everywhere and add them where needed",
              "done": true
            },
            {
              "id": "e92fb8bb-1d2d-4e0c-88ee-f5580539740d",
              "text": "Add changing colors in kanban columns",
              "done": true
            },
            {
              "id": "5c5fd41c-84bf-4b1f-9037-6ba1bcfe2359",
              "text": "Implement multi selected drawing to change color and width for all of them",
              "done": true
            },
            {
              "id": "3cfc5343-7883-4591-9f4e-007c6a82b8f3",
              "text": "Add more funny and nice hand writting fonts",
              "done": true
            },
            {
              "id": "9e186423-490d-40d7-a6c2-2ab96980946c",
              "text": "Change new items to be more squares instead of rounded",
              "done": true
            },
            {
              "id": "1d5fee50-b5f2-47e2-bf22-25876ca24694",
              "text": "Add a new Divider item",
              "done": true
            }
          ],
          "width": 362
        },
        {
          "id": "a9a88af5-677f-40ba-8e3c-3adf0cee0645",
          "title": "Important",
          "color": "#FFBD65",
          "cards": [
            {
              "id": "9754ae34-129f-435e-8dc0-e6a81c3c1a0e",
              "text": "Implement go to items on enter while highlighting them from searchbox",
              "done": false
            },
            {
              "id": "76b72db4-e5d5-42f7-a46d-3eb4d0a48642",
              "text": "Implement button for drawings to make them smooth",
              "done": false
            },
            {
              "id": "0c865738-3863-43d1-ac41-0b4f78f0ea18",
              "text": "Implement new way to update demo projekt",
              "done": true
            },
            {
              "id": "898e12c5-c658-4b57-af4d-f7913d676a0f",
              "text": "Implement horizontal layout for diagram",
              "done": true
            },
            {
              "id": "3616539c-f369-4f8f-a4bf-3bb8e7dc90e7",
              "text": "Change the float numbers like x, y, pressure etc to make it smaller and upgrade the efficiency",
              "done": true
            },
            {
              "id": "68367d0f-e4d8-4a22-ab6a-44ba73626da8",
              "text": "One click on arrow to cleate siblin items dont work on mobile device",
              "done": true
            },
            {
              "id": "3c1e397e-f072-45ab-99d7-60abfe1cd264",
              "text": "Check all the code and files and make them better readable for humans",
              "done": true
            },
            {
              "id": "dede08e8-1d47-4b99-9d47-74999d4440bc",
              "text": "Implement column resizing of tasks in timeline",
              "done": true
            },
            {
              "id": "6c1df3b8-bd1c-4a7c-8f0e-0a0fd089eba7",
              "text": "Implement reordering fields in database block",
              "done": true
            },
            {
              "id": "980c752c-9178-482a-9c54-1f314f046941",
              "text": "Fix Database diagram preview, not working properly connections",
              "done": true
            },
            {
              "id": "105d4a13-cfff-445d-b82a-512d057aa591",
              "text": "Change editbar colors to accents and make them theme related",
              "done": true
            },
            {
              "id": "5c060651-9414-4ec3-a477-5f24333eee1e",
              "text": "Fix task height in checklists",
              "done": true
            },
            {
              "id": "2d1d74b8-3413-4123-8f2b-f065c5d98a41",
              "text": "Implement DbDiagramBlock",
              "done": true
            },
            {
              "id": "1257e9fb-b146-4f88-9b61-b1ee95bbd40c",
              "text": "Implement manual cleaning projects trash",
              "done": true
            },
            {
              "id": "98dc3def-2ac0-4a1b-9807-0f75f159bc6b",
              "text": "Update readme",
              "done": true
            },
            {
              "id": "95bcbf50-1113-42d1-bd51-d986295f9342",
              "text": "Add auto-fit to checklists",
              "done": true
            },
            {
              "id": "787f3f62-ccb4-40be-a1af-1c4ff66fe05f",
              "text": "Add vertical text alignment to item alignment options",
              "done": true
            },
            {
              "id": "3fa338ea-1d10-4eef-a70e-2d0c952557fa",
              "text": "Adjust diagramblock",
              "done": true
            },
            {
              "id": "868b7954-e910-4dbc-969a-7ca010959c7f",
              "text": "Fix timeline after reordering schedule the milestones should also reorder",
              "done": true
            },
            {
              "id": "b181510c-c611-4ab4-80d4-95e16bf46d37",
              "text": "Fix youtube embed video to edit video settings and captions",
              "done": true
            },
            {
              "id": "c82878c3-99b2-45dc-8266-600368e8e72c",
              "text": "Add compability to moving checklist items to kanban, and from kanban to checklist (.items are basicaly the same)",
              "done": true
            },
            {
              "id": "e5c07d5e-49cb-473b-8abd-0654ebe60c24",
              "text": "Fix data-scroll in timeline",
              "done": true
            },
            {
              "id": "78fd9b03-c7d3-4949-b29b-6245ab3e62ee",
              "text": "Implement moving columns in kanban",
              "done": true
            },
            {
              "id": "fdd54703-dde1-4bb4-9b5c-672083ed2951",
              "text": "Fix kanban add cards buttons to be under last task instead of botton of item",
              "done": true
            }
          ],
          "width": 395
        },
        {
          "id": "9388443a-8261-4d9c-b322-1d69a776f006",
          "title": "Must have",
          "color": "#02A0A0",
          "cards": [
            {
              "id": "54622807-1740-42a7-b802-a36601b0ec5e",
              "text": "Implement export/import projects",
              "done": true
            },
            {
              "id": "e4b219de-a33f-4484-bd7e-732cf81aeb12",
              "text": "Fix on mobile devices moving items like kanban, now it opens the context menu instead of moving",
              "done": true
            },
            {
              "id": "f4caf084-4c0a-4ce1-bf5e-57368b03e6e1",
              "text": "Implement mobile devices compability",
              "done": true
            },
            {
              "id": "7d309b19-2210-4c14-8929-0a1babb6c728",
              "text": "Plan database scheme",
              "done": true
            },
            {
              "id": "00709370-d4e7-4ca4-a575-983b28080c7b",
              "text": "Plan backend",
              "done": true
            },
            {
              "id": "738b7c80-f82e-4e87-a6e5-a929ea083823",
              "text": "Show the item center while dragging for easier positioning relative to other items on the board",
              "done": true
            },
            {
              "id": "173c5135-ca89-4a75-96c9-598de9185409",
              "text": "Implement theme colors changing and saving that data",
              "done": true
            },
            {
              "id": "7a219bdd-7b6e-4059-ba14-9dff963f1376",
              "text": "Add long alignment guides while dragging so items can be aligned vertically and horizontally with distant items",
              "done": true
            },
            {
              "id": "ab70d5af-6d49-4797-b7be-524735ca69f9",
              "text": "Fix the drag preview so it shows the item’s current size instead of its default size",
              "done": true
            },
            {
              "id": "9031a94b-759e-4751-b5a2-c140612b5c00",
              "text": "Add the ability to rename a project",
              "done": true
            },
            {
              "id": "8cc3b091-bab6-4c7b-b48e-d9f5e9c83e09",
              "text": "Implement drawing on canvas",
              "done": true
            },
            {
              "id": "1e5cfad2-1a81-4dc3-9613-a867ff084c8e",
              "text": "Change default font family to better one",
              "done": true
            },
            {
              "id": "6c54f22f-8ae6-4d79-b4ef-4217ffb91ffd",
              "text": "Fix timelineblock (implement reordering rows)",
              "done": true
            },
            {
              "id": "85be451d-3c05-41c9-b897-62a92bddde93",
              "text": "Fix embedBlock for yt videos to instant interact instead of clicking interract",
              "done": true
            },
            {
              "id": "3b05c9f6-528d-4ec8-94b9-e4f8313453c9",
              "text": "Fix document block error",
              "done": true
            },
            {
              "id": "b3710627-aa2d-4c27-965b-7f08f715e358",
              "text": "Fix the app bar occasionally bugging out and disappearing",
              "done": true
            },
            {
              "id": "46e5d65c-49d9-4d98-bf49-b85fc7b85992",
              "text": "Implement a project trash bin with project deletion and restoration",
              "done": true
            }
          ],
          "width": 362
        }
      ],
      "typography": {
        "fontSize": 14
      },
      "color": "#2E2E2E",
      "topColor": "#FF6B8A",
      "gradient": {
        "from": "#000000",
        "to": "#2d006b",
        "angle": 135,
        "kind": "radial"
      },
      "id": "5b4f2347-8bf1-48f5-8e79-315472f28960",
      "type": "kanban",
      "x": 1884,
      "y": 252,
      "zIndex": 5,
      "width": 1208,
      "height": 628,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [
        "todo"
      ]
    },
    {
      "content": "A free alternative to Milanote",
      "size": "lg",
      "typography": {
        "textAlign": "center",
        "fontSize": 30,
        "italic": true
      },
      "textAlign": "center",
      "color": "#eff6ff",
      "id": "99837b16-1b04-46e8-b9bd-c83eccbd1f97",
      "type": "text",
      "x": 1472,
      "y": 64,
      "zIndex": 6,
      "width": 720,
      "height": 60,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "content": "NodexMesh",
      "size": "lg",
      "typography": {
        "fontSize": 40,
        "textAlign": "center",
        "bold": true
      },
      "textAlign": "center",
      "color": "#fefce8",
      "id": "984d6bbf-cc87-4750-a562-415c33010071",
      "type": "text",
      "x": 1664,
      "y": 4,
      "zIndex": 7,
      "width": 336,
      "height": 74,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "content": "The application is primarily a free and interesting alternative to the well-known Milanote platform.\n\nThe goal is to make it available to everyone and easy to run locally using\nDocker Compose",
      "typography": {
        "textAlign": "center",
        "fontFamily": "short-stack"
      },
      "color": "#fdf4ff",
      "colorRole": "default",
      "id": "a694fbf8-832b-43e4-af8c-192aa24f254a",
      "type": "note",
      "x": 1024,
      "y": 288,
      "zIndex": 8,
      "width": 320,
      "frameId": "4c4f3e69-1d63-4948-ab38-faaabc7b1585",
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "content": "NodexMesh\nThe application will offer many familiar features to make the system pleasant and convenient to use.\nIt will also include additional tools and quality-of-life features such as:\n\n- Expandable Kanban boards\n- Smooth animations and task/item statuses\n- Grouping\n- An edit bar with extensive customization options\n- And much more\n\nThe application will remain free, actively developed, and supported, so you can report bugs and expect updates with fixes.\nYou can also contribute to the project using the project page below:",
      "typography": {
        "bold": false,
        "fontSize": 14,
        "textAlign": "center"
      },
      "color": "#fce7f3",
      "colorRole": "accent4",
      "id": "add9a329-a51d-4866-9adc-742b41a1dd16",
      "type": "note",
      "x": 1424,
      "y": 288,
      "zIndex": 9,
      "width": 320,
      "frameId": "4c4f3e69-1d63-4948-ab38-faaabc7b1585",
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "url": "https://github.com/Lewan24/NodexMesh",
      "title": "Nodex Mesh",
      "description": "GitHub project",
      "color": "#F7CAE3",
      "topColor": "#7C3AED",
      "colorRole": "accent3",
      "id": "b0bebc4a-06d0-4003-aebe-1f57c6efe430",
      "type": "link",
      "x": 1424,
      "y": 896,
      "zIndex": 10,
      "width": 320,
      "height": 144,
      "frameId": "4c4f3e69-1d63-4948-ab38-faaabc7b1585",
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "content": "Feel free to fork the project, improve the code, add useful features or fixes, and submit a Pull Request. Contributions and collaboration are welcome.",
      "typography": {
        "textAlign": "center"
      },
      "color": "#fce7f3",
      "topColor": "#7C3AED",
      "colorRole": "accent4",
      "id": "dbb9776a-6418-4e4c-bdb0-3f4ddec3e565",
      "type": "note",
      "x": 1424,
      "y": 1088,
      "zIndex": 11,
      "width": 320,
      "frameId": "4c4f3e69-1d63-4948-ab38-faaabc7b1585",
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "content": "All required information, commands, and setup recommendations are available on the project page",
      "typography": {
        "textAlign": "center"
      },
      "color": "#FDF4FF",
      "colorRole": "accent3",
      "id": "f4f6372f-0fcf-4f76-9927-815ac6f2dddc",
      "type": "note",
      "x": 1024,
      "y": 608,
      "zIndex": 12,
      "width": 320,
      "frameId": "4c4f3e69-1d63-4948-ab38-faaabc7b1585",
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "x2": 1424,
      "y2": 857,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 3,
      "color": "#7C3AED",
      "id": "5790bc81-e122-45fa-8d2b-a960e4d78fe1",
      "type": "line",
      "x": 1312,
      "y": 691,
      "zIndex": 13,
      "frameId": "4c4f3e69-1d63-4948-ab38-faaabc7b1585",
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "f4f6372f-0fcf-4f76-9927-815ac6f2dddc",
      "endItemId": "b0bebc4a-06d0-4003-aebe-1f57c6efe430"
    },
    {
      "content": "NodexMesh is still under active development and continuous improvement. A working demo is currently available to everyone for free and can be opened directly in a browser using the link in the project’s GitHub repository.\n\nAll demo data is stored exclusively in the browser’s local storage, so changes and data created in the DEMO version may disappear after some updates.\n\nTo reset the data, clear local storage in your browser’s developer tools (F12).\nAlternatively, open the user menu in the top-right corner and use the\nReset DEMO\nbutton.",
      "typography": {
        "textAlign": "center"
      },
      "color": "#fff7ed",
      "colorRole": "accent2",
      "id": "1d3c775d-c14f-41b9-8e73-927c468d5f48",
      "type": "note",
      "x": 1024,
      "y": 811,
      "zIndex": 14,
      "width": 320,
      "frameId": "4c4f3e69-1d63-4948-ab38-faaabc7b1585",
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "url": "https://github.com/Lewan24/NodexMesh/blob/main/Assets/Preview.png?raw=true",
      "caption": "https://github.com/Lewan24/NodexMesh/blob/main/Assets/Preview.png",
      "imgHeight": 620,
      "variant": "card",
      "typography": {
        "textAlign": "center"
      },
      "color": "#ffffff",
      "id": "bda86476-977e-43a4-bbe7-97353f32e42e",
      "type": "image",
      "x": 480,
      "y": 1796,
      "zIndex": 15,
      "width": 1264,
      "height": 620,
      "frameId": "02bbd06e-fd96-444c-8df5-a43448e30a41",
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "title": "Future Plans",
      "entries": [
        {
          "id": "35cbf4b2-003a-471b-96b7-d2fb2352f457",
          "text": "Custom application color themes",
          "done": true
        },
        {
          "id": "b8bcb8a1-c111-40c9-b2c2-5d32e592aba2",
          "text": "Add a global trash bin for items so previously deleted elements can be restored",
          "done": false
        },
        {
          "id": "7d9aca6f-561d-4adb-bb94-bc0c61b67278",
          "text": "Implement project export and import between NodexMesh instances",
          "done": false
        },
        {
          "id": "aacd4a59-1a00-4ae9-af86-13736eb8d8b1",
          "text": "API in C# .NET 10",
          "done": false
        },
        {
          "id": "4659962b-7c2b-4b9a-bf3c-9423492155d7",
          "text": "Follow the OWASP Top 10 when implementing the API",
          "done": false
        },
        {
          "id": "007404f3-eb00-4958-9b87-afe2f9a052a3",
          "text": "Display images from the user’s library instead of requiring a link (link optional)",
          "done": false
        },
        {
          "id": "e3e36f1d-5829-4a31-ae0b-1ec654e639f6",
          "text": "Real-time collaboration (SignalR or something similar)",
          "done": false
        },
        {
          "id": "8e2b5802-492d-45d1-aa42-04bf2c56aee0",
          "text": "Read-only project sharing",
          "done": false
        }
      ],
      "typography": {
        "fontSize": 16,
        "textAlign": "left"
      },
      "color": "#ffffff",
      "topColor": "#7C3AED",
      "id": "ddefc0ad-4203-475a-9f8b-0af5bb648d79",
      "type": "checklist",
      "x": 1908,
      "y": 1124,
      "zIndex": 16,
      "width": 580,
      "frameId": "fcf7d5c5-0f12-466a-b7e8-ec7908901720",
      "locked": false,
      "comments": [],
      "tags": [
        "todo"
      ]
    },
    {
      "x2": 1935,
      "y2": 1675,
      "arrowStart": true,
      "arrowEnd": true,
      "strokeWidth": 3,
      "label": "TODO Lists",
      "labelOffset": 21,
      "labelFontSize": 21,
      "labelMode": "follow-line",
      "color": "#02A0A0",
      "id": "6550746c-6de8-4f0d-9ca5-f886cca5c1f1",
      "type": "line",
      "x": 2184,
      "y": 1597,
      "zIndex": 17,
      "frameId": "fcf7d5c5-0f12-466a-b7e8-ec7908901720",
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "fcf7d5c5-0f12-466a-b7e8-ec7908901720",
      "endItemId": "5b4f2347-8bf1-48f5-8e79-315472f28960"
    },
    {
      "content": "The API will be built with\nC# .NET 10\n\nThe API is planned as a secure system designed with the\nOWASP Top 10\nin mind.\n\nThe API will run in a separate container, with the whole system defined in a single\ndocker-compose.yml\nfile so the application can be started easily and containers can be updated without hassle.\n\nAll required instructions, recommendations, and important information are available in the relevant sections of the project’s GitHub page.",
      "typography": {
        "textAlign": "center",
        "fontFamily": "short-stack"
      },
      "color": "#fdf4ff",
      "colorRole": "default",
      "id": "c7f06854-4633-4d99-9e05-30bf0b29de5b",
      "type": "note",
      "x": 480,
      "y": 560,
      "zIndex": 18,
      "width": 448,
      "frameId": "4c4f3e69-1d63-4948-ab38-faaabc7b1585",
      "locked": false,
      "comments": [],
      "tags": [
        "todo"
      ]
    },
    {
      "content": "Api",
      "size": "lg",
      "typography": {
        "textAlign": "center",
        "bold": true,
        "fontSize": 32
      },
      "textAlign": "center",
      "topColor": "#7C3AED",
      "colorRole": "accent5",
      "id": "acf553e6-d2a2-417a-b3e3-64c6c7d2bbfc",
      "type": "text",
      "x": 608,
      "y": 500,
      "zIndex": 19,
      "width": 192,
      "frameId": "4c4f3e69-1d63-4948-ab38-faaabc7b1585",
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "title": "New Tools and Functionalities",
      "entries": [
        {
          "id": "13788a17-797b-4767-bfbc-92badb937507",
          "text": "Mind Map with connections, automatic layout, etc.",
          "done": false
        },
        {
          "id": "0c9f64e6-c0ea-4d52-8cc6-d33199562111",
          "text": "Bookmarks for saving important board locations for quick access later",
          "done": false
        },
        {
          "id": "391ae849-ee5d-47f2-81f4-8d5c4d35d4c9",
          "text": "Sub-board node / portal for opening a new canvas or navigating to another project",
          "done": false
        },
        {
          "id": "185ac43f-8b41-408e-99f5-20767b034bc7",
          "text": "IconBlock - selectable custom icons or icons loaded from a link",
          "done": true
        },
        {
          "id": "639055ca-40f2-4f75-8c75-82ec8a01c74f",
          "text": "DbDiagramBlock - item to plan and prepare version of database like tables, relations etc",
          "done": true
        }
      ],
      "color": "#ffffff",
      "topColor": "#059669",
      "typography": {
        "fontFamily": "short-stack"
      },
      "id": "48f83ef0-cae5-4284-9250-affec5b04979",
      "type": "checklist",
      "x": 2528,
      "y": 1124,
      "zIndex": 20,
      "width": 616,
      "frameId": "fcf7d5c5-0f12-466a-b7e8-ec7908901720",
      "locked": false,
      "comments": [],
      "tags": [
        "todo"
      ]
    },
    {
      "content": "Search for #todo in the app bar to display all items marked as tasks",
      "size": "lg",
      "typography": {
        "fontSize": 32,
        "textAlign": "center",
        "verticalAlign": "middle"
      },
      "color": "#0d2a35",
      "id": "f9e87d60-9fd7-4f2c-bbbd-7ae85161cecf",
      "type": "text",
      "x": 444,
      "y": 1568,
      "zIndex": 21,
      "width": 1336,
      "height": 98,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "title": "Done",
      "entries": [
        {
          "id": "33046914-9d76-4aed-b8a8-2fa1bead95e4",
          "text": "Lock items to prevent accidental movement",
          "done": true
        },
        {
          "id": "70e16731-72ce-4e83-bd94-bded3c1c2931",
          "text": "Assign tags to items and highlight items when a tag is selected",
          "done": true
        },
        {
          "id": "e1aa795d-554a-4806-870e-caadad0dfe3e",
          "text": "Labels on arrows",
          "done": true
        },
        {
          "id": "1f868ea1-4d64-4442-9447-84120510b072",
          "text": "Automatically create arrows from a selected item",
          "done": true
        },
        {
          "id": "377b0188-b34a-4ecb-8b8a-536862e86a9d",
          "text": "General comments and comments attached to specific items",
          "done": true
        },
        {
          "id": "1aead2a3-70e6-4ce5-b665-6aecb79fbee4",
          "text": "Filter and search the board for specific text, tags, etc.",
          "done": true
        },
        {
          "id": "b79b53f8-86ce-4a9f-a429-9788b910b1c3",
          "text": "Divider",
          "done": true
        },
        {
          "id": "fef61a95-c718-4663-ace5-ef6a927384d7",
          "text": "Something like cards dispenser in miro - block with cards, label and card color, dragging card is creating a note with center justify in vertical and horizontal",
          "done": true
        },
        {
          "id": "e617c20a-62ff-43d8-9ff7-7b40661e849d",
          "text": "One click on arrow creates same empy item like note creates a note with its color and settings etc and attachted arrow",
          "done": true
        },
        {
          "id": "a579c3aa-17c4-47ef-8f34-60e1efcaebf6",
          "text": "DocumentBlock - more advanced note with specific lines and text styles etc",
          "done": true
        },
        {
          "id": "68ee5528-4433-45cd-a9e9-abc279eb0d42",
          "text": "EmbedBlock - display content such as a YouTube video, image, or website",
          "done": true
        },
        {
          "id": "733c355d-e017-45ce-ab5e-f895517b4491",
          "text": "DiagramBlock",
          "done": true
        },
        {
          "id": "6c18395f-b553-49e6-ab32-b053493603f0",
          "text": "CodeBlock - nicely formatted code display with language selection and default syntax highlighting",
          "done": true
        },
        {
          "id": "5a8db220-7d59-4d87-8a08-d0e6d38e63d1",
          "text": "Project management",
          "done": true
        },
        {
          "id": "eb21ad3e-d63a-4f9c-a985-8c2c31072162",
          "text": "TimelineBlock - version simple with just date and label and more advances with weeks, tasks etc",
          "done": true
        },
        {
          "id": "3ed77764-d306-4a0b-90a6-f4ece1caa829",
          "text": "Context menu with actions such as copy, paste, duplicate, delete, etc.",
          "done": true
        },
        {
          "id": "545affb0-8540-460b-a91d-7f73a7b6b11f",
          "text": "Add more font families, more funny ones, some for like hand writing or sans serif etc",
          "done": true
        },
        {
          "id": "53bc6f6a-cbbc-4585-8a1c-b6f7f785c7ae",
          "text": "Drawing - drawing on canvas",
          "done": true
        }
      ],
      "color": "#ffffff",
      "id": "d008942c-f39d-4b62-8a21-1b10b682fff5",
      "type": "checklist",
      "x": 3192,
      "y": 1124,
      "zIndex": 22,
      "width": 496,
      "height": 544,
      "frameId": "fcf7d5c5-0f12-466a-b7e8-ec7908901720",
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "title": "NodexMesh todo timeline",
      "mode": "schedule",
      "tasks": [
        {
          "id": "b684413d-d847-4772-b318-faf15f4fa91d",
          "title": "Fix now problems (kanban)",
          "start": "2026-09-10",
          "end": "2026-09-10",
          "done": true,
          "color": "#000000",
          "checklist": [
            {
              "id": "b25a96fc-70af-4d9e-ab65-be673c1b2597",
              "text": "DocumentBlock is throwing error",
              "done": true
            },
            {
              "id": "c44f5813-09a9-43e8-9192-46f2eef2a0e5",
              "text": "Add more fonts to app",
              "done": true
            }
          ]
        },
        {
          "id": "70730b02-3cbd-44fa-af1d-e9913431ed70",
          "title": "Implement context menu",
          "start": "2026-09-10",
          "end": "2026-09-10",
          "done": true,
          "color": "#000000",
          "checklist": []
        },
        {
          "id": "f98291ea-1ff8-45f1-997d-e50ae48f8a16",
          "title": "Fixes from kanban",
          "start": "2026-09-10",
          "end": "2026-09-10",
          "done": true,
          "color": "#000000",
          "checklist": [
            {
              "id": "e1745144-6a91-40f4-ae30-fdfec2df5640",
              "text": "Timeline",
              "done": true
            },
            {
              "id": "ef15ed6e-5bac-4ffc-9df0-4549210dfb9b",
              "text": "Kanban",
              "done": true
            }
          ]
        },
        {
          "id": "2e1aaf88-3695-431b-bb8a-4461fd334078",
          "title": "Implement drawing on canvas",
          "start": "2026-09-10",
          "end": "2026-09-11",
          "done": true,
          "color": "#000000",
          "checklist": []
        },
        {
          "id": "9ca6ad0f-78c8-4180-bc2a-6cc9a7312ec4",
          "title": "Test #1",
          "start": "2026-09-10",
          "end": "2026-09-10",
          "done": true,
          "color": "#ff0000",
          "checklist": []
        },
        {
          "id": "d0a3f2c9-701f-44cf-a96d-c2a457283da9",
          "title": "Test #1 Fixes",
          "start": "2026-09-11",
          "end": "2026-09-14",
          "done": true,
          "color": "#000000",
          "checklist": []
        },
        {
          "id": "22ad4d4a-aab6-4daf-a16c-da1d66b6b810",
          "title": "Implement Database Diagram",
          "start": "2026-09-11",
          "end": "2026-09-12",
          "done": true,
          "color": "#000000",
          "checklist": []
        },
        {
          "id": "e6945a96-9d7b-49d7-9ec4-c57cfc7fac80",
          "title": "hotfixes from kanban",
          "start": "2026-09-11",
          "end": "2026-09-11",
          "done": true,
          "color": "#000000",
          "checklist": [
            {
              "id": "4decf82d-99fa-4272-8d62-e88f850883df",
              "text": "Implement editbar for drawing to change colors and size when multi selected",
              "done": true
            },
            {
              "id": "c4faf424-32e3-4bbe-ad5f-43a69add15b9",
              "text": "Auto Adjust columns width in kanban when resizing kanban",
              "done": true
            }
          ]
        },
        {
          "id": "8e052156-a0b8-4ce5-a741-cb6e0e99182c",
          "title": "Kanban fixes",
          "start": "2026-09-12",
          "end": "2026-09-14",
          "done": true,
          "color": "#000000",
          "checklist": []
        },
        {
          "id": "bc66a708-e255-4495-978c-5f039763de01",
          "title": "Implement new blocks",
          "start": "2026-09-13",
          "end": "2026-09-14",
          "done": false,
          "color": "#000000",
          "checklist": [
            {
              "id": "cebdb6c0-b33f-4ba1-9b55-6048fa27e578",
              "text": "IconBlock",
              "done": true
            },
            {
              "id": "007b7335-aca4-48f0-a1b6-6dbc7ad671da",
              "text": "MindmapBlock",
              "done": false
            }
          ]
        },
        {
          "id": "a1a827ec-2f9f-4c2a-bde5-69076016f0ae",
          "title": "Test #2",
          "start": "2026-09-15",
          "end": "2026-09-16",
          "done": false,
          "color": "#ed4040",
          "checklist": []
        },
        {
          "id": "3c9f0f0c-0c9d-4f9b-b19a-182ee0dbb05f",
          "title": "Implement mobile devices compability",
          "start": "2026-09-12",
          "end": "2026-09-16",
          "done": true,
          "color": "#0d39e7",
          "checklist": []
        },
        {
          "id": "f6691162-08a9-4ead-99ce-0bc92ef99874",
          "title": "API Planning",
          "start": "2026-09-10",
          "end": "2026-09-22",
          "done": false,
          "color": "#7c40ed",
          "checklist": []
        },
        {
          "id": "65322f20-9317-4ede-a11b-ebac4fdd9d5a",
          "title": "API Implementation",
          "start": "2026-09-20",
          "end": "2026-10-06",
          "done": false,
          "color": "#7c3aed",
          "checklist": []
        }
      ],
      "taskColumnWidth": 304,
      "color": "#ffffff",
      "id": "a8147482-a334-4515-b2fb-463217351b3c",
      "type": "timeline",
      "x": 4560,
      "y": 252,
      "zIndex": 23,
      "width": 1440,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [
        "todo"
      ]
    },
    {
      "divider": true,
      "x2": 1824,
      "y2": 2480,
      "arrowStart": false,
      "arrowEnd": false,
      "strokeWidth": 5,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "labelFontSize": 11,
      "color": "#000000",
      "id": "8c992864-870a-4c5e-a61d-712e3f3e8f55",
      "type": "line",
      "x": 1824,
      "y": 224,
      "zIndex": 24,
      "frameId": null,
      "locked": true,
      "comments": [],
      "tags": []
    },
    {
      "title": "Updates info",
      "content": "<h2>        Updates and timeline</h2><p>Updates are made practically everyday. timeline here is the <strong>new block</strong> that should help me <em>(and you for your future projects)</em> to plan the tasks of new features, fixes etc.</p><p>The project is growing and I'm adding new useful things, if you have any new ideas and you think that your new feature would help in creating project, plans etc in this app, just go to my <strong><u>github project</u></strong> <em>(link next to this document) </em>and create the feature improvement issue. Or you can fork the project and create the feature by yourself, so if you would want to have this in official codebase, just create <strong>pull request</strong> and wait for <strong>review</strong>.</p>",
      "autoHeight": true,
      "typography": {
        "fontSize": 16
      },
      "id": "acf2254c-9d7d-43b5-bee9-b290e44f79e7",
      "type": "document",
      "x": 3931,
      "y": 1068,
      "zIndex": 25,
      "width": 480,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "url": "https://github.com/Lewan24/NodexMesh",
      "title": "Nodex Mesh",
      "description": "GitHub project",
      "color": "#fdf4ff",
      "topColor": "#7C3AED",
      "id": "4f9e7ef5-ffbf-4f5f-95a5-a1cc077747b0",
      "type": "link",
      "x": 4111,
      "y": 1582,
      "zIndex": 26,
      "width": 320,
      "height": 144,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "title": "Example diagram of some simple in-system operation",
      "nodes": [
        {
          "id": "60130055-e315-409b-93e4-6f70da7eb750",
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
          "id": "dfedb59e-845c-4c49-93c0-9230d20f04a9",
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
          "id": "b0af72bf-dff4-4081-8f58-cf47b965ee83",
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
          "id": "6ac9a584-ab1a-45d3-891d-f5ccc647cf6a",
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
          "id": "98997cce-68fa-4479-b1a2-35fb5bce28e1",
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
          "id": "fba1b203-432f-4a04-99c1-35a4c934941a",
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
          "id": "42ed6bb5-9d7f-47ce-959b-c25f20de5f2a",
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
          "id": "4eae3503-846e-4412-afb4-37b66e904cfc",
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
          "id": "a26f61a7-50da-44fc-afc6-adbb59f2de42",
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
          "id": "c58440bc-8b16-4537-b90f-ad147a0c890a",
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
          "id": "4cec869d-f316-43de-b694-35b553f90892",
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
          "id": "62eb6b62-252f-438a-a787-8ac208693523",
          "source": "60130055-e315-409b-93e4-6f70da7eb750",
          "target": "dfedb59e-845c-4c49-93c0-9230d20f04a9",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        },
        {
          "id": "471c60c6-554a-4f8d-bc85-08f850fc9eea",
          "source": "dfedb59e-845c-4c49-93c0-9230d20f04a9",
          "target": "b0af72bf-dff4-4081-8f58-cf47b965ee83",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": "Yes"
        },
        {
          "id": "57b29278-8e3f-477c-a07b-9f4f874d32fc",
          "source": "dfedb59e-845c-4c49-93c0-9230d20f04a9",
          "target": "6ac9a584-ab1a-45d3-891d-f5ccc647cf6a",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": "No"
        },
        {
          "id": "07321482-15b5-4b06-83dd-78229396e648",
          "source": "b0af72bf-dff4-4081-8f58-cf47b965ee83",
          "target": "98997cce-68fa-4479-b1a2-35fb5bce28e1",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        },
        {
          "id": "0497f26a-f979-45c2-9b85-d9915e3442fd",
          "source": "fba1b203-432f-4a04-99c1-35a4c934941a",
          "target": "60130055-e315-409b-93e4-6f70da7eb750",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        },
        {
          "id": "5aa475ea-b3bb-46e4-a084-57d4d304d8ab",
          "source": "c58440bc-8b16-4537-b90f-ad147a0c890a",
          "target": "4eae3503-846e-4412-afb4-37b66e904cfc",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        },
        {
          "id": "05b43586-d134-466d-b27e-c3602ffc5094",
          "source": "6ac9a584-ab1a-45d3-891d-f5ccc647cf6a",
          "target": "42ed6bb5-9d7f-47ce-959b-c25f20de5f2a",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        },
        {
          "id": "4b1ddabe-c507-4c4c-af67-0e9c97db5413",
          "source": "98997cce-68fa-4479-b1a2-35fb5bce28e1",
          "target": "a26f61a7-50da-44fc-afc6-adbb59f2de42",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        },
        {
          "id": "5a2a9498-44d8-4d9e-8638-341e7f625518",
          "source": "4cec869d-f316-43de-b694-35b553f90892",
          "target": "c58440bc-8b16-4537-b90f-ad147a0c890a",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        },
        {
          "id": "0ffa439c-a1a9-4af7-8e72-dc507d428ead",
          "source": "a26f61a7-50da-44fc-afc6-adbb59f2de42",
          "target": "4cec869d-f316-43de-b694-35b553f90892",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        }
      ],
      "color": "#ffffff",
      "id": "f58e6bab-51ba-4275-a271-22a732f3507a",
      "type": "diagram",
      "x": 1998,
      "y": 1824,
      "zIndex": 27,
      "width": 800,
      "height": 1168,
      "frameId": null,
      "locked": true,
      "comments": [],
      "tags": []
    },
    {
      "divider": true,
      "x2": 2976,
      "y2": 1776,
      "arrowStart": false,
      "arrowEnd": false,
      "strokeWidth": 5,
      "label": "Example diagram",
      "labelMode": "horizontal",
      "labelOffset": 0,
      "labelFontSize": 24,
      "color": "#000000",
      "id": "f8e0550c-cc4c-4fc5-a4ad-fb89c8ea9db0",
      "type": "line",
      "x": 1824,
      "y": 1776,
      "zIndex": 28,
      "frameId": null,
      "locked": true,
      "comments": [],
      "tags": []
    },
    {
      "viewWidth": 278.48,
      "viewHeight": 289.13,
      "points": [],
      "strokeWidth": 3,
      "strokes": [
        {
          "points": [
            {
              "x": 122.7,
              "y": 6,
              "pressure": 1
            },
            {
              "x": 121.67,
              "y": 6.52,
              "pressure": 1.09
            },
            {
              "x": 118.92,
              "y": 6.83,
              "pressure": 1.13
            },
            {
              "x": 114.42,
              "y": 8.15,
              "pressure": 1.14
            },
            {
              "x": 107.82,
              "y": 10.05,
              "pressure": 1.14
            },
            {
              "x": 101.02,
              "y": 12.94,
              "pressure": 1.12
            },
            {
              "x": 93.97,
              "y": 17.36,
              "pressure": 1.12
            },
            {
              "x": 85.15,
              "y": 24.57,
              "pressure": 1.08
            },
            {
              "x": 74.25,
              "y": 34.63,
              "pressure": 1.04
            },
            {
              "x": 61.67,
              "y": 48.25,
              "pressure": 1
            },
            {
              "x": 48.96,
              "y": 62.14,
              "pressure": 0.97
            },
            {
              "x": 37.65,
              "y": 76.14,
              "pressure": 0.95
            },
            {
              "x": 28.9,
              "y": 89.42,
              "pressure": 0.95
            },
            {
              "x": 21.67,
              "y": 101.98,
              "pressure": 0.96
            },
            {
              "x": 15.99,
              "y": 115.79,
              "pressure": 0.95
            },
            {
              "x": 11.31,
              "y": 129.68,
              "pressure": 0.95
            },
            {
              "x": 7.72,
              "y": 144.45,
              "pressure": 0.95
            },
            {
              "x": 6,
              "y": 160.58,
              "pressure": 0.95
            },
            {
              "x": 8.02,
              "y": 177.28,
              "pressure": 0.94
            },
            {
              "x": 13.26,
              "y": 193.55,
              "pressure": 0.93
            },
            {
              "x": 19.43,
              "y": 206.93,
              "pressure": 0.94
            },
            {
              "x": 27.19,
              "y": 220.23,
              "pressure": 0.94
            },
            {
              "x": 38.18,
              "y": 233.96,
              "pressure": 0.93
            },
            {
              "x": 51.04,
              "y": 245.89,
              "pressure": 0.93
            },
            {
              "x": 63.4,
              "y": 255.77,
              "pressure": 0.93
            },
            {
              "x": 73.55,
              "y": 263.64,
              "pressure": 0.96
            },
            {
              "x": 84.75,
              "y": 270.38,
              "pressure": 0.97
            },
            {
              "x": 97.72,
              "y": 275.79,
              "pressure": 0.97
            },
            {
              "x": 113.36,
              "y": 279.93,
              "pressure": 0.96
            },
            {
              "x": 131.18,
              "y": 281.92,
              "pressure": 0.94
            },
            {
              "x": 150.19,
              "y": 282.8,
              "pressure": 0.92
            },
            {
              "x": 166.59,
              "y": 283.13,
              "pressure": 0.92
            },
            {
              "x": 180.96,
              "y": 282.62,
              "pressure": 0.94
            },
            {
              "x": 191.24,
              "y": 281.82,
              "pressure": 0.99
            },
            {
              "x": 199.5,
              "y": 281.39,
              "pressure": 1.04
            },
            {
              "x": 207.43,
              "y": 280.6,
              "pressure": 1.08
            },
            {
              "x": 217.29,
              "y": 278.88,
              "pressure": 1.07
            },
            {
              "x": 226.41,
              "y": 276.23,
              "pressure": 1.07
            },
            {
              "x": 232.48,
              "y": 273.31,
              "pressure": 1.12
            },
            {
              "x": 238.17,
              "y": 269.46,
              "pressure": 1.14
            },
            {
              "x": 243.61,
              "y": 266.15,
              "pressure": 1.17
            },
            {
              "x": 248.35,
              "y": 262.65,
              "pressure": 1.18
            },
            {
              "x": 252.04,
              "y": 259.65,
              "pressure": 1.22
            },
            {
              "x": 254.7,
              "y": 256.39,
              "pressure": 1.25
            },
            {
              "x": 256.73,
              "y": 254.01,
              "pressure": 1.31
            },
            {
              "x": 259,
              "y": 252,
              "pressure": 1.33
            },
            {
              "x": 261.42,
              "y": 250.75,
              "pressure": 1.34
            },
            {
              "x": 263.33,
              "y": 249.52,
              "pressure": 1.37
            },
            {
              "x": 266.55,
              "y": 247.46,
              "pressure": 1.37
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
              "y": 6.45,
              "pressure": 1.17
            },
            {
              "x": 6.48,
              "y": 7.25,
              "pressure": 1.24
            },
            {
              "x": 7.27,
              "y": 7.75,
              "pressure": 1.3
            },
            {
              "x": 7.73,
              "y": 8.5,
              "pressure": 1.37
            },
            {
              "x": 8.5,
              "y": 8.99,
              "pressure": 1.41
            },
            {
              "x": 9.46,
              "y": 9.3,
              "pressure": 1.44
            },
            {
              "x": 10.56,
              "y": 9.51,
              "pressure": 1.44
            },
            {
              "x": 11.23,
              "y": 10.09,
              "pressure": 1.47
            },
            {
              "x": 12.13,
              "y": 10.47,
              "pressure": 1.48
            },
            {
              "x": 13.2,
              "y": 11.2,
              "pressure": 1.46
            },
            {
              "x": 14.31,
              "y": 11.64,
              "pressure": 1.48
            },
            {
              "x": 15.08,
              "y": 12.45,
              "pressure": 1.43
            },
            {
              "x": 15.95,
              "y": 12.89,
              "pressure": 1.48
            },
            {
              "x": 16.97,
              "y": 13.18,
              "pressure": 1.51
            },
            {
              "x": 18.26,
              "y": 13.92,
              "pressure": 1.43
            },
            {
              "x": 18.93,
              "y": 14.77,
              "pressure": 1.46
            },
            {
              "x": 19.35,
              "y": 15.75,
              "pressure": 1.5
            },
            {
              "x": 19.64,
              "y": 16.89,
              "pressure": 1.49
            },
            {
              "x": 19.35,
              "y": 18.08,
              "pressure": 1.48
            },
            {
              "x": 19.15,
              "y": 19.37,
              "pressure": 1.45
            },
            {
              "x": 18.56,
              "y": 20.61,
              "pressure": 1.45
            },
            {
              "x": 18.19,
              "y": 21.86,
              "pressure": 1.45
            },
            {
              "x": 17.96,
              "y": 23.07,
              "pressure": 1.48
            },
            {
              "x": 17.36,
              "y": 24.32,
              "pressure": 1.49
            },
            {
              "x": 16.97,
              "y": 25.57,
              "pressure": 1.51
            },
            {
              "x": 16.73,
              "y": 26.82,
              "pressure": 1.53
            },
            {
              "x": 16.06,
              "y": 27.71,
              "pressure": 1.48
            },
            {
              "x": 15.68,
              "y": 28.66,
              "pressure": 1.51
            },
            {
              "x": 15.43,
              "y": 29.76,
              "pressure": 1.51
            },
            {
              "x": 14.79,
              "y": 30.95,
              "pressure": 1.49
            },
            {
              "x": 14.39,
              "y": 32.17,
              "pressure": 1.48
            },
            {
              "x": 13.71,
              "y": 34.26,
              "pressure": 1.48
            }
          ],
          "x": 253,
          "y": 227,
          "scaleX": 1,
          "scaleY": 1,
          "color": "#7C3AED",
          "strokeWidth": 3
        }
      ],
      "color": "#7C3AED",
      "id": "f7b6e136-44d6-4187-93a3-69d9a5952745",
      "type": "drawing",
      "x": 3808,
      "y": 1454,
      "zIndex": 30,
      "width": 278,
      "height": 289,
      "frameId": null,
      "locked": true,
      "comments": [],
      "tags": []
    },
    {
      "title": "Tests #1 problems",
      "columns": [
        {
          "id": "585bd50e-8aae-4a6b-9579-f0ce118fda4e",
          "title": "Nice to do",
          "color": "#5a8a94",
          "cards": [
            {
              "id": "0877c088-83e5-4b7d-a13f-2884e468d25c",
              "text": "Change editing kanban columns to dialog",
              "done": true
            },
            {
              "id": "9b0e2e0a-a096-4478-b2ff-a01b4677abb6",
              "text": "Implement manual deleting trash with projects",
              "done": true
            },
            {
              "id": "9fc3ec5f-3f16-43f1-bbb8-62497a1de236",
              "text": "Show checklist completion percentage based on completed tasks",
              "done": true
            },
            {
              "id": "7bc1cdad-3fd8-4a89-8da2-a5d138eb14c7",
              "text": "Implement arrow flexibility",
              "done": true
            },
            {
              "id": "ec8282db-7b7c-40db-9749-871415898763",
              "text": "Fix and improve DiagramBlock so it reacts better to moving items and handles arrows and connections more reliably",
              "done": true
            },
            {
              "id": "b24e60ff-6768-4124-85ba-f5459cdb469c",
              "text": "Edit timeline tasks in a dialog",
              "done": true
            },
            {
              "id": "bcbd90d2-928e-4a1c-b67e-76169a263bc6",
              "text": "Dropping a checklist item or Kanban card onto the canvas creates a new checklist",
              "done": true
            },
            {
              "id": "eda09ef5-7ea5-4ca2-9eec-c5bff8dcd15d",
              "text": "ImageBlock also looks inconsistent with the rest of the app and needs styling improvements",
              "done": true
            },
            {
              "id": "798c820b-0a95-4a99-9f69-bc40792dabd4",
              "text": "Review and adjust colors and item styles so the overall UI is visually consistent",
              "done": true
            },
            {
              "id": "8141f9a8-ca44-4ee2-898b-728d5f60c9c6",
              "text": "Fix arrow and line thickness so arrowheads scale correctly with the selected stroke width",
              "done": true
            },
            {
              "id": "6c940dd6-d05a-433c-beb4-8dd4ca2f5bd6",
              "text": "Add a lock icon to locked items so their locked state is clearly visible",
              "done": true
            },
            {
              "id": "559a6560-9410-4005-9e61-719bc7c93f8e",
              "text": "Prevent a frame from moving when it contains a locked item",
              "done": true
            }
          ],
          "width": 387
        },
        {
          "id": "53f1be7f-c40d-4deb-8c1d-b9e9112ed443",
          "title": "Important",
          "color": "#FFBD65",
          "cards": [
            {
              "id": "7e66e26b-e157-438b-bff5-a3a682b1171a",
              "text": "Update this column after adding new features",
              "done": true
            },
            {
              "id": "d92101be-24e7-4b6a-b46e-d5a7a6c928e2",
              "text": "When an item is resized and starts overlapping other items, push those items away and cascade the movement if they overlap additional items",
              "done": true
            },
            {
              "id": "b5dab120-c88a-471d-95e3-24c0ffb77dea",
              "text": "Check TimelineBlock and the other new items because they are not being added to frames",
              "done": true
            },
            {
              "id": "e84bac7d-410b-4a7c-bd77-9816ebef03f9",
              "text": "Review fonts across the app and fix any inconsistent usage",
              "done": true
            },
            {
              "id": "28fd5b67-b142-4e6a-923b-b886e29dd90e",
              "text": "Allow TextBlock to support multiple lines instead of a single line",
              "done": true
            },
            {
              "id": "aa9a407b-4114-463f-acea-27aaa37b5168",
              "text": "Fix vertical alignment in NoteBlock",
              "done": true
            },
            {
              "id": "5adbe9e1-4bee-40ba-afda-aa6a0f11ceb4",
              "text": "Make checklist item font size configurable in the edit bar and apply it in the textarea when adding a new task",
              "done": true
            }
          ],
          "width": 341
        },
        {
          "id": "fcfd1ad0-5a6f-4df4-bfb5-238deb52d810",
          "title": "Must have",
          "color": "#7C3AED",
          "cards": [
            {
              "id": "d04204a9-83a2-4af7-bd29-1bf9899b2f5a",
              "text": "Handle overlapping frames so when one frame overlaps another and tries to capture its items, the newer frame does not take items that already belong to the existing frame",
              "done": true
            },
            {
              "id": "7845c2b4-411a-470a-a58e-4d5d0d0457ac",
              "text": "Review and improve Ctrl+Z support, including the existing issue with Kanban cards and tasks",
              "done": true
            },
            {
              "id": "9a0b77be-694e-4456-81d1-8f1a57bfbbe8",
              "text": "Fix inconsistent item dimensions and sizing",
              "done": true
            },
            {
              "id": "11f1e332-c1e4-48c6-978b-de38c9e392d4",
              "text": "Set the default zIndex to 1 and all frames to 0",
              "done": true
            }
          ],
          "width": 358
        }
      ],
      "color": "#ffffff",
      "typography": {
        "fontSize": 16
      },
      "id": "23347b9b-34e1-43f8-9e22-ce6f54618163",
      "type": "kanban",
      "x": 3168,
      "y": 252,
      "zIndex": 37,
      "width": 1176,
      "height": 743,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "divider": true,
      "x2": 2976,
      "y2": 2992,
      "arrowStart": false,
      "arrowEnd": false,
      "strokeWidth": 5,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "labelFontSize": 11,
      "color": "#000000",
      "id": "0a8b0c44-2c8e-48f2-a621-378d22997d3a",
      "type": "line",
      "x": 2976,
      "y": 1776,
      "zIndex": 38,
      "frameId": null,
      "locked": true,
      "comments": [],
      "tags": []
    },
    {
      "divider": true,
      "x2": 5552,
      "y2": 1776,
      "arrowStart": false,
      "arrowEnd": false,
      "strokeWidth": 5,
      "label": "Bakend plan",
      "labelMode": "horizontal",
      "labelOffset": 0,
      "labelFontSize": 24,
      "color": "#000000",
      "id": "6aaca3a8-1de5-462a-ba71-a533d6a976d3",
      "type": "line",
      "x": 2976,
      "y": 1776,
      "zIndex": 39,
      "frameId": null,
      "locked": true,
      "comments": [],
      "tags": []
    },
    {
      "url": "https://dotnet.microsoft.com/en-us/",
      "title": ".NET",
      "description": "",
      "color": "#ffffff",
      "id": "1e7beef7-ad42-4f4c-93a5-c3c2af51970e",
      "type": "link",
      "x": 3734,
      "y": 1984,
      "zIndex": 40,
      "width": 320,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "url": "https://top10.owasp.org/2025/",
      "title": "OWASP TOP 10 2025",
      "description": "",
      "color": "#ffffff",
      "id": "4d7750e0-eaef-4179-a27f-975f6bd13ea9",
      "type": "link",
      "x": 3058,
      "y": 2008,
      "zIndex": 41,
      "width": 320,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "url": "https://owasp.github.io/www-project-smart-contract-top-10/assets/images/Top10mapping2025-2026.png",
      "caption": "",
      "imgHeight": 528,
      "variant": "sticker",
      "color": "#ffffff",
      "id": "0884cdb2-fde9-4279-ab1e-99e2d510d2e5",
      "type": "image",
      "x": 3062,
      "y": 2264,
      "zIndex": 42,
      "width": 970,
      "height": 528,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "x2": 3290,
      "y2": 2264,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 2,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "curve": 0.2,
      "color": "#7C3AED",
      "id": "30937622-c702-42e0-8bdd-fb5495cd6b85",
      "type": "line",
      "x": 3216,
      "y": 2221,
      "zIndex": 43,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "4d7750e0-eaef-4179-a27f-975f6bd13ea9",
      "endItemId": "0884cdb2-fde9-4279-ab1e-99e2d510d2e5"
    },
    {
      "content": "Upcoming changes 2025 => 2026",
      "size": "lg",
      "typography": {
        "verticalAlign": "top",
        "textAlign": "center"
      },
      "id": "172015a9-99dc-4e25-9708-fe7bb5e95dd6",
      "type": "text",
      "x": 3420,
      "y": 2130,
      "zIndex": 44,
      "width": 320,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "url": "https://github.com/Lewan24/SampleWarehouseApi",
      "title": "Secure .NET project template",
      "description": "My custom project created as template for new .NET projects with already implemented OWASP TOP 10 security features",
      "color": "#ffffff",
      "id": "351d7800-396b-4e63-93ba-5adc5491a22c",
      "type": "link",
      "x": 4208,
      "y": 2481,
      "zIndex": 45,
      "width": 320,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "content": "There will be all prepared information needed to prepare and implement backend in .NET 10.\n\nAfter frontend and app upcoming updates, there will be also database diagram with example of data in database how its gonna be stored.",
      "color": "#ffffff",
      "typography": {
        "bold": true
      },
      "id": "b12a29a7-caa4-4c97-bf4c-9c7989c6822c",
      "type": "note",
      "x": 4144,
      "y": 1862,
      "zIndex": 46,
      "width": 448,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "title": "",
      "url": "https://www.youtube.com/watch?v=Jzr0Jdnq_EI",
      "showLabel": false,
      "color": "#ffffff",
      "id": "c4aeb3f0-96e9-43df-b11d-718777334f47",
      "type": "embed",
      "x": 3211,
      "y": 2842,
      "zIndex": 47,
      "width": 672,
      "height": 384,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "content": "builder.Services.AddIdentityCore<ApplicationUser>(options =>\n    {\n        // Password policy (OWASP ASVS-aligned: length over complexity \n        // gymnastics, but we do both here for the demo)\n        options.Password.RequiredLength = 12;\n        options.Password.RequireDigit = true;\n        options.Password.RequireUppercase = true;\n        options.Password.RequireLowercase = true;\n        options.Password.RequireNonAlphanumeric = true;\n\n        // Account lockout after repeated failed attempts — \n        // mitigates credential stuffing / brute force.\n        options.Lockout.MaxFailedAccessAttempts = 5;\n        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);\n        options.Lockout.AllowedForNewUsers = true;\n\n        options.User.RequireUniqueEmail = true;\n    })\n        .AddRoles<IdentityRole>()\n        .AddEntityFrameworkStores<AppDbContext>()\n        .AddSignInManager()\n        .AddDefaultTokenProviders();",
      "language": "csharp",
      "autoHeight": true,
      "color": "#ffffff",
      "typography": {
        "fontSize": 14
      },
      "id": "8b3fbaeb-f176-4b41-bcae-52c819fb0e4a",
      "type": "code",
      "x": 3062,
      "y": 3488,
      "zIndex": 48,
      "width": 624,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "x2": 4552,
      "y2": 3048,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 2,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "color": "#7C3AED",
      "id": "0d4ba6ae-c4db-4e9c-a9bf-a03be940349d",
      "type": "line",
      "x": 4552,
      "y": 2709,
      "zIndex": 49,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "8b3fbaeb-f176-4b41-bcae-52c819fb0e4a",
      "endItemId": "9246d08e-f238-4584-979e-afcf2a707dac"
    },
    {
      "content": "builder.Services.AddAuthentication(options =>\n    {\n        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;\n        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;\n    })\n        .AddJwtBearer(options =>\n        {\n            options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();\n            options.SaveToken = false;\n            options.TokenValidationParameters = new TokenValidationParameters\n            {\n                ValidateIssuer = true,\n                ValidIssuer = jwtSection[\"Issuer\"],\n                ValidateAudience = true,\n                ValidAudience = jwtSection[\"Audience\"],\n                ValidateLifetime = true,\n                ClockSkew = TimeSpan.FromSeconds(30),\n                ValidateIssuerSigningKey = true,\n                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))\n            };\n        });\n\n    builder.Services.AddAuthorizationBuilder()\n        .AddPolicy(Policies.AdminOnly, p => p.RequireRole(Roles.Admin))\n        .AddPolicy(Policies.ManagerOrAdmin, p => p.RequireRole(Roles.Manager, Roles.Admin))\n        .AddPolicy(Policies.ViewerOrAbove, p => p.RequireRole(Roles.Viewer, Roles.Manager, Roles.Admin));",
      "language": "csharp",
      "autoHeight": true,
      "color": "#ffffff",
      "id": "9246d08e-f238-4584-979e-afcf2a707dac",
      "type": "code",
      "x": 3739,
      "y": 3488,
      "zIndex": 50,
      "width": 864,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "x2": 5560,
      "y2": 3043,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 2,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "color": "#7C3AED",
      "id": "99e07a93-5ecc-403a-97cb-621baccafa80",
      "type": "line",
      "x": 5024,
      "y": 3115,
      "zIndex": 51,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "9246d08e-f238-4584-979e-afcf2a707dac",
      "endItemId": "bf72c547-e078-4ea0-8d8c-4e05e357d86e"
    },
    {
      "content": "builder.Services.AddRateLimiter(options =>\n    {\n        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;\n\n        options.OnRejected = async (context, token) =>\n        {\n            context.HttpContext.Response.Headers.RetryAfter = \"60\";\n            await context.HttpContext.Response.WriteAsJsonAsync(\n                new { error = \"Too many requests. Please try again later.\" }, token);\n        };\n\n        // Global limiter applied to every request: partitioned per authenticated user and per ip\n        // (so one noisy user can't starve others) or per IP for anonymous traffic.\n        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>\n        {\n            var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);\n\n            var key = !string.IsNullOrWhiteSpace(userId)\n                ? $\"user:{userId}\"\n                : $\"ip:{httpContext.Connection.RemoteIpAddress?.ToString() ?? \"unknown\"}\";\n\n            return RateLimitPartition.GetSlidingWindowLimiter(\n                key,\n                _ => new SlidingWindowRateLimiterOptions\n                {\n                    PermitLimit = 300,\n                    Window = TimeSpan.FromMinutes(1),\n                    SegmentsPerWindow = 6,\n                    QueueLimit = 0\n                });\n        });",
      "language": "csharp",
      "autoHeight": true,
      "color": "#ffffff",
      "id": "bf72c547-e078-4ea0-8d8c-4e05e357d86e",
      "type": "code",
      "x": 3058,
      "y": 4208,
      "zIndex": 52,
      "width": 784,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "x2": 5560,
      "y2": 3920,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 2,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "color": "#7C3AED",
      "id": "d9c39579-5820-40ea-8542-a8e0291e9b47",
      "type": "line",
      "x": 5560,
      "y": 3581,
      "zIndex": 53,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "bf72c547-e078-4ea0-8d8c-4e05e357d86e",
      "endItemId": "2cd72f50-e14b-40ad-a3ed-22e624d576ba"
    },
    {
      "content": "options.AddPolicy(\"auth-strict\", httpContext =>\n        {\n            var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? \"unknown\";\n            return RateLimitPartition.GetSlidingWindowLimiter(\n                partitionKey: $\"ip:{ip}\",\n                _ => new SlidingWindowRateLimiterOptions\n            {\n                PermitLimit = 5,\n                Window = TimeSpan.FromMinutes(1),\n                SegmentsPerWindow = 6,\n                QueueLimit = 0\n            });\n        });\n        \n        options.AddPolicy(\"auth-refresh\", httpContext =>\n        {\n            var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? \"unknown\";\n\n            return RateLimitPartition.GetTokenBucketLimiter(\n                partitionKey: $\"ip:{ip}\",\n                factory: _ => new TokenBucketRateLimiterOptions\n                {\n                    TokenLimit = 30,\n                    TokensPerPeriod = 30,\n                    ReplenishmentPeriod = TimeSpan.FromMinutes(1),\n                    AutoReplenishment = true,\n                    QueueLimit = 0\n                });\n        });\n    });",
      "language": "csharp",
      "autoHeight": true,
      "color": "#ffffff",
      "id": "2cd72f50-e14b-40ad-a3ed-22e624d576ba",
      "type": "code",
      "x": 3899,
      "y": 4208,
      "zIndex": 54,
      "width": 704,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "x2": 4080,
      "y2": 2261,
      "arrowStart": true,
      "arrowEnd": true,
      "strokeWidth": 3,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "curve": -0.25,
      "lineCap": "round",
      "color": "#7C3AED",
      "id": "1d5218a7-8afd-4678-a899-11caa5264785",
      "type": "line",
      "x": 3728,
      "y": 2072,
      "zIndex": 55,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "351d7800-396b-4e63-93ba-5adc5491a22c",
      "endItemId": "8b3fbaeb-f176-4b41-bcae-52c819fb0e4a"
    },
    {
      "content": "Example code of \nidentity\nauth\nrate limiter\nlimiter policies",
      "size": "lg",
      "typography": {
        "textAlign": "center"
      },
      "id": "46089c05-d7ff-4668-ba56-9652a6d05e15",
      "type": "text",
      "x": 3120,
      "y": 3276,
      "zIndex": 56,
      "width": 320,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "x2": 3395,
      "y2": 3712,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 2,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "curve": 0.7,
      "color": "#7C3AED",
      "id": "5ea769ff-5b1d-4210-a061-3754eaebd92d",
      "type": "line",
      "x": 4712,
      "y": 2248,
      "zIndex": 57,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "46089c05-d7ff-4668-ba56-9652a6d05e15",
      "endItemId": "8b3fbaeb-f176-4b41-bcae-52c819fb0e4a"
    },
    {
      "title": "Database preview plan",
      "content": "<h2>               Database plan #1</h2><p></p><p><u>Below is the first fun preview of upcoming database.</u></p><p>It is still in <strong>planning</strong> and preparing until most of <strong><em>functionallities</em></strong> are already <strong><em>implemented</em></strong> in frontend.</p><p></p><p><strong>Projects</strong></p><p>- Id<br>- Name<br>- Color<br>- OwnerId<br>- CreatedAt<br>- UpdatedAt<br>- Version</p><p><strong>BoardItems</strong></p><p>- Id<br>- ProjectId<br>- Type<br>- X<br>- Y<br>- ZIndex<br>- Width<br>- Height<br>- Locked<br>- Data JSONB (specific data of item)<br>- UpdatedAt<br>- Version</p>",
      "autoHeight": true,
      "color": "#ffffff",
      "colorRole": "default",
      "id": "11dc2688-9327-4487-b935-d14ca823943e",
      "type": "document",
      "x": 4779,
      "y": 2018,
      "zIndex": 58,
      "width": 480,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "title": "NodexMesh Database preview schema",
      "tables": [
        {
          "id": "99dda563-8907-4e60-a395-f047aaf67735",
          "name": "Users",
          "position": {
            "x": -688,
            "y": 0
          },
          "fields": [
            {
              "id": "7f61ebe2-0811-4251-9bfa-1118738373e1",
              "name": "id",
              "dataType": "Guid",
              "primaryKey": true,
              "nullable": false,
              "unique": true,
              "defaultValue": ""
            },
            {
              "id": "1518001f-caf0-4631-8cc2-9c845c0a3d44",
              "name": "Email",
              "dataType": "string",
              "primaryKey": false,
              "nullable": false,
              "unique": true,
              "defaultValue": ""
            },
            {
              "id": "560ae375-c9ee-4181-bcc7-b9648f8aed31",
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
          "id": "edc17b24-4939-46e6-883e-723d4555101d",
          "name": "Roles",
          "position": {
            "x": -688,
            "y": 288
          },
          "fields": [
            {
              "id": "f94e58c3-6b22-45e9-8b63-96d6d477ff9f",
              "name": "id",
              "dataType": "Guid",
              "primaryKey": true,
              "nullable": false,
              "unique": true,
              "defaultValue": ""
            },
            {
              "id": "ab0c04c6-bd14-468d-8fd8-e03cec83b8a9",
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
          "id": "45c6ed35-a1a8-4b63-9a39-bf68c30eaa3a",
          "name": "UsersRoles",
          "position": {
            "x": -304,
            "y": 256
          },
          "fields": [
            {
              "id": "fe76a78d-d69b-4276-a8fc-4ed33a4b92de",
              "name": "User_ID",
              "dataType": "Guid",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "ba7a90e5-0be8-4b86-ab0d-66b6ffb69710",
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
          "id": "c93f8c6c-5ba0-4780-9f65-bf6276ccd171",
          "name": "Projects",
          "position": {
            "x": 16,
            "y": 16
          },
          "fields": [
            {
              "id": "7b8e5087-6b81-49b0-9997-12744b603bb4",
              "name": "id",
              "dataType": "Guid",
              "primaryKey": true,
              "nullable": false,
              "unique": true,
              "defaultValue": ""
            },
            {
              "id": "e50cd197-4e68-4f47-8f1c-35e953bcb1fa",
              "name": "Name",
              "dataType": "string",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "e45c97b9-e8d8-435d-8b5e-4e2e23b16c84",
              "name": "Color",
              "dataType": "string",
              "primaryKey": false,
              "nullable": true,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "9cb52bde-221a-4351-a533-7af34e0519db",
              "name": "OwnerUser_ID",
              "dataType": "Guid",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "317ff37e-c7ce-41f7-b50d-59e92c198b41",
              "name": "CreatedAt",
              "dataType": "DateTime",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "35710a52-b82c-40e5-bd0b-4f75bff4cecd",
              "name": "UpdatedAt",
              "dataType": "DateTime",
              "primaryKey": false,
              "nullable": true,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "516b370a-ee95-4f19-86fc-538f6166ccfa",
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
          "id": "c7e5ebf2-fe40-4d25-9b5a-a22768000ae5",
          "name": "BoardItems",
          "position": {
            "x": 400,
            "y": 0
          },
          "fields": [
            {
              "id": "dd8f9d24-124f-43b5-b097-23def55e0734",
              "name": "id",
              "dataType": "Guid",
              "primaryKey": true,
              "nullable": false,
              "unique": true,
              "defaultValue": ""
            },
            {
              "id": "5050fda3-7db7-4d40-b1f9-68fc3a71fb25",
              "name": "Project_ID",
              "dataType": "Guid",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "ff916638-9863-481c-8138-95b8e84c774b",
              "name": "Type",
              "dataType": "enum",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "701e0b64-fea4-4b49-8223-a2f2fe85a8dd",
              "name": "Pos_X",
              "dataType": "float",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "2a831dcf-4a6c-4945-81c7-ffc0d7c082d1",
              "name": "Pos_Y",
              "dataType": "float",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "e179aa9b-a504-4e20-acbb-35014ad54d1f",
              "name": "ZIndex",
              "dataType": "integer",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "7c61655b-f2c7-4e00-9cd9-d6bd6a1da1ca",
              "name": "Width",
              "dataType": "integer",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "d07aab18-b37b-4fe0-ab95-1cc6881d15b7",
              "name": "Height",
              "dataType": "integer",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "a0b2f478-5388-4447-8ed9-23b1c42c7f84",
              "name": "Locked",
              "dataType": "boolean",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "d2bda5c4-cf1c-4e1e-ac76-bccf991834d7",
              "name": "Item_Data",
              "dataType": "JSONB",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "67addf31-b3a3-4347-bc7f-d4ef1fbeabea",
              "name": "UpdatedAt",
              "dataType": "DateTime",
              "primaryKey": false,
              "nullable": true,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "7d64004b-914d-48cd-969e-76c90963d1a5",
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
          "id": "e2666803-8e17-412f-9283-f3ef20cfc888",
          "name": "UsersProjectsSettings",
          "position": {
            "x": -352,
            "y": -288
          },
          "fields": [
            {
              "id": "44a38cdf-77ec-4116-90ac-707c9ce7caed",
              "name": "Project_ID",
              "dataType": "Guid",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "963f8a51-503b-480c-a199-b8deffa09678",
              "name": "User_ID",
              "dataType": "Guid",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "be8decb8-e1b8-446c-9e3d-e73e39f374a1",
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
          "id": "9387197c-3804-44db-9e2c-5e91f85821b1",
          "name": "ProjectSettings",
          "position": {
            "x": 128,
            "y": -256
          },
          "fields": [
            {
              "id": "f3718661-b096-4a85-9eaf-279464e105f8",
              "name": "id",
              "dataType": "Guid",
              "primaryKey": true,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "23779dc1-f733-4deb-97d1-2c2c87a9bf16",
              "name": "ThemeSettings",
              "dataType": "JSONB",
              "primaryKey": false,
              "nullable": true,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "779d0e4a-07c0-4e3f-ba03-fb31f37e0399",
              "name": "UIFont",
              "dataType": "string",
              "primaryKey": false,
              "nullable": true,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "3583395c-a664-4efe-a978-9e86e654ca37",
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
          "id": "08393c9d-16d8-4d8a-9a77-04a212c64634",
          "source": "45c6ed35-a1a8-4b63-9a39-bf68c30eaa3a",
          "target": "edc17b24-4939-46e6-883e-723d4555101d",
          "sourceField": "ba7a90e5-0be8-4b86-ab0d-66b6ffb69710",
          "targetField": "f94e58c3-6b22-45e9-8b63-96d6d477ff9f",
          "cardinality": "1:1"
        },
        {
          "id": "2263ef57-9f2e-4261-b667-d75ce880f180",
          "source": "45c6ed35-a1a8-4b63-9a39-bf68c30eaa3a",
          "target": "99dda563-8907-4e60-a395-f047aaf67735",
          "sourceField": "fe76a78d-d69b-4276-a8fc-4ed33a4b92de",
          "targetField": "7f61ebe2-0811-4251-9bfa-1118738373e1",
          "cardinality": "1:1"
        },
        {
          "id": "3ccac7eb-7ffb-49df-bdfa-e60718328985",
          "source": "c93f8c6c-5ba0-4780-9f65-bf6276ccd171",
          "target": "99dda563-8907-4e60-a395-f047aaf67735",
          "sourceField": "9cb52bde-221a-4351-a533-7af34e0519db",
          "targetField": "7f61ebe2-0811-4251-9bfa-1118738373e1",
          "cardinality": "N:1"
        },
        {
          "id": "ec3ab5e2-82d9-4582-8a89-15ef6b977198",
          "source": "c7e5ebf2-fe40-4d25-9b5a-a22768000ae5",
          "target": "c93f8c6c-5ba0-4780-9f65-bf6276ccd171",
          "sourceField": "5050fda3-7db7-4d40-b1f9-68fc3a71fb25",
          "targetField": "7b8e5087-6b81-49b0-9997-12744b603bb4",
          "cardinality": "1:N"
        },
        {
          "id": "8ed74112-23bc-41e6-a8bf-40713fbd7b49",
          "source": "e2666803-8e17-412f-9283-f3ef20cfc888",
          "target": "c93f8c6c-5ba0-4780-9f65-bf6276ccd171",
          "sourceField": "44a38cdf-77ec-4116-90ac-707c9ce7caed",
          "targetField": "7b8e5087-6b81-49b0-9997-12744b603bb4",
          "cardinality": "1:1"
        },
        {
          "id": "a0486846-0a2a-4c67-ac37-c6ea4ba476f2",
          "source": "e2666803-8e17-412f-9283-f3ef20cfc888",
          "target": "99dda563-8907-4e60-a395-f047aaf67735",
          "sourceField": "963f8a51-503b-480c-a199-b8deffa09678",
          "targetField": "7f61ebe2-0811-4251-9bfa-1118738373e1",
          "cardinality": "1:1"
        },
        {
          "id": "287e3665-39ef-4f5e-8285-f40a96a0c0a3",
          "source": "e2666803-8e17-412f-9283-f3ef20cfc888",
          "target": "9387197c-3804-44db-9e2c-5e91f85821b1",
          "sourceField": "be8decb8-e1b8-446c-9e3d-e73e39f374a1",
          "targetField": "f3718661-b096-4a85-9eaf-279464e105f8",
          "cardinality": "1:1"
        }
      ],
      "color": "#1c1917",
      "colorRole": "default",
      "id": "f71bd38c-8b6b-4bc2-9b49-d62987f86063",
      "type": "database",
      "x": 5376,
      "y": 2618,
      "zIndex": 59,
      "width": 1920,
      "height": 928,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "x2": 5751,
      "y2": 2368,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 3,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "curve": -0.25,
      "color": "#7C3AED",
      "id": "358b587d-dc02-449f-b5f5-ff32e1673607",
      "type": "line",
      "x": 5584,
      "y": 2131,
      "zIndex": 60,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "11dc2688-9327-4487-b935-d14ca823943e",
      "endItemId": "f71bd38c-8b6b-4bc2-9b49-d62987f86063"
    },
    {
      "content": "public abstract class BoardItemData\n{\n}\n\npublic sealed class NoteData : BoardItemData\n{\n    public string Content { get; set; } = \"\";\n    public string? Color { get; set; }\n    public TypographyOptions? Typography { get; set; }\n}\n\npublic sealed class ChecklistData : BoardItemData\n{\n    public string Title { get; set; } = \"\";\n    public List<ChecklistEntry> Entries { get; set; } = [];\n}",
      "language": "csharp",
      "autoHeight": true,
      "color": "#ffffff",
      "id": "745f5410-b8c8-4e4e-9ef8-7e61b085db08",
      "type": "code",
      "x": 5552,
      "y": 1952,
      "zIndex": 61,
      "width": 480,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
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
      "color": "#000000",
      "id": "576bb2a6-c620-4b10-8fbb-8b4f24b8ec13",
      "type": "line",
      "x": 4704,
      "y": 1888,
      "zIndex": 62,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "x2": 3523,
      "y2": 2260,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 2,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "curve": -0.4,
      "color": "#7C3AED",
      "id": "fbbba05b-6044-474e-81ad-be9edd5902a7",
      "type": "line",
      "x": 3520,
      "y": 2232,
      "zIndex": 64,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "172015a9-99dc-4e25-9708-fe7bb5e95dd6",
      "endItemId": "0884cdb2-fde9-4279-ab1e-99e2d510d2e5"
    },
    {
      "x2": 4274,
      "y2": 2560,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 2,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "curve": -0.25,
      "color": "#7C3AED",
      "id": "38ba5dc7-7dcc-4fc0-9026-f35144b1f427",
      "type": "line",
      "x": 3888,
      "y": 1989,
      "zIndex": 65,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "1e7beef7-ad42-4f4c-93a5-c3c2af51970e",
      "endItemId": "351d7800-396b-4e63-93ba-5adc5491a22c"
    },
    {
      "x2": 5152,
      "y2": 2259,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 3,
      "label": "Example data C# boxing",
      "labelMode": "follow-line",
      "labelOffset": 15,
      "curve": 0,
      "labelFontSize": 13,
      "color": "#5a8a94",
      "typography": {
        "fontSize": 13
      },
      "id": "11d7d427-ec29-4bf5-8dc2-d7dc3051b9f2",
      "type": "line",
      "x": 5120,
      "y": 2256,
      "zIndex": 66,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "11dc2688-9327-4487-b935-d14ca823943e",
      "endItemId": "745f5410-b8c8-4e4e-9ef8-7e61b085db08"
    },
    {
      "viewWidth": 417.12,
      "viewHeight": 180.15,
      "points": [],
      "strokeWidth": 3,
      "strokes": [
        {
          "points": [
            {
              "x": 6,
              "y": 165.33,
              "pressure": 1
            },
            {
              "x": 6.54,
              "y": 165.33,
              "pressure": 1.17
            },
            {
              "x": 7.62,
              "y": 165.33,
              "pressure": 1.17
            },
            {
              "x": 11.6,
              "y": 166,
              "pressure": 1.16
            },
            {
              "x": 22.69,
              "y": 166.44,
              "pressure": 1.11
            },
            {
              "x": 42.25,
              "y": 166.68,
              "pressure": 1.04
            },
            {
              "x": 69.12,
              "y": 165.83,
              "pressure": 0.98
            },
            {
              "x": 98.9,
              "y": 163.55,
              "pressure": 0.93
            },
            {
              "x": 130.01,
              "y": 159.68,
              "pressure": 0.89
            },
            {
              "x": 163.4,
              "y": 153.19,
              "pressure": 0.86
            },
            {
              "x": 192.18,
              "y": 144.34,
              "pressure": 0.85
            },
            {
              "x": 218.58,
              "y": 134.51,
              "pressure": 0.84
            },
            {
              "x": 249.11,
              "y": 121.56,
              "pressure": 0.83
            },
            {
              "x": 282.14,
              "y": 107.45,
              "pressure": 0.81
            },
            {
              "x": 309.54,
              "y": 91.37,
              "pressure": 0.81
            },
            {
              "x": 329.75,
              "y": 77.33,
              "pressure": 0.82
            },
            {
              "x": 350.53,
              "y": 60.81,
              "pressure": 0.83
            },
            {
              "x": 369.47,
              "y": 45.34,
              "pressure": 0.84
            },
            {
              "x": 379.45,
              "y": 34.29,
              "pressure": 0.9
            },
            {
              "x": 386.07,
              "y": 25.83,
              "pressure": 0.97
            },
            {
              "x": 391.06,
              "y": 18.49,
              "pressure": 1.03
            },
            {
              "x": 394.21,
              "y": 13.55,
              "pressure": 1.11
            },
            {
              "x": 399.02,
              "y": 6,
              "pressure": 1.11
            }
          ],
          "x": 0,
          "y": 7,
          "scaleX": 1,
          "scaleY": 1,
          "color": "#7C3AED",
          "strokeWidth": 3
        },
        {
          "points": [
            {
              "x": 6,
              "y": 19.55,
              "pressure": 1
            },
            {
              "x": 6.54,
              "y": 19.55,
              "pressure": 1.17
            },
            {
              "x": 7.49,
              "y": 18.97,
              "pressure": 1.24
            },
            {
              "x": 8.63,
              "y": 18.05,
              "pressure": 1.3
            },
            {
              "x": 11.8,
              "y": 16.84,
              "pressure": 1.3
            },
            {
              "x": 16.41,
              "y": 14.13,
              "pressure": 1.27
            },
            {
              "x": 21.79,
              "y": 11.86,
              "pressure": 1.24
            },
            {
              "x": 26.34,
              "y": 9.5,
              "pressure": 1.26
            },
            {
              "x": 30.92,
              "y": 8.07,
              "pressure": 1.28
            },
            {
              "x": 36.29,
              "y": 7.17,
              "pressure": 1.27
            },
            {
              "x": 40.52,
              "y": 6.06,
              "pressure": 1.28
            },
            {
              "x": 42.78,
              "y": 6,
              "pressure": 1.37
            },
            {
              "x": 43.87,
              "y": 7.81,
              "pressure": 1.34
            },
            {
              "x": 43.9,
              "y": 11.38,
              "pressure": 1.31
            },
            {
              "x": 42.66,
              "y": 16,
              "pressure": 1.29
            },
            {
              "x": 41.93,
              "y": 20.65,
              "pressure": 1.27
            },
            {
              "x": 41.53,
              "y": 24.32,
              "pressure": 1.3
            },
            {
              "x": 40.71,
              "y": 28.3,
              "pressure": 1.32
            },
            {
              "x": 40.22,
              "y": 31.24,
              "pressure": 1.36
            },
            {
              "x": 39.39,
              "y": 33,
              "pressure": 1.43
            },
            {
              "x": 37.87,
              "y": 36.24,
              "pressure": 1.43
            }
          ],
          "x": 367,
          "y": 0,
          "scaleX": 1,
          "scaleY": 1,
          "color": "#7C3AED",
          "strokeWidth": 3
        }
      ],
      "color": "#7C3AED",
      "id": "73f89310-527d-4389-9cfb-9be1750081f0",
      "type": "drawing",
      "x": 4431,
      "y": 1168,
      "zIndex": 68,
      "width": 417,
      "height": 180,
      "frameId": null,
      "locked": true,
      "comments": [],
      "tags": []
    },
    {
      "content": "Backend Plan",
      "color": "#7C3AED",
      "id": "2bde33f4-d08b-4215-ac87-c301f0b8eb62",
      "type": "section-title",
      "x": 3056,
      "y": 1840,
      "zIndex": 69,
      "width": 320,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "content": "NodexMesh Database Scheme Plan",
      "color": "#7C3AED",
      "id": "600850d7-36ff-4493-9e28-13e72da04553",
      "type": "section-title",
      "x": 4784,
      "y": 1856,
      "zIndex": 70,
      "width": 320,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "content": "NodexMesh TODO Section",
      "color": "#FFBD65",
      "id": "7c6085ca-0905-49d0-82df-0a8df3cf0fa8",
      "type": "section-title",
      "x": 2772,
      "y": 176,
      "zIndex": 71,
      "width": 320,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "iconMode": "emoji",
      "source": "🤔",
      "label": "🤔",
      "color": "#7C3AED",
      "id": "80fb7865-67b2-4574-9469-d6a8e326f08f",
      "type": "icon",
      "x": 3958,
      "y": 2232,
      "zIndex": 72,
      "width": 96,
      "height": 96,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "iconMode": "emoji",
      "source": "🔥",
      "label": "🔥",
      "color": "#7C3AED",
      "id": "1e725d92-d5ce-423b-b380-a3f6dafdcc86",
      "type": "icon",
      "x": 5136,
      "y": 2064,
      "zIndex": 73,
      "width": 96,
      "height": 96,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "iconMode": "svg",
      "source": "<svg xmlns=\"http://www.w3.org/2000/svg\" id=\"Layer_1\" viewBox=\"0 0 64 64\"><defs><style>.cls-1{fill:#5c2d91;}.cls-2,.cls-3{fill:#fff;}.cls-2{opacity:0.1;}.cls-4{fill:#f2f2f2;}</style></defs><title>logo_NETcore</title><circle class=\"cls-1\" cx=\"32\" cy=\"32\" r=\"32\"/><path class=\"cls-2\" d=\"M9.82,9A32,32,0,1,0,55,54.18Z\"/><path class=\"cls-3\" d=\"M7.4,37.25a1.35,1.35,0,0,1-1-.42,1.38,1.38,0,0,1-.41-1,1.4,1.4,0,0,1,.41-1,1.34,1.34,0,0,1,1-.43,1.37,1.37,0,0,1,1,.43,1.39,1.39,0,0,1,.42,1,1.37,1.37,0,0,1-.42,1A1.38,1.38,0,0,1,7.4,37.25Z\"/><path class=\"cls-3\" d=\"M27.27,37H24.65L15.28,22.46a6,6,0,0,1-.58-1.14h-.08a18.72,18.72,0,0,1,.1,2.5V37H12.59V18.77h2.77l9.12,14.28q.57.89.74,1.22h.05a19.28,19.28,0,0,1-.13-2.68V18.77h2.13Z\"/><path class=\"cls-3\" d=\"M41.69,37H32V18.77h9.24V20.7H34.18v6.06h6.58v1.92H34.18V35h7.52Z\"/><path class=\"cls-3\" d=\"M56,20.7H50.7V37H48.57V20.7H43.33V18.77H56Z\"/><path class=\"cls-4\" d=\"M26.12,49.4a4.93,4.93,0,0,1-2.32.49,3.74,3.74,0,0,1-2.87-1.15,4.26,4.26,0,0,1-1.08-3,4.46,4.46,0,0,1,1.21-3.26,4.12,4.12,0,0,1,3.08-1.24,4.93,4.93,0,0,1,2,.35v1a4,4,0,0,0-2-.5,3.06,3.06,0,0,0-2.35,1,3.64,3.64,0,0,0-.9,2.58,3.47,3.47,0,0,0,.84,2.45,2.86,2.86,0,0,0,2.21.91,4.14,4.14,0,0,0,2.19-.56Z\"/><path class=\"cls-4\" d=\"M30.21,49.89A2.78,2.78,0,0,1,28.08,49a3.11,3.11,0,0,1-.79-2.23,3.24,3.24,0,0,1,.83-2.36,3,3,0,0,1,2.23-.85,2.69,2.69,0,0,1,2.09.83,3.28,3.28,0,0,1,.75,2.29,3.22,3.22,0,0,1-.81,2.3A2.84,2.84,0,0,1,30.21,49.89Zm.07-5.47a1.83,1.83,0,0,0-1.46.63,2.59,2.59,0,0,0-.54,1.74,2.45,2.45,0,0,0,.54,1.68,1.85,1.85,0,0,0,1.46.62,1.76,1.76,0,0,0,1.43-.6,2.62,2.62,0,0,0,.5-1.72,2.66,2.66,0,0,0-.5-1.73A1.75,1.75,0,0,0,30.28,44.42Z\"/><path class=\"cls-4\" d=\"M37.86,44.72a1.18,1.18,0,0,0-.73-.19,1.23,1.23,0,0,0-1,.58,2.68,2.68,0,0,0-.41,1.58v3.06h-1v-6h1V45h0a2.1,2.1,0,0,1,.63-1,1.43,1.43,0,0,1,.94-.35,1.57,1.57,0,0,1,.57.08Z\"/><path class=\"cls-4\" d=\"M43.72,47H39.49A2.24,2.24,0,0,0,40,48.54a1.86,1.86,0,0,0,1.42.54,3,3,0,0,0,1.86-.67v.9a3.48,3.48,0,0,1-2.09.57,2.54,2.54,0,0,1-2-.82,3.35,3.35,0,0,1-.73-2.3,3.28,3.28,0,0,1,.79-2.28,2.55,2.55,0,0,1,2-.88,2.26,2.26,0,0,1,1.82.76,3.18,3.18,0,0,1,.64,2.12Zm-1-.81a2,2,0,0,0-.4-1.29,1.37,1.37,0,0,0-1.1-.46,1.55,1.55,0,0,0-1.15.49,2.21,2.21,0,0,0-.59,1.27Z\"/></svg>",
      "label": "Star",
      "color": "#7C3AED",
      "id": "2f9bf1f7-d489-4d58-96ab-bd00b566de38",
      "type": "icon",
      "x": 3969,
      "y": 2015,
      "zIndex": 74,
      "width": 75,
      "height": 68,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "iconMode": "svg",
      "source": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"800px\" height=\"800px\" viewBox=\"-1.35 0 1504.4 1504.4\" id=\"Layer_1\"><style>.st0{fill:#5e91ff}.st1{fill:#fff}</style><title>Like</title><ellipse class=\"st0\" cx=\"750.8\" cy=\"752.2\" rx=\"750.8\" ry=\"752.2\"/><path class=\"st1\" d=\"M378.3 667.5h165.1c13 0 23.6 10.5 23.6 23.6v379.1c0 13-10.5 23.6-23.6 23.6H378.3c-13 0-23.6-10.5-23.6-23.6V691c.1-13 10.6-23.5 23.6-23.5zM624.7 1004.7V733.1c.1-66.9 18.8-132.4 54.1-189.2 21.5-34.4 69.7-89.5 96.7-118 6-6.4 27.8-25.2 27.8-35.5 0-13.2 1.5-34.5 2-74.2.3-25.2 20.8-45.9 46-45.7h1.1c44.1.8 58.2 41.6 58.2 41.6s37.7 74.4 2.5 165.4c-29.7 76.9-35.8 83.1-35.8 83.1s-9.6 13.9 20.8 13.3c0 0 185.6-.8 192-.8 13.7 0 57.4 12.5 54.9 68.2-1.8 41.2-27.4 55.6-40.5 60.3-1.7.6-2.6 2.5-1.9 4.2.3.7.8 1.3 1.5 1.7 13.4 7.8 40.8 27.5 40.2 57.7-.8 36.6-15.5 50.1-46.1 58.5-1.7.4-2.8 2.2-2.3 3.9.2.9.8 1.6 1.5 2 11.6 6.6 31.5 22.7 30.3 55.3-1.2 33.2-25.2 44.9-38.3 48.9-1.7.5-2.7 2.3-2.2 4 .2.7.7 1.4 1.3 1.8 8.3 5.7 20.6 18.6 20 45.1-.3 14-5 24.2-10.9 31.5-9.3 11.5-23.9 17.5-38.7 17.6l-411.8.8c-.1-.1-22.4 0-22.4-29.9z\"/></svg>",
      "label": "Star",
      "color": "#7C3AED",
      "id": "c1d7858c-4b19-45ef-90d5-741b9544f5f3",
      "type": "icon",
      "x": 608,
      "y": 1324,
      "zIndex": 75,
      "width": 192,
      "height": 172,
      "frameId": "4c4f3e69-1d63-4948-ab38-faaabc7b1585",
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "content": "Custom SVG",
      "size": "lg",
      "typography": {
        "verticalAlign": "middle",
        "textAlign": "center"
      },
      "id": "ea7f4b4d-0437-4fb4-9b54-4e14e09f367f",
      "type": "text",
      "x": 640,
      "y": 1194,
      "zIndex": 76,
      "width": 240,
      "height": 60,
      "frameId": "4c4f3e69-1d63-4948-ab38-faaabc7b1585",
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "x2": 749,
      "y2": 1324,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 2,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "curve": -0.55,
      "color": "#7C3AED",
      "id": "be09c6af-75a4-4da2-b327-117ad650d1fb",
      "type": "line",
      "x": 760,
      "y": 1254,
      "zIndex": 77,
      "frameId": "4c4f3e69-1d63-4948-ab38-faaabc7b1585",
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "ea7f4b4d-0437-4fb4-9b54-4e14e09f367f",
      "endItemId": "c1d7858c-4b19-45ef-90d5-741b9544f5f3"
    }
  ]
};

export const demoProjects: Project[] = [nodexMeshDemoProject];
